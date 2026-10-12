// The proof-of-concept lake: 60 x 40 m, written by hand as a grid of depths every 2 m.
// Rows run north (y = -20) to south (y = +20), columns west (x = -30) to east (x = +30).
//   '#' land (1.2 m above the water)   '+' low bank (0.4 m above)   '.' the water's edge (0.15 m deep)
//   '1'..'9' depth in meters
// Features: a creek comes in at the north-west and its old channel (7-9 m) swings along a bluff
// on the north shore, where the rod stations stand, then bends south-east to a deep pool by the
// east bank. The basin is 4-6 m. A shallow cove (1-2 m) sits in the south-west behind a spit and
// a peninsula, with a mouth about 8 m wide: the spawning cove. Between grid points the bed is
// interpolated with Catmull-Rom (src/sim/lake.ts), so what the sim reads is exactly what is drawn.

export const LAKE_GRID = [
  '####55#########################', // y -20  the creek's mouth
  '###+66+########################', // y -18
  '##+.677.+++##########++++++####', // y -16  the bluff (x -8..+10)
  '#+.2578742234555554432211.+####', // y -14
  '#+.13578877788888887654321.+###', // y -12  the channel along the bluff
  '#+.123455556666667788764321.+##', // y -10
  '#+.123445555555566678875432.+##', // y  -8
  '#+.123344555555556667886432.+##', // y  -6
  '#+.112334455555555566789742.+##', // y  -4
  '#+.112233445555555556678973.+##', // y  -2
  '#+.111223344555555556678984.+##', // y   0
  '######+.1223445555556678973.+##', // y  +2  the spit
  '####++.12223344555556678973.+##', // y  +4  the cove's mouth (x -18..-10)
  '#+.111122222334455555668862.+##', // y  +6
  '#+.111221.+##+.234555567642.+##', // y  +8  the peninsula (x -10..-4)
  '#+.112221.+###+.23445555431.+##', // y +10
  '#+.111211.+###+.12334443321.+##', // y +12
  '##+.1111.+#####+.12223221.+####', // y +14
  '###+...+#########+.111.+#######', // y +16
  '####+++##########++++##########', // y +18
  '###############################', // y +20
] as const;

export const LAKE = {
  /** meters between grid points */
  cell: 2,
  /** world x and y of grid point (0, 0) */
  x0: -30,
  y0: -20,
  cols: 31,
  rows: 21,
  /** the deepest the bed goes, for tints (m) */
  maxDepth: 9,
} as const;

/** What each grid character means, as depth below the surface in meters (negative = above). */
export function charDepth(ch: string): number {
  if (ch === '#') return -1.2;
  if (ch === '+') return -0.4;
  if (ch === '.') return 0.15;
  const n = ch.charCodeAt(0) - 48;
  if (n >= 0 && n <= 9) return n;
  throw new Error(`unknown lake grid character '${ch}'`);
}

/**
 * The three depth bands (provisional, DECISIONS.md 2026-10-12): 2 m slabs from the surface,
 * the last running to the bed. `hold` is where a fish of that band swims: the middle of the slab,
 * or 1 m off the bed for the bottom band (bottom fish hug structure).
 * The contour lines on the bed are drawn at each band's lower edge: 2, 4 and 6 m.
 */
export const BANDS = [
  { id: 'surface', top: 0, bottom: 2, hold: 1, contour: 2 },
  { id: 'mid', top: 2, bottom: 4, hold: 3, contour: 4 },
  { id: 'bottom', top: 4, bottom: Infinity, hold: -1, contour: 6 },
] as const;
export type BandId = (typeof BANDS)[number]['id'];

/** The three rod stations of the proof of concept, on the bluff, each set to one band. */
export const POC_STATIONS: { x: number; band: BandId; sonar: boolean }[] = [
  { x: -6, band: 'surface', sonar: false },
  { x: 1, band: 'mid', sonar: true },
  { x: 8, band: 'bottom', sonar: false },
];
