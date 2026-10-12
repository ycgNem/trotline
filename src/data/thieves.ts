// The thieves (DESIGN.md §5): hungry animals with HP walking the shore road to the smokehouse.
import type { BaitId } from './bait';

export type ThiefId = 'gull' | 'raccoon' | 'bear';

export interface ThiefDef {
  id: ThiefId;
  name: string;
  hp: number;
  /** tiles per second along the road */
  speed: number;
  /** crates it carries off from the smokehouse */
  crates: number;
  /** money when it is stopped */
  bounty: number;
  /** flies over turtles */
  flies: boolean;
  /** bait that pulls it off the road, and from how many tiles away */
  pulledBy: Partial<Record<BaitId, number>>;
  /** seconds it eats at a lure */
  eat: number;
  /** damage per second it chews into a turtle in its way */
  chew: number;
  /** one line for the tooltip */
  note: string;
  derivation: string;
}

export const THIEVES: Record<ThiefId, ThiefDef> = {
  gull: {
    id: 'gull', name: 'Gull', hp: 20, speed: 2.5, crates: 1, bounty: 3, flies: true,
    pulledBy: {}, eat: 3, chew: 0,
    note: 'Fast and flies over turtles. Worms don\'t tempt it (chum will).',
    derivation: 'DESIGN.md §5: fast, fragile, flies; pulled by chum, not worms (eat time used once chum exists, §9)',
  },
  raccoon: {
    id: 'raccoon', name: 'Raccoon', hp: 40, speed: 1.2, crates: 1, bounty: 8, flies: false,
    pulledBy: { worm: 4 }, eat: 6, chew: 5,
    note: 'Loves worms: leaves the road for one within 4 tiles and eats for 6 s.',
    derivation: 'DESIGN.md §5: medium; pulled hard by worms within 4 tiles (§6), eats 6 s, chews 5/s',
  },
  bear: {
    id: 'bear', name: 'Bear', hp: 200, speed: 0.7, crates: 5, bounty: 40, flies: false,
    pulledBy: { worm: 4 }, eat: 10, chew: 5,
    note: 'Slow tank that carries off 5 crates. Any bait holds it 10 s.',
    derivation: 'DESIGN.md §5: the tank, 5 crates; pulled by any bait within 4 tiles (§6), eats 10 s, chews 5/s',
  },
};
