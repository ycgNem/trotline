// Lures: a worm cast on the road feeds one thief at a time while the rest stand in line (that's
// the stall; the thieves system walks them). An eaten-up or swallowed lure is gone and its line
// goes back to the road. Lures left at a wave's end spoil (the waves system) (DESIGN.md §6).
import type { Game } from '../Game';
import type { Pt } from '../world';
import { DEFENDERS } from '../../data/defenders';
import { THIEVES } from '../../data/thieves';

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

/**
 * What a worm on this road tile would do (DESIGN.md §6): where the raccoon eating it stands,
 * where a line of `n` more would wait behind it, the fish that line could wade at (DESIGN.md
 * §4), and the rays that reach the eater. The lure overlay draws it; the good bot scores by it.
 */
export function lurePreview(g: Game, x: number, y: number, n = 4): { eater: Pt; line: Pt[]; waded: number[]; shocks: number[] } {
  const w = g.world, i = w.pathIndex[w.idx(x, y)];
  const r = THIEVES.raccoon;
  const eater = w.pathPt(i);
  const line: Pt[] = [];
  for (let k = 1; k <= n; k++) line.push(w.pathBack(i, k * r.len));
  const waded: number[] = [], shocks: number[] = [];
  for (const d of g.defenders) {
    const def = DEFENDERS[d.species];
    if (d.hp <= 0 || def.place !== 'water') continue;
    const cx = d.x + 0.5, cy = d.y + 0.5;
    if (def.kind !== 'poison' && line.some((p) => Math.max(Math.abs(cx - p.x), Math.abs(cy - p.y)) <= r.wade)) waded.push(d.id);
    if (def.kind === 'zap' && Math.hypot(cx - eater.x, cy - eater.y) <= def.range) shocks.push(d.id);
  }
  return { eater, line, waded, shocks };
}
