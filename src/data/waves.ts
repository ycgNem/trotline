// The slice's eight waves (DESIGN.md §5). Groups spawn in order, one thief every `gap` seconds.
// Waves grow and arrive faster as the run goes on: what you have deployed grows every build
// phase, so a wave has to grow with it or the late game is a walk (DESIGN.md §7).
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
  { groups: [['gull', 10]], gap: 1.2, derivation: 'DESIGN.md §5, §7: 200 HP of gulls: they fly over terrapins and swallow lures' },
  { groups: [['raccoon', 6], ['bear', 1]], derivation: 'DESIGN.md §5, §7: 440 HP; the bear teaches the terrapin and the stall' },
  { groups: [['gull', 14], ['raccoon', 8]], gap: 1.0, derivation: 'DESIGN.md §5, §7: 600 HP, a spawn a second' },
  { groups: [['raccoon', 12], ['bear', 3]], gap: 1.0, derivation: 'DESIGN.md §5, §7: 1,080 HP, three bears' },
  { groups: [['gull', 20], ['raccoon', 12]], gap: 0.8, derivation: 'DESIGN.md §5, §7: 880 HP at 0.8 s' },
  { groups: [['raccoon', 16], ['gull', 14], ['bear', 4]], gap: 0.7, derivation: 'DESIGN.md §5, §7: 1,720 HP at 0.7 s, the finale' },
];
