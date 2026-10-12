// The rod (DESIGN.md §3): cast range decides which zones you reach (and where a lure can land),
// line strength the biggest fish you can land, the reel the catch-rate multiplier.
import type { Size } from './species';

export interface RodDef {
  tier: number;
  name: string;
  /** tiles from the angler a cast can reach */
  range: number;
  /** the largest fish it lands */
  line: Size;
  /** catch-rate multiplier */
  reel: number;
  /** money to upgrade to this tier */
  cost: number;
  derivation: string;
}

export const RODS: RodDef[] = [
  {
    tier: 1, name: 'Old spinning rod', range: 9, line: 'medium', reel: 1, cost: 0,
    derivation: 'DESIGN.md §3: reaches the dock shallows, medium line, reel x1; a 9-tile cast covers 15 road tiles for lures (§6, §10)',
  },
  {
    tier: 2, name: 'Surf rod', range: 14, line: 'large', reel: 1.5, cost: 60,
    derivation: 'DESIGN.md §3: 60 money, reaches the point (12-15 tiles, §10), lands turtles; reel x1.5 so with the point it roughly doubles the catch',
  },
];
