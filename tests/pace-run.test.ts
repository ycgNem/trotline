// The pace tests, part 2: the reference player's whole season (DESIGN.md §7, §12). Floors say a
// lesson is there; ceilings say the game hasn't gone soft. Every threshold clears the worst of
// five 100-seed sets (seeds 1-500, DESIGN.md §7 has them), so a seed's luck can't flip it. The
// other lines are in tests/pace-*.test.ts, one bot a file so vitest plays them in parallel.
import { describe, expect, it } from 'vitest';
import { RUNS, runs, wins, mean, stolen, stolenIn, boughtBy, moneyAt } from './pace-helpers';

describe('DESIGN.md §7: the reference player\'s season', () => {
  const ref = runs('good', RUNS);
  const won = ref.filter((g) => g.phase === 'won');
  it('wins 65 to 90 of 100 (winnable, not solved; measured 74-90)', () => {
    expect(wins(ref)).toBeGreaterThanOrEqual(65);
    expect(wins(ref)).toBeLessThanOrEqual(90);
  });
  it('a won run ends with 16 crates or fewer (the season takes some; measured 14.9-15.8)', () => {
    expect(mean(won.map((g) => g.crates))).toBeLessThanOrEqual(16);
  });
  it('wave 1 costs it a crate or less (a worm a tile short of the ray); the gull waves 3 and 5 cost it 1 or more, and waves 10-12 2.5 or more', () => {
    expect(stolen(ref, 1)).toBeLessThanOrEqual(1);
    expect(stolen(ref, 3) + stolen(ref, 5)).toBeGreaterThanOrEqual(1);
    expect(stolenIn(ref, 10, 12)).toBeGreaterThanOrEqual(2.5);
  });
  it('the rowboat is out by wave 4 and the trawler by wave 8 (the rays it sells buy the first boat, its catch the second; measured 3.0-3.2 and 7.0-7.2)', () => {
    expect(mean(ref.map((g) => Math.min(13, boughtBy(g, 'rowboat'))))).toBeLessThanOrEqual(4);
    expect(mean(won.map((g) => Math.min(13, boughtBy(g, 'trawler'))))).toBeLessThanOrEqual(8);
  });
  it('the boats land 90 fish or more a run (the fleet is the factory, pillar 5; measured 112-121)', () => {
    expect(mean(ref.map((g) => g.stats.boatFish))).toBeGreaterThanOrEqual(90);
  });
  it('it starts the finale with $160 or less (measured $128-140: past the skiff nothing is left to buy but chum, the known gap in DESIGN.md §7)', () => {
    const at12 = ref.map((g) => moneyAt.get(g)?.[11]).filter((m): m is number => m !== undefined);
    expect(mean(at12)).toBeLessThanOrEqual(160);
  });
  it('fish wear out: it loses 5 or more to claws and gnawing (measured 11-13)', () => {
    expect(mean(ref.map((g) => g.stats.lost))).toBeGreaterThanOrEqual(5);
  });
});
