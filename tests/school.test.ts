// The school: deterministic, stays in its band and in the water, and the sonar sees part of it
// and only what is inside a cone.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { depthAt } from '../src/sim/lake';
import { SONAR } from '../src/data/rigs';
import { Cone, aim, inCone, sweepHeading } from '../src/sim/systems/sonar';
import { bandOf } from '../src/sim/lake';
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

  it('every school holds in its own band and stays clear of the bed for a whole lap, at 500 and 2,000 bighead', () => {
    for (const n of [500, 2000]) {
      const g = new Game({ fish: n });
      expect(g.schools.map((s) => s.def.band)).toEqual(['mid', 'surface']);
      for (let t = 0; t < 70 * 60; t += 7) {
        for (let k = 0; k < 7; k++) g.step();
        for (const s of g.schools)
          for (let i = 0; i < s.n; i++) {
            expect(bandOf(s.d[i])).toBe(s.def.band);
            expect(depthAt(g.lake, s.x[i], s.y[i]) - s.d[i]).toBeGreaterThanOrEqual(CLEARANCE - 1e-4);
          }
      }
    }
  });

  it('the silver carp swim the loop the other way, above the bighead', () => {
    const g = new Game();
    const [big, silver] = g.schools;
    expect(silver.def.speed * big.def.speed).toBeLessThan(0);
    const mean = (a: Float32Array) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(mean(silver.d)).toBeLessThan(mean(big.d) - 1.5);
  });
});

describe('sonar', () => {
  const RAD = Math.PI / 180;
  const fan = (heading = Math.PI / 2): Cone => {
    const c: Cone = { x: 0, y: 0, d: 0.3, facing: Math.PI / 2, heading: 0, hx: 0, hy: 0 };
    aim(c, heading);
    return c;
  };

  it('sees ahead at every depth from level to straight down, and not up, behind, aside or past its range', () => {
    const c = fan();
    expect(inCone(SONAR, c, 0, 10, 0.4)).toBe(true); // level, ahead
    expect(inCone(SONAR, c, 0, 5, 8)).toBe(true); // steeply down
    expect(inCone(SONAR, c, 0, 0, 6)).toBe(true); // straight below
    expect(inCone(SONAR, c, 0, SONAR.range - 0.1, 0.3)).toBe(true);
    expect(inCone(SONAR, c, 0, SONAR.range + 0.2, 0.3)).toBe(false); // past the range
    expect(inCone(SONAR, c, 0, -5, 3)).toBe(false); // behind
    expect(inCone(SONAR, c, 0, 5, 0.1)).toBe(false); // above the transducer
    const edge = Math.tan(SONAR.halfYawDeg * RAD) * 10;
    expect(inCone(SONAR, c, edge - 0.05, 10, 3)).toBe(true); // just inside the fan's side
    expect(inCone(SONAR, c, edge + 0.05, 10, 3)).toBe(false); // just outside
  });

  it('pans between facing +/- sweepDeg', () => {
    let lo = Infinity, hi = -Infinity;
    for (let t = 0; t < SONAR.sweepPeriod; t += 0.05) {
      const h = sweepHeading(SONAR, Math.PI / 2, t) - Math.PI / 2;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
    expect(hi).toBeCloseTo(SONAR.sweepDeg * RAD, 2);
    expect(lo).toBeCloseTo(-SONAR.sweepDeg * RAD, 2);
  });

  it('marks exactly the fish inside a fan (plus the linger), and over a minute sees some of each school, never most of it', () => {
    const g = new Game();
    let most = 0, least = Infinity, sum = 0, ticks = 0;
    const seenEver = g.schools.map(() => false);
    for (let i = 0; i < 60 * 60; i++) {
      g.step();
      let tick = 0;
      g.schools.forEach((s, si) => {
        for (let k = 0; k < s.n; k++) {
          const inside = g.sonar.cones.some((c) => inCone(SONAR, c, s.x[k], s.y[k], s.d[k]));
          if (inside) expect(s.seen[k]).toBeCloseTo(SONAR.linger, 5);
          else expect(s.seen[k]).toBeLessThan(SONAR.linger);
        }
        if (s.seenCount) seenEver[si] = true;
        tick += s.seenCount;
      });
      most = Math.max(most, tick);
      least = Math.min(least, tick);
      sum += tick;
      ticks++;
    }
    const total = g.schools.reduce((a, s) => a + s.n, 0);
    expect(seenEver).toEqual([true, true]);
    expect(least).toBe(0);
    // vision is scarce: on average well under a fifth of the fish are on screen
    expect(sum / ticks / total).toBeLessThan(0.2);
    expect(most).toBeGreaterThan(20);
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
