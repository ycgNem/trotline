// Construction: canals, pools and buckets (PLAN.md pillar 4, DESIGN.md §9). Not in the slice:
// Milestone 3 digs canals here (2 money and 3 s per tile, must connect to water) and runs bucket
// timers. Kept in the system order so its place is fixed.
import type { Game } from '../Game';

export function tickConstruction(_g: Game, _dt: number) {}
