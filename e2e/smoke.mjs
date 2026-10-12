// Smoke test with real input only: start from the title with the mouse, cast with a click, wait
// for a fish, pick it in the live well, deploy it with F and a click, cast a worm with L and a
// click, send the wave with N, pause with Space, fast-forward with Tab, and check that each did
// what it should and nothing threw. Needs the dev server. Usage: npm run smoke
import fs from 'node:fs';
import { launch, openGame, frames } from './launch.mjs';

const { browser } = await launch({ gpu: process.env.GPU ?? 'hw' });
const { page, errors } = await openGame(browser, { w: 1280, h: 720 });
const st = () => page.evaluate(() => window.__app.stats());
const css = (x, y) => page.evaluate(([x, y]) => window.__app.tileToCss(x, y), [x, y]);
/** A UI-pixel point on screen (CSS px). */
const uiPt = (x, y) => page.evaluate(([x, y]) => { const a = window.__app; const k = a.uiScale / (devicePixelRatio || 1); return { x: x * k, y: y * k }; }, [x, y]);
const fail = [];
/** Close any lesson card that is up (Enter), waiting a few frames for one to appear. */
async function closeCards() {
  for (let i = 0; i < 4; i++) {
    await frames(page, 3);
    if (!(await st()).lesson) continue;
    await page.keyboard.press('Enter');
  }
  await frames(page, 2);
}
const check = (ok, msg) => { if (!ok) fail.push(msg); };

await frames(page, 3);
// the title's start button sits in the middle of the screen: find it by clicking where the panel puts it
const btn = await page.evaluate(() => {
  const a = window.__app, ui = a.ui;
  ui.audit = true;
  return null;
});
await frames(page, 2);
const start = await page.evaluate(() => {
  const r = window.__app.ui.lastAudit.find((q) => q.kind === 'button');
  const k = window.__app.uiScale / (devicePixelRatio || 1);
  return r ? { x: (r.x + r.w / 2) * k, y: (r.y + r.h / 2) * k } : null;
});
void btn;
check(!!start, 'no button on the title');
await page.mouse.click(start.x, start.y);
await frames(page, 3);
check((await st()).screen === 'play', 'clicking Start did not start a run');

// cast by clicking shallow water near the dock
let p = await css(14, 7);
await page.mouse.click(p.x, p.y);
await frames(page, 2);
check(await page.evaluate(() => !!window.__app.game.fishing), 'clicking the water did not cast');

// fast-forward (Tab twice = x3) until a fish is caught (the well starts with the dawn ray)
await page.keyboard.press('Tab');
await page.keyboard.press('Tab');
await page.waitForFunction(() => { const c = window.__app.game.caught; return c.puffer + c.ray + c.turtle > 0; }, null, { timeout: 60000 });
check((await st()).lesson === 'firstCatch', 'no first-catch lesson card');
await page.keyboard.press('Enter');
await frames(page, 2);
check((await st()).lesson === null, 'Enter did not close the lesson card');

// pick it in the live well with a click (slot centres: x 4+4+i*26+12, y h-44-4+15+12 in UI px)
const slot = await page.evaluate(() => window.__app.game.liveWell.findIndex(Boolean));
const ui = await page.evaluate(() => ({ h: window.__app.ui.h }));
p = await uiPt(8 + slot * 26 + 12, ui.h - 48 + 15 + 12);
await page.mouse.click(p.x, p.y);
await frames(page, 2);
check(await page.evaluate(() => window.__app.selected !== null), 'clicking the fish did not pick it');
// deploy with F and a click on a lit tile
await page.keyboard.press('KeyF');
await frames(page, 2);
const species = await page.evaluate(() => window.__app.game.liveWell[window.__app.selected]);
const tile = species === 'turtle' ? [20, 12] : [20, 11];
p = await css(...tile);
await page.mouse.click(p.x, p.y);
await frames(page, 3);
check(await page.evaluate(() => window.__app.game.defenders.length === 1), `deploying the ${species} with F and a click failed`);
await closeCards();

// a worm on the road with L and a click
await page.keyboard.press('KeyL');
p = await css(19, 12);
await page.mouse.click(p.x, p.y);
await frames(page, 3);
check(await page.evaluate(() => window.__app.game.lures.length === 1), 'L and a click on the road did not cast a lure');
await closeCards();

// send the wave with N, pause with Space
await page.keyboard.press('KeyN');
// the sim steps on its own clock, not per frame: wait for it rather than counting frames
await page.waitForFunction(() => window.__app.game.phase === 'wave', null, { timeout: 5000 }).catch(() => {});
check((await st()).phase === 'wave', 'N did not send the wave');
await page.keyboard.press('Space');
await frames(page, 2);
const t0 = (await st()).tick;
await page.waitForTimeout(400);
check((await st()).tick === t0, 'Space did not pause');
await page.keyboard.press('Space');
// let the wave play out at x3
await page.waitForFunction(() => window.__app.game.phase !== 'wave' || window.__app.game.over, null, { timeout: 90000 });
const end = await st();
check(end.wave === 1, 'wave 1 did not finish');
fs.mkdirSync('e2e/out', { recursive: true });
await page.screenshot({ path: 'e2e/out/smoke.png' });
console.log(fail.length ? 'FAIL\n  ' + fail.join('\n  ') : 'smoke ok', JSON.stringify(end));
console.log('console errors/warnings:', errors.length, errors.slice(0, 10));
if (fail.length || errors.length) process.exitCode = 1;
await browser.close();
