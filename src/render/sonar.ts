// The sonar fan: a wedge of a ball, SONAR.halfYawDeg either side of where it points, from level
// down to straight below, out to its range. Additive and translucent, brightest at the
// transducer and fading toward the range, with ping rings travelling outward. Its pose follows
// the sim's fan every frame; it only ever turns about the vertical.
import * as THREE from 'three';
import { C } from '../data/palette';
import type { SONAR as SonarDef } from '../data/rigs';
import type { Cone } from '../sim/systems/sonar';
import { col } from './util';

const vertexShader = /* glsl */ `
  uniform float uRange;
  varying float vAlong;
  varying float vWorldY;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    vAlong = length(position) / uRange;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldY = wp.y;
    vec4 mv = viewMatrix * wp;
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uRing;
  varying float vAlong;
  varying float vWorldY;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    if (vWorldY > 0.0) discard;
    float fade = pow(1.0 - clamp(vAlong, 0.0, 1.0), 0.7);
    // faces seen edge-on read brighter than faces seen flat
    float rim = 1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir)));
    float ring = step(0.88, fract(vAlong * 4.0 - uTime * 0.9));
    vec3 c = uColor * (0.05 + 0.26 * rim * rim) * fade + uRing * ring * 0.12 * fade;
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** The fan in local space: forward +z, right +x, down -y; apex at the origin. */
export function buildFanGeometry(def: typeof SonarDef, yawSegs = 4, depSegs = 12): THREE.BufferGeometry {
  const a = (def.halfYawDeg * Math.PI) / 180, R = def.range;
  const P = (u: number, v: number, r: number): [number, number, number] => [r * Math.cos(v) * Math.sin(u), -r * Math.sin(v), r * Math.cos(v) * Math.cos(u)];
  const pos: number[] = [];
  const tri = (p: number[], q: number[], s: number[]) => pos.push(...p, ...q, ...s);
  // the outer face (part of the sphere at the range)
  for (let i = 0; i < yawSegs; i++)
    for (let j = 0; j < depSegs; j++) {
      const u0 = -a + (2 * a * i) / yawSegs, u1 = -a + (2 * a * (i + 1)) / yawSegs;
      const v0 = (Math.PI / 2) * (j / depSegs), v1 = (Math.PI / 2) * ((j + 1) / depSegs);
      tri(P(u0, v0, R), P(u1, v0, R), P(u1, v1, R));
      tri(P(u0, v0, R), P(u1, v1, R), P(u0, v1, R));
    }
  // the two side faces, quarter discs from level to straight down
  for (const u of [-a, a])
    for (let j = 0; j < depSegs; j++) {
      const v0 = (Math.PI / 2) * (j / depSegs), v1 = (Math.PI / 2) * ((j + 1) / depSegs);
      tri([0, 0, 0], P(u, v0, R), P(u, v1, R));
    }
  // the top face, just under the surface
  for (let i = 0; i < yawSegs; i++) {
    const u0 = -a + (2 * a * i) / yawSegs, u1 = -a + (2 * a * (i + 1)) / yawSegs;
    tri([0, 0, 0], P(u1, 0, R), P(u0, 0, R));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export class SonarView {
  group = new THREE.Group();
  private meshes: THREE.Mesh[] = [];
  private mat: THREE.ShaderMaterial;

  constructor(def: typeof SonarDef, cones: Cone[]) {
    this.group.name = 'sonar';
    const geo = buildFanGeometry(def);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uRange: { value: def.range }, uColor: { value: col(C.cyan) }, uRing: { value: col(C.ice) } },
      vertexShader, fragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      // additive: order doesn't matter, so one pass, not three's two for transparent double-sided
      forceSinglePass: true,
    });
    for (let i = 0; i < cones.length; i++) {
      const m = new THREE.Mesh(geo, this.mat);
      m.renderOrder = 20;
      m.name = 'sonar_fan';
      this.meshes.push(m);
      this.group.add(m);
    }
  }

  sync(cones: Cone[], time: number) {
    this.mat.uniforms.uTime.value = time;
    cones.forEach((c, i) => {
      const m = this.meshes[i];
      m.position.set(c.x, -c.d, c.y);
      // local +z to the sim heading (x east, y south -> three x, z)
      m.rotation.set(0, Math.atan2(c.hx, c.hy), 0);
    });
  }
}
