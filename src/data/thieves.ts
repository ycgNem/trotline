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
  /** flies over terrapins, never grabs a fish from the water */
  flies: boolean;
  /** bait that pulls it off the road, and from how many tiles away */
  pulledBy: Partial<Record<BaitId, number>>;
  /** seconds it eats at a lure (0: swallows the whole lure at once) */
  eat: number;
  /** damage per second it does to a fish it grabs from the water's edge (0: doesn't) */
  grab: number;
  /** one line for the tooltip */
  note: string;
  derivation: string;
}

export const THIEVES: Record<ThiefId, ThiefDef> = {
  gull: {
    id: 'gull', name: 'Gull', real: 'laughing gull', hp: 20, speed: 2.5, crates: 1, bounty: 1, flies: true,
    pulledBy: { worm: 2 }, eat: 0, grab: 0,
    note: 'Fast, flies over terrapins, and swallows a worm lure whole if it passes within 2 tiles.',
    derivation: 'DESIGN.md §5: fast, fragile, flies; gulls follow ploughs for worms, so it takes a lure within 2 tiles and eats all of it at once; bounty 1 (1 per 40 HP, at least 1: §3 money)',
  },
  raccoon: {
    id: 'raccoon', name: 'Raccoon', real: 'raccoon', hp: 40, speed: 1.2, crates: 1, bounty: 1, flies: false,
    pulledBy: { worm: 4 }, eat: 6, grab: 5,
    note: 'Loves worms: leaves the road for one within 4 tiles and eats for 6 s. Grabs a fish 1 tile from the road.',
    derivation: 'DESIGN.md §5: medium; pulled hard by worms within 4 tiles (§6), eats 6 s; raccoons fish the water\'s edge, 5 damage/s to a fish within a tile; bounty 1 (1 per 40 HP, §3 money)',
  },
  bear: {
    id: 'bear', name: 'Bear', real: 'Louisiana black bear', hp: 200, speed: 0.7, crates: 5, bounty: 5, flies: false,
    pulledBy: { worm: 4 }, eat: 10, grab: 5,
    note: 'Slow tank that carries off 5 crates. A worm holds it 10 s; it claws fish and cracks terrapins.',
    derivation: 'DESIGN.md §5: the tank, 5 crates; pulled by any bait within 4 tiles (§6), eats 10 s; grabs a fish within a tile at 5/s; bounty 5 (1 per 40 HP)',
  },
};
