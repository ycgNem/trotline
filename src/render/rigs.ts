// Rod stations from public/models/rigs.glb (built by art/rigs/build_rod_station.py in Blender).
// Each station is a clone placed on the bank from the sim; its line drops from the rod tip to the
// hook's band, where a ring in the band's colour marks the depth it fishes. Rigged the way they
// are fished: a float rig (surface, mid) has its bobber floating at the surface and the hook hanging
// below it; a bottom rig has no bobber and its sinker lying on the bed. The line and the rod blank
// are also drawn as GL lines, which stay exactly one pixel wide through the pixel pass at any
// zoom (a 3 cm line or a 4 cm blank is thinner than a pixel at 480x270 and breaks up).
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
  private rods: THREE.LineSegments;
  /** world positions of each station's rod tip (for the sonar cone) */
  tips: THREE.Vector3[] = [];

  constructor(t: RigTemplate, stations: Station[]) {
    this.group.name = 'rigs';
    const linePos: number[] = [];
    const rodPos: number[] = [];
    const at = (st: THREE.Object3D, name: string, fallback: [number, number, number]) => {
      const n = st.getObjectByName(name);
      return n ? n.getWorldPosition(new THREE.Vector3()) : st.localToWorld(new THREE.Vector3(...fallback));
    };
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
      const float = s.band !== 'bottom';
      const bobber = st.getObjectByName('bobber');
      if (bobber) {
        bobber.visible = float;
        // its centre on the water, where the line enters it
        bobber.position.copy(st.worldToLocal(new THREE.Vector3(tip.x, 0, tip.z)));
      }
      const sinker = st.getObjectByName('sinker');
      if (sinker) {
        // a float rig's sinker sits just above the hook; a bottom rig's lies on the bed
        const y = float ? hook.y + 0.15 : -s.bed + 0.08;
        sinker.position.copy(st.worldToLocal(new THREE.Vector3(tip.x, y, tip.z)));
      }
      const end = float ? hook : new THREE.Vector3(tip.x, -s.bed + 0.08, tip.z);
      linePos.push(tip.x, tip.y, tip.z, end.x, end.y, end.z);
      // the blank as a polyline butt -> mid -> tip (node positions from the glb; the fallbacks are
      // the same points measured from it)
      const butt = at(st, 'rod_butt', [0, 1.036, 1.573]), mid = at(st, 'rod_mid', [0, 1.829, 2.666]);
      rodPos.push(butt.x, butt.y, butt.z, mid.x, mid.y, mid.z, mid.x, mid.y, mid.z, tip.x, tip.y, tip.z);
      // the band marker: a flat ring in the band's colour at the hook
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.55, 20).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: col(BAND_COLOR[s.band]), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }),
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
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rodPos, 3));
    this.rods = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: col(C.iron) }));
    this.rods.name = 'rod_blanks';
    this.group.add(this.rods);
  }
}
