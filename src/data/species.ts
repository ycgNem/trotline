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
   * The rate multiplier where the line sits: `near` within a tile of structure (the dock or
   * reeds), `open` anywhere else. `reedsOnly`: bites only within a tile of reeds.
   */
  habitat: { near: number; open: number; reedsOnly?: boolean };
  /** money when sold */
  sell: number;
  /** one line for the catch log and the tooltip: where and how it bites */
  note: string;
  derivation: string;
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  puffer: {
    id: 'puffer', name: 'Pufferfish', real: 'least puffer', band: 'surface', size: 'small',
    rates: { shallows: 2.0 }, habitat: { near: 1.3, open: 0.8 }, sell: 8,
    note: 'Bait thief of the shallows, thickest round the dock and the reeds. Poisonous to eat.',
    derivation: 'DESIGN.md §3: 2.0/min in the shallows, x1.3 by structure and x0.8 on open sand (they pick bait off pilings and grass); sells for 8',
  },
  ray: {
    id: 'ray', name: 'Electric ray', real: 'lesser electric ray', band: 'bottom', size: 'medium',
    rates: { shallows: 1.5, point: 1.5 }, habitat: { near: 0.5, open: 1.3 }, sell: 15,
    note: 'Lies buried on open sand and takes a worm off the bottom. Shocks what comes close.',
    derivation: 'DESIGN.md §3: 1.5/min, x1.3 on open sand and x0.5 by structure (it buries in sand); the point is all open sand, rays only; sells 15 to the aquarium buyer (the best defender sells best, so selling one costs you)',
  },
  turtle: {
    id: 'turtle', name: 'Terrapin', real: 'Mississippi diamondback terrapin', band: 'surface', size: 'large',
    rates: { shallows: 0.5 }, habitat: { near: 1, open: 0, reedsOnly: true }, sell: 12,
    note: 'Works the marsh edge: cast beside the reeds. Heavy, so it needs the surf rod\'s line.',
    derivation: 'DESIGN.md §3: 0.5/min, only within a tile of reeds (terrapins live on the marsh edge), large (tier-2 line); sells 12',
  },
};

export const SPECIES_ORDER: SpeciesId[] = ['puffer', 'ray', 'turtle'];

const SIZE_RANK: Record<Size, number> = { small: 0, medium: 1, large: 2 };
export function sizeRank(s: Size) {
  return SIZE_RANK[s];
}
