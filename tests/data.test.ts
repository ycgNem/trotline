// Data validation (CLAUDE.md): every numeric stat carries a derivation naming a DESIGN.md section
// that exists; every cross-reference resolves; every upgrade has a fishing column; the shore is
// the map DESIGN.md §10 describes.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import * as species from '../src/data/species';
import * as defenders from '../src/data/defenders';
import * as thieves from '../src/data/thieves';
import * as bait from '../src/data/bait';
import * as rods from '../src/data/rods';
import * as waves from '../src/data/waves';
import * as rules from '../src/data/rules';
import * as shore from '../src/data/shore';
import * as upgrades from '../src/data/upgrades';
import { World, Tile, isWater } from '../src/sim/world';

const DESIGN = fs.readFileSync('DESIGN.md', 'utf8');
const SECTIONS = new Set([...DESIGN.matchAll(/^## (\d+)\./gm)].map((m) => m[1]));
const MODULES = { species, defenders, thieves, bait, rods, waves, rules, shore, upgrades };

/** Every object holding a number must have a derivation itself or inside an object that has one. */
function walk(v: unknown, path: string, covered: string | null, out: { path: string; derivation: string | null }[]) {
  if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`, covered, out)); return; }
  if (!v || typeof v !== 'object') return;
  const o = v as Record<string, unknown>;
  const d = typeof o.derivation === 'string' ? o.derivation : covered;
  const hasNumber = Object.values(o).some((x) => typeof x === 'number') || Object.values(o).some((x) => Array.isArray(x) && x.some((y) => typeof y === 'number' || (Array.isArray(y) && y.some((z) => typeof z === 'number'))));
  if (hasNumber) out.push({ path, derivation: d });
  for (const [k, x] of Object.entries(o)) if (k !== 'derivation') walk(x, `${path}.${k}`, d, out);
}

describe('derivations', () => {
  const found: { path: string; derivation: string | null }[] = [];
  for (const [m, mod] of Object.entries(MODULES)) for (const [k, v] of Object.entries(mod)) if (typeof v === 'object') walk(v, `${m}.${k}`, null, found);
  it('finds the numbers', () => expect(found.length).toBeGreaterThan(25));
  for (const f of found) {
    it(`${f.path} has a derivation naming a DESIGN.md section`, () => {
      expect(f.derivation, 'no derivation').toBeTruthy();
      const refs = [...f.derivation!.matchAll(/§(\d+)/g)].map((m) => m[1]);
      expect(f.derivation).toMatch(/DESIGN\.md §\d+/);
      for (const r of refs) expect(SECTIONS.has(r), `DESIGN.md has no §${r}`).toBe(true);
    });
  }
});

describe('cross-references', () => {
  it('every wave names real thieves', () => {
    for (const w of waves.WAVES) for (const [id, n] of w.groups) { expect(thieves.THIEVES[id]).toBeTruthy(); expect(n).toBeGreaterThan(0); }
  });
  it('every species is a defender and every defender a species', () => {
    expect(Object.keys(defenders.DEFENDERS).sort()).toEqual(Object.keys(species.SPECIES).sort());
    for (const [k, d] of Object.entries(defenders.DEFENDERS)) expect(d.species).toBe(k);
  });
  it('species bite in zones that exist, at rates above zero', () => {
    const zones = new Set(shore.ZONES.map((z) => z.id));
    for (const s of Object.values(species.SPECIES)) {
      expect(Object.keys(s.rates).length).toBeGreaterThan(0);
      for (const [z, r] of Object.entries(s.rates)) { expect(zones.has(z as shore.ZoneId)).toBe(true); expect(r).toBeGreaterThan(0); }
    }
  });
  it('thieves are pulled only by bait that exists', () => {
    for (const t of Object.values(thieves.THIEVES)) for (const b of Object.keys(t.pulledBy)) expect(bait.BAIT[b as bait.BaitId]).toBeTruthy();
  });
  it('rods get better with tier', () => {
    rods.RODS.forEach((r, i) => expect(r.tier).toBe(i + 1));
    for (let i = 1; i < rods.RODS.length; i++) expect(rods.RODS[i].range).toBeGreaterThan(rods.RODS[i - 1].range);
  });
});

describe('the fishing column', () => {
  for (const u of upgrades.UPGRADES) it(`${u.name} changes what, where or how you catch`, () => expect(u.fishing.trim().length).toBeGreaterThan(10));
});

describe('the shore (DESIGN.md §10)', () => {
  const w = new World();
  it('is 40 x 22 with a 39-tile road from the west edge to the smokehouse door', () => {
    expect([w.w, w.h]).toEqual([40, 22]);
    expect(w.path.length).toBe(39);
    expect(w.path[0].x).toBe(0);
    const s = shore.SHORE.smokehouse;
    expect(w.at(Math.floor(w.door.x), Math.floor(w.door.y))).toBe(Tile.House);
    expect(w.door.x - 0.5).toBe(s.x);
  });
  it('has exactly two bends', () => {
    let turns = 0;
    for (let i = 2; i < w.path.length; i++) {
      const a = [w.path[i - 1].x - w.path[i - 2].x, w.path[i - 1].y - w.path[i - 2].y];
      const b = [w.path[i].x - w.path[i - 1].x, w.path[i].y - w.path[i - 1].y];
      if (a[0] !== b[0] || a[1] !== b[1]) turns++;
    }
    expect(turns).toBe(2);
  });
  it('puts the angler on the dock', () => {
    expect(w.at(shore.SHORE.angler.x, shore.SHORE.angler.y)).toBe(Tile.Dock);
  });
  it('lets a tier-1 cast reach 15 road tiles (DESIGN.md §6)', () => {
    const n = w.path.filter((p) => w.castDist(p.x, p.y) <= rods.RODS[0].range).length;
    expect(n).toBe(15);
  });
  it('puts the point out of tier-1 reach and partly in tier-2 reach', () => {
    const pt: { x: number; y: number }[] = [];
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (w.zone[w.idx(x, y)] === 'point') pt.push({ x, y });
    expect(pt.length).toBeGreaterThan(10);
    expect(pt.some((p) => w.castDist(p.x, p.y) <= rods.RODS[0].range)).toBe(false);
    expect(pt.some((p) => w.castDist(p.x, p.y) <= rods.RODS[1].range)).toBe(true);
  });
  it('has shallows in tier-1 reach and slots on both sides of bend 1', () => {
    let reach = 0;
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (w.zone[w.idx(x, y)] === 'shallows' && w.castDist(x, y) <= rods.RODS[0].range) reach++;
    expect(reach).toBeGreaterThan(20);
    expect(w.at(28, 13)).toBe(Tile.Shallow);
    expect(w.roadDist[w.idx(28, 13)]).toBe(1);
  });
  it('every water tile next to land is shallow or reeds (no cliffs into deep water)', () => {
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) {
      const t = w.at(x, y);
      if (t !== Tile.Deep) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = w.at(x + dx, y + dy);
        if (w.inb(x + dx, y + dy)) expect(isWater(q) || q === Tile.Dock, `deep water at ${x},${y} touches land`).toBe(true);
      }
    }
  });
  it('the way out runs from the road\'s end south over open ground to the map edge (DESIGN.md §5)', () => {
    const last = w.path[w.path.length - 1];
    expect(Math.abs(w.exitPath[0].x - 0.5 - last.x)).toBeLessThanOrEqual(1);
    expect(w.exitPath[w.exitPath.length - 1].y).toBeGreaterThan(w.h);
    for (const p of w.exitPath) {
      const x = Math.floor(p.x), y = Math.floor(p.y);
      if (!w.inb(x, y)) continue;
      const t = w.at(x, y);
      expect(t, `exit at ${x},${y}`).toBe(Tile.Trail);
    }
  });
  it('every species bites somewhere the surf rod reaches (DESIGN.md §3)', () => {
    for (const s of species.SPECIES_ORDER) {
      const sp = species.SPECIES[s];
      let ok = false;
      for (let y = 0; y < w.h && !ok; y++) for (let x = 0; x < w.w && !ok; x++) {
        const i = w.idx(x, y), z = w.zone[i];
        if (!z || !sp.rates[z] || w.castDist(x, y) > rods.RODS[rods.RODS.length - 1].range) continue;
        const hab = sp.habitat.reedsOnly ? (w.nearReeds[i] ? sp.habitat.near : 0) : w.nearStructure[i] ? sp.habitat.near : sp.habitat.open;
        ok = hab > 0;
      }
      expect(ok, s).toBe(true);
    }
  });
  it('has reeds a tier-1 cast reaches, so terrapins are a place to go once the rod allows', () => {
    let n = 0;
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (w.nearReeds[w.idx(x, y)] && w.castDist(x, y) <= rods.RODS[0].range) n++;
    expect(n).toBeGreaterThan(2);
  });
});
