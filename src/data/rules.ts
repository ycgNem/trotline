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
  /** walkers on the road keep this fraction of a line's spacing (half of each one's length) from
   * the one ahead, and a walker enters the road only when there is that room at its start */
  walkGap: 0.8,
  derivation: 'DESIGN.md §2, §3, §5, §7: 30 money, 20 crates, a 6-slot live well holding a ray caught at dawn, a 60 s first build then 45 s builds, half-rate fishing in waves; sending a wave early pays nothing; walkers keep 0.8 of a line spacing apart on the road (the Milestone 3 review: at 0.25 s spawns a wave was a grey ribbon of stacked raccoons)',
};

/** The bounty a wave pays if every thief in it is stopped. */
export function waveBounty(groups: [string, number][], bounty: (id: string) => number): number {
  let n = 0;
  for (const [id, k] of groups) n += bounty(id) * k;
  return n;
}
