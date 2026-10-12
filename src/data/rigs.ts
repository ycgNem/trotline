// Rig geometry and the sonar the proof of concept needs. Provisional numbers for the look test,
// not balance: DESIGN.md (after the proof of concept) replaces them with derived ones.

export const ROD_STATION = {
  /** origin (back of the deck, at the ground) to the rod tip, m: the rod_tip node in public/models/rigs.glb */
  tipForward: 3.82,
  tipUp: 2.53,
  /** the origin stands this far behind the waterline, so the deck reaches out over the water (m) */
  setBack: 0.5,
};

/**
 * A forward-facing live sonar on the middle station: a fan about 20 degrees wide side to side
 * that sees every depth from straight ahead down to straight below (real units: ~20 x 135
 * degrees). It pans side to side on its own across the water in front of the bluff. Real ones see
 * 20-30 m in clear water; this lake is 60 x 40 m, so the range is compressed to what keeps vision
 * scarce (the first review measured a 26 m round cone covering ~40% of the lake).
 */
export const SONAR = {
  /** half the fan's width, side to side (degrees) */
  halfYawDeg: 10,
  /** how far it sees (m) */
  range: 14,
  /** it pans this far either side of the station's facing (degrees) */
  sweepDeg: 40,
  /** seconds for one full pan, there and back */
  sweepPeriod: 10,
  /** a fish stays drawn this long after it leaves the fan (s), so edges don't flicker */
  linger: 0.35,
  /** the transducer hangs this deep at the rod tip (m) */
  apexDepth: 0.3,
};
