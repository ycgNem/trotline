// The four camera presets as fixed, deterministic frames (a fresh sim from seed 1 stepped
// SHOT_TICKS ticks, then frozen), each with and without the pixel pass, plus the overview with
// every fish shown. The overview is pixel-diffed against e2e/baseline/overview.png (written on the
// first run; delete it to accept a new look). Output: e2e/out/shots/. Needs the dev server.
// Usage: npm run shots            (SwiftShader, the deterministic baseline)
//        GPU=hw npm run shots     (the real GPU)
import fs from 'node:fs';
import { launch, openGame } from './launch.mjs';
import { SHOT_TICKS } from './ticks.mjs';

const PRESETS = ['overview', 'cove', 'dock', 'underwater-mid'];
const out = 'e2e/out/shots';
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync('e2e/baseline', { recursive: true });

const { browser, gpu } = await launch();
const { page, errors, renderer } = await openGame(browser);
console.log(`renderer: ${renderer} (${gpu})`);

async function frame(name, { preset, pixel = true, all = false }) {
  await page.evaluate(([preset, pixel, all, ticks]) => {
    const a = window.__app;
    a.setPreset(preset);
    a.setPixel(pixel);
    a.setSonarOnly(!all);
    a.freeze(ticks);
  }, [preset, pixel, all, SHOT_TICKS]);
  // two frames so the paused loop has drawn the frozen state
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const file = `${out}/${name}.png`;
  await page.screenshot({ path: file });
  const s = await page.evaluate(() => window.__app.stats());
  console.log(`shot ${name.padEnd(24)} calls ${s.sceneCalls}/${s.calls}  tris ${s.sceneTriangles}/${s.triangles}  ${s.internal.join('x')}  fish drawn ${s.drawn}`);
  return file;
}

for (const p of PRESETS) {
  await frame(p, { preset: p });
  await frame(`${p}-raw`, { preset: p, pixel: false });
}
await frame('overview-allfish', { preset: 'overview', all: true });
// the integer-upscale option (?pixels=int) for comparison: 240 lines at 720p
await page.evaluate(() => { const a = window.__app; a.view.pipeline.integer = true; a.resize(); });
await frame('overview-int', { preset: 'overview' });
await frame('dock-int', { preset: 'dock' });
await page.evaluate(() => { const a = window.__app; a.view.pipeline.integer = false; a.resize(); });

// pixel-diff the overview against the stored baseline, in the page (no image library needed)
const base = 'e2e/baseline/overview.png';
const cur = `${out}/overview.png`;
if (!fs.existsSync(base) || gpu !== 'swiftshader') {
  if (gpu === 'swiftshader') {
    fs.copyFileSync(cur, base);
    console.log('baseline written:', base);
  } else console.log('baseline diff skipped (only SwiftShader frames are comparable)');
} else {
  const diff = await page.evaluate(async ([a, b]) => {
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const c = document.createElement('canvas');
    c.width = ia.width; c.height = ia.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(ia, 0, 0);
    const da = x.getImageData(0, 0, c.width, c.height).data;
    x.clearRect(0, 0, c.width, c.height);
    x.drawImage(ib, 0, 0);
    const db = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 24) n++;
    return { changed: n, frac: n / (da.length / 4), size: [ia.width, ia.height, ib.width, ib.height] };
  }, ['data:image/png;base64,' + fs.readFileSync(base).toString('base64'), 'data:image/png;base64,' + fs.readFileSync(cur).toString('base64')]);
  const pct = (diff.frac * 100).toFixed(2);
  console.log(`overview vs baseline: ${pct}% of pixels changed`);
  if (diff.frac > 0.005) {
    console.log('  REGRESSION? more than 0.5% changed; look at both PNGs, delete the baseline to accept');
    process.exitCode = 1;
  }
}

fs.writeFileSync(`${out}/console.txt`, errors.join('\n'));
console.log('console errors/warnings:', errors.length);
for (const e of errors.slice(0, 20)) console.log(' ', e);
if (errors.some((e) => e.includes('[error]') || e.includes('pageerror'))) process.exitCode = 1;
await browser.close();
