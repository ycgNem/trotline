// Lures: a worm cast on the road feeds one thief at a time; the rest queue (that's the stall).
// When its food runs out it is gone and the queue goes back to the road (DESIGN.md §6).
import type { Game } from '../Game';
import { THIEVES } from '../../data/thieves';

export function tickLures(g: Game, _dt: number) {
  for (const l of g.lures) {
    l.queue = l.queue.filter((id) => g.thieves.some((t) => t.id === id && t.mode === 'queue'));
    if (l.eater === 0 && l.queue.length && l.food > 0) {
      const t = g.thieves.find((q) => q.id === l.queue[0])!;
      l.queue.shift();
      l.eater = t.id;
      t.mode = 'eat';
      t.eatLeft = THIEVES[t.kind].eat;
      t.x = l.x + 0.5;
      t.y = l.y + 0.5;
      g.events.push({ type: 'eat', tick: g.tick, id: t.kind, x: t.x, y: t.y });
    }
  }
  g.lures = g.lures.filter((l) => {
    if (l.food > 0) return true;
    g.events.push({ type: 'lureGone', tick: g.tick, x: l.x + 0.5, y: l.y + 0.5 });
    return false;
  });
}
