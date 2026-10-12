// Defenders: the fish in the water and the turtle on the road (DESIGN.md §4). Pufferfish burst
// when a thief comes within a tile; eels zap the nearest thief in range and chain; turtles just
// sit there being chewed. Between waves they rest and heal.
import type { Game, Thief } from '../Game';
import { DEFENDERS, type MineDef, type ZapDef } from '../../data/defenders';
import { hurt, alive } from './thieves';

export function tickDefenders(g: Game, dt: number) {
  const resting = g.phase === 'build';
  for (const d of g.defenders) {
    if (d.hp <= 0) continue;
    d.acted += dt;
    const def = DEFENDERS[d.species];
    if (resting) d.hp = Math.min(d.maxHp, d.hp + def.regen * dt);
    const cx = d.x + 0.5, cy = d.y + 0.5;
    if (def.kind === 'mine') mine(g, d.id, cx, cy, def);
    else if (def.kind === 'zap') {
      d.cool -= dt;
      if (d.cool <= 0) {
        if (zap(g, cx, cy, def)) { d.cool += def.pulse; d.acted = 0; }
        else d.cool = 0;
      }
    }
  }
  // a burst pufferfish and a chewed-through turtle are gone (fish you could have sold)
  const before = g.defenders.length;
  g.defenders = g.defenders.filter((d) => {
    if (d.hp > 0) return true;
    g.stats.lost++;
    g.events.push({ type: d.species === 'puffer' ? 'burst' : 'defenderLost', tick: g.tick, id: d.species, x: d.x + 0.5, y: d.y + 0.5 });
    return false;
  });
  if (g.defenders.length !== before) for (const t of g.thieves) if (t.mode === 'chew' && !g.defenders.some((d) => d.id === t.chewing)) { t.mode = 'road'; t.chewing = 0; }
}

function mine(g: Game, id: number, cx: number, cy: number, def: MineDef) {
  const near = g.thieves.some((t) => alive(t) && Math.max(Math.abs(t.x - cx), Math.abs(t.y - cy)) <= def.trigger);
  if (!near) return;
  for (const t of g.thieves) if (alive(t) && Math.hypot(t.x - cx, t.y - cy) <= def.radius) hurt(g, t, def.damage);
  g.events.push({ type: 'puff', tick: g.tick, x: cx, y: cy, value: def.radius });
  const d = g.defenders.find((q) => q.id === id)!;
  d.hp = 0;
}

/** One pulse: the nearest thief in range, then up to `chain` hops at chainFrac. */
function zap(g: Game, cx: number, cy: number, def: ZapDef): boolean {
  const first = nearest(g, cx, cy, def.range, []);
  if (!first) return false;
  const dmg = def.dps * def.pulse;
  const hit: Thief[] = [first];
  g.events.push({ type: 'zap', tick: g.tick, x: cx, y: cy, x2: first.x, y2: first.y });
  hurt(g, first, dmg);
  let from = first;
  for (let i = 0; i < def.chain; i++) {
    const next = nearest(g, from.x, from.y, def.chainRange, hit);
    if (!next) break;
    g.events.push({ type: 'zap', tick: g.tick, x: from.x, y: from.y, x2: next.x, y2: next.y, value: 1 });
    hurt(g, next, dmg * def.chainFrac);
    hit.push(next);
    from = next;
  }
  return true;
}

function nearest(g: Game, x: number, y: number, r: number, skip: Thief[]): Thief | null {
  let best: Thief | null = null, bd = r;
  for (const t of g.thieves) {
    if (!alive(t) || skip.includes(t)) continue;
    const d = Math.hypot(t.x - x, t.y - y);
    if (d <= bd) { bd = d; best = t; }
  }
  return best;
}
