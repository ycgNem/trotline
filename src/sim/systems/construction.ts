// Construction: canals (PLAN.md pillar 4, DESIGN.md §12). Tiles ordered dug are dug one at a time,
// in the order ordered, 3 s each; a dug tile is shallows from then on (World.dig works out the wet
// road, the zone and the slots round it again). Paid for when ordered.
import type { Game } from '../Game';
import { CANAL } from '../../data/shore';

export function tickConstruction(g: Game, dt: number) {
  if (!g.digs.length) { g.digT = 0; return; }
  g.digT += dt;
  if (g.digT < CANAL.seconds) return;
  g.digT -= CANAL.seconds;
  const p = g.digs.shift()!;
  g.world.dig(p.x, p.y);
  g.stats.dug++;
  g.events.push({ type: 'dug', tick: g.tick, x: p.x + 0.5, y: p.y + 0.5 });
}
