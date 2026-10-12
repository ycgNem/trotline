// Smoke test with real input: load, press every toggle and preset key, drag to orbit, wheel to
// zoom, run the clock fast for a few seconds, and check the state moved and nothing threw.
// Needs the dev server. Usage: npm run smoke
import fs from 'node:fs';
import { launch, openGame } from './launch.mjs';

const { browser } = await launch({ gpu: process.env.GPU ?? 'hw' });
const { page, errors } = await openGame(browser);
const st = () => page.evaluate(() => ({ ...window.__app.stats(), minute: window.__app.game.clock.minute, pixel: window.__app.view.pixel, sonar: window.__app.sonarOnly, paused: window.__app.loop.paused, pose: window.__app.view.rig.pose }));
const before = await st();
const fail = [];
for (const [key, want] of [['Digit2', 'cove'], ['Digit3', 'dock'], ['Digit4', 'underwater-mid'], ['Digit1', 'overview']]) {
  await page.keyboard.press(key);
  await page.waitForTimeout(700);
  const s = await st();
  if (s.preset !== want) fail.push(`${key} gave preset ${s.preset}, wanted ${want}`);
}
await page.keyboard.press('KeyP');
await page.keyboard.press('KeyV');
await page.waitForTimeout(100);
let s = await st();
if (s.pixel !== false || s.sonar !== false) fail.push('P / V did not toggle');
await page.keyboard.press('KeyP');
await page.keyboard.press('KeyV');
// orbit with a drag and zoom with the wheel
await page.mouse.move(640, 400);
await page.mouse.down();
await page.mouse.move(760, 360, { steps: 8 });
await page.mouse.up();
await page.mouse.wheel(0, 300);
await page.waitForTimeout(200);
s = await st();
if (s.preset !== 'free' || s.pose.yaw === before.pose.yaw) fail.push('drag did not orbit');
// fast clock
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(2000);
await page.keyboard.up('ShiftLeft');
s = await st();
if (!(s.minute > before.minute + 20)) fail.push(`clock barely moved: ${before.minute} -> ${s.minute}`);
await page.keyboard.press('Space');
await page.waitForTimeout(100);
if (!(await st()).paused) fail.push('Space did not pause');
fs.mkdirSync('e2e/out', { recursive: true });
await page.screenshot({ path: 'e2e/out/smoke.png' });
console.log(fail.length ? 'FAIL\n  ' + fail.join('\n  ') : 'smoke ok');
console.log('console errors/warnings:', errors.length, errors.slice(0, 10));
if (fail.length || errors.length) process.exitCode = 1;
await browser.close();
