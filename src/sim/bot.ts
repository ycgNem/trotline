// Scripted players for the pace tests (tests/pace.test.ts) and the browser bot (e2e/bot.mjs).
// Pure: they only read the Game and give it commands, exactly as the HUD does.
//   deployAll: fishes the best water it reaches and deploys every fish; never sells, buys or lures.
//   deployBed: deployAll that also buys the worm bed (and worm packs) with its bounties.
//   sellAll:   fishes and sells everything; buys nothing that defends.
//   good:      a sensible player: deploys what it can use and sells the rest, buys the worm bed
//              and the surf rod, fishes terrapins by the reeds for the bear waves, casts a lure
//              into the rays' reach once the gulls are past.
//   idle:      does nothing.
import { Game } from './Game';
import { Tile, type Pt } from './world';
import { DEFENDERS, RAY } from '../data/defenders';
import type { SpeciesId } from '../data/species';
import { WAVES } from '../data/waves';
import { alive } from './systems/thieves';

export type Strategy = 'deployAll' | 'deployBed' | 'sellAll' | 'good' | 'idle';

export interface BotOpts {
  /** where rays go: the slot with the most road in reach (2 tiles out, clear of claws), or the
   * slot nearest the road's midpoint */
  raySpot?: 'best' | 'mid';
  /** cast one worm lure on the road's midpoint when each wave starts */
  lureMid?: boolean;
  /** stop thinking after this wave (the pace tests look at one wave) */
  untilWave?: number;
  /** the good bot's keep caps: deployed rays, puffers and terrapins it wants before it sells */
  keep?: { ray: number; puffer: number; turtle: number };
}

/** The good bot's caps (DESIGN.md §7): every ray and puffer it can place (each adds a wave's worth
 * of charge or one poisoning), terrapins up to three; the rest it sells. */
export const KEEP = { ray: 99, puffer: 99, turtle: 3 };

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
    // the bed can't keep a surf rod fed: the good bot tops up from the bait shop rather than let the line stop
    if (this.strategy === 'good' && g.wormBed && g.worms < 2 && g.money >= 5 + (g.rodTier < 2 ? 60 : 0)) g.act({ k: 'buy', item: 'worms' });
    if (this.strategy === 'deployBed' && !g.wormBed && g.money >= 40) g.act({ k: 'buy', item: 'wormbed' });
    const want = this.wantTerrapins() ? 'turtle' : null;
    const spot = this.castSpot(want);
    if (!spot) return;
    if (g.fishing && this.score(g.fishing, want) >= this.score(spot, want) - 1e-9) return;
    g.act({ k: 'cast', x: spot.x, y: spot.y });
  }

  private wantTerrapins(): boolean {
    const g = this.g;
    if (this.strategy !== 'good' || g.rodTier < 2) return false;
    const have = g.defenders.filter((d) => d.species === 'turtle').length + g.liveWell.filter((s) => s === 'turtle').length;
    // a terrapin for every bear still to come, up to the keep cap
    const bearsAhead = WAVES.slice(g.wave).reduce((n, w) => n + w.groups.filter(([id]) => id === 'bear').reduce((k, [, c]) => k + c, 0), 0);
    return have < Math.min((this.opts.keep ?? KEEP).turtle, bearsAhead);
  }

  /** How good a tile is to fish: the rate of the species wanted, or every bite's rate. */
  private score(at: Pt, want: SpeciesId | null): number {
    let s = 0;
    for (const b of this.g.biteTable(at)) if (!want || b.s === want) s += b.rate;
    return s;
  }

  /** The water tile the rod reaches with the best score (nearest the angler on a tie). */
  castSpot(want: SpeciesId | null = null): Pt | null {
    const g = this.g, w = g.world;
    let best: Pt | null = null, bs = 0, bd = 1e9;
    for (let y = 0; y < w.h; y++)
      for (let x = 0; x < w.w; x++) {
        if (!w.zone[w.idx(x, y)] || !g.canCast(x, y).ok) continue;
        const s = this.score({ x, y }, want), d = w.castDist(x, y);
        if (s > bs + 1e-9 || (Math.abs(s - bs) <= 1e-9 && s > 0 && d < bd)) { bs = s; bd = d; best = { x, y }; }
      }
    return best ?? (want ? this.castSpot(null) : null);
  }

  private buy() {
    const g = this.g;
    if (this.strategy !== 'good') return;
    // the worm bed first, then the rod by wave 4 (DESIGN.md §7, the bear lesson)
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
    const cap = this.opts.keep ?? KEEP;
    return n(s) < cap[s];
  }

  /** Where a fish does the most: rays by road in reach, puffers spread along the road, terrapins where the rays reach. */
  bestTile(s: SpeciesId): Pt | null {
    const g = this.g, w = g.world;
    const def = DEFENDERS[s];
    const mid = w.pathPt(Math.floor(w.path.length / 2));
    let best: Pt | null = null, bs = -1e9;
    for (let y = 0; y < w.h; y++)
      for (let x = 0; x < w.w; x++) {
        if (!g.canDeploy(s, x, y).ok) continue;
        const cx = x + 0.5, cy = y + 0.5;
        const rd = w.roadDist[w.idx(x, y)];
        let score = 0;
        if (def.kind === 'zap') {
          if (this.opts.raySpot === 'mid') score = -Math.hypot(cx - mid.x, cy - mid.y) - (rd < 2 ? 100 : 0);
          else {
            for (const p of w.path) if (Math.hypot(p.x + 0.5 - cx, p.y + 0.5 - cy) <= def.range) score++;
            // 1 tile from the road a ray gets clawed (DESIGN.md §4); the good bot keeps it 2 out
            if (rd < 2 && this.strategy === 'good') score -= 6;
          }
        } else if (def.kind === 'poison') {
          // where the most road passes within reach, away from the other puffers
          let first = w.path.length;
          w.path.forEach((p, i) => { if (Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= def.trigger) { score++; first = Math.min(first, i); } });
          for (const d of g.defenders) if (d.species === 'puffer' && Math.max(Math.abs(d.x - x), Math.abs(d.y - y)) <= 3) score -= 10;
          // early on the road, so what it sickens walks past the rays afterwards
          score -= first * 0.02;
        } else {
          // a terrapin on the road where the most rays reach the line behind it
          if (w.at(x, y) !== Tile.Road) continue;
          for (const d of g.defenders) if (d.species === 'ray' && Math.hypot(d.x - x, d.y - y) <= RAY.range + 1) score += 3;
          score -= Math.abs(w.pathIndex[w.idx(x, y)] - w.path.length * 0.6) * 0.05;
          for (const d of g.defenders) if (d.species === 'turtle' && Math.abs(d.roadI - w.pathIndex[w.idx(x, y)]) < 3) score -= 20;
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
    // the reachable road tile with the most rays around it, that no gull still has to pass
    const w = g.world;
    const gullsBefore = (i: number) => g.thieves.some((t) => t.kind === 'gull' && alive(t) && t.mode !== 'exit' && t.pathI <= i + 3) || g.spawnQueue.includes('gull');
    let best: Pt | null = null, bs = 0;
    for (const p of w.path) {
      if (!g.canLure(p.x, p.y).ok || gullsBefore(w.pathIndex[w.idx(p.x, p.y)])) continue;
      let s = 0;
      for (const d of g.defenders) if (d.species === 'ray' && Math.hypot(d.x - p.x, d.y - p.y) <= RAY.range) s++;
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
