// The app: the engine loop driving the sim at 60 Hz and the view every frame, input to the
// camera and the toggles, the HUD on the overlay canvas, sound, and window.__app for the e2e
// harness (presets, the pixel pass, fish counts, a frozen deterministic frame, stats).
import { GameLoop } from '../engine/loop';
import { Input } from '../engine/input';
import { Audio } from '../engine/audio/audio';
import { Game } from '../sim/Game';
import { View } from '../render/view';
import { loadRigTemplate, RigTemplate } from '../render/rigs';
import type { PresetName } from '../render/camera';
import { UI } from '../ui/ui';
import { drawHud } from './hud';

const PRESET_KEYS: [Parameters<Input['wasPressed']>[0], PresetName][] = [
  ['presetOverview', 'overview'], ['presetCove', 'cove'], ['presetDock', 'dock'], ['presetUnder', 'underwater-mid'],
];

export class App {
  readonly input = new Input();
  readonly ui = new UI();
  readonly audio = new Audio();
  readonly view: View;
  readonly loop: GameLoop;
  game: Game;
  seed = 1;
  fishCount = 500;
  sonarOnly = true;
  hudOn = true;
  ready = false;
  rigSource: RigTemplate['source'] | null = null;
  private hudCtx: CanvasRenderingContext2D;
  private uiScale = 2;

  constructor(private canvas: HTMLCanvasElement, private hud: HTMLCanvasElement) {
    const params = new URLSearchParams(location.search);
    this.fishCount = Number(params.get('fish') ?? 500) || 500;
    this.seed = Number(params.get('seed') ?? 1) || 1;
    this.game = new Game({ seed: this.seed, fish: this.fishCount });
    this.view = new View(canvas);
    if (params.get('pixel') === '0') this.view.pixel = false;
    if (params.get('pixels') === 'int') this.view.pipeline.integer = true;
    this.hudCtx = hud.getContext('2d')!;
    this.input.attach(hud);
    this.ui.sfx = (id) => this.audio.sfx(id);
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    this.loop = new GameLoop(() => this.game.step(), (dt) => this.frame(dt));
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  async start() {
    const t = await loadRigTemplate(`${import.meta.env.BASE_URL}models/rigs.glb`);
    this.rigSource = t.source;
    this.view.build(this.game, t, Math.max(2000, this.fishCount));
    const preset = new URLSearchParams(location.search).get('cam') as PresetName | null;
    this.view.setPreset(preset ?? 'overview', true);
    this.loop.start();
    this.ready = true;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.view.resize(w, h);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.hud.width = Math.round(w * dpr);
    this.hud.height = Math.round(h * dpr);
    // the HUD's own pixel scale: about 360 UI lines tall (2x at 720p, 3x at 1080p)
    this.uiScale = Math.max(1, Math.round(this.hud.height / 360));
  }

  private controls(dt: number) {
    const inp = this.input, rig = this.view.rig;
    for (const [a, p] of PRESET_KEYS) if (inp.wasPressed(a)) {
      this.view.setPreset(p);
      this.audio.sfx('click');
    }
    if (inp.wasPressed('pixelPass')) this.view.pixel = !this.view.pixel;
    if (inp.wasPressed('hud')) this.hudOn = !this.hudOn;
    if (inp.wasPressed('sonarView')) this.sonarOnly = !this.sonarOnly;
    if (inp.wasPressed('pause')) this.loop.paused = !this.loop.paused;
    this.loop.speed = inp.isDown('faster') ? 8 : 1;
    // keyboard orbit
    const turn = 70 * dt;
    const kx = (inp.isDown('orbitRight') ? 1 : 0) - (inp.isDown('orbitLeft') ? 1 : 0);
    const ky = (inp.isDown('tiltUp') ? 1 : 0) - (inp.isDown('tiltDown') ? 1 : 0);
    const kz = (inp.isDown('zoomOut') ? 1 : 0) - (inp.isDown('zoomIn') ? 1 : 0);
    if (kx || ky || kz) rig.nudge(kx * turn, ky * turn * 0.6, Math.pow(1.6, kz * dt));
    // mouse: left drag orbits, right drag pans, the wheel dollies
    const m = inp.mouse;
    if (!this.ui.captured) {
      if (m.down[0] && (m.dx || m.dy)) rig.nudge(-m.dx * 0.3, m.dy * 0.25);
      if (m.down[2] && (m.dx || m.dy)) {
        const k = rig.pose.dist / 600;
        rig.nudge(0, 0, 1, -m.dx * k, m.dy * k);
      }
      if (m.wheel) rig.nudge(0, 0, Math.pow(1.12, m.wheel));
    }
    rig.update(dt);
  }

  private frame(dt: number) {
    this.controls(dt);
    for (const e of this.game.events.drain()) if (e.type === 'sonar_turn') this.audio.sfx('ping', 0.6);
    this.audio.update();
    this.view.sync(this.game, this.game.time, !this.sonarOnly);
    this.game.sonar.only = this.sonarOnly;
    this.view.render();
    this.drawHud(dt);
    this.input.endFrame();
  }

  private drawHud(dt: number) {
    this.ui.begin(this.hudCtx, this.input, this.uiScale, dt);
    if (this.hudOn) drawHud(this.ui, this.game, this.view, { fps: this.loop.fps, paused: this.loop.paused, sonarOnly: this.sonarOnly, showKeys: true });
    this.ui.end();
  }

  // ---------- for the e2e harness ----------

  setPreset(name: PresetName) {
    this.view.setPreset(name, true);
  }

  setPixel(on: boolean) {
    this.view.pixel = on;
  }

  setSonarOnly(on: boolean) {
    this.sonarOnly = on;
  }

  /** A first school of n fish (same seed, same time); grows its instanced mesh if needed. */
  setFishCount(n: number) {
    this.fishCount = n;
    const ticks = this.game.tick;
    this.game = new Game({ seed: this.seed, fish: n });
    for (let i = 0; i < ticks; i++) this.game.step();
    if (n > this.view.fish[0].capacity) this.view.setFishCapacity(this.game, 0, n);
  }

  /**
   * A deterministic frame: a fresh game from the seed stepped `ticks` times, the loop paused, the
   * view synced and drawn. Every animation reads sim time, so the same ticks give the same pixels.
   */
  freeze(ticks = 600) {
    this.game = new Game({ seed: this.seed, fish: this.fishCount });
    for (let i = 0; i < ticks; i++) this.game.step();
    this.loop.paused = true;
    this.game.sonar.only = this.sonarOnly;
    this.view.sync(this.game, this.game.time, !this.sonarOnly);
    this.view.render();
    this.drawHud(1 / 60);
  }

  resume() {
    this.loop.paused = false;
  }

  stats() {
    const g = this.game;
    return {
      fps: this.loop.fps, ...this.view.stats,
      fishSeen: g.schools.reduce((a, s) => a + s.seenCount, 0), fishTotal: g.schools.reduce((a, s) => a + s.n, 0),
      seenBy: Object.fromEntries(g.schools.map((s) => [s.def.species, s.seenCount])),
      drawn: this.view.fishDrawn, rig: this.rigSource, preset: this.view.rig.preset, integer: this.view.pipeline.integer,
    };
  }
}
