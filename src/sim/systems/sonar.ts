// Vision. Each sonar is a cone from a transducer just under the surface at a rod tip, tilted
// down and sweeping side to side. A fish inside any cone is seen; it stays drawn for a moment
// after it leaves (SONAR.linger) so cone edges don't flicker. Fish outside every cone are not
// drawn at all (PLAN.md pillar 2). Runs once per tick, after the fish have moved.
import type { EventQueue } from '../../engine/events';
import type { SONAR as SonarDef } from '../../data/rigs';
import type { Station } from '../Game';
import type { School } from './school';

export interface Cone {
  /** transducer position (x, y) and depth (m) */
  x: number;
  y: number;
  d: number;
  /** the direction it faces at rest (radians, x-y plane) */
  facing: number;
  /** where it points now (radians) */
  heading: number;
}

export interface Sonar {
  def: typeof SonarDef;
  cones: Cone[];
  /** false = every fish is drawn (the debug "all fish" view); vision still runs */
  only: boolean;
  /** half-periods of the sweep completed, for the turn event */
  turns: number;
}

export function newSonar(stations: Station[], def: typeof SonarDef): Sonar {
  return {
    def,
    cones: stations.map((s) => ({ x: s.hookX, y: s.hookY, d: def.apexDepth, facing: s.facing, heading: s.facing })),
    only: true,
    turns: -1,
  };
}

const RAD = Math.PI / 180;

/** The cone's axis as a unit vector in (x, y, depth) for a heading, tilted down by def.tiltDeg. */
export function coneAxis(def: typeof SonarDef, heading: number): [number, number, number] {
  const t = def.tiltDeg * RAD;
  return [Math.cos(t) * Math.cos(heading), Math.cos(t) * Math.sin(heading), Math.sin(t)];
}

/** Is the point (x, y, d) inside the cone? */
export function inCone(def: typeof SonarDef, c: Cone, x: number, y: number, d: number): boolean {
  const vx = x - c.x, vy = y - c.y, vd = d - c.d;
  const r2 = vx * vx + vy * vy + vd * vd;
  if (r2 > def.range * def.range || r2 < 1e-6) return false;
  const [ax, ay, ad] = coneAxis(def, c.heading);
  const dot = vx * ax + vy * ay + vd * ad;
  return dot > 0 && dot * dot >= r2 * Math.cos(def.halfAngleDeg * RAD) ** 2;
}

export function sweepHeading(def: typeof SonarDef, facing: number, t: number): number {
  return facing + def.sweepDeg * RAD * Math.sin((t / def.sweepPeriod) * Math.PI * 2);
}

export function sonarTick(s: Sonar, school: School, t: number, dt: number, events: EventQueue, tick: number) {
  // the sweep turns round at t = P/4, 3P/4, ...: count half-periods since the first turn, and
  // raise a ping event each time the count goes up (for the sound and the HUD)
  const half = s.def.sweepPeriod / 2;
  const turns = Math.floor((t - half / 2) / half);
  const turned = turns > s.turns;
  s.turns = turns;
  for (const c of s.cones) {
    c.heading = sweepHeading(s.def, c.facing, t);
    if (turned) events.push({ type: 'sonar_turn', tick, x: c.x, y: c.y });
  }
  let seen = 0;
  for (let i = 0; i < school.n; i++) {
    let inside = false;
    for (const c of s.cones) if (inCone(s.def, c, school.x[i], school.y[i], school.d[i])) { inside = true; break; }
    school.seen[i] = inside ? s.def.linger : Math.max(0, school.seen[i] - dt);
    if (school.seen[i] > 0) seen++;
  }
  school.seenCount = seen;
}
