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

export const SPAWN_GAP = { seconds: 1.5, flock: 0.3, derivation: 'DESIGN.md §5: spawns 1.5 s apart unless a wave says otherwise; a flock (gulls) 0.3 s apart within it' };

export const WAVES: WaveDef[] = [
  { groups: [['raccoon', 5]], derivation: 'DESIGN.md §5, §7: 200 HP, the first lessons: the dawn ray, two or three puffers and one worm a tile short of the ray stop it' },
  { groups: [['raccoon', 7]], derivation: 'DESIGN.md §5: 280 HP, while the strong player sells puffers for the rod' },
  { groups: [['gull', 6]], gap: 1.2, derivation: 'DESIGN.md §5, §7: two flocks of three: rays can\'t touch them, a pufferfish kills one and its alarm turns the flock' },
  { groups: [['raccoon', 6], ['bear', 1]], derivation: 'DESIGN.md §5, §7: 400 HP; the first bear, the run\'s first spike' },
  { groups: [['gull', 9], ['raccoon', 8]], gap: 1.0, derivation: 'DESIGN.md §5, §7: 500 HP, three flocks first: puffers fished and held for them' },
  { groups: [['raccoon', 12], ['bear', 1]], gap: 1.0, derivation: 'DESIGN.md §5, §7: 640 HP at a spawn a second' },
  { groups: [['gull', 9], ['raccoon', 12]], gap: 0.8, derivation: 'DESIGN.md §5, §7: 660 HP at 0.8 s' },
  { groups: [['gull', 9], ['raccoon', 16], ['bear', 2]], gap: 0.7, derivation: 'DESIGN.md §5, §7: 1,140 HP at 0.7 s, the finale' },
];
