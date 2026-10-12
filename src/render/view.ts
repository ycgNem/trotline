// The 3D view: one WebGLRenderer, the lake scene, the orbit camera and the pixel pipeline. It
// reads the sim each frame (fish, sonar, clock) and never writes to it. Draw order: bed and
// contours, band rings, water (transparent, depthWrite off), fish (after the water, so its tint
// doesn't wash out their band glow; they write depth), sonar fans (additive).
import * as THREE from 'three';
import type { Game } from '../sim/Game';
import { C } from '../data/palette';
import { buildBed, buildContours, buildSkirt } from './lakebed';
import { buildWater } from './water';
import { FishView } from './fish';
import { RigsView, RigTemplate } from './rigs';
import { SonarView } from './sonar';
import { OrbitRig, PresetName } from './camera';
import { PixelPipeline } from './pixel';
import { Lights } from './light';
import { col } from './util';

export interface FrameStats {
  /** draw calls and triangles for the whole frame (both pixel-pass renders and the quads) */
  calls: number;
  triangles: number;
  /** the scene drawn once (the beauty render), which is what the budget is about */
  sceneCalls: number;
  sceneTriangles: number;
  internal: [number, number];
}

export class View {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly rig: OrbitRig;
  readonly pipeline: PixelPipeline;
  readonly lights: Lights;
  pixel = true;
  /** one per school, in the sim's order */
  fish: FishView[] = [];
  rigs: RigsView | null = null;
  sonar!: SonarView;
  private water!: ReturnType<typeof buildWater>;
  private underFog = new THREE.FogExp2(0x000000, 0.035);
  stats: FrameStats = { calls: 0, triangles: 0, sceneCalls: 0, sceneTriangles: 0, internal: [0, 0] };
  private cssW = 1;
  private cssH = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.info.autoReset = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.rig = new OrbitRig(16 / 9);
    this.lights = new Lights(this.scene);
    this.pipeline = new PixelPipeline(this.renderer, this.scene, this.rig.camera);
    this.underFog.color.copy(col(C.deep));
  }

  /** Build everything that depends on the game (the lake, the school, the stations). */
  build(g: Game, rigTemplate: RigTemplate, fishCapacity: number) {
    this.scene.add(buildBed(g.lake), buildSkirt(), buildContours(g.lake));
    this.water = buildWater(g.lake);
    this.scene.add(this.water.mesh);
    g.schools.forEach((s, i) => this.setFishCapacity(g, i, i === 0 ? fishCapacity : s.n));
    this.rigs = new RigsView(rigTemplate, g.stations);
    this.scene.add(this.rigs.group);
    this.sonar = new SonarView(g.sonar.def, g.sonar.cones);
    this.scene.add(this.sonar.group);
  }

  /** (Re)build school i's instanced mesh with room for n fish. */
  setFishCapacity(g: Game, i: number, n: number) {
    const old = this.fish[i];
    if (old) {
      this.scene.remove(old.mesh);
      old.dispose();
    }
    const s = g.schools[i];
    this.fish[i] = new FishView(s.def, Math.max(n, s.n));
    this.scene.add(this.fish[i].mesh);
  }

  /** fish drawn last frame, all schools */
  get fishDrawn() {
    return this.fish.reduce((a, f) => a + f.drawn, 0);
  }

  resize(cssW: number, cssH: number) {
    this.cssW = cssW;
    this.cssH = cssH;
    this.renderer.setSize(cssW, cssH, false);
    this.rig.setAspect(cssW / cssH);
    this.pipeline.setSize(cssW, cssH, this.renderer.getPixelRatio());
  }

  setPreset(name: PresetName, instant = false) {
    this.rig.setPreset(name, instant);
  }

  /** Read the sim. `time` drives every shader animation, so a frozen sim gives a frozen frame. */
  sync(g: Game, time: number, allFish: boolean) {
    this.lights.set(g.clock.minute);
    g.schools.forEach((s, i) => this.fish[i].sync(s, time, allFish, this.rig.pose.dist));
    this.sonar.sync(g.sonar.cones, time);
    const wu = this.water.mat.uniforms;
    wu.uTime.value = time;
    wu.uLight.value = this.lights.daylight;
  }

  render() {
    const under = this.rig.underwater;
    this.scene.fog = under ? this.underFog : null;
    this.scene.background = under ? this.underFog.color : this.lights.sky;
    const info = this.renderer.info;
    info.reset();
    if (this.pixel) {
      this.pipeline.render();
      this.stats.sceneCalls = this.pipeline.pass.beautyCalls;
      this.stats.sceneTriangles = this.pipeline.pass.beautyTriangles;
      this.stats.internal = this.pipeline.pass.internal;
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.rig.camera);
      this.stats.sceneCalls = info.render.calls;
      this.stats.sceneTriangles = info.render.triangles;
      const pr = this.renderer.getPixelRatio();
      this.stats.internal = [Math.round(this.cssW * pr), Math.round(this.cssH * pr)];
    }
    this.stats.calls = info.render.calls;
    this.stats.triangles = info.render.triangles;
  }

  /** Project a sim point to CSS pixels on the canvas (null when behind the camera). */
  project(x: number, y: number, d: number): { x: number; y: number } | null {
    const v = new THREE.Vector3(x, -d, y).project(this.rig.camera);
    if (v.z > 1) return null;
    return { x: ((v.x + 1) / 2) * this.cssW, y: ((1 - v.y) / 2) * this.cssH };
  }
}
