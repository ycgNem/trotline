// Lures: a worm cast on the road feeds one thief at a time while the rest stand in line (that's
// the stall; the thieves system walks them). An eaten-up or swallowed lure is gone and its line
// goes back to the road. Lures left at a wave's end spoil (the waves system) (DESIGN.md §6).
import type { Game } from '../Game';
import type { Pt } from '../world';
import { DEFENDERS } from '../../data/defenders';
import { THIEVES } from '../../data/thieves';
import { WAVES } from '../../data/waves';

export function tickLures(g: Game, _dt: number) {
  for (const l of g.lures) {
    l.queue = l.queue.filter((id) => g.thieves.some((t) => t.id === id && t.lure === l.id && (t.mode === 'queue' || t.mode === 'toLure')));
    if (l.eater && !g.thieves.some((t) => t.id === l.eater && t.lure === l.id && (t.mode === 'eat' || t.mode === 'toLure'))) l.eater = 0;
  }
  g.lures = g.lures.filter((l) => {
    // eaten to nothing, it stays while its last raccoon finishes the meal it took
    if (l.food > 0 || l.eater) return true;
    g.events.push({ type: 'lureGone', tick: g.tick, x: l.x + 0.5, y: l.y + 0.5 });
    return false;
  });
}

export interface LinePreview {
  /** where the raccoon held (eating, or worrying a shell) stands */
  eater: Pt;
  /** where the ones waiting behind it stand */
  line: Pt[];
  /** fish the waiting ones could wade at (DESIGN.md §4) */
  waded: number[];
  /** rays whose shock reaches the one held (none on dry ground: a shock travels through water) */
  shocks: number[];
  dry: boolean;
}

/**
 * What a worm on this road tile would do (DESIGN.md §6): where the raccoon eating it stands,
 * where a line of `n` more would wait behind it, the fish that line could wade at and the rays
 * that reach the eater. The lure overlay draws it; the good bot scores by it.
 */
export function lurePreview(g: Game, x: number, y: number, n?: number): LinePreview {
  const i = g.world.pathIndex[g.world.idx(x, y)];
  return linePreview(g, i, 0, n ?? comingRaccoons(g, i));
}

/**
 * How long a line could get at road index `i`: the raccoons on the road behind it and those
 * still to come this wave (in a build, the next wave's), less the one eating, at most 16. A
 * preview that assumed four said "clear of your fish" to a ray a wave-6 line reached.
 */
export function comingRaccoons(g: Game, i: number): number {
  let n = 0;
  if (g.phase === 'build') n = (WAVES[g.wave]?.groups ?? []).reduce((a, [id, k]) => a + (id === 'raccoon' ? k : 0), 0);
  else {
    for (const t of g.thieves) if (t.kind === 'raccoon' && (t.mode === 'road' || t.mode === 'toLure' || t.mode === 'queue') && t.pathI <= i + 1) n++;
    for (const k of g.spawnQueue) if (k === 'raccoon') n++;
  }
  return Math.max(1, Math.min(16, n - 1));
}

/**
 * The same for a raccoon line at road index `i` whose front animal stands `first` tiles back
 * from it: 0 at a worm, half a tile plus half a raccoon at a terrapin (systems/thieves).
 */
export function linePreview(g: Game, i: number, first: number, n = 4): LinePreview {
  const w = g.world;
  const r = THIEVES.raccoon;
  const eater = w.pathBack(i, first);
  const line: Pt[] = [];
  for (let k = 1; k <= n; k++) line.push(w.pathBack(i, first + k * r.len));
  const waded: number[] = [], shocks: number[] = [];
  for (const d of g.defenders) {
    const def = DEFENDERS[d.species];
    if (d.hp <= 0 || def.place !== 'water') continue;
    const cx = d.x + 0.5, cy = d.y + 0.5;
    if (def.kind !== 'poison' && line.some((p) => Math.max(Math.abs(cx - p.x), Math.abs(cy - p.y)) <= r.wade)) waded.push(d.id);
    if (def.kind === 'zap' && w.isWet(eater.x, eater.y) && Math.hypot(cx - eater.x, cy - eater.y) <= def.range) shocks.push(d.id);
  }
  return { eater, line, waded, shocks, dry: !w.isWet(eater.x, eater.y) };
}
