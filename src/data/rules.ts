// The run's rules (DESIGN.md §2, §3, §5): what you start with and how a wave cycle runs.

export const RULES = {
  startMoney: 30,
  crates: 20,
  liveWell: 6,
  /** seconds of build phase before each wave */
  buildTime: 45,
  /** the first build phase, before wave 1 */
  firstBuild: 60,
  /** what is in the live well when the run starts: a ray caught at dawn */
  startWell: ['ray'] as const,
  /** fishing during a wave runs at this fraction (you're distracted) */
  waveFishing: 0.5,
  /** calling a wave early pays this share of its bounty, scaled by the build time left */
  callEarly: 0.25,
  derivation: 'DESIGN.md §2, §3, §5, §7: 30 money, 20 crates, a 6-slot live well holding a ray caught at dawn, a 60 s first build then 45 s builds, half-rate fishing in waves, 25% call-early bonus',
};

/** The bounty a wave pays if every thief in it is stopped. */
export function waveBounty(groups: [string, number][], bounty: (id: string) => number): number {
  let n = 0;
  for (const [id, k] of groups) n += bounty(id) * k;
  return n;
}
