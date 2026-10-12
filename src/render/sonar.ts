// The sonar cone: additive, translucent, brightest at the transducer and fading toward its range,
// with ping rings travelling outward. Cut at the surface (the cone is a picture of what the sonar
// covers under water). Its pose follows the sim's cone every frame.
import * as THREE from 'three';
import { C } from '../data/palette';
import type { SONAR as SonarDef } from '../data/rigs';
import type { Cone } from '../sim/systems/sonar';
import { coneAxis } from '../sim/systems/sonar';
import { col } from './util';

const vertexShader = /* glsl */ `
  uniform float uRange;
  varying float vAlong;
  varying float vWorldY;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    vAlong = position.z / uRange;
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
    float fade = pow(1.0 - clamp(vAlong, 0.0, 1.0), 0.8);
    // edges of the cone (seen side-on) read brighter than its middle
    float rim = 1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir)));
    float ring = step(0.9, fract(vAlong * 5.0 - uTime * 0.9));
    vec3 c = uColor * (0.08 + 0.2 * rim) * fade + uRing * ring * 0.12 * fade;
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class SonarView {
  group = new THREE.Group();
  private meshes: THREE.Mesh[] = [];
  private mat: THREE.ShaderMaterial;

  constructor(def: typeof SonarDef, cones: Cone[]) {
    this.group.name = 'sonar';
    const r = def.range * Math.tan((def.halfAngleDeg * Math.PI) / 180);
    const geo = new THREE.ConeGeometry(r, def.range, 32, 6, true);
    // apex at the origin, opening along +z
    geo.translate(0, -def.range / 2, 0);
    geo.rotateX(-Math.PI / 2);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uRange: { value: def.range }, uColor: { value: col(C.cyan) }, uRing: { value: col(C.ice) } },
      vertexShader, fragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    for (let i = 0; i < cones.length; i++) {
      const m = new THREE.Mesh(geo, this.mat);
      m.renderOrder = 20;
      m.name = 'sonar_cone';
      m.userData.noNormalPass = true;
      this.meshes.push(m);
      this.group.add(m);
    }
  }

  private static Z = new THREE.Vector3(0, 0, 1);

  sync(def: typeof SonarDef, cones: Cone[], time: number) {
    this.mat.uniforms.uTime.value = time;
    const dir = new THREE.Vector3();
    cones.forEach((c, i) => {
      const m = this.meshes[i];
      const [ax, ay, ad] = coneAxis(def, c.heading);
      dir.set(ax, -ad, ay).normalize();
      m.position.set(c.x, -c.d, c.y);
      m.quaternion.setFromUnitVectors(SonarView.Z, dir);
    });
  }
}
