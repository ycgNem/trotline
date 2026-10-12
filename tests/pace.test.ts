// The pace tests: DESIGN.md §7's lessons, measured as means over many seeds (catches are rolls).
// Floors say a lesson is there; ceilings say the game hasn't gone soft (the critic's review:
// money that piles up and a defense that snowballs are lessons too). If one fails, don't loosen
// it: change the model in DESIGN.md, say why in DECISIONS.md, then change the data.
import { describe, expect, it } from 'vitest';
import { playRun, type Strategy, type BotOpts } from '../src/sim/bot';
import { Game } from '../src/sim/Game';

const N = 200;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const wave1 = (strategy: Strategy, opts: BotOpts = {}) => {
  const out: { leaks: number; ray: boolean }[] = [];
  for (let s = 1; s <= N; s++) {
    const g = playRun(s, strategy, { untilWave: 1, ...opts });
    out.push({ leaks: g.waveStats[0].leaks, ray: g.caught.ray > 0 });
  }
  return out;
};
const runs = (strategy: Strategy, n: number) => {
  const out: Game[] = [];
  for (let s = 1; s <= n; s++) out.push(playRun(s, strategy));
  return out;
};

describe('DESIGN.md §7: wave 1', () => {
  const deploy = wave1('deployAll');
  const sell = wave1('sellAll');
  it('deploy-all leaks 3 or fewer of the 6 raccoons (the live well is for defending)', () => {
    expect(mean(deploy.map((r) => r.leaks))).toBeLessThanOrEqual(3);
  });
  it('sell-all leaks 5 or more', () => {
    expect(mean(sell.map((r) => r.leaks))).toBeGreaterThanOrEqual(5);
  });
  it('one worm on the road\'s midpoint beside the ray cuts leaks by 2 or more', () => {
    const without = wave1('deployAll', { raySpot: 'mid' });
    const withLure = wave1('deployAll', { raySpot: 'mid', lureMid: true });
    const has = (i: number) => without[i].ray && withLure[i].ray;
    const idx = without.map((_, i) => i).filter(has);
    expect(idx.length).toBeGreaterThan(N / 2);
    const cut = mean(idx.map((i) => without[i].leaks)) - mean(idx.map((i) => withLure[i].leaks));
    expect(cut).toBeGreaterThanOrEqual(2);
  });
});

describe('DESIGN.md §7: wave 3, gulls fly over terrapins', () => {
  it('a terrapin-only defense leaks 6 or more of the 10 gulls', () => {
    const leaks: number[] = [];
    for (let s = 1; s <= 20; s++) {
      const g = new Game(s);
      // three terrapins on the road, nothing else, straight to wave 3
      g.wave = 2;
      for (const x of [10, 16, 22]) { g.liveWell[0] = 'turtle'; g.act({ k: 'deploy', slot: 0, x, y: 12 }); }
      g.act({ k: 'call' });
      while (g.wave < 3 || g.phase === 'wave') g.step();
      leaks.push(g.waveStats[0].leaks);
    }
    expect(mean(leaks)).toBeGreaterThanOrEqual(6);
  });
});

describe('DESIGN.md §7: the whole run', () => {
  const good = runs('good', 40);
  it('the good run wins 36 of 40 and ends with 8 or more crates, but not 15 (the late waves press it)', () => {
    expect(good.filter((g) => g.phase === 'won').length).toBeGreaterThanOrEqual(36);
    const crates = mean(good.map((g) => (g.phase === 'won' ? g.crates : 0)));
    expect(crates).toBeGreaterThanOrEqual(8);
    expect(crates).toBeLessThanOrEqual(15);
  });
  it('the good run ends with $150 or less unspent (money stays a decision)', () => {
    expect(mean(good.map((g) => g.money))).toBeLessThanOrEqual(150);
  });
  it('deploying every fish with the worm bed but never buying the surf rod wins 40% or fewer (the rod and its terrapins matter)', () => {
    const r = runs('deployBed', 40);
    expect(r.filter((g) => g.phase === 'won').length).toBeLessThanOrEqual(16);
  });
  it('selling everything never wins', () => {
    expect(runs('sellAll', 20).filter((g) => g.phase === 'won').length).toBe(0);
  });
});
