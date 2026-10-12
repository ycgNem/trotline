// Scripted players for the pace tests (tests/pace.test.ts) and the browser bot (e2e/bot.mjs).
// Pure: they only read the Game and give it commands, exactly as the HUD does.
//   deployAll: fishes the shallows and deploys every fish at the best tile; never sells or lures.
//   sellAll:   fishes and sells everything; buys nothing that defends.
//   good:      a sensible player: deploys, sells what it can't use, buys the worm bed and the
//              tier-2 rod, fishes turtles for the bear waves, casts lures into the kill zone.
import { Game } from './Game';
import { Tile } from './world';
import { DEFENDERS } from '../data/defenders';
import { WAVES } from '../data/waves';
import type { SpeciesId } from '../data/species';

export type Strategy = 'deployAll' | 'sellAll' | 'good' | 'idle';

export interface BotOpts {
  /** where eels go: the tile with the most road in reach, or beside the road's midpoint */
  eelSpot?: 'best' | 'mid';
  /** cast one worm lure on the road's midpoint when the first wave starts */
  lureMid?: boolean;
  /** stop thinking after this wave (the pace tests look at one wave) */
  untilWave?: number;
}

export class Bot {
  private luredWave = -1;
  constructor(public g: Game, public strategy: Strategy, public opts: BotOpts = {}) {}

  /** Look at the game and act; call it every few ticks. */
  think() {
    const g = this.g;
    if (g.over || this.strategy === 'idle') return;
    this.fish();
    if (this.strategy === 'sellAll') {
      g.liveWell.forEach((s, i) => { if (s) g.act({ k: 'sell', slot: i }); });
      return;
    }
    this.buy();
    this.deploy();
    this.lure();
  }

  private fish() {
    const g = this.g;
    if (g.worms < 1 && !g.wormBed && g.money >= 5 && this.strategy !== 'deployAll') g.act({ k: 'buy', item: 'worms' });
    const want = this.wantTurtles() ? 'point' : 'shallows';
    if (g.fishZone === want) return;
    const spot = this.castSpot(want) ?? this.castSpot('shallows');
    if (spot) g.act({ k: 'cast', x: spot.x, y: spot.y });
  }

  private wantTurtles(): boolean {
    const g = this.g;
    if (this.strategy !== 'good' || g.rodTier < 2) return false;
    const have = g.defenders.filter((d) => d.species === 'turtle').length + g.liveWell.filter((s) => s === 'turtle').length;
    // a turtle for every bear wave still to come, up to two
    const bearsAhead = WAVES.slice(g.wave).filter((w) => w.groups.some(([id]) => id === 'bear')).length;
    return have < Math.min(2, bearsAhead);
  }

  /** The water tile in a zone nearest the angler that the rod reaches. */
  castSpot(zone: string): { x: number; y: number } | null {
    const g = this.g, w = g.world;
    let best: { x: number; y: number } | null = null, bd = 1e9;
    for (let y = 0; y < w.h; y++)
      for (let x = 0; x < w.w; x++) {
        if (w.zone[w.idx(x, y)] !== zone || !g.canCast(x, y).ok) continue;
        const d = w.castDist(x, y);
        if (d < bd) { bd = d; best = { x, y }; }
      }
    return best;
  }

  private buy() {
    const g = this.g;
    if (this.strategy !== 'good') return;
    // the worm bed first, then the rod by wave 3 (DESIGN.md §7, the bear lesson)
    if (!g.wormBed) { if (g.money >= 40) g.act({ k: 'buy', item: 'wormbed' }); return; }
    if (g.rodTier < 2 && g.money >= 60) g.act({ k: 'buy', item: 'rod' });
  }

  private deploy() {
    const g = this.g;
    g.liveWell.forEach((s, i) => {
      if (!s) return;
      if (this.strategy === 'good' && !this.keep(s)) { g.act({ k: 'sell', slot: i }); return; }
      const spot = this.bestTile(s);
      if (spot) g.act({ k: 'deploy', slot: i, x: spot.x, y: spot.y });
      else if (this.strategy === 'good') g.act({ k: 'sell', slot: i });
    });
  }

  /** The good bot keeps fish it has a use for and sells the rest. */
  private keep(s: SpeciesId): boolean {
    const g = this.g;
    const n = (sp: SpeciesId) => g.defenders.filter((d) => d.species === sp).length;
    if (s === 'eel') return n('eel') < 8;
    if (s === 'puffer') return n('puffer') < 6;
    return n('turtle') < 2;
  }

  /** Where a fish does the most: eels by road in reach, puffers spread along the road, turtles in eel range. */
  bestTile(s: SpeciesId): { x: number; y: number } | null {
    const g = this.g, w = g.world;
    const def = DEFENDERS[s];
    const mid = w.pathPt(Math.floor(w.path.length / 2));
    let best: { x: number; y: number } | null = null, bs = -1e9;
    for (let y = 0; y < w.h; y++)
      for (let x = 0; x < w.w; x++) {
        if (!g.canDeploy(s, x, y).ok) continue;
        const cx = x + 0.5, cy = y + 0.5;
        let score = 0;
        if (def.kind === 'zap') {
          if (this.opts.eelSpot === 'mid') score = -Math.hypot(cx - mid.x, cy - mid.y);
          else for (const p of w.path) if (Math.hypot(p.x + 0.5 - cx, p.y + 0.5 - cy) <= def.range) score++;
        } else if (def.kind === 'mine') {
          // a mine where the road is, away from the other mines, early on the road
          for (const p of w.path) if (Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= 1) score++;
          for (const d of g.defenders) if (d.species === 'puffer' && Math.max(Math.abs(d.x - x), Math.abs(d.y - y)) <= 2) score -= 10;
          score -= w.roadDist[w.idx(x, y)] * 0.1;
        } else {
          // a turtle on the road where the most eels reach it
          if (w.at(x, y) !== Tile.Road) continue;
          for (const d of g.defenders) if (d.species === 'eel' && Math.hypot(d.x - x, d.y - y) <= DEFENDERS.eel.maxRoadDist + 1.5) score += 3;
          score -= Math.abs(w.pathIndex[w.idx(x, y)] - w.path.length * 0.7) * 0.05;
          for (const d of g.defenders) if (d.species === 'turtle' && Math.abs(d.roadI - w.pathIndex[w.idx(x, y)]) < 2) score -= 20;
        }
        if (score > bs) { bs = score; best = { x, y }; }
      }
    return best;
  }

  private lure() {
    const g = this.g;
    if (this.opts.lureMid) {
      if (g.phase === 'wave' && this.luredWave !== g.wave) {
        this.luredWave = g.wave;
        const p = g.world.path[Math.floor(g.world.path.length / 2)];
        g.act({ k: 'lure', x: p.x, y: p.y });
      }
      return;
    }
    if (this.strategy !== 'good' || g.phase !== 'wave' || g.lures.length > 0 || g.worms < 3) return;
    const lurable = g.thieves.some((t) => (t.kind === 'raccoon' || t.kind === 'bear') && t.mode === 'road');
    if (!lurable) return;
    // the reachable road tile with the most eels around it
    const w = g.world;
    let best: { x: number; y: number } | null = null, bs = 0;
    for (const p of w.path) {
      if (!g.canLure(p.x, p.y).ok) continue;
      let s = 0;
      for (const d of g.defenders) if (d.species === 'eel' && Math.hypot(d.x - p.x, d.y - p.y) <= DEFENDERS.eel.maxRoadDist + 1) s++;
      if (s > bs) { bs = s; best = p; }
    }
    if (best) g.act({ k: 'lure', x: best.x, y: best.y });
  }
}

/** Play a whole run (or up to opts.untilWave) headless with a strategy; returns the game. */
export function playRun(seed: number, strategy: Strategy, opts: BotOpts = {}, maxTicks = 60 * 60 * 30): Game {
  const g = new Game(seed);
  const bot = new Bot(g, strategy, opts);
  for (let i = 0; i < maxTicks && !g.over; i++) {
    if (i % 10 === 0) bot.think();
    g.step();
    if (opts.untilWave && g.wave >= opts.untilWave && g.phase === 'build') break;
  }
  return g;
}
