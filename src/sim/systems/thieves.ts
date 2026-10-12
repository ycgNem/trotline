// Thieves (DESIGN.md §5, §6): walk the shore road to the smokehouse; leave it for a lure that
// tempts them; raccoons stop at a terrapin and worry it, one at a time while the rest wait
// behind; walkers claw at a fish within reach (further while they stand waiting: they wade);
// take crates and leave another way (walkers south into the woods, gulls north over the water),
// so a crate comes back only if the thief is stopped before it gets away. Damage, poison and
// bounty live here too.
import type { Game, Thief, Defender } from '../Game';
import { THIEVES } from '../../data/thieves';
import { DEFENDERS, TURTLE } from '../../data/defenders';

const ARRIVE = 0.05;
/** The half tile a terrapin takes up on the road, in front of the animal worrying it. */
const SHELL = 0.5;

/**
 * How far back along the road each animal in a line stands: `first` for the one at the front,
 * then each next one half its length plus half the length of the one ahead further back, so a
 * line reads as animals, not a heap (DESIGN.md §11).
 */
export function lineOffsets(g: Game, ids: number[], first: (len: number) => number): number[] {
  const out: number[] = [];
  let d = 0, prev = 0;
  ids.forEach((id, i) => {
    const t = g.thieves.find((q) => q.id === id);
    const len = t ? THIEVES[t.kind].len : 1;
    d = i === 0 ? first(len) : d + (prev + len) / 2;
    out.push(d);
    prev = len;
  });
  return out;
}

/** Where a newcomer of length `len` would stand at the back of a line. */
function backOf(g: Game, ids: number[], first: (len: number) => number, len: number): number {
  if (!ids.length) return first(len);
  const offs = lineOffsets(g, ids, first);
  const last = g.thieves.find((q) => q.id === ids[ids.length - 1]);
  return offs[offs.length - 1] + ((last ? THIEVES[last.kind].len : 1) + len) / 2;
}

const atWorm = () => 0;

const atShell = (len: number) => SHELL + len / 2;

export function tickThieves(g: Game, dt: number) {
  for (const t of g.thieves) {
    if (!alive(t)) continue;
    t.hitT += dt;
    if (t.poisonT > 0) {
      const dmg = t.poison * Math.min(1, dt / t.poisonT);
      t.poison -= dmg;
      t.poisonT -= dt;
      hurt(g, t, dmg, false);
      if (!alive(t)) continue;
    }
    // retching up a pufferfish: it can't move, eat or claw
    if (t.stunT > 0) {
      t.stunT -= dt;
      continue;
    }
    const d = THIEVES[t.kind];
    switch (t.mode) {
      case 'road':
        if (pullToLure(g, t)) break;
        if (!d.flies && stopAtTurtle(g, t)) break;
        walkRoad(g, t, d.speed * dt);
        break;
      case 'toLure':
      case 'queue':
        atLure(g, t, dt);
        break;
      case 'eat': {
        const l = g.lures.find((q) => q.id === t.lure);
        if (!l || l.food <= 0) { if (l) l.queue = l.queue.filter((q) => q !== t.id); rejoin(g, t); break; }
        t.eatLeft -= dt;
        l.food -= dt;
        if (t.eatLeft <= 0 || l.food <= 0) {
          t.fed.push(l.id);
          if (l.eater === t.id) l.eater = 0;
          l.queue = l.queue.filter((q) => q !== t.id);
          rejoin(g, t);
        }
        break;
      }
      case 'worry':
      case 'wait':
        atTurtle(g, t, dt);
        break;
      case 'exit':
        walkExit(g, t, d.speed * dt);
        break;
    }
    // claws: reaching from the road as it walks, further while it stands in a line (it wades);
    // not while it eats, worries a shell or makes off with crates
    const walking = t.mode === 'road' || t.mode === 'toLure', waiting = t.mode === 'queue' || t.mode === 'wait';
    const reach = walking ? d.reach : waiting ? d.wade : 0;
    const dps = walking ? d.grab : waiting ? d.wadeDps : 0;
    if (dps > 0 && reach > 0 && alive(t)) grab(g, t, dps * dt, reach);
    else t.grabbing = 0;
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

/**
 * At a lure. The first to get there eats; the rest stand in a line back along the road. A gull
 * doesn't wait its turn: it swoops in and swallows the whole worm (laughing gulls steal food).
 */
function atLure(g: Game, t: Thief, dt: number) {
  const l = g.lures.find((q) => q.id === t.lure);
  if (!l || l.food <= 0) { rejoin(g, t); return; }
  const d = THIEVES[t.kind];
  const lx = l.x + 0.5, ly = l.y + 0.5;
  if (d.eat <= 0) {
    const dist = Math.hypot(lx - t.x, ly - t.y);
    if (dist > ARRIVE) { moveToward(t, lx, ly, Math.min(d.speed * dt, dist)); return; }
    l.food = 0;
    t.fed.push(l.id);
    g.events.push({ type: 'swallow', tick: g.tick, id: t.kind, x: lx, y: ly });
    rejoin(g, t);
    return;
  }
  if (l.eater === 0 && (l.queue.length === 0 || l.queue[0] === t.id)) {
    l.eater = t.id;
    l.queue = l.queue.filter((q) => q !== t.id);
  }
  let tx = lx, ty = ly;
  if (l.eater !== t.id) {
    if (!l.queue.includes(t.id)) l.queue.push(t.id);
    // the eater stands on the worm; the line goes back from it
    const line = l.eater ? [l.eater, ...l.queue] : l.queue;
    const p = g.world.pathBack(l.roadI, lineOffsets(g, line, atWorm)[line.indexOf(t.id)]);
    tx = p.x;
    ty = p.y;
  }
  const dist = Math.hypot(tx - t.x, ty - t.y);
  if (dist > ARRIVE) {
    moveToward(t, tx, ty, Math.min(d.speed * dt, dist));
    t.mode = 'toLure';
    return;
  }
  t.x = tx;
  t.y = ty;
  if (l.eater !== t.id) { t.mode = 'queue'; return; }
  t.mode = 'eat';
  t.eatLeft = d.eat;
  g.events.push({ type: 'eat', tick: g.tick, id: t.kind, x: t.x, y: t.y });
}

/** The animals in a terrapin's line: the one worrying it, then the ones waiting. */
function shellLine(tur: Defender) {
  return tur.worrier ? [tur.worrier, ...tur.queue] : tur.queue;
}

/** A raccoon reaching the end of the line at a terrapin ahead of it joins the line (a bear shoves past). */
function stopAtTurtle(g: Game, t: Thief): boolean {
  const w = g.world;
  if (t.pathI >= w.path.length || !TURTLE.worry[t.kind]) return false;
  const toNext = Math.hypot(w.pathPt(t.pathI).x - t.x, w.pathPt(t.pathI).y - t.y);
  const len = THIEVES[t.kind].len;
  let best: Defender | null = null, bestLeft = 1e9;
  for (const q of g.defenders) {
    if (q.hp <= 0 || DEFENDERS[q.species].kind !== 'shell' || q.roadI < t.pathI || t.fed.includes(q.id)) continue;
    // road left to walk to the terrapin's centre, against how far back the next place stands
    const left = toNext + (q.roadI - t.pathI);
    if (left <= backOf(g, shellLine(q), atShell, len) + ARRIVE && left < bestLeft) { best = q; bestLeft = left; }
  }
  if (!best) return false;
  t.mode = 'wait';
  t.turtle = best.id;
  if (best.worrier === 0 && best.queue.length === 0) startWorry(g, t, best);
  else best.queue.push(t.id);
  return true;
}

function startWorry(g: Game, t: Thief, tur: Defender) {
  tur.worrier = t.id;
  t.mode = 'worry';
  t.worryLeft = TURTLE.worry[t.kind] ?? 0;
  g.events.push({ type: 'worry', tick: g.tick, id: t.kind, x: tur.x + 0.5, y: tur.y + 0.5 });
}

/** In a terrapin's line: step up to its place; the one at the front worries the shell, gnawing at it. */
function atTurtle(g: Game, t: Thief, dt: number) {
  const tur = g.defenders.find((q) => q.id === t.turtle);
  if (!tur || tur.hp <= 0) { leaveTurtle(g, t); return; }
  if (tur.worrier === 0 && tur.queue[0] === t.id) {
    tur.queue.shift();
    startWorry(g, t, tur);
  }
  const line = shellLine(tur);
  const p = g.world.pathBack(tur.roadI, lineOffsets(g, line, atShell)[line.indexOf(t.id)]);
  const dist = Math.hypot(p.x - t.x, p.y - t.y);
  if (dist > ARRIVE) {
    moveToward(t, p.x, p.y, Math.min(THIEVES[t.kind].speed * dt, dist));
    return;
  }
  t.x = p.x;
  t.y = p.y;
  // face the terrapin
  const c = g.world.pathPt(tur.roadI);
  if (Math.abs(c.x - t.x) > 0.01) t.facing = c.x > t.x ? 1 : -1;
  if (t.mode !== 'worry') return;
  t.worryLeft -= dt;
  tur.acted = 0;
  const gnaw = TURTLE.gnaw[t.kind] ?? 0;
  if (gnaw > 0) {
    tur.hp -= gnaw * dt;
    if (tur.hp < 0.01) tur.hp = 0;
  }
  if (t.worryLeft <= 0) {
    // it gives up on the shell and walks on past it
    t.fed.push(tur.id);
    tur.worrier = 0;
    leaveTurtle(g, t);
  }
}

function leaveTurtle(g: Game, t: Thief) {
  t.turtle = 0;
  t.worryLeft = 0;
  resumeRoad(g, t);
}

/** A walker claws at the nearest fish in the water within `reach` tiles (Chebyshev). */
function grab(g: Game, t: Thief, dmg: number, reach: number) {
  let best: Defender | null = null, bd = reach + 1e-6;
  for (const d of g.defenders) {
    const def = DEFENDERS[d.species];
    // a pufferfish isn't clawed at: it is snatched whole (the defenders system)
    if (d.hp <= 0 || def.place !== 'water' || def.kind === 'poison') continue;
    const cd = Math.max(Math.abs(d.x + 0.5 - t.x), Math.abs(d.y + 0.5 - t.y));
    if (cd <= bd) { bd = cd; best = d; }
  }
  if (!best) { t.grabbing = 0; return; }
  if (t.grabbing !== best.id) g.events.push({ type: 'grab', tick: g.tick, id: t.kind, x: best.x + 0.5, y: best.y + 0.5 });
  t.grabbing = best.id;
  best.hp -= dmg;
  best.acted = 0;
}

function walkRoad(g: Game, t: Thief, step: number) {
  const w = g.world;
  while (step > 0) {
    const { x: tx, y: ty } = t.pathI >= w.path.length ? w.door : w.pathPt(t.pathI);
    const dist = Math.hypot(tx - t.x, ty - t.y);
    if (dist > step) { moveToward(t, tx, ty, step); return; }
    t.x = tx;
    t.y = ty;
    step -= dist;
    if (t.pathI >= w.path.length) { steal(g, t); return; }
    t.pathI++;
  }
}

/** Away with the crates: walkers down the woods path south, gulls straight north over the bay. */
function walkExit(g: Game, t: Thief, step: number) {
  const w = g.world;
  if (THIEVES[t.kind].flies) {
    t.y -= step;
    if (t.y < -1.5) escape(g, t);
    return;
  }
  while (step > 0) {
    if (t.exitI >= w.exitPath.length) { escape(g, t); return; }
    const p = w.exitPath[t.exitI];
    const dist = Math.hypot(p.x - t.x, p.y - t.y);
    if (dist > step) { moveToward(t, p.x, p.y, step); return; }
    t.x = p.x;
    t.y = p.y;
    step -= dist;
    t.exitI++;
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

/** Back on the road from a lure: at the road tile nearest, carrying on toward the smokehouse. */
function rejoin(g: Game, t: Thief) {
  t.lure = 0;
  t.eatLeft = 0;
  resumeRoad(g, t);
}

/** Walk on from where it stands: toward the next road tile ahead, never back to one behind. */
function resumeRoad(g: Game, t: Thief) {
  t.mode = 'road';
  const w = g.world;
  let i = w.nearestPathIndex(t.x, t.y);
  // already past that tile's centre: don't step back to it
  if (i + 1 < w.path.length) {
    const n = w.pathPt(i + 1);
    if (Math.hypot(n.x - t.x, n.y - t.y) < 1 - ARRIVE) i++;
  }
  t.pathI = i;
}

function steal(g: Game, t: Thief) {
  const d = THIEVES[t.kind];
  const take = Math.min(d.crates, g.crates);
  g.crates -= take;
  t.carrying = take;
  t.mode = 'exit';
  t.exitI = 0;
  g.stats.leaks++;
  g.stats.stolen += take;
  const ws = g.waveStats[g.waveStats.length - 1];
  if (ws) { ws.leaks++; ws.stolen += take; }
  g.events.push({ type: 'steal', tick: g.tick, id: t.kind, x: t.x, y: t.y, value: take });
}

/** A thief that turns back with nothing (a gull hearing its flockmate's alarm): it leaves the way
 * its kind leaves, carrying no crates and paying no bounty (DESIGN.md §4). */
export function scare(g: Game, t: Thief) {
  t.mode = 'exit';
  t.exitI = 0;
  t.lure = 0;
  t.carrying = 0;
  g.stats.scared++;
  const ws = g.waveStats[g.waveStats.length - 1];
  if (ws) ws.scared++;
  g.events.push({ type: 'scare', tick: g.tick, id: t.kind, x: t.x, y: t.y });
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

/**
 * Damage a thief; one brought to 0 is stopped: bounty paid, crates it carried put back, its
 * place at a lure or a terrapin freed. `flash` false for poison ticking (no white flash).
 */
export function hurt(g: Game, t: Thief, dmg: number, flash = true) {
  if (!alive(t) || dmg <= 0) return;
  t.hp -= dmg;
  if (flash) t.hitT = 0;
  if (t.hp > 0) return;
  const d = THIEVES[t.kind];
  t.mode = 'dead';
  t.grabbing = 0;
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
  for (const l of g.lures) {
    if (l.eater === t.id) l.eater = 0;
    l.queue = l.queue.filter((q) => q !== t.id);
  }
  for (const q of g.defenders) {
    if (q.worrier === t.id) q.worrier = 0;
    q.queue = q.queue.filter((id) => id !== t.id);
  }
}

export function alive(t: Thief) {
  return t.mode !== 'dead' && t.mode !== 'gone';
}
