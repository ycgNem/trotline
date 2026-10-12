// Bait (DESIGN.md §3, §6, §12): it decides what bites, and cast where thieves pass it lures them.
// Worms go on the road (raccoons); chum goes in the water as a slick (gulls and bears).

export type BaitId = 'worm' | 'chum';

export interface BaitDef {
  id: BaitId;
  name: string;
  /** catch-rate multiplier when fishing with it (worm is the base the rates are quoted in) */
  match: number;
  /** a lure holds this many thief-seconds of eating before it is gone */
  lureFood: number;
  /** where it is cast: worms on the road, chum on the pale water beside it */
  on: 'road' | 'water';
  derivation: string;
}

export const BAIT: Record<BaitId, BaitDef> = {
  worm: {
    id: 'worm', name: 'Worm', match: 1, lureFood: 36, on: 'road',
    derivation: 'DESIGN.md §6, §7: a lure feeds one thief at a time; 36 thief-seconds is six 6 s meals: all of wave 1\'s five raccoons, with one to spare (the luring lesson); bears don\'t take worms (§5)',
  },
  chum: {
    id: 'chum', name: 'Chum', match: 0, lureFood: 24, on: 'water',
    derivation: 'DESIGN.md §12: a slick on the pale water holds 24 thief-seconds, two flocks of gulls at 4 s each or three bears at 8 s; not a hook bait until Milestone 4\'s catfish and gar',
  },
};

export const WORMS = {
  /** worms in the bait can at the start of a run */
  start: 8,
  /** the worm bed: bought once, then makes a worm every `period` seconds up to `cap` */
  bedCost: 40,
  period: 30,
  cap: 12,
  /** the bait shop's pack when you are out and have no bed */
  packCost: 8,
  packSize: 3,
  derivation: 'DESIGN.md §3, §12: worm bed 40, a worm per 30 s up to 12 (half what a tier-2 line at the point uses, 3.75 a minute, before lures and boats: worm packs stay a cost every build); a pack of 3 for 8 (the gate review: at 5 a worm on two kill zones every wave cost nothing and the strong player ended with $52 unspent; at 8 bait is what selling pays for, §7); 8 to start',
};

export const CHUM = {
  /** the bait shop's frozen chum: one slick a bucket */
  bucketCost: 5,
  start: 0,
  /** a slick goes on shallows this close to the road (the pale water, the same as a ray's slots) */
  roadDist: 2,
  derivation: 'DESIGN.md §12: a bucket of frozen chum is one slick, 5 at the bait shop; the trawler\'s bycatch is the other source; none to start (the slice\'s opening is worms); a slick goes on the pale water, within 2 of the road, where a bear can wade to it and rays reach what comes to it',
};
