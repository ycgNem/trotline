// Frame cost with 500 and 2,000 fish, on the real GPU and on SwiftShader (the 2020-laptop proxy),
// with frames uncapped so the numbers show headroom. Each case runs the live loop at the overview
// for 4 s: the sonar view (what a player sees) and every fish drawn (the worst case).
// Budget (CLAUDE.md): <= 100 draw calls and <= 150k triangles per scene render, >= 60 fps on the
// GPU, >= 15 fps on SwiftShader. Writes e2e/out/perf.json. Needs the dev server.
import fs from 'node:fs';
import { launch, openGame } from './launch.mjs';

const GPUS = (process.env.GPUS ?? 'hw,swiftshader').split(',');
const COUNTS = [500, 2000];
const results = [];
let failed = false;

for (const gpu of GPUS) {
  const { browser } = await launch({ gpu, uncapped: true });
  const { page, renderer, errors } = await openGame(browser);
  console.log(`\n${gpu}: ${renderer}`);
  for (const n of COUNTS)
    for (const all of [false, true]) {
      await page.evaluate(([n, all]) => {
        const a = window.__app;
        a.setPreset('overview');
        a.setPixel(true);
        a.setFishCount(n);
        a.setSonarOnly(!all);
        a.resume();
      }, [n, all]);
      await page.waitForTimeout(1500);
      const r = await page.evaluate(() => new Promise((resolve) => {
        const ms = [];
        let last = performance.now();
        const t0 = last;
        const f = () => {
          const now = performance.now();
          ms.push(now - last);
          last = now;
          if (now - t0 < 4000) requestAnimationFrame(f);
          else {
            ms.sort((a, b) => a - b);
            const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
            resolve({ fps: 1000 / avg, p95ms: ms[Math.floor(ms.length * 0.95)], frames: ms.length, ...window.__app.stats() });
          }
        };
        requestAnimationFrame(f);
      }));
      const row = { gpu, fish: n, view: all ? 'all fish' : 'sonar', fps: +r.fps.toFixed(1), p95ms: +r.p95ms.toFixed(1), sceneCalls: r.sceneCalls, sceneTriangles: r.sceneTriangles, frameCalls: r.calls, frameTriangles: r.triangles, drawn: r.drawn };
      results.push(row);
      const need = gpu === 'hw' ? 60 : 15;
      const ok = row.fps >= need && row.sceneCalls <= 100 && row.sceneTriangles <= 150000;
      if (!ok) failed = true;
      console.log(`${ok ? ' ' : '!'} ${String(n).padStart(4)} fish, ${row.view.padEnd(8)}  ${String(row.fps).padStart(6)} fps  p95 ${row.p95ms} ms  calls ${row.sceneCalls} (frame ${row.frameCalls})  tris ${row.sceneTriangles} (frame ${row.frameTriangles})  drawn ${row.drawn}`);
    }
  if (errors.length) console.log('errors:', errors.slice(0, 5));
  await browser.close();
}
fs.mkdirSync('e2e/out', { recursive: true });
fs.writeFileSync('e2e/out/perf.json', JSON.stringify(results, null, 1));
console.log(failed ? '\nOVER BUDGET somewhere above (!)' : '\nall within budget');
if (failed) process.exitCode = 1;
