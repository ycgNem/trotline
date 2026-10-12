// Whole-run measurement for tuning (DESIGN.md §7): the good bot over a seed range with options, printing
// wins, crates, money, fish, what was bought and when, and crates stolen by wave and thief.
// Usage: npx vite-node scripts/measure.ts -- <from> <to> '<bot opts json>' [label]
// WAVES and PRICES env patch the waves (4-12) and boat costs for tuning; run seed ranges as
// parallel processes (a 12-wave run is ~1-3 s).
import { Bot, type BotOpts } from '../src/sim/bot';
import { Game } from '../src/sim/Game';
import { WAVES } from '../src/data/waves';
import { BOATS } from '../src/data/boats';
// PRICES env: {"rowboat": 50, ...} patched over the boats' costs (tuning only)
if (process.env.PRICES) for (const [k, v] of Object.entries(JSON.parse(process.env.PRICES))) (BOATS as Record<string, { cost: number }>)[k].cost = v as number;

// WAVES env: a JSON array of [groups, gap] for waves 4-12, patched over the data (tuning only)
if (process.env.WAVES) {
  const ws = JSON.parse(process.env.WAVES) as [[string, number][], number][];
  ws.forEach(([groups, gap], i) => { WAVES[3 + i] = { groups: groups as never, gap, derivation: 'tuning' }; });
  WAVES.length = 3 + ws.length;
}

const args = process.argv.slice(2).filter((a) => a !== '--');
const from = Number(args[0] ?? 1), to = Number(args[1] ?? 20);
const opts: BotOpts = JSON.parse(args[2] ?? '{}');
const label = args[3] ?? JSON.stringify(opts);
const t0 = Date.now();
/** Which wave a tick fell in: the build before wave n counts as n. */
function waveAt(g: { waveStats: { start: number }[] }, t: number) {
  let w = 1;
  for (let i = 0; i < g.waveStats.length; i++) if (t >= g.waveStats[i].start) w = i + 2;
  return w;
}
let wins = 0;
const at12: number[] = [];
const crates: number[] = [], money: number[] = [], sold: number[] = [], lost: number[] = [], boatFish: number[] = [], dug: number[] = [], slicks: number[] = [], bait: number[] = [];
const perWave = new Array(12).fill(0);
const lostOn = new Array(13).fill(0);
const bought: Record<string, number[]> = {};
const byKind: Record<string, number> = {};
for (let s = from; s <= to; s++) {
  const g = new Game(s);
  const bot = new Bot(g, 'good', opts);
  for (let i = 0; i < 60 * 60 * 60 && !g.over; i++) {
    if (i % 10 === 0) bot.think();
    g.step();
    for (const e of g.events.drain()) {
      if (e.type === 'waveStart' && e.value === WAVES.length) at12.push(g.money);
      if (e.type !== 'steal') continue; const k = `${g.wave}:${e.id}`; byKind[k] = (byKind[k] ?? 0) + (e.value ?? 0);
    }
  }
  if (g.phase === 'won') { wins++; crates.push(g.crates); } else lostOn[g.wave]++;
  money.push(g.money);
  sold.push(g.stats.sold);
  lost.push(g.stats.lost);
  boatFish.push(g.stats.boatFish);
  dug.push(g.stats.dug);
  slicks.push(g.stats.slicks);
  bait.push(g.stats.baitSpent);
  g.waveStats.forEach((w, i) => (perWave[i] += w.stolen));
  // the wave each thing was bought in (from the command log: a buy's tick against the waves' starts)
  for (const e of g.log) {
    if (e.c.k !== 'buy' || e.c.item === 'worms' || e.c.item === 'chum') continue;
    (bought[e.c.item] ??= []).push(waveAt(g, e.t));
  }
}
const n = to - from + 1;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
console.log(`${label}: wins ${wins}/${n}, crates(won) ${mean(crates).toFixed(1)}, $left ${mean(money).toFixed(0)}, sold ${mean(sold).toFixed(1)}, lost ${mean(lost).toFixed(1)}, boatFish ${mean(boatFish).toFixed(1)}, dug ${mean(dug).toFixed(1)}, slicks ${mean(slicks).toFixed(1)}, boatBait$ ${mean(bait).toFixed(0)}, $at12 ${mean(at12).toFixed(0)}`);
console.log('  stolen/wave', perWave.map((x) => (x / n).toFixed(1)).join(' '), ' lost on wave', lostOn.slice(1).join(' '), ` ${((Date.now() - t0) / n).toFixed(0)} ms/run`);
console.log('  bought (mean wave, runs):', Object.entries(bought).map(([k, v]) => `${k} ${mean(v).toFixed(1)} (${v.length})`).join(', '));
console.log('  stolen by wave:kind', Object.entries(byKind).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} ${(v / n).toFixed(2)}`).join(', '));
