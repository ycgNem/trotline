// HUD overlap audit: the HUD in each camera preset at three window sizes. For each shot the UI's
// audit (src/ui/audit.ts) lists texts that clash, overflow their panel or get painted over; shots
// with issues also get a <name>.issues.png with the problems boxed. Output: e2e/out/screens/
// (report.md and PNGs). Needs the dev server. Usage: npm run screens
import fs from 'node:fs';
import { launch, openGame } from './launch.mjs';

const SIZES = [[1280, 720], [1920, 1080], [1024, 640]];
const PRESETS = ['overview', 'cove', 'dock', 'underwater-mid'];
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
  for (const p of PRESETS) {
    for (const all of [false, true]) {
      const name = `${w}x${h}-${p}${all ? '-all' : ''}`;
      await page.mouse.move(w - 1, h - 1);
      await page.evaluate(([p, all]) => { const a = window.__app; a.setPreset(p); a.setSonarOnly(!all); a.freeze(2040); }, [p, all]);
      // a second frozen frame: the audit keeps the last complete frame's records
      await page.evaluate(() => window.__app.freeze(2040));
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
      console.log(`${issues.length ? '!' : ' '} ${name}${issues.length ? `  (${issues.length} issue${issues.length > 1 ? 's' : ''})` : ''}`);
    }
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
