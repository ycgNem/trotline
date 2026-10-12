// The pace tests: what the worm is worth in the season (DESIGN.md §6, §7). The reference lays worms
// while fewer than four rays are down (the opening); this bot never lays one. Thresholds clear
// the worst of five 100-seed sets.
import { describe, expect, it } from 'vitest';
import { RUNS, runs, mean, stolenIn } from './pace-helpers';

describe('DESIGN.md §7: the worm is the opening\'s bait', () => {
  const r = runs('good', RUNS, { noLure: true });
  const won = r.filter((g) => g.phase === 'won');
  it('without worms waves 1-2 cost 4 crates or more (measured 4.8-5.5; the reference 0.5-0.7)', () => {
    expect(stolenIn(r, 1, 2)).toBeGreaterThanOrEqual(4);
  });
  it('and a won run keeps 14 or fewer (measured 11.5-13.4; the reference 14.9-15.8)', () => {
    expect(mean(won.map((g) => g.crates))).toBeLessThanOrEqual(14);
  });
});
