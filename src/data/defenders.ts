// Fish as defenders (DESIGN.md §4): each species' real trait, turned up. Thieves have HP and
// defenders deal damage; nothing here is a catch rate.
//   Pufferfish: poisonous to eat (tetrodotoxin). The first thief that comes within a tile
//     snatches it, then retches and sickens: poison over time and a stun. One use.
//   Electric ray: shocks the nearest thief in reach and the shock jumps on, until its electric
//     organ is spent for the wave (real rays tire with repeated discharges).
//   Terrapin: sits on the road. A walker stops and worries it, one at a time, while the rest
//     wait behind; only a bear's jaws crack the shell. Gulls fly over.
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
export interface ZapDef extends DefenderDef {
  kind: 'zap'; range: number; dps: number; pulse: number; chain: number; chainFrac: number; chainRange: number;
  /** damage it can deal in a wave before its electric organ is spent; full again by the next wave */
  charge: number;
}
export interface ShellDef extends DefenderDef { kind: 'shell'; worry: Partial<Record<ThiefId, number>>; crack: Partial<Record<ThiefId, number>> }

export const PUFFER: PoisonDef = {
  species: 'puffer', kind: 'poison', place: 'water', maxRoadDist: 1, hp: 10, regen: 1,
  trigger: 1, poison: 40, poisonTime: 3, stun: 2,
  job: 'Bait with a sting: the first thief within 1 tile eats it, retches for 2 s and takes 40 poison over 3 s. That kills a raccoon.',
  derivation: 'DESIGN.md §4: snatched by the first thief within 1 tile; 40 poison over 3 s (a raccoon\'s 40 HP: tetrodotoxin kills what eats it) and a 2 s stun; one use',
};

export const RAY: ZapDef = {
  species: 'ray', kind: 'zap', place: 'water', maxRoadDist: 2, hp: 20, regen: 1,
  range: 3, dps: 4, pulse: 0.5, chain: 2, chainFrac: 0.5, chainRange: 2, charge: 140,
  job: 'Shock: hits the nearest thief within 3 tiles at 4 damage/s and jumps to 2 more; 140 damage a wave, then it is spent. 1 tile from the road it gets clawed.',
  derivation: 'DESIGN.md §4: 4 damage/s in 0.5 s pulses within 3 tiles, chains to 2 more at 50%, each hop within 2 tiles; 140 damage of charge a wave (§7: defense grows with the fish you deploy, not with how long they sit there)',
};

export const TURTLE: ShellDef = {
  species: 'turtle', kind: 'shell', place: 'road', maxRoadDist: 0, hp: 100, regen: 1,
  worry: { raccoon: 2, bear: 20 }, crack: { bear: 5 },
  job: 'Shell on the road: each walker stops to worry it while the rest wait behind. Only a bear cracks it. Gulls fly over.',
  derivation: 'DESIGN.md §4: walkers worry it one at a time (raccoon 2 s, bear 20 s); a bear cracks 5 HP/s, so one bear spends its 20 s and the shell (100 HP)',
};

export const DEFENDERS: Record<SpeciesId, PoisonDef | ZapDef | ShellDef> = { puffer: PUFFER, ray: RAY, turtle: TURTLE };
