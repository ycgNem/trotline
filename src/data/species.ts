// What bites (DESIGN.md §3). Fishing is catch rates, never HP: a rod fishing a zone rolls each
// species' rate every tick. The slice's shore is a brackish back bay (DECISIONS.md 2026-10-12,
// "Back Bay"): checkered puffers, American eels and diamondback terrapins all really live there.
import type { ZoneId } from './shore';

export type SpeciesId = 'puffer' | 'eel' | 'turtle';
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
  /** money when sold at the market */
  sell: number;
  /** one line for the catch log: where and how it bites */
  note: string;
  derivation: string;
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  puffer: {
    id: 'puffer', name: 'Pufferfish', real: 'checkered puffer', band: 'surface', size: 'small',
    rates: { shallows: 2.0 }, sell: 10,
    note: 'Bait thieves in the dock shallows. Puffs up when something gets close.',
    derivation: 'DESIGN.md §3: the cheap first catch, 2.0/min in the shallows; sells for 10',
  },
  eel: {
    id: 'eel', name: 'Eel', real: 'American eel', band: 'bottom', size: 'medium',
    rates: { shallows: 1.5, point: 1.0 }, sell: 25,
    note: 'Hugs the bottom of the shallows and the point. Takes a worm on the bottom.',
    derivation: 'DESIGN.md §3, §7: 1.5/min in the shallows so two runs in three have an eel by wave 1 (the deploy lesson needs one); 1.0/min at the point; the best sale (25) is the cost of deploying it',
  },
  turtle: {
    id: 'turtle', name: 'Turtle', real: 'diamondback terrapin', band: 'surface', size: 'large',
    rates: { point: 0.5 }, sell: 15,
    note: 'Basks off the point. Heavy: needs the tier-2 line.',
    derivation: 'DESIGN.md §3: 0.5/min at the point, large (tier-2 line); sells cheap because it is a wall, not a meal',
  },
};

export const SPECIES_ORDER: SpeciesId[] = ['puffer', 'eel', 'turtle'];

const SIZE_RANK: Record<Size, number> = { small: 0, medium: 1, large: 2 };
export function sizeRank(s: Size) {
  return SIZE_RANK[s];
}
