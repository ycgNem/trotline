// The orbit camera (THREEJS-NOTES.md rule 2): a narrow-FOV perspective camera orbiting a target
// on the lake. Drag to orbit, right-drag to pan (kept over the lake), wheel to dolly (clamped).
// Four named presets give fixed angles for "does this look right". The underwater preset sits
// below the surface at the mid band and orbits in a flatter range.
import * as THREE from 'three';

export const FOV = 25;

export interface Pose {
  /** the point orbited, in three coordinates (x, y up, z = sim y) */
  target: [number, number, number];
  /** degrees: 0 = camera south of the target looking north; positive turns the camera east */
  yaw: number;
  /** degrees above the target's horizon (negative = from below) */
  pitch: number;
  /** meters from the target */
  dist: number;
}

export type PresetName = 'overview' | 'cove' | 'dock' | 'underwater-mid';

/** Numbers in DECISIONS.md (2026-10-12, camera). */
export const PRESETS: Record<PresetName, Pose> = {
  // the whole 60 x 40 m lake, north up
  overview: { target: [0, -1, -1.5], yaw: 0, pitch: 55, dist: 86 },
  // the spawning cove from the south-east, low enough to see into the water
  cove: { target: [-17, -0.5, 9], yaw: 32, pitch: 48, dist: 36 },
  // the three rod stations from the water, lines and band rings in view
  dock: { target: [1, -1.5, -14.5], yaw: -16, pitch: 30, dist: 33 },
  // under the surface at the mid band, looking across the school's loop at the bluff
  'underwater-mid': { target: [5, -3, -5], yaw: 70, pitch: 4, dist: 14 },
};

export const LIMITS = {
  above: { pitchMin: 22, pitchMax: 80, distMin: 10, distMax: 120 },
  under: { pitchMin: -25, pitchMax: 18, distMin: 5, distMax: 26 },
  /** the target is kept over the lake (three x, z) */
  x: [-30, 30] as [number, number],
  z: [-20, 20] as [number, number],
};

export class OrbitRig {
  readonly camera: THREE.PerspectiveCamera;
  pose: Pose;
  private from: Pose | null = null;
  private to: Pose | null = null;
  private t = 1;
  preset: PresetName | 'free' = 'overview';
  /** underwater mode: flatter limits */
  under = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(FOV, aspect, 0.3, 900);
    this.pose = structuredClone(PRESETS.overview);
    this.apply();
  }

  setPreset(name: PresetName, instant = false) {
    this.preset = name;
    this.under = name === 'underwater-mid';
    const p = structuredClone(PRESETS[name]);
    if (instant) {
      this.pose = p;
      this.to = null;
      this.t = 1;
    } else {
      this.from = structuredClone(this.pose);
      this.to = p;
      this.t = 0;
    }
    this.apply();
  }

  /** Orbit by degrees, dolly by a factor, pan in meters along the view's ground axes. */
  nudge(dyaw: number, dpitch: number, zoom = 1, panRight = 0, panForward = 0) {
    if (this.to) {
      this.pose = this.to;
      this.to = null;
    }
    const L = this.under ? LIMITS.under : LIMITS.above;
    const p = this.pose;
    p.yaw += dyaw;
    p.pitch = Math.max(L.pitchMin, Math.min(L.pitchMax, p.pitch + dpitch));
    p.dist = Math.max(L.distMin, Math.min(L.distMax, p.dist * zoom));
    if (panRight || panForward) {
      const y = (p.yaw * Math.PI) / 180;
      // right of the view and forward (away from the camera) on the ground
      p.target[0] = Math.max(LIMITS.x[0], Math.min(LIMITS.x[1], p.target[0] + Math.cos(y) * panRight - Math.sin(y) * panForward));
      p.target[2] = Math.max(LIMITS.z[0], Math.min(LIMITS.z[1], p.target[2] - Math.sin(y) * panRight - Math.cos(y) * panForward));
    }
    if (dyaw || dpitch || zoom !== 1 || panRight || panForward) this.preset = 'free';
    this.apply();
  }

  update(dt: number) {
    if (!this.to || !this.from) return;
    this.t = Math.min(1, this.t + dt / 0.6);
    const k = this.t * this.t * (3 - 2 * this.t);
    const a = this.from, b = this.to;
    let dy = ((b.yaw - a.yaw + 540) % 360) - 180;
    this.pose = {
      target: [0, 1, 2].map((i) => a.target[i] + (b.target[i] - a.target[i]) * k) as [number, number, number],
      yaw: a.yaw + dy * k,
      pitch: a.pitch + (b.pitch - a.pitch) * k,
      dist: a.dist * Math.pow(b.dist / a.dist, k),
    };
    if (this.t >= 1) {
      this.pose = b;
      this.to = null;
    }
    this.apply();
  }

  private apply() {
    const p = this.pose;
    const y = (p.yaw * Math.PI) / 180, pi = (p.pitch * Math.PI) / 180;
    const [tx, ty, tz] = p.target;
    this.camera.position.set(tx + p.dist * Math.sin(y) * Math.cos(pi), ty + p.dist * Math.sin(pi), tz + p.dist * Math.cos(y) * Math.cos(pi));
    this.camera.lookAt(tx, ty, tz);
  }

  get underwater() {
    return this.camera.position.y < 0;
  }

  setAspect(a: number) {
    this.camera.aspect = a;
    this.camera.updateProjectionMatrix();
  }
}
