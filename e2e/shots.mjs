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

// a run with seed 10, fishing open sand off the dock (puffers and rays)
await run(() => { const a = window.__app; a.newRun(10); a.freeze(); a.act({ k: 'cast', x: 14, y: 7 }); });
await until('g.caught.puffer + g.caught.ray + g.caught.turtle > 0');
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
  // staged: a ray two tiles off the road's midpoint (clear of claws), where the worm will land
  g.liveWell[5] = 'ray';
  g.act({ k: 'deploy', slot: 5, x: 19, y: 10 });
});
await shot('04-first-deploy-card');
await run(() => window.__app.dismissLesson());
// lure mode, then a worm on the road by the ray and the wave
await run(() => { window.__app.mode = { k: 'lure' }; });
await page.mouse.move(...Object.values(await run(() => window.__app.tileToCss(19, 12))));
await frames(page, 3);
await page.screenshot({ path: `${out}/05-lure-mode.png` });
console.log('shot 05-lure-mode (beside the ray: the line would wade at it, red)');
// a tile short of the ray, on the side thieves come from: the line waits clear of it
await page.mouse.move(...Object.values(await run(() => window.__app.tileToCss(18, 12))));
await frames(page, 3);
await page.screenshot({ path: `${out}/05b-lure-short-of-ray.png` });
console.log('shot 05b-lure-short-of-ray');
await run(() => { const a = window.__app; a.mode = { k: 'idle' }; a.act({ k: 'lure', x: 18, y: 12 }); a.dismissLesson(); a.act({ k: 'call' }); });
await frames(page, 2);
await run(() => window.__app.dismissLesson());
await until("g.thieves.some((t) => t.mode === 'toLure')");
await run(() => window.__app.step(40));
await shot('06-raccoon-leaves-road');
await until("g.thieves.some((t) => t.mode === 'eat') && g.thieves.some((t) => t.mode === 'queue')");
await shot('07-eating-and-queue');
await until("g.phase === 'build'");
await shot('08-after-wave-1');

// raccoons line up at a terrapin (their real prey), one worrying it, the rest waiting, a ray in reach
await run(() => {
  const a = window.__app;
  a.newRun(11);
  a.freeze();
  const g = a.game;
  g.wave = 1;
  g.rodTier = 2;
  g.liveWell.fill(null);
  for (const [s, x, y] of [['turtle', 20, 12], ['ray', 17, 10]]) { g.liveWell[0] = s; g.act({ k: 'deploy', slot: 0, x, y }); }
  g.act({ k: 'cast', x: 14, y: 7 });
  g.act({ k: 'call' });
  for (const l of ['firstCatch', 'firstDeploy', 'firstLure', 'firstBoat', 'firstSlick']) a.seen.add(l);
});
await frames(page, 2);
await run(() => { window.__app.dismissLesson(); window.__app.toast = null; });
await until("g.thieves.some((t) => t.mode === 'worry') && g.thieves.filter((t) => t.mode === 'wait').length >= 2", 60 * 60);
await run(() => { window.__app.step(30); window.__app.toast = null; });
await shot('09-raccoons-line-up-at-terrapin');

// a pufferfish snatched: a raccoon stands retching with it in its mouth
await run(() => {
  const a = window.__app;
  a.newRun(13);
  a.freeze();
  const g = a.game;
  g.liveWell[0] = 'puffer';
  g.act({ k: 'deploy', slot: 0, x: 8, y: 11 });
  g.act({ k: 'call' });
});
await until("g.thieves.some((t) => t.stunT > 1.2)", 60 * 60);
await run(() => window.__app.step(15));
await shot('13-puffer-snatched');

// a gull flock: the first takes the pufferfish (between two rays) and drops onto the water; the
// other two land round it to rob it, where the rays shock them
await run(() => {
  const a = window.__app;
  a.newRun(17);
  a.freeze();
  const g = a.game;
  g.wave = 2;
  g.liveWell.fill(null);
  for (const [s, x, y] of [['ray', 7, 10], ['ray', 10, 10], ['puffer', 8, 11]]) { g.liveWell[0] = s; g.act({ k: 'deploy', slot: 0, x, y }); }
  g.act({ k: 'call' });
});
await until('g.stats.mobbed >= 2', 60 * 30);
await run(() => { window.__app.step(70); window.__app.toast = null; });
await shot('16-gull-mob');

// a ray one tile from the road, clawed by a passing raccoon (the defender about to be eaten)
await run(() => {
  const a = window.__app;
  a.newRun(17);
  a.freeze();
  const g = a.game;
  g.liveWell[0] = 'ray';
  g.act({ k: 'deploy', slot: 0, x: 10, y: 11 });
  g.act({ k: 'call' });
});
await until("g.thieves.some((t) => t.grabbing) && g.defenders[0] && g.defenders[0].hp < 14", 60 * 60);
await shot('14-ray-clawed');

// a raccoon slips away south into the woods with a crate
await until("g.thieves.some((t) => t.mode === 'exit' && t.y > 18)", 60 * 120);
await shot('15-raccoon-escapes');

// Milestone 3. The first boat: its lesson card, then send mode (the dotted way by water to the point)
const SLICE = ['firstCatch', 'firstDeploy', 'firstLure'];
await run((seen) => {
  const a = window.__app;
  a.newRun(21);
  a.freeze();
  for (const l of seen) a.seen.add(l);
  // the earlier shots marked every card seen (seen outlives a run)
  a.seen.delete('firstBoat');
  const g = a.game;
  g.money = 200;
  g.rodTier = 2;
  a.act({ k: 'buy', item: 'rowboat' });
}, SLICE);
await shot('17-first-boat-card');
await run(() => { const a = window.__app; a.dismissLesson(); a.pickBoat('rowboat'); a.sendBoat('rowboat'); });
await page.mouse.move(...Object.values(await run(() => window.__app.tileToCss(33, 3))));
await frames(page, 3);
await page.screenshot({ path: `${out}/18-send-mode.png` });
console.log('shot 18-send-mode');
// the rowboat at the point and the trawler towing in the channel, the fleet panel listing both
await run(() => {
  const a = window.__app;
  a.mode = { k: 'idle' };
  a.act({ k: 'send', boat: 'rowboat', x: 33, y: 3 });
  a.act({ k: 'buy', item: 'trawler' });
  a.act({ k: 'send', boat: 'trawler', x: 10, y: 3 });
  a.pickBoat('rowboat');
  a.game.liveWell.fill(null);
});
await until("g.boat('rowboat').state === 'fishing' && g.boat('rowboat').hold.length >= 1 && g.boat('trawler').state === 'fishing'", 60 * 120);
await run(() => { window.__app.toast = null; window.__app.step(30); });
await shot('19-boats-fishing');
// home with its catch: the fish leap from the boat into the live well
await until("g.boat('rowboat').state === 'dock'", 60 * 200);
await run(() => window.__app.step(4));
await shot('20-boat-unloads');

// a chum slick: slick mode's preview, its lesson card, then the gull flocks dropping onto it beside two rays
await run((seen) => {
  const a = window.__app;
  a.newRun(22);
  a.freeze();
  for (const l of [...seen, 'firstBoat']) a.seen.add(l);
  a.seen.delete('firstSlick');
  const g = a.game;
  g.wave = 4;
  g.rodTier = 2;
  g.chum = 3;
  g.liveWell.fill(null);
  for (const [s, x, y] of [['ray', 17, 10], ['ray', 20, 10], ['ray', 9, 10], ['puffer', 8, 11]]) { g.liveWell[0] = s; g.act({ k: 'deploy', slot: 0, x, y }); }
  a.toggleSlick();
}, SLICE);
await page.mouse.move(...Object.values(await run(() => window.__app.tileToCss(18, 11))));
await frames(page, 3);
await page.screenshot({ path: `${out}/21-slick-mode.png` });
console.log('shot 21-slick-mode');
await run(() => { const a = window.__app; a.mode = { k: 'idle' }; a.act({ k: 'slick', x: 18, y: 11 }); });
await shot('22-first-slick-card');
await run(() => { const a = window.__app; a.dismissLesson(); a.act({ k: 'call' }); });
await frames(page, 2);
await run(() => { window.__app.toast = null; });
await until("g.thieves.filter((t) => t.kind === 'gull' && t.mode === 'eat').length >= 2", 60 * 60);
await run(() => { window.__app.step(20); window.__app.toast = null; });
await shot('23-gulls-at-slick');

// a bear leaves the road and wades out to a slick between two rays
await run((seen) => {
  const a = window.__app;
  a.newRun(23);
  a.freeze();
  for (const l of [...seen, 'firstBoat', 'firstSlick']) a.seen.add(l);
  const g = a.game;
  g.wave = 5;
  g.rodTier = 2;
  g.chum = 3;
  g.liveWell.fill(null);
  for (const [s, x, y] of [['ray', 17, 10], ['ray', 20, 10], ['ray', 9, 10], ['turtle', 12, 12]]) { g.liveWell[0] = s; g.act({ k: 'deploy', slot: 0, x, y }); }
  g.act({ k: 'call' });
}, SLICE);
await frames(page, 2);
await until("g.thieves.some((t) => t.kind === 'bear' && t.mode === 'road' && t.x > 12)", 60 * 90);
await run(() => { const a = window.__app; a.toast = null; a.act({ k: 'slick', x: 18, y: 11 }); });
await until("g.thieves.some((t) => t.kind === 'bear' && t.mode === 'eat')", 60 * 30);
await run(() => window.__app.step(90));
// between two shocks (a hit flashes the bear white for a twentieth of a second)
await until("g.thieves.some((t) => t.kind === 'bear' && t.mode === 'eat' && t.hitT > 0.15)", 60);
await shot('24-bear-at-slick');

// the yard: everything to build, the game paused under it
await run(() => { window.__app.build = true; });
await shot('27-the-yard');
await run(() => { window.__app.build = false; });

// the good bot to the end of a season (the first seed it wins: it loses about one in ten), then
// the lost season
const won = await run(() => {
  const a = window.__app;
  for (const s of [3, 1, 2, 4, 5, 6, 7, 8, 9, 10]) {
    a.newRun(s); a.freeze(); a.autoplay('good');
    for (const l of ['firstCatch', 'firstDeploy', 'firstLure', 'firstBoat', 'firstSlick']) a.seen.add(l);
    for (let i = 0; i < 60 * 60 * 60 && !a.game.over; i++) a.step(1);
    if (a.game.phase === 'won') return s;
  }
  return 3;
});
console.log('the good bot wins seed', won);
await run((s) => { const a = window.__app; a.newRun(s); a.freeze(); a.autoplay('good'); for (const l of ['firstCatch', 'firstDeploy', 'firstLure', 'firstBoat', 'firstSlick']) a.seen.add(l); }, won);
await until("g.wave === 12 && g.phase === 'wave' && g.thieves.filter((t) => t.mode !== 'dead' && t.mode !== 'gone').length > 12", 60 * 60 * 60);
// (stepped without frames, the run's earlier wave starts fell out of the event queue, so the
// toast would introduce every kind again; in play it says "Wave 12: ..." for 2.5 s)
await run(() => { window.__app.toast = null; });
await shot('10-wave-12-fight');
await until('g.over', 60 * 60 * 60);
await shot('11-season-won');
await run(() => { const a = window.__app; a.newRun(5); a.freeze(); a.autoplay(null); a.game.act({ k: 'call' }); });
await until('g.over', 60 * 60 * 60);
await shot('12-season-lost');

fs.writeFileSync(`${out}/console.txt`, errors.join('\n'));
console.log('console errors/warnings:', errors.length);
for (const e of errors.slice(0, 20)) console.log(' ', e);
if (errors.some((e) => e.includes('[error]') || e.includes('pageerror'))) process.exitCode = 1;
await browser.close();
