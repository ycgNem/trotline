// The slice's shore (DESIGN.md §10): a hand-written 40x22 tile map. One character per tile:
//   ~ deep water   - mid water   . shallow water   r reeds (shallow, no defender)
//   s sand   g grass   T tree   # road   = dock   H smokehouse
// The road runs from the west edge along the north shore, bends south at the pool (bend 1) and
// east to the smokehouse door (bend 2). Thieves enter at the road's west end.

export const SHORE_ROWS = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-------~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~---------~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~---sss---~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~--sgggs--~~~',
  '----------------.-------------sgggs-----',
  '.....-------....=....--------sggTggs----',
  '.....------.....=.....-------sgggggs----',
  '................=............sgggTgs....',
  'r...............=.......r....sgTgggs....',
  'srr........sss..=........rssssgggggs...r',
  '##############################ssssss..r.',
  'gggggggggggggggggggggggggs...#sssssss...',
  'gggTgggggggggggTggggggTggs...#gggggss...',
  'gggggggggTgggTggggggggggggr..#gggggHHH..',
  'ggTgggggggggggggggggggggggsss######HHHgg',
  'ggggggTggggggggggggTgggggggggggggggHHHgg',
  'ggggggggggggTggggggggggggggTgggTggggsggg',
  'gTggggggggggggggggggggggTgggggggggggggTg',
  'ggggggggTggggggggTgggTgggggggggggTgggggg',
  'gggggggggggggggggggggggggggggggggggggggg',
] as const;

export type ZoneId = 'shallows' | 'point';

export interface ZoneDef {
  id: ZoneId;
  name: string;
  /** the zone is the water tiles whose centres lie within r tiles of (x, y); r 0: every shallow tile not claimed by another zone */
  x: number;
  y: number;
  r: number;
  derivation: string;
}

export const SHORE = {
  name: 'Back Bay',
  /** where the angler stands: the end of the dock (tile coordinates of the tile) */
  angler: { x: 16, y: 7 },
  /** the smokehouse's top-left tile; it is 3x3 */
  smokehouse: { x: 35, y: 15, w: 3, h: 3 },
  /** where the worm bed is dug when bought (2x1 tiles of grass beside the dock's foot) */
  wormBed: { x: 17, y: 13 },
  /** walkers that took crates leave from the road's end straight south into the woods along this column */
  exitX: 34,
  derivation: 'DESIGN.md §10: the angler at the dock end is 5 tiles from the road, so a 9-tile cast covers 15 road tiles (§6); thieves leave by the woods (x 34 south) or, gulls, straight north over the water',
};

export const ZONES: ZoneDef[] = [
  { id: 'shallows', name: 'The shallows', x: 0, y: 0, r: 0, derivation: 'DESIGN.md §10: every shallow tile is the shallows (light water reads as one zone); the bowl around the dock is inside the tier-1 cast (§3)' },
  { id: 'point', name: 'The point', x: 31, y: 4, r: 4.5, derivation: 'DESIGN.md §10: open sand off the point\'s tip, 12-15 tiles from the dock end: tier 2 only, rays only (§3)' },
];
