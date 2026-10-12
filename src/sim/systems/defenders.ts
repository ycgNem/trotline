// Defenders: the fish in the water and the terrapin on the road (DESIGN.md §4). A pufferfish is
// snatched by the first thief within a tile, which then retches and sickens; an electric ray
// shocks the nearest thief in reach and the shock jumps on; a terrapin is worried by walkers
// (the thieves system) and cracked only by a bear. Between waves they rest and heal.
import type { Game, Thief, Defender } from '../Game';
import { DEFENDERS, type PoisonDef, type ZapDef } from '../../data/defenders';
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
      if (resting) d.charge = def.charge;
      d.cool -= dt;
      if (d.cool <= 0 && d.charge > 0) {
        if (zap(g, d, def)) { d.cool += def.pulse; d.acted = 0; }
        else d.cool = 0;
      }
    }
  }
  // a snatched pufferfish did its job; a clawed ray or a cracked terrapin is a fish lost
  g.defenders = g.defenders.filter((d) => {
    if (d.hp > 0) return true;
    if (DEFENDERS[d.species].kind !== 'poison') {
      g.stats.lost++;
      g.events.push({ type: 'defenderLost', tick: g.tick, id: d.species, x: d.x + 0.5, y: d.y + 0.5 });
    }
    return false;
  });
}

/** The nearest thief within `trigger` tiles (Chebyshev) eats the pufferfish and is poisoned. */
function snatch(g: Game, d: Defender, def: PoisonDef) {
  const cx = d.x + 0.5, cy = d.y + 0.5;
  let best: Thief | null = null, bd = def.trigger + 1e-6;
  for (const t of g.thieves) {
    if (!alive(t)) continue;
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
 * One pulse: the nearest thief in range, then up to `chain` hops at chainFrac. Every point of
 * damage comes out of the ray's charge; a spent ray waits for the next build phase.
 */
function zap(g: Game, d: Defender, def: ZapDef): boolean {
  const cx = d.x + 0.5, cy = d.y + 0.5;
  const first = nearest(g, cx, cy, def.range, []);
  if (!first) return false;
  const dmg = Math.min(def.dps * def.pulse, d.charge);
  d.charge -= dmg;
  const hit: Thief[] = [first];
  g.events.push({ type: 'zap', tick: g.tick, x: cx, y: cy, x2: first.x, y2: first.y });
  hurt(g, first, dmg);
  let from = first;
  for (let i = 0; i < def.chain && d.charge > 0; i++) {
    const next = nearest(g, from.x, from.y, def.chainRange, hit);
    if (!next) break;
    const jump = Math.min(dmg * def.chainFrac, d.charge);
    d.charge -= jump;
    g.events.push({ type: 'zap', tick: g.tick, x: from.x, y: from.y, x2: next.x, y2: next.y, value: 1 });
    hurt(g, next, jump);
    hit.push(next);
    from = next;
  }
  if (d.charge <= 1e-9) { d.charge = 0; g.events.push({ type: 'spent', tick: g.tick, id: d.species, x: cx, y: cy }); }
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
