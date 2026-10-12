// Scripted players for the pace tests (tests/pace-*.test.ts) and the browser bot (e2e/bot.mjs).
// Pure: they only read the Game and give it commands, exactly as the HUD does.
//   deployAll: fishes the best water it reaches and deploys every fish; never sells, buys or lures.
//   deployBed: deployAll that also buys the worm bed (and worm packs) with its bounties.
//   sellAll:   fishes and sells everything; buys nothing that defends.
//   good:      a strong player: sells the dawn ray and pufferfish to buy the surf rod (except in a
//              wave with gulls), then rays past three toward the rowboat, then the rowboat's catch
//              toward the trawler (DESIGN.md §12), kind by kind; sends each boat where the fish
//              it is worth most bite (the point's rays are shared) and moves it when better water
//              opens; keeps six worms in the can from the bait shop and chum for the bears and
//              the flocks; fishes the dock for puffers ahead of a gull wave (and holds them in the
//              live well through the raccoon wave before it), the point (once it has the rod) for
//              rays, and the reeds for terrapins once twelve rays are down; deploys rays two tiles
//              out on the wet road the rod can cast to, puffers where the rays reach, and
//              terrapins where the rays shock their line and the line wades no ray; lays worms on
//              the road while fewer than four rays are down (the opening's bait: later the money
//              is the fleet's, DESIGN.md §7), where the rays reach the eater and the line waits
//              clear of them, once the gulls are past. `noSell` takes the selling away; `naive`
//              also buys the bed first.
//   idle:      does nothing.
import { Game, type BuyItem } from './Game';
import { Tile, isWater, type Pt } from './world';
import { DEFENDERS, RAY } from '../data/defenders';
import { BOATS, FLEET, TRAWL, type BoatId } from '../data/boats';
import { CHUM } from '../data/bait';
import { CANAL } from '../data/shore';
import { pufferRays } from './systems/defenders';
import { SPECIES_ORDER, type SpeciesId } from '../data/species';
import { WAVES } from '../data/waves';
import { THIEVES } from '../data/thieves';
import { alive } from './systems/thieves';
import { lurePreview, linePreview, comingRaccoons } from './systems/lures';

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
  /** worms the good bot keeps on the road at once, at least 5 road tiles apart (default 2) */
  lures?: number;
  /** worms it keeps in the can once the rod is bought (default 6) */
  can?: number;
  /** sell the ray caught at dawn at once, toward the rod (the good bot's opening, DESIGN.md §7;
   * false: deploy it, the other opening) */
  sellRay?: boolean;
  /** rays it has before it fishes puffers for the gull flocks (default 4) */
  gullRays?: number;
  /** rays deployed before the good bot fishes for terrapins (default 12) */
  raysFirst?: number;
  /** let a terrapin's line wade a ray (default: never) */
  wadeOk?: boolean;
  /** never buy the surf rod (the pace test of what the rod is worth) */
  noRod?: boolean;
  /** the good bot without the investing: worm bed first, then the rod from bounty; sells nothing */
  naive?: boolean;
  /** the good bot without the selling: the rod first all the same, from bounty */
  noSell?: boolean;
  /** the good bot casting no worm lures at all */
  noLure?: boolean;
  /** lay worms on the road only while fewer rays than this are down (default 4: worms are the
   * opening's bait; laid every wave they cost the fleet 5-20 wins, DESIGN.md §7) */
  lureRays?: number;
  /** lay worms on the road only up to this wave (default: every wave) */
  lureTo?: number;
  /** lay a worm with bears still to come (default true; false: a worm's line would hold them) */
  lureBears?: boolean;
  /** dig the worm bed once the rod is bought (default true) */
  bed?: boolean;
  /** the good bot casting its worms beside the most rays, blind to the line wading at them */
  lureBlind?: boolean;
  /** what it buys, in order (default: the rod, rowboat, worm bed, skiff, trawler) */
  plan?: BuyItem[];
  /** what it sells pufferfish toward (default: the rod and the rowboat) */
  invest?: BuyItem[];
  /** rays it keeps deployed while it sells the rest toward a boat (default 3: the rowboat by wave
   * 3; at 6 it came at wave 6 and the same bot won 85-94 against 96-99, DESIGN.md §7) */
  rayFloor?: number;
  /** no boats at all (the pace test of what the fleet is worth) */
  noBoats?: boolean;
  /** no chum: no buckets, no slicks */
  noChum?: boolean;
  /** slicks for the gull flocks as well as the bears (default true) */
  gullSlicks?: boolean;
  /** slicks on the water at once (default 1) */
  slicks?: number;
  /** keep a wave's worth of chum in hand rather than buying a bucket as each is needed */
  chumStock?: boolean;
  /** seconds before a wave it starts buying chum for it (default 8) */
  chumLead?: number;
  /** no canals */
  noDig?: boolean;
  /** dig canals (default false: on Back Bay they measure as worth nothing, DESIGN.md §7) */
  dig?: boolean;
  /** dig before saving for the next boat */
  digFirst?: boolean;
  /** sell a ray whose best tile scores under this (default: deploy every ray it can) */
  minRay?: number;
  /** with a boat out, its catch goes to market toward the next boat while enough rays are down
   * (default true; false: the boats' catch is always kept, the defending line, DESIGN.md §7) */
  boatSells?: boolean;
  /** how many boats it sells toward (default 2: the rowboat pays for the trawler) */
  fleet?: number;
  /** never move a boat once sent (the set-and-forget player) */
  fixedBoats?: boolean;
  /** the least a canal project must be worth for each tile it takes (default 0.3) */
  digValue?: number;
  /** what it has bought before it digs at all (default the rowboat; null: no wait) */
  digAfter?: BuyItem | null;
}

/** The good bot's caps (DESIGN.md §7): every ray and puffer it can place, terrapins up to three;
 * the rest it sells. */
export const KEEP = { ray: 99, puffer: 99, turtle: 3 };

export class Bot {
  private luredWave = -1;
  /** the score of the tile bestTile last chose */
  private lastScore = 0;
  /** the far end of the canal it is digging (a tile index), kept until it is dug */
  private digTarget: number | null = null;
  private digAt = -1e9;
  /** the cast spot it last worked out, and for what */
  private cast: { key: string; spot: Pt | null } | null = null;
  private soldDawn = false;
  private rethoughtWave = -1;
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
    const pack = g.price('worms') ?? 5;
    if (g.worms < 1 && !g.wormBed && g.money >= pack && this.strategy !== 'deployAll') g.act({ k: 'buy', item: 'worms' });
    // once the rod is bought the good bot keeps six worms in the can from the bait shop, for the
    // line and two worms on the road (selling funds bait, DESIGN.md §3)
    if (this.strategy === 'good' && this.hasRod() && g.worms < (this.opts.can ?? 6) && g.money >= pack) g.act({ k: 'buy', item: 'worms' });
    if (this.strategy === 'deployBed' && !g.wormBed && g.money >= 40) g.act({ k: 'buy', item: 'wormbed' });
    const want = this.want();
    // where to cast changes only with what it wants, the rod and the water (rates scale together
    // in a wave), so the search is kept until one of those does
    const key = `${want}|${g.rodTier}|${g.world.version}`;
    if (this.cast?.key !== key) this.cast = { key, spot: this.castSpot(want) };
    const spot = this.cast.spot;
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
    // gulls coming now or next: a pufferfish for each flock, where rays reach (its flock lands
    // there), once there are rays to reach it: a puffer alone kills only the gull that eats it
    const flocks = Math.ceil(Math.max(this.gulls(0), this.gulls(1)) / THIEVES.gull.flock);
    if (flocks && have('ray') >= (this.opts.gullRays ?? 4) && have('puffer') < flocks) return 'puffer';
    // investing: puffers by the dock, to sell for the rod
    if (!this.opts.naive && !this.opts.noSell && !this.hasRod()) return 'puffer';
    // rays first: a terrapin holds a line for the rays to work, so it is worth its fishing time
    // only once there are rays to work it (the slice: after 8 it added ~2 crates a won run, after 4
    // the rays it cost were worth more; the season, with the fleet's rays: after 12, DESIGN.md §7)
    if (have('ray') >= (this.opts.raysFirst ?? 12) && have('turtle') < (this.opts.keep ?? KEEP).turtle) return 'turtle';
    return 'ray';
  }

  /** Has it the surf rod (or was it told not to buy one)? */
  private hasRod(): boolean {
    return !!this.opts.noRod || this.g.rodTier >= 2;
  }

  /** Has it bought what it sells puffers for: the surf rod, then the first boat (DESIGN.md §12),
   * or what it was told to invest in? */
  private invested(): boolean {
    const g = this.g;
    const items = (this.opts.invest ?? ['rod', 'rowboat']).filter((i) => this.plan().includes(i));
    return items.every((i) => (i === 'rod' ? g.rodTier >= 2 : i === 'wormbed' ? g.wormBed : i in BOATS ? !!g.boat(i as BoatId) : true));
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

  /** What the good bot buys, in order (DESIGN.md §7, §12): the rod, then the fleet and the bed. */
  plan(): BuyItem[] {
    const o = this.opts;
    let p: BuyItem[] = o.plan ?? ['rod', 'rowboat', 'trawler', 'skiff', 'wormbed'];
    if (o.naive) p = ['wormbed', ...p.filter((q) => q !== 'wormbed')];
    if (o.noRod) p = p.filter((q) => q !== 'rod');
    if (o.bed === false) p = p.filter((q) => q !== 'wormbed');
    if (o.noBoats) p = p.filter((q) => !(q in BOATS));
    return p;
  }

  private buy() {
    const g = this.g;
    if (this.strategy !== 'good') return;
    // the next thing on the plan not yet bought; it saves for it (the rod first: it reaches the rays)
    for (const item of this.plan()) {
      const cost = g.price(item);
      if (cost === null) continue;
      if (g.money >= cost + (item === 'rod' ? 0 : this.reserve())) {
        if (g.act({ k: 'buy', item }).ok && item in BOATS) this.sendBoat(item as BoatId);
      }
      break;
    }
    if (this.opts.boatSells ?? true) this.boatSells();
    if (!this.opts.fixedBoats) this.rethinkBoats();
    this.dig();
    this.chum();
  }

  /** The first boat pays for the second (DESIGN.md §12): while a boat on the plan is still to buy
   * and the rays it keeps down are in the water, the line boats' catch goes to market. */
  private boatSells() {
    const g = this.g;
    const next = this.plan().find((i) => i in BOATS && g.price(i) !== null);
    const rays = g.defenders.filter((d) => d.species === 'ray').length;
    const sell = !!next && g.boats.length < (this.opts.fleet ?? 2) && rays >= (this.opts.rayFloor ?? 3);
    for (const b of g.boats) {
      if (BOATS[b.kind].gear !== 'line') continue;
      for (const s of SPECIES_ORDER) if (b.sell.includes(s) !== sell) g.act({ k: 'boatSell', boat: b.kind, species: s, sell });
    }
  }

  /** Money it keeps back from the next purchase: a pack of worms and a bucket of chum. */
  private reserve(): number {
    return (this.g.price('worms') ?? 8) + (this.opts.noChum ? 0 : CHUM.bucketCost);
  }

  /** What a fish of a kind is worth to it, landed by a boat: rays do the killing; puffers answer
   * the gull flocks (more when flocks are coming); terrapins hold a line, a little. */
  private worth(s: SpeciesId): number {
    if (s === 'ray') return 1;
    if (s === 'puffer') return this.gulls(0) || this.gulls(1) ? 0.8 : 0.4;
    return 0.25;
  }

  /** How good a tile is for a boat now: what it would land there a minute, each kind at its worth,
   * sharing the point's rays with the lines already there (DESIGN.md §12), less a little for the trip. */
  private anchorScore(kind: BoatId, at: Pt, dist: number): number {
    const g = this.g, def = BOATS[kind];
    const bites = def.gear === 'net' ? (Object.keys(TRAWL.fish) as SpeciesId[]).map((s) => g.trawlRate(at, s, kind)) : g.biteTable(at, def, false, kind);
    return bites.reduce((n, q) => n + q.rate * this.worth(q.s), 0) - dist * 0.01;
  }

  /** The best tile to send a boat to now, and its score. */
  private bestAnchor(kind: BoatId): { at: Pt; score: number } | null {
    const g = this.g, w = g.world;
    const { dist } = w.waterField(FLEET.berths[kind]);
    let best: { at: Pt; score: number } | null = null;
    for (let y = 0; y < w.h; y++)
      for (let x = 0; x < w.w; x++) {
        const d = dist[w.idx(x, y)];
        if (d === Infinity || !w.zone[w.idx(x, y)] || !g.canSend(kind, x, y).ok) continue;
        const score = this.anchorScore(kind, { x, y }, d);
        if (!best || score > best.score) best = { at: { x, y }, score };
      }
    return best;
  }

  /** Send a boat where it does the most now (DESIGN.md §12). */
  private sendBoat(kind: BoatId) {
    const best = this.bestAnchor(kind);
    if (best) this.g.act({ k: 'send', boat: kind, x: best.at.x, y: best.at.y });
  }

  /** Each build, move a boat whose water has got worse than the best it could have (the rod came
   * to the point and shares its rays, or the flocks are coming and puffers are wanted). */
  private rethinkBoats() {
    const g = this.g;
    if (g.phase !== 'build' || this.rethoughtWave === g.wave) return;
    this.rethoughtWave = g.wave;
    for (const b of g.boats) {
      if (!b.anchor) continue;
      const best = this.bestAnchor(b.kind);
      if (!best) continue;
      const d = g.world.waterField(FLEET.berths[b.kind]).dist[g.world.idx(b.anchor.x, b.anchor.y)];
      const now = this.anchorScore(b.kind, b.anchor, d);
      if (best.score > now * 1.15 + 0.05) g.act({ k: 'send', boat: b.kind, x: best.at.x, y: best.at.y });
    }
  }

  /**
   * Dig canals (DESIGN.md §12) once the investing is done and there is money past the next buy:
   * the tile that turns the most dry road wet next to where rays are, makes a ray slot (2 out), or
   * leads toward a dry stretch of road.
   */
  private dig() {
    const g = this.g;
    if (!this.opts.dig || this.opts.noDig || !this.hasRod() || g.digs.length >= 2) return;
    // not before the first boat it invests in is out (a canal is cheap, but not cheaper than a boat late)
    const after = this.opts.digAfter === undefined ? 'rowboat' : this.opts.digAfter;
    if (after && this.plan().includes(after) && g.price(after) !== null) return;
    if (g.money < CANAL.cost + this.reserve()) return;
    // planning a canal is a search over the shore: once a second at most
    if (g.tick - this.digAt < 60 && !this.digTarget) return;
    this.digAt = g.tick;
    const plan = this.digPlan();
    if (!plan) return;
    // a short canal (up to four tiles) comes before the next boat; a longer one only from money
    // left over after it
    const next = this.plan().map((i) => g.price(i)).find((c) => c !== null) ?? 0;
    const spare = plan.cost <= 4 || this.opts.digFirst ? 0 : next ?? 0;
    if (g.money < CANAL.cost + this.reserve() + spare) return;
    g.act({ k: 'dig', x: plan.first.x, y: plan.first.y });
  }

  /**
   * The canal the bot digs next (DESIGN.md §12): of every dry road tile, and every ray slot a canal
   * could make (2 tiles out) while slots are short, the one with the most value for the tiles it
   * takes to reach from water, where value is the rays (deployed, or the slot itself) that would
   * shock there. Returns the first tile of that chain to dig (the one touching water) and the
   * chain's length.
   */
  digPlan(): { first: Pt; cost: number } | null {
    const g = this.g, w = g.world;
    const n = w.w * w.h;
    const dist = new Int32Array(n).fill(-1), prev = new Int32Array(n).fill(-1);
    const queued = new Set(g.digs.map((p) => w.idx(p.x, p.y)));
    const water = (x: number, y: number) => w.inb(x, y) && (isWater(w.at(x, y)) || queued.has(w.idx(x, y)));
    const open: number[] = [];
    for (let y = 0; y < w.h; y++)
      for (let x = 0; x < w.w; x++) {
        if (g.digBlock(x, y) || queued.has(w.idx(x, y))) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => water(x + dx, y + dy))) { dist[w.idx(x, y)] = 1; open.push(w.idx(x, y)); }
      }
    for (let k = 0; k < open.length; k++) {
      const c = open[k], cx = c % w.w, cy = Math.floor(c / w.w);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = cx + dx, y = cy + dy;
        if (!w.inb(x, y)) continue;
        const j = w.idx(x, y);
        if (dist[j] >= 0 || queued.has(j) || g.digBlock(x, y)) continue;
        dist[j] = dist[c] + 1;
        prev[j] = c;
        open.push(j);
      }
    }
    const rays = g.defenders.filter((d) => d.species === 'ray');
    const raysNear = (x: number, y: number) => rays.filter((d) => Math.hypot(d.x - x, d.y - y) <= RAY.range).length;
    const side = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    // every tile a canal can reach is a project: the chain of tiles from water to it. What a chain
    // is worth is the dry road it wets (more where rays already reach it) and the ray slots it makes
    // (its tiles 2 out from the road, by the wet road they would reach once it is dug)
    let best = -1, bs = 0;
    // keep digging the project it started while it is still there to finish
    const target = this.digTarget !== null && dist[this.digTarget] > 0 ? this.digTarget : -1;
    for (let j = 0; j < n; j++) {
      if (dist[j] < 1 || dist[j] > 14) continue;
      if (target >= 0 && j !== target) continue;
      const chain = new Set<number>();
      for (let c = j; c >= 0; c = prev[c]) chain.add(c);
      const wetsBy = (x: number, y: number) => side.some(([dx, dy]) => w.inb(x + dx, y + dy) && (chain.has(w.idx(x + dx, y + dy)) || queued.has(w.idx(x + dx, y + dy))));
      let value = 0;
      for (const p of w.path) if (!w.wet[w.idx(p.x, p.y)] && wetsBy(p.x, p.y) && !side.some(([dx, dy]) => queued.has(w.idx(p.x + dx, p.y + dy)))) value += 0.5 + raysNear(p.x, p.y);
      for (const c of chain) {
        if (w.roadDist[c] !== 2) continue;
        const cx = c % w.w, cy = Math.floor(c / w.w);
        let road = 0;
        for (const p of w.path) if ((w.wet[w.idx(p.x, p.y)] || wetsBy(p.x, p.y)) && Math.hypot(p.x - cx, p.y - cy) <= RAY.range) road++;
        if (road >= 5) value += road / 5;
      }
      const sc = value / dist[j];
      if (sc > bs) { bs = sc; best = j; }
    }
    this.digTarget = best >= 0 ? best : null;
    if (best < 0 || bs < (this.opts.digValue ?? 0.3)) { this.digTarget = null; return null; }
    let j = best;
    while (prev[j] >= 0) j = prev[j];
    return { first: { x: j % w.w, y: Math.floor(j / w.w) }, cost: dist[best] };
  }

  /** Chum (DESIGN.md §12): keep buckets in hand for the bears and gulls coming, and cast a slick
   * where rays reach what comes to it, for the bears once the gulls are past, for gulls before. */
  private chum() {
    const g = this.g, w = g.world;
    if (this.opts.noChum) return;
    const coming = (id: string) => (k: number) => {
      const wv = WAVES[(g.phase === 'wave' ? g.wave - 1 : g.wave) + k];
      return wv?.groups.filter(([q]) => q === id).reduce((n, [, c]) => n + c, 0) ?? 0;
    };
    const bears = coming('bear'), gulls = coming('gull');
    const want = Math.min(3, Math.ceil(bears(0) / 3) + (this.opts.gullSlicks !== false ? Math.ceil(gulls(0) / 6) : 0));
    // bought as it is needed (a bucket at a time, once the wave is on or about to be), not stocked:
    // money stocked in buckets is money not saved for the trawler that makes them
    const soon = g.phase === 'wave' || g.phaseTime < (this.opts.chumLead ?? 8);
    const need = this.opts.chumStock ? want : Math.min(want, 1);
    if (this.hasRod() && soon && g.chum < need && g.money >= CHUM.bucketCost + (g.price('worms') ?? 8)) g.act({ k: 'buy', item: 'chum' });
    if (g.phase !== 'wave' || g.chum < 1) return;
    if (g.lures.filter((l) => l.bait === 'chum').length >= (this.opts.slicks ?? 1)) return;
    const live = (k: string) => g.thieves.filter((t) => t.kind === k && alive(t) && t.mode !== 'exit');
    const lead = live('bear').filter((t) => t.mode === 'road').reduce((m, t) => Math.max(m, t.pathI), -1);
    const gullLeft = (i: number) => g.thieves.some((t) => t.kind === 'gull' && alive(t) && t.mode !== 'exit' && t.pathI <= i + 4) || g.spawnQueue.includes('gull');
    const forBears = (lead >= 0 || g.spawnQueue.includes('bear'));
    const forGulls = this.opts.gullSlicks !== false && (live('gull').length > 0 || g.spawnQueue.includes('gull'));
    if (!forBears && !forGulls) return;
    let best: Pt | null = null, bs = 0;
    for (let y = 0; y < w.h; y++)
      for (let x = 0; x < w.w; x++) {
        if (!g.canSlick(x, y).ok) continue;
        const ri = w.roadNear[w.idx(x, y)];
        let s = 0;
        for (const d of g.defenders) if (d.species === 'ray' && Math.hypot(d.x - x, d.y - y) <= RAY.range) s += 1;
        if (forBears && !gullLeft(ri)) {
          // ahead of the first bear, a little: it has to walk to it
          if (ri < lead + 3) continue;
          // the next bear waits on the road behind the one eating, wading a tile at whatever is there
          for (const d of g.defenders) {
            if (DEFENDERS[d.species].place !== 'water' || DEFENDERS[d.species].kind === 'poison') continue;
            for (let k = 0; k <= 3; k++) {
              const p = w.pathBack(ri, k * THIEVES.bear.len);
              if (Math.max(Math.abs(d.x + 0.5 - p.x), Math.abs(d.y + 0.5 - p.y)) <= THIEVES.bear.wade) { s -= 0.6; break; }
            }
          }
        } else if (!forGulls) continue;
        if (s > bs) { bs = s; best = { x, y }; }
      }
    if (best && bs >= 1) g.act({ k: 'slick', x: best.x, y: best.y });
  }

  private deploy() {
    const g = this.g;
    // the other opening: sell the ray caught at dawn toward the rod rather than deploy it
    if ((this.opts.sellRay ?? (this.strategy === 'good' && !this.opts.noSell)) && !this.soldDawn) {
      this.soldDawn = true;
      const i = g.liveWell.indexOf('ray');
      if (i >= 0) g.act({ k: 'sell', slot: i });
    }
    // broke with an empty can: sell a fish for bait rather than stop fishing (every catch takes a
    // worm, DESIGN.md §3)
    if (this.strategy === 'good' && !this.opts.noSell && g.worms < 1 && !g.wormBed && g.money < (g.price('worms') ?? 5)) {
      const i = g.liveWell.findIndex(Boolean);
      if (i >= 0) g.act({ k: 'sell', slot: i });
    }
    g.liveWell.forEach((s, i) => {
      if (!s) return;
      if (this.strategy === 'good' && !this.keep(s)) { g.act({ k: 'sell', slot: i }); return; }
      if (s === 'puffer' && this.holdPuffer()) return;
      const spot = this.bestTile(s);
      // a ray with nowhere good to go (every slot 2 out with wet road taken) is worth more sold:
      // set 1 tile out it is clawed to death (DESIGN.md §4, §12)
      if (spot && s === 'ray' && this.strategy === 'good' && this.lastScore < (this.opts.minRay ?? -99)) { g.act({ k: 'sell', slot: i }); return; }
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
    // investing: sell pufferfish toward the rod, except in a wave with gulls and except the ones
    // the next gull wave's flocks will want
    if (!this.opts.naive && !this.opts.noSell && s === 'puffer' && !this.invested() && !this.gulls(0)) {
      const need = Math.ceil(this.gulls(1) / THIEVES.gull.flock);
      const held = g.liveWell.filter((q) => q === 'puffer').length + n('puffer');
      if (held > need) return false;
    }
    // with the rod and short of the first boat: rays past a floor go to market too (a boat is
    // two rays a minute for the rest of the run, DESIGN.md §12)
    if (!this.opts.naive && !this.opts.noSell && s === 'ray' && this.hasRod() && !this.invested() && n('ray') >= (this.opts.rayFloor ?? 3)) return false;
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
            // road it can shock: in reach and wet (DESIGN.md §4: dry ground carries no shock), worth
            // double where the rod can cast a worm (a line forms there: the dawn ray goes by the dock)
            for (const p of w.path) if (w.wet[w.idx(p.x, p.y)] && Math.hypot(p.x + 0.5 - cx, p.y + 0.5 - cy) <= def.range) score += w.castDist(p.x, p.y) <= g.rod.range ? 1 : 0.5;
            // 1 tile from the road a ray gets clawed (DESIGN.md §4): every bot keeps it 2 out, as
            // the deploy tooltip says
            if (rd < 2) score -= 6;
          }
        } else if (def.kind === 'poison') {
          // where the most road passes within reach, away from the other puffers
          let first = w.path.length;
          w.path.forEach((p, i) => { if (Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= def.trigger) { score++; first = Math.min(first, i); } });
          for (const d of g.defenders) if (d.species === 'puffer' && Math.max(Math.abs(d.x - x), Math.abs(d.y - y)) <= 3) score -= 10;
          // where the rays reach, so the thief it paralyses (and a gull flock landing round it)
          // stands in their fire: the deploy preview's reading (DESIGN.md §4)
          for (const d of g.defenders) if (d.species === 'ray' && Math.hypot(d.x - x, d.y - y) <= RAY.range) score += 1;
          score += pufferRays(g, x, y).length;
          // early on the road, so what it sickens walks past the rays afterwards
          score -= first * 0.02;
        } else {
          // a terrapin on the road where the most rays shock the raccoon worrying it, and its line
          // waits clear of them (the same reading as a worm's, DESIGN.md §4, §6)
          if (w.at(x, y) !== Tile.Road) continue;
          const ri = w.pathIndex[w.idx(x, y)];
          const coming = comingRaccoons(g, ri);
          const pv = linePreview(g, ri, 0.5 + THIEVES.raccoon.len / 2, coming);
          if (!pv.shocks.length) continue;
          // a terrapin near the road's start holds a short line and the rest walk round it
          if (pv.line.length < Math.min(coming, 6)) continue;
          // never where the line waiting behind it would wade out to a ray and claw it (a line wades
          // 2 tiles: DESIGN.md §4): a terrapin that costs a ray is worth less than none
          if (pv.waded.length && !this.opts.wadeOk) continue;
          score += 3 * pv.shocks.length - 2 * pv.waded.length;
          score -= Math.abs(w.pathIndex[w.idx(x, y)] - w.path.length * 0.6) * 0.05;
          for (const d of g.defenders) if (d.species === 'turtle' && Math.abs(d.roadI - w.pathIndex[w.idx(x, y)]) < 3) score -= 20;
        }
        if (score > bs) { bs = score; best = { x, y }; }
      }
    this.lastScore = bs;
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
    if (this.strategy !== 'good' || g.phase !== 'wave' || g.lures.length >= (this.opts.lures ?? 2) || g.worms < 2) return;
    if (g.wave > (this.opts.lureTo ?? 99)) return;
    if (this.opts.lureBears === false && (g.spawnQueue.includes('bear') || g.thieves.some((t) => t.kind === 'bear' && alive(t) && t.mode !== 'exit'))) return;
    if (g.defenders.filter((d) => d.species === 'ray').length >= (this.opts.lureRays ?? 4)) return;
    const lurable = g.thieves.some((t) => t.kind === 'raccoon' && t.mode === 'road') || g.spawnQueue.includes('raccoon');
    if (!lurable) return;
    // the reachable road tile, that no gull still has to pass, whose eater the most rays reach,
    // less the fish its line would wade at (DESIGN.md §6: a worm a tile short of a ray)
    const w = g.world;
    const gullsBefore = (i: number) => g.thieves.some((t) => t.kind === 'gull' && alive(t) && t.mode !== 'exit' && t.pathI <= i + 3) || g.spawnQueue.includes('gull');
    let best: Pt | null = null, bs = 0;
    for (const p of w.path) {
      const ri = w.pathIndex[w.idx(p.x, p.y)];
      if (!g.canLure(p.x, p.y).ok || gullsBefore(ri)) continue;
      // a second worm goes on another kill zone, clear of the first one's line
      if (g.lures.some((l) => Math.abs(l.roadI - ri) < 5)) continue;
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
export function playRun(seed: number, strategy: Strategy, opts: BotOpts = {}, maxTicks = 60 * 60 * 60): Game {
  const g = new Game(seed);
  const bot = new Bot(g, strategy, opts);
  for (let i = 0; i < maxTicks && !g.over; i++) {
    if (i % 10 === 0) bot.think();
    g.step();
    if (opts.untilWave && g.wave >= opts.untilWave && g.phase === 'build') break;
  }
  return g;
}
