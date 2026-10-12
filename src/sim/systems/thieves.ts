// Thieves: walk the road, leave it for a lure that tempts them, stop and chew a turtle in their
// way, take crates at the smokehouse and carry them back out (DESIGN.md §5, §6). Damage and
// bounty live here too, since a stopped thief is a thief event.
import type { Game, Thief } from '../Game';
import { THIEVES } from '../../data/thieves';
import { DEFENDERS } from '../../data/defenders';

const ARRIVE = 0.05;

export function tickThieves(g: Game, dt: number) {
  for (const t of g.thieves) {
    if (t.mode === 'dead' || t.mode === 'gone') continue;
    t.hitT += dt;
    const d = THIEVES[t.kind];
    switch (t.mode) {
      case 'road':
        if (pullToLure(g, t)) break;
        if (!d.flies && blockedByTurtle(g, t)) break;
        walkRoad(g, t, d.speed * dt);
        break;
      case 'toLure': {
        const l = g.lures.find((q) => q.id === t.lure);
        if (!l) { rejoin(g, t); break; }
        const lx = l.x + 0.5, ly = l.y + 0.5;
        const dist = Math.hypot(lx - t.x, ly - t.y);
        // the eater stands on the lure; the queue waits a step short of it
        const stop = l.eater === 0 ? 0 : 0.7;
        if (dist <= stop + ARRIVE) {
          if (l.eater === 0) {
            l.eater = t.id;
            t.mode = 'eat';
            t.eatLeft = d.eat;
            g.events.push({ type: 'eat', tick: g.tick, id: t.kind, x: t.x, y: t.y });
          } else {
            t.mode = 'queue';
            l.queue.push(t.id);
          }
        } else moveToward(t, lx, ly, Math.min(d.speed * dt, dist - stop));
        break;
      }
      case 'eat': {
        const l = g.lures.find((q) => q.id === t.lure);
        if (!l) { rejoin(g, t); break; }
        t.eatLeft -= dt;
        l.food -= dt;
        if (t.eatLeft <= 0 || l.food <= 0) {
          t.fed.push(l.id);
          l.eater = 0;
          rejoin(g, t);
        }
        break;
      }
      case 'queue':
        // the lures system moves the queue on; a vanished lure sends everyone back to the road
        if (!g.lures.some((q) => q.id === t.lure)) rejoin(g, t);
        break;
      case 'chew': {
        const tur = g.defenders.find((q) => q.id === t.chewing);
        if (!tur || tur.hp <= 0) { t.mode = 'road'; t.chewing = 0; break; }
        tur.hp -= d.chew * dt;
        tur.acted = 0;
        break;
      }
    }
  }
}

/** A walking thief tempted by a lure within its pull radius heads for the nearest one. */
function pullToLure(g: Game, t: Thief): boolean {
  const d = THIEVES[t.kind];
  let best = null as null | { id: number; dist: number };
  for (const l of g.lures) {
    const r = d.pulledBy[l.bait];
    if (!r || l.food <= 0 || t.fed.includes(l.id)) continue;
    const dist = Math.hypot(l.x + 0.5 - t.x, l.y + 0.5 - t.y);
    if (dist <= r && (!best || dist < best.dist)) best = { id: l.id, dist };
  }
  if (!best) return false;
  t.mode = 'toLure';
  t.lure = best.id;
  g.events.push({ type: 'pulled', tick: g.tick, id: t.kind, x: t.x, y: t.y });
  return true;
}

/** A turtle on the road tile ahead stops a walker, which chews it. */
function blockedByTurtle(g: Game, t: Thief): boolean {
  const ahead = t.pathI;
  if (ahead < 0 || ahead >= g.world.path.length) return false;
  const tur = g.defenders.find((q) => q.roadI === ahead && q.hp > 0 && DEFENDERS[q.species].kind === 'block');
  if (!tur) return false;
  const c = g.world.pathPt(ahead);
  if (Math.hypot(c.x - t.x, c.y - t.y) > 0.8) return false;
  t.mode = 'chew';
  t.chewing = tur.id;
  g.events.push({ type: 'chew', tick: g.tick, id: t.kind, x: t.x, y: t.y });
  return true;
}

function walkRoad(g: Game, t: Thief, step: number) {
  const w = g.world;
  while (step > 0) {
    let tx: number, ty: number;
    if (t.pathI >= w.path.length) ({ x: tx, y: ty } = w.door);
    else if (t.pathI < 0) { const p = w.pathPt(0); tx = p.x - 1.5; ty = p.y; }
    else ({ x: tx, y: ty } = w.pathPt(t.pathI));
    const dist = Math.hypot(tx - t.x, ty - t.y);
    if (dist > step) { moveToward(t, tx, ty, step); return; }
    t.x = tx;
    t.y = ty;
    step -= dist;
    if (t.pathI >= w.path.length) { steal(g, t); return; }
    if (t.pathI < 0) { escape(g, t); return; }
    t.pathI += t.dir;
  }
}

function moveToward(t: Thief, tx: number, ty: number, step: number) {
  const dx = tx - t.x, dy = ty - t.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return;
  const k = Math.min(1, step / dist);
  t.x += dx * k;
  t.y += dy * k;
  if (Math.abs(dx) > 0.01) t.facing = dx > 0 ? 1 : -1;
}

/** Back on the road from a lure: at the road tile nearest, carrying on the way it was going. */
function rejoin(g: Game, t: Thief) {
  t.mode = 'road';
  t.lure = 0;
  t.eatLeft = 0;
  const i = g.world.nearestPathIndex(t.x, t.y);
  t.pathI = i;
}

function steal(g: Game, t: Thief) {
  const d = THIEVES[t.kind];
  const take = Math.min(d.crates, g.crates);
  g.crates -= take;
  t.carrying = take;
  t.dir = -1;
  t.pathI = g.world.path.length - 1;
  g.stats.leaks++;
  g.stats.stolen += take;
  const ws = g.waveStats[g.waveStats.length - 1];
  if (ws) { ws.leaks++; ws.stolen += take; }
  g.events.push({ type: 'steal', tick: g.tick, id: t.kind, x: t.x, y: t.y, value: take });
}

function escape(g: Game, t: Thief) {
  t.mode = 'gone';
  if (t.carrying) {
    g.stats.escaped += t.carrying;
    const ws = g.waveStats[g.waveStats.length - 1];
    if (ws) ws.escaped += t.carrying;
    g.events.push({ type: 'escape', tick: g.tick, id: t.kind, x: t.x, y: t.y, value: t.carrying });
  }
}

/** Damage a thief; a thief brought to 0 is stopped: bounty paid, crates it carried put back. */
export function hurt(g: Game, t: Thief, dmg: number) {
  if (t.mode === 'dead' || t.mode === 'gone' || dmg <= 0) return;
  t.hp -= dmg;
  t.hitT = 0;
  if (t.hp > 0) return;
  const d = THIEVES[t.kind];
  t.mode = 'dead';
  g.money += d.bounty;
  g.stats.killed++;
  g.stats.earned += d.bounty;
  const ws = g.waveStats[g.waveStats.length - 1];
  if (ws) ws.killed++;
  g.events.push({ type: 'kill', tick: g.tick, id: t.kind, x: t.x, y: t.y, value: d.bounty });
  if (t.carrying) {
    g.crates += t.carrying;
    g.stats.recovered += t.carrying;
    if (ws) ws.recovered += t.carrying;
    g.events.push({ type: 'recover', tick: g.tick, x: t.x, y: t.y, value: t.carrying });
    t.carrying = 0;
  }
  // free its place at a lure
  for (const l of g.lures) {
    if (l.eater === t.id) l.eater = 0;
    l.queue = l.queue.filter((q) => q !== t.id);
  }
}

export function alive(t: Thief) {
  return t.mode !== 'dead' && t.mode !== 'gone';
}
