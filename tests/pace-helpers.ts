// Shared by the pace tests (tests/pace-*.test.ts, split so vitest runs them in parallel): whole runs
// of the reference bot and fixed waves. DESIGN.md §7 has the lessons and the five seed sets every
// threshold was set against.
import { expect } from 'vitest';
import { Bot, type Strategy, type BotOpts } from '../src/sim/bot';
import { Game } from '../src/sim/Game';

/** runs per whole-run measurement */
export const RUNS = 100;
export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** The money in hand as each wave started, per run (the finale's start is the economy's test:
 * what is left at the end is mostly the finale's own bounty). */
export const moneyAt = new WeakMap<Game, number[]>();

/** Whole runs of a bot on seeds 1..n (up to an hour of game time each). */
export const runs = (strategy: Strategy, n: number, opts: BotOpts = {}) => {
  const out: Game[] = [];
  for (let s = 1; s <= n; s++) {
    const g = new Game(s), bot = new Bot(g, strategy, opts), m: number[] = [];
    for (let i = 0; i < 60 * 60 * 60 && !g.over; i++) {
      if (i % 10 === 0) bot.think();
      g.step();
      for (const e of g.events.drain()) if (e.type === 'waveStart') m[(e.value ?? 0) - 1] = g.money;
    }
    moneyAt.set(g, m);
    out.push(g);
  }
  return out;
};
export const wins = (r: Game[]) => r.filter((g) => g.phase === 'won').length;
export const stolen = (r: Game[], w: number) => mean(r.map((g) => g.waveStats[w - 1]?.stolen ?? 0));
export const stolenIn = (r: Game[], from: number, to: number) => {
  let n = 0;
  for (let w = from; w <= to; w++) n += stolen(r, w);
  return n;
};

/** The first wave each run bought this in (the build before wave n counts as n), or 99 if never. */
export function boughtBy(g: Game, item: string): number {
  const e = g.log.find((q) => q.c.k === 'buy' && q.c.item === item);
  if (!e) return 99;
  let w = 1;
  for (let i = 0; i < g.waveStats.length; i++) if (e.t >= g.waveStats[i].start) w = i + 2;
  return w;
}

export type Placed = [string, number, number];

/** Straight to wave `n` with these fish on these tiles (and `pre` run first); what the wave stole. */
export function fixedWave(n: number, fish: Placed[], pre: (g: Game) => void = () => {}, seeds = 20) {
  const leaks: number[] = [], crates: number[] = [], bears: number[] = [];
  for (let s = 1; s <= seeds; s++) {
    const g = new Game(s);
    g.wave = n - 1;
    g.liveWell.fill(null);
    for (const [sp, x, y] of fish) { g.liveWell[0] = sp as 'ray'; expect(g.act({ k: 'deploy', slot: 0, x, y }).ok, `${sp} at ${x},${y}`).toBe(true); }
    pre(g);
    g.act({ k: 'call' });
    let b = 0;
    while (g.wave < n || g.phase === 'wave') {
      g.step();
      for (const e of g.events.drain()) if (e.type === 'steal' && e.id === 'bear') b += e.value ?? 0;
    }
    leaks.push(g.waveStats[0].leaks);
    crates.push(g.waveStats[0].stolen);
    bears.push(b);
  }
  return { leaks: mean(leaks), stolen: mean(crates), byBears: mean(bears) };
}

export const FOUR_RAYS: Placed[] = [['ray', 6, 10], ['ray', 10, 10], ['ray', 18, 10], ['ray', 22, 10]];
