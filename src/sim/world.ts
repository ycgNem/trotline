// The shore as the sim sees it: tile kinds, the road as an ordered path, each tile's distance to
// the road, and which zone a water tile belongs to. Built once from src/data/shore.ts; pure.
import { SHORE_ROWS, SHORE, ZONES, type ZoneId } from '../data/shore';

export enum Tile {
  Deep, Mid, Shallow, Reeds, Sand, Grass, Tree, Road, Dock, House, Trail,
}

const CHAR: Record<string, Tile> = {
  '~': Tile.Deep, '-': Tile.Mid, '.': Tile.Shallow, r: Tile.Reeds, s: Tile.Sand, g: Tile.Grass,
  T: Tile.Tree, '#': Tile.Road, '=': Tile.Dock, H: Tile.House, ':': Tile.Trail,
};

export function isWater(t: Tile) {
  return t === Tile.Deep || t === Tile.Mid || t === Tile.Shallow || t === Tile.Reeds;
}

export interface Pt { x: number; y: number }
export type Habitat = 'dock' | 'reeds' | 'open';

export class World {
  w: number;
  h: number;
  tiles: Tile[];
  /** the road, from the west edge to the smokehouse door, as tile coordinates */
  path: Pt[];
  /** road tile index -> position in path, -1 off the road */
  pathIndex: Int32Array;
  /** Chebyshev distance in tiles to the nearest road tile */
  roadDist: Int32Array;
  /** each tile's nearest road tile, as an index into path */
  roadNear: Int32Array;
  /** zone of each water tile, or null */
  zone: (ZoneId | null)[];
  /** where the angler stands (tile centre, in tiles) */
  angler: Pt;
  /** walkers that took crates leave along this, from the road's end south off the map (tile centres) */
  exitPath: Pt[];
  /** water within a tile of the dock or reeds (puffers like it, rays don't) */
  /** water within a tile of the dock's pilings */
  nearDock: Uint8Array;
  /** water within a tile of reeds (where terrapins bite) */
  nearReeds: Uint8Array;
  /** water and land touching water (DESIGN.md §4: a ray's shock travels only through wet ground) */
  wet: Uint8Array;
  /** the smokehouse door: the point thieves walk to (tile centre past the road's last tile) */
  door: Pt;
  /** canal tiles dug this run (DESIGN.md §12) */
  dug = new Set<number>();
  /** bumped whenever a tile changes, so the renderer rebakes the ground */
  version = 0;

  constructor(rows: readonly string[] = SHORE_ROWS) {
    this.h = rows.length;
    this.w = rows[0].length;
    this.tiles = [];
    for (const r of rows) {
      if (r.length !== this.w) throw new Error('shore rows must all be the same width');
      for (const c of r) {
        const t = CHAR[c];
        if (t === undefined) throw new Error('unknown shore tile ' + c);
        this.tiles.push(t);
      }
    }
    this.path = this.tracePath();
    this.pathIndex = new Int32Array(this.w * this.h).fill(-1);
    this.path.forEach((p, i) => (this.pathIndex[p.y * this.w + p.x] = i));
    this.roadDist = this.distances();
    this.roadNear = new Int32Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.roadNear[this.idx(x, y)] = this.nearestPathIndex(x + 0.5, y + 0.5);
    this.zone = this.tiles.map((_, i) => this.zoneOf(i));
    this.angler = { x: SHORE.angler.x + 0.5, y: SHORE.angler.y + 0.5 };
    const last = this.path[this.path.length - 1];
    this.door = { x: last.x + 1.5, y: last.y + 0.5 };
    this.exitPath = [];
    for (let y = last.y + 1; y < this.h; y++) this.exitPath.push({ x: SHORE.exitX + 0.5, y: y + 0.5 });
    this.exitPath.push({ x: SHORE.exitX + 0.5, y: this.h + 1.5 });
    this.nearDock = this.near((t) => t === Tile.Dock);
    this.nearReeds = this.near((t) => t === Tile.Reeds);
    this.wet = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.wet[this.idx(x, y)] = this.wetAt(x, y) ? 1 : 0;
  }

  /** The zone a water tile belongs to: a circle claims what is inside it, then the shallows take
   * every shallow tile left and the channel every mid and deep one. */
  private zoneOf(i: number): ZoneId | null {
    const t = this.tiles[i];
    if (!isWater(t)) return null;
    const x = (i % this.w) + 0.5, y = Math.floor(i / this.w) + 0.5;
    for (const z of ZONES) if (z.claims === 'circle' && Math.hypot(x - z.x, y - z.y) <= z.r) return z.id;
    const kind = t === Tile.Shallow || t === Tile.Reeds ? 'shallow' : 'open';
    return ZONES.find((z) => z.claims === kind)?.id ?? null;
  }

  private wetAt(x: number, y: number): boolean {
    if (isWater(this.at(x, y))) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (this.inb(x + dx, y + dy) && isWater(this.at(x + dx, y + dy))) return true;
    return false;
  }

  /** Can this tile be dug into a canal (DESIGN.md §12): grass or sand, not a tree, the road, the
   * dock, the trail or the smokehouse. Whether it touches water is the caller's (it may touch a
   * tile already ordered). */
  diggable(x: number, y: number): boolean {
    const t = this.at(x, y);
    return this.inb(x, y) && (t === Tile.Grass || t === Tile.Sand);
  }

  /** The longest straight run of open water (mid or deep) through a tile, across or up and down:
   * how long a tow the trawler can make there (DESIGN.md §12). 0 if the tile isn't open water. */
  openRun(x: number, y: number): number {
    const open = (cx: number, cy: number) => this.inb(cx, cy) && (this.at(cx, cy) === Tile.Mid || this.at(cx, cy) === Tile.Deep);
    if (!open(x, y)) return 0;
    let best = 0;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      let n = 1;
      for (let k = 1; open(x + dx * k, y + dy * k); k++) n++;
      for (let k = 1; open(x - dx * k, y - dy * k); k++) n++;
      best = Math.max(best, n);
    }
    return best;
  }

  /** Does a tile share an edge with water? */
  touchesWater(x: number, y: number): boolean {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (this.inb(x + dx, y + dy) && isWater(this.at(x + dx, y + dy))) return true;
    return false;
  }

  /** Dig a canal tile: it becomes shallows, and what depends on water round it is worked out again
   * (the zone, the dock and reed neighbourhoods, the wet road). The road's shape doesn't change. */
  dig(x: number, y: number) {
    const i = this.idx(x, y);
    this.tiles[i] = Tile.Shallow;
    this.dug.add(i);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (!this.inb(nx, ny)) continue;
        const j = this.idx(nx, ny);
        this.zone[j] = this.zoneOf(j);
        this.wet[j] = this.wetAt(nx, ny) ? 1 : 0;
      }
    this.nearDock[i] = this.nearTo(x, y, (t) => t === Tile.Dock) ? 1 : 0;
    // a dug ditch is marsh water, the terrapin's (DESIGN.md §12), whatever is beside it
    this.nearReeds[i] = 1;
    this.version++;
  }

  /**
   * The way by water from one tile to another for a boat (DESIGN.md §12): 8-connected over water
   * that isn't reeds, never cutting a corner of land; tile centres, start excluded. Null if there
   * is none.
   */
  waterPath(from: Pt, to: Pt): Pt[] | null {
    if (!this.boatable(to.x, to.y)) return null;
    const { dist, prev } = this.waterField(from);
    const s = this.idx(from.x, from.y), goal = this.idx(to.x, to.y);
    if (dist[goal] === Infinity) return null;
    const out: Pt[] = [];
    for (let c = goal; c !== s; c = prev[c]) out.push({ x: (c % this.w) + 0.5, y: Math.floor(c / this.w) + 0.5 });
    return out.reverse();
  }

  /** Water a boat can be on: not reeds, not land. */
  boatable(x: number, y: number): boolean {
    return this.inb(x, y) && isWater(this.at(x, y)) && this.at(x, y) !== Tile.Reeds;
  }

  private fields = new Map<number, { version: number; dist: Float64Array; prev: Int32Array }>();

  /**
   * How far every tile is by water from one tile, and the way back (Dijkstra, 1 straight and 1.41
   * diagonal, never cutting a corner of land), kept until the water changes (a canal is dug).
   */
  waterField(from: Pt): { dist: Float64Array; prev: Int32Array } {
    const s = this.idx(from.x, from.y);
    const hit = this.fields.get(s);
    if (hit && hit.version === this.version) return hit;
    const ok = (x: number, y: number) => this.boatable(x, y);
    const n = this.w * this.h;
    const prev = new Int32Array(n).fill(-1);
    const dist = new Float64Array(n).fill(Infinity);
    dist[s] = 0;
    // a small grid: a simple frontier with a linear search for the nearest is plenty
    const open: number[] = [s];
    while (open.length) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (dist[open[k]] < dist[open[bi]]) bi = k;
      const c = open[bi];
      open[bi] = open[open.length - 1];
      open.pop();
      const cx = c % this.w, cy = Math.floor(c / this.w);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          if (!ok(nx, ny)) continue;
          if (dx && dy && (!ok(cx + dx, cy) || !ok(cx, cy + dy))) continue;
          const j = this.idx(nx, ny);
          const nd = dist[c] + (dx && dy ? Math.SQRT2 : 1);
          if (nd < dist[j]) {
            if (dist[j] === Infinity) open.push(j);
            dist[j] = nd;
            prev[j] = c;
          }
        }
    }
    if (this.fields.size > 32) this.fields.clear();
    const f = { version: this.version, dist, prev };
    this.fields.set(s, f);
    return f;
  }

  private nearTo(x: number, y: number, f: (t: Tile) => boolean): boolean {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.inb(x + dx, y + dy) && f(this.at(x + dx, y + dy))) return true;
    return false;
  }

  /** Where a line sits, for what bites there (DESIGN.md §3): by the dock, by the reeds, or open sand. */
  habitat(i: number): Habitat {
    return this.nearDock[i] ? 'dock' : this.nearReeds[i] ? 'reeds' : 'open';
  }

  /** Is the ground at this point wet: water, or land touching it (the water's edge)? */
  isWet(x: number, y: number): boolean {
    const tx = Math.floor(x), ty = Math.floor(y);
    return this.inb(tx, ty) && this.wet[this.idx(tx, ty)] === 1;
  }

  /** Water tiles within a tile (Chebyshev) of a tile matching `f`. */
  private near(f: (t: Tile) => boolean): Uint8Array {
    const out = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (!isWater(this.at(x, y))) continue;
        for (let dy = -1; dy <= 1 && !out[this.idx(x, y)]; dy++)
          for (let dx = -1; dx <= 1; dx++) if (this.inb(x + dx, y + dy) && f(this.at(x + dx, y + dy))) { out[this.idx(x, y)] = 1; break; }
      }
    return out;
  }

  idx(x: number, y: number) {
    return y * this.w + x;
  }
  inb(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  at(x: number, y: number): Tile {
    return this.inb(x, y) ? this.tiles[this.idx(x, y)] : Tile.Deep;
  }

  /** Walk the road from its tile on the west edge to its other end; it must not branch. */
  private tracePath(): Pt[] {
    let start: Pt | null = null;
    for (let y = 0; y < this.h; y++) if (this.at(0, y) === Tile.Road) start = { x: 0, y };
    if (!start) throw new Error('the road must start on the west edge');
    const out: Pt[] = [start];
    const seen = new Set([this.idx(start.x, start.y)]);
    for (;;) {
      const p = out[out.length - 1];
      const next = [[1, 0], [0, 1], [0, -1], [-1, 0]]
        .map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy }))
        .filter((q) => this.at(q.x, q.y) === Tile.Road && this.inb(q.x, q.y) && !seen.has(this.idx(q.x, q.y)));
      if (next.length === 0) break;
      if (next.length > 1) throw new Error(`the road branches at ${p.x},${p.y}`);
      seen.add(this.idx(next[0].x, next[0].y));
      out.push(next[0]);
    }
    return out;
  }

  private distances(): Int32Array {
    const d = new Int32Array(this.w * this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        let best = 1e9;
        for (const p of this.path) best = Math.min(best, Math.max(Math.abs(p.x - x), Math.abs(p.y - y)));
        d[this.idx(x, y)] = best;
      }
    return d;
  }

  /** Centre of road path tile i, in tiles. */
  pathPt(i: number): Pt {
    const p = this.path[Math.max(0, Math.min(this.path.length - 1, i))];
    return { x: p.x + 0.5, y: p.y + 0.5 };
  }

  /** Index of the road tile nearest to a point. */
  nearestPathIndex(x: number, y: number): number {
    let best = 0, bd = 1e9;
    this.path.forEach((p, i) => {
      const d = Math.hypot(p.x + 0.5 - x, p.y + 0.5 - y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  /** The point `d` tiles back along the road (toward its west end) from path tile i's centre. */
  pathBack(i: number, d: number): Pt {
    // before the road's first tile it carries straight on west, the way thieves come in
    const at = (j: number) => (j >= 0 ? this.pathPt(j) : { x: this.pathPt(0).x + j, y: this.pathPt(0).y });
    const k = Math.floor(d), f = d - k;
    const a = at(i - k), b = at(i - k - 1);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  /** Distance from the angler to a tile's centre, in tiles. */
  castDist(x: number, y: number): number {
    return Math.hypot(x + 0.5 - this.angler.x, y + 0.5 - this.angler.y);
  }
}
