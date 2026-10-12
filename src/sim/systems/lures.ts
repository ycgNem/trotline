// Lures: a worm cast on the road feeds one thief at a time while the rest stand in line (that's
// the stall; the thieves system walks them). An eaten-up or swallowed lure is gone and its line
// goes back to the road. Lures left at a wave's end spoil (the waves system) (DESIGN.md §6).
import type { Game } from '../Game';

export function tickLures(g: Game, _dt: number) {
  for (const l of g.lures) {
    l.queue = l.queue.filter((id) => g.thieves.some((t) => t.id === id && t.lure === l.id && (t.mode === 'queue' || t.mode === 'toLure')));
    if (l.eater && !g.thieves.some((t) => t.id === l.eater && t.lure === l.id && (t.mode === 'eat' || t.mode === 'toLure'))) l.eater = 0;
  }
  g.lures = g.lures.filter((l) => {
    if (l.food > 0) return true;
    g.events.push({ type: 'lureGone', tick: g.tick, x: l.x + 0.5, y: l.y + 0.5 });
    return false;
  });
}
