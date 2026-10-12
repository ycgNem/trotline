// The bot plays the real build in the browser (rendering, HUD and all): each strategy from
// src/sim/bot.ts over a few seeds, the season run in chunks with frames drawn between them,
// a screenshot at the end of each run. Output: e2e/out/bot/ (PNGs and results.json).
// Needs the dev server. Usage: npm run bot
import fs from 'node:fs';
import { launch, openGame, frames } from './launch.mjs';

const out = 'e2e/out/bot';
fs.mkdirSync(out, { recursive: true });
const { browser } = await launch({ gpu: process.env.GPU ?? 'hw' });
const { page, errors } = await openGame(browser, { w: 1280, h: 720 });
const results = [];
for (const strategy of ['good', 'deployAll', 'sellAll']) {
  for (const seed of [1, 2, 3]) {
    await page.evaluate(([s, seed]) => {
      const a = window.__app;
      a.newRun(seed);
      a.freeze();
      for (const l of ['firstCatch', 'firstDeploy', 'firstLure']) a.seen.add(l);
      a.autoplay(s);
    }, [strategy, seed]);
    // run in 20 s chunks, drawing between them, until the season ends
    for (let i = 0; i < 400; i++) {
      const over = await page.evaluate(() => { const a = window.__app; a.step(60 * 20); return a.game.over; });
      await frames(page, 1);
      if (over) break;
    }
    await frames(page, 3);
    await page.screenshot({ path: `${out}/${strategy}-${seed}.png` });
    const r = await page.evaluate(() => {
      const g = window.__app.game;
      return { phase: g.phase, wave: g.wave, crates: g.crates, money: g.money, caught: g.caught, stats: g.stats, leaks: g.waveStats.map((w) => w.leaks), screen: window.__app.screen };
    });
    results.push({ strategy, seed, ...r });
    console.log(`${strategy.padEnd(9)} seed ${seed}: ${r.phase} at wave ${r.wave}, crates ${r.crates}, $${r.money}, leaks by wave ${r.leaks.join(' ')}, screen ${r.screen}`);
  }
}
fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
console.log('console errors/warnings:', errors.length, errors.slice(0, 10));
if (errors.length || results.some((r) => r.screen !== 'end')) process.exitCode = 1;
await browser.close();
