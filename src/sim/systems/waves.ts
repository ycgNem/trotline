// Waves: the build-phase clock, spawning a wave's thieves one gap apart at the road's west end,
// and ending a wave when every thief in it is stopped or gone; lures spoil then (DESIGN.md §2, §5, §6).
import type { Game, Thief } from '../Game';
import { WAVES, SPAWN_GAP } from '../../data/waves';
import { THIEVES, type ThiefId } from '../../data/thieves';
import { RULES } from '../../data/rules';

export function tickWaves(g: Game, dt: number) {
  if (g.phase === 'build') {
    g.phaseTime -= dt;
    if (g.phaseTime <= 0) startWave(g);
    return;
  }
  if (g.phase !== 'wave') return;
  if (g.spawnQueue.length) {
    g.spawnT -= dt;
    if (g.spawnT <= 0) {
      const kind = g.spawnQueue.shift()!;
      spawn(g, kind);
      // a flock's birds come close together; the wave's gap is between flocks (DESIGN.md §5)
      const k = THIEVES[kind].flock;
      g.flockN = g.flockN + 1 >= k || g.spawnQueue[0] !== kind ? 0 : g.flockN + 1;
      g.spawnT += g.flockN > 0 ? SPAWN_GAP.flock : WAVES[g.wave - 1].gap ?? SPAWN_GAP.seconds;
    }
    return;
  }
  if (g.thieves.some((t) => t.mode !== 'dead' && t.mode !== 'gone')) return;
  endWave(g);
}

export function startWave(g: Game) {
  const w = WAVES[g.wave];
  g.wave++;
  g.phase = 'wave';
  g.phaseTime = 0;
  g.spawnQueue = w.groups.flatMap(([id, n]) => new Array<ThiefId>(n).fill(id));
  g.spawnT = 0;
  g.flockN = 0;
  g.waveStats.push({ wave: g.wave, leaks: 0, stolen: 0, recovered: 0, escaped: 0, killed: 0, mobbed: 0 });
  g.events.push({ type: 'waveStart', tick: g.tick, value: g.wave });
}

function spawn(g: Game, kind: ThiefId) {
  const d = THIEVES[kind];
  const p0 = g.world.pathPt(0);
  const t: Thief = {
    id: g.id(), kind, x: p0.x - 1, y: p0.y, hp: d.hp, maxHp: d.hp, pathI: 0, exitI: 0, carrying: 0, mode: 'road',
    lure: 0, eatLeft: 0, turtle: 0, worryLeft: 0, fed: [], stunT: 0, poison: 0, poisonT: 0, grabbing: 0, mobOf: 0, mobX: 0, mobY: 0, mobT: 0,
    facing: 1, hitT: 99, wave: g.wave,
  };
  g.thieves.push(t);
  g.events.push({ type: 'spawn', tick: g.tick, id: kind, x: t.x, y: t.y });
}

function endWave(g: Game) {
  g.thieves = [];
  // a worm left on the road spoils in the sun: lures are cast for a wave, not placed for the run
  for (const l of g.lures) g.events.push({ type: 'lureGone', tick: g.tick, x: l.x + 0.5, y: l.y + 0.5 });
  g.lures = [];
  for (const d of g.defenders) { d.worrier = 0; d.queue = []; }
  g.events.push({ type: 'waveEnd', tick: g.tick, value: g.wave });
  if (g.wave >= WAVES.length) {
    g.phase = 'won';
    g.events.push({ type: 'won', tick: g.tick });
    return;
  }
  g.phase = 'build';
  g.phaseTime = RULES.buildTime;
}
