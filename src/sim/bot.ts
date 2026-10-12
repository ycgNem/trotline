// Scripted players for the pace tests (tests/pace.test.ts) and the browser bot (e2e/bot.mjs).
// Pure: they only read the Game and give it commands, exactly as the HUD does.
//   deployAll: fishes the best water it reaches and deploys every fish; never sells, buys or lures.
//   deployBed: deployAll that also buys the worm bed (and worm packs) with its bounties.
//   sellAll:   fishes and sells everything; buys nothing that defends.
//   good:      a sensible player: sells pufferfish to buy the surf rod and then the worm bed
//              (except in a wave with gulls), and digs the bed rather than buy packs once it can; fishes the dock for puffers ahead of a gull wave (and
//              holds them in the live well through the raccoon wave before it), the reeds for a
//              terrapin or three, and the sand (the point, once it has the rod) for rays; deploys
//              puffers where the rays reach and rays clear of claws; casts a lure where the rays
//              reach the eater and the line waits clear of them, once the gulls are past. `noSell` takes the
//              selling away; `naive` also buys the bed first.
//   idle:      does nothing.
import { Game } from './Game';
import { Tile, type Pt } from './world';
import { DEFENDERS, RAY } from '../data/defenders';
import type { SpeciesId } from '../data/species';
import { WAVES } from '../data/waves';
import { THIEVES } from '../data/thieves';
import { alive } from './systems/thieves';
import { lurePreview, linePreview } from './systems/lures';

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
  /** never buy the surf rod (the pace test of what the rod is worth) */
  noRod?: boolean;
  /** the good bot without the investing: worm bed first, then the rod from bounty; sells nothing */
  naive?: boolean;
  /** the good bot without the selling: the rod first all the same, from bounty */
  noSell?: boolean;
  /** the good bot casting no worm lures at all */
  noLure?: boolean;
  /** the good bot casting its worms beside the most rays, blind to the line wading at them */
  lureBlind?: boolean;
}

/** The good bot's caps (DESIGN.md §7): every ray and puffer it can place, terrapins up to three;
 * the rest it sells. */
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
    // out of worms with no bed: the good bot digs the bed once the rod is in hand and it can pay
    // for it, rather than spend the bed's money on packs a few dollars at a time
    if (g.worms < 1 && !g.wormBed && this.strategy === 'good' && this.invested(true) && g.money >= (g.price('wormbed') ?? 1e9)) g.act({ k: 'buy', item: 'wormbed' });
    if (g.worms < 1 && !g.wormBed && g.money >= 5 && this.strategy !== 'deployAll') g.act({ k: 'buy', item: 'worms' });
    // the bed can't keep a surf rod fed and a worm on the road: once invested, the good bot keeps
    // four in the can from the bait shop (selling funds bait, DESIGN.md §3)
    if (this.strategy === 'good' && g.wormBed && g.worms < 4 && g.money >= 5 + (g.rodTier < 2 && !this.opts.noRod ? g.price('rod') ?? 0 : 0)) g.act({ k: 'buy', item: 'worms' });
    if (this.strategy === 'deployBed' && !g.wormBed && g.money >= 40) g.act({ k: 'buy', item: 'wormbed' });
    const want = this.want();
    const spot = this.castSpot(want);
    if (!spot) return;
    if (g.fishing && this.score(g.fishing, want) >= this.score(spot, want) - 1e-9) return;
    g.act({ k: 'cast', x: spot.x, y: spot.y });
  }

  /** What the good bot fishes for now: puffers for the gulls coming, a terrapin or two for the
   * raccoons, rays otherwise. Other strategies take whatever bites best. */
  private want(): SpeciesId | null {
    const g = this.g;
    if (this.strategy !== 'good') return null;
    const have = (s: SpeciesId) => g.defenders.filter((d) => d.species === s).length + g.liveWell.filter((q) => q === s).length;
    // gulls coming now or next: a pufferfish for each flock (its alarm turns the rest back)
    const flocks = Math.ceil(Math.max(this.gulls(0), this.gulls(1)) / THIEVES.gull.flock);
    if (flocks && have('puffer') < flocks) return 'puffer';
    // investing: puffers by the dock, to sell for the rod and the bed
    if (!this.opts.naive && !this.opts.noSell && !this.invested()) return 'puffer';
    if (have('turtle') < (this.opts.keep ?? KEEP).turtle) return 'turtle';
    return 'ray';
  }

  /** Has it bought what it invests in: the rod (unless told not to), then the bed? `rodOnly`:
   * just the rod. */
  private invested(rodOnly = false): boolean {
    const g = this.g;
    const rod = this.opts.noRod || g.rodTier >= 2;
    return rodOnly ? rod : rod && g.wormBed;
  }

  /** Gulls in the wave being fought or about to start (k 0), or the one after it (k 1). */
  private gulls(k: number): number {
    const g = this.g;
    const w = WAVES[(g.phase === 'wave' ? g.wave - 1 : g.wave) + k];
    return w?.groups.filter(([id]) => id === 'gull').reduce((n, [, c]) => n + c, 0) ?? 0;
  }

  /** Keep pufferfish in the live well while the coming wave has no gulls and the one after it
   * does: deployed now, the raccoons would eat them first. Leaves two slots free to fish. */
  private holdPuffer(): boolean {
    const g = this.g;
    if (this.strategy !== 'good' || this.gulls(0) || !this.gulls(1)) return false;
    return g.liveWell.filter((s) => s === 'puffer').length <= g.liveWell.length - 2;
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
    // the rod first (it reaches the rays), then the worm bed; naive: the other way round
    const cost = g.price('rod');
    const rod = () => !this.opts.noRod && cost !== null && g.money >= cost && g.act({ k: 'buy', item: 'rod' }).ok;
    if (!this.opts.naive && !this.opts.noRod && g.rodTier < 2) { rod(); return; }
    if (!g.wormBed) { if (g.money >= (g.price('wormbed') ?? 1e9)) g.act({ k: 'buy', item: 'wormbed' }); return; }
    rod();
  }

  private deploy() {
    const g = this.g;
    g.liveWell.forEach((s, i) => {
      if (!s) return;
      if (this.strategy === 'good' && !this.keep(s)) { g.act({ k: 'sell', slot: i }); return; }
      if (s === 'puffer' && this.holdPuffer()) return;
      const spot = this.bestTile(s);
      if (spot) g.act({ k: 'deploy', slot: i, x: spot.x, y: spot.y });
      // a terrapin with no ray to shock its line waits in the live well while there is room
      else if (s === 'turtle' && g.liveWell.filter((q) => !q).length >= 2) return;
      else if (this.strategy === 'good') g.act({ k: 'sell', slot: i });
    });
  }

  /** The good bot keeps fish it has a use for and sells the rest. */
  private keep(s: SpeciesId): boolean {
    const g = this.g;
    const n = (sp: SpeciesId) => g.defenders.filter((d) => d.species === sp).length;
    const cap = this.opts.keep ?? KEEP;
    // investing: sell pufferfish toward the rod and then the bed, except in a wave with gulls and
    // except the ones the next gull wave's flocks will want
    if (!this.opts.naive && !this.opts.noSell && s === 'puffer' && !this.invested() && !this.gulls(0)) {
      const need = Math.ceil(this.gulls(1) / THIEVES.gull.flock);
      const held = g.liveWell.filter((q) => q === 'puffer').length + n('puffer');
      if (held > need) return false;
    }
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
            // road it can shock: in reach and wet (DESIGN.md §4: dry ground carries no shock)
            for (const p of w.path) if (w.wet[w.idx(p.x, p.y)] && Math.hypot(p.x + 0.5 - cx, p.y + 0.5 - cy) <= def.range) score++;
            // 1 tile from the road a ray gets clawed (DESIGN.md §4): every bot keeps it 2 out, as
            // the deploy tooltip says
            if (rd < 2) score -= 6;
          }
        } else if (def.kind === 'poison') {
          // where the most road passes within reach, away from the other puffers
          let first = w.path.length;
          w.path.forEach((p, i) => { if (Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= def.trigger) { score++; first = Math.min(first, i); } });
          for (const d of g.defenders) if (d.species === 'puffer' && Math.max(Math.abs(d.x - x), Math.abs(d.y - y)) <= 3) score -= 10;
          // where the rays reach, so the thief it paralyses stands in their fire (DESIGN.md §4)
          for (const d of g.defenders) if (d.species === 'ray' && Math.hypot(d.x - x, d.y - y) <= RAY.range) score += 2;
          // early on the road, so what it sickens walks past the rays afterwards
          score -= first * 0.02;
        } else {
          // a terrapin on the road where the most rays shock the raccoon worrying it, and its line
          // waits clear of them (the same reading as a worm's, DESIGN.md §4, §6)
          if (w.at(x, y) !== Tile.Road) continue;
          const pv = linePreview(g, w.pathIndex[w.idx(x, y)], 0.5 + THIEVES.raccoon.len / 2);
          if (!pv.shocks.length) continue;
          score += 3 * pv.shocks.length - 2 * pv.waded.length;
          score -= Math.abs(w.pathIndex[w.idx(x, y)] - w.path.length * 0.6) * 0.05;
          for (const d of g.defenders) if (d.species === 'turtle' && Math.abs(d.roadI - w.pathIndex[w.idx(x, y)]) < 3) score -= 20;
        }
        if (score > bs) { bs = score; best = { x, y }; }
      }
    return best;
  }

  private lure() {
    const g = this.g;
    if (this.opts.noLure) return;
    if (this.opts.lureMid) {
      if (g.phase === 'wave' && this.luredWave !== g.wave) {
        this.luredWave = g.wave;
        const p = g.world.path[Math.floor(g.world.path.length / 2)];
        g.act({ k: 'lure', x: p.x, y: p.y });
      }
      return;
    }
    if (this.strategy !== 'good' || g.phase !== 'wave' || g.lures.length > 0 || g.worms < 2) return;
    const lurable = g.thieves.some((t) => t.kind === 'raccoon' && t.mode === 'road') || g.spawnQueue.includes('raccoon');
    if (!lurable) return;
    // the reachable road tile, that no gull still has to pass, whose eater the most rays reach,
    // less the fish its line would wade at (DESIGN.md §6: a worm a tile short of a ray)
    const w = g.world;
    const gullsBefore = (i: number) => g.thieves.some((t) => t.kind === 'gull' && alive(t) && t.mode !== 'exit' && t.pathI <= i + 3) || g.spawnQueue.includes('gull');
    let best: Pt | null = null, bs = 0;
    for (const p of w.path) {
      if (!g.canLure(p.x, p.y).ok || gullsBefore(w.pathIndex[w.idx(p.x, p.y)])) continue;
      let s = 0;
      if (this.opts.lureBlind) {
        for (const d of g.defenders) if (d.species === 'ray' && Math.hypot(d.x - p.x, d.y - p.y) <= RAY.range) s++;
      } else {
        const pv = lurePreview(g, p.x, p.y);
        s = pv.shocks.length - 0.6 * pv.waded.length;
      }
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
