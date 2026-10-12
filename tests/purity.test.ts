// The sim is pure (CLAUDE.md): nothing under src/sim/ may import three or touch the DOM, timers
// or audio. This test reads the source, so it fails the build the moment one slips in.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []));
}

const SIM = files('src/sim');
const DATA = files('src/data');

describe('sim purity', () => {
  it('finds the sim files', () => {
    expect(SIM.length).toBeGreaterThanOrEqual(5);
  });
  for (const f of [...SIM, ...DATA]) {
    it(`${f} imports no three and no browser APIs`, () => {
      const src = fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(src).not.toMatch(/from\s+['"]three/);
      expect(src).not.toMatch(/\b(window|document|requestAnimationFrame|setTimeout|setInterval|AudioContext|localStorage)\b/);
      expect(src).not.toMatch(/from\s+['"]\.\.?\/(\.\.\/)*(render|app|ui)\//);
    });
  }
});
