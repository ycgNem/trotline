// The moments that matter (CLAUDE.md), as deterministic frames: a fixed seed and scripted
// commands through window.__app, the sim stepped by hand (frozen loop), then a screenshot.
// Output: e2e/out/shots/*.png. Needs the dev server. Usage: npm run shots [-- --size 1920x1080]
import fs from 'node:fs';
import { launch, openGame, frames } from './launch.mjs';

const out = 'e2e/out/shots';
fs.mkdirSync(out, { recursive: true });
const sizeArg = process.argv.indexOf('--size');
const [W, H] = sizeArg > 0 ? process.argv[sizeArg + 1].split('x').map(Number) : [1280, 720];

const { browser } = await launch({ gpu: process.env.GPU ?? 'hw' });
const { page, errors } = await openGame(browser, { w: W, h: H });
const run = (f, arg) => page.evaluate(f, arg);
async function shot(name) {
  await frames(page, 3);
  await page.mouse.move(W / 2, H - 2);
  await frames(page, 2);
  await page.screenshot({ path: `${out}/${name}.png` });
  const s = await run(() => window.__app.stats());
  console.log(`shot ${name.padEnd(22)} wave ${s.wave} ${s.phase} $${s.money} crates ${s.crates} thieves ${s.thieves} lesson ${s.lesson}`);
}
/** Step the sim until cond() holds in the page (or n ticks pass). */
async function until(cond, n = 60 * 120) {
  return run(([c, n]) => { const a = window.__app; const f = new Function('a', 'g', 'return ' + c); let i = 0; while (!f(a, a.game) && i++ < n && !a.game.over) a.step(1); return i; }, [cond, n]);
}

await frames(page, 4);
await shot('01-title');

// a run with seed 7, fishing the shallows by the dock
await run(() => { const a = window.__app; a.newRun(7); a.freeze(); a.act({ k: 'cast', x: 15, y: 10 }); });
await until('g.liveWell.some(Boolean)');
await shot('02-first-catch-card');
await run(() => window.__app.dismissLesson());
await until('g.liveWell.filter(Boolean).length >= 2 || g.phaseTime < 8');
await run(() => { const a = window.__app; const i = a.game.liveWell.findIndex(Boolean); a.selected = i; a.mode = { k: 'deploy', slot: i }; });
await page.mouse.move(...Object.values(await run(() => window.__app.tileToCss(20, 11))));
await frames(page, 3);
await page.screenshot({ path: `${out}/03-deploy-mode.png` });
console.log('shot 03-deploy-mode');
// deploy everything at the bot's best tiles
await run(() => {
  const a = window.__app;
  const g = a.game;
  a.autoplay('deployAll');
  a.bot.think();
  a.autoplay(null);
  a.mode = { k: 'idle' };
  a.selected = null;
  // staged: an eel beside the road's midpoint, where the worm will land
  g.liveWell[5] = 'eel';
  g.act({ k: 'deploy', slot: 5, x: 19, y: 11 });
});
await shot('04-first-deploy-card');
await run(() => window.__app.dismissLesson());
// lure mode, then a worm on the road by the eel and the wave
await run(() => { window.__app.mode = { k: 'lure' }; });
await page.mouse.move(...Object.values(await run(() => window.__app.tileToCss(19, 12))));
await frames(page, 3);
await page.screenshot({ path: `${out}/05-lure-mode.png` });
console.log('shot 05-lure-mode');
await run(() => { const a = window.__app; a.mode = { k: 'idle' }; a.act({ k: 'lure', x: 19, y: 12 }); a.dismissLesson(); a.act({ k: 'call' }); });
await frames(page, 2);
await run(() => window.__app.dismissLesson());
await until("g.thieves.some((t) => t.mode === 'toLure')");
await run(() => window.__app.step(40));
await shot('06-raccoon-leaves-road');
await until("g.thieves.some((t) => t.mode === 'eat') && g.thieves.some((t) => t.mode === 'queue')");
await shot('07-eating-and-queue');
await until("g.phase === 'build'");
await shot('08-after-wave-1');

// the bear: a fresh run set up for wave 4 with a turtle and two eels around bend 1
await run(() => {
  const a = window.__app;
  a.newRun(11);
  a.freeze();
  const g = a.game;
  g.wave = 3;
  g.rodTier = 2;
  for (const [s, x, y] of [['turtle', 27, 12], ['eel', 28, 13], ['eel', 26, 14]]) { g.liveWell[0] = s; g.act({ k: 'deploy', slot: 0, x, y }); }
  g.act({ k: 'cast', x: 15, y: 10 });
  g.act({ k: 'call' });
  g.step();
  g.spawnQueue = ['bear'];
  a.seen.add('firstDeploy'); a.seen.add('firstCatch');
});
await frames(page, 2);
await run(() => window.__app.dismissLesson());
await until("g.thieves.some((t) => t.kind === 'bear' && t.mode === 'chew')", 60 * 200);
await run(() => window.__app.step(120));
await shot('09-bear-chews-turtle');

// the good bot to the end of a season, then the lost season
await run(() => { const a = window.__app; a.newRun(3); a.freeze(); a.autoplay('good'); for (const l of ['firstCatch', 'firstDeploy', 'firstLure']) a.seen.add(l); });
await until("g.wave === 8 && g.phase === 'wave' && g.thieves.filter((t) => t.mode !== 'dead' && t.mode !== 'gone').length > 12", 60 * 60 * 20);
await shot('10-wave-8-fight');
await until('g.over', 60 * 60 * 20);
await shot('11-season-won');
await run(() => { const a = window.__app; a.newRun(5); a.freeze(); a.autoplay(null); a.game.act({ k: 'call' }); });
await until('g.over', 60 * 60 * 30);
await shot('12-season-lost');

fs.writeFileSync(`${out}/console.txt`, errors.join('\n'));
console.log('console errors/warnings:', errors.length);
for (const e of errors.slice(0, 20)) console.log(' ', e);
if (errors.some((e) => e.includes('[error]') || e.includes('pageerror'))) process.exitCode = 1;
await browser.close();
