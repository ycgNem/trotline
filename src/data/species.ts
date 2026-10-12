// What bites (DESIGN.md §3). Fishing is catch rates, never HP: a line in the water rolls each
// species' rate every tick. The slice's shore is a brackish back bay on the Gulf (DECISIONS.md,
// "Back Bay"): least puffers, lesser electric rays and Mississippi diamondback terrapins all
// really live there. Where the line sits matters: puffers steal bait around the dock and the
// reeds, rays lie buried on open sand, terrapins work the marsh edge.
import type { ZoneId } from './shore';

export type SpeciesId = 'puffer' | 'ray' | 'turtle';
export type Band = 'surface' | 'mid' | 'bottom';
export type Size = 'small' | 'medium' | 'large';

export interface SpeciesDef {
  id: SpeciesId;
  name: string;
  /** the real animal, for the catch log */
  real: string;
  band: Band;
  size: Size;
  /** catches per minute with worm bait at rod tier 1, by zone (absent: not caught there) */
  rates: Partial<Record<ZoneId, number>>;
  /**
   * The rate multiplier where the line sits: within a tile of the dock's pilings, within a tile
   * of reeds, or anywhere else (open sand). 0: doesn't bite there.
   */
  habitat: { dock: number; reeds: number; open: number };
  /** money when sold */
  sell: number;
  /** one line for the catch log and the tooltip: where and how it bites */
  note: string;
  derivation: string;
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  puffer: {
    id: 'puffer', name: 'Pufferfish', real: 'least puffer', band: 'bottom', size: 'small',
    rates: { shallows: 2.0 }, habitat: { dock: 1.3, reeds: 0.8, open: 0.8 }, sell: 8,
    note: 'Bait thief of the shallows, thickest round the dock\'s pilings. Poisonous to eat.',
    derivation: 'DESIGN.md §3: 2.0/min in the shallows, x1.3 by the dock and x0.8 elsewhere (least puffers crowd pilings to pick bait off them; the marsh edge is the terrapin\'s); sells for 8',
  },
  ray: {
    id: 'ray', name: 'Electric ray', real: 'lesser electric ray', band: 'bottom', size: 'medium',
    rates: { shallows: 0.4, point: 2.5 }, habitat: { dock: 0.5, reeds: 0.5, open: 1 }, sell: 15,
    note: 'A surf and pass fish: common on the point\'s sand, a stray in the bay. Shocks what comes close.',
    derivation: 'DESIGN.md §3: lesser electric rays live on high-salinity sand by passes and surf: 2.5/min at the point, 0.4 in the brackish bay (a stray), x0.5 by the dock or reeds; sells 15 to the aquarium buyer (the best defender sells best)',
  },
  turtle: {
    id: 'turtle', name: 'Terrapin', real: 'Mississippi diamondback terrapin', band: 'surface', size: 'medium',
    rates: { shallows: 1.0 }, habitat: { dock: 0, reeds: 1, open: 0 }, sell: 12,
    note: 'Works the marsh edge: cast beside the reeds.',
    derivation: 'DESIGN.md §3: 1.0/min, only within a tile of reeds (terrapins live on the marsh edge, never under a dock; diamondbacks are abundant in salt marsh and take a worm readily); medium (it needs the right place, not a heavy line); sells 12',
  },
};

export const SPECIES_ORDER: SpeciesId[] = ['puffer', 'ray', 'turtle'];

const SIZE_RANK: Record<Size, number> = { small: 0, medium: 1, large: 2 };
export function sizeRank(s: Size) {
  return SIZE_RANK[s];
}
