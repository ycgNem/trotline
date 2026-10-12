// How the e2e scripts launch a browser. Verified on this PC 2026-10-12: Playwright 1.48.2's
// bundled Chromium fails to start here ("spawn UNKNOWN"), so every script uses the installed
// Chrome (channel 'chrome'). Canvas 2D needs no GPU flags; SwiftShader is kept for comparable
// pixels across machines (GPU=hw uses the real GPU).
import { chromium } from 'playwright';

export const SWIFTSHADER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

export const BASE = process.env.BASE ?? 'http://127.0.0.1:5180/';

/** @param {{ gpu?: 'hw' | 'swiftshader' }} o */
export async function launch(o = {}) {
  const gpu = o.gpu ?? process.env.GPU ?? 'swiftshader';
  const args = ['--autoplay-policy=no-user-gesture-required'];
  if (gpu === 'swiftshader') args.push(...SWIFTSHADER);
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
  return { page, errors };
}

/** Wait for n animation frames (so the paused loop has drawn the current state). */
export async function frames(page, n = 2) {
  await page.evaluate((n) => new Promise((r) => { let i = 0; const f = () => (++i >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
}
