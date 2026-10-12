// The slice's eight waves (DESIGN.md §5). Groups spawn in order, one thief every `gap` seconds.
// Waves grow and arrive faster as the run goes on; gull waves are sized to the pufferfish a
// player can fish for them, since a ray can't shock a gull in the air (DESIGN.md §4, §7).
import type { ThiefId } from './thieves';

export interface WaveDef {
  groups: [ThiefId, number][];
  /** seconds between spawns (absent: SPAWN_GAP) */
  gap?: number;
  derivation: string;
}

export const SPAWN_GAP = { seconds: 1.5, derivation: 'DESIGN.md §5: spawns 1.5 s apart unless a wave says otherwise' };

export const WAVES: WaveDef[] = [
  { groups: [['raccoon', 6]], derivation: 'DESIGN.md §5, §7: 240 HP, the deploy-don\'t-sell lesson' },
  { groups: [['raccoon', 8]], derivation: 'DESIGN.md §5: 320 HP' },
  { groups: [['gull', 5]], gap: 1.2, derivation: 'DESIGN.md §5, §7: five gulls: rays can\'t touch them, a pufferfish kills one' },
  { groups: [['raccoon', 6], ['bear', 1]], derivation: 'DESIGN.md §5, §7: 400 HP; the first bear' },
  { groups: [['gull', 6], ['raccoon', 8]], gap: 1.0, derivation: 'DESIGN.md §5, §7: 440 HP, gulls first: puffers fished and held for them' },
  { groups: [['raccoon', 12], ['bear', 1]], gap: 1.0, derivation: 'DESIGN.md §5, §7: 640 HP at a spawn a second' },
  { groups: [['gull', 7], ['raccoon', 12]], gap: 0.8, derivation: 'DESIGN.md §5, §7: 620 HP at 0.8 s' },
  { groups: [['gull', 5], ['raccoon', 14], ['bear', 2]], gap: 0.7, derivation: 'DESIGN.md §5, §7: 980 HP at 0.7 s, the finale' },
];
