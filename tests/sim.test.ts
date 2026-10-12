// The sim's rules, one at a time: fishing rates by tile (DESIGN.md §3), placement (§4), thieves
// and the ways out (§5), pufferfish, electric rays, terrapins, claws (§4), lures (§6), stealing
// and getting crates back, sending a wave early (§2), the run's end, and that a save (seed + command log)
// replays to the same state.
import { describe, expect, it } from 'vitest';
import { Game, type Thief, type Defender } from '../src/sim/Game';
import { Bot } from '../src/sim/bot';
import { lineOffsets } from '../src/sim/systems/thieves';
import { THIEVES } from '../src/data/thieves';
import { PUFFER, RAY, TURTLE } from '../src/data/defenders';
import { WORMS } from '../src/data/bait';
import { RULES } from '../src/data/rules';
import { WAVES, SPAWN_GAP } from '../src/data/waves';
import { SPECIES, type SpeciesId } from '../src/data/species';

/** A thief placed by hand at road index i, walking toward the smokehouse. */
function put(g: Game, kind: Thief['kind'], i: number, extra: Partial<Thief> = {}): Thief {
  const p = g.world.pathPt(i);
  const d = THIEVES[kind];
  const t: Thief = {
    id: g.id(), kind, x: p.x, y: p.y, hp: d.hp, maxHp: d.hp, pathI: i + 1, exitI: 0, carrying: 0, mode: 'road',
    lure: 0, eatLeft: 0, turtle: 0, worryLeft: 0, fed: [], stunT: 0, poison: 0, poisonT: 0, grabbing: 0, mobOf: 0, mobX: 0, mobY: 0, mobT: 0,
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
  g.waveStats.push({ wave: 1, leaks: 0, stolen: 0, recovered: 0, escaped: 0, killed: 0, mobbed: 0 });
  return g;
}

const secs = (g: Game, s: number) => { for (let i = 0; i < Math.round(s * 60); i++) g.step(); };
const rate = (g: Game, s: SpeciesId, x: number, y: number) => g.biteTable({ x, y }).find((b) => b.s === s)?.rate ?? 0;

describe('fishing (DESIGN.md §3)', () => {
  it('open sand: puffers x0.8, rays x1; by the dock: puffers x1.3, rays x0.5; by the reeds: puffers x0.8 and terrapins', () => {
    const g = new Game(1);
    expect(g.world.habitat(g.world.idx(14, 7))).toBe('open');
    expect(rate(g, 'puffer', 14, 7)).toBeCloseTo(2.0 * 0.8);
    expect(rate(g, 'ray', 14, 7)).toBeCloseTo(SPECIES.ray.rates.shallows!);
    expect(g.world.habitat(g.world.idx(15, 9))).toBe('dock');
    expect(rate(g, 'puffer', 15, 9)).toBeCloseTo(2.0 * 1.3);
    expect(rate(g, 'ray', 15, 9)).toBeCloseTo(SPECIES.ray.rates.shallows! * 0.5);
    expect(g.biteTable({ x: 14, y: 7 }).some((b) => b.s === 'turtle')).toBe(false);
    expect(g.biteTable({ x: 15, y: 9 }).some((b) => b.s === 'turtle')).toBe(false);
    // by the reeds a terrapin bites, on the tier-1 line too, and puffers thin out (the marsh edge is the terrapin's)
    expect(g.world.habitat(g.world.idx(23, 10))).toBe('reeds');
    expect(rate(g, 'turtle', 23, 10)).toBeCloseTo(SPECIES.turtle.rates.shallows!);
    expect(rate(g, 'puffer', 23, 10)).toBeCloseTo(2.0 * 0.8);
  });
  it('catches ~1.5 fish in a 45 s phase on open sand at tier 1', () => {
    let n = 0;
    const N = 400;
    for (let s = 1; s <= N; s++) {
      const g = new Game(s);
      g.worms = 99;
      g.act({ k: 'cast', x: 14, y: 7 });
      g.run(45 * 60);
      n += g.caught.puffer + g.caught.ray + g.caught.turtle;
    }
    // (1.6 + 0.4) per minute for 0.75 min = 1.5
    expect(n / N).toBeGreaterThan(1.3);
    expect(n / N).toBeLessThan(1.7);
  });
  it('needs a worm per catch, and stops when out of worms or when the live well is full', () => {
    const g = new Game(3);
    g.worms = 2;
    g.act({ k: 'cast', x: 14, y: 7 });
    g.run(60 * 60 * 3);
    expect(g.worms).toBe(0);
    // the ray the run starts with, and two catches
    expect(g.liveWell.filter(Boolean).length).toBe(1 + 2);
    expect(g.fishBlock()).toBe('Out of worms');
    const h = new Game(4);
    h.worms = 99;
    h.act({ k: 'cast', x: 14, y: 7 });
    while (h.liveWell.includes(null)) h.step();
    expect(h.fishBlock()).toBe('Live well full');
  });
  it('the surf rod reaches the point (rays only, where they are common)', () => {
    const g = new Game(5);
    expect(g.canCast(30, 2).ok).toBe(false);
    g.money = 100;
    g.act({ k: 'buy', item: 'rod' });
    const w = g.world;
    const point = [...Array(w.w * w.h).keys()].map((i) => ({ x: i % w.w, y: Math.floor(i / w.w) })).find((p) => w.zone[w.idx(p.x, p.y)] === 'point' && g.canCast(p.x, p.y).ok)!;
    expect(point).toBeTruthy();
    expect(g.biteTable(point).map((b) => b.s)).toEqual(['ray']);
    expect(rate(g, 'ray', point.x, point.y)).toBeGreaterThan(2 * rate(g, 'ray', 14, 7));
    expect(rate(g, 'turtle', 23, 10)).toBeCloseTo(SPECIES.turtle.rates.shallows! * 1.5);
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
    // a puffer it ate on the way still works (no ray reaches the dry trail)
    t.hp = 1;
    t.poison = 5;
    t.poisonT = 1;
    secs(g, 2);
    expect(t.mode).toBe('dead');
    expect(g.crates).toBe(RULES.crates);
    expect(g.money).toBe(money + THIEVES.raccoon.bounty);
  });
});

describe('defenders (DESIGN.md §4)', () => {
  it('a raccoon that comes within a tile of a pufferfish eats it, stands paralysed 4 s and takes 24 poison', () => {
    const g = waveGame();
    fish(g, 'puffer', 18, 11);
    const a = put(g, 'raccoon', 15);
    // index 15 to 17 is 2 tiles: it is in reach after ~1.7 s
    secs(g, 1.8);
    expect(g.defenders.length).toBe(0);
    expect(a.stunT).toBeGreaterThan(3.5);
    const x = a.x;
    secs(g, 3.5);
    expect(a.x).toBe(x);
    expect(a.hp).toBeCloseTo(THIEVES.raccoon.hp - PUFFER.poison, 0);
    expect(a.mode).toBe('road');
  });
  it('a gull snatches a pufferfish too and dies of it; only one thief eats each, and one already paralysed can\'t take another', () => {
    const g = waveGame();
    fish(g, 'puffer', 18, 11);
    const a = put(g, 'gull', 16), b = put(g, 'gull', 15);
    secs(g, 1);
    expect([a, b].filter((t) => t.poison > 0 || t.mode === 'dead').length).toBe(1);
    secs(g, 4);
    expect([a, b].some((t) => t.mode === 'dead')).toBe(true);
    const h = waveGame();
    fish(h, 'puffer', 18, 11);
    const c = put(h, 'raccoon', 17, { stunT: 5 });
    h.step();
    expect(h.defenders.length).toBe(1);
    expect(c.poison).toBe(0);
  });
  it('a ray shocks only the nearest walker, 6/s', () => {
    const g = waveGame();
    fish(g, 'ray', 18, 10);
    const ts = [put(g, 'bear', 18), put(g, 'bear', 19), put(g, 'bear', 17)];
    for (const t of ts) t.stunT = 99; // hold them still
    secs(g, 1);
    const dmg = ts.map((t) => t.maxHp - t.hp).sort((a, b) => b - a);
    expect(dmg[0]).toBeCloseTo(RAY.dps, 0);
    expect(dmg[1]).toBe(0);
    expect(dmg[2]).toBe(0);
  });
  it('a ray can\'t shock a gull in the air', () => {
    const g = waveGame();
    fish(g, 'ray', 18, 10);
    // flying past over the wet road, in reach for most of a second (a stunned gull sits on the water)
    const gull = put(g, 'gull', 17);
    secs(g, 1);
    expect(gull.hp).toBe(THIEVES.gull.hp);
  });
  it('a ray\'s shock travels through water: a walker on dry road in reach takes nothing, one at the water\'s edge does', () => {
    const g = waveGame();
    fish(g, 'ray', 12, 10);
    // road index 12 runs beside the sand strip (dry); index 14 touches the shallows (wet)
    expect(g.world.isWet(12.5, 12.5)).toBe(false);
    expect(g.world.isWet(14.5, 12.5)).toBe(true);
    const dry = put(g, 'bear', 12, { stunT: 99 });
    secs(g, 2);
    expect(dry.hp).toBe(THIEVES.bear.hp);
    const wet = put(g, 'bear', 14, { stunT: 99 });
    secs(g, 2);
    expect(THIEVES.bear.hp - wet.hp).toBeCloseTo(2 * RAY.dps, 0);
  });
  it('gulls come in flocks of three, 0.3 s apart, the wave\'s gap between flocks', () => {
    const g = new Game(1);
    g.wave = 2;
    g.act({ k: 'call' });
    const ticks: number[] = [];
    while (ticks.length < 4) { const n = g.thieves.length; g.step(); if (g.thieves.length > n) ticks.push(g.tick); }
    expect(ticks[1] - ticks[0]).toBeCloseTo(SPAWN_GAP.flock * 60, -1);
    expect(ticks[2] - ticks[1]).toBeCloseTo(SPAWN_GAP.flock * 60, -1);
    expect(ticks[3] - ticks[2]).toBeCloseTo((WAVES[2].gap ?? SPAWN_GAP.seconds) * 60, -1);
  });
  it('a gull that snatches a pufferfish drops onto the water; flockmates within 2.5 tiles land round it to rob it for 6 s, then fly on', () => {
    const g = waveGame();
    fish(g, 'puffer', 18, 11);
    const a = put(g, 'gull', 17), b = put(g, 'gull', 15), c = put(g, 'gull', 11);
    g.step();
    expect(a.stunT).toBeGreaterThan(0);
    expect(g.world.isWet(a.x, a.y)).toBe(true);
    expect(b.mode).toBe('mob');
    expect(c.mode).toBe('road');
    expect(g.stats.mobbed).toBe(1);
    secs(g, 1);
    expect(g.world.isWet(b.x, b.y)).toBe(true);
    secs(g, THIEVES.gull.mobTime);
    expect(b.mode).toBe('road');
    expect(b.hp).toBe(THIEVES.gull.hp);
  });
  it('a ray beside the pufferfish shocks the gulls sitting on the water', () => {
    const g = waveGame();
    fish(g, 'puffer', 18, 11);
    fish(g, 'ray', 19, 10);
    put(g, 'gull', 17);
    const b = put(g, 'gull', 15);
    secs(g, THIEVES.gull.mobTime);
    expect(b.hp).toBeLessThan(THIEVES.gull.hp);
  });
  it('fish wear out: a tenth of an HP a second back between waves', () => {
    const g = new Game(1);
    const r = fish(g, 'ray', 18, 10);
    r.hp = 5;
    secs(g, 10);
    expect(r.hp).toBeCloseTo(5 + RAY.regen * 10, 1);
    expect(RAY.regen).toBeLessThanOrEqual(0.1);
  });
  it('a walker claws a ray 1 tile from the road as it passes; 2 tiles out it is safe', () => {
    const g = waveGame();
    const near = fish(g, 'ray', 18, 11);
    const far = fish(g, 'ray', 21, 10);
    put(g, 'bear', 14);
    secs(g, 12);
    expect(near.hp).toBeLessThan(RAY.hp - 8);
    expect(far.hp).toBe(RAY.hp);
  });
  it('a raccoon waiting in a line wades out and claws a ray 2 tiles away, slowly', () => {
    const g = waveGame();
    const r = fish(g, 'ray', 14, 10);
    const t = put(g, 'raccoon', 15, { mode: 'queue', stunT: 0 });
    t.x = g.world.pathBack(16, THIEVES.raccoon.len).x;
    // stood in a lure's line: fake the lure it waits for
    g.lures.push({ id: 999, x: 16, y: 12, roadI: 16, bait: 'worm', food: 1e9, eater: 0, queue: [t.id] });
    t.lure = 999;
    t.hp = 1e6;
    t.maxHp = 1e6;
    g.lures[0].eater = put(g, 'raccoon', 16, { mode: 'eat', lure: 999, eatLeft: 1e9, hp: 1e6, maxHp: 1e6 }).id;
    secs(g, 2);
    expect(t.grabbing).toBe(r.id);
    expect(RAY.hp - r.hp).toBeCloseTo(2 * THIEVES.raccoon.wadeDps, 0);
  });
  it('raccoons line up at a terrapin: one worries it 4 s, gnawing, while the rest wait a body length apart', () => {
    const g = waveGame();
    const tur = fish(g, 'turtle', 12, 12);
    const rs = [put(g, 'raccoon', 8), put(g, 'raccoon', 7), put(g, 'raccoon', 6)];
    secs(g, 4);
    expect(rs[0].mode).toBe('worry');
    expect(rs.slice(1).every((t) => t.mode === 'wait')).toBe(true);
    const len = THIEVES.raccoon.len;
    expect(tur.x + 0.5 - rs[0].x).toBeCloseTo(0.5 + len / 2, 1);
    expect(rs[0].x - rs[1].x).toBeCloseTo(len, 1);
    secs(g, 16);
    expect(rs.every((t) => t.mode === 'road' && t.x > 13)).toBe(true);
    expect(TURTLE.hp - tur.hp).toBeCloseTo(3 * 4 * TURTLE.gnaw.raccoon!, 0);
  });
  it('a bear shoves a terrapin aside in 3 s and does it no harm; a gull flies over', () => {
    const g = waveGame();
    const tur = fish(g, 'turtle', 12, 12);
    const b = put(g, 'bear', 10);
    const gull = put(g, 'gull', 10);
    secs(g, 1.5);
    expect(b.mode).toBe('worry');
    expect(gull.x).toBeGreaterThan(13);
    secs(g, 4);
    expect(b.mode).toBe('road');
    expect(tur.hp).toBe(TURTLE.hp);
  });
  it('lines are spaced by the animals\' lengths', () => {
    const g = waveGame();
    const a = put(g, 'raccoon', 5), b = put(g, 'bear', 4);
    expect(lineOffsets(g, [a.id, b.id], () => 0)).toEqual([0, (THIEVES.raccoon.len + THIEVES.bear.len) / 2]);
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
    expect(a.x - b.x).toBeCloseTo(THIEVES.raccoon.len, 1);
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
  it('sends the next wave at once, for nothing (no bonus for the time left)', () => {
    const g = new Game(1);
    const m = g.money;
    g.act({ k: 'call' });
    expect(g.money).toBe(m);
    expect(g.liveWell[0]).toBe('ray');
    g.step();
    expect(g.phase).toBe('wave');
  });
  it('the worm bed makes a worm every 30 s, up to 12', () => {
    const g = new Game(1);
    g.money = 100;
    g.act({ k: 'buy', item: 'wormbed' });
    const w = g.worms;
    secs(g, 45.1);
    expect(g.worms).toBe(w + 1);
    expect(WORMS.period).toBe(30);
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
