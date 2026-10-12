// The slice's shore (DESIGN.md §10): a hand-written 40x22 tile map. One character per tile:
//   ~ deep water   - mid water   . shallow water   r reeds (shallow, no defender)
//   s sand   g grass   T tree   # road   = dock   H smokehouse   : the woods trail (the way out)
// The road runs from the west edge along the north shore, bends south at the pool (bend 1) and
// east to the smokehouse door (bend 2). Thieves enter at the road's west end.
import type { SpeciesId } from './species';

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
  'ggggggTggggggggggggTgggggggggggggg:HHHgg',
  'ggggggggggggTggggggggggggggTgggTgg:ggggg',
  'gTggggggggggggggggggggggTggggggggg:gggTg',
  'ggggggggTggggggggTgggTgggggggggggT:ggggg',
  'gggggggggggggggggggggggggggggggggg:ggggg',
] as const;

export type ZoneId = 'shallows' | 'point' | 'channel';

export interface ZoneDef {
  id: ZoneId;
  name: string;
  /**
   * Which water it is: 'circle' the water tiles whose centres lie within r tiles of (x, y);
   * 'shallow' every shallow tile (and reeds) no circle claims; 'open' every mid and deep tile no
   * circle claims. Circles claim first.
   */
  claims: 'circle' | 'shallow' | 'open';
  x: number;
  y: number;
  r: number;
  /** fish a minute the water holds for every line in it together (absent: no limit): the lines
   * fishing it share it (DESIGN.md §12) */
  stock?: Partial<Record<SpeciesId, number>>;
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
  /** whether digging canals is offered on this shore (DESIGN.md §12: not on Back Bay, where the
   * road already runs by the water) */
  canals: false,
  derivation: 'DESIGN.md §10: the angler at the dock end is 5 tiles from the road, so a 9-tile cast covers 15 road tiles (§6); thieves leave by the woods (x 34 south) or, gulls, straight north over the water',
};

export const ZONES: ZoneDef[] = [
  { id: 'shallows', name: 'The shallows', claims: 'shallow', x: 0, y: 0, r: 0, derivation: 'DESIGN.md §10: every shallow tile is the shallows (light water reads as one zone); the bowl around the dock is inside the tier-1 cast (§3); a dug canal is shallows too (§12)' },
  { id: 'point', name: 'The point', claims: 'circle', x: 31, y: 4, r: 4.5, stock: { ray: 4 }, derivation: 'DESIGN.md §10, §12: open sand off the point\'s tip, 11-19 tiles from the dock end: tier 2 (14) reaches its near side only, rays only (§3); a boat reaches all of it; about 4 rays a minute come in on the pass for every line there together, so the surf rod alone (3.75) fishes it at full rate and a second line shares it' },
  { id: 'channel', name: 'The channel', claims: 'open', x: 0, y: 0, r: 0, derivation: 'DESIGN.md §12: the bay\'s open water, mid and deep: the trawler\'s ground (the net brings up rays, puffers and chum); no hook bites there until Milestone 4' },
];

/** Digging canals (DESIGN.md §12): what a tile costs and how long it takes. */
export const CANAL = {
  cost: 3,
  seconds: 3,
  derivation: 'DESIGN.md §12: 3 money and 3 s a tile, one at a time: the dock\'s sand strip (3 tiles, $9) makes road 11-13 wet; the last stretch to the smokehouse is ~7 tiles from the pool (~$21)',
};
