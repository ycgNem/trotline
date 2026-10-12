// Stats: dead and gone thieves are dropped once nothing points at them (a wave's end clears them
// all); the run's totals are kept by the systems that cause them (Game.stats, Game.waveStats).
import type { Game } from '../Game';

export function tickStats(g: Game, _dt: number) {
  // keep dead thieves a moment for the renderer's death puff, then drop them
  if (g.thieves.length > 64) g.thieves = g.thieves.filter((t) => t.mode !== 'dead' && t.mode !== 'gone');
}
