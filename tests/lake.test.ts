// The hand-written lake: its shape is what the docs say it is, depth passes through the hand
// values, and the rod stations stand on the bank with their hooks over water deep enough for
// the band each one fishes.
import { describe, expect, it } from 'vitest';
import { BANDS, LAKE, LAKE_GRID, charDepth } from '../src/data/lake';
import { bandOf, bounds, buildLake, depthAt, holdDepth, northShoreY } from '../src/sim/lake';
import { Game } from '../src/sim/Game';

const lake = buildLake();

describe('lake grid', () => {
  it('is 31 x 21, every row the same width, only known characters', () => {
    expect(LAKE_GRID.length).toBe(LAKE.rows);
    for (const row of LAKE_GRID) {
      expect(row.length).toBe(LAKE.cols);
      for (const ch of row) expect(() => charDepth(ch)).not.toThrow();
    }
  });

  it('covers 60 x 40 m', () => {
    const b = bounds(lake);
    expect(b.x1 - b.x0).toBe(60);
    expect(b.y1 - b.y0).toBe(40);
  });

  it('passes through every hand-written value at the grid points', () => {
    for (let r = 0; r < LAKE.rows; r++)
      for (let c = 0; c < LAKE.cols; c++)
        expect(depthAt(lake, LAKE.x0 + c * LAKE.cell, LAKE.y0 + r * LAKE.cell)).toBeCloseTo(charDepth(LAKE_GRID[r][c]), 5);
  });

  it('has the features: a deep channel along the bluff, a shallow cove, a basin between', () => {
    // the channel under the bluff (x -6..+8, y -12) is the deepest water near the stations
    for (const x of [-6, 0, 6]) expect(depthAt(lake, x, -12)).toBeGreaterThanOrEqual(7.5);
    // the cove (x -24..-14, y 8..14) is shallow: surface band only
    for (const [x, y] of [[-24, 10], [-20, 12], [-16, 8]]) expect(depthAt(lake, x, y)).toBeLessThan(2.5);
    // the basin holds the mid band everywhere along the school's loop
    expect(depthAt(lake, 6, -3)).toBeGreaterThan(4.5);
  });

  it('reaches every contour depth, so all three band lines are drawn', () => {
    let max = 0;
    for (const v of lake.grid) max = Math.max(max, v);
    for (const b of BANDS) expect(max).toBeGreaterThan(b.contour);
  });

  it('bandOf and holdDepth agree with the band table', () => {
    expect(bandOf(1)).toBe('surface');
    expect(bandOf(3)).toBe('mid');
    expect(bandOf(5)).toBe('bottom');
    expect(holdDepth('surface', 8)).toBe(1);
    expect(holdDepth('mid', 8)).toBe(3);
    expect(holdDepth('bottom', 8)).toBe(7);
    // never below the bed in shallow water
    expect(holdDepth('mid', 1.5)).toBeLessThan(1.5);
  });
});

describe('rod stations', () => {
  const g = new Game();
  it('stand on the north bank, just behind the waterline', () => {
    for (const s of g.stations) {
      expect(depthAt(lake, s.x, s.y)).toBeLessThanOrEqual(0);
      expect(northShoreY(lake, s.x) - s.y).toBeCloseTo(0.5, 2);
    }
  });
  it('hang their hooks over water deep enough for their band, in that band', () => {
    for (const s of g.stations) {
      expect(s.bed).toBeGreaterThan(s.hookDepth);
      expect(bandOf(s.hookDepth)).toBe(s.band);
    }
  });
});
