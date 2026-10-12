// The school: deterministic, stays in its band and in the water, and the sonar sees part of it
// and only what is inside a cone.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { depthAt } from '../src/sim/lake';
import { SONAR } from '../src/data/rigs';
import { coneAxis, inCone, sweepHeading } from '../src/sim/systems/sonar';
import { clockLabel, waterTempAt } from '../src/sim/systems/clock';
import { CLEARANCE } from '../src/sim/systems/school';

function run(seconds: number, fish = 500, seed = 1) {
  const g = new Game({ seed, fish });
  for (let i = 0; i < seconds * 60; i++) g.step();
  return g;
}

describe('school', () => {
  it('is deterministic for a seed', () => {
    const a = run(5), b = run(5);
    expect(Array.from(a.school.x)).toEqual(Array.from(b.school.x));
    expect(Array.from(a.school.seen)).toEqual(Array.from(b.school.seen));
    const c = run(5, 500, 2);
    expect(Array.from(c.school.x)).not.toEqual(Array.from(a.school.x));
  });

  it('holds in the mid band and stays clear of the bed for a whole lap, at 500 and 2,000 fish', () => {
    for (const n of [500, 2000]) {
      const g = new Game({ fish: n });
      for (let t = 0; t < 70 * 60; t += 7) {
        for (let k = 0; k < 7; k++) g.step();
        const s = g.school;
        for (let i = 0; i < s.n; i++) {
          expect(s.d[i]).toBeGreaterThanOrEqual(2);
          expect(s.d[i]).toBeLessThanOrEqual(4);
          expect(depthAt(g.lake, s.x[i], s.y[i]) - s.d[i]).toBeGreaterThanOrEqual(CLEARANCE - 1e-4);
        }
      }
    }
  });
});

describe('sonar', () => {
  const cone = { x: 0, y: 0, d: 0.3, facing: Math.PI / 2, heading: Math.PI / 2 };

  it('sees along its axis and not behind, beside or past its range', () => {
    const [ax, ay, ad] = coneAxis(SONAR, cone.heading);
    const at = (r: number) => [cone.x + ax * r, cone.y + ay * r, cone.d + ad * r] as const;
    expect(inCone(SONAR, cone, ...at(10))).toBe(true);
    expect(inCone(SONAR, cone, ...at(SONAR.range - 0.1))).toBe(true);
    expect(inCone(SONAR, cone, ...at(SONAR.range + 0.5))).toBe(false);
    expect(inCone(SONAR, cone, 0, -10, 3)).toBe(false); // behind
    expect(inCone(SONAR, cone, 12, 3, 2)).toBe(false); // far off to the side
  });

  it('sweeps between facing +/- sweepDeg', () => {
    let lo = Infinity, hi = -Infinity;
    for (let t = 0; t < SONAR.sweepPeriod; t += 0.05) {
      const h = sweepHeading(SONAR, Math.PI / 2, t) - Math.PI / 2;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
    expect(hi).toBeCloseTo((SONAR.sweepDeg * Math.PI) / 180, 2);
    expect(lo).toBeCloseTo((-SONAR.sweepDeg * Math.PI) / 180, 2);
  });

  it('marks exactly the fish inside a cone (plus the linger), and some but not all of the school over a sweep', () => {
    const g = new Game();
    let most = 0, least = Infinity;
    for (let i = 0; i < 60 * 60; i++) {
      g.step();
      const s = g.school;
      for (let k = 0; k < s.n; k++) {
        const inside = g.sonar.cones.some((c) => inCone(SONAR, c, s.x[k], s.y[k], s.d[k]));
        if (inside) expect(s.seen[k]).toBeCloseTo(SONAR.linger, 5);
        else expect(s.seen[k]).toBeLessThan(SONAR.linger);
      }
      most = Math.max(most, s.seenCount);
      least = Math.min(least, s.seenCount);
    }
    expect(most).toBeGreaterThan(200);
    expect(least).toBe(0);
  });

  it('raises a turn event twice per sweep period', () => {
    const g = new Game();
    let turns = 0;
    for (let i = 0; i < SONAR.sweepPeriod * 60 * 3; i++) {
      g.step();
      turns += g.events.drain().filter((e) => e.type === 'sonar_turn').length;
    }
    expect(turns).toBe(6);
  });
});

describe('clock', () => {
  it('water is warmest at 16:00 and coolest at 04:00', () => {
    expect(waterTempAt(16 * 60)).toBeGreaterThan(waterTempAt(12 * 60));
    expect(waterTempAt(4 * 60)).toBeLessThan(waterTempAt(8 * 60));
  });
  it('rolls over midnight into the next day', () => {
    const g = new Game({ startMinute: 1439 });
    for (let i = 0; i < 90; i++) g.step();
    expect(g.clock.day).toBe(2);
    expect(g.clock.minute).toBeCloseTo(2, 6);
    expect(clockLabel(150)).toBe('02:30');
  });
});
