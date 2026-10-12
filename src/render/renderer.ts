// The world renderer: camera at an integer zoom, baked ground chunks and a baked props layer
// (the trees), the placement overlays, y-sorted sprites (the smokehouse, defenders, thieves, the
// angler), flying gulls above with ground shadows, and the effects the sim's events ask for.
// Reads the Game; never writes it.
import { C, rgba } from '../data/palette';
import type { Game, Thief, Defender } from '../sim/Game';
import { Tile, isWater } from '../sim/world';
import { THIEVES } from '../data/thieves';
import { DEFENDERS, RAY, TURTLE } from '../data/defenders';
import { BAIT } from '../data/bait';
import type { SpeciesId } from '../data/species';
import type { GameEvent } from '../engine/events';
import { Ground, TILE, CHUNK, hash2, isSlot } from './ground';
import { sheet, drawSprite, frameAt, type SpriteSheet } from './sprites';

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
}

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
        case 'spent': this.fx.push({ kind: 'fizzle', x, y, x2: 0, y2: 0, t: 0, life: 0.6, v: 0 }); break;
        case 'catch': this.fx.push({ kind: 'splash', x, y, x2: 0, y2: 0, t: 0, life: 0.6, v: 0, id: e.id }); this.fx.push({ kind: 'leap', x, y, x2: g.world.angler.x, y2: g.world.angler.y, t: 0, life: 0.7, v: 0, id: e.id }); break;
        case 'cast': this.fx.push({ kind: 'ring', x, y, x2: 0, y2: 0, t: 0, life: 0.5, v: 0 }); break;
        case 'lure': this.fx.push({ kind: 'ring', x, y, x2: 0, y2: 0, t: 0, life: 0.5, v: 1 }); break;
        case 'deploy': this.fx.push({ kind: 'splash', x, y, x2: 0, y2: 0, t: 0, life: 0.5, v: 0 }); break;
        case 'kill': this.fx.push({ kind: 'poof', x, y, x2: 0, y2: 0, t: 0, life: 0.5, v: 0, id: e.id }); break;
        case 'pulled': this.fx.push({ kind: 'bang', x, y, x2: 0, y2: 0, t: 0, life: 0.8, v: 0 }); break;
        case 'defenderLost': this.fx.push({ kind: 'poof', x, y, x2: 0, y2: 0, t: 0, life: 0.6, v: 1 }); break;
      }
    }
  }

  // ---------------------------------------------------------------- draw

  draw(g: Game, dt: number, ov: Overlay) {
    const ctx = this.ctx;
    const w = g.world;
    this.time += dt;
    if (!this.ground || this.ground.world !== w) this.ground = new Ground(w);
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
    for (const l of g.lures) {
      const s = sheet('worm');
      drawSprite(ctx, s, frameAt(s, this.time), (l.x + 0.5) * TILE, (l.y + 0.5) * TILE + 3);
      // the lure's food left, as a thin bar
      this.bar((l.x + 0.5) * TILE, (l.y + 1) * TILE - 1, 10, l.food / BAIT[l.bait].lureFood, C.rose);
    }

    // y-sorted sprites
    const items: { y: number; f: () => void }[] = [];
    const sh = sheet('smokehouse');
    items.push({ y: 15 + 2.95, f: () => { drawSprite(ctx, sh, 0, (35 + 1.5) * TILE, (15 + 3) * TILE); this.crates(g); } });
    for (const d of g.defenders) items.push({ y: d.y + 0.6, f: () => this.defender(g, d) });
    for (const t of g.thieves) if (t.mode !== 'dead' && t.mode !== 'gone' && !THIEVES[t.kind].flies) items.push({ y: t.y, f: () => this.thief(g, t) });
    items.push({ y: w.angler.y + 0.4, f: () => this.angler(g) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.f();

    // gulls fly above everything, with a shadow on the ground
    for (const t of g.thieves) if (t.mode !== 'dead' && t.mode !== 'gone' && THIEVES[t.kind].flies) {
      ctx.fillStyle = rgba(C.ink, 0.35);
      ctx.fillRect(Math.round(t.x * TILE) - 4, Math.round(t.y * TILE) + 2, 8, 2);
      this.thief(g, t, 10);
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
      for (let y = 0; y < w.h; y++)
        for (let x = 0; x < w.w; x++) {
          if (!g.canDeploy(ov.deploy, x, y).ok) continue;
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
      }
    }
    if (ov.lure) {
      for (const p of w.path) {
        if (!g.canLure(p.x, p.y).ok) continue;
        ctx.fillStyle = rgba(C.rose, 0.2 + 0.2 * pulse);
        ctx.fillRect(p.x * TILE, p.y * TILE, TILE, TILE);
      }
      if (ov.hover && g.canLure(ov.hover.x, ov.hover.y).ok) this.circle(ov.hover.x + 0.5, ov.hover.y + 0.5, 4, C.rose);
    }
    if (ov.range || ov.lure) this.circle(w.angler.x, w.angler.y, g.rod.range, C.bone);
    if (ov.hover && w.inb(ov.hover.x, ov.hover.y)) {
      ctx.fillStyle = rgba(C.bone, 0.5);
      const { x, y } = ov.hover;
      ctx.fillRect(x * TILE, y * TILE, TILE, 1); ctx.fillRect(x * TILE, y * TILE + 15, TILE, 1);
      ctx.fillRect(x * TILE, y * TILE, 1, TILE); ctx.fillRect(x * TILE + 15, y * TILE, 1, TILE);
    }
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
    const clawed = g.thieves.some((t) => t.grabbing === d.id);
    const worried = d.worrier !== 0;
    if (def.place === 'water') {
      // a ripple ring so the fish reads against any water (red while it is clawed)
      const r = 6 + Math.floor((this.time * 2 + d.id) % 2);
      ctx.fillStyle = rgba(clawed ? C.red : C.ice, clawed ? 0.9 : 0.55);
      ctx.fillRect(cx - r, cy + 3, r * 2, 1);
    }
    const bob = clawed || worried ? Math.round(Math.sin(this.time * 30)) : 0;
    // a terrapin under attack pulls into its shell (frame 0)
    const f = def.kind === 'shell' ? (worried ? 0 : frameAt(s, this.time + d.id)) : frameAt(s, this.time + d.id * 0.37);
    const img = clawed && Math.floor(this.time * 8) % 2 ? this.white(s) : s;
    const spent = def.kind === 'zap' && d.charge <= 0;
    if (spent) ctx.globalAlpha = 0.45;
    drawSprite(ctx, img, f, cx + bob, cy + (def.place === 'water' ? 2 : 4), d.species === 'turtle' ? false : (d.id % 2 === 0));
    ctx.globalAlpha = 1;
    if (def.kind === 'zap' && d.acted < 0.12 && !spent) {
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
    if (stunned) drawSprite(ctx, sheet('puffer_big'), 0, t.x * TILE + t.facing * Math.max(2, s.w / 2 - 3), t.y * TILE - 1 - lift);
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
        case 'fizzle': {
          // a spent ray: a few grey sparks sink back into the water
          ctx.fillStyle = rgba(C.steel, 1 - k);
          for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(e.x * TILE) - 4 + i * 3, Math.round(e.y * TILE) - 6 + Math.round(k * 5) + (i % 2) * 2, 1, 1);
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
          ctx.fillStyle = rgba(e.v ? C.rose : C.ice, 1 - k);
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
    this.fx = this.fx.filter((e) => e.t < e.life);
  }

  /** HP bars: thieves when hurt, defenders when hurt (red and blinking when about to be lost). */
  private bars(g: Game) {
    for (const t of g.thieves) {
      if (t.mode === 'dead' || t.mode === 'gone') continue;
      const lift = THIEVES[t.kind].flies ? 10 : 0;
      const s = sheet(t.kind);
      if (t.hp < t.maxHp) this.bar(t.x * TILE, t.y * TILE - s.ay + 1 - lift, Math.min(16, s.w - 2), t.hp / t.maxHp, C.ember);
      if (t.mode === 'eat') this.bar(t.x * TILE, t.y * TILE - s.ay - 2 - lift, 10, t.eatLeft / THIEVES[t.kind].eat, C.rose);
      if (t.mode === 'worry') this.bar(t.x * TILE, t.y * TILE - s.ay - 2 - lift, 10, t.worryLeft / (TURTLE.worry[t.kind] ?? 1), C.shell);
    }
    // defenders' bars sit under the sprite, so they never cover a thief on the road above it
    for (const d of g.defenders) {
      const y = (d.y + 1) * TILE + 1;
      const hurt = d.hp < d.maxHp;
      if (hurt) {
        const frac = d.hp / d.maxHp;
        const danger = frac < 0.35;
        if (!danger || Math.floor(this.time * 6) % 2 === 0) this.bar((d.x + 0.5) * TILE, y, 12, frac, danger ? C.red : C.lime);
      }
      // a ray's charge left, while a wave is on and it has spent some
      if (g.phase === 'wave' && DEFENDERS[d.species].kind === 'zap' && d.charge < RAY.charge) this.bar((d.x + 0.5) * TILE, y + (hurt ? 3 : 0), 12, d.charge / RAY.charge, C.gold);
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
