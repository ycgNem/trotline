// The app: one canvas, the fixed 60 Hz sim decoupled from the rAF renderer, the HUD drawn over the
// board with the IMGUI kit, the screens (title, play, end), the player's modes (fishing, deploying
// a fish, casting a lure), the lesson cards, sound and the autosave. window.__app is its debug
// handle for the e2e scripts.
import { GameLoop } from '../engine/loop';
import { Input } from '../engine/input';
import { Audio } from '../engine/audio/audio';
import { readSave, writeSave, deleteSave, store } from '../engine/save';
import { UI } from '../ui/ui';
import { Game, type Command } from '../sim/Game';
import { Bot, type Strategy } from '../sim/bot';
import { isWater, Tile } from '../sim/world';
import { Renderer, type Overlay } from '../render/renderer';
import { loadArt } from '../render/sprites';
import { TILE } from '../render/ground';
import { LESSONS, type Lesson } from '../data/lessons';
import { SPECIES, type SpeciesId } from '../data/species';
import { THIEVES } from '../data/thieves';
import { WAVES } from '../data/waves';
import { C } from '../data/palette';
import { BOATS, type BoatId } from '../data/boats';
import { SHORE } from '../data/shore';
import { Hud } from './hud';
import { textWidth, LINE_H } from '../ui/font';

export type Mode = { k: 'idle' } | { k: 'deploy'; slot: number } | { k: 'lure' } | { k: 'slick' } | { k: 'dig' } | { k: 'send'; boat: BoatId };
export type Screen = 'title' | 'play' | 'end';

export interface Floater { text: string; x: number; y: number; t: number; col: string }

const META_KEY = 'trotline_meta';

export class App {
  ctx: CanvasRenderingContext2D;
  input = new Input();
  ui = new UI();
  audio = new Audio();
  renderer: Renderer;
  loop: GameLoop;
  hud: Hud;
  game: Game;
  bot: Bot | null = null;
  screen: Screen = 'title';
  mode: Mode = { k: 'idle' };
  selected: number | null = null;
  lesson: Lesson | null = null;
  lessonQueue: Lesson[] = [];
  seen = new Set<string>();
  paused = false;
  speed = 1;
  showHud = true;
  help = false;
  /** the build card (boats, the rod, the worm bed, canals) is open: the game waits */
  build = false;
  /** the boat picked in the fleet panel or on the board */
  boat: BoatId | null = null;
  debug = false;
  floaters: Floater[] = [];
  toast: { text: string; t: number; life: number } | null = null;
  /** thief kinds this run has met (the wave toast explains a new one once) */
  private met = new Set<string>();
  hover: { x: number; y: number } | null = null;
  uiScale = 2;
  ready = false;
  /** frozen by a test: no ticks run until resume() */
  frozen = false;
  private dpr = 1;

  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.renderer = new Renderer(this.ctx);
    this.hud = new Hud(this);
    this.game = new Game(this.newSeed());
    this.loop = new GameLoop(() => this.tick(), (dt) => this.frame(dt));
    this.ui.sfx = (id) => this.audio.sfx(id);
    this.loadMeta();
  }

  async start() {
    this.input.attach(this.canvas);
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('resize', () => this.resize());
    this.resize();
    await loadArt();
    const q = new URLSearchParams(location.search);
    if (q.has('play')) this.newRun(Number(q.get('seed')) || undefined);
    this.loop.start();
    this.ready = true;
  }

  newSeed() {
    return (Date.now() % 1_000_000) + 1;
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const w = Math.floor(window.innerWidth * this.dpr), h = Math.floor(window.innerHeight * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.uiScale = Math.max(1, Math.min(4, Math.floor(Math.min(w / 512, h / 300))));
    this.renderer.resize(w, h, this.game.world.w, this.game.world.h);
  }

  // ---------------------------------------------------------------- runs

  newRun(seed = this.newSeed()) {
    this.game = new Game(seed);
    this.screen = 'play';
    this.mode = { k: 'idle' };
    this.selected = null;
    this.floaters = [];
    this.toast = null;
    this.met.clear();
    this.renderer.fx = [];
    this.paused = false;
    this.lesson = null;
    this.lessonQueue = [];
    this.build = false;
    this.boat = null;
    this.game.events.drain();
    this.save();
  }

  continueRun(): boolean {
    const d = readSave(1);
    if (!d || !Array.isArray(d.log)) return false;
    this.game = Game.replay(d.seed, d.log as { t: number; c: Command }[], Number(d.tick) || 0);
    // the kinds of thief already met this run, so a continued run doesn't introduce them again
    this.met = new Set(WAVES.slice(0, this.game.wave).flatMap((w) => w.groups.map(([id]) => id)));
    this.screen = this.game.over ? 'end' : 'play';
    this.mode = { k: 'idle' };
    this.selected = null;
    this.build = false;
    this.boat = null;
    return true;
  }

  hasSave() {
    const d = readSave(1);
    return !!d && Array.isArray(d.log);
  }

  save() {
    if (this.game.over) deleteSave(1);
    else writeSave(1, this.game.snapshot());
  }

  private loadMeta() {
    try {
      const m = JSON.parse(store()?.getItem(META_KEY) ?? '{}');
      for (const s of m.seen ?? []) this.seen.add(s);
      this.audio.muted = !!m.muted;
    } catch { /* a bad meta save just means the lessons show again */ }
  }

  private saveMeta() {
    try { store()?.setItem(META_KEY, JSON.stringify({ seen: [...this.seen], muted: this.audio.muted })); } catch { /* private window */ }
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
    this.audio.applySettings(this.audio.vol);
    this.saveMeta();
    this.say(this.audio.muted ? 'Sound off (M).' : 'Sound on (M).');
  }

  // ---------------------------------------------------------------- the loop

  private tick() {
    if (this.screen !== 'play' || this.paused || this.lesson || this.help || this.build || this.frozen) return;
    for (let i = 0; i < this.speed; i++) {
      if (this.bot && this.game.tick % 10 === 0) this.bot.think();
      this.game.step();
      if (this.game.over) break;
    }
  }

  private frame(dt: number) {
    if (this.canvas.width !== Math.floor(window.innerWidth * (window.devicePixelRatio || 1))) this.resize();
    this.events();
    this.keys();
    const m = this.input.mouse;
    const k = this.canvas.width / (this.canvas.clientWidth || this.canvas.width);
    const t = this.renderer.screenToTile(m.x * k, m.y * k);
    // the HUD the last frame drew, tested at where the mouse is now (a click straight after a
    // HUD click must still reach the board)
    const overHud = this.ui.blockedAt(Math.floor((m.x * k) / this.uiScale), Math.floor((m.y * k) / this.uiScale));
    this.hover = this.game.world.inb(t.x, t.y) && !overHud && this.screen === 'play' ? t : null;
    const ov: Overlay = {
      hover: this.hover,
      deploy: this.mode.k === 'deploy' ? this.game.liveWell[this.mode.slot] : null,
      lure: this.mode.k === 'lure',
      range: this.mode.k === 'idle' && !!this.hover && isWater(this.game.world.at(this.hover.x, this.hover.y)),
      slick: this.mode.k === 'slick',
      dig: this.mode.k === 'dig',
      send: this.mode.k === 'send' ? this.mode.boat : null,
      boat: this.boat,
    };
    this.renderer.draw(this.game, this.paused || this.lesson || this.help || this.build ? 0 : dt, ov);
    this.ui.begin(this.ctx, this.input, this.uiScale, dt, false);
    if (this.showHud || this.screen !== 'play') this.hud.draw(dt);
    if (this.screen === 'play' && !this.lesson && !this.help && !this.build) this.worldClick();
    this.ui.end();
    this.input.endFrame();
    this.audio.update(0.3);
  }

  /** Drain the sim's events into effects, sounds, floaters, lessons and the autosave. */
  private events() {
    const g = this.game;
    const evs = g.events.drain();
    this.renderer.consume(evs, g);
    for (const e of evs) {
      switch (e.type) {
        case 'catch': this.audio.sfx('catch'); this.float('+' + SPECIES[e.id as SpeciesId].name, g.world.angler.x, g.world.angler.y - 1, C.ice); break;
        case 'cast': this.audio.sfx('cast'); break;
        case 'zap': if (!e.value) this.audio.sfx('zap', 0.6); break;
        // no word for a snatch: the puffer in the thief's mouth and the green bubbles say it
        case 'snatch': this.audio.sfx('snatch'); break;
        case 'swallow': this.audio.sfx('gulp'); this.float('Gulp!', e.x!, e.y! - 1, C.rose); break;
        case 'grab': this.audio.sfx('claw', 0.7); break;
        case 'mob': this.audio.sfx('squabble', 0.6); break;
        // at a zoom below the HUD's scale a +$ over every kill is noise (the top bar counts it)
        case 'kill': this.audio.sfx('kill'); if (this.renderer.cam.zoom >= this.uiScale) this.float('+$' + e.value, e.x!, e.y! - 1, C.gold); break;
        case 'steal': this.audio.sfx('steal'); this.float('-' + e.value + ' crate' + (e.value === 1 ? '' : 's'), e.x!, e.y! - 1, C.ember); break;
        case 'recover': this.float('+' + e.value + ' back', e.x!, e.y! - 1.6, C.lime); break;
        case 'escape': this.float(e.value + ' lost', e.x!, e.y! - 1, C.red); break;
        // a boat set to sell sells at the dock as it lands
        case 'sell': this.audio.sfx('coin', e.d ? 0.5 : 1); this.float('+$' + e.value, e.d ? e.x! : g.world.angler.x, (e.d ? e.y! : g.world.angler.y) - 1, C.gold); break;
        case 'deploy': this.audio.sfx('splash', 0.7); break;
        case 'lure': this.audio.sfx('lure'); break;
        // a boat buying its own bait at the dock makes no sound (the fleet panel says it); a boat
        // bought is picked, so its controls show
        case 'buy': if (!e.d) this.audio.sfx('coin'); if (e.id && e.id in BOATS) this.boat = e.id as BoatId; break;
        case 'waveStart': this.audio.sfx('wave'); this.save(); this.waveToast(e.value ?? g.wave); break;
        case 'waveEnd': this.save(); break;
        case 'won': this.audio.sfx('win'); this.endRun(); break;
        case 'lost': this.audio.sfx('lose'); this.endRun(); break;
        case 'land': this.audio.sfx('catch', 0.5); this.float('+' + SPECIES[e.id as SpeciesId].name, g.world.angler.x, g.world.angler.y - 1, C.ice); break;
        case 'boatCatch': this.audio.sfx('splash', 0.25); break;
        case 'slick': this.audio.sfx('slick'); break;
        case 'digOrder': this.audio.sfx('dig', 0.5); break;
        case 'dug': this.audio.sfx('splash', 0.5); break;
        case 'chumIn': this.float('+' + e.value + ' chum', g.world.angler.x, g.world.angler.y - 1, C.amber); break;
        case 'send': this.audio.sfx('click'); break;
        case 'defenderLost': this.float(e.id === 'turtle' ? 'Shell cracked' : SPECIES[e.id as SpeciesId].name + ' eaten', e.x!, e.y! - 1, C.red); break;
      }
      const l = LESSONS.find((q) => q.on === e.type);
      if (l && !this.seen.has(l.on) && !this.bot) {
        this.seen.add(l.on);
        this.saveMeta();
        this.lessonQueue.push(l);
      }
    }
    if (!this.lesson && this.lessonQueue.length) this.lesson = this.lessonQueue.shift()!;
    if (this.game.over && this.screen === 'play') this.endRun();
  }

  /** "Wave 3: 5 gulls." plus, the first time a kind shows up this run, what it does. */
  private waveToast(n: number) {
    const w = WAVES[n - 1];
    if (!w) return;
    const who = w.groups.map(([id, n]) => `${n} ${THIEVES[id].name.toLowerCase()}${n > 1 ? 's' : ''}`).join(', ');
    const fresh = w.groups.map(([id]) => id).filter((id) => !this.met.has(id));
    for (const id of fresh) this.met.add(id);
    const notes = n > 1 ? fresh.map((id) => `First ${THIEVES[id].name.toLowerCase()}: ${THIEVES[id].note[0].toLowerCase()}${THIEVES[id].note.slice(1)}`) : [];
    this.say(`Wave ${n}: ${who}.` + (notes.length ? ' ' + notes.join(' ') : ''), notes.length ? 6 : 2.5);
  }

  private endRun() {
    this.screen = 'end';
    this.mode = { k: 'idle' };
    deleteSave(1);
  }

  /** A floating number over the board; one starting near another stacks above it. */
  float(text: string, x: number, y: number, col: string) {
    const k = this.uiScale, r = this.renderer;
    // a board drawn smaller than the HUD has no room for text over it (DESIGN.md §11): the sprites
    // show a snatch or a lost fish and the top bar counts the money; only a crate lost still
    // floats, at the smokehouse door, because that is where the run is lost
    if (r.cam.zoom < k && !/^-\d+ crate/.test(text)) return;
    // overlap is judged where the text is drawn, in HUD pixels: its width, its line, as it rises
    const box = (f: { text: string; x: number; y: number; t: number }) => {
      const p = r.toScreen(f.x, f.y);
      return { cx: p.x / k, top: p.y / k - f.t * 12, w: textWidth(f.text) };
    };
    const me = { text, x, y, t: 0 };
    const crosses = (f: Floater) => { const a = box(f), b = box(me); return Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 + 3; };
    const near = this.floaters.filter((f) => crosses(f) && Math.abs(box(f).top - box(me).top) < LINE_H * 3);
    // money near money adds up into one number instead of a tower of them
    const money = /^\+\$(\d+)$/.exec(text);
    if (money) {
      const m = near.find((f) => /^\+\$\d+$/.test(f.text));
      // (it keeps rising: a steady stream of bounties must not hold one number up forever)
      if (m) { m.text = '+$' + (Number(m.text.slice(2)) + Number(money[1])); return; }
    }
    if (near.length >= 3) return;
    // stack a line up (in tiles: a HUD line at this zoom) until it clears everything it crosses
    const step = (LINE_H + 1) * k / (r.cam.zoom * TILE);
    for (let i = 0; i < 4 && near.some((f) => Math.abs(box(f).top - box(me).top) < LINE_H + 1); i++) me.y -= step;
    this.floaters.push({ text, x: me.x, y: me.y, t: 0, col });
  }

  say(text: string, life = 2.5) {
    this.toast = { text, t: 0, life };
  }

  /** Give the sim a command; say why not if it can't. */
  act(c: Command): boolean {
    const r = this.game.act(c);
    if (!r.ok) {
      this.say(r.why ?? 'Can\'t do that.');
      this.audio.sfx('error');
    }
    return r.ok;
  }

  // ---------------------------------------------------------------- input

  private keys() {
    const i = this.input;
    if (i.wasPressed('debug')) this.debug = !this.debug;
    if (i.wasPressed('mute')) this.toggleMute();
    if (this.screen !== 'play') return;
    if (i.wasPressed('help')) { this.help = !this.help; this.build = false; }
    if (this.help) { if (i.wasPressed('cancel')) this.help = false; return; }
    if (i.wasPressed('build') && !this.lesson) this.build = !this.build;
    if (this.build) { if (i.wasPressed('cancel')) this.build = false; return; }
    if (this.lesson) return;
    if (i.wasPressed('pause')) this.paused = !this.paused;
    if (i.wasPressed('faster')) this.speed = this.speed >= 3 ? 1 : this.speed + 1;
    if (i.wasPressed('hud')) this.showHud = !this.showHud;
    if (i.wasPressed('cancel')) this.cancel();
    for (let s = 0; s < 6; s++) if (i.wasPressed(('slot' + (s + 1)) as 'slot1')) this.pick(s);
    if (i.wasPressed('sell')) this.sellSelected();
    if (i.wasPressed('deploy')) this.deploySelected();
    if (i.wasPressed('lure')) this.toggleLure();
    if (i.wasPressed('chum')) this.toggleSlick();
    if (i.wasPressed('dig')) this.toggleDig();
    if (i.wasPressed('callWave')) this.act({ k: 'call' });
    // camera: pan with the keys, zoom by whole steps
    const c = this.renderer.cam;
    const sp = 6 / c.zoom * 60 * (1 / 60) * TILE * 0.25;
    if (i.isDown('panLeft')) c.x -= sp;
    if (i.isDown('panRight')) c.x += sp;
    if (i.isDown('panUp')) c.y -= sp;
    if (i.isDown('panDown')) c.y += sp;
    if (i.wasPressed('zoomIn')) this.zoom(1);
    if (i.wasPressed('zoomOut')) this.zoom(-1);
    if (i.mouse.wheel && !this.ui.captured) this.zoom(-Math.sign(i.mouse.wheel));
    this.renderer.clampCam(this.game.world.w, this.game.world.h);
  }

  zoom(d: number) {
    const c = this.renderer.cam;
    c.zoom = Math.max(c.fitZoom, Math.min(c.fitZoom + 3, c.zoom + d));
    this.renderer.clampCam(this.game.world.w, this.game.world.h);
  }

  cancel() {
    if (this.mode.k === 'idle') this.boat = null;
    this.mode = { k: 'idle' };
  }

  toggleSlick() {
    if (this.mode.k === 'slick') { this.mode = { k: 'idle' }; return; }
    if (this.game.chum < 1) { this.say(`No chum. Buy a bucket ($${this.game.price('chum') ?? 0}), or run the trawler.`); return; }
    this.mode = { k: 'slick' };
  }

  toggleDig() {
    // no canals on a shore whose road already runs by the water (DESIGN.md §12)
    if (!SHORE.canals) { this.say('No canal would help on this shore: the road already runs by the water.'); return; }
    this.mode = this.mode.k === 'dig' ? { k: 'idle' } : { k: 'dig' };
    this.build = false;
  }

  /** Pick a boat (its controls show in the fleet panel), or drop the pick. */
  pickBoat(kind: BoatId | null) {
    this.boat = this.boat === kind ? null : kind;
    if (this.mode.k === 'send') this.mode = { k: 'idle' };
  }

  /** The boat under the mouse, if any (a boat is wider than a tile and sits up off its tile). */
  boatAt(): BoatId | null {
    const m = this.input.mouse;
    const k = this.canvas.width / (this.canvas.clientWidth || this.canvas.width);
    const p = this.renderer.screenToPoint(m.x * k, m.y * k);
    const b = this.game.boats.find((q) => Math.abs(q.x - p.x) < 0.9 && p.y > q.y - 0.9 && p.y < q.y + 0.4);
    return b?.kind ?? null;
  }

  /** Send a boat: the next click on the water is where it goes. */
  sendBoat(kind: BoatId) {
    this.boat = kind;
    this.mode = this.mode.k === 'send' && this.mode.boat === kind ? { k: 'idle' } : { k: 'send', boat: kind };
  }

  pick(slot: number) {
    if (!this.game.liveWell[slot]) { this.selected = null; return; }
    this.selected = this.selected === slot ? null : slot;
    // a fish picked takes the card slot a picked boat had
    if (this.selected !== null) { this.boat = null; if (this.mode.k === 'send') this.mode = { k: 'idle' }; }
    if (this.mode.k === 'deploy') this.mode = this.selected === null ? { k: 'idle' } : { k: 'deploy', slot: this.selected };
  }

  sellSelected() {
    if (this.selected === null) return;
    if (this.act({ k: 'sell', slot: this.selected })) { this.selected = null; this.mode = { k: 'idle' }; }
  }

  deploySelected() {
    if (this.selected === null || !this.game.liveWell[this.selected]) return;
    this.mode = this.mode.k === 'deploy' ? { k: 'idle' } : { k: 'deploy', slot: this.selected };
  }

  toggleLure() {
    if (this.mode.k === 'lure') { this.mode = { k: 'idle' }; return; }
    if (this.game.worms < 1) { this.say('No worms left. Buy a pack, or a worm bed.'); return; }
    this.mode = { k: 'lure' };
  }

  /** Clicks on the board: cast, deploy, lure. */
  private worldClick() {
    const m = this.input.mouse;
    if (this.ui.overUI) return;
    if (m.pressed[2]) { this.cancel(); this.selected = null; return; }
    if (!m.pressed[0] || !this.hover) return;
    const { x, y } = this.hover;
    const g = this.game;
    if (this.mode.k === 'deploy') {
      if (this.act({ k: 'deploy', slot: this.mode.slot, x, y })) { this.mode = { k: 'idle' }; this.selected = null; }
      return;
    }
    if (this.mode.k === 'lure') {
      if (this.act({ k: 'lure', x, y }) && (!this.input.shift || g.worms < 1)) this.mode = { k: 'idle' };
      return;
    }
    if (this.mode.k === 'slick') {
      if (this.act({ k: 'slick', x, y }) && (!this.input.shift || g.chum < 1)) this.mode = { k: 'idle' };
      return;
    }
    // digging stays on for the next tile: a canal is dug a tile at a time
    if (this.mode.k === 'dig') { this.act({ k: 'dig', x, y }); return; }
    if (this.mode.k === 'send') {
      if (this.act({ k: 'send', boat: this.mode.boat, x, y })) this.mode = { k: 'idle' };
      return;
    }
    // a click on a boat picks it
    const hit = this.boatAt();
    if (hit) { this.pickBoat(hit); return; }
    const t = g.world.at(x, y);
    if (isWater(t)) this.act({ k: 'cast', x, y });
    else if (t === Tile.Road && g.worms > 0 && g.canLure(x, y).ok) this.say('Press L (or the Lure button) to cast a worm on the road.');
  }

  // ---------------------------------------------------------------- the debug handle

  /** Stop ticking (a test drives the sim itself). */
  freeze() { this.frozen = true; }
  resume() { this.frozen = false; }
  /** Run n sim ticks now, with the bot thinking if one is set. */
  step(n: number) {
    for (let i = 0; i < n && !this.game.over; i++) {
      if (this.bot && this.game.tick % 10 === 0) this.bot.think();
      this.game.step();
    }
  }
  autoplay(strategy: Strategy | null, opts = {}) {
    this.bot = strategy ? new Bot(this.game, strategy, opts) : null;
  }
  dismissLesson() {
    this.lesson = null;
  }
  /** A lesson card by its event, for the screenshot scripts. */
  lessonFor(on: Lesson['on']) {
    return LESSONS.find((l) => l.on === on) ?? null;
  }
  stats() {
    const g = this.game;
    return { screen: this.screen, phase: g.phase, wave: g.wave, tick: g.tick, money: g.money, crates: g.crates, worms: g.worms, chum: g.chum, boats: g.boats.map((b) => `${b.kind}:${b.state}`), well: [...g.liveWell], defenders: g.defenders.length, thieves: g.thieves.filter((t) => t.mode !== 'dead' && t.mode !== 'gone').length, zoom: this.renderer.cam.zoom, uiScale: this.uiScale, lesson: this.lesson?.on ?? null };
  }
  /** Screen position (CSS pixels) of a tile's centre, for scripted clicks. */
  tileToCss(x: number, y: number) {
    const p = this.renderer.toScreen(x + 0.5, y + 0.5);
    const k = this.canvas.width / (this.canvas.clientWidth || this.canvas.width);
    return { x: p.x / k, y: p.y / k };
  }
  thiefName(id: string) {
    return THIEVES[id as keyof typeof THIEVES]?.name ?? id;
  }
}
