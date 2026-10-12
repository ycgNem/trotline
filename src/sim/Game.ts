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
import { BAIT, WORMS, CHUM, type BaitId } from '../data/bait';
import { ZONES, SHORE, CANAL, type ZoneId } from '../data/shore';
import { BOATS, FLEET, TRAWL, type BoatId } from '../data/boats';
import type { Size } from '../data/species';
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
export type ThiefMode = 'road' | 'toLure' | 'queue' | 'eat' | 'worry' | 'wait' | 'mob' | 'exit' | 'dead' | 'gone';

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
  /** the whole meal it took, for the renderer's bar */
  eatFull: number;
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
  /** mobbing: the flockmate with the pufferfish it is after, where it sits, and seconds left */
  mobOf: number;
  mobX: number;
  mobY: number;
  mobT: number;
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
  /** the road tile it is on, or (a slick in the water) the one nearest it */
  roadI: number;
  bait: BaitId;
  /** thief-seconds of eating left */
  food: number;
  /** the one eating it, and the ones waiting their turn in a line back along the road */
  eater: number;
  queue: number[];
  /** a slick: the gulls squabbling over it together (DESIGN.md §12) */
  crowd: number[];
}

/**
 * A boat (DESIGN.md §12). moored: at its berth with no orders. dock: at its berth unloading,
 * loading bait and setting out (or waiting: on the live well, or on worms). out / in: travelling
 * by water. fishing: at its anchor.
 */
export type BoatState = 'moored' | 'dock' | 'out' | 'fishing' | 'in';

export interface Boat {
  id: number;
  kind: BoatId;
  /** where it is (tile units, the centre of the boat) */
  x: number;
  y: number;
  /** its berth at the dock and the tile it is sent to fish (null: none) */
  berth: Pt;
  anchor: Pt | null;
  state: BoatState;
  /** the tiles it is travelling through (centres), and the next one */
  route: Pt[];
  routeI: number;
  /** fish aboard, worms aboard, chum aboard (the trawler) */
  hold: SpeciesId[];
  bait: number;
  chum: number;
  /** the species whose catch goes to market as it lands, not to the live well */
  sell: SpeciesId[];
  /** seconds towed this trip (the trawler), and the way its tow runs */
  towT: number;
  towDx: number;
  towDy: number;
  /** what it is waiting on at the dock */
  wait: '' | 'well' | 'worms';
  facing: 1 | -1;
  /** fish it has landed this run */
  landed: number;
}

export type BuyItem = 'wormbed' | 'rod' | 'worms' | 'chum' | BoatId;

export type Command =
  | { k: 'cast'; x: number; y: number }
  | { k: 'reel' }
  | { k: 'sell'; slot: number }
  | { k: 'deploy'; slot: number; x: number; y: number }
  | { k: 'lure'; x: number; y: number }
  | { k: 'slick'; x: number; y: number }
  | { k: 'dig'; x: number; y: number }
  | { k: 'buy'; item: BuyItem }
  | { k: 'send'; boat: BoatId; x: number; y: number }
  | { k: 'moor'; boat: BoatId }
  | { k: 'boatSell'; boat: BoatId; species: SpeciesId; sell: boolean }
  | { k: 'call' };

/** Hook gear: the rod's, or a boat's (DESIGN.md §3, §12). */
export interface Gear { reel: number; line: Size }

/** A line in the water: the angler's rod, or a boat's. */
export type Line = 'rod' | BoatId;

/** One row of a bite table: a species, its catches a minute, why it is 0, and how many other
 * lines share the water's stock of it when that holds the rate down. */
export interface Bite { s: SpeciesId; rate: number; why?: string; shared?: number }

export interface Result { ok: boolean; why?: string }

export interface WaveStats {
  wave: number;
  /** the tick it started on */
  start: number;
  /** thieves that reached the smokehouse */
  leaks: number;
  stolen: number;
  recovered: number;
  escaped: number;
  killed: number;
  /** gulls that landed round a flockmate to steal its pufferfish */
  mobbed: number;
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
  chum = CHUM.start;
  rodTier = 1;
  boats: Boat[] = [];
  /** canal tiles ordered and not dug yet, in order; seconds into digging the first */
  digs: Pt[] = [];
  digT = 0;
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
  /** birds of the current flock already spawned (systems/waves) */
  flockN = 0;

  /** catches made this tick, for the catch log system */
  tickCatches: SpeciesId[] = [];
  caught: Record<SpeciesId, number> = { puffer: 0, ray: 0, turtle: 0 };
  firstCatch: Partial<Record<SpeciesId, number>> = {};
  firsts = { deploy: false, lure: false, sell: false, slick: false, boat: false };
  stats = { killed: 0, leaks: 0, stolen: 0, recovered: 0, escaped: 0, sold: 0, deployed: 0, lures: 0, earned: 0, lost: 0, mobbed: 0, slicks: 0, dug: 0, boatFish: 0, baitSpent: 0 };
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

  boat(kind: BoatId): Boat | undefined {
    return this.boats.find((b) => b.kind === kind);
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
        this.sellFish(s, this.world.angler.x, this.world.angler.y);
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
        this.lures.push({ id: this.id(), x: c.x, y: c.y, roadI, bait: 'worm', food: BAIT.worm.lureFood, eater: 0, queue: [], crowd: [] });
        this.stats.lures++;
        this.events.push({ type: 'lure', tick: this.tick, x: c.x + 0.5, y: c.y + 0.5 });
        if (!this.firsts.lure) { this.firsts.lure = true; this.events.push({ type: 'firstLure', tick: this.tick }); }
        return { ok: true };
      }
      case 'slick': {
        const r = this.canSlick(c.x, c.y);
        if (!r.ok) return r;
        this.chum--;
        const roadI = this.world.roadNear[this.world.idx(c.x, c.y)];
        this.lures.push({ id: this.id(), x: c.x, y: c.y, roadI, bait: 'chum', food: BAIT.chum.lureFood, eater: 0, queue: [], crowd: [] });
        this.stats.slicks++;
        this.events.push({ type: 'slick', tick: this.tick, x: c.x + 0.5, y: c.y + 0.5 });
        if (!this.firsts.slick) { this.firsts.slick = true; this.events.push({ type: 'firstSlick', tick: this.tick }); }
        return { ok: true };
      }
      case 'dig': {
        const r = this.canDig(c.x, c.y);
        if (!r.ok) return r;
        this.money -= CANAL.cost;
        this.digs.push({ x: c.x, y: c.y });
        this.events.push({ type: 'digOrder', tick: this.tick, x: c.x + 0.5, y: c.y + 0.5, value: CANAL.cost });
        return { ok: true };
      }
      case 'buy': {
        const cost = this.price(c.item);
        if (cost === null) return { ok: false, why: c.item === 'wormbed' ? 'You already have a worm bed.' : c.item === 'rod' ? 'That is the best rod on this shore.' : `You already have the ${BOATS[c.item as BoatId].name.toLowerCase()}.` };
        if (this.money < cost) return { ok: false, why: `Costs ${cost}; you have ${this.money}.` };
        this.money -= cost;
        if (c.item === 'wormbed') this.wormBed = true;
        else if (c.item === 'rod') this.rodTier++;
        else if (c.item === 'worms') this.worms += WORMS.packSize;
        else if (c.item === 'chum') this.chum++;
        else {
          const berth = FLEET.berths[c.item];
          this.boats.push({
            id: this.id(), kind: c.item, x: berth.x + 0.5, y: berth.y + 0.5, berth: { ...berth }, anchor: null, state: 'moored', route: [], routeI: 0,
            hold: [], bait: 0, chum: 0, sell: [], towT: 0, towDx: 0, towDy: 0, wait: '', facing: 1, landed: 0,
          });
          if (!this.firsts.boat) { this.firsts.boat = true; this.events.push({ type: 'firstBoat', tick: this.tick, id: c.item }); }
        }
        this.events.push({ type: 'buy', tick: this.tick, id: c.item, value: cost });
        // a better rod may now land what the zone holds; a cast out of the new range is kept (it was in range before)
        return { ok: true };
      }
      case 'send': {
        const b = this.boat(c.boat);
        if (!b) return { ok: false, why: 'You don\'t have that boat.' };
        const r = this.canSend(c.boat, c.x, c.y);
        if (!r.ok) return r;
        b.anchor = { x: c.x, y: c.y };
        // at the dock it sets out when it has unloaded and loaded bait; out on the water it turns for
        // the new spot if it has room and bait, else it comes in and goes there next trip
        if (b.state === 'moored') b.state = 'dock';
        else if (b.state === 'out' || b.state === 'fishing') {
          if (b.hold.length < BOATS[b.kind].hold && (BOATS[b.kind].gear === 'net' || b.bait > 0)) this.route(b, b.anchor, 'out');
          else this.route(b, b.berth, 'in');
        }
        this.events.push({ type: 'send', tick: this.tick, id: b.kind, x: c.x + 0.5, y: c.y + 0.5 });
        return { ok: true };
      }
      case 'moor': {
        const b = this.boat(c.boat);
        if (!b) return { ok: false, why: 'You don\'t have that boat.' };
        b.anchor = null;
        if (b.state === 'out' || b.state === 'fishing') this.route(b, b.berth, 'in');
        return { ok: true };
      }
      case 'boatSell': {
        const b = this.boat(c.boat);
        if (!b) return { ok: false, why: 'You don\'t have that boat.' };
        b.sell = c.sell ? [...new Set([...b.sell, c.species])] : b.sell.filter((s) => s !== c.species);
        return { ok: true };
      }
      case 'call': {
        if (this.phase !== 'build') return { ok: false, why: 'A wave is already on.' };
        // no bonus for the time left (DESIGN.md §2): sending it is for when you are ready
        this.phaseTime = 0;
        return { ok: true };
      }
    }
  }

  /** What an item costs now, or null if it can't be bought. */
  price(item: BuyItem): number | null {
    if (item === 'wormbed') return this.wormBed ? null : WORMS.bedCost;
    if (item === 'rod') return this.rodTier >= RODS.length ? null : RODS[this.rodTier].cost;
    if (item === 'worms') return WORMS.packCost;
    if (item === 'chum') return CHUM.bucketCost;
    return this.boat(item) ? null : BOATS[item].cost;
  }

  /** A fish sold: money now (DESIGN.md: selling pays at once), from the live well or a boat at the dock. */
  sellFish(s: SpeciesId, x: number, y: number, boat?: BoatId) {
    const v = SPECIES[s].sell;
    this.money += v;
    this.stats.sold++;
    this.stats.earned += v;
    this.events.push({ type: 'sell', tick: this.tick, id: s, value: v, x, y, d: boat ? 1 : 0 });
    if (!this.firsts.sell) { this.firsts.sell = true; this.events.push({ type: 'firstSell', tick: this.tick, id: s }); }
  }

  /** Point a boat at a tile by water from where it is, going out (to fish) or in (to its berth). */
  route(b: Boat, to: Pt, dir: 'out' | 'in') {
    const from = { x: Math.floor(b.x), y: Math.floor(b.y) };
    const path = this.world.waterPath(from, to) ?? [];
    b.route = path;
    b.routeI = 0;
    b.state = dir;
    b.wait = '';
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

  /** A chum slick goes on the pale water (shallows within 2 of the road) the rod reaches, not on a fish (DESIGN.md §12). */
  canSlick(x: number, y: number): Result {
    const w = this.world;
    if (!w.inb(x, y) || w.at(x, y) !== Tile.Shallow || w.roadDist[w.idx(x, y)] > CHUM.roadDist) return { ok: false, why: 'Chum goes in the pale water beside the road.' };
    if (w.castDist(x, y) > this.rod.range) return { ok: false, why: `Out of reach: your rod casts ${this.rod.range} tiles.` };
    if (this.chum < 1) return { ok: false, why: 'No chum. Buy a bucket, or run the trawler.' };
    if (this.lures.some((l) => l.x === x && l.y === y)) return { ok: false, why: 'There is already a slick there.' };
    if (this.defenders.some((d) => d.x === x && d.y === y)) return { ok: false, why: 'A fish is there.' };
    return { ok: true };
  }

  /** Order a canal tile dug (DESIGN.md §12): grass or sand that touches water or a tile already ordered. */
  canDig(x: number, y: number): Result {
    const w = this.world;
    if (this.digs.some((p) => p.x === x && p.y === y)) return { ok: false, why: 'Already being dug.' };
    const why = this.digBlock(x, y);
    if (why) return { ok: false, why };
    const ordered = this.digs.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) === 1);
    if (!w.touchesWater(x, y) && !ordered) return { ok: false, why: 'A canal has to join water.' };
    if (this.money < CANAL.cost) return { ok: false, why: `Costs ${CANAL.cost} a tile; you have ${this.money}.` };
    return { ok: true };
  }

  /** Why a tile can never be dug, or null if it can be (whatever touches it). */
  digBlock(x: number, y: number): string | null {
    const w = this.world;
    if (!w.inb(x, y)) return 'Off the shore.';
    if (!w.diggable(x, y)) return isWater(w.at(x, y)) ? 'That is water already.' : 'Dig grass or sand, not that.';
    const bed = SHORE.wormBed;
    if (y === bed.y && (x === bed.x || x === bed.x + 1)) return 'That is where the worm bed goes.';
    const sh = SHORE.smokehouse;
    if (y === sh.y + sh.h && x >= sh.x && x < sh.x + sh.w) return 'The crates are stacked there.';
    return null;
  }

  /** Where a boat can be sent: water it can get to from its berth (not reeds); the trawler's net
   * only in open water, mid or deep (DESIGN.md §12). */
  canSend(kind: BoatId, x: number, y: number): Result {
    const w = this.world;
    const t = w.at(x, y);
    if (!w.inb(x, y) || !isWater(t)) return { ok: false, why: 'Send it to water.' };
    if (t === Tile.Reeds) return { ok: false, why: 'Too thick with reeds for a boat.' };
    // a boat at a berth is moored, not fishing (the Milestone 3 review)
    if (Object.values(FLEET.berths).some((p) => p.x === x && p.y === y)) return { ok: false, why: 'That is a berth: send it out on the water.' };
    if (BOATS[kind].gear === 'net') {
      if (t === Tile.Shallow) return { ok: false, why: 'A trawl needs open water: the darker blue.' };
      if (w.openRun(x, y) < TRAWL.open) return { ok: false, why: `A tow needs a run of ${TRAWL.open} tiles of open water.` };
    } else if (!this.biteTable({ x, y }, BOATS[kind], false, kind).some((q) => q.rate > 0)) return { ok: false, why: 'Nothing takes a hook out there.' };
    if (!w.waterPath(FLEET.berths[kind], { x, y })) return { ok: false, why: 'No way there by water.' };
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
  biteTable(at: Pt | null = this.fishing, gear: Gear = this.rod, distracted = this.phase === 'wave', line: Line = 'rod'): Bite[] {
    if (!at) return [];
    const w = this.world;
    const i = w.idx(at.x, at.y);
    const zone = w.zone[i];
    if (!zone) return [];
    const out: Bite[] = [];
    for (const s of SPECIES_ORDER) {
      const sp = SPECIES[s];
      if (!sp.rates[zone] || sp.habitat[w.habitat(i)] <= 0) continue;
      if (sizeRank(sp.size) > sizeRank(gear.line)) { out.push({ s, rate: 0, why: 'line too light' }); continue; }
      const raw = this.hookRate(i, s, gear, distracted);
      out.push(this.shared(zone, s, line, raw));
    }
    return out;
  }

  /** One line's catches a minute of a species on tile i, before any sharing (DESIGN.md §3). */
  private hookRate(i: number, s: SpeciesId, gear: Gear, distracted: boolean): number {
    const w = this.world, sp = SPECIES[s];
    const zone = w.zone[i];
    if (!zone || sizeRank(sp.size) > sizeRank(gear.line)) return 0;
    return (sp.rates[zone] ?? 0) * Math.max(0, sp.habitat[w.habitat(i)]) * BAIT.worm.match * gear.reel * (distracted ? RULES.waveFishing : 1);
  }

  /** What the trawler's net brings up of a species a minute towing tile `at` (DESIGN.md §12): the
   * most where the species is commonest, scaled by how common it is in the water towed, and out of
   * the water's stock where it has one. */
  trawlRate(at: Pt, s: SpeciesId, line: Line = 'trawler'): Bite {
    const zone = this.world.zone[this.world.idx(at.x, at.y)];
    if (!zone) return { s, rate: 0 };
    return this.shared(zone, s, line, this.netRate(zone, s));
  }

  private netRate(zone: ZoneId, s: SpeciesId): number {
    const most = TRAWL.fish[s] ?? 0;
    const rates = SPECIES[s].rates;
    const best = Math.max(0, ...Object.values(rates).map((r) => r ?? 0));
    const here = rates[TRAWL.waters[zone] ?? zone] ?? 0;
    return best > 0 ? (most * here) / best : 0;
  }

  /**
   * A line's share of a water's stock (DESIGN.md §12): where a zone holds a stock of a species (the
   * point's rays), every line fishing it shares it, each scaled by stock / (all their rates there)
   * and never above its own rate. `line` is counted once: a line not fishing there yet is added.
   */
  private shared(zone: ZoneId, s: SpeciesId, line: Line, raw: number): Bite {
    const stock = ZONES.find((z) => z.id === zone)?.stock?.[s];
    if (!stock || raw <= 0) return { s, rate: raw };
    let total = raw, others = 0;
    for (const [who, r] of this.fishers(zone, s)) if (who !== line && r > 0) { total += r; others++; }
    if (total <= stock) return { s, rate: raw };
    return { s, rate: (raw * stock) / total, shared: others };
  }

  /** Every line fishing a zone right now and its own rate for a species there. */
  private fishers(zone: ZoneId, s: SpeciesId): [Line, number][] {
    const w = this.world, out: [Line, number][] = [];
    const f = this.fishing;
    if (f && w.zone[w.idx(f.x, f.y)] === zone && this.worms >= 1 && this.liveWell.includes(null))
      out.push(['rod', this.hookRate(w.idx(f.x, f.y), s, this.rod, this.phase === 'wave')]);
    for (const b of this.boats) {
      if (b.state !== 'fishing' || !b.anchor) continue;
      const i = w.idx(b.anchor.x, b.anchor.y);
      if (w.zone[i] !== zone) continue;
      const def = BOATS[b.kind];
      if (def.gear === 'net') out.push([b.kind, this.netRate(zone, s)]);
      else if (b.bait >= 1 && b.hold.length < def.hold) out.push([b.kind, this.hookRate(i, s, def, false)]);
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
