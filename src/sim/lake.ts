// The lake as numbers: bed depth anywhere (bilinear between the hand-written grid points), the
// shoreline, and where a rig set to a band would hold its hook. Pure; the renderer builds its
// meshes from these same functions so the drawn bed is the simulated one.
import { BANDS, BandId, LAKE, LAKE_GRID, charDepth } from '../data/lake';
import { clamp } from '../engine/rng';

export interface Lake {
  cols: number;
  rows: number;
  cell: number;
  x0: number;
  y0: number;
  /** depth at each grid point, row-major (m, negative above water) */
  grid: Float32Array;
}

export function buildLake(rows: readonly string[] = LAKE_GRID): Lake {
  const nr = rows.length, nc = rows[0].length;
  const grid = new Float32Array(nr * nc);
  rows.forEach((row, r) => {
    if (row.length !== nc) throw new Error(`lake row ${r} is ${row.length} wide, expected ${nc}`);
    for (let c = 0; c < nc; c++) grid[r * nc + c] = charDepth(row[c]);
  });
  return { cols: nc, rows: nr, cell: LAKE.cell, x0: LAKE.x0, y0: LAKE.y0, grid };
}

/** Catmull-Rom weights for the four samples around t in [0, 1). */
function cr(t: number, w: number[]) {
  const t2 = t * t, t3 = t2 * t;
  w[0] = -0.5 * t3 + t2 - 0.5 * t;
  w[1] = 1.5 * t3 - 2.5 * t2 + 1;
  w[2] = -1.5 * t3 + 2 * t2 + 0.5 * t;
  w[3] = 0.5 * t3 - 0.5 * t2;
}
const WX = [0, 0, 0, 0], WY = [0, 0, 0, 0];

/**
 * Bed depth below the surface at world (x, y) in meters; negative is land above the water.
 * Catmull-Rom between the grid points: it passes through every hand-written value and keeps
 * slopes smooth, so the shoreline curves instead of stepping in 2 m teeth.
 */
export function depthAt(l: Lake, x: number, y: number): number {
  const gx = clamp((x - l.x0) / l.cell, 0, l.cols - 1);
  const gy = clamp((y - l.y0) / l.cell, 0, l.rows - 1);
  const c0 = Math.min(Math.floor(gx), l.cols - 2), r0 = Math.min(Math.floor(gy), l.rows - 2);
  cr(gx - c0, WX);
  cr(gy - r0, WY);
  const g = l.grid, n = l.cols;
  let v = 0;
  for (let j = 0; j < 4; j++) {
    const r = clamp(r0 - 1 + j, 0, l.rows - 1);
    let row = 0;
    for (let i = 0; i < 4; i++) row += g[r * n + clamp(c0 - 1 + i, 0, l.cols - 1)] * WX[i];
    v += row * WY[j];
  }
  return v;
}

export function bounds(l: Lake) {
  return { x0: l.x0, y0: l.y0, x1: l.x0 + (l.cols - 1) * l.cell, y1: l.y0 + (l.rows - 1) * l.cell };
}

/**
 * Walking south from the north edge along x, the first y where the bed reaches the waterline
 * (to 1 cm). Used to stand the rod stations on the north bluff.
 */
export function northShoreY(l: Lake, x: number): number {
  const b = bounds(l);
  let y = b.y0;
  while (y < b.y1 && depthAt(l, x, y) <= 0) y += 0.05;
  let lo = y - 0.05, hi = y;
  for (let i = 0; i < 20; i++) {
    const m = (lo + hi) / 2;
    if (depthAt(l, x, m) <= 0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/** The depth a hook set to `band` holds at over a bed `bed` m deep (never below the bed). */
export function holdDepth(band: BandId, bed: number): number {
  const b = BANDS.find((k) => k.id === band)!;
  const d = b.hold < 0 ? bed + b.hold : b.hold;
  return clamp(d, 0.2, Math.max(0.2, bed - 0.2));
}

/** Which band a depth falls in. */
export function bandOf(depth: number): BandId {
  for (const b of BANDS) if (depth < b.bottom) return b.id;
  return 'bottom';
}
