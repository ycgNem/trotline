// The pace tests: the season has more than one opening (DESIGN.md §7, §12). The rowboat first,
// before the surf rod: a second line on the water from the first minute, paid for in the opening's
// crates. Thresholds clear the worst of five 100-seed sets.
import { describe, expect, it } from 'vitest';
import { RUNS, runs, wins, mean, stolenIn } from './pace-helpers';

describe('DESIGN.md §7: the rowboat first', () => {
  const r = runs('good', RUNS, { plan: ['rowboat', 'rod', 'trawler', 'skiff', 'wormbed'] });
  const won = r.filter((g) => g.phase === 'won');
  it('wins 60 or more of 100 (measured 72-86, the reference 74-90)', () => {
    expect(wins(r)).toBeGreaterThanOrEqual(60);
  });
  it('pays for it in the opening: waves 1-2 cost it 4 crates or more (measured 5.2-6.6; the reference 0.5-0.7), and a won run keeps 14 or fewer (12.0-13.1)', () => {
    expect(stolenIn(r, 1, 2)).toBeGreaterThanOrEqual(4);
    expect(mean(won.map((g) => g.crates))).toBeLessThanOrEqual(14);
  });
  it('and is ahead at the end: waves 10-12 cost it 2.5 or fewer (measured 1.1-1.7; the reference 3.3-4.5)', () => {
    expect(stolenIn(r, 10, 12)).toBeLessThanOrEqual(2.5);
  });
});
