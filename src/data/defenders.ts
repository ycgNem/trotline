// Fish as defenders (DESIGN.md §4): the species' real traits turned up. Thieves have HP and
// defenders deal damage; nothing here is a catch rate.
import type { SpeciesId } from './species';

export type DefenderKind = 'mine' | 'zap' | 'block';

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

export interface MineDef extends DefenderDef { kind: 'mine'; trigger: number; damage: number; radius: number }
export interface ZapDef extends DefenderDef { kind: 'zap'; range: number; dps: number; pulse: number; chain: number; chainFrac: number; chainRange: number }
export interface BlockDef extends DefenderDef { kind: 'block' }

export const PUFFER: MineDef = {
  species: 'puffer', kind: 'mine', place: 'water', maxRoadDist: 1, hp: 10, regen: 1,
  trigger: 1, damage: 30, radius: 1.5,
  job: 'Mine: puffs and bursts when a thief comes within 1 tile. 30 damage, once.',
  derivation: 'DESIGN.md §4: explodes when a thief is within 1 tile, 30 damage in radius 1.5, one use',
};

export const EEL: ZapDef = {
  species: 'eel', kind: 'zap', place: 'water', maxRoadDist: 2, hp: 20, regen: 1,
  range: 3, dps: 4, pulse: 0.5, chain: 2, chainFrac: 0.5, chainRange: 2,
  job: 'Zap: shocks the nearest thief within 3 tiles, 4 damage/s, and jumps to 2 more.',
  derivation: 'DESIGN.md §4: 4 damage/s in 0.5 s pulses within 3 tiles, chains to 2 more at 50%, each hop within 2 tiles',
};

export const TURTLE: BlockDef = {
  species: 'turtle', kind: 'block', place: 'road', maxRoadDist: 0, hp: 100, regen: 1,
  job: 'Wall: sits on the road. Walking thieves must chew through 100 HP. Gulls fly over.',
  derivation: 'DESIGN.md §4: blocks the road with 100 HP; thieves chew it at 5 damage/s each; rests 1 HP/s between waves',
};

export const DEFENDERS: Record<SpeciesId, MineDef | ZapDef | BlockDef> = { puffer: PUFFER, eel: EEL, turtle: TURTLE };
