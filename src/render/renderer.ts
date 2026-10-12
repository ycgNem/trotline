// The world renderer: camera at an integer zoom, baked ground chunks and a baked props layer
// (the trees), the placement overlays, y-sorted sprites (the smokehouse, defenders, thieves, the
// angler), flying gulls above with ground shadows, and the effects the sim's events ask for.
// Reads the Game; never writes it.
import { C, rgba } from '../data/palette';
import type { Game, Thief, Defender, Boat, Lure } from '../sim/Game';
import { Tile, isWater } from '../sim/world';
import { THIEVES } from '../data/thieves';
import { DEFENDERS, TURTLE } from '../data/defenders';
import { BAIT } from '../data/bait';
import { lurePreview, slickPreview } from '../sim/systems/lures';
import { pufferRays } from '../sim/systems/defenders';
import type { SpeciesId } from '../data/species';
import { BOATS, type BoatId } from '../data/boats';
import { CANAL } from '../data/shore';
import type { GameEvent } from '../engine/events';
import { Ground, TILE, CHUNK, hash2, isSlot } from './ground';
import { sheet, drawSprite, frameAt, type SpriteSheet } from './sprites';

/** Where each thief's mouth is, (forward, up) in px from its anchor: the puffer it snatched sits there (art director, STYLE.md). */
const MOUTH: Record<Thief['kind'], [number, number]> = { raccoon: [8, -6], bear: [11, -8], gull: [7, -3] };

export class Camera {
  /** centre, in world pixels */
  x = 0;
  y = 0;
  zoom = 2;
  /** the zoom that fits the whole shore on screen */
  fitZoom = 2;
}

export interface Overlay {
  /** the tile under the mouse */
  hover: { x: number; y: number } | null;
  /** deploying this species: show its slots */
  deploy: SpeciesId | null;
  /** casting a lure: show the road in reach */
  lure: boolean;
  /** show the cast range circle */
  range: boolean;
  /** casting a chum slick: show the pale water in reach and what the slick would pull */
  slick: boolean;
  /** digging canals: show the tiles that can be dug */
  dig: boolean;
  /** sending this boat: show where it would go */
  send: BoatId | null;
  /** the boat picked in the fleet panel */
  boat: BoatId | null;
}

/** Where the hand's rod tip is on a boat's fishing frame, from its anchor (art director). */
const ROD_TIP: Record<BoatId, [number, number]> = { rowboat: [10, -9], skiff: [11, -11], trawler: [0, 0] };

interface Fx { kind: string; x: number; y: number; x2: number; y2: number; t: number; life: number; v: number; id?: string }

export class Renderer {
  cam = new Camera();
  ground: Ground | null = null;
  fx: Fx[] = [];
  W = 0;
  H = 0;
  /** real time in seconds, for animation */
  time = 0;
  /** white silhouettes of sheets, for the hit flash */
  private flash = new Map<SpriteSheet, SpriteSheet>();
  /** the trees, drawn once (they never move) */
  private props: HTMLCanvasElement | null = null;
  private items: { y: number; k: number; ref: Defender | Thief | Boat | null }[] = [];
  /** the world version the ground chunks were baked at (a dug canal rebakes them) */
  private groundV = -1;
  private clawed = new Set<number>();
  private mask: { key: string; cells: Uint8Array } | null = null;

  constructor(public ctx: CanvasRenderingContext2D) {}

  resize(W: number, H: number, mapW: number, mapH: number) {
    this.W = W;
    this.H = H;
    const z = Math.max(1, Math.floor(Math.min(W / (mapW * TILE), H / (mapH * TILE))));
    const was = this.cam.fitZoom;
    this.cam.fitZoom = z;
    if (this.cam.zoom === was || this.cam.zoom < z) this.cam.zoom = z;
    this.clampCam(mapW, mapH);
  }

  clampCam(mapW: number, mapH: number) {
    const c = this.cam;
    const halfW = this.W / 2 / c.zoom, halfH = this.H / 2 / c.zoom;
    const mw = mapW * TILE, mh = mapH * TILE;
    c.x = mw <= halfW * 2 ? mw / 2 : Math.max(halfW, Math.min(mw - halfW, c.x));
    c.y = mh <= halfH * 2 ? mh / 2 : Math.max(halfH, Math.min(mh - halfH, c.y));
  }

  /** Screen pixel offset of world pixel (0, 0). */
  origin() {
    const c = this.cam;
    return { ox: Math.round(this.W / 2 - Math.round(c.x) * c.zoom), oy: Math.round(this.H / 2 - Math.round(c.y) * c.zoom) };
  }

  screenToTile(sx: number, sy: number) {
    const { ox, oy } = this.origin();
    const z = this.cam.zoom;
    return { x: Math.floor((sx - ox) / z / TILE), y: Math.floor((sy - oy) / z / TILE) };
  }

  /** The point under a screen pixel, in tile units (not rounded to a tile). */
  screenToPoint(sx: number, sy: number) {
    const { ox, oy } = this.origin();
    const z = this.cam.zoom;
    return { x: (sx - ox) / z / TILE, y: (sy - oy) / z / TILE };
  }

  /** Screen position of a point in tile units. */
  toScreen(tx: number, ty: number) {
    const { ox, oy } = this.origin();
    const z = this.cam.zoom;
    return { x: ox + tx * TILE * z, y: oy + ty * TILE * z };
  }

  // ---------------------------------------------------------------- events -> effects

  consume(evs: GameEvent[], g: Game) {
    for (const e of evs) {
      const x = e.x ?? 0, y = e.y ?? 0;
      switch (e.type) {
        // a bolt shows for 4 frames: long enough to see, short enough not to hide its target
        case 'zap': this.fx.push({ kind: 'zap', x, y, x2: e.x2 ?? x, y2: e.y2 ?? y, t: 0, life: 0.07, v: e.value ?? 0 }); break;
        case 'snatch': this.fx.push({ kind: 'splash', x, y, x2: 0, y2: 0, t: 0, life: 0.5, v: 0 }); break;
        case 'swallow': this.fx.push({ kind: 'ring', x, y, x2: 0, y2: 0, t: 0, life: 0.5, v: 1 }); break;
        case 'grab': this.fx.push({ kind: 'claw', x, y, x2: 0, y2: 0, t: 0, life: 0.4, v: 0 }); break;
        case 'catch': this.fx.push({ kind: 'splash', x, y, x2: 0, y2: 0, t: 0, life: 0.6, v: 0, id: e.id }); this.fx.push({ kind: 'leap', x, y, x2: g.world.angler.x, y2: g.world.angler.y, t: 0, life: 0.7, v: 0, id: e.id }); break;
        case 'cast': this.fx.push({ kind: 'ring', x, y, x2: 0, y2: 0, t: 0, life: 0.5, v: 0 }); break;
        case 'lure': this.fx.push({ kind: 'ring', x, y, x2: 0, y2: 0, t: 0, life: 0.5, v: 1 }); break;
        case 'deploy': this.fx.push({ kind: 'splash', x, y, x2: 0, y2: 0, t: 0, life: 0.5, v: 0 }); break;
        case 'kill': this.fx.push({ kind: 'poof', x, y, x2: 0, y2: 0, t: 0, life: 0.5, v: 0, id: e.id }); break;
        case 'pulled': this.fx.push({ kind: 'bang', x, y, x2: 0, y2: 0, t: 0, life: 0.8, v: 0 }); break;
        case 'mob': this.fx.push({ kind: 'bang', x, y: y - 0.6, x2: 0, y2: 0, t: 0, life: 0.8, v: 0 }); break;
        case 'defenderLost': this.fx.push({ kind: 'poof', x, y, x2: 0, y2: 0, t: 0, life: 0.6, v: 1 }); break;
        case 'boatCatch': this.fx.push({ kind: 'splash', x, y, x2: 0, y2: 0, t: 0, life: 0.6, v: 0 }); break;
        // a boat's catch goes up onto the dock and into the live well
        case 'land': this.fx.push({ kind: 'leap', x, y, x2: g.world.angler.x, y2: g.world.angler.y + 1, t: 0, life: 0.5, v: 0, id: e.id }); break;
        case 'slick': this.fx.push({ kind: 'ring', x, y, x2: 0, y2: 0, t: 0, life: 0.6, v: 2 }); break;
        case 'dug': this.fx.push({ kind: 'splash', x, y, x2: 0, y2: 0, t: 0, life: 0.6, v: 0 }); break;
      }
    }
  }

  // ---------------------------------------------------------------- draw

  draw(g: Game, dt: number, ov: Overlay) {
    const ctx = this.ctx;
    const w = g.world;
    this.time += dt;
    if (!this.ground || this.ground.world !== w) { this.ground = new Ground(w); this.groundV = w.version; }
    if (this.groundV !== w.version) { this.ground.invalidate(); this.groundV = w.version; this.mask = null; }
    const z = this.cam.zoom;
    const { ox, oy } = this.origin();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.setTransform(z, 0, 0, z, ox, oy);
    ctx.imageSmoothingEnabled = false;

    // ground
    for (let cy = 0; cy * CHUNK < w.h; cy++)
      for (let cx = 0; cx * CHUNK < w.w; cx++) ctx.drawImage(this.ground.chunk(cx, cy), cx * CHUNK * TILE, cy * CHUNK * TILE);
    this.glints(g);
    if (!this.props) this.props = this.bakeProps(g);
    ctx.drawImage(this.props, 0, 0);

    // overlays under the sprites
    this.overlays(g, ov);
    if (g.wormBed) drawSprite(ctx, sheet('wormbed'), 0, (17) * TILE, 13 * TILE + 1);
    this.digs(g);
    for (const l of g.lures) {
      const s = sheet(l.bait === 'chum' ? 'slick' : 'worm');
      drawSprite(ctx, s, frameAt(s, this.time), (l.x + 0.5) * TILE, (l.y + 0.5) * TILE + (l.bait === 'chum' ? 1 : 3));
    }

    // y-sorted sprites (a reused list of tagged entries, not a closure per sprite per frame)
    this.clawed.clear();
    for (const t of g.thieves) if (t.grabbing) this.clawed.add(t.grabbing);
    let n = 0;
    const put = (y: number, k: number, ref: Defender | Thief | Boat | null) => {
      const it = this.items[n] ?? (this.items[n] = { y: 0, k: 0, ref: null });
      it.y = y; it.k = k; it.ref = ref; n++;
    };
    put(15 + 2.95, 0, null);
    for (const d of g.defenders) put(d.y + 0.6, 1, d);
    for (const b of g.boats) put(b.y + 0.3, 4, b);
    for (const t of g.thieves) if (t.mode !== 'dead' && t.mode !== 'gone' && !THIEVES[t.kind].flies) put(t.y, 2, t);
    put(w.angler.y + 0.4, 3, null);
    this.items.length = n;
    this.items.sort((a, b) => a.y - b.y);
    for (const it of this.items) {
      if (it.k === 0) { drawSprite(ctx, sheet('smokehouse'), 0, (35 + 1.5) * TILE, (15 + 3) * TILE); this.crates(g); }
      else if (it.k === 1) this.defender(g, it.ref as Defender);
      else if (it.k === 2) this.thief(g, it.ref as Thief);
      else if (it.k === 4) this.boat(g, it.ref as Boat, ov.boat === (it.ref as Boat).kind);
      else this.angler(g);
    }

    // a lure stays readable with a raccoon (or a bear) on it: a ring and its food left, over the
    // sprites; pink for a worm, amber for a chum slick
    for (const l of g.lures) this.lureRing(l);

    // gulls fly above everything, with a shadow on the ground
    for (const t of g.thieves) if (t.mode !== 'dead' && t.mode !== 'gone' && THIEVES[t.kind].flies) {
      // one sitting on the water (retching, robbing a flockmate or at a chum slick) is drawn down on
      // it, with no shadow
      const down = t.mode === 'mob' || t.stunT > 0 || t.mode === 'eat';
      const rx = Math.round(t.x * TILE), ry = Math.round(t.y * TILE);
      if (!down) {
        ctx.fillStyle = rgba(C.ink, 0.35);
        ctx.fillRect(rx - 4, ry + 2, 8, 2);
      }
      this.thief(g, t, down ? 0 : 10);
      if (down) {
        // afloat: its belly sunk under the waterline, and a ripple widening round it
        ctx.fillStyle = rgba(C.ice, 0.85);
        ctx.fillRect(rx - 6, ry + 7, 12, 2);
        const k = (this.time * 1.2 + t.id * 0.37) % 1, w = 7 + Math.round(k * 3);
        ctx.fillStyle = rgba(C.bone, 0.8 * (1 - k));
        ctx.fillRect(rx - w + 1, ry + 9, w * 2 - 2, 1);
        ctx.fillRect(rx - w, ry + 7, 1, 2);
        ctx.fillRect(rx + w - 1, ry + 7, 1, 2);
      }
    }

    this.line(g);
    this.effects(dt);
    this.bars(g);
  }

  /** The trees on one canvas the size of the shore: drawn once, then one drawImage a frame. */
  private bakeProps(g: Game): HTMLCanvasElement {
    const w = g.world;
    const c = document.createElement('canvas');
    c.width = w.w * TILE;
    c.height = w.h * TILE;
    const x = c.getContext('2d')!;
    x.imageSmoothingEnabled = false;
    for (let ty = 0; ty < w.h; ty++)
      for (let tx = 0; tx < w.w; tx++) if (w.at(tx, ty) === Tile.Tree) drawSprite(x, sheet('tree'), 0, (tx + 0.5) * TILE, (ty + 1) * TILE - 1);
    return c;
  }

  private glints(g: Game) {
    const ctx = this.ctx, w = g.world;
    const t = this.time;
    for (let y = 0; y < w.h; y++)
      for (let x = 0; x < w.w; x++) {
        const tt = w.at(x, y);
        if (!isWater(tt) || tt === Tile.Reeds) continue;
        const ph = hash2(x, y, 3);
        const cyc = (t / (2.4 + ph * 2) + ph) % 1;
        if (cyc > 0.22) continue;
        const gx = Math.floor(hash2(x, y, Math.floor(t / 3 + ph * 9)) * 12) + 2, gy = Math.floor(hash2(y, x, Math.floor(t / 3 + ph * 7)) * 12) + 2;
        ctx.fillStyle = tt === Tile.Deep ? C.blue : tt === Tile.Mid ? C.sky : isSlot(w, x, y) ? C.bone : C.ice;
        ctx.fillRect(x * TILE + gx, y * TILE + gy, cyc < 0.11 ? 2 : 3, 1);
      }
  }

  private overlays(g: Game, ov: Overlay) {
    const ctx = this.ctx, w = g.world;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
    if (ov.deploy) {
      const mask = this.slotMask(g, ov.deploy);
      for (let y = 0; y < w.h; y++)
        for (let x = 0; x < w.w; x++) {
          if (!mask[w.idx(x, y)]) continue;
          ctx.fillStyle = rgba(C.bone, 0.18 + 0.18 * pulse);
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          ctx.fillStyle = C.bone;
          ctx.fillRect(x * TILE, y * TILE, TILE, 1); ctx.fillRect(x * TILE, y * TILE + 15, TILE, 1);
          ctx.fillRect(x * TILE, y * TILE, 1, TILE); ctx.fillRect(x * TILE + 15, y * TILE, 1, TILE);
        }
      // the reach of the fish under the mouse
      if (ov.hover && g.canDeploy(ov.deploy, ov.hover.x, ov.hover.y).ok) {
        const d = DEFENDERS[ov.deploy];
        const r = d.kind === 'zap' ? d.range : d.kind === 'poison' ? d.trigger + 0.5 : 0;
        if (r) this.circle(ov.hover.x + 0.5, ov.hover.y + 0.5, r, C.gold);
        // a puffer: the rays that reach where a gull flock would come down round it (gold)
        if (d.kind === 'poison') {
          const rays = pufferRays(g, ov.hover.x, ov.hover.y);
          for (const q of g.defenders) if (rays.includes(q.id)) this.frame(q.x, q.y, 0, C.gold);
        }
        // a ray: the road it would shock, wet and in reach (DESIGN.md §4: dry ground carries none)
        if (d.kind === 'zap') {
          ctx.fillStyle = rgba(C.gold, 0.22 + 0.12 * pulse);
          for (const p of w.path) {
            if (!w.wet[w.idx(p.x, p.y)] || Math.hypot(p.x - ov.hover.x, p.y - ov.hover.y) > d.range) continue;
            ctx.fillRect(p.x * TILE, p.y * TILE, TILE, TILE);
          }
        }
      }
    }
    if (ov.lure) {
      for (const p of w.path) {
        if (!g.canLure(p.x, p.y).ok) continue;
        ctx.fillStyle = rgba(C.rose, 0.2 + 0.2 * pulse);
        ctx.fillRect(p.x * TILE, p.y * TILE, TILE, TILE);
      }
      if (ov.hover && g.canLure(ov.hover.x, ov.hover.y).ok) {
        this.circle(ov.hover.x + 0.5, ov.hover.y + 0.5, THIEVES.raccoon.pulledBy.worm ?? 4, C.rose);
        // where the line would wait behind it, the fish it would wade at (red) and the rays that
        // reach the one eating (gold): placing a worm is placing a line (DESIGN.md §6)
        const pv = lurePreview(g, ov.hover.x, ov.hover.y);
        for (const p of pv.line) {
          const px = Math.round(p.x * TILE), py = Math.round(p.y * TILE);
          ctx.fillStyle = C.mud;
          ctx.fillRect(px - 3, py - 2, 6, 5);
          ctx.fillStyle = rgba(C.bone, 0.7 + 0.3 * pulse);
          ctx.fillRect(px - 2, py - 1, 4, 3);
        }
        for (const d of g.defenders) {
          const red = pv.waded.includes(d.id), gold = pv.shocks.includes(d.id);
          if (red) this.frame(d.x, d.y, 0, rgba(C.red, 0.6 + 0.4 * pulse));
          if (gold) this.frame(d.x, d.y, red ? 2 : 0, C.gold);
        }
      }
    }
    if (ov.slick) {
      // the pale water in reach, tinted amber; hovering one shows what comes to it
      ctx.fillStyle = rgba(C.amber, 0.16 + 0.16 * pulse);
      const lit = this.slickMask(g);
      for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (lit[w.idx(x, y)]) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      if (ov.hover && g.canSlick(ov.hover.x, ov.hover.y).ok) {
        const pv = slickPreview(g, ov.hover.x, ov.hover.y);
        this.circle(ov.hover.x + 0.5, ov.hover.y + 0.5, THIEVES.gull.pulledBy.chum ?? 4, C.amber);
        this.circle(ov.hover.x + 0.5, ov.hover.y + 0.5, THIEVES.bear.pulledBy.chum ?? 5, C.copper);
        for (const p of pv.spots.slice(0, 4)) { ctx.fillStyle = rgba(C.bone, 0.6 + 0.3 * pulse); ctx.fillRect(Math.round(p.x * TILE) - 2, Math.round(p.y * TILE) - 1, 4, 2); }
        for (const p of pv.line) {
          const px = Math.round(p.x * TILE), py = Math.round(p.y * TILE);
          ctx.fillStyle = C.night; ctx.fillRect(px - 4, py - 2, 8, 5);
          ctx.fillStyle = rgba(C.slate, 0.7 + 0.3 * pulse); ctx.fillRect(px - 3, py - 1, 6, 3);
        }
        for (const d of g.defenders) {
          const red = pv.waded.includes(d.id), gold = pv.shocks.includes(d.id);
          if (red) this.frame(d.x, d.y, 0, rgba(C.red, 0.6 + 0.4 * pulse));
          if (gold) this.frame(d.x, d.y, red ? 2 : 0, C.gold);
        }
      }
    }
    if (ov.dig) {
      // tiles a canal can be dug into now (touching water or a tile already ordered), and for the
      // one under the mouse the road it would turn wet (gold)
      for (let y = 0; y < w.h; y++)
        for (let x = 0; x < w.w; x++) {
          const ok = !g.digBlock(x, y) && !g.digs.some((p) => p.x === x && p.y === y) && (w.touchesWater(x, y) || g.digs.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) === 1));
          if (!ok) continue;
          // an outline: a clay tint over sand doesn't read at 1x (the Milestone 3 review)
          this.frame(x, y, 1, rgba(C.clay, 0.6 + 0.4 * pulse));
        }
      const h = ov.hover;
      if (h && g.canDig(h.x, h.y).ok) {
        ctx.fillStyle = rgba(C.gold, 0.3 + 0.15 * pulse);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const x = h.x + dx, y = h.y + dy;
          if (w.at(x, y) === Tile.Road && !w.wet[w.idx(x, y)]) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }
    if (ov.send) {
      // where the boat would go: its way there by water, dotted
      const b = g.boat(ov.send);
      const h = ov.hover;
      if (b && h && g.canSend(ov.send, h.x, h.y).ok) {
        const path = w.waterPath({ x: Math.floor(b.x), y: Math.floor(b.y) }, h) ?? [];
        // dark-ringed dots: pale dots alone vanish on pale water (the Milestone 3 review)
        path.forEach((p, i) => {
          if ((i + Math.floor(this.time * 6)) % 2) return;
          const px = Math.round(p.x * TILE), py = Math.round(p.y * TILE);
          ctx.fillStyle = C.ink; ctx.fillRect(px - 2, py - 2, 4, 4);
          ctx.fillStyle = C.bone; ctx.fillRect(px - 1, py - 1, 2, 2);
        });
        this.frame(h.x, h.y, 0, C.gold);
      }
    }
    if (ov.range || ov.lure || ov.slick) this.circle(w.angler.x, w.angler.y, g.rod.range, C.bone);
    if (ov.hover && w.inb(ov.hover.x, ov.hover.y)) {
      ctx.fillStyle = rgba(C.bone, 0.5);
      const { x, y } = ov.hover;
      ctx.fillRect(x * TILE, y * TILE, TILE, 1); ctx.fillRect(x * TILE, y * TILE + 15, TILE, 1);
      ctx.fillRect(x * TILE, y * TILE, 1, TILE); ctx.fillRect(x * TILE + 15, y * TILE, 1, TILE);
    }
  }

  /** Where a slick can go, recomputed only when something it depends on changes. */
  private slickMask(g: Game): Uint8Array {
    const w = g.world;
    let key = `${g.rodTier}|${g.chum > 0}|${w.version}`;
    for (const d of g.defenders) key += ',' + d.id;
    for (const l of g.lures) key += ';' + l.id;
    if (this.slickLit && this.slickLit.key === key) return this.slickLit.cells;
    const cells = new Uint8Array(w.w * w.h);
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (g.canSlick(x, y).ok) cells[w.idx(x, y)] = 1;
    this.slickLit = { key, cells };
    return cells;
  }
  private slickLit: { key: string; cells: Uint8Array } | null = null;

  /** Where this species can be deployed, recomputed only when a fish or a lure comes or goes. */
  private slotMask(g: Game, s: SpeciesId): Uint8Array {
    const w = g.world;
    let key = s;
    for (const d of g.defenders) key += ',' + d.id;
    for (const l of g.lures) key += ';' + l.id;
    if (this.mask && this.mask.key === key) return this.mask.cells;
    const cells = new Uint8Array(w.w * w.h);
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (g.canDeploy(s, x, y).ok) cells[w.idx(x, y)] = 1;
    this.mask = { key, cells };
    return cells;
  }

  /** A 1 px frame round a tile, `inset` pixels in. */
  private frame(x: number, y: number, inset: number, col: string) {
    const ctx = this.ctx, X = x * TILE + inset, Y = y * TILE + inset, S = TILE - inset * 2;
    ctx.fillStyle = col;
    ctx.fillRect(X, Y, S, 1); ctx.fillRect(X, Y + S - 1, S, 1);
    ctx.fillRect(X, Y, 1, S); ctx.fillRect(X + S - 1, Y, 1, S);
  }

  /** A dotted circle in tile units. */
  private circle(cx: number, cy: number, r: number, col: string) {
    const ctx = this.ctx;
    ctx.fillStyle = col;
    const n = Math.max(24, Math.floor(r * TILE * 2 * Math.PI / 4));
    for (let i = 0; i < n; i++) {
      if ((i + Math.floor(this.time * 8)) % 2) continue;
      const a = (i / n) * Math.PI * 2;
      ctx.fillRect(Math.round((cx + Math.cos(a) * r) * TILE), Math.round((cy + Math.sin(a) * r) * TILE), 1, 1);
    }
  }

  private crates(g: Game) {
    // the season's catch stacked by the smokehouse door: one crate drawn per 2 in store
    const s = sheet('crate');
    const n = Math.ceil(g.crates / 2);
    for (let i = 0; i < n; i++) {
      const col = i % 5, row = Math.floor(i / 5);
      drawSprite(this.ctx, s, 0, 35 * TILE + 4 + col * 8, 18 * TILE + 10 - row * 6 + (col % 2));
    }
  }

  /** A lure's ring and the food it has left: pink for a worm on the road, amber for a chum slick. */
  private lureRing(l: Lure) {
    const ctx = this.ctx;
    const chum = l.bait === 'chum';
    const lx = (l.x + 0.5) * TILE, ly = (l.y + 0.5) * TILE;
    ctx.fillStyle = rgba(chum ? C.amber : C.rose, 0.85);
    const rx = chum ? 9 : 7, ry = chum ? 5 : 4;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + this.time * (chum ? 0.6 : 1);
      ctx.fillRect(Math.round(lx + Math.cos(a) * rx), Math.round(ly + (chum ? 1 : 2) + Math.sin(a) * ry), 1, 1);
    }
    this.bar(lx, (l.y + 1) * TILE - 1, 10, l.food / BAIT[l.bait].lureFood, chum ? C.amber : C.rose);
  }

  /** Canal tiles ordered: a dashed outline, and the one being dug filling with water. */
  private digs(g: Game) {
    const ctx = this.ctx;
    g.digs.forEach((p, i) => {
      const X = p.x * TILE, Y = p.y * TILE;
      if (i === 0) {
        // the hole: dark mud, water rising in it as the digging goes on
        const k = Math.min(1, g.digT / CANAL.seconds);
        ctx.fillStyle = C.mud;
        ctx.fillRect(X + 2, Y + 2, 12, 12);
        ctx.fillStyle = C.sky;
        const h = Math.round(12 * k);
        ctx.fillRect(X + 2, Y + 14 - h, 12, h);
      }
      ctx.fillStyle = C.clay;
      for (let j = 0; j < 16; j += 2) {
        ctx.fillRect(X + j, Y, 1, 1); ctx.fillRect(X + j + 1, Y + 15, 1, 1);
        ctx.fillRect(X, Y + j + 1, 1, 1); ctx.fillRect(X + 15, Y + j, 1, 1);
      }
    });
  }

  /** A boat: its sprite (rowing or running, then at work), a wake while it moves, its line or its
   * net while it fishes, and a blinking "!" when it is waiting at the dock on you. */
  private boat(g: Game, b: Boat, picked: boolean) {
    const ctx = this.ctx;
    const def = BOATS[b.kind];
    const s = sheet(b.kind);
    const moving = b.state === 'out' || b.state === 'in';
    const work = b.state === 'fishing';
    const last = s.frames.length - 1;
    const f = moving ? (def.gear === 'net' ? 0 : Math.floor(this.time * s.fps) % Math.max(1, last)) : work ? last : 0;
    const bob = Math.round(Math.sin(this.time * 2 + b.id) * 0.6);
    const x = b.x * TILE, y = b.y * TILE + bob;
    // fishing, it lies with its rod over water: the bobber goes a tile and a half off the bow, or
    // off the stern if the bow points at land, or nearer in a narrow channel
    let face: number = b.facing, reach = 22;
    if (work && def.gear === 'line') {
      const wet = (dx: number) => isWater(g.world.at(Math.floor((x + dx) / TILE), Math.floor((y + 4) / TILE)));
      const pick = [[face, 22], [-face, 22], [face, 12], [-face, 12]].find(([f, d]) => wet(f * d));
      if (pick) [face, reach] = pick;
    }
    if (moving) {
      // a wake: two pale lines opening behind it
      ctx.fillStyle = rgba(C.bone, 0.7);
      for (let i = 1; i <= 4; i++) {
        const bx = x - b.facing * (s.w / 2 + i * 2);
        ctx.fillRect(Math.round(bx), Math.round(y - i), 1, 1);
        ctx.fillRect(Math.round(bx), Math.round(y + 2 + i), 1, 1);
      }
    }
    if (picked) {
      ctx.fillStyle = rgba(C.gold, 0.6 + 0.4 * Math.sin(this.time * 6));
      const w = s.w + 4, h = 6;
      for (let i = 0; i < w; i += 2) { ctx.fillRect(Math.round(x - w / 2 + i), Math.round(y + 3), 1, 1); ctx.fillRect(Math.round(x - w / 2 + i + 1), Math.round(y + 3 + h), 1, 1); }
    }
    drawSprite(ctx, s, f, x, y, face < 0);
    if (work && def.gear === 'line') {
      // the line from the rod tip to the bobber
      const [tx, ty] = ROD_TIP[b.kind];
      const x0 = x + face * tx, y0 = y + ty;
      const x1 = x + face * reach, y1 = y + 4;
      ctx.fillStyle = rgba(C.bone, 0.75);
      for (let i = 0; i <= 10; i++) { const k = i / 10; ctx.fillRect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * 3), 1, 1); }
      drawSprite(ctx, sheet('bobber'), Math.floor(this.time * 1.5) % 2, x1, y1 + 1);
    }
    if (work && def.gear === 'net') {
      // the net's ripple behind it
      ctx.fillStyle = rgba(C.bone, 0.6);
      const nx = x - b.facing * (s.w / 2 + 6);
      for (let i = -3; i <= 3; i++) ctx.fillRect(Math.round(nx + Math.sin(this.time * 3 + i) * 1.5), Math.round(y + 2 + i * 1.5), 2, 1);
    }
    if (b.state === 'dock' && b.wait && Math.floor(this.time * 3) % 2 === 0) {
      ctx.fillStyle = C.amber;
      const ex = Math.round(x), ey = Math.round(y - s.ay - 9);
      ctx.fillRect(ex, ey, 2, 5); ctx.fillRect(ex, ey + 6, 2, 2);
    }
  }

  private defender(g: Game, d: Defender) {
    const ctx = this.ctx;
    const def = DEFENDERS[d.species];
    const cx = (d.x + 0.5) * TILE, cy = (d.y + 0.5) * TILE;
    let s: SpriteSheet = sheet(d.species);
    // a pufferfish swells when a thief is near
    if (def.kind === 'poison') {
      const near = g.thieves.some((t) => t.mode !== 'dead' && t.mode !== 'gone' && Math.hypot(t.x - d.x - 0.5, t.y - d.y - 0.5) < 2.5);
      if (near) s = sheet('puffer_big');
    }
    // being clawed or worried, it shakes; a clawed fish also blinks white (about to be eaten)
    const clawed = this.clawed.has(d.id);
    const worried = d.worrier !== 0;
    if (def.place === 'water') {
      // a ripple ring so the fish reads against any water (red while it is clawed)
      const r = 6 + Math.floor((this.time * 2 + d.id) % 2);
      ctx.fillStyle = rgba(clawed ? C.red : C.ice, clawed ? 0.9 : 0.55);
      ctx.fillRect(cx - r, cy + 3, r * 2, 1);
    }
    const bob = clawed || worried ? Math.round(Math.sin(this.time * 30)) : 0;
    // a terrapin under attack pulls into its shell (frame 0)
    // a terrapin rests head out (frame 1) and tucks in (frame 0) only while it is worried
    const f = def.kind === 'shell' ? (worried ? 0 : Math.min(1, s.frames.length - 1)) : frameAt(s, this.time + d.id * 0.37);
    const img = clawed && Math.floor(this.time * 8) % 2 ? this.white(s) : s;
    drawSprite(ctx, img, f, cx + bob, cy + (def.place === 'water' ? 2 : 4), d.species === 'turtle' ? false : (d.id % 2 === 0));
    if (def.kind === 'zap' && d.acted < 0.12) {
      ctx.fillStyle = C.gold;
      ctx.fillRect(cx - 1, cy - 6, 2, 2);
    }
  }

  private thief(g: Game, t: Thief, lift = 0) {
    const ctx = this.ctx;
    const s = sheet(t.kind);
    const stunned = t.stunT > 0;
    const moving = !stunned && (t.mode === 'road' || t.mode === 'toLure' || t.mode === 'exit');
    const eating = !stunned && (t.mode === 'eat' || t.mode === 'worry');
    const f = moving ? frameAt(s, this.time + t.id * 0.21) : eating ? Math.floor(this.time * 5) % s.frames.length : 0;
    // eating bobs; retching up a pufferfish shudders
    const bob = eating ? Math.round(Math.abs(Math.sin(this.time * 9))) : 0;
    const shake = stunned ? Math.round(Math.sin(this.time * 40)) : 0;
    const img = t.hitT < 0.05 ? this.white(s) : s;
    drawSprite(ctx, img, f, t.x * TILE + shake, t.y * TILE + 4 - lift + bob, t.facing < 0);
    if (t.carrying) drawSprite(ctx, sheet('crate'), 0, t.x * TILE - t.facing * 3, t.y * TILE - s.ay + 6 - lift);
    // the pufferfish it snatched, blown up in its mouth
    if (stunned) {
      const [fx, fy] = MOUTH[t.kind];
      drawSprite(ctx, sheet('puffer_gulp'), 0, t.x * TILE + shake + t.facing * fx, t.y * TILE + 4 - lift + fy);
    }
    // poisoned: sick green bubbles rise off it
    if (t.poisonT > 0) {
      ctx.fillStyle = C.lime;
      for (let i = 0; i < 2; i++) {
        const k = (this.time * 1.5 + i * 0.5 + t.id * 0.13) % 1;
        ctx.fillRect(Math.round(t.x * TILE + (i ? 3 : -3)), Math.round(t.y * TILE - s.ay + 2 - k * 6 - lift), 1, 1);
      }
    }
    void g;
  }

  /** A white silhouette of a sheet (the hit flash), made once per sheet. */
  private white(s: SpriteSheet): SpriteSheet {
    let w = this.flash.get(s);
    if (w) return w;
    const frames = s.frames.map((fr) => {
      const c = document.createElement('canvas');
      c.width = fr.width;
      c.height = fr.height;
      const x = c.getContext('2d')!;
      x.drawImage(fr, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = C.bone;
      x.fillRect(0, 0, c.width, c.height);
      return c;
    });
    w = { ...s, frames };
    this.flash.set(s, w);
    return w;
  }

  private angler(g: Game) {
    const s = sheet('angler');
    const a = g.world.angler;
    drawSprite(this.ctx, s, g.fishing ? 1 : 0, a.x * TILE, a.y * TILE + 6);
  }

  /** The rod's line to the bobber, sagging a little; the bobber dips while the line is fishing. */
  private line(g: Game) {
    if (!g.fishing) return;
    const ctx = this.ctx;
    const a = g.world.angler;
    const x0 = a.x * TILE + 5, y0 = a.y * TILE - 8;
    const x1 = (g.fishing.x + 0.5) * TILE, y1 = (g.fishing.y + 0.5) * TILE;
    const n = Math.max(8, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 2));
    ctx.fillStyle = rgba(C.bone, 0.75);
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const sag = Math.sin(k * Math.PI) * 6;
      ctx.fillRect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k + sag), 1, 1);
    }
    const blocked = !!g.fishBlock();
    const bs = sheet('bobber');
    drawSprite(ctx, bs, blocked ? 0 : Math.floor(this.time * 1.5) % 2, x1, y1 + 2);
  }

  private effects(dt: number) {
    const ctx = this.ctx;
    for (const e of this.fx) {
      e.t += dt;
      const k = e.t / e.life;
      switch (e.kind) {
        case 'zap': {
          // a thin jagged bolt from the ray to its target, gold so the target stays readable
          ctx.fillStyle = e.v ? C.amber : C.gold;
          const x0 = e.x * TILE, y0 = e.y * TILE, x1 = e.x2 * TILE, y1 = e.y2 * TILE - 4;
          const n = Math.max(4, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 3));
          for (let i = 0; i <= n; i++) {
            const j = i === 0 || i === n ? 0 : (hash2(i, Math.floor(this.time * 30), 5) - 0.5) * 4;
            ctx.fillRect(Math.round(x0 + (x1 - x0) * (i / n) + j), Math.round(y0 + (y1 - y0) * (i / n) + j), 1, 1);
          }
          break;
        }
        case 'claw': {
          // three red scratches over a fish being clawed
          ctx.fillStyle = rgba(C.red, 1 - k);
          for (let i = 0; i < 3; i++) {
            const x = Math.round(e.x * TILE) - 4 + i * 3, y = Math.round(e.y * TILE) - 6 + Math.round(k * 3);
            ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + 2, y + 2, 1, 1);
          }
          break;
        }
        case 'splash': {
          ctx.fillStyle = rgba(C.bone, 1 - k);
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI * (0.15 + 0.7 * (i / 5));
            const d = 2 + k * 9;
            ctx.fillRect(Math.round(e.x * TILE + Math.cos(a) * d), Math.round(e.y * TILE + Math.sin(a) * d + k * k * 12), 1, 2);
          }
          break;
        }
        case 'leap': {
          // the fish arcs from the water to the angler (into the live well)
          const px = e.x + (e.x2 - e.x) * k, py = e.y + (e.y2 - e.y) * k - Math.sin(k * Math.PI) * 2;
          drawSprite(ctx, sheet(e.id ?? 'puffer'), 0, px * TILE, py * TILE);
          break;
        }
        case 'ring': {
          ctx.fillStyle = rgba(e.v === 2 ? C.amber : e.v ? C.rose : C.ice, 1 - k);
          const r = 2 + k * 8;
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            ctx.fillRect(Math.round(e.x * TILE + Math.cos(a) * r), Math.round(e.y * TILE + Math.sin(a) * r * 0.6), 1, 1);
          }
          break;
        }
        case 'poof': {
          ctx.fillStyle = rgba(e.v ? C.red : C.mist, 1 - k);
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const d = 3 + k * 8;
            ctx.fillRect(Math.round(e.x * TILE + Math.cos(a) * d), Math.round(e.y * TILE + Math.sin(a) * d - k * 6), 2, 2);
          }
          break;
        }
        case 'bang': {
          // "!" over a thief that just left the road for a lure
          ctx.fillStyle = C.rose;
          const x = Math.round(e.x * TILE), y = Math.round(e.y * TILE) - 18 - Math.round(k * 4);
          ctx.fillRect(x, y, 2, 5); ctx.fillRect(x, y + 6, 2, 2);
          break;
        }
      }
    }
    let j = 0;
    for (const e of this.fx) if (e.t < e.life) this.fx[j++] = e;
    this.fx.length = j;
  }

  /** HP bars: thieves when hurt, defenders when hurt (red and blinking when about to be lost). */
  private bars(g: Game) {
    for (const t of g.thieves) {
      if (t.mode === 'dead' || t.mode === 'gone') continue;
      // a gull in the air carries its bars up with it; one sitting on the water has them on it
      const lift = THIEVES[t.kind].flies && t.mode !== 'mob' && t.mode !== 'eat' && t.stunT <= 0 ? 10 : 0;
      const s = sheet(t.kind);
      if (t.hp < t.maxHp) this.bar(t.x * TILE, t.y * TILE - s.ay + 1 - lift, Math.min(16, s.w - 2), t.hp / t.maxHp, C.ember);
      if (t.mode === 'eat') this.bar(t.x * TILE, t.y * TILE - s.ay - 2 - lift, 10, t.eatLeft / (t.eatFull || 1), C.rose);
      if (t.mode === 'worry') this.bar(t.x * TILE, t.y * TILE - s.ay - 2 - lift, 10, t.worryLeft / (TURTLE.worry[t.kind] ?? 1), C.shell);
    }
    // a fish's bars sit on its side away from the road, so they never cover a thief walking past
    const w = g.world;
    for (const d of g.defenders) {
      if (d.hp >= d.maxHp) continue;
      const near = w.path[w.roadNear[w.idx(d.x, d.y)]];
      const above = DEFENDERS[d.species].place === 'water' && near.y > d.y;
      const y = above ? d.y * TILE - 2 : (d.y + 1) * TILE + 1;
      const frac = d.hp / d.maxHp;
      const danger = frac < 0.35;
      if (!danger || Math.floor(this.time * 6) % 2 === 0) this.bar((d.x + 0.5) * TILE, y, 12, frac, danger ? C.red : C.lime);
    }
  }

  private bar(cx: number, y: number, w: number, frac: number, col: string) {
    const ctx = this.ctx;
    const x = Math.round(cx - w / 2), yy = Math.round(y);
    ctx.fillStyle = C.ink;
    ctx.fillRect(x - 1, yy - 1, w + 2, 3);
    ctx.fillStyle = col;
    ctx.fillRect(x, yy, Math.max(0, Math.round(w * Math.max(0, Math.min(1, frac)))), 1);
  }
}
