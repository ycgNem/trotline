// The pace tests: the season has more than one opening (DESIGN.md §7). The reference sells the ray
// caught at dawn toward the surf rod; this line deploys it. Thresholds clear the worst of five
// 100-seed sets.
import { describe, expect, it } from 'vitest';
import { RUNS, runs, wins, stolen } from './pace-helpers';

describe('DESIGN.md §7: deploy the dawn ray', () => {
  const r = runs('good', RUNS, { sellRay: false });
  it('wins 70 or more of 100 (measured 79-88, the reference 74-90): the rod comes a few seconds later, wave 1 costs nothing', () => {
    expect(wins(r)).toBeGreaterThanOrEqual(70);
    expect(stolen(r, 1)).toBeLessThan(0.3);
  });
});
