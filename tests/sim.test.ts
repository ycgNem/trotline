// The sim's rules, one at a time: fishing rates by tile (DESIGN.md §3), placement (§4), thieves
// and the ways out (§5), pufferfish, electric rays, terrapins, claws (§4), lures (§6), stealing
// and getting crates back, call-early (§2), the run's end, and that a save (seed + command log)
// replays to the same state.
import { describe, expect, it } from 'vitest';
import { Game, type Thief, type Defender } from '../src/sim/Game';
import { Bot } from '../src/sim/bot';
import { LINE_FIRST, LINE_STEP } from '../src/sim/systems/thieves';
import { THIEVES } from '../src/data/thieves';
import { PUFFER, RAY, TURTLE } from '../src/data/defenders';
import { WORMS } from '../src/data/bait';
import { RULES } from '../src/data/rules';
import type { SpeciesId } from '../src/data/species';

/** A thief placed by hand at road index i, walking toward the smokehouse. */
function put(g: Game, kind: Thief['kind'], i: number, extra: Partial<Thief> = {}): Thief {
  const p = g.world.pathPt(i);
  const d = THIEVES[kind];
  const t: Thief = {
    id: g.id(), kind, x: p.x, y: p.y, hp: d.hp, maxHp: d.hp, pathI: i + 1, exitI: 0, carrying: 0, mode: 'road',
    lure: 0, eatLeft: 0, turtle: 0, worryLeft: 0, fed: [], stunT: 0, poison: 0, poisonT: 0, grabbing: 0,
    facing: 1, hitT: 99, wave: 1, ...extra,
  };
  g.thieves.push(t);
  return t;
}

/** A defender placed by hand (no live-well slot needed). */
function fish(g: Game, species: SpeciesId, x: number, y: number): Defender {
  g.liveWell[0] = species;
  const r = g.act({ k: 'deploy', slot: 0, x, y });
  if (!r.ok) throw new Error(r.why);
  return g.defenders[g.defenders.length - 1];
}

/** A game in its first wave with nothing spawning, so tests control every thief. */
function waveGame(seed = 1) {
  const g = new Game(seed);
  g.phase = 'wave';
  g.wave = 1;
  g.waveStats.push({ wave: 1, leaks: 0, stolen: 0, recovered: 0, escaped: 0, killed: 0 });
  return g;
}

const secs = (g: Game, s: number) => { for (let i = 0; i < Math.round(s * 60); i++) g.step(); };
const rate = (g: Game, s: SpeciesId, x: number, y: number) => g.biteTable({ x, y }).find((b) => b.s === s)?.rate ?? 0;

describe('fishing (DESIGN.md §3)', () => {
  it('open sand: puffers x0.8, rays x1.3; by the dock: puffers x1.3, rays x0.5; terrapins only by reeds', () => {
    const g = new Game(1);
    expect(rate(g, 'puffer', 14, 7)).toBeCloseTo(2.0 * 0.8);
    expect(rate(g, 'ray', 14, 7)).toBeCloseTo(1.5 * 1.3);
    expect(rate(g, 'puffer', 15, 9)).toBeCloseTo(2.0 * 1.3);
    expect(rate(g, 'ray', 15, 9)).toBeCloseTo(1.5 * 0.5);
    expect(g.biteTable({ x: 14, y: 7 }).some((b) => b.s === 'turtle')).toBe(false);
    // by the reeds a terrapin bites, but the tier-1 line is too light for it
    expect(g.biteTable({ x: 23, y: 10 }).find((b) => b.s === 'turtle')).toEqual({ s: 'turtle', rate: 0, why: 'line too light' });
  });
  it('catches ~2.7 fish in a 45 s phase on open sand at tier 1', () => {
    let n = 0;
    const N = 400;
    for (let s = 1; s <= N; s++) {
      const g = new Game(s);
      g.worms = 99;
      g.act({ k: 'cast', x: 14, y: 7 });
      g.run(45 * 60);
      n += g.caught.puffer + g.caught.ray;
    }
    // (1.6 + 1.95) per minute for 0.75 min = 2.66
    expect(n / N).toBeGreaterThan(2.4);
    expect(n / N).toBeLessThan(2.95);
  });
  it('needs a worm per catch, and stops when out of worms or when the live well is full', () => {
    const g = new Game(3);
    g.worms = 2;
    g.act({ k: 'cast', x: 14, y: 7 });
    g.run(60 * 60 * 3);
    expect(g.worms).toBe(0);
    expect(g.liveWell.filter(Boolean).length).toBe(2);
    expect(g.fishBlock()).toBe('Out of worms');
    const h = new Game(4);
    h.worms = 99;
    h.act({ k: 'cast', x: 14, y: 7 });
    while (h.liveWell.includes(null)) h.step();
    expect(h.fishBlock()).toBe('Live well full');
  });
  it('the surf rod reaches the point (rays only) and lands terrapins by the reeds', () => {
    const g = new Game(5);
    expect(g.canCast(30, 2).ok).toBe(false);
    g.money = 100;
    g.act({ k: 'buy', item: 'rod' });
    const w = g.world;
    const point = [...Array(w.w * w.h).keys()].map((i) => ({ x: i % w.w, y: Math.floor(i / w.w) })).find((p) => w.zone[w.idx(p.x, p.y)] === 'point' && g.canCast(p.x, p.y).ok)!;
    expect(point).toBeTruthy();
    expect(g.biteTable(point).map((b) => b.s)).toEqual(['ray']);
    expect(rate(g, 'turtle', 23, 10)).toBeCloseTo(0.5 * 1.5);
    const spot = new Bot(g, 'good').castSpot('turtle')!;
    expect(rate(g, 'turtle', spot.x, spot.y)).toBeGreaterThan(0);
  });
  it('fishes at half rate during a wave', () => {
    const g = waveGame();
    g.act({ k: 'cast', x: 14, y: 7 });
    expect(g.biteTable().find((b) => b.s === 'puffer')!.rate).toBeCloseTo(2 * 0.8 * RULES.waveFishing);
  });
});

describe('placement (DESIGN.md §4)', () => {
  const g = new Game(1);
  it('a pufferfish goes in shallow water within 1 tile of the road', () => {
    expect(g.canDeploy('puffer', 18, 11).ok).toBe(true);
    expect(g.canDeploy('puffer', 18, 10).ok).toBe(false);
  });
  it('a ray goes within 2 tiles, never in reeds or deeper water', () => {
    expect(g.canDeploy('ray', 18, 10).ok).toBe(true);
    expect(g.canDeploy('ray', 18, 9).ok).toBe(false);
    expect(g.canDeploy('ray', 25, 11).ok).toBe(false); // reeds
    expect(g.canDeploy('ray', 28, 13).ok).toBe(true); // the bend pool
  });
  it('a terrapin goes on the road and nowhere else', () => {
    expect(g.canDeploy('turtle', 20, 12).ok).toBe(true);
    expect(g.canDeploy('turtle', 20, 11).ok).toBe(false);
  });
  it('no two defenders share a tile', () => {
    const h = new Game(1);
    h.liveWell[0] = 'ray';
    h.liveWell[1] = 'puffer';
    expect(h.act({ k: 'deploy', slot: 0, x: 18, y: 11 }).ok).toBe(true);
    expect(h.act({ k: 'deploy', slot: 1, x: 18, y: 11 }).ok).toBe(false);
  });
});

describe('thieves and the ways out (DESIGN.md §5)', () => {
  it('a raccoon takes a crate and leaves south into the woods, not back up the road', () => {
    const g = waveGame();
    const t = put(g, 'raccoon', 36);
    secs(g, 4);
    expect(g.crates).toBe(RULES.crates - 1);
    expect(t.carrying).toBe(1);
    expect(t.mode).toBe('exit');
    const y0 = t.y;
    secs(g, 2);
    expect(t.y).toBeGreaterThan(y0);
    secs(g, 10);
    expect(t.mode).toBe('gone');
    expect(g.stats.escaped).toBe(1);
    expect(g.crates).toBe(RULES.crates - 1);
  });
  it('a gull takes a crate and flies straight north over the bay', () => {
    const g = waveGame();
    const t = put(g, 'gull', 36);
    secs(g, 2);
    expect(t.mode).toBe('exit');
    const x0 = t.x, y0 = t.y;
    secs(g, 1);
    expect(t.x).toBeCloseTo(x0);
    expect(t.y).toBeLessThan(y0 - 2);
  });
  it('a thief stopped before it gets away gives its crates back and pays its bounty', () => {
    const g = waveGame();
    const t = put(g, 'raccoon', 36);
    secs(g, 4);
    expect(t.carrying).toBe(1);
    const money = g.money;
    t.hp = 1;
    g.defenders.push({ id: g.id(), species: 'ray', x: 33, y: 18, hp: 20, maxHp: 20, cool: 0, charge: RAY.charge, roadI: -1, acted: 99, worrier: 0, queue: [] });
    secs(g, 2);
    expect(t.mode).toBe('dead');
    expect(g.crates).toBe(RULES.crates);
    expect(g.money).toBe(money + THIEVES.raccoon.bounty);
  });
});

describe('defenders (DESIGN.md §4)', () => {
  it('a raccoon that comes within a tile of a pufferfish eats it, stands retching 2 s and dies of the poison', () => {
    const g = waveGame();
    fish(g, 'puffer', 18, 11);
    const a = put(g, 'raccoon', 15);
    // index 15 to 17 is 2 tiles: it is in reach after ~1.7 s
    secs(g, 1.8);
    expect(g.defenders.length).toBe(0);
    expect(a.stunT).toBeGreaterThan(1.5);
    const x = a.x;
    secs(g, 1.5);
    expect(a.x).toBe(x);
    expect(a.hp).toBeLessThan(THIEVES.raccoon.hp);
    secs(g, 2);
    expect(a.mode).toBe('dead');
    expect(PUFFER.poison).toBeGreaterThanOrEqual(THIEVES.raccoon.hp);
  });
  it('a gull snatches a pufferfish too, and only one thief eats each', () => {
    const g = waveGame();
    fish(g, 'puffer', 18, 11);
    const a = put(g, 'gull', 16), b = put(g, 'gull', 15);
    secs(g, 1);
    expect([a, b].filter((t) => t.poison > 0 || t.mode === 'dead').length).toBe(1);
  });
  it('a ray shocks the nearest thief at 4/s and the shock jumps to two more at half', () => {
    const g = waveGame();
    fish(g, 'ray', 18, 10);
    const ts = [put(g, 'bear', 18), put(g, 'bear', 19), put(g, 'bear', 17)];
    for (const t of ts) t.stunT = 99; // hold them still
    secs(g, 1);
    const dmg = ts.map((t) => t.maxHp - t.hp).sort((a, b) => b - a);
    expect(dmg[0]).toBeCloseTo(4, 0);
    expect(dmg[1]).toBeCloseTo(2, 0);
    expect(dmg[2]).toBeCloseTo(2, 0);
  });
  it('a ray is spent after 140 damage in a wave and full again for the next', () => {
    const g = waveGame();
    const r = fish(g, 'ray', 18, 10);
    const t = put(g, 'bear', 18, { stunT: 999, hp: 1000, maxHp: 1000 });
    secs(g, 60);
    expect(1000 - t.hp).toBeCloseTo(RAY.charge, 0);
    expect(r.charge).toBe(0);
    t.hp = 0;
    t.mode = 'dead';
    g.phase = 'build';
    g.step();
    expect(r.charge).toBe(RAY.charge);
  });
  it('a raccoon claws a ray 1 tile from the road as it passes; 2 tiles out it is safe', () => {
    const g = waveGame();
    const near = fish(g, 'ray', 18, 11);
    const far = fish(g, 'ray', 21, 10);
    near.charge = far.charge = 0; // no shocks, so the raccoon walks the whole way
    put(g, 'raccoon', 14);
    secs(g, 8);
    expect(near.hp).toBeLessThan(RAY.hp - 5);
    expect(far.hp).toBe(RAY.hp);
  });
  it('raccoons line up at a terrapin: one worries it 2 s while the rest wait behind, then they walk on', () => {
    const g = waveGame();
    const tur = fish(g, 'turtle', 12, 12);
    const rs = [put(g, 'raccoon', 8), put(g, 'raccoon', 7), put(g, 'raccoon', 6)];
    secs(g, 4);
    expect(rs[0].mode).toBe('worry');
    expect(rs.slice(1).every((t) => t.mode === 'wait')).toBe(true);
    // the line doesn't overlap
    expect(Math.abs(rs[1].x - rs[0].x)).toBeCloseTo(LINE_STEP, 1);
    expect(Math.abs(rs[0].x - (tur.x + 0.5))).toBeCloseTo(LINE_FIRST, 1);
    secs(g, 9);
    expect(rs.every((t) => t.mode === 'road' && t.x > 13)).toBe(true);
    expect(tur.hp).toBe(TURTLE.hp);
  });
  it('a bear cracks a terrapin in its 20 s of worrying; a gull flies over', () => {
    const g = waveGame();
    const tur = fish(g, 'turtle', 12, 12);
    const b = put(g, 'bear', 10);
    const gull = put(g, 'gull', 10);
    secs(g, 3);
    expect(b.mode).toBe('worry');
    expect(gull.x).toBeGreaterThan(14);
    secs(g, 10);
    expect(tur.hp).toBeLessThan(TURTLE.hp * 0.6);
    secs(g, 12);
    expect(g.defenders.length).toBe(0);
    expect(b.mode).toBe('road');
  });
});

describe('lures (DESIGN.md §6)', () => {
  it('pulls a raccoon within 4 tiles, feeds it 6 s while the next waits a step back, then both go on', () => {
    const g = waveGame();
    g.act({ k: 'lure', x: 15, y: 12 });
    const a = put(g, 'raccoon', 12), b = put(g, 'raccoon', 11);
    secs(g, 3.5);
    expect(a.mode).toBe('eat');
    expect(b.mode).toBe('queue');
    expect(a.x - b.x).toBeCloseTo(LINE_FIRST, 1);
    secs(g, 6);
    expect(b.mode).toBe('eat');
    expect(a.mode).toBe('road');
    expect(a.fed.length).toBe(1);
  });
  it('a gull within 2 tiles swallows the whole lure', () => {
    const g = waveGame();
    g.act({ k: 'lure', x: 15, y: 12 });
    put(g, 'gull', 11);
    secs(g, 2);
    expect(g.lures.length).toBe(0);
    expect(g.stats.lures).toBe(1);
  });
  it('costs a worm, lands only on the road in reach, and runs out after 36 thief-seconds', () => {
    const g = waveGame();
    const w = g.worms;
    expect(g.act({ k: 'lure', x: 15, y: 11 }).ok).toBe(false);
    expect(g.act({ k: 'lure', x: 2, y: 12 }).ok).toBe(false);
    expect(g.act({ k: 'lure', x: 15, y: 12 }).ok).toBe(true);
    expect(g.worms).toBe(w - 1);
    for (let i = 0; i < 8; i++) put(g, 'raccoon', 13 - i);
    secs(g, 60);
    expect(g.lures.length).toBe(0);
  });
  it('a lure left on the road spoils when the wave ends', () => {
    const g = new Game(1);
    g.act({ k: 'lure', x: 15, y: 12 });
    g.act({ k: 'call' });
    while (g.wave < 1 || g.phase === 'wave') g.step();
    expect(g.lures.length).toBe(0);
  });
});

describe('the run', () => {
  it('pays a quarter of the next wave\'s bounty for calling it at once', () => {
    const g = new Game(1);
    const m = g.money;
    g.act({ k: 'call' });
    expect(g.money - m).toBe(Math.floor(0.25 * 6 * THIEVES.raccoon.bounty));
    g.step();
    expect(g.phase).toBe('wave');
  });
  it('the worm bed makes a worm every 15 s, up to 12', () => {
    const g = new Game(1);
    g.money = 100;
    g.act({ k: 'buy', item: 'wormbed' });
    const w = g.worms;
    secs(g, 45.1);
    expect(g.worms).toBe(w + 3);
    expect(g.act({ k: 'buy', item: 'wormbed' }).ok).toBe(false);
    secs(g, 600);
    expect(g.worms).toBe(WORMS.cap);
  });
  it('ends when the last crate is gone', () => {
    const g = waveGame();
    g.crates = 1;
    put(g, 'raccoon', 37);
    secs(g, 3);
    expect(g.crates).toBe(0);
    secs(g, 60);
    expect(g.phase).toBe('lost');
  });
  it('replays from its seed and command log to the same state', () => {
    const g = new Game(42);
    const bot = new Bot(g, 'good');
    for (let i = 0; i < 60 * 200; i++) { if (i % 10 === 0) bot.think(); g.step(); }
    const s = g.snapshot();
    const r = Game.replay(s.seed, s.log, s.tick);
    expect(r.tick).toBe(g.tick);
    expect([r.money, r.crates, r.worms, r.wave, r.phase]).toEqual([g.money, g.crates, g.worms, g.wave, g.phase]);
    expect(r.defenders.map((d) => [d.species, d.x, d.y, Math.round(d.hp)])).toEqual(g.defenders.map((d) => [d.species, d.x, d.y, Math.round(d.hp)]));
    expect(r.liveWell).toEqual(g.liveWell);
  });
});
