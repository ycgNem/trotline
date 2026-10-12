// Every upgrade the slice sells, with its fishing column (CLAUDE.md: a node that doesn't touch
// what, where or how you catch is rejected). The prices live with the thing they buy.
import { WORMS } from './bait';
import { RODS } from './rods';

export interface UpgradeNode {
  id: 'wormbed' | 'rod';
  name: string;
  cost: number;
  /** what it changes about catching */
  fishing: string;
  /** what it changes about the defense */
  defense: string;
  derivation: string;
}

export const UPGRADES: UpgradeNode[] = [
  {
    id: 'wormbed', name: 'Worm bed', cost: WORMS.bedCost,
    fishing: 'Bait keeps coming: a worm every 15 s (up to 12), so the line rarely stops for want of one.',
    defense: 'Spare worms become lures on the road.',
    derivation: 'DESIGN.md §3: bought once for 40, a worm per 15 s',
  },
  {
    id: 'rod', name: RODS[1].name, cost: RODS[1].cost,
    fishing: 'Casts to the point, where the rays live (2.5 a minute there, against 0.8 in the bay), and reels 1.5x faster.',
    defense: 'Rays in numbers, and lures that reach the bend.',
    derivation: 'DESIGN.md §3, §10: 50 money, a 14-tile cast',
  },
];
