// The ground, baked once into chunk canvases (16x16 tiles each): water in three depth tints plus
// the placeable shallows, sand, grass, the road and the dock. Readability first (CLAUDE.md,
// STYLE.md): the shallows a fish can be put in are the palest water on the board ("clear
// shallows"); reeds are visibly not a slot; the road is the one warm, flat surface. Imported
// tile art (src/art/tile_*.png, a strip of variants) is used when present, else code draws it.
import { C } from '../data/palette';
import { World, Tile, isWater } from '../sim/world';
import { DEFENDERS } from '../data/defenders';
import { sheet, hasArt } from './sprites';

export const TILE = 16;
export const CHUNK = 16;

/** Small deterministic hash in [0, 1). */
export function hash2(x: number, y: number, s = 0): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The deepest a water defender may sit from the road (rays): what the board marks as slots. */
export const SLOT_DIST = Math.max(...Object.values(DEFENDERS).filter((d) => d.place === 'water').map((d) => d.maxRoadDist));

export function isSlot(w: World, x: number, y: number) {
  return w.at(x, y) === Tile.Shallow && w.roadDist[w.idx(x, y)] <= SLOT_DIST;
}

export class Ground {
  chunks = new Map<string, HTMLCanvasElement>();
  constructor(public world: World) {}

  invalidate() {
    this.chunks.clear();
  }

  chunk(cx: number, cy: number): HTMLCanvasElement {
    const key = cx + ',' + cy;
    let c = this.chunks.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = CHUNK * TILE;
    const ctx = c.getContext('2d')!;
    for (let ty = 0; ty < CHUNK; ty++)
      for (let tx = 0; tx < CHUNK; tx++) {
        const x = cx * CHUNK + tx, y = cy * CHUNK + ty;
        if (!this.world.inb(x, y)) continue;
        this.tile(ctx, x, y, tx * TILE, ty * TILE);
      }
    this.chunks.set(key, c);
    return c;
  }

  /** The imported tile art for a tile, if any: the sheet name. */
  private artName(x: number, y: number): string | null {
    const w = this.world, t = w.at(x, y);
    const name = t === Tile.Deep ? 'tile_deep' : t === Tile.Mid ? 'tile_mid' : t === Tile.Shallow ? (isSlot(w, x, y) ? 'tile_placeable' : 'tile_shallow')
      : t === Tile.Reeds ? 'tile_reeds' : t === Tile.Sand ? 'tile_sand' : t === Tile.Road ? this.roadArt(x, y) : t === Tile.Dock ? 'tile_dock' : 'tile_grass';
    return hasArt(name) ? name : null;
  }

  /** The woods trail thieves leave by: grass with a worn dirt track down the middle. */
  private trail(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number) {
    const f = (c: string, a: number, b: number, ww: number, hh: number) => { ctx.fillStyle = c; ctx.fillRect(px + a, py + b, ww, hh); };
    if (hasArt('tile_grass')) { const s = sheet('tile_grass'); ctx.drawImage(s.frames[Math.floor(hash2(x, y, 91) * s.frames.length)], px, py); }
    else f(C.green, 0, 0, 16, 16);
    const wob = Math.floor(hash2(x, y, 7) * 3) - 1;
    f(C.clay, 4 + wob, 0, 8, 16);
    f(C.tan, 5 + wob, 0, 6, 16);
    for (let i = 0; i < 4; i++) f(C.sand, 5 + wob + Math.floor(hash2(x, y, 80 + i) * 6), Math.floor(hash2(x, y, 90 + i) * 16), 1, 1);
  }

  private roadArt(x: number, y: number) {
    const w = this.world;
    const v = w.at(x, y - 1) === Tile.Road || w.at(x, y + 1) === Tile.Road;
    const h = w.at(x - 1, y) === Tile.Road || w.at(x + 1, y) === Tile.Road;
    if (v && !h && hasArt('tile_road_v')) return 'tile_road_v';
    if (h && hasArt('tile_road_h')) return 'tile_road_h';
    return 'tile_road';
  }

  private tile(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number) {
    const w = this.world;
    const t = w.at(x, y);
    const f = (c: string, a: number, b: number, ww: number, hh: number) => { ctx.fillStyle = c; ctx.fillRect(px + a, py + b, ww, hh); };
    if (t === Tile.Trail) return this.trail(ctx, x, y, px, py);
    const art = this.artName(x, y);
    if (art) {
      if (t === Tile.Dock) { const u = hasArt('tile_shallow') ? sheet('tile_shallow') : null; if (u) ctx.drawImage(u.frames[0], px, py); }
      const s = sheet(art);
      ctx.drawImage(s.frames[Math.floor(hash2(x, y, 91) * s.frames.length)], px, py);
      this.edges(ctx, x, y, px, py);
      return;
    }
    // short wave dashes, 3-4 px wide, the open-water texture
    const waves = (c: string, n: number, s: number) => {
      for (let i = 0; i < n; i++) {
        const wx = Math.floor(hash2(x, y, s + i * 2) * 12), wy = 2 + Math.floor(hash2(x, y, s + i * 2 + 1) * 12);
        f(c, wx, wy, 3 + (i % 2), 1);
      }
    };
    const specks = (c: string, n: number, s: number) => {
      for (let i = 0; i < n; i++) f(c, Math.floor(hash2(x, y, s + i * 2) * 16), Math.floor(hash2(x, y, s + i * 2 + 1) * 16), 1, 1);
    };
    switch (t) {
      case Tile.Deep:
        f(C.deep, 0, 0, 16, 16);
        waves(C.abyss, 2, 11);
        break;
      case Tile.Mid:
        f(C.blue, 0, 0, 16, 16);
        waves(C.sky, 2, 13);
        break;
      case Tile.Shallow:
      case Tile.Reeds:
      case Tile.Dock: {
        // clear shallows: the water a fish can be put in is the palest on the board
        const slot = t === Tile.Shallow && isSlot(w, x, y);
        f(slot ? C.ice : C.cyan, 0, 0, 16, 16);
        waves(slot ? C.bone : C.ice, 2, 17);
        if (!slot) specks(C.sky, 3, 21);
        if (t === Tile.Reeds) {
          for (let i = 0; i < 6; i++) {
            const rx = 1 + Math.floor(hash2(x, y, 40 + i) * 13), h = 6 + Math.floor(hash2(x, y, 50 + i) * 7);
            f(C.leaf, rx, 15 - h, 1, h);
            f(C.lime, rx, 15 - h, 1, 2);
            f(C.reed, rx + 1, 15 - h + 1, 1, 1);
          }
        }
        if (t === Tile.Dock) {
          // planks over the water, posts at the sides
          f(C.copper, 2, 0, 12, 16);
          for (let j = 0; j < 16; j += 4) { f(C.brass, 2, j, 12, 3); f(C.rust, 2, j + 3, 12, 1); }
          f(C.bark, 2, 0, 1, 16); f(C.bark, 13, 0, 1, 16);
          if (y % 2 === 0) { f(C.bark, 0, 6, 3, 4); f(C.bark, 13, 6, 3, 4); }
        }
        break;
      }
      case Tile.Sand:
        f(C.dune, 0, 0, 16, 16);
        specks(C.sand, 7, 19);
        specks(C.shell, 3, 23);
        break;
      case Tile.Grass:
      case Tile.Tree:
      case Tile.House:
        f(C.green, 0, 0, 16, 16);
        specks(C.leaf, 6, 29);
        for (let i = 0; i < 3; i++) {
          const gx = Math.floor(hash2(x, y, 60 + i) * 14), gy = 2 + Math.floor(hash2(x, y, 70 + i) * 12);
          f(C.lime, gx, gy, 1, 2); f(C.lime, gx + 1, gy - 1, 1, 2);
        }
        if (t === Tile.House) { f(C.mud, 0, 0, 16, 16); specks(C.clay, 6, 31); }
        break;
      case Tile.Road: {
        f(C.tan, 0, 0, 16, 16);
        specks(C.clay, 8, 37);
        specks(C.sand, 5, 41);
        // wheel ruts along the road's direction
        const h = w.at(x - 1, y) === Tile.Road || w.at(x + 1, y) === Tile.Road;
        const v = w.at(x, y - 1) === Tile.Road || w.at(x, y + 1) === Tile.Road;
        if (h) { f(C.clay, 0, 4, 16, 1); f(C.clay, 0, 11, 16, 1); }
        if (v) { f(C.clay, 4, 0, 1, 16); f(C.clay, 11, 0, 1, 16); }
        // a dark kerb where the road meets anything else
        if (w.at(x, y - 1) !== Tile.Road && w.inb(x, y - 1)) f(C.mud, 0, 0, 16, 1);
        if (w.at(x, y + 1) !== Tile.Road && w.inb(x, y + 1)) f(C.mud, 0, 15, 16, 1);
        if (w.at(x - 1, y) !== Tile.Road && w.inb(x - 1, y)) f(C.mud, 0, 0, 1, 16);
        if (w.at(x + 1, y) !== Tile.Road && w.inb(x + 1, y)) f(C.mud, 15, 0, 1, 16);
        break;
      }
    }
    this.edges(ctx, x, y, px, py);
  }

  /** The shoreline foam and the depth-shelf lines, over code or imported tiles alike. */
  private edges(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number) {
    const w = this.world;
    const t = w.at(x, y);
    const f = (c: string, a: number, b: number, ww: number, hh: number) => { ctx.fillStyle = c; ctx.fillRect(px + a, py + b, ww, hh); };
    // shore line: water meeting land gets a foam edge on the water side
    if (isWater(t)) {
      const land = (a: number, b: number) => w.inb(a, b) && !isWater(w.at(a, b)) && w.at(a, b) !== Tile.Dock;
      if (land(x, y - 1)) { f(C.dune, 0, 0, 16, 1); f(C.ice, 0, 1, 16, 1); }
      if (land(x, y + 1)) { f(C.ice, 0, 14, 16, 1); f(C.dune, 0, 15, 16, 1); }
      if (land(x - 1, y)) { f(C.dune, 0, 0, 1, 16); f(C.ice, 1, 0, 1, 16); }
      if (land(x + 1, y)) { f(C.ice, 14, 0, 1, 16); f(C.dune, 15, 0, 1, 16); }
    }
    // depth edges: a 1 px darker line where water steps down, so the bands read as shelves
    const depth = (q: Tile) => (q === Tile.Deep ? 3 : q === Tile.Mid ? 2 : q === Tile.Shallow || q === Tile.Reeds || q === Tile.Dock ? 1 : 0);
    const d0 = depth(t);
    if (d0) {
      if (depth(w.at(x, y - 1)) > d0 && w.inb(x, y - 1)) f(d0 === 1 ? C.blue : C.abyss, 0, 0, 16, 1);
      if (depth(w.at(x - 1, y)) > d0 && w.inb(x - 1, y)) f(d0 === 1 ? C.blue : C.abyss, 0, 0, 1, 16);
      if (depth(w.at(x + 1, y)) > d0 && w.inb(x + 1, y)) f(d0 === 1 ? C.blue : C.abyss, 15, 0, 1, 16);
      if (depth(w.at(x, y + 1)) > d0 && w.inb(x, y + 1)) f(d0 === 1 ? C.blue : C.abyss, 0, 15, 16, 1);
    }
  }
}
