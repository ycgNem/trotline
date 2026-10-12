// Species for the proof of concept: one school of one invasive. Real fish, our numbers.
import type { BandId } from './lake';

export interface SchoolDef {
  species: string;
  /** how many in the proof of concept's school */
  count: number;
  /** body length drawn (m); oversized a little so a fish is a few pixels at the overview */
  length: number;
  band: BandId;
  /** cruising speed along the loop (m/s); negative swims the loop the other way */
  speed: number;
  /** the loop the school swims: an ellipse over the basin (center and radii, m) */
  loop: { cx: number; cy: number; rx: number; ry: number };
  /** how much of the loop the school stretches over (fraction of a lap) */
  spreadAlong: number;
  /** half-width of the school across its path (m) */
  spreadSide: number;
  /** half-height of the school around its band's holding depth (m) */
  spreadDepth: number;
  /** tail beats per second while cruising */
  tailHz: number;
  /** back, flank and belly colours (from the palette) */
  colors: [string, string, string];
}

/**
 * Bighead carp: PLAN.md's mid-band invasive. Adults commonly run 0.6-1 m; they cruise in loose
 * schools in open water and feed by filtering plankton, so they hold off the bottom and off the top.
 * Dark grey back with darker blotches, pale belly.
 */
export const BIGHEAD: SchoolDef = {
  species: 'bighead carp',
  count: 500,
  length: 1.1,
  band: 'mid',
  speed: 1.1,
  loop: { cx: 6, cy: -4.5, rx: 9, ry: 5 },
  spreadAlong: 0.3,
  spreadSide: 3,
  spreadDepth: 0.6,
  tailHz: 1.4,
  colors: ['#394a50', '#819796', '#c7cfcc'],
};

/**
 * Silver carp: PLAN.md's surface-band invasive. Adults commonly 0.5-0.9 m; they school near the
 * surface filtering plankton, and are the carp that leap when a motor spooks them. Silvery all
 * over with a darker olive-grey back. Swims the loop the other way, above the bighead, so the
 * proof of concept has two bands to tell apart.
 */
export const SILVER: SchoolDef = {
  species: 'silver carp',
  count: 150,
  length: 0.95,
  band: 'surface',
  speed: -1.5,
  loop: { cx: 7, cy: -5.5, rx: 7, ry: 3.5 },
  spreadAlong: 0.22,
  spreadSide: 2.2,
  spreadDepth: 0.4,
  tailHz: 1.8,
  colors: ['#577277', '#c7cfcc', '#ebede9'],
};

/** the proof of concept's schools, one InstancedMesh each */
export const POC_SCHOOLS: SchoolDef[] = [BIGHEAD, SILVER];
