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
    derivation: 'DESIGN.md §6, §7: a lure feeds one thief at a time; 36 thief-seconds is six 6 s meals: all of wave 1\'s five raccoons, with one to spare (the luring lesson); bears don\'t take worms (§5)',
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
  derivation: 'DESIGN.md §3: worm bed 40, a worm per 30 s up to 12 (half what a tier-2 line at the point uses, 3.75 a minute, before lures: worm packs stay a cost every build); a pack of 3 for 8 (the gate review: at 5 a worm on two kill zones every wave cost nothing and the strong player ended with $52 unspent; at 8 bait is what selling pays for, §7); 8 to start',
};
