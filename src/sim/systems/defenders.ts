// Defenders: the fish in the water and the terrapin on the road (DESIGN.md §4). A pufferfish is
// snatched by the first thief within a tile, which then stands paralysed and sickening; an
// electric ray shocks the nearest walker in reach (never a gull in the air); a terrapin is
// worried by raccoons (the thieves system). Between waves they rest, a little.
import type { Game, Thief, Defender } from '../Game';
import { DEFENDERS, type PoisonDef, type ZapDef } from '../../data/defenders';
import { THIEVES } from '../../data/thieves';
import { hurt, alive } from './thieves';

export function tickDefenders(g: Game, dt: number) {
  const resting = g.phase === 'build';
  for (const d of g.defenders) {
    if (d.hp <= 0) continue;
    d.acted += dt;
    const def = DEFENDERS[d.species];
    if (resting) d.hp = Math.min(d.maxHp, d.hp + def.regen * dt);
    if (def.kind === 'poison') snatch(g, d, def);
    else if (def.kind === 'zap') {
      d.cool -= dt;
      if (d.cool <= 0) {
        if (zap(g, d, def)) { d.cool += def.pulse; d.acted = 0; }
        else d.cool = 0;
      }
    }
  }
  // a snatched pufferfish did its job; a clawed ray or a gnawed-through terrapin is a fish lost
  g.defenders = g.defenders.filter((d) => {
    if (d.hp > 0) return true;
    if (DEFENDERS[d.species].kind !== 'poison') {
      g.stats.lost++;
      g.events.push({ type: 'defenderLost', tick: g.tick, id: d.species, x: d.x + 0.5, y: d.y + 0.5 });
    }
    return false;
  });
}

/** The nearest thief within `trigger` tiles (Chebyshev) eats the pufferfish and is poisoned. One
 * already paralysed by a puffer can't take another. */
function snatch(g: Game, d: Defender, def: PoisonDef) {
  const cx = d.x + 0.5, cy = d.y + 0.5;
  let best: Thief | null = null, bd = def.trigger + 1e-6;
  for (const t of g.thieves) {
    if (!alive(t) || t.stunT > 0) continue;
    const cd = Math.max(Math.abs(t.x - cx), Math.abs(t.y - cy));
    if (cd <= bd) { bd = cd; best = t; }
  }
  if (!best) return;
  best.poison += def.poison;
  best.poisonT = Math.max(best.poisonT, def.poisonTime);
  best.stunT = Math.max(best.stunT, def.stun);
  d.hp = 0;
  g.events.push({ type: 'snatch', tick: g.tick, id: best.kind, x: cx, y: cy, x2: best.x, y2: best.y });
}

/**
 * One pulse. A ray stays on the walker it is shocking while it is in reach (switching to whichever
 * stepped closest would spread the damage over a whole line and kill nothing); otherwise it takes
 * the nearest. A shock needs something wet to travel through: never a gull in the air.
 */
function zap(g: Game, d: Defender, def: ZapDef): boolean {
  const cx = d.x + 0.5, cy = d.y + 0.5;
  const ok = (t: Thief) => alive(t) && !THIEVES[t.kind].flies && Math.hypot(t.x - cx, t.y - cy) <= def.range;
  let best: Thief | null = g.thieves.find((t) => t.id === d.target && ok(t)) ?? null;
  if (!best) {
    let bd = def.range;
    for (const t of g.thieves) {
      if (!ok(t)) continue;
      const dist = Math.hypot(t.x - cx, t.y - cy);
      if (dist <= bd) { bd = dist; best = t; }
    }
  }
  d.target = best?.id ?? 0;
  if (!best) return false;
  g.events.push({ type: 'zap', tick: g.tick, x: cx, y: cy, x2: best.x, y2: best.y });
  hurt(g, best, def.dps * def.pulse);
  return true;
}
