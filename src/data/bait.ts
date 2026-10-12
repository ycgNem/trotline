// Bait (DESIGN.md §3, §6): it decides what bites, and cast onto the road it lures thieves.
// The slice has worms only; chum arrives in Milestone 3.

export type BaitId = 'worm';

export interface BaitDef {
  id: BaitId;
  name: string;
  /** catch-rate multiplier when fishing with it (worm is the base the rates are quoted in) */
  match: number;
  /** a lure on the road holds this many thief-seconds of eating before it is gone */
  lureFood: number;
  derivation: string;
}

export const BAIT: Record<BaitId, BaitDef> = {
  worm: {
    id: 'worm', name: 'Worm', match: 1, lureFood: 36,
    derivation: 'DESIGN.md §6, §7: a lure feeds one thief at a time; 36 thief-seconds is a 6 s meal for each of wave 1\'s six raccoons (the luring lesson), or 3.6 bears',
  },
};

export const WORMS = {
  /** worms in the bait can at the start of a run */
  start: 8,
  /** the worm bed: bought once, then makes a worm every `period` seconds up to `cap` */
  bedCost: 40,
  period: 10,
  cap: 30,
  /** the bait shop's pack when you are out and have no bed */
  packCost: 5,
  packSize: 3,
  derivation: 'DESIGN.md §3: worm bed 40, a worm per 10 s; a pack of 3 for 5; 8 to start (two build phases of fishing plus a lure, §3)',
};
