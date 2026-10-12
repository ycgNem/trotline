// How the e2e scripts launch a browser with WebGL. Verified on this PC 2026-10-12:
//  - Playwright 1.48.2's bundled Chromium (ms-playwright/chromium-1140) fails to start here
//    ("spawn UNKNOWN"), so every script uses the installed Chrome (channel 'chrome', 154).
//  - Chrome's headless mode with no flags renders on the real GPU (ANGLE D3D11, the RTX 5070).
//  - With the flags below it renders in software (ANGLE Vulkan on SwiftShader): the stand-in for a
//    2020 laptop with integrated graphics, and the same pixels on any machine (the baselines).
// GPU=hw or GPU=swiftshader picks one for a whole script; launch({ gpu }) picks per call.
import { chromium } from 'playwright';

export const SWIFTSHADER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
/** uncapped frames, for perf: without these headless Chrome holds rAF at 60 */
export const UNCAPPED = ['--disable-gpu-vsync', '--disable-frame-rate-limit'];

export const BASE = process.env.BASE ?? 'http://127.0.0.1:5180/';

/** @param {{ gpu?: 'hw' | 'swiftshader', uncapped?: boolean }} o */
export async function launch(o = {}) {
  const gpu = o.gpu ?? process.env.GPU ?? 'swiftshader';
  const args = ['--autoplay-policy=no-user-gesture-required'];
  if (gpu === 'swiftshader') args.push(...SWIFTSHADER);
  if (o.uncapped) args.push(...UNCAPPED);
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome', headless: true, args });
  return { browser, gpu };
}

/** A page on the game at w x h, with console errors collected, waiting until the app is ready. */
export async function openGame(browser, { w = 1280, h = 720, query = '' } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(BASE + (query ? '?' + query : ''));
  await page.waitForFunction(() => window.__app && window.__app.ready, null, { timeout: 30000 });
  const renderer = await page.evaluate(() => {
    const gl = window.__app.view.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  return { page, errors, renderer };
}
