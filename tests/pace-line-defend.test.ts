// The pace tests: invest in the fleet, or defend (DESIGN.md §7, §12). The reference sells its
// first boat's catch toward the trawler; this line keeps every boat's catch for the row.
// Thresholds clear the worst of five 100-seed sets.
import { describe, expect, it } from 'vitest';
import { RUNS, runs, wins, stolenIn } from './pace-helpers';

describe('DESIGN.md §7: keep every boat\'s catch', () => {
  const r = runs('good', RUNS, { boatSells: false });
  it('wins 60 or more of 100 (measured 72-77, the reference 74-90)', () => {
    expect(wins(r)).toBeGreaterThanOrEqual(60);
  });
  it('and loses its crates late: waves 10-12 cost it 5.5 or more (measured 6.8-8.4; the reference 3.3-4.5), its trawler four waves later', () => {
    expect(stolenIn(r, 10, 12)).toBeGreaterThanOrEqual(5.5);
  });
});
