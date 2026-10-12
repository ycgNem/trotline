// The pace tests: the season can't be won without what Milestone 3 added (DESIGN.md §7, §12). The
// same reference bot with one thing taken away. Thresholds clear the worst of five 100-seed sets.
import { describe, expect, it } from 'vitest';
import { RUNS, runs, wins, mean } from './pace-helpers';

describe('DESIGN.md §7: one thing taken away', () => {
  it('no chum: 10 or fewer wins of 100 (measured 0-2): the slick is the only bait that holds a bear, and the flocks outnumber the puffers', () => {
    expect(wins(runs('good', RUNS, { noChum: true }))).toBeLessThanOrEqual(10);
  });
  it('no boats: 10 or fewer (measured 0-2): one rod can\'t catch a row for the late waves', () => {
    expect(wins(runs('good', RUNS, { noBoats: true }))).toBeLessThanOrEqual(10);
  });
  it('no surf rod, the rowboat to the point instead: 15 to 55 (measured 27-41), a second road to the rays, and a worse one', () => {
    const r = runs('good', RUNS, { noRod: true });
    expect(wins(r)).toBeGreaterThanOrEqual(15);
    expect(wins(r)).toBeLessThanOrEqual(55);
    expect(mean(r.map((g) => g.stats.boatFish))).toBeGreaterThanOrEqual(25);
  });
  it('selling everything never wins, and nor does deploying everything and buying nothing', () => {
    expect(wins(runs('sellAll', 20))).toBe(0);
    expect(wins(runs('deployAll', 20))).toBe(0);
  });
});
