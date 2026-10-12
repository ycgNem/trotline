// The season's twelve waves (DESIGN.md §5, §12). Groups spawn in order, one thief every `gap` seconds.
// Waves grow and arrive faster as the run goes on. A ray can't shock a gull in the air, so gull
// flocks are met with a puffer between rays (DESIGN.md §4, §7); the finale leans on bears, so it
// is won by where the rays are, not by how many puffers bit.
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
  { groups: [['raccoon', 9], ['bear', 1]], gap: 1.1, derivation: 'DESIGN.md §5, §7: 520 HP at 1.1 s; the first bear, and the first wave that asks what a player sold toward a boat: a row thinned to three rays for the rowboat pays here' },
  { groups: [['gull', 12], ['raccoon', 10]], gap: 0.85, derivation: 'DESIGN.md §5, §7: 640 HP at 0.85 s, four flocks first: a puffer or a chum slick beside two rays for each, then the raccoons' },
  { groups: [['raccoon', 15], ['bear', 3]], gap: 0.75, derivation: 'DESIGN.md §5, §7, §12: 1,080 HP at 0.75 s; three bears, the first test of a slick' },
  { groups: [['gull', 18], ['raccoon', 14], ['bear', 2]], gap: 0.75, derivation: 'DESIGN.md §5, §12: 1,240 HP at 0.75 s, six flocks then the walkers: a puffer or a slick beside two rays for each flock' },
  { groups: [['gull', 21], ['raccoon', 15], ['bear', 4]], gap: 0.65, derivation: 'DESIGN.md §5, §12: 1,660 HP at 0.65 s: the flocks press while the road carries the walkers no faster than they have room' },
  { groups: [['gull', 27], ['raccoon', 20], ['bear', 8]], gap: 0.55, derivation: 'DESIGN.md §5, §7: 2,620 HP at 0.55 s: where the line that kept six rays before its rowboat is thinnest' },
  { groups: [['gull', 30], ['raccoon', 30], ['bear', 18]], gap: 0.44, derivation: 'DESIGN.md §5, §7: 4,680 HP at 0.44 s: eighteen bears, slicks for them once the flocks are through' },
  { groups: [['gull', 54], ['raccoon', 46], ['bear', 30]], gap: 0.31, derivation: 'DESIGN.md §5, §7: 7,720 HP at 0.31 s, eighteen flocks then the walkers: sized against the reference player with its fleet out by wave 7' },
  { groups: [['gull', 66], ['raccoon', 60], ['bear', 50]], gap: 0.25, derivation: 'DESIGN.md §5, §7: 11,720 HP, the finale: twenty-two flocks and fifty bears (walkers come on only as the road has room, so the pressure is in the air and in the bears); sized so the reference player wins 65-90 in 100 and keeps 16 crates or fewer when it wins' },
];
