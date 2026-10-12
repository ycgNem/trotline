// Everything the shore sells, with its fishing column (CLAUDE.md: a node that doesn't touch what,
// where or how you catch is rejected). The prices live with the thing they buy.
import { WORMS } from './bait';
import { RODS } from './rods';
import { BOATS } from './boats';
import { CANAL } from './shore';

export type UpgradeId = 'wormbed' | 'rod' | 'rowboat' | 'skiff' | 'trawler' | 'canal';

export interface UpgradeNode {
  id: UpgradeId;
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
    id: 'rod', name: RODS[1].name, cost: RODS[1].cost,
    fishing: 'Casts to the point, where the rays live (2.5 a minute there, against 0.4 in the bay), and reels 1.5x faster.',
    defense: 'Rays in numbers, and lures that reach the bend.',
    derivation: 'DESIGN.md §3, §10: 50 money, a 14-tile cast',
  },
  {
    id: 'wormbed', name: 'Worm bed', cost: WORMS.bedCost,
    fishing: 'Bait keeps coming: a worm every 30 s (up to 12). The boats load from the can before they buy.',
    defense: 'Spare worms become lures on the road.',
    derivation: 'DESIGN.md §3, §12: bought once for 40, a worm per 30 s',
  },
  {
    id: 'rowboat', name: BOATS.rowboat.name, cost: BOATS.rowboat.cost,
    fishing: 'A second line anywhere a boat can row, no range limit: the far point for rays, reeds for terrapins.',
    defense: 'Its catch lands in the live well to deploy, or sells at the dock.',
    derivation: 'DESIGN.md §12: 50 (the price of the rod), about 2 rays a minute at the point',
  },
  {
    id: 'skiff', name: BOATS.skiff.name, cost: BOATS.skiff.cost,
    fishing: 'A fast boat with an inshore rod: reel x1.5, out and back in seconds, to wherever the fish you need bite.',
    defense: 'Rays in numbers, while you watch the road.',
    derivation: 'DESIGN.md §12: 80, about 3.4 rays a minute at the point',
  },
  {
    id: 'trawler', name: BOATS.trawler.name, cost: BOATS.trawler.cost,
    fishing: 'Tows a net in open water: what lives there comes up alive (in the channel the puffers of the bay and a stray ray; off the point, rays), and the rest is chum. No bait, no terrapins.',
    defense: 'Chum for the slicks that hold bears and gulls.',
    derivation: 'DESIGN.md §12: 60; in the channel about 1.2 puffers, 0.2 rays and 1.2 chum a minute of towing (a net brings up what lives where it tows)',
  },
  {
    id: 'canal', name: 'Canal', cost: CANAL.cost,
    fishing: 'A dug tile is shallows: puffers and rays bite in it like any open sand.',
    defense: 'A slot for a fish where there was land, and the road beside it turns wet, so rays shock there.',
    derivation: 'DESIGN.md §12: 3 money and 3 s a tile, touching water',
  },
];
