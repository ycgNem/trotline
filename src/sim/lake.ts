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

/**
 * One segment of a monotone cubic (Fritsch-Butland tangents) between p1 and p2, with p0 and p3 the
 * neighbours that shape the slopes. It never overshoots the two values it joins and is flat
 * between equal ones, so a band edge sitting exactly on the grid stays a clean line.
 */
function mono(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const d0 = p1 - p0, d1 = p2 - p1, d2 = p3 - p2;
  const m1 = d0 * d1 > 0 ? (2 * d0 * d1) / (d0 + d1) : 0;
  const m2 = d1 * d2 > 0 ? (2 * d1 * d2) / (d1 + d2) : 0;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2 + (t3 - t2) * m2;
}
const ROW = [0, 0, 0, 0];

/**
 * Bed depth below the surface at world (x, y) in meters; negative is land above the water.
 * A monotone cubic between the grid points, along x then along y: it passes through every
 * hand-written value and curves the shore, never overshooting the cell's corners (the first
 * review found Catmull-Rom's S-curves drawing loops in the contours between equal nodes).
 */
export function depthAt(l: Lake, x: number, y: number): number {
  const gx = clamp((x - l.x0) / l.cell, 0, l.cols - 1);
  const gy = clamp((y - l.y0) / l.cell, 0, l.rows - 1);
  const c0 = Math.min(Math.floor(gx), l.cols - 2), r0 = Math.min(Math.floor(gy), l.rows - 2);
  const fx = gx - c0, fy = gy - r0;
  const g = l.grid, n = l.cols;
  for (let j = 0; j < 4; j++) {
    const r = clamp(r0 - 1 + j, 0, l.rows - 1) * n;
    ROW[j] = mono(g[r + Math.max(c0 - 1, 0)], g[r + c0], g[r + c0 + 1], g[r + Math.min(c0 + 2, l.cols - 1)], fx);
  }
  return mono(ROW[0], ROW[1], ROW[2], ROW[3], fy);
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

/** room kept between a hook or fish and the band's edges, and the bed (m) */
const MARGIN = 0.2;

/** Does `band` exist over a bed `bed` m deep (is there room for anything inside it)? */
export function bandExists(band: BandId, bed: number): boolean {
  const b = BANDS.find((k) => k.id === band)!;
  return bed - MARGIN > b.top + MARGIN;
}

/** Clamp a depth into `band` over a bed `bed` m deep; null where the band doesn't exist there. */
function intoBand(band: BandId, bed: number, d: number): number | null {
  if (!bandExists(band, bed)) return null;
  const b = BANDS.find((k) => k.id === band)!;
  return clamp(d, b.top + MARGIN, Math.min(b.bottom - MARGIN, bed - MARGIN));
}

/**
 * Where a fish of `band` holds over a bed `bed` m deep: mid-slab, or 1 m off the bed for the
 * bottom band, always inside the band; null where the band doesn't exist (a mid fish over 1.5 m
 * of water is not a surface fish, it isn't there).
 */
export function holdDepth(band: BandId, bed: number): number | null {
  const b = BANDS.find((k) => k.id === band)!;
  return intoBand(band, bed, b.hold < 0 ? bed + b.hold : b.hold);
}

/**
 * Where a rig set to `band` hangs its hook: a float rig at the band's holding depth; a bottom rig
 * has its sinker on the bed and the hook just above it. Null where the band doesn't exist.
 */
export function hookDepth(band: BandId, bed: number): number | null {
  const b = BANDS.find((k) => k.id === band)!;
  return intoBand(band, bed, b.hold < 0 ? bed - 0.3 : b.hold);
}

/** Which band a depth falls in. */
export function bandOf(depth: number): BandId {
  for (const b of BANDS) if (depth < b.bottom) return b.id;
  return 'bottom';
}
