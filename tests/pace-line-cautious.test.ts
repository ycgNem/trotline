// The pace tests: how hard to sell toward the first boat (DESIGN.md §7, §12). The reference sells
// rays past three for a rowboat by wave 3; this line keeps six down and has it by wave 6.
// Thresholds clear the worst of five 100-seed sets.
import { describe, expect, it } from 'vitest';
import { RUNS, runs, wins, stolenIn } from './pace-helpers';

describe('DESIGN.md §7: keep six rays before the rowboat', () => {
  const r = runs('good', RUNS, { rayFloor: 6 });
  it('wins 55 or more of 100 (measured 67-79, the reference 74-90): safe early, thin late', () => {
    expect(wins(r)).toBeGreaterThanOrEqual(55);
  });
  it('waves 8-12 cost it 5.5 crates or more (measured 6.7-8.8; the reference 3.5-4.8): its fleet came three waves later', () => {
    expect(stolenIn(r, 8, 12)).toBeGreaterThanOrEqual(5.5);
  });
});
