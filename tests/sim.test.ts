// The sim's rules, one at a time: fishing rates (DESIGN.md §3), placement (§4), thieves, turtles,
// pufferfish, eels, lures (§5, §6), stealing and getting crates back, call-early (§2), the run's
// end, and that a save (seed + command log) replays to the same state.
import { describe, expect, it } from 'vitest';
import { Game, type Thief } from '../src/sim/Game';
import { Bot } from '../src/sim/bot';
import { THIEVES } from '../src/data/thieves';
import { WORMS } from '../src/data/bait';
import { RULES } from '../src/data/rules';

/** A thief placed by hand at road index i, walking toward the smokehouse. */
function put(g: Game, kind: Thief['kind'], i: number, extra: Partial<Thief> = {}): Thief {
  const p = g.world.pathPt(i);
  const d = THIEVES[kind];
  const t: Thief = { id: g.id(), kind, x: p.x, y: p.y, hp: d.hp, maxHp: d.hp, pathI: i + 1, dir: 1, carrying: 0, mode: 'road', lure: 0, eatLeft: 0, fed: [], chewing: 0, facing: 1, hitT: 99, wave: 1, ...extra };
  g.thieves.push(t);
  return t;
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

describe('fishing (DESIGN.md §3)', () => {
  it('catches ~1.5 pufferfish and ~1.1 eels in a 45 s phase at tier 1 in the shallows', () => {
    let puff = 0, eel = 0;
    const N = 400;
    for (let s = 1; s <= N; s++) {
      const g = new Game(s);
      g.worms = 99;
      g.act({ k: 'cast', x: 15, y: 9 });
      g.run(45 * 60);
      // empty the well as it fills so a full well never stops the line
      puff += g.caught.puffer;
      eel += g.caught.eel;
    }
    expect(puff / N).toBeGreaterThan(1.3);
    expect(puff / N).toBeLessThan(1.7);
    expect(eel / N).toBeGreaterThan(0.95);
    expect(eel / N).toBeLessThan(1.3);
  });
  it('needs a worm per catch, and stops when out of worms or when the live well is full', () => {
    const g = new Game(3);
    g.worms = 2;
    g.act({ k: 'cast', x: 15, y: 9 });
    g.run(60 * 60 * 3);
    expect(g.worms).toBe(0);
    expect(g.liveWell.filter(Boolean).length).toBe(2);
    expect(g.fishBlock()).toBe('Out of worms');
    const h = new Game(4);
    h.worms = 99;
    h.act({ k: 'cast', x: 15, y: 9 });
    while (h.liveWell.includes(null)) h.step();
    expect(h.fishBlock()).toBe('Live well full');
  });
  it('lands no turtle on a tier-1 line, and reaches the point only with tier 2', () => {
    const g = new Game(5);
    expect(g.canCast(30, 2).ok).toBe(false);
    g.money = 100;
    g.act({ k: 'buy', item: 'rod' });
    const spot = new Bot(g, 'good').castSpot('point')!;
    expect(spot).toBeTruthy();
    expect(g.act({ k: 'cast', x: spot.x, y: spot.y }).ok).toBe(true);
    expect(g.biteTable().find((b) => b.s === 'turtle')!.rate).toBeCloseTo(0.5 * 1.5);
  });
  it('fishes at half rate during a wave', () => {
    const g = waveGame();
    g.act({ k: 'cast', x: 15, y: 9 });
    expect(g.biteTable().find((b) => b.s === 'puffer')!.rate).toBeCloseTo(2 * RULES.waveFishing);
  });
});

describe('placement (DESIGN.md §4)', () => {
  const g = new Game(1);
  it('a pufferfish goes in shallow water within 1 tile of the road', () => {
    expect(g.canDeploy('puffer', 18, 11).ok).toBe(true);
    expect(g.canDeploy('puffer', 18, 10).ok).toBe(false);
  });
  it('an eel goes within 2 tiles, never in reeds or deeper water', () => {
    expect(g.canDeploy('eel', 18, 10).ok).toBe(true);
    expect(g.canDeploy('eel', 18, 9).ok).toBe(false);
    expect(g.canDeploy('eel', 25, 11).ok).toBe(false); // reeds
    expect(g.canDeploy('eel', 28, 13).ok).toBe(true); // the bend pool
  });
  it('a turtle goes on the road and nowhere else', () => {
    expect(g.canDeploy('turtle', 20, 12).ok).toBe(true);
    expect(g.canDeploy('turtle', 20, 11).ok).toBe(false);
  });
  it('no two defenders share a tile', () => {
    const h = new Game(1);
    h.liveWell[0] = 'eel';
    h.liveWell[1] = 'puffer';
    expect(h.act({ k: 'deploy', slot: 0, x: 18, y: 11 }).ok).toBe(true);
    expect(h.act({ k: 'deploy', slot: 1, x: 18, y: 11 }).ok).toBe(false);
  });
});

describe('thieves, turtles, pufferfish and eels', () => {
  it('a raccoon walks the road, takes a crate and carries it off; stopping it on the way out gets it back', () => {
    const g = waveGame();
    const t = put(g, 'raccoon', 36);
    secs(g, 5);
    expect(g.crates).toBe(RULES.crates - 1);
    expect(t.carrying).toBe(1);
    expect(t.dir).toBe(-1);
    const money = g.money;
    t.hp = 1;
    g.defenders.push({ id: g.id(), species: 'eel', x: 28, y: 13, hp: 20, maxHp: 20, cool: 0, roadI: -1, acted: 99 });
    secs(g, 30);
    expect(t.mode).toBe('dead');
    expect(g.crates).toBe(RULES.crates);
    expect(g.money).toBe(money + THIEVES.raccoon.bounty);
  });
  it('a turtle stops a raccoon, which chews it at 5/s; a gull flies over', () => {
    const g = waveGame();
    g.liveWell[0] = 'turtle';
    g.act({ k: 'deploy', slot: 0, x: 10, y: 12 });
    const r = put(g, 'raccoon', 5);
    const gull = put(g, 'gull', 5);
    secs(g, 6);
    expect(r.mode).toBe('chew');
    expect(gull.x).toBeGreaterThan(11);
    const tur = g.defenders[0];
    const hp = tur.hp;
    secs(g, 2);
    expect(hp - tur.hp).toBeCloseTo(10, 0);
  });
  it('a pufferfish bursts once for 30 in radius 1.5 when a thief comes within a tile', () => {
    const g = waveGame();
    g.liveWell[0] = 'puffer';
    g.act({ k: 'deploy', slot: 0, x: 18, y: 11 });
    const a = put(g, 'raccoon', 15);
    secs(g, 3);
    expect(g.defenders.length).toBe(0);
    expect(a.hp).toBe(10);
  });
  it('an eel zaps the nearest thief at 4/s and chains to two more at half', () => {
    const g = waveGame();
    g.defenders.push({ id: g.id(), species: 'eel', x: 18, y: 11, hp: 20, maxHp: 20, cool: 0, roadI: -1, acted: 99 });
    const ts = [put(g, 'bear', 18), put(g, 'bear', 19), put(g, 'bear', 17)];
    for (const t of ts) t.mode = 'eat'; // hold them still
    g.lures.push({ id: 999, x: 0, y: 12, roadI: 0, bait: 'worm', food: 1e9, eater: 0, queue: [] });
    for (const t of ts) t.lure = 999;
    t0: {
      secs(g, 1);
      const dmg = ts.map((t) => t.maxHp - t.hp).sort((a, b) => b - a);
      expect(dmg[0]).toBeCloseTo(4, 0);
      expect(dmg[1]).toBeCloseTo(2, 0);
      expect(dmg[2]).toBeCloseTo(2, 0);
      break t0;
    }
  });
});

describe('lures (DESIGN.md §6)', () => {
  it('pulls a raccoon within 4 tiles, feeds it 6 s while the next waits, then both go on', () => {
    const g = waveGame();
    g.act({ k: 'lure', x: 15, y: 12 });
    const a = put(g, 'raccoon', 12), b = put(g, 'raccoon', 11);
    const gull = put(g, 'gull', 12);
    // a is 2.5 tiles out at 1.2 t/s: it starts eating at ~2.1 s and eats until ~8.1 s
    secs(g, 3);
    expect(a.mode).toBe('eat');
    expect(b.mode).toBe('queue');
    expect(gull.mode).toBe('road');
    secs(g, 6);
    expect(b.mode).toBe('eat');
    expect(a.mode).toBe('road');
    expect(a.fed.length).toBe(1);
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
  it('the worm bed makes a worm every 10 s', () => {
    const g = new Game(1);
    g.money = 100;
    g.act({ k: 'buy', item: 'wormbed' });
    const w = g.worms;
    secs(g, 30.1);
    expect(g.worms).toBe(w + 3);
    expect(g.act({ k: 'buy', item: 'wormbed' }).ok).toBe(false);
    expect(WORMS.period).toBe(10);
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
