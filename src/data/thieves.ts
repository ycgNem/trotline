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
  /** seconds it eats at a lure of each bait (0: swallows the whole lure at once) */
  meal: Partial<Record<BaitId, number>>;
  /** damage per second it does to a fish it claws at from the water's edge (0: doesn't) */
  grab: number;
  /** how far (Chebyshev tiles) it reaches for a fish walking past */
  reach: number;
  /** standing in a line it wades out and feels for food: this far, at this many damage/s */
  wade: number;
  wadeDps: number;
  /** its body length in tiles, for spacing a line of animals */
  len: number;
  /** it arrives in flocks of this many, FLOCK_GAP seconds apart (1: one at a time) */
  flock: number;
  /** flockmates within this many tiles of one that snatched a pufferfish land on the water round
   * it, trying to steal the fish, for `mobTime` seconds (0: they don't) */
  mob: number;
  mobTime: number;
  /** one line for the tooltip */
  note: string;
  derivation: string;
}

export const THIEVES: Record<ThiefId, ThiefDef> = {
  gull: {
    id: 'gull', name: 'Gull', real: 'laughing gull', hp: 20, speed: 2.5, crates: 1, bounty: 1, flies: true,
    pulledBy: { worm: 2, chum: 4 }, meal: { worm: 0, chum: 4 }, grab: 0, reach: 0, wade: 0, wadeDps: 0, len: 1, flock: 3, mob: 2.5, mobTime: 6,
    note: 'Fast; comes in flocks of three; flies over terrapins and out of a ray\'s reach; swallows a worm lure whole within 2 tiles, and drops onto a chum slick within 4 to fight over it. A pufferfish kills it, and its flock lands on the water round it to steal the fish, where a ray can shock them.',
    derivation: 'DESIGN.md §5, §12: fast, fragile, flies; gulls follow ploughs for worms, so it takes a lure within 2 tiles and eats all of it at once; gulls mob a chum slick, so within 4 tiles the flock drops onto the water and squabbles over it together, 4 s each (§12); laughing gulls travel in small flocks (3, 0.3 s apart) and steal food from each other, so the flockmates within 2.5 tiles of one that snatched a pufferfish land on the water round it for 6 s trying to take it (on the water, a ray reaches them; 6 s is what lets one puffer beside two rays kill a flock: §7, measured); bounty 1 (1 per 40 HP, at least 1: §5, the money lesson in §7)',
  },
  raccoon: {
    id: 'raccoon', name: 'Raccoon', real: 'raccoon', hp: 40, speed: 1.2, crates: 1, bounty: 1, flies: false,
    pulledBy: { worm: 4, chum: 1 }, meal: { worm: 6, chum: 6 }, grab: 5, reach: 1, wade: 2, wadeDps: 1, len: 1.2, flock: 1, mob: 0, mobTime: 0,
    note: 'Loves worms (4 tiles) and terrapins; takes a chum slick only if it passes within a tile of it. Claws a fish 1 tile from the road as it passes, and 2 tiles out while it stands in a line.',
    derivation: 'DESIGN.md §5, §12: medium; pulled hard by worms within 4 tiles (§6), eats 6 s; a raccoon forages the waterline by touch, so chum within a tile of where it walks pulls it too (6 s), and a slick two tiles out it never finds; raccoons feel for food at the water\'s edge, 5 damage/s to a fish within a tile as they pass, 1/s within 2 tiles while they wait in a line (they wade); bounty 1 (1 per 40 HP, §5)',
  },
  bear: {
    id: 'bear', name: 'Bear', real: 'Louisiana black bear', hp: 160, speed: 0.7, crates: 5, bounty: 4, flies: false,
    pulledBy: { chum: 5 }, meal: { chum: 8 }, grab: 5, reach: 1, wade: 1, wadeDps: 5, len: 1.6, flock: 1, mob: 0, mobTime: 0,
    note: 'Slow tank that carries off 5 crates. Worms don\'t interest it: it came for fish, and wades out to a chum slick within 5 tiles to eat 8 s. A terrapin holds it only the 3 s it takes to shove it aside.',
    derivation: 'DESIGN.md §5, §12: the tank, 5 crates; a bear raids for fish, so worms don\'t pull it and a chum slick does, from 5 tiles, 8 s a bear, one at a time (§12); it shoves a terrapin aside (3 s, §4); claws a fish within a tile at 5/s; 160 HP, four raccoons; bounty 4 (1 per 40 HP)',
  },
};
