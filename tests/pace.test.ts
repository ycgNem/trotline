// The pace tests: DESIGN.md §7's lessons, measured as means over many seeds (catches are rolls).
// Floors say a lesson is there; ceilings say the game hasn't gone soft; comparisons say a choice
// matters (the same bot with one thing taken away). Every threshold sits a margin away from the
// measured value (DESIGN.md §7 has them), so a seed's luck can't flip it. If one fails, don't
// loosen it: change the model in DESIGN.md, say why in DECISIONS.md, then change the data.
import { describe, expect, it } from 'vitest';
import { playRun, type Strategy, type BotOpts } from '../src/sim/bot';
import { Game } from '../src/sim/Game';

const N = 200;
const RUNS = 100;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const wave1 = (strategy: Strategy, opts: BotOpts = {}) => {
  const out: number[] = [];
  for (let s = 1; s <= N; s++) out.push(playRun(s, strategy, { untilWave: 1, ...opts }).waveStats[0].leaks);
  return out;
};
const runs = (strategy: Strategy, n: number, opts: BotOpts = {}) => {
  const out: Game[] = [];
  for (let s = 1; s <= n; s++) out.push(playRun(s, strategy, opts));
  return out;
};
const wins = (r: Game[]) => r.filter((g) => g.phase === 'won').length;
const stolen = (r: Game[], w: number) => mean(r.map((g) => g.waveStats[w - 1]?.stolen ?? 0));

describe('DESIGN.md §7: wave 1', () => {
  it('deploy-all leaks 3 or fewer of the 6 raccoons (the live well is for defending)', () => {
    expect(mean(wave1('deployAll'))).toBeLessThanOrEqual(3);
  });
  it('sell-all leaks 5 or more', () => {
    expect(mean(wave1('sellAll'))).toBeGreaterThanOrEqual(5);
  });
  it('one worm on the road\'s midpoint beside the ray cuts leaks by 2 or more', () => {
    // every run starts with a ray, so every seed has the lesson
    const cut = mean(wave1('deployAll', { raySpot: 'mid' })) - mean(wave1('deployAll', { raySpot: 'mid', lureMid: true }));
    expect(cut).toBeGreaterThanOrEqual(2);
  });
});

describe('DESIGN.md §6: where the worm lands', () => {
  /** Wave 1 with only the dawn ray at (19,10) and one worm at (x,12); no line is cast. */
  const worm = (x: number) => {
    const g = new Game(1);
    expect(g.act({ k: 'deploy', slot: 0, x: 19, y: 10 }).ok).toBe(true);
    const ray = g.defenders[0];
    expect(g.act({ k: 'lure', x, y: 12 }).ok).toBe(true);
    g.act({ k: 'call' });
    while (g.wave < 1 || g.phase === 'wave') g.step();
    return { leaks: g.waveStats[0].leaks, hp: g.defenders.includes(ray) ? ray.hp : 0 };
  };
  it('a worm a tile short of the ray stops the wave and spares the ray; beside it, the line wades the ray to death', () => {
    const short = worm(18), beside = worm(19);
    expect(short.leaks).toBeLessThanOrEqual(1);
    expect(short.hp).toBeGreaterThanOrEqual(15);
    expect(beside.hp).toBe(0);
    expect(beside.leaks).toBeGreaterThanOrEqual(short.leaks + 2);
  });
});

describe('DESIGN.md §7: wave 3, the gulls', () => {
  /** Straight to wave 3 with these fish on these tiles; mean leaks over 20 seeds. */
  const gullWave = (fish: [string, number, number][]) => {
    const leaks: number[] = [];
    for (let s = 1; s <= 20; s++) {
      const g = new Game(s);
      g.wave = 2;
      g.liveWell.fill(null);
      for (const [sp, x, y] of fish) { g.liveWell[0] = sp as 'ray'; expect(g.act({ k: 'deploy', slot: 0, x, y }).ok, `${sp} at ${x},${y}`).toBe(true); }
      g.act({ k: 'call' });
      while (g.wave < 3 || g.phase === 'wave') g.step();
      leaks.push(g.waveStats[0].leaks);
    }
    return mean(leaks);
  };
  it('terrapins don\'t stop them (they fly over): three leak 4 or more of the 5', () => {
    expect(gullWave([['turtle', 10, 12], ['turtle', 16, 12], ['turtle', 22, 12]])).toBeGreaterThanOrEqual(4);
  });
  it('rays don\'t stop them (no shock through air): four rays leak all 5', () => {
    expect(gullWave([['ray', 6, 10], ['ray', 10, 10], ['ray', 18, 10], ['ray', 22, 10]])).toBe(5);
  });
  it('a pufferfish apiece stops them: five puffers by the road leak 1 or fewer (measured: none)', () => {
    expect(gullWave([['puffer', 4, 11], ['puffer', 8, 11], ['puffer', 14, 11], ['puffer', 18, 11], ['puffer', 22, 11]])).toBeLessThanOrEqual(1);
  });
});

describe('DESIGN.md §7: the whole run', () => {
  const good = runs('good', RUNS);
  const won = good.filter((g) => g.phase === 'won');
  // thresholds clear the worst of five 100-seed sets (DESIGN.md §7), not just seeds 1-100
  it('the good run wins 65 of 100 or more', () => {
    expect(wins(good)).toBeGreaterThanOrEqual(65);
  });
  it('a won run ends with 8 to 15 crates (the late waves press it)', () => {
    const crates = mean(won.map((g) => g.crates));
    expect(crates).toBeGreaterThanOrEqual(8);
    expect(crates).toBeLessThanOrEqual(15);
  });
  it('wave 1 costs the good run 2 crates or fewer; waves 5-8 cost it 1.5 or more', () => {
    expect(stolen(good, 1)).toBeLessThanOrEqual(2);
    expect(stolen(good, 5) + stolen(good, 6) + stolen(good, 7) + stolen(good, 8)).toBeGreaterThanOrEqual(1.5);
  });
  it('the good run ends with $60 or less unspent (money stays a decision)', () => {
    expect(mean(good.map((g) => g.money))).toBeLessThanOrEqual(60);
  });
  it('fish wear out: the good run loses a fish or more to claws and gnawing', () => {
    expect(mean(good.map((g) => g.stats.lost))).toBeGreaterThanOrEqual(1);
  });
  it('selling matters: the same bot that never sells (the rod first all the same) wins 5 fewer', () => {
    expect(wins(runs('good', RUNS, { noSell: true }))).toBeLessThanOrEqual(wins(good) - 5);
  });
  it('the rod matters: the same bot without it wins 20 fewer', () => {
    expect(wins(runs('good', RUNS, { noRod: true }))).toBeLessThanOrEqual(wins(good) - 20);
  });
  it('the terrapin matters: the same bot that never keeps one wins 5 fewer', () => {
    expect(wins(runs('good', RUNS, { keep: { ray: 99, puffer: 99, turtle: 0 } }))).toBeLessThanOrEqual(wins(good) - 5);
  });
  it('selling everything never wins, and nor does deploying with no worms coming', () => {
    expect(wins(runs('sellAll', 20))).toBe(0);
    expect(wins(runs('deployAll', 20))).toBe(0);
  });
});
