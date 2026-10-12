// Sprites: the art director's PNG strips from src/art/ (<name>.png + <name>.json, see
// .claude/agents/art-director.md) when they exist, otherwise a code-drawn placeholder in the
// palette. Frames are cut once into their own small canvases; every draw is on whole pixels.
import { C } from '../data/palette';

export interface SpriteSheet {
  frames: HTMLCanvasElement[];
  w: number;
  h: number;
  /** the pixel inside a frame that sits on the entity's position */
  ax: number;
  ay: number;
  fps: number;
  /** drawn by code, not imported */
  placeholder: boolean;
}

interface Meta { frame: [number, number]; frames: number; anchor: [number, number]; fps?: number }

const PNG = import.meta.glob('../art/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const JSON_META = import.meta.glob('../art/*.json', { eager: true, import: 'default' }) as Record<string, Meta>;

const sheets = new Map<string, SpriteSheet>();
const loading: Promise<void>[] = [];

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Load every imported sheet; resolves when all have loaded (or failed and kept their placeholder). */
export function loadArt(): Promise<void> {
  for (const [path, url] of Object.entries(PNG)) {
    const name = path.replace(/^.*\//, '').replace(/\.png$/, '');
    const meta = JSON_META[path.replace(/\.png$/, '.json')];
    if (!meta) continue;
    loading.push(new Promise<void>((res) => {
      const img = new Image();
      img.onload = () => {
        const [w, h] = meta.frame;
        const frames: HTMLCanvasElement[] = [];
        for (let i = 0; i < meta.frames; i++) {
          const c = canvas(w, h);
          c.getContext('2d')!.drawImage(img, i * w, 0, w, h, 0, 0, w, h);
          frames.push(c);
        }
        sheets.set(name, { frames, w, h, ax: meta.anchor[0], ay: meta.anchor[1], fps: meta.fps ?? 4, placeholder: false });
        res();
      };
      img.onerror = () => { console.error('sprite failed to load', url); res(); };
      img.src = url;
    }));
  }
  return Promise.all(loading).then(() => {});
}

/** The sheet for a name: imported art if loaded, else its placeholder. */
export function sheet(name: string): SpriteSheet {
  let s = sheets.get(name);
  if (s) return s;
  s = placeholder(name);
  sheets.set(name, s);
  return s;
}

export function hasArt(name: string) {
  const s = sheets.get(name);
  return !!s && !s.placeholder;
}

/** Draw frame `f` (wrapped) with its anchor at world pixel (x, y); flip mirrors it left-right. */
export function drawSprite(ctx: CanvasRenderingContext2D, s: SpriteSheet, f: number, x: number, y: number, flip = false) {
  const img = s.frames[((f % s.frames.length) + s.frames.length) % s.frames.length];
  const px = Math.round(x), py = Math.round(y);
  if (!flip) {
    ctx.drawImage(img, px - s.ax, py - s.ay);
    return;
  }
  ctx.save();
  ctx.translate(px, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, -(s.w - s.ax), py - s.ay);
  ctx.restore();
}

/** The frame to show at time t (seconds) for an animated sheet. */
export function frameAt(s: SpriteSheet, t: number) {
  return Math.floor(t * s.fps) % s.frames.length;
}

// ---------------------------------------------------------------- placeholders
// Plain, readable shapes in the palette with a 1 px ink outline, so the board reads before the
// real art lands. Each returns frames facing right.

type Draw = (x: CanvasRenderingContext2D, f: number) => void;

function make(w: number, h: number, ax: number, ay: number, n: number, fps: number, draw: Draw): SpriteSheet {
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < n; f++) {
    const c = canvas(w, h);
    const x = c.getContext('2d')!;
    draw(x, f);
    outline(c);
    frames.push(c);
  }
  return { frames, w, h, ax, ay, fps, placeholder: true };
}

/** A 1 px ink outline around every opaque shape (outside). */
function outline(c: HTMLCanvasElement) {
  const x = c.getContext('2d')!;
  const d = x.getImageData(0, 0, c.width, c.height);
  const a = (i: number, j: number) => (i < 0 || j < 0 || i >= c.width || j >= c.height ? 0 : d.data[(j * c.width + i) * 4 + 3]);
  x.fillStyle = C.ink;
  for (let j = 0; j < c.height; j++)
    for (let i = 0; i < c.width; i++)
      if (!a(i, j) && (a(i - 1, j) || a(i + 1, j) || a(i, j - 1) || a(i, j + 1))) x.fillRect(i, j, 1, 1);
}

function r(x: CanvasRenderingContext2D, c: string, a: number, b: number, w: number, h: number) {
  x.fillStyle = c;
  x.fillRect(a, b, w, h);
}

function disc(x: CanvasRenderingContext2D, c: string, cx: number, cy: number, rx: number, ry = rx) {
  x.fillStyle = c;
  for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++)
    for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
      const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) x.fillRect(i, j, 1, 1);
    }
}

function placeholder(name: string): SpriteSheet {
  switch (name) {
    case 'gull':
      return make(18, 14, 9, 11, 2, 6, (x, f) => {
        // wings up / down
        if (f === 0) { r(x, C.ash, 3, 2, 5, 3); r(x, C.ash, 10, 2, 5, 3); r(x, C.ink, 2, 1, 2, 2); r(x, C.ink, 14, 1, 2, 2); }
        else { r(x, C.ash, 2, 7, 6, 2); r(x, C.ash, 10, 7, 6, 2); r(x, C.ink, 1, 8, 2, 1); r(x, C.ink, 15, 8, 2, 1); }
        disc(x, C.bone, 9, 7, 5, 2.5);
        disc(x, C.bone, 13.5, 5.5, 2);
        r(x, C.gold, 15, 5, 2, 1);
        r(x, C.ink, 14, 5, 1, 1);
        r(x, C.mist, 4, 7, 3, 1);
      });
    case 'raccoon':
      return make(20, 14, 10, 12, 2, 6, (x, f) => {
        // ringed tail
        for (let i = 0; i < 5; i++) r(x, i % 2 ? C.ink : C.ash, 1 + i, 6 + (i > 2 ? 1 : 0), 1, 3);
        disc(x, C.steel, 9.5, 7.5, 5, 3.5);
        disc(x, C.fog, 9.5, 6.5, 3.5, 2);
        // legs
        const o = f ? 1 : 0;
        r(x, C.iron, 6 + o, 10, 2, 2); r(x, C.iron, 12 - o, 10, 2, 2);
        // head with the mask
        disc(x, C.fog, 15, 6, 3.2, 3);
        r(x, C.ink, 13, 5, 5, 2);
        r(x, C.bone, 16, 5, 1, 1);
        r(x, C.ink, 18, 7, 1, 1);
        r(x, C.iron, 13, 2, 2, 2); r(x, C.iron, 16, 2, 2, 2);
      });
    case 'bear':
      return make(28, 20, 14, 18, 2, 4, (x, f) => {
        disc(x, C.night, 13, 10, 10, 6.5);
        disc(x, C.slate, 12, 8, 7, 3.5);
        const o = f ? 1 : 0;
        r(x, C.night, 5 + o, 14, 4, 4); r(x, C.night, 16 - o, 14, 4, 4);
        disc(x, C.night, 22, 9, 4.5, 4);
        r(x, C.tan, 24, 9, 3, 3);
        r(x, C.ink, 26, 9, 1, 1);
        r(x, C.bone, 22, 7, 1, 1);
        r(x, C.night, 19, 4, 3, 2); r(x, C.night, 23, 4, 2, 2);
      });
    case 'puffer':
      return make(14, 14, 7, 9, 2, 3, (x, f) => {
        const rr = f ? 4.5 : 4;
        disc(x, C.gold, 7, 7, rr + 0.5, rr);
        disc(x, C.amber, 7, 8.5, rr - 0.5, rr - 1.5);
        r(x, C.bark, 4, 5, 2, 2); r(x, C.bark, 8, 4, 2, 2); r(x, C.bark, 6, 8, 2, 1);
        r(x, C.ink, 10, 6, 1, 1);
        r(x, C.gold, 1, 6, 1, 3);
        if (f) { r(x, C.shell, 7, 1, 1, 1); r(x, C.shell, 3, 2, 1, 1); r(x, C.shell, 11, 2, 1, 1); }
      });
    case 'puffer_big':
      return make(18, 18, 9, 11, 1, 1, (x) => {
        disc(x, C.gold, 9, 9, 7, 7);
        disc(x, C.amber, 9, 11, 5, 4);
        for (const [a, b] of [[9, 1], [3, 3], [15, 3], [1, 9], [17, 9], [3, 15], [15, 15]]) r(x, C.shell, a, b, 1, 1);
        r(x, C.ink, 13, 7, 1, 1);
      });
    case 'ray':
      // lesser electric ray from above: a round sandy disc with dark rings, a short thick tail
      return make(15, 15, 7, 10, 2, 3, (x, f) => {
        const w = f ? 0.4 : 0;
        r(x, C.tan, 6, 10, 3, 4); r(x, C.tan, 5, 13, 5, 1);
        disc(x, C.sand, 7.5, 6, 6 + w, 5.5);
        disc(x, C.dune, 7.5, 5.5, 3.5, 3);
        r(x, C.clay, 4, 4, 2, 1); r(x, C.clay, 10, 4, 2, 1); r(x, C.clay, 6, 8, 4, 1);
        r(x, C.ink, 6, 3, 1, 1); r(x, C.ink, 9, 3, 1, 1);
      });
    case 'turtle':
      return make(18, 14, 9, 11, 2, 2, (x, f) => {
        const o = f ? 1 : 0;
        r(x, C.mist, 3 + o, 9, 3, 3); r(x, C.mist, 11 - o, 9, 3, 3);
        disc(x, C.mist, 15, 7, 2.5, 2.2);
        r(x, C.ink, 16, 6, 1, 1);
        disc(x, C.iron, 8.5, 7, 6.5, 4.5);
        disc(x, C.steel, 8.5, 6.5, 5, 3.2);
        r(x, C.ash, 5, 5, 2, 2); r(x, C.ash, 8, 4, 2, 2); r(x, C.ash, 11, 5, 2, 2); r(x, C.ash, 7, 7, 3, 2);
      });
    case 'angler':
      return make(12, 22, 6, 20, 2, 1, (x, f) => {
        r(x, C.copper, 4, 13, 2, 7); r(x, C.copper, 7, 13, 2, 7);
        r(x, C.red, 3, 7, 7, 7);
        disc(x, C.dune, 6.5, 4.5, 2.5);
        r(x, C.brass, 2, 1, 9, 2); r(x, C.brass, 4, 0, 5, 1);
        r(x, C.dune, 9, 9 - f, 2, 2);
      });
    case 'worm':
      return make(10, 7, 5, 4, 2, 3, (x, f) => {
        disc(x, C.clay, 5, 4.5, 4, 2);
        const w = f ? [[2, 3], [3, 2], [4, 2], [5, 3], [6, 3], [7, 2]] : [[2, 2], [3, 3], [4, 3], [5, 2], [6, 2], [7, 3]];
        for (const [a, b] of w) r(x, C.rose, a, b, 1, 1);
      });
    case 'crate':
      return make(10, 9, 5, 8, 1, 1, (x) => {
        r(x, C.copper, 1, 1, 8, 7); r(x, C.brass, 2, 2, 6, 5); r(x, C.copper, 4, 1, 2, 7);
      });
    case 'tree':
      return make(20, 28, 10, 26, 1, 1, (x) => {
        r(x, C.bark, 8, 18, 4, 9);
        disc(x, C.leaf, 10, 11, 9, 9);
        disc(x, C.green, 9, 9, 7, 6.5);
        disc(x, C.lime, 7, 7, 3, 2.5);
      });
    case 'smokehouse':
      return make(50, 56, 25, 54, 1, 1, (x) => {
        // walls, roof, a west door, the chimney
        r(x, C.copper, 2, 22, 46, 32);
        for (let i = 0; i < 46; i += 6) r(x, C.rust, 2 + i, 22, 1, 32);
        for (let j = 0; j < 22; j++) r(x, C.wine, 1 + Math.floor(j * 0.1), 4 + j, 48 - Math.floor(j * 0.2), 1);
        r(x, C.red, 3, 6, 44, 2);
        r(x, C.iron, 36, 0, 6, 12);
        r(x, C.bark, 2, 36, 9, 18); r(x, C.brass, 9, 44, 1, 2);
        r(x, C.amber, 18, 30, 6, 5); r(x, C.amber, 32, 30, 6, 5);
      });
    case 'bobber':
      return make(6, 6, 3, 4, 2, 2, (x, f) => {
        r(x, C.red, 1, 1 + f, 4, 2); r(x, C.bone, 1, 3 + f, 4, 2);
      });
    case 'wormbed':
      return make(32, 14, 0, 0, 1, 1, (x) => {
        r(x, C.bark, 1, 1, 30, 12); r(x, C.mud, 3, 3, 26, 8);
        for (let i = 0; i < 6; i++) r(x, C.rose, 5 + i * 4, 5 + (i % 2) * 2, 2, 1);
      });
  }
  return make(10, 10, 5, 8, 1, 1, (x) => { r(x, C.magenta, 1, 1, 8, 8); r(x, C.ink, 1, 1, 4, 4); r(x, C.ink, 5, 5, 4, 4); });
}

/** Names the game draws (the art director's export list). */
export const SPRITE_NAMES = ['gull', 'raccoon', 'bear', 'puffer', 'puffer_big', 'ray', 'turtle', 'angler', 'worm', 'crate', 'tree', 'smokehouse', 'bobber', 'wormbed'];
