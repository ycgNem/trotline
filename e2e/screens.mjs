// HUD overlap audit: the game's key states at three window sizes. For each shot the UI's audit
// (src/ui/audit.ts) lists texts that clash, overflow their panel or get painted over; shots with
// issues also get a <name>.issues.png with the problems boxed. Output: e2e/out/screens/
// (report.md and PNGs). Needs the dev server. Usage: npm run screens
import fs from 'node:fs';
import { launch, openGame, frames } from './launch.mjs';

const SIZES = [[1280, 720], [1920, 1080], [1024, 640]];
// each state: a function run in the page that puts the app there (frozen); it may return
// { hover: [x, y] } to put the mouse over that tile instead of the board's top edge
const STATES = {
  title: () => { const a = window.__app; a.screen = 'title'; },
  // a run's first frame: the status line's first hint, before anything is caught
  start: () => { const a = window.__app; a.newRun(7); a.freeze(); for (const l of ['firstCatch', 'firstDeploy', 'firstLure']) a.seen.add(l); a.toast = null; },
  build: () => {
    const a = window.__app; a.newRun(7); a.freeze(); const g = a.game;
    for (const l of ['firstCatch', 'firstDeploy', 'firstLure']) a.seen.add(l);
    g.act({ k: 'cast', x: 15, y: 10 });
    g.liveWell = ['puffer', 'ray', 'ray', null, 'puffer', null];
    a.selected = 1;
  },
  deploy: () => { const a = window.__app; a.mode = { k: 'deploy', slot: 1 }; },
  lure: () => { const a = window.__app; a.mode = { k: 'lure' }; a.selected = null; },
  // hovering a road tile in lure mode: the status line says what the worm would do
  lureHover: () => { const a = window.__app; a.game.act({ k: 'deploy', slot: 2, x: 19, y: 10 }); a.mode = { k: 'lure' }; return { hover: [19, 12] }; },
  wave: () => {
    const a = window.__app; a.mode = { k: 'idle' }; const g = a.game;
    g.act({ k: 'deploy', slot: 1, x: 19, y: 10 }); g.act({ k: 'lure', x: 19, y: 12 }); g.act({ k: 'call' });
    a.step(60 * 14);
  },
  full: () => { const a = window.__app; const g = a.game; g.liveWell = ['puffer', 'ray', 'turtle', 'ray', 'puffer', 'ray']; g.worms = 0; a.selected = 2; },
  lesson: () => { const a = window.__app; a.lesson = a.lessonFor('firstDeploy'); },
  paused: () => { const a = window.__app; a.lesson = null; a.paused = true; },
  help: () => { const a = window.__app; a.paused = false; a.help = true; },
  won: () => { const a = window.__app; a.help = false; a.game.phase = 'won'; a.screen = 'end'; },
  lost: () => { const a = window.__app; a.game.phase = 'lost'; a.game.wave = 6; a.screen = 'end'; },
};
const out = 'e2e/out/screens';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const { browser } = await launch({ gpu: process.env.GPU ?? 'hw' });
const report = [];
for (const [w, h] of SIZES) {
  const { page, errors } = await openGame(browser, { w, h });
  await page.evaluate(async () => {
    window.__app.ui.audit = true;
    window.__audit = await import('/src/ui/audit.ts');
  });
  for (const [state, fn] of Object.entries(STATES)) {
    const name = `${w}x${h}-${state}`;
    const r = await page.evaluate(fn);
    // hover a slot-free part of the board so no tooltip covers the HUD, unless the state names a tile
    if (r?.hover) { const p = await page.evaluate(([x, y]) => window.__app.tileToCss(x, y), r.hover); await page.mouse.move(p.x, p.y); }
    else await page.mouse.move(Math.floor(w / 2), 4);
    await frames(page, 3);
    await page.screenshot({ path: `${out}/${name}.png` });
    const { issues, k } = await page.evaluate(() => {
      const ui = window.__app.ui;
      return { issues: window.__audit.findIssues(ui.lastAudit, { w: ui.w, h: ui.h }), k: ui.scale / (window.devicePixelRatio || 1) };
    });
    report.push({ name, issues });
    if (issues.length) {
      await page.evaluate(({ issues, k }) => {
        const root = document.createElement('div');
        root.id = '__auditOverlay';
        root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99';
        const col = { clash: '#ff2d55', overflow: '#ff9500', covered: '#00c7ff' };
        for (const i of issues)
          for (const [r, dashed] of [[i.rect, false], [i.otherRect, true]]) {
            if (!r) continue;
            const b = document.createElement('div');
            b.style.cssText = `position:absolute;left:${r.x * k}px;top:${r.y * k}px;width:${r.w * k}px;height:${r.h * k}px;outline:2px ${dashed ? 'dashed' : 'solid'} ${col[i.type]}`;
            root.appendChild(b);
          }
        document.body.appendChild(root);
      }, { issues, k });
      await page.screenshot({ path: `${out}/${name}.issues.png` });
      await page.evaluate(() => document.getElementById('__auditOverlay')?.remove());
    }
    console.log(`${issues.length ? '!' : ' '} ${name}${issues.length ? `  (${issues.length}: ${issues.map((i) => i.type + ' "' + i.text + '"').join('; ')})` : ''}`);
  }
  if (errors.length) report.push({ name: `${w}x${h} console`, issues: errors.map((e) => ({ type: 'console', text: e })) });
  await page.close();
}
const md = ['# HUD overlap audit', '', ...report.map((r) => `- ${r.issues.length ? '**' + r.name + '**' : r.name}: ${r.issues.length ? r.issues.map((i) => `${i.type} "${i.text}"${i.other ? ' vs ' + i.other : ''}`).join('; ') : 'clean'}`)];
fs.writeFileSync(`${out}/report.md`, md.join('\n') + '\n');
const bad = report.filter((r) => r.issues.length).length;
console.log(`\n${bad ? bad + ' shot(s) with issues' : 'all clean'}; report: ${out}/report.md`);
if (bad) process.exitCode = 1;
await browser.close();
