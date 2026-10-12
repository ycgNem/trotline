// Fishing: catch rates, never HP (DESIGN.md §1, §3). Each tick the line rolls rate / 3600 for
// every species the rod can land in the zone it sits in; the first success is a catch. A catch
// takes a worm off the hook and goes into the first empty live-well slot. During a wave the rate
// halves (you're distracted).
import type { Game } from '../Game';

export function tickFishing(g: Game, dt: number) {
  if (g.fishBlock()) return;
  for (const b of g.biteTable()) {
    if (b.rate <= 0) continue;
    // rate is per minute; per tick it is rate * dt / 60
    if (g.rng.next() < (b.rate * dt) / 60) {
      const slot = g.liveWell.indexOf(null);
      g.liveWell[slot] = b.s;
      g.worms--;
      g.tickCatches.push(b.s);
      g.events.push({ type: 'catch', tick: g.tick, id: b.s, x: g.fishing!.x + 0.5, y: g.fishing!.y + 0.5, value: slot });
      return;
    }
  }
}
