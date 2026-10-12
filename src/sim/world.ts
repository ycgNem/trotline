// The shore as the sim sees it: tile kinds, the road as an ordered path, each tile's distance to
// the road, and which zone a water tile belongs to. Built once from src/data/shore.ts; pure.
import { SHORE_ROWS, SHORE, ZONES, type ZoneId } from '../data/shore';

export enum Tile {
  Deep, Mid, Shallow, Reeds, Sand, Grass, Tree, Road, Dock, House,
}

const CHAR: Record<string, Tile> = {
  '~': Tile.Deep, '-': Tile.Mid, '.': Tile.Shallow, r: Tile.Reeds, s: Tile.Sand, g: Tile.Grass,
  T: Tile.Tree, '#': Tile.Road, '=': Tile.Dock, H: Tile.House,
};

export function isWater(t: Tile) {
  return t === Tile.Deep || t === Tile.Mid || t === Tile.Shallow || t === Tile.Reeds;
}

export interface Pt { x: number; y: number }

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
  /** zone of each water tile, or null */
  zone: (ZoneId | null)[];
  /** where the angler stands (tile centre, in tiles) */
  angler: Pt;
  /** walkers that took crates leave along this, from the road's end south off the map (tile centres) */
  exitPath: Pt[];
  /** water within a tile of the dock or reeds (puffers like it, rays don't) */
  nearStructure: Uint8Array;
  /** water within a tile of reeds (where terrapins bite) */
  nearReeds: Uint8Array;
  /** the smokehouse door: the point thieves walk to (tile centre past the road's last tile) */
  door: Pt;

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
    // a zone with a circle claims the water inside it; the shallows are every shallow tile left
    this.zone = this.tiles.map((t, i) => {
      if (!isWater(t)) return null;
      const x = (i % this.w) + 0.5, y = Math.floor(i / this.w) + 0.5;
      for (const z of ZONES) if (z.r > 0 && Math.hypot(x - z.x, y - z.y) <= z.r) return z.id;
      if (t === Tile.Shallow || t === Tile.Reeds) return ZONES.find((z) => z.r === 0)?.id ?? null;
      return null;
    });
    this.angler = { x: SHORE.angler.x + 0.5, y: SHORE.angler.y + 0.5 };
    const last = this.path[this.path.length - 1];
    this.door = { x: last.x + 1.5, y: last.y + 0.5 };
    this.exitPath = [];
    for (let y = last.y + 1; y < this.h; y++) this.exitPath.push({ x: SHORE.exitX + 0.5, y: y + 0.5 });
    this.exitPath.push({ x: SHORE.exitX + 0.5, y: this.h + 1.5 });
    this.nearStructure = this.near((t) => t === Tile.Dock || t === Tile.Reeds);
    this.nearReeds = this.near((t) => t === Tile.Reeds);
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
