// The slice's eight waves (DESIGN.md §5). Groups spawn in order, one thief every `gap` seconds.
import type { ThiefId } from './thieves';

export interface WaveDef {
  groups: [ThiefId, number][];
  derivation: string;
}

export const SPAWN_GAP = { seconds: 1.5, derivation: 'DESIGN.md §5: spawns 1.5 s apart' };

export const WAVES: WaveDef[] = [
  { groups: [['raccoon', 6]], derivation: 'DESIGN.md §5, §7: 240 HP, the deploy-don\'t-sell lesson' },
  { groups: [['raccoon', 8]], derivation: 'DESIGN.md §5: 320 HP' },
  { groups: [['gull', 10]], derivation: 'DESIGN.md §5, §7: gulls teach the eel over the turtle' },
  { groups: [['raccoon', 6], ['bear', 1]], derivation: 'DESIGN.md §5, §7: the bear teaches the turtle and the stall' },
  { groups: [['gull', 12], ['raccoon', 4]], derivation: 'DESIGN.md §5: 400 HP' },
  { groups: [['raccoon', 8], ['bear', 2]], derivation: 'DESIGN.md §5: 720 HP' },
  { groups: [['gull', 16], ['raccoon', 6]], derivation: 'DESIGN.md §5: 560 HP' },
  { groups: [['raccoon', 10], ['gull', 10], ['bear', 2]], derivation: 'DESIGN.md §5: 1,000 HP, the finale' },
];
