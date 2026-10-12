// Fish as defenders (DESIGN.md §4): each species' real trait, turned up. Thieves have HP and
// defenders deal damage; nothing here is a catch rate.
//   Pufferfish: poisonous to eat (tetrodotoxin paralyses). The first thief that comes within a
//     tile snatches it, then stands paralysed and sickening. One use.
//   Electric ray: shocks the nearest walker in reach standing on wet ground (in the water or at
//     its edge): a discharge travels through water, never through dry land or air.
//   Terrapin: sits on the road. Raccoons (its real predator) stop and worry at it one at a time,
//     gnawing at the shell, while the rest wait behind; bears shove past; gulls fly over.
// Fish wear out: a fish heals only a little between waves, so the ones that take the claws need
// replacing (DESIGN.md §4, §7: the reason to keep fishing and the price of selling).
import type { SpeciesId } from './species';
import type { ThiefId } from './thieves';

export type DefenderKind = 'poison' | 'zap' | 'shell';

export interface DefenderDef {
  species: SpeciesId;
  kind: DefenderKind;
  /** water: a shallow tile within maxRoadDist (Chebyshev) of the road; road: a road tile */
  place: 'water' | 'road';
  maxRoadDist: number;
  hp: number;
  /** HP per second recovered during the build phase */
  regen: number;
  /** one line for the live well and the deploy tooltip */
  job: string;
  derivation: string;
}

export interface PoisonDef extends DefenderDef { kind: 'poison'; trigger: number; poison: number; poisonTime: number; stun: number }
export interface ZapDef extends DefenderDef { kind: 'zap'; range: number; dps: number; pulse: number }
export interface ShellDef extends DefenderDef {
  kind: 'shell';
  /** seconds each kind of walker spends worrying it before it gives up and walks on (absent: walks past) */
  worry: Partial<Record<ThiefId, number>>;
  /** HP per second a worrier gnaws off it */
  gnaw: Partial<Record<ThiefId, number>>;
}

const REST = 'a tenth of an HP a second between waves (fish wear out)';

export const PUFFER: PoisonDef = {
  species: 'puffer', kind: 'poison', place: 'water', maxRoadDist: 1, hp: 10, regen: 0.1,
  trigger: 1, poison: 24, poisonTime: 3, stun: 4,
  job: 'Bait with a sting: the first thief within 1 tile eats it, stands paralysed 4 s and takes 24 poison. Kills a gull, and its flock lands round it where rays can reach; next to a ray, a raccoon.',
  derivation: `DESIGN.md §4: snatched by the first thief within 1 tile; tetrodotoxin paralyses, so a 4 s stun and 24 poison over 3 s (a gull's 20 HP; a raccoon's 40 with 4 s in a ray's reach); one use. Its 10 HP is never spent: a puffer is snatched whole, never clawed`,
};

export const RAY: ZapDef = {
  species: 'ray', kind: 'zap', place: 'water', maxRoadDist: 2, hp: 20, regen: 0.1,
  range: 3, dps: 6, pulse: 0.5,
  job: 'Shock: hits the nearest walker within 3 tiles standing at the water\'s edge, 6 damage/s. Not on dry ground, not a gull in the air. 1 tile from the road, walkers claw at it.',
  derivation: `DESIGN.md §4: 6 damage/s in 0.5 s pulses at one walker within 3 tiles (the nearest, kept while it stays in reach); no chain; the shock travels through water, so only a thief on wet ground (water or land touching it), never on dry land or a gull in the air; rests ${REST}`,
};

export const TURTLE: ShellDef = {
  species: 'turtle', kind: 'shell', place: 'road', maxRoadDist: 0, hp: 100, regen: 0.1,
  worry: { raccoon: 4, bear: 3 }, gnaw: { raccoon: 1.5 },
  job: 'Shell on the road: each raccoon stops to worry at it for 4 s while the rest wait behind, gnawing it down slowly. A bear takes 3 s to shove it aside; gulls fly over.',
  derivation: `DESIGN.md §4: raccoons are the terrapin's real predator: each worries it 4 s, gnawing 1.5 HP/s (6 a raccoon, 17 raccoons to a shell); a bear spends 3 s shoving it aside and does it no harm; rests ${REST}`,
};

export const DEFENDERS: Record<SpeciesId, PoisonDef | ZapDef | ShellDef> = { puffer: PUFFER, ray: RAY, turtle: TURTLE };
