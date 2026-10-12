// Small shared render helpers: palette colours as three.js colours, the sim-to-three axis map,
// and the underwater depth fog that bed, fish and sinkers share so depth reads on the thing itself.
import * as THREE from 'three';
import { C } from '../data/palette';

/** A palette hex as a THREE.Color (setHex treats it as sRGB and stores linear, as three expects). */
export function col(hex: string): THREE.Color {
  return new THREE.Color().setHex(parseInt(hex.slice(1), 16), THREE.SRGBColorSpace);
}

/** sim (x east, y south, d depth) -> three (x, -d, y) */
export function simToThree(x: number, y: number, d: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(x, -d, y);
}

export interface DepthFogOpts {
  /** e-folding depth (m): the fog is (1 - exp(-depth / this)) of `max` */
  depth: number;
  /** the most the colour is pulled toward the water colour, 0..1 */
  max: number;
  color: string;
}

/** the bed: blue from the first meter, so sand under water reads as water and not as glass */
export const DEPTH_FOG: DepthFogOpts = { depth: 3.2, max: 0.82, color: C.deep };
/** fish: lighter, so a return at the bottom band still shows */
export const FISH_FOG: DepthFogOpts = { depth: 4, max: 0.5, color: C.deep };

/**
 * Pull a Lambert/Basic material's lit colour toward deep water by how far below the surface the
 * fragment is. Works with instancing (the world position includes instanceMatrix).
 */
export function addDepthFog(m: THREE.Material, key: string, o: DepthFogOpts = DEPTH_FOG, extraVertex?: (shader: THREE.WebGLProgramParametersWithUniforms) => void) {
  // three caches programs by onBeforeCompile's source text, which is the same closure for every
  // material here: the key keeps a fish's wobble out of the bed's program
  m.customProgramCacheKey = () => 'depthfog:' + key;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uFogDeep = { value: col(o.color) };
    shader.uniforms.uFogDepth = { value: o.depth };
    shader.uniforms.uFogMax = { value: o.max };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vUnder;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec4 wpFog = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wpFog = instanceMatrix * wpFog;
          #endif
          wpFog = modelMatrix * wpFog;
          vUnder = -wpFog.y;
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vUnder;\nuniform vec3 uFogDeep;\nuniform float uFogDepth;\nuniform float uFogMax;')
      .replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, uFogDeep, vUnder > 0.0 ? (1.0 - exp(-vUnder / uFogDepth)) * uFogMax : 0.0);\n#include <opaque_fragment>');
    extraVertex?.(shader);
  };
}
