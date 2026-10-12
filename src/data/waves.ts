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
  { groups: [['gull', 6]], gap: 1.2, derivation: 'DESIGN.md §5, §7: two flocks of three: rays can\'t touch them in the air, a pufferfish kills one and lands its flock on the water by it, where rays reach them' },
  { groups: [['raccoon', 10], ['bear', 1]], gap: 1.2, derivation: 'DESIGN.md §5, §7: 560 HP at 1.2 s; the first bear, the run\'s first spike' },
  { groups: [['gull', 12], ['raccoon', 12]], gap: 0.75, derivation: 'DESIGN.md §5, §7: 720 HP at 0.75 s, four flocks first: a puffer beside two rays for each, fished and held for them' },
  { groups: [['raccoon', 18], ['bear', 2]], gap: 0.65, derivation: 'DESIGN.md §5, §7: 1,040 HP at 0.65 s' },
  { groups: [['gull', 15], ['raccoon', 20], ['bear', 1]], gap: 0.55, derivation: 'DESIGN.md §5, §7: 1,260 HP at 0.55 s' },
  { groups: [['gull', 15], ['raccoon', 22], ['bear', 2]], gap: 0.45, derivation: 'DESIGN.md §5, §7: 1,500 HP at 0.45 s, the finale, sized so the strong reference bot wins about 4 runs in 5' },
];
