// The fleet and a chum slick in the game's own renderer: a fixed seed, money handed over, the
// three boats bought and sent out (one to deep water, one to mid, one to the shallows), a slick
// cast on the pale water by the road; screenshots while they run out and once they fish.
// Needs the Trotline dev server (e2e/launch.mjs BASE). Read-only on the game: it only drives
// window.__app. Usage: node pixel-art/boats/gameshot.mjs [1280x720]
// Writes pixel-art/boats/out/game_<size>_<moment>.png.
import { launch, openGame, frames } from '../../e2e/launch.mjs';

const [W, H] = (process.argv[2] ?? '1280x720').split('x').map(Number);
const out = 'pixel-art/boats/out';
const { browser } = await launch({ gpu: 'hw' });
const { page, errors } = await openGame(browser, { w: W, h: H });
const run = (f, arg) => page.evaluate(f, arg);
async function shot(name) {
  // the lesson cards queue up behind each other; clear the queue so the board shows
  await run(() => { const a = window.__app; a.lessonQueue.length = 0; a.lesson = null; });
  await frames(page, 3);
  await page.mouse.move(W / 2, H - 2);
  await frames(page, 2);
  await page.screenshot({ path: `${out}/game_${W}x${H}_${name}.png` });
  console.log('shot', name, JSON.stringify(await run(() => window.__app.game.boats.map((b) => [b.kind, b.state, b.x.toFixed(1), b.y.toFixed(1)]))));
}

const setup = await run(() => {
  const a = window.__app;
  a.newRun(10);
  a.freeze();
  const g = a.game;
  g.money = 5000;
  g.worms = 60;
  const r = {};
  for (const item of ['rowboat', 'skiff', 'trawler', 'chum', 'chum']) r[item] = g.act({ k: 'buy', item });
  // pick a tile of each water the boat may go to
  const w = g.world;
  const pick = (kind, tile, near) => {
    let best = null;
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) {
      if (w.at(x, y) !== tile || !g.canSend(kind, x, y).ok) continue;
      const d = Math.hypot(x - near[0], y - near[1]);
      if (!best || d < best.d) best = { x, y, d };
    }
    return best;
  };
  const sends = { trawler: pick('trawler', 0, [10, 2]), skiff: pick('skiff', 1, [30, 5]), rowboat: pick('rowboat', 2, [8, 8]) };
  for (const [boat, t] of Object.entries(sends)) if (t) r['send ' + boat] = g.act({ k: 'send', boat, x: t.x, y: t.y });
  // a slick on the pale water in reach
  let slick = null;
  for (let y = 0; y < w.h && !slick; y++) for (let x = 0; x < w.w && !slick; x++) if (g.canSlick(x, y).ok && x > 12) slick = { x, y };
  if (slick) r.slick = g.act({ k: 'slick', x: slick.x, y: slick.y });
  return { r, sends, slick };
});
console.log(JSON.stringify(setup));
await run(() => window.__app.step(60 * 3));
await shot('1-setting-out');
await run(() => window.__app.step(60 * 4));
await shot('2-under-way');
await run(() => { const a = window.__app; let i = 0; while (i++ < 60 * 60 && !a.game.boats.every((b) => b.state === 'fishing')) a.step(1); });
await shot('3-fishing');
if (errors.length) console.log(errors.join('\n'));
await browser.close();
