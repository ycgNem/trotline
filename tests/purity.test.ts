// The sim is pure (CLAUDE.md): nothing under src/sim/, and nothing it imports, may import three or
// touch the DOM, timers or audio. The test follows every relative import from src/sim/ and checks
// each file it reaches, so a pure-looking import of a browser module is caught too (the first
// review found Game.ts taking DT from the rAF loop).
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []));
}

const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** every file reachable from `start` through relative imports (type-only imports included) */
function reach(start: string[]): string[] {
  const seen = new Set<string>();
  const todo = [...start];
  while (todo.length) {
    const f = path.normalize(todo.pop()!);
    if (seen.has(f)) continue;
    seen.add(f);
    for (const m of strip(fs.readFileSync(f, 'utf8')).matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      const base = path.join(path.dirname(f), m[1]);
      const hit = [base + '.ts', path.join(base, 'index.ts'), base].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
      if (hit) todo.push(hit);
    }
  }
  return [...seen].sort();
}

const SIM = files('src/sim');
const REACHED = reach(SIM);

describe('sim purity', () => {
  it('finds the sim files and what they import', () => {
    expect(SIM.length).toBeGreaterThanOrEqual(5);
    expect(REACHED.length).toBeGreaterThan(SIM.length);
  });
  for (const f of REACHED) {
    it(`${f.replace(/\\/g, '/')} imports no three and uses no browser APIs`, () => {
      const src = strip(fs.readFileSync(f, 'utf8'));
      expect(src).not.toMatch(/from\s+['"]three/);
      expect(src).not.toMatch(/\b(window|document|requestAnimationFrame|cancelAnimationFrame|setTimeout|setInterval|AudioContext|localStorage|performance)\b/);
      expect(f.replace(/\\/g, '/')).not.toMatch(/src\/(render|app|ui)\//);
    });
  }
});
