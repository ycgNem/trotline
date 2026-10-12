// One species' school as a single InstancedMesh. The body is a stretched low-poly diamond (33
// triangles, under the 300 budget) built in code for the proof of concept; its tail swings in the
// vertex shader (more toward the tail, phase per fish). A seen fish is a sonar return: it glows in
// the colour of the band it is in right now (per instance, from its depth), added after the depth
// fog so the colour survives, and the school is drawn after the water so the surface doesn't wash
// it out (the first review measured a gold mid-band fish arriving on screen as grey-beige).
// Each frame the instances are packed with only the fish the sonar sees (or all of them in the
// debug view), so unseen fish cost nothing.
import * as THREE from 'three';
import type { SchoolDef } from '../data/species';
import { BANDS } from '../data/lake';
import { BAND_COLOR } from '../data/palette';
import { bandOf } from '../sim/lake';
import type { School } from '../sim/systems/school';
import { FISH_FOG, addDepthFog, col } from './util';

/** body along +x, nose at +x; length 1 (scaled by the species' length) */
export function buildFishGeometry(colors: [string, string, string]): THREE.BufferGeometry {
  const [back, flank, belly] = colors.map(col);
  // rings: x, half-height, half-width
  const rings: [number, number, number][] = [
    [0.36, 0.085, 0.06],
    [0.12, 0.12, 0.085],
    [-0.14, 0.095, 0.065],
    [-0.3, 0.04, 0.025],
  ];
  const nose = 0.5, tail = -0.5;
  const pos: number[] = [];
  const colr: number[] = [];
  const ringPt = (r: [number, number, number], k: number): [number, number, number] => {
    // k: 0 top, 1 right side, 2 bottom, 3 left side
    const [x, hh, hw] = r;
    return k === 0 ? [x, hh, 0] : k === 1 ? [x, 0, hw] : k === 2 ? [x, -hh, 0] : [x, 0, -hw];
  };
  const face = (a: number[], b: number[], c: number[], color: THREE.Color) => {
    pos.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) colr.push(color.r, color.g, color.b);
  };
  // faces from top to side are the back, from side to bottom the belly
  const shade = (k: number) => (k === 0 || k === 3 ? back : belly);
  const tip = [nose, 0.01, 0];
  for (let k = 0; k < 4; k++) face(tip, ringPt(rings[0], (k + 1) % 4), ringPt(rings[0], k), k === 0 || k === 3 ? back : flank);
  for (let r = 0; r + 1 < rings.length; r++)
    for (let k = 0; k < 4; k++) {
      const a = ringPt(rings[r], k), b = ringPt(rings[r], (k + 1) % 4);
      const c = ringPt(rings[r + 1], k), d = ringPt(rings[r + 1], (k + 1) % 4);
      const color = r === 1 && (k === 1 || k === 2) ? flank : shade(k);
      face(a, b, d, color);
      face(a, d, c, color);
    }
  // the peduncle's end, closed
  const last = rings[rings.length - 1];
  face(ringPt(last, 0), ringPt(last, 1), ringPt(last, 2), back);
  face(ringPt(last, 0), ringPt(last, 2), ringPt(last, 3), back);
  // a forked tail in the vertical plane, and a dorsal fin
  face([-0.28, 0, 0], [tail, 0.17, 0], [-0.42, 0, 0], back);
  face([-0.28, 0, 0], [-0.42, 0, 0], [tail, -0.15, 0], back);
  face([0.12, 0.11, 0], [-0.08, 0.2, 0], [-0.12, 0.09, 0], back);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  g.computeVertexNormals();
  return g;
}

export class FishView {
  mesh: THREE.InstancedMesh;
  private phase: THREE.InstancedBufferAttribute;
  private glow: THREE.InstancedBufferAttribute;
  private uTime = { value: 0 };
  private uGlow = { value: 0.6 };
  private bandRgb = new Map(BANDS.map((b) => [b.id, col(BAND_COLOR[b.id])]));
  readonly capacity: number;
  /** instances drawn last sync */
  drawn = 0;

  constructor(def: SchoolDef, capacity: number) {
    this.capacity = capacity;
    const g = buildFishGeometry(def.colors);
    this.phase = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    this.phase.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aPhase', this.phase);
    this.glow = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.glow.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aGlow', this.glow);
    // transparent only so three draws it after the water (renderOrder 15 > 10); fully opaque, and
    // it writes depth, so the pixel pass's normals render keeps it
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, transparent: true, depthWrite: true });
    // three draws a transparent double-sided material twice (back faces, then front) unless told
    // not to: that doubled every fish's triangles (perf, 2,150 fish: 159k)
    m.forceSinglePass = true;
    const uTime = this.uTime, uGlow = this.uGlow;
    const freq = (def.tailHz * Math.PI * 2).toFixed(3);
    addDepthFog(m, 'fish', FISH_FOG, (shader) => {
      shader.uniforms.uTime = uTime;
      shader.uniforms.uGlow = uGlow;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGlow;\nuniform float uGlow;')
        // after the depth fog's line, which sits just before opaque_fragment
        .replace('#include <opaque_fragment>', 'outgoingLight += vGlow * uGlow;\n#include <opaque_fragment>');
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aPhase;\nattribute vec3 aGlow;\nvarying vec3 vGlow;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vGlow = aGlow;
          // 0 behind the head, 1 at the tail; the swing grows with the square of that
          float tailK = clamp((0.2 - position.x) / 0.7, 0.0, 1.0);
          transformed.z += sin(uTime * ${freq} + aPhase - tailK * 2.5) * 0.09 * tailK * tailK;`,
        );
    });
    this.mesh = new THREE.InstancedMesh(g, m, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'school:' + def.species;
    this.mesh.renderOrder = 15;
    this.mesh.count = 0;
  }

  /**
   * Pack the instances from the sim. `all` draws every fish, not only the seen ones. `camDist` (m)
   * sets the glow: strong far off, where a fish is a few pixels, faint up close, where its own
   * markings should show.
   */
  sync(s: School, time: number, all: boolean, camDist = 80) {
    this.uTime.value = time;
    this.uGlow.value = Math.min(0.75, Math.max(0.15, (camDist - 8) / 80));
    const e = this.mesh.instanceMatrix.array as Float32Array;
    const ph = this.phase.array as Float32Array;
    const gl = this.glow.array as Float32Array;
    const L = s.def.length;
    let k = 0;
    for (let i = 0; i < s.n && k < this.capacity; i++) {
      if (!all && s.seen[i] <= 0) continue;
      const c = Math.cos(s.heading[i]) * L, sn = Math.sin(s.heading[i]) * L;
      const o = k * 16;
      // yaw-only rotation taking the model's +x to the sim heading (x east, y south -> three x, z)
      e[o] = c; e[o + 1] = 0; e[o + 2] = sn; e[o + 3] = 0;
      e[o + 4] = 0; e[o + 5] = L; e[o + 6] = 0; e[o + 7] = 0;
      e[o + 8] = -sn; e[o + 9] = 0; e[o + 10] = c; e[o + 11] = 0;
      e[o + 12] = s.x[i]; e[o + 13] = -s.d[i]; e[o + 14] = s.y[i]; e[o + 15] = 1;
      ph[k] = s.phase[i];
      const bc = this.bandRgb.get(bandOf(s.d[i]))!;
      gl[k * 3] = bc.r;
      gl[k * 3 + 1] = bc.g;
      gl[k * 3 + 2] = bc.b;
      k++;
    }
    this.mesh.count = k;
    this.drawn = k;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.phase.needsUpdate = true;
    this.glow.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}
