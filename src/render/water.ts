// The water: one translucent plane with a small vertex wobble and a tint by the depth of the bed
// beneath each point (deeper = darker and more opaque), stepped at the band edges so the surface
// itself shows where the mid and bottom bands exist. Drawn after everything under it, with
// depthWrite off. Seen from below (the underwater camera) it is a pale, brighter ceiling.
import * as THREE from 'three';
import { C } from '../data/palette';
import type { Lake } from '../sim/lake';
import { TERRAIN, terrainDepth } from './lakebed';
import { col } from './util';

/** depth (m) is stored in the texture as (d + DEPTH_OFF) / DEPTH_SPAN, 8 bits */
const DEPTH_OFF = 1, DEPTH_SPAN = 10;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec4 uExtent;
  varying vec2 vUv;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec3 p = position;
    // two crossing swells, a few centimeters high
    p.y += 0.045 * sin(p.x * 0.9 + uTime * 1.3) + 0.03 * sin(p.z * 1.3 - uTime * 1.1 + p.x * 0.3);
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vWorld = wp.xyz;
    vUv = (wp.xz - uExtent.xy) / uExtent.zw;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uDepth;
  uniform vec3 uShallow;
  uniform vec3 uMid;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  uniform vec3 uUnder;
  uniform float uLight;
  uniform float uSteps;
  varying vec2 vUv;
  varying vec3 vWorld;
  #include <common>
  #include <fog_pars_fragment>
  void main() {
    float d = texture2D(uDepth, vUv).r * ${DEPTH_SPAN.toFixed(1)} - ${DEPTH_OFF.toFixed(1)};
    if (d < 0.0) discard;
    // 0..1 over the bands: stepped at 2, 4 and 6 m when uSteps is on
    float t = clamp(d / 8.0, 0.0, 1.0);
    float ts = floor(d / 2.0) / 4.0;
    t = mix(t, clamp(ts + 0.08, 0.0, 1.0), uSteps);
    vec3 c = t < 0.5 ? mix(uShallow, uMid, t * 2.0) : mix(uMid, uDeep, (t - 0.5) * 2.0);
    float a = mix(0.28, 0.58, t);
    // glints: where the two swells peak together, a pixel of sky
    float g = sin(vWorld.x * 4.1 + uTime * 1.1) * sin(vWorld.z * 3.7 - uTime * 0.8 + vWorld.x * 0.9);
    float g2 = sin(vWorld.x * 0.31 - vWorld.z * 0.27 + uTime * 0.2);
    c = mix(c, uFoam, step(0.985, g) * step(0.3, g2) * 0.5);
    // a pale fringe where the water meets the bank
    float foam = 1.0 - smoothstep(0.05, 0.22, d + 0.03 * sin(uTime * 2.0 + vWorld.x * 2.0));
    c = mix(c, uFoam, foam * 0.8);
    a = mix(a, 0.9, foam * 0.6);
    c *= uLight;
    if (!gl_FrontFacing) {
      c = mix(uUnder, uFoam, 0.25) * uLight;
      a = 0.55;
    }
    gl_FragColor = vec4(c, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function buildWater(l: Lake) {
  const { x0, x1, y0, y1 } = TERRAIN;
  const w = x1 - x0, h = y1 - y0;
  // bed depth every meter, for the tint
  const tw = w + 1, th = h + 1;
  const data = new Uint8Array(tw * th * 4);
  for (let j = 0; j < th; j++)
    for (let i = 0; i < tw; i++) {
      const d = terrainDepth(l, x0 + i, y0 + j);
      const v = Math.round(Math.max(0, Math.min(1, (d + DEPTH_OFF) / DEPTH_SPAN)) * 255);
      data[(j * tw + i) * 4] = v;
      data[(j * tw + i) * 4 + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, tw, th, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  const geo = new THREE.PlaneGeometry(w, h, Math.round(w / 2), Math.round(h / 2));
  geo.rotateX(-Math.PI / 2);
  geo.translate(x0 + w / 2, 0, y0 + h / 2);
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uDepth: { value: null },
      uExtent: { value: new THREE.Vector4(x0, y0, w, h) },
      uShallow: { value: col(C.cyan) },
      uMid: { value: col(C.blue) },
      uDeep: { value: col(C.abyss) },
      uFoam: { value: col(C.ice) },
      uUnder: { value: col(C.sky) },
      uLight: { value: 1 },
      uSteps: { value: 1 },
    },
  ]);
  uniforms.uDepth.value = tex;
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'water';
  mesh.renderOrder = 10;
  return { mesh, mat, tex };
}
