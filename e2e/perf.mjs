// Frame cost with 500 and 2,000 bighead (plus the 150 silver carp), on the real GPU and on
// SwiftShader (the 2020-laptop proxy), frames uncapped. Each case freezes the sim at the shots'
// tick (so the fish drawn is the same every run) and times 4 s of frames at the overview, forcing
// the GPU to finish each frame with a 1-pixel read before the next timestamp: rAF intervals alone
// measure when the CPU handed work over, not when the GPU drew it (the first review caught p95s
// that contradicted the averages). Two views: the sonar's (what a player sees) and every fish
// drawn (the worst case).
// Budget (CLAUDE.md): <= 100 draw calls and <= 150k triangles per scene render; p95 frame time
// <= 16.7 ms (60 fps) on the GPU and <= 66.7 ms (15 fps) on SwiftShader. Writes e2e/out/perf.json.
// Needs the dev server.
import fs from 'node:fs';
import { launch, openGame } from './launch.mjs';
import { SHOT_TICKS } from './ticks.mjs';

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
      await page.evaluate(([n, all, ticks]) => {
        const a = window.__app;
        a.setPreset('overview');
        a.setPixel(true);
        a.setFishCount(n);
        a.setSonarOnly(!all);
        a.freeze(ticks);
      }, [n, all, SHOT_TICKS]);
      await page.waitForTimeout(800);
      const r = await page.evaluate(() => new Promise((resolve) => {
        const gl = window.__app.view.renderer.getContext();
        const px = new Uint8Array(4);
        const ms = [];
        let last = performance.now();
        const t0 = last;
        const f = () => {
          // after the app's own rAF callback has drawn this frame: wait for the GPU to finish it
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          const now = performance.now();
          ms.push(now - last);
          last = now;
          // at least 4 s and 30 frames (SwiftShader's first frames after a change can take seconds)
          if (now - t0 < 4000 || ms.length < 31) requestAnimationFrame(f);
          else {
            ms.shift();
            ms.sort((a, b) => a - b);
            const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
            resolve({ avgms: avg, p95ms: ms[Math.floor(ms.length * 0.95)], frames: ms.length, ...window.__app.stats() });
          }
        };
        requestAnimationFrame(f);
      }));
      const row = {
        gpu, fish: n + 150, view: all ? 'all fish' : 'sonar', fps: +(1000 / r.avgms).toFixed(1), p95ms: +r.p95ms.toFixed(1),
        sceneCalls: r.sceneCalls, sceneTriangles: r.sceneTriangles, frameCalls: r.calls, frameTriangles: r.triangles, drawn: r.drawn,
      };
      results.push(row);
      const p95Limit = gpu === 'hw' ? 1000 / 60 : 1000 / 15;
      const ok = row.p95ms <= p95Limit && row.sceneCalls <= 100 && row.sceneTriangles <= 150000;
      if (!ok) failed = true;
      console.log(`${ok ? ' ' : '!'} ${String(row.fish).padStart(4)} fish, ${row.view.padEnd(8)}  ${String(row.fps).padStart(6)} fps  p95 ${String(row.p95ms).padStart(5)} ms (limit ${p95Limit.toFixed(1)})  calls ${row.sceneCalls} (frame ${row.frameCalls})  tris ${row.sceneTriangles} (frame ${row.frameTriangles})  drawn ${row.drawn}`);
    }
  // the 1-pixel read is ours: Chrome warns about the stall it causes, which is the point
  const real = errors.filter((e) => !e.includes('ReadPixels'));
  if (real.length) console.log('errors:', real.slice(0, 5));
  await browser.close();
}
fs.mkdirSync('e2e/out', { recursive: true });
fs.writeFileSync('e2e/out/perf.json', JSON.stringify(results, null, 1));
console.log(failed ? '\nOVER BUDGET somewhere above (!)' : '\nall within budget');
if (failed) process.exitCode = 1;
