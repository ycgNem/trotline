// Defenders: the fish in the water and the terrapin on the road (DESIGN.md §4). A pufferfish is
// snatched by the first thief within a tile, which then stands paralysed and sickening; an
// electric ray shocks a walker in reach standing on wet ground (never a gull in the air, never
// a thief on dry land); a terrapin is
// worried by raccoons (the thieves system). Between waves they rest, a little.
import type { Game, Thief, Defender } from '../Game';
import { DEFENDERS, type PoisonDef, type ZapDef } from '../../data/defenders';
import { THIEVES } from '../../data/thieves';
import { hurt, alive, mob, landed } from './thieves';
import { mobSpots } from '../spots';

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
 * already paralysed by a puffer can't take another, nor one on its way out. */
function snatch(g: Game, d: Defender, def: PoisonDef) {
  const cx = d.x + 0.5, cy = d.y + 0.5;
  let best: Thief | null = null, bd = def.trigger + 1e-6;
  for (const t of g.thieves) {
    if (!alive(t) || t.stunT > 0 || t.mode === 'exit') continue;
    const cd = Math.max(Math.abs(t.x - cx), Math.abs(t.y - cy));
    if (cd <= bd) { bd = cd; best = t; }
  }
  if (!best) return;
  best.poison += def.poison;
  best.poisonT = Math.max(best.poisonT, def.poisonTime);
  best.stunT = Math.max(best.stunT, def.stun);
  d.hp = 0;
  g.events.push({ type: 'snatch', tick: g.tick, id: best.kind, x: cx, y: cy, x2: best.x, y2: best.y });
  // a gull drops onto the water with it, retching; its flockmates near it land round it to rob it
  // of the fish (laughing gulls steal from each other), out of the air and in a ray's reach
  const r = THIEVES[best.kind].mob;
  if (r > 0) {
    const sx = best.x, sy = best.y;
    const [eat, ...spots] = mobSpots(g, d.x, d.y);
    best.x = eat.x;
    best.y = eat.y;
    let k = 0;
    for (const o of g.thieves) {
      if (o === best || o.kind !== best.kind || !alive(o) || o.mode === 'exit' || o.mode === 'mob') continue;
      if (Math.hypot(o.x - sx, o.y - sy) > r) continue;
      const p = spots[k++ % spots.length];
      mob(g, o, best, p.x, p.y);
    }
  }
}

/** The rays whose shock reaches where a gull flock would come down round a pufferfish set on
 * (x, y): what a puffer is worth against gulls (DESIGN.md §4). */
export function pufferRays(g: Game, x: number, y: number): number[] {
  const spots = mobSpots(g, x, y);
  const out: number[] = [];
  for (const d of g.defenders) {
    const def = DEFENDERS[d.species];
    if (d.hp <= 0 || def.kind !== 'zap') continue;
    if (spots.some((s) => g.world.isWet(s.x, s.y) && Math.hypot(d.x + 0.5 - s.x, d.y + 0.5 - s.y) <= def.range)) out.push(d.id);
  }
  return out;
}

/**
 * One pulse. A ray stays on the walker it is shocking while it is in reach (switching to whichever
 * stepped closest would spread the damage over a whole line and kill nothing); otherwise it takes
 * the nearest. A shock travels only through water: the thief must stand in it or at its edge
 * (wet ground, DESIGN.md §4), never on dry land and never a gull in the air (one sitting on the
 * water, retching or robbing a flockmate, is in it).
 */
function zap(g: Game, d: Defender, def: ZapDef): boolean {
  const cx = d.x + 0.5, cy = d.y + 0.5;
  const ok = (t: Thief) => alive(t) && (!THIEVES[t.kind].flies || landed(t)) && g.world.isWet(t.x, t.y) && Math.hypot(t.x - cx, t.y - cy) <= def.range;
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
