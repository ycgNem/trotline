// The pace tests: DESIGN.md §7's lessons, measured as means over 200 seeds (catches are rolls).
// If one fails, don't loosen it: change the model in DESIGN.md, say why in DECISIONS.md, then
// change the data.
import { describe, expect, it } from 'vitest';
import { playRun } from '../src/sim/bot';
import { Game } from '../src/sim/Game';

const N = 200;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const wave1 = (strategy: 'deployAll' | 'sellAll', opts = {}) => {
  const out: { leaks: number; eel: boolean }[] = [];
  for (let s = 1; s <= N; s++) {
    const g = playRun(s, strategy, { untilWave: 1, ...opts });
    out.push({ leaks: g.waveStats[0].leaks, eel: g.caught.eel > 0 });
  }
  return out;
};

describe('DESIGN.md §7: wave 1', () => {
  const deploy = wave1('deployAll');
  const sell = wave1('sellAll');
  it('deploy-all leaks 3 or fewer (the live well is for defending)', () => {
    expect(mean(deploy.map((r) => r.leaks))).toBeLessThanOrEqual(3);
  });
  it('sell-all leaks 5 or more', () => {
    expect(mean(sell.map((r) => r.leaks))).toBeGreaterThanOrEqual(5);
  });
  it('one worm at the road\'s midpoint beside the eel cuts leaks by 2 or more', () => {
    const without = wave1('deployAll', { eelSpot: 'mid' });
    const withLure = wave1('deployAll', { eelSpot: 'mid', lureMid: true });
    const has = (i: number) => without[i].eel && withLure[i].eel;
    const idx = without.map((_, i) => i).filter(has);
    expect(idx.length).toBeGreaterThan(N / 2);
    const cut = mean(idx.map((i) => without[i].leaks)) - mean(idx.map((i) => withLure[i].leaks));
    expect(cut).toBeGreaterThanOrEqual(2);
  });
});

describe('DESIGN.md §7: wave 3, gulls fly over turtles', () => {
  it('a turtle-only defense leaks 6 or more of the 10 gulls', () => {
    const leaks: number[] = [];
    for (let s = 1; s <= 20; s++) {
      const g = new Game(s);
      // three turtles on the road, nothing else, straight to wave 3
      g.wave = 2;
      for (const x of [10, 16, 22]) { g.liveWell[0] = 'turtle'; g.act({ k: 'deploy', slot: 0, x, y: 12 }); }
      g.act({ k: 'call' });
      while (g.wave < 3 || g.phase === 'wave') g.step();
      leaks.push(g.waveStats[0].leaks);
    }
    expect(mean(leaks)).toBeGreaterThanOrEqual(6);
  });
});

describe('DESIGN.md §7: the good run', () => {
  it('reaches the end of wave 8 with 8 or more crates', () => {
    const crates: number[] = [];
    let won = 0;
    for (let s = 1; s <= 40; s++) {
      const g = playRun(s, 'good');
      if (g.phase === 'won') won++;
      crates.push(g.phase === 'won' ? g.crates : 0);
    }
    expect(won).toBeGreaterThanOrEqual(36);
    expect(mean(crates)).toBeGreaterThanOrEqual(8);
  });
});
