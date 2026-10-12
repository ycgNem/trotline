// Catch log: counts every species caught; the first of each is an event (the "first catch"
// lesson, and in Milestone 4 the unlock that teaches its depth and bait).
import type { Game } from '../Game';

export function tickCatchLog(g: Game, _dt: number) {
  for (const s of g.tickCatches) {
    g.caught[s]++;
    if (g.firstCatch[s] === undefined) {
      g.firstCatch[s] = g.tick;
      g.events.push({ type: 'firstCatch', tick: g.tick, id: s });
    }
  }
  g.tickCatches.length = 0;
}
