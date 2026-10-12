// A school swimming a loop. The leader runs round an ellipse at the species' cruising speed;
// every fish keeps its own place behind and beside the leader and its own depth inside the band,
// with a slow wander so the school breathes instead of moving as one block, and never closer to
// the bed than CLEARANCE (fish don't swim through the bottom). Deterministic: the
// same seed and time give the same school. Positions are struct-of-arrays for the renderer.
import { Rng } from '../../engine/rng';
import { BANDS } from '../../data/lake';
import { Lake, depthAt } from '../lake';
import type { SchoolDef } from '../../data/species';

export interface School {
  def: SchoolDef;
  n: number;
  /** position: x east, y south, d depth below the surface (m) */
  x: Float32Array;
  y: Float32Array;
  d: Float32Array;
  /** swimming direction, radians in the x-y plane (0 = east) */
  heading: Float32Array;
  /** each fish's tail-beat phase offset (radians), for the renderer's wobble */
  phase: Float32Array;
  /** seconds left drawn: set by the sonar, 0 = unseen */
  seen: Float32Array;
  /** how many have seen > 0 this tick */
  seenCount: number;
  // per-fish constants
  along: Float32Array;
  side: Float32Array;
  depth: Float32Array;
  wf: Float32Array;
  wp: Float32Array;
}

/** the closest a fish comes to the bed (m) */
export const CLEARANCE = 0.5;

export function newSchool(def: SchoolDef, n: number, rng: Rng, lake: Lake): School {
  const f = () => new Float32Array(n);
  const s: School = {
    def, n, x: f(), y: f(), d: f(), heading: f(), phase: f(), seen: f(), seenCount: 0,
    along: f(), side: f(), depth: f(), wf: f(), wp: f(),
  };
  const band = BANDS.find((b) => b.id === def.band)!;
  const hold = band.hold > 0 ? band.hold : band.top + 1;
  // a fish never starts outside its band, whatever its spread
  const lo = band.top + 0.25, hi = Math.min(band.bottom, 99) - 0.25;
  for (let i = 0; i < n; i++) {
    // denser at the front of the school than at its tail
    s.along[i] = Math.pow(rng.next(), 0.8) * def.spreadAlong * Math.PI * 2;
    s.side[i] = (rng.next() * 2 - 1) * def.spreadSide;
    s.depth[i] = Math.max(lo, Math.min(hi, hold + (rng.next() * 2 - 1) * def.spreadDepth));
    s.wf[i] = rng.range(0.15, 0.45);
    s.wp[i] = rng.range(0, Math.PI * 2);
    s.phase[i] = rng.range(0, Math.PI * 2);
  }
  schoolTick(s, lake, 0, 0);
  return s;
}

/** Place every fish for simulated time t (s). */
export function schoolTick(s: School, lake: Lake, t: number, _dt: number) {
  const { cx, cy, rx, ry } = s.def.loop;
  // angular speed so the leader's average ground speed is def.speed
  const meanR = Math.sqrt((rx * rx + ry * ry) / 2);
  const lead = (t * s.def.speed) / meanR;
  // swimming the loop backwards turns every heading round
  const back = s.def.speed < 0 ? Math.PI : 0;
  for (let i = 0; i < s.n; i++) {
    const w = t * s.wf[i] + s.wp[i];
    const u = lead - Math.sign(s.def.speed) * s.along[i] + 0.04 * Math.sin(w * 0.7);
    const cu = Math.cos(u), su = Math.sin(u);
    // tangent of the ellipse (direction of travel) and its normal
    let tx = -rx * su, ty = ry * cu;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const off = s.side[i] + 0.6 * Math.sin(w);
    s.x[i] = cx + rx * cu + ty * off;
    s.y[i] = cy + ry * su - tx * off;
    const bed = depthAt(lake, s.x[i], s.y[i]);
    s.d[i] = Math.max(0.2, Math.min(s.depth[i] + 0.15 * Math.sin(w * 1.3 + 1), bed - CLEARANCE));
    // the heading follows the path, turning a little as the fish weaves across it
    s.heading[i] = Math.atan2(ty, tx) + back + 0.18 * Math.cos(w);
  }
}
