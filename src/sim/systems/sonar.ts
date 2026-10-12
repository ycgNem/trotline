// Vision. Each sonar is a forward-facing fan from a transducer just under the surface at a rod
// tip: SONAR.halfYawDeg either side of where it points, every depth from level down to straight
// below, out to SONAR.range. It pans side to side. A fish inside any fan is seen; it stays drawn
// for a moment after it leaves (SONAR.linger) so edges don't flicker. Fish outside every fan are
// not drawn at all (PLAN.md pillar 2). Runs once per tick, after the fish have moved.
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
  /** where it points now (radians), and that direction as a unit vector */
  heading: number;
  hx: number;
  hy: number;
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
    cones: stations.map((s) => ({ x: s.hookX, y: s.hookY, d: def.apexDepth, facing: s.facing, heading: s.facing, hx: Math.cos(s.facing), hy: Math.sin(s.facing) })),
    only: true,
    turns: -1,
  };
}

const RAD = Math.PI / 180;

/** Point the fan: heading in radians. */
export function aim(c: Cone, heading: number) {
  c.heading = heading;
  c.hx = Math.cos(heading);
  c.hy = Math.sin(heading);
}

/** Is the point (x, y, d) inside the fan? (No allocation: it runs for every fish every tick.) */
export function inCone(def: typeof SonarDef, c: Cone, x: number, y: number, d: number): boolean {
  const vx = x - c.x, vy = y - c.y, vd = d - c.d;
  if (vd < 0) return false; // the fan looks level and down, never up
  if (vx * vx + vy * vy + vd * vd > def.range * def.range) return false;
  const ahead = vx * c.hx + vy * c.hy;
  const side = vy * c.hx - vx * c.hy;
  return ahead >= 0 && Math.abs(side) <= ahead * Math.tan(def.halfYawDeg * RAD);
}

export function sweepHeading(def: typeof SonarDef, facing: number, t: number): number {
  return facing + def.sweepDeg * RAD * Math.sin((t / def.sweepPeriod) * Math.PI * 2);
}

export function sonarTick(s: Sonar, schools: School[], t: number, dt: number, events: EventQueue, tick: number) {
  // the sweep turns round at t = P/4, 3P/4, ...: count half-periods since the first turn, and
  // raise a ping event each time the count goes up (for the sound and the HUD)
  const half = s.def.sweepPeriod / 2;
  const turns = Math.floor((t - half / 2) / half);
  const turned = turns > s.turns;
  s.turns = turns;
  for (const c of s.cones) {
    aim(c, sweepHeading(s.def, c.facing, t));
    if (turned) events.push({ type: 'sonar_turn', tick, x: c.x, y: c.y });
  }
  for (const school of schools) {
    let seen = 0;
    for (let i = 0; i < school.n; i++) {
      let inside = false;
      for (const c of s.cones) if (inCone(s.def, c, school.x[i], school.y[i], school.d[i])) { inside = true; break; }
      school.seen[i] = inside ? s.def.linger : Math.max(0, school.seen[i] - dt);
      if (school.seen[i] > 0) seen++;
    }
    school.seenCount = seen;
  }
}
