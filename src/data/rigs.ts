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
 * A forward-looking sonar on the middle station. Real forward-facing units throw a fan a few tens
 * of degrees wide out to roughly 20-30 m in clear water; this one is a round cone (simpler to
 * read and to test) that sweeps side to side across the water in front of the bluff.
 */
export const SONAR = {
  /** half the cone's opening angle (degrees) */
  halfAngleDeg: 24,
  /** how far it sees (m) */
  range: 26,
  /** the cone's axis points this far below horizontal (degrees) */
  tiltDeg: 18,
  /** it sweeps this far either side of the station's facing (degrees) */
  sweepDeg: 40,
  /** seconds for one full sweep, there and back */
  sweepPeriod: 10,
  /** a fish stays drawn this long after it leaves the cone (s), so cone edges don't flicker */
  linger: 0.35,
  /** the transducer hangs this deep at the rod tip (m) */
  apexDepth: 0.3,
};
