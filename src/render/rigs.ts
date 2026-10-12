// Rod stations from public/models/rigs.glb (built by art/rigs/build_rod_station.py in Blender).
// Each station is a clone placed on the bank from the sim; its line drops from the rod tip to the
// hook's band, where a ring in the band's colour marks the depth it fishes. The line is also drawn
// as a GL line, which stays exactly one pixel wide through the pixel pass at any zoom (a 3 cm mesh
// line is thinner than a pixel at 480x270 and would flicker away).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BAND_COLOR, C } from '../data/palette';
import { ROD_STATION } from '../data/rigs';
import type { Station } from '../sim/Game';
import { col } from './util';

export interface RigTemplate {
  root: THREE.Object3D;
  /** where it came from: the glb, or the code placeholder when the glb is missing */
  source: 'glb' | 'placeholder';
  triangles: number;
}

/** Make a loaded material pixel-crisp: nearest filtering, no mipmaps, Lambert shading. */
function crisp(m: THREE.Material): THREE.Material {
  const src = m as THREE.MeshStandardMaterial;
  const map = src.map ?? null;
  if (map) {
    map.magFilter = THREE.NearestFilter;
    map.minFilter = THREE.NearestFilter;
    map.generateMipmaps = false;
    map.colorSpace = THREE.SRGBColorSpace;
    map.needsUpdate = true;
  }
  const out = new THREE.MeshLambertMaterial({ map, color: map ? 0xffffff : src.color, flatShading: true });
  out.name = src.name;
  return out;
}

function countTriangles(o: THREE.Object3D): number {
  let n = 0;
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry;
    n += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return n;
}

export async function loadRigTemplate(url: string): Promise<RigTemplate> {
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    const root = gltf.scene.getObjectByName('rod_station');
    if (!root) throw new Error('rigs.glb has no rod_station node');
    const cache = new Map<THREE.Material, THREE.Material>();
    root.traverse((c) => {
      const m = c as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const out = mats.map((mm) => {
        if (!cache.has(mm)) cache.set(mm, crisp(mm));
        return cache.get(mm)!;
      });
      m.material = Array.isArray(m.material) ? out : out[0];
    });
    root.removeFromParent();
    return { root, source: 'glb', triangles: countTriangles(root) };
  } catch (err) {
    console.warn('rod station model not loaded, using the placeholder:', (err as Error).message);
    return placeholder();
  }
}

/** A stand-in built from boxes, with the same node names, so the scene works without the glb. */
function placeholder(): RigTemplate {
  const root = new THREE.Group();
  root.name = 'rod_station';
  const wood = new THREE.MeshLambertMaterial({ color: col(C.tan) });
  const dark = new THREE.MeshLambertMaterial({ color: col(C.copper) });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 1.6), wood);
  deck.position.set(0, 0.075, 0.5);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.3, 0.2), dark);
  post.position.set(0, 0.65, 1.1);
  const rodLen = Math.hypot(ROD_STATION.tipForward - 1.0, ROD_STATION.tipUp - 1.0);
  const rod = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, rodLen), new THREE.MeshLambertMaterial({ color: col(C.slate) }));
  rod.position.set(0, (1.0 + ROD_STATION.tipUp) / 2, (1.0 + ROD_STATION.tipForward) / 2);
  rod.rotation.x = -Math.atan2(ROD_STATION.tipUp - 1.0, ROD_STATION.tipForward - 1.0);
  const tip = new THREE.Object3D();
  tip.name = 'rod_tip';
  tip.position.set(0, ROD_STATION.tipUp, ROD_STATION.tipForward);
  const sinker = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshLambertMaterial({ color: col(C.ash) }));
  sinker.name = 'sinker';
  root.add(deck, post, rod, tip, sinker);
  return { root, source: 'placeholder', triangles: countTriangles(root) };
}

export class RigsView {
  group = new THREE.Group();
  private lines: THREE.LineSegments;
  /** world positions of each station's rod tip (for the sonar cone) */
  tips: THREE.Vector3[] = [];

  constructor(t: RigTemplate, stations: Station[]) {
    this.group.name = 'rigs';
    const linePos: number[] = [];
    for (const s of stations) {
      const st = t.root.clone(true);
      st.name = 'rod_station';
      st.position.set(s.x, s.ground, s.y);
      // the model's forward is +z; turn it to face the station's heading
      st.rotation.y = Math.atan2(Math.cos(s.facing), Math.sin(s.facing));
      this.group.add(st);
      st.updateMatrixWorld(true);
      const tipNode = st.getObjectByName('rod_tip');
      const tip = tipNode ? tipNode.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(s.hookX, s.ground + ROD_STATION.tipUp, s.hookY);
      this.tips.push(tip);
      const hook = new THREE.Vector3(tip.x, -s.hookDepth, tip.z);
      // the model's own line (1 m long, origin at its top) stretched to the hook, and its sinker moved there
      // (the model's own 3 cm line breaks into dots under the pixel pass beside the GL line, so the
      // GL line alone draws it; the mesh stays in the file for close-ups later)
      const line = st.getObjectByName('line');
      if (line) {
        line.scale.y = tip.y - hook.y;
        line.visible = false;
      }
      const sinker = st.getObjectByName('sinker');
      if (sinker) {
        sinker.position.copy(sinker.parent!.worldToLocal(hook.clone()));
      }
      linePos.push(tip.x, tip.y, tip.z, hook.x, hook.y, hook.z);
      // the band marker: a flat ring in the band's colour at the hook
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.55, 20).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: col(BAND_COLOR[s.band]), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
      );
      ring.position.copy(hook);
      ring.renderOrder = 2;
      ring.name = 'band_ring';
      ring.userData.noNormalPass = true;
      this.group.add(ring);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col(C.bone) }));
    this.lines.name = 'fishing_lines';
    this.group.add(this.lines);
  }
}
