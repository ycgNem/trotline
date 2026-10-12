// The run: state, the player's commands and the fixed system order (CLAUDE.md). Pure: no DOM,
// canvas, audio or timers. Presentation effects are events on `events`, drained by the renderer.
// Every command the player gives is recorded with its tick in `log`, so a run is its seed plus
// that log (the save is exactly that; Game.replay rebuilds it).
import { DT } from '../engine/time';
import { Rng } from '../engine/rng';
import { EventQueue } from '../engine/events';
import { World, Tile, isWater, type Pt } from './world';
import { RULES } from '../data/rules';
import { SPECIES, SPECIES_ORDER, sizeRank, type SpeciesId } from '../data/species';
import { DEFENDERS } from '../data/defenders';
import { THIEVES, type ThiefId } from '../data/thieves';
import { WAVES } from '../data/waves';
import { RODS } from '../data/rods';
import { BAIT, WORMS, type BaitId } from '../data/bait';
import { ZONES, type ZoneId } from '../data/shore';
import { tickWaves } from './systems/waves';
import { tickThieves } from './systems/thieves';
import { tickFishing } from './systems/fishing';
import { tickDefenders } from './systems/defenders';
import { tickLures } from './systems/lures';
import { tickConstruction } from './systems/construction';
import { tickEconomy } from './systems/economy';
import { tickCatchLog } from './systems/catchlog';
import { tickStats } from './systems/stats';

export type Phase = 'build' | 'wave' | 'won' | 'lost';

export interface Defender {
  id: number;
  species: SpeciesId;
  /** tile coordinates */
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** seconds to the next zap pulse */
  cool: number;
  /** a ray: the thief it is shocking (it stays on it while it's in reach) */
  target: number;
  /** road path index, for a turtle */
  roadI: number;
  /** seconds since it last acted or was hurt (for the renderer's flash) */
  acted: number;
  /** a terrapin: the walker worrying it (0: none) and the walkers waiting behind, in order */
  worrier: number;
  queue: number[];
}

/**
 * road: walking to the smokehouse. toLure / queue / eat: at a lure. worry / wait: at a terrapin
 * (worrying it, or waiting behind the one that is). exit: leaving with crates (walkers south into
 * the woods, gulls north over the water).
 */
export type ThiefMode = 'road' | 'toLure' | 'queue' | 'eat' | 'worry' | 'wait' | 'exit' | 'dead' | 'gone';

export interface Thief {
  id: number;
  kind: ThiefId;
  /** position in tiles (centre of the animal) */
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** the road waypoint it is walking to */
  pathI: number;
  /** the exit waypoint it is walking to, once it has crates */
  exitI: number;
  carrying: number;
  mode: ThiefMode;
  /** the lure it is going to, queued at or eating (0: none) */
  lure: number;
  eatLeft: number;
  /** the terrapin it is worrying or waiting at (0: none), and seconds of worrying left */
  turtle: number;
  worryLeft: number;
  /** lures it has eaten from and terrapins it has given up on: it passes them by */
  fed: number[];
  /** seconds it can't move (retching up a pufferfish) */
  stunT: number;
  /** poison damage still to come, and the seconds it comes over */
  poison: number;
  poisonT: number;
  /** the water defender it is clawing at as it walks past (0: none) */
  grabbing: number;
  facing: 1 | -1;
  /** seconds since it was last hit (for the renderer's flash) */
  hitT: number;
  /** the wave it belongs to (1-based) */
  wave: number;
}

export interface Lure {
  id: number;
  x: number;
  y: number;
  roadI: number;
  bait: BaitId;
  /** thief-seconds of eating left */
  food: number;
  eater: number;
  queue: number[];
}

export type Command =
  | { k: 'cast'; x: number; y: number }
  | { k: 'reel' }
  | { k: 'sell'; slot: number }
  | { k: 'deploy'; slot: number; x: number; y: number }
  | { k: 'lure'; x: number; y: number }
  | { k: 'buy'; item: 'wormbed' | 'rod' | 'worms' }
  | { k: 'call' };

export interface Result { ok: boolean; why?: string }

export interface WaveStats {
  wave: number;
  /** thieves that reached the smokehouse */
  leaks: number;
  stolen: number;
  recovered: number;
  escaped: number;
  killed: number;
}

export class Game {
  readonly seed: number;
  tick = 0;
  rng: Rng;
  events = new EventQueue();
  world: World;

  phase: Phase = 'build';
  /** seconds left in the build phase */
  phaseTime = RULES.firstBuild;
  /** waves started so far (the current wave's number while one runs) */
  wave = 0;
  money = RULES.startMoney;
  crates = RULES.crates;
  worms = WORMS.start;
  wormBed = false;
  wormBedT = 0;
  rodTier = 1;
  liveWell: (SpeciesId | null)[] = Array.from({ length: RULES.liveWell }, (_, i) => RULES.startWell[i] ?? null);

  /** where the line is in the water (tile), or null when reeled in */
  fishing: Pt | null = null;
  fishZone: ZoneId | null = null;

  defenders: Defender[] = [];
  thieves: Thief[] = [];
  lures: Lure[] = [];
  /** thieves still to spawn this wave, in order */
  spawnQueue: ThiefId[] = [];
  spawnT = 0;

  /** catches made this tick, for the catch log system */
  tickCatches: SpeciesId[] = [];
  caught: Record<SpeciesId, number> = { puffer: 0, ray: 0, turtle: 0 };
  firstCatch: Partial<Record<SpeciesId, number>> = {};
  firsts = { deploy: false, lure: false, sell: false };
  stats = { killed: 0, leaks: 0, stolen: 0, recovered: 0, escaped: 0, sold: 0, deployed: 0, lures: 0, earned: 0, lost: 0 };
  waveStats: WaveStats[] = [];

  /** the player's commands with the tick they were given on: the run's deltas */
  log: { t: number; c: Command }[] = [];
  private nextId = 1;

  constructor(seed = 1) {
    this.seed = seed;
    this.rng = new Rng(seed);
    this.world = new World();
  }

  id() {
    return this.nextId++;
  }

  get rod() {
    return RODS[this.rodTier - 1];
  }

  get over() {
    return this.phase === 'won' || this.phase === 'lost';
  }

  /** crates being carried off right now */
  get carried() {
    let n = 0;
    for (const t of this.thieves) if (t.mode !== 'dead' && t.mode !== 'gone') n += t.carrying;
    return n;
  }

  get time() {
    return this.tick * DT;
  }

  // ---------------------------------------------------------------- the tick

  step() {
    if (this.over) return;
    const dt = DT;
    tickWaves(this, dt);
    tickThieves(this, dt);
    tickFishing(this, dt);
    tickDefenders(this, dt);
    tickLures(this, dt);
    tickConstruction(this, dt);
    tickEconomy(this, dt);
    tickCatchLog(this, dt);
    tickStats(this, dt);
    this.tick++;
  }

  /** Run n ticks. */
  run(n: number) {
    for (let i = 0; i < n && !this.over; i++) this.step();
  }

  // ---------------------------------------------------------------- commands

  /** Apply a player command now. Valid commands go in the log; invalid ones change nothing. */
  act(c: Command): Result {
    if (this.over) return { ok: false, why: 'The run is over.' };
    const r = this.apply(c);
    if (r.ok) this.log.push({ t: this.tick, c });
    return r;
  }

  private apply(c: Command): Result {
    switch (c.k) {
      case 'cast': {
        const r = this.canCast(c.x, c.y);
        if (!r.ok) return r;
        this.fishing = { x: c.x, y: c.y };
        this.fishZone = this.world.zone[this.world.idx(c.x, c.y)];
        this.events.push({ type: 'cast', tick: this.tick, x: c.x + 0.5, y: c.y + 0.5, id: this.fishZone ?? '' });
        return { ok: true };
      }
      case 'reel':
        this.fishing = null;
        this.fishZone = null;
        return { ok: true };
      case 'sell': {
        const s = this.liveWell[c.slot];
        if (!s) return { ok: false, why: 'That slot is empty.' };
        this.liveWell[c.slot] = null;
        const v = SPECIES[s].sell;
        this.money += v;
        this.stats.sold++;
        this.stats.earned += v;
        this.events.push({ type: 'sell', tick: this.tick, id: s, value: v });
        if (!this.firsts.sell) { this.firsts.sell = true; this.events.push({ type: 'firstSell', tick: this.tick, id: s }); }
        return { ok: true };
      }
      case 'deploy': {
        const s = this.liveWell[c.slot];
        if (!s) return { ok: false, why: 'That slot is empty.' };
        const r = this.canDeploy(s, c.x, c.y);
        if (!r.ok) return r;
        this.liveWell[c.slot] = null;
        const d = DEFENDERS[s];
        this.defenders.push({ id: this.id(), species: s, x: c.x, y: c.y, hp: d.hp, maxHp: d.hp, cool: 0, target: 0, roadI: this.world.pathIndex[this.world.idx(c.x, c.y)], acted: 99, worrier: 0, queue: [] });
        this.stats.deployed++;
        this.events.push({ type: 'deploy', tick: this.tick, id: s, x: c.x + 0.5, y: c.y + 0.5 });
        if (!this.firsts.deploy) { this.firsts.deploy = true; this.events.push({ type: 'firstDeploy', tick: this.tick, id: s }); }
        return { ok: true };
      }
      case 'lure': {
        const r = this.canLure(c.x, c.y);
        if (!r.ok) return r;
        this.worms--;
        const roadI = this.world.pathIndex[this.world.idx(c.x, c.y)];
        this.lures.push({ id: this.id(), x: c.x, y: c.y, roadI, bait: 'worm', food: BAIT.worm.lureFood, eater: 0, queue: [] });
        this.stats.lures++;
        this.events.push({ type: 'lure', tick: this.tick, x: c.x + 0.5, y: c.y + 0.5 });
        if (!this.firsts.lure) { this.firsts.lure = true; this.events.push({ type: 'firstLure', tick: this.tick }); }
        return { ok: true };
      }
      case 'buy': {
        const cost = this.price(c.item);
        if (cost === null) return { ok: false, why: c.item === 'wormbed' ? 'You already have a worm bed.' : 'The rod is already the best in the slice.' };
        if (this.money < cost) return { ok: false, why: `Costs ${cost}; you have ${this.money}.` };
        this.money -= cost;
        if (c.item === 'wormbed') this.wormBed = true;
        else if (c.item === 'rod') this.rodTier++;
        else this.worms += WORMS.packSize;
        this.events.push({ type: 'buy', tick: this.tick, id: c.item, value: cost });
        // a better rod may now land what the zone holds; a cast out of the new range is kept (it was in range before)
        return { ok: true };
      }
      case 'call': {
        if (this.phase !== 'build') return { ok: false, why: 'A wave is already on.' };
        const bonus = this.callBonus();
        this.money += bonus;
        this.stats.earned += bonus;
        this.events.push({ type: 'callEarly', tick: this.tick, value: bonus });
        this.phaseTime = 0;
        return { ok: true };
      }
    }
  }

  /** What an item costs now, or null if it can't be bought. */
  price(item: 'wormbed' | 'rod' | 'worms'): number | null {
    if (item === 'wormbed') return this.wormBed ? null : WORMS.bedCost;
    if (item === 'rod') return this.rodTier >= RODS.length ? null : RODS[this.rodTier].cost;
    return WORMS.packCost;
  }

  /** Money for calling the next wave now (DESIGN.md §2). */
  callBonus(): number {
    if (this.phase !== 'build' || this.wave >= WAVES.length) return 0;
    const w = WAVES[this.wave];
    let bounty = 0;
    for (const [id, n] of w.groups) bounty += THIEVES[id].bounty * n;
    const full = this.wave === 0 ? RULES.firstBuild : RULES.buildTime;
    return Math.floor(RULES.callEarly * bounty * Math.max(0, this.phaseTime) / full);
  }

  canCast(x: number, y: number): Result {
    const w = this.world;
    if (!w.inb(x, y) || !isWater(w.at(x, y))) return { ok: false, why: 'Cast into water.' };
    if (w.castDist(x, y) > this.rod.range) return { ok: false, why: `Out of reach: your rod casts ${this.rod.range} tiles.` };
    return { ok: true };
  }

  canLure(x: number, y: number): Result {
    const w = this.world;
    if (!w.inb(x, y) || w.at(x, y) !== Tile.Road) return { ok: false, why: 'A lure goes on the road.' };
    if (w.castDist(x, y) > this.rod.range) return { ok: false, why: `Out of reach: your rod casts ${this.rod.range} tiles.` };
    if (this.worms < 1) return { ok: false, why: 'No worms left.' };
    if (this.lures.some((l) => l.x === x && l.y === y)) return { ok: false, why: 'There is already a lure there.' };
    if (this.defenders.some((d) => d.x === x && d.y === y)) return { ok: false, why: 'A turtle is sitting there.' };
    return { ok: true };
  }

  canDeploy(s: SpeciesId, x: number, y: number): Result {
    const w = this.world;
    const d = DEFENDERS[s];
    if (!w.inb(x, y)) return { ok: false, why: 'Off the shore.' };
    if (this.defenders.some((o) => o.x === x && o.y === y)) return { ok: false, why: 'Something is already there.' };
    const t = w.at(x, y);
    if (d.place === 'road') {
      if (t !== Tile.Road) return { ok: false, why: `The ${SPECIES[s].name.toLowerCase()} goes on the road.` };
      if (this.lures.some((l) => l.x === x && l.y === y)) return { ok: false, why: 'There is a lure there.' };
      return { ok: true };
    }
    if (t !== Tile.Shallow) return { ok: false, why: t === Tile.Reeds ? 'Too thick with reeds.' : isWater(t) ? 'Too deep: shallow water only.' : 'It needs water.' };
    if (w.roadDist[w.idx(x, y)] > d.maxRoadDist) return { ok: false, why: `Too far from the road: within ${d.maxRoadDist} tile${d.maxRoadDist > 1 ? 's' : ''}.` };
    return { ok: true };
  }

  /**
   * What bites on a tile with this rod, rates per minute right now (DESIGN.md §3): the zone's
   * rate, times where the tile sits (by the dock or reeds, or open sand), the bait, the reel and
   * the wave's distraction. Defaults to where the line is.
   */
  biteTable(at: Pt | null = this.fishing): { s: SpeciesId; rate: number; why?: string }[] {
    if (!at) return [];
    const w = this.world;
    const i = w.idx(at.x, at.y);
    const zone = w.zone[i];
    if (!zone) return [];
    const out: { s: SpeciesId; rate: number; why?: string }[] = [];
    const factor = this.phase === 'wave' ? RULES.waveFishing : 1;
    for (const s of SPECIES_ORDER) {
      const sp = SPECIES[s];
      const base = sp.rates[zone];
      if (!base) continue;
      const hab = sp.habitat.reedsOnly ? (w.nearReeds[i] ? sp.habitat.near : 0) : w.nearStructure[i] ? sp.habitat.near : sp.habitat.open;
      if (hab <= 0) continue;
      if (sizeRank(sp.size) > sizeRank(this.rod.line)) out.push({ s, rate: 0, why: 'line too light' });
      else out.push({ s, rate: base * hab * BAIT.worm.match * this.rod.reel * factor });
    }
    return out;
  }

  /** Why the line isn't catching, or null if it is. */
  fishBlock(): string | null {
    if (!this.fishing) return 'Line out of the water';
    const table = this.biteTable();
    if (!table.length) return 'Nothing bites out here';
    if (!this.liveWell.includes(null)) return 'Live well full';
    if (this.worms < 1) return 'Out of worms';
    if (!table.some((b) => b.rate > 0)) return 'Line too light for what is here';
    return null;
  }

  zoneName(z: ZoneId | null) {
    return ZONES.find((q) => q.id === z)?.name ?? 'Open water';
  }

  // ---------------------------------------------------------------- saves

  /** The save: the seed and the commands (DESIGN.md: seed + deltas). */
  snapshot() {
    return { seed: this.seed, tick: this.tick, log: this.log.map((e) => ({ t: e.t, c: e.c })) };
  }

  /** Rebuild a run from its seed and command log, up to `tick`. */
  static replay(seed: number, log: { t: number; c: Command }[], tick: number): Game {
    const g = new Game(seed);
    let i = 0;
    while (g.tick < tick && !g.over) {
      while (i < log.length && log[i].t === g.tick) g.act(log[i++].c);
      g.step();
    }
    while (i < log.length && log[i].t === g.tick) g.act(log[i++].c);
    g.events.drain();
    return g;
  }
}
