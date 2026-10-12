// The lake bed and the land around it, and the band contour lines on the bed.
// Inside the hand-written 60 x 40 m grid the height is exactly the sim's depthAt; outside it the
// land is decoration (low hills), except the creek, which runs on off the north edge.
import * as THREE from 'three';
import { BANDS } from '../data/lake';
import { BAND_COLOR, C } from '../data/palette';
import { fbm } from '../engine/rng';
import { Lake, bounds, depthAt } from '../sim/lake';
import { addDepthFog, col } from './util';

/** how far the detailed terrain reaches beyond the lake grid on each side (m); mesh step and colour texel */
export const TERRAIN = { x0: -46, x1: 46, y0: -34, y1: 34, step: 1, texel: 0.25 };

/** Depth below the water (negative = height above) anywhere in the terrain. */
export function terrainDepth(l: Lake, x: number, y: number): number {
  const b = bounds(l);
  const d = depthAt(l, x, y);
  const out = Math.max(b.x0 - x, x - b.x1, b.y0 - y, y - b.y1, 0);
  if (out <= 0 || d > 0) return d;
  // beyond the grid: rolling ground that rises gently away from the lake
  const rise = Math.min(1, out / 10);
  return d - rise * (0.6 + 2.4 * fbm(x * 0.05, y * 0.05, 7, 3));
}

// Underwater it runs darker than sand on purpose: a pale bed under thin water read as ice in the
// first shots (the review sampled the cove as #798186).
const RAMP: [number, string][] = [
  [-1.0, C.leaf], // land
  [-0.5, C.green],
  [-0.12, C.lime], // the grassy bank
  [0.05, C.dune], // wet sand at the water's edge
  [1.0, C.tan],
  [2.0, C.clay], // the surface band's floor
  [4.0, C.mud], // the mid band's floor
  [6.0, C.bark], // the bottom band
  [99, '#241527'], // the creek channel
];

function bedColor(d: number, x: number, y: number): string {
  // land: a dark green with soft patches of a lighter one (low-frequency, so no camouflage)
  if (d < -1.0) return fbm(x * 0.08, y * 0.08, 11, 2) > 0.62 ? C.moss : C.leaf;
  for (const [lim, c] of RAMP) if (d < lim) return c;
  return C.bark;
}

/**
 * The bed's colours as a nearest-filtered texture, one texel every 0.25 m: depth classes step in
 * small square pixels (1 m cells were 17-pixel blocks at the cove preset) with no extra triangles.
 */
export function buildBedTexture(l: Lake): THREE.DataTexture {
  const { x0, x1, y0, y1, texel } = TERRAIN;
  const w = Math.round((x1 - x0) / texel), h = Math.round((y1 - y0) / texel);
  const data = new Uint8Array(w * h * 4);
  const cache = new Map<string, [number, number, number]>();
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const x = x0 + (i + 0.5) * texel, y = y0 + (j + 0.5) * texel;
      const hex = bedColor(terrainDepth(l, x, y), x, y);
      let c = cache.get(hex);
      if (!c) {
        const n = parseInt(hex.slice(1), 16);
        c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        cache.set(hex, c);
      }
      const o = (j * w + i) * 4;
      data[o] = c[0];
      data[o + 1] = c[1];
      data[o + 2] = c[2];
      data[o + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildBed(l: Lake): THREE.Mesh {
  const { x0, x1, y0, y1, step } = TERRAIN;
  const nx = Math.round((x1 - x0) / step), ny = Math.round((y1 - y0) / step);
  const W = x1 - x0, H = y1 - y0;
  const pos: number[] = [];
  const nrm: number[] = [];
  const uv: number[] = [];
  const hgt = (x: number, y: number) => -terrainDepth(l, x, y);
  // smooth normals from the height field itself (central differences), so the pixel pass's
  // normal-edge outline marks real slopes and not every triangle's seam
  const vert = (x: number, y: number) => {
    pos.push(x, hgt(x, y), y);
    const e = 0.5;
    const nx2 = hgt(x - e, y) - hgt(x + e, y), nz = hgt(x, y - e) - hgt(x, y + e);
    const len = Math.hypot(nx2, 2 * e, nz);
    nrm.push(nx2 / len, (2 * e) / len, nz / len);
    uv.push((x - x0) / W, (y - y0) / H);
  };
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const xa = x0 + i * step, xb = xa + step, ya = y0 + j * step, yb = ya + step;
      vert(xa, ya); vert(xa, yb); vert(xb, ya);
      vert(xb, ya); vert(xa, yb); vert(xb, yb);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const m = new THREE.MeshLambertMaterial({ map: buildBedTexture(l) });
  addDepthFog(m, 'bed');
  const mesh = new THREE.Mesh(g, m);
  mesh.name = 'bed';
  return mesh;
}

/** Flat ground from the detailed terrain's edge out to the horizon. */
export function buildSkirt(): THREE.Mesh {
  const { x0, x1, y0, y1 } = TERRAIN;
  const R = 400, h = 1.2;
  const quads = [
    [-R, -R, R, y0], // north
    [-R, y1, R, R], // south
    [-R, y0, x0, y1], // west
    [x1, y0, R, y1], // east
  ];
  const pos: number[] = [];
  for (const [ax, ay, bx, by] of quads) pos.push(ax, h, ay, ax, h, by, bx, h, ay, bx, h, ay, ax, h, by, bx, h, by);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col(C.leaf) }));
  mesh.name = 'skirt';
  return mesh;
}

/**
 * Marching squares over the bed at each band's contour depth (2, 4, 6 m), sampled every 0.5 m,
 * lifted a little off the bed so the triangulated mesh never hides them.
 */
export function buildContours(l: Lake): THREE.LineSegments {
  const b = bounds(l);
  const s = 0.5, lift = 0.12;
  const pos: number[] = [];
  const colr: number[] = [];
  for (const band of BANDS) {
    const L = band.contour;
    const c = col(BAND_COLOR[band.id]);
    const nx = Math.round((b.x1 - b.x0) / s), ny = Math.round((b.y1 - b.y0) / s);
    const v = (i: number, j: number) => depthAt(l, b.x0 + i * s, b.y0 + j * s) - L;
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const a = v(i, j), bb = v(i + 1, j), cc = v(i + 1, j + 1), d = v(i, j + 1);
        const pts: [number, number][] = [];
        const edge = (p: number, q: number, x0: number, y0: number, x1: number, y1: number) => {
          if ((p < 0) !== (q < 0)) {
            const t = p / (p - q);
            pts.push([b.x0 + (x0 + (x1 - x0) * t) * s, b.y0 + (y0 + (y1 - y0) * t) * s]);
          }
        };
        edge(a, bb, i, j, i + 1, j);
        edge(bb, cc, i + 1, j, i + 1, j + 1);
        edge(cc, d, i + 1, j + 1, i, j + 1);
        edge(d, a, i, j + 1, i, j);
        for (let k = 0; k + 1 < pts.length; k += 2) {
          pos.push(pts[k][0], -L + lift, pts[k][1], pts[k + 1][0], -L + lift, pts[k + 1][1]);
          for (let n = 0; n < 2; n++) colr.push(c.r, c.g, c.b);
        }
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false });
  const lines = new THREE.LineSegments(g, m);
  lines.name = 'contours';
  lines.renderOrder = 1;
  return lines;
}
