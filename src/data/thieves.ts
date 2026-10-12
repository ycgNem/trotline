// The thieves (DESIGN.md §5): hungry animals with HP walking the shore road to the smokehouse.
// One that takes crates leaves another way (walkers into the woods south of the smokehouse,
// gulls straight out over the water), so a stolen crate comes back only if the thief is stopped
// before it gets away.
import type { BaitId } from './bait';

export type ThiefId = 'gull' | 'raccoon' | 'bear';

export interface ThiefDef {
  id: ThiefId;
  name: string;
  /** the real animal */
  real: string;
  hp: number;
  /** tiles per second along the road */
  speed: number;
  /** crates it carries off from the smokehouse */
  crates: number;
  /** money when it is stopped */
  bounty: number;
  /** flies: over terrapins, out of a ray's reach, never claws a fish */
  flies: boolean;
  /** bait that pulls it off the road, and from how many tiles away */
  pulledBy: Partial<Record<BaitId, number>>;
  /** seconds it eats at a lure (0: swallows the whole lure at once) */
  eat: number;
  /** damage per second it does to a fish it claws at from the water's edge (0: doesn't) */
  grab: number;
  /** how far (Chebyshev tiles) it reaches for a fish walking past */
  reach: number;
  /** standing in a line it wades out and feels for food: this far, at this many damage/s */
  wade: number;
  wadeDps: number;
  /** its body length in tiles, for spacing a line of animals */
  len: number;
  /** one line for the tooltip */
  note: string;
  derivation: string;
}

export const THIEVES: Record<ThiefId, ThiefDef> = {
  gull: {
    id: 'gull', name: 'Gull', real: 'laughing gull', hp: 20, speed: 2.5, crates: 1, bounty: 1, flies: true,
    pulledBy: { worm: 2 }, eat: 0, grab: 0, reach: 0, wade: 0, wadeDps: 0, len: 1,
    note: 'Fast; flies over terrapins and out of a ray\'s reach; swallows a worm lure whole within 2 tiles. A pufferfish kills it.',
    derivation: 'DESIGN.md §5: fast, fragile, flies; gulls follow ploughs for worms, so it takes a lure within 2 tiles and eats all of it at once; bounty 1 (1 per 40 HP, at least 1: §3 money)',
  },
  raccoon: {
    id: 'raccoon', name: 'Raccoon', real: 'raccoon', hp: 40, speed: 1.2, crates: 1, bounty: 1, flies: false,
    pulledBy: { worm: 4 }, eat: 6, grab: 5, reach: 1, wade: 2, wadeDps: 1, len: 1.2,
    note: 'Loves worms (4 tiles) and terrapins. Claws a fish 1 tile from the road as it passes, and 2 tiles out while it stands in a line.',
    derivation: 'DESIGN.md §5: medium; pulled hard by worms within 4 tiles (§6), eats 6 s; raccoons feel for food at the water\'s edge, 5 damage/s to a fish within a tile as they pass, 1/s within 2 tiles while they wait in a line (they wade); bounty 1 (1 per 40 HP, §3 money)',
  },
  bear: {
    id: 'bear', name: 'Bear', real: 'Louisiana black bear', hp: 160, speed: 0.7, crates: 5, bounty: 4, flies: false,
    pulledBy: {}, eat: 10, grab: 5, reach: 1, wade: 1, wadeDps: 5, len: 1.6,
    note: 'Slow tank that carries off 5 crates. Worms don\'t interest it (it came for fish); a terrapin holds it only the 3 s it takes to shove it aside.',
    derivation: 'DESIGN.md §5: the tank, 5 crates; a bear raids for fish, so worms don\'t pull it and it shoves a terrapin aside (3 s, §4); claws a fish within a tile at 5/s; 160 HP, four raccoons; bounty 4 (1 per 40 HP)',
  },
};
