// The fleet (DESIGN.md §12): boats are more lines in the water. A boat goes where it is sent by
// water, fishes there with its own gear (the same per-tick catch rolls as the rod's line, at the
// tile's habitat, §1, §3), and brings its catch back to the dock: into the live well, or to market
// if it is set to sell. Rowboat and skiff fish with worms, one a catch; the trawler tows a net in
// open water and needs no bait.
import type { Size, SpeciesId } from './species';
import type { ZoneId } from './shore';

export type BoatId = 'rowboat' | 'skiff' | 'trawler';

export interface BoatDef {
  id: BoatId;
  name: string;
  cost: number;
  /** tiles a second over water */
  speed: number;
  /** hook gear: catch-rate multiplier and the largest fish it lands (the trawler has a net) */
  reel: number;
  line: Size;
  /** fish it carries home */
  hold: number;
  /** how it fishes: a baited line, or a net towed in open water */
  gear: 'line' | 'net';
  /** one line for the shop and the tooltip */
  note: string;
  derivation: string;
}

export const BOATS: Record<BoatId, BoatDef> = {
  rowboat: {
    id: 'rowboat', name: 'Rowboat', cost: 50, speed: 1.5, reel: 1, line: 'medium', hold: 3, gear: 'line',
    note: 'A second line anywhere a boat can row: the far side of the point, the east flats, the west reeds. Slow.',
    derivation: 'DESIGN.md §12: a hand line (reel x1, medium line), hold 3, rowed at 1.5 tiles/s: at the point 72 s to fill and ~16 s there and back, 2.0 rays a minute, three quarters of a surf rod for the same 50: a second line on the water or a better one in hand, the first buy either way (60 came too late to pay back; 40 in wave 1 won 98 of 100; at 50 the rowboat first loses 8-15 runs in 100 at wave 4, §7)',
  },
  skiff: {
    id: 'skiff', name: 'Skiff', cost: 80, speed: 4, reel: 1.5, line: 'large', hold: 4, gear: 'line',
    note: 'An outboard and an inshore rod: fast out and back, reel x1.5.',
    derivation: 'DESIGN.md §12: an inshore rod with the surf rod\'s gear (reel x1.5, large line, §3), hold 4, 4 tiles/s: fast to wherever the fish wanted bite (the point\'s rays are shared, so a second line earns its keep elsewhere); at the point alone 64 s to fill and 6 s there and back, 3.4 rays a minute; 1.6 times the price of the rowboat for 1.7 times its catch (80; the first hypothesis, 120, was never reached in time)',
  },
  trawler: {
    id: 'trawler', name: 'Trawler', cost: 60, speed: 1, reel: 1, line: 'large', hold: 6, gear: 'net',
    note: 'Tows a net in open water: rays and puffers come up alive, the rest is chum. A turtle excluder lets terrapins out. No bait.',
    derivation: 'DESIGN.md §12: a shrimp try net towed 60 s a trip at 1 tile/s; lesser electric rays and least puffers are common shrimp-trawl bycatch, the dead bycatch is chum, and US trawls carry a turtle excluder (no terrapins); hold 6; 60, cheap because it is the bait boat (its chum saves the bait shop)',
  },
};

export const BOAT_ORDER: BoatId[] = ['rowboat', 'skiff', 'trawler'];

/** What the net brings up a minute of towing where each species is commonest; elsewhere it is
 * scaled by how common the species is in the water towed (the channel is the bay's water: its
 * fish are the shallows' fish), and at the point its rays come out of the point's stock. */
export const TRAWL: { fish: Partial<Record<SpeciesId, number>>; waters: Partial<Record<ZoneId, ZoneId>>; chum: number; tow: number; open: number; derivation: string } = {
  fish: { ray: 1.2, puffer: 1.2 },
  waters: { channel: 'shallows' },
  chum: 1.2,
  tow: 60,
  open: 4,
  derivation: 'DESIGN.md §12: at most 1.2 rays and 1.2 puffers a minute of towing, scaled by how common each is where it tows (in the channel 1.2 puffers and about 0.2 rays, the strays of the bay; off the point 1.2 rays, shared with the lines there), and 1.2 buckets of chum anywhere, 60 s a tow along a run of at least 4 tiles of open water: the bait boat, about two slicks a wave cycle',
};

export const FLEET = {
  /** the dock's berths, one per boat (tile coordinates of water beside the dock) */
  berths: { rowboat: { x: 17, y: 8 }, skiff: { x: 15, y: 8 }, trawler: { x: 18, y: 6 } } as Record<BoatId, { x: number; y: number }>,
  /** a boat leaving takes worms from the can down to this many, and buys the rest at the bait shop */
  reserve: 3,
  derivation: 'DESIGN.md §12: three berths at the dock, one landing; a boat leaves the can 3 worms (the line and a lure) and buys the rest at the pack price',
};
