// The pixel look: three's RenderPixelatedPass at a fixed 270 lines (480 x 270 at 16:9), then
// OutputPass for sRGB (the pixelated shader writes linear colour and does no conversion).
// Two changes from the stock pass:
//  - its second render (normals, for the edge highlights) skips see-through things that don't
//    write depth (water, sonar fans, band rings, contours), so their normals don't paint edges
//    over what is under them;
//  - its edge shader compares *linear* depth, relative to distance: the stock one thresholds raw
//    perspective depth, so at the overview an edge needed a ~250 m step and never fired (the first
//    review measured 0.00% of pixels changing with the depth edge on or off).
// It also records what the beauty render alone cost, for the HUD.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/** internal resolution: lines of pixels, top to bottom; width follows the window's aspect */
export const PIXEL_LINES = 270;

/** The r186 pass's internals (the shipped @types still name them without the underscore). */
interface PassInternals {
  _beautyRenderTarget: THREE.WebGLRenderTarget;
  _normalRenderTarget: THREE.WebGLRenderTarget;
  _normalMaterial: THREE.MeshNormalMaterial;
  _fsQuad: { material: THREE.ShaderMaterial; render(r: THREE.WebGLRenderer): void };
  _renderResolution: THREE.Vector2;
}

/** The stock pass's fragment shader with getDepth returning view distance (m), and both edge
 *  tests made relative to it. */
const EDGE_SHADER = /* glsl */ `
  #include <packing>
  uniform sampler2D tDiffuse;
  uniform sampler2D tDepth;
  uniform sampler2D tNormal;
  uniform vec4 resolution;
  uniform float normalEdgeStrength;
  uniform float depthEdgeStrength;
  uniform float cameraNear;
  uniform float cameraFar;
  varying vec2 vUv;

  float getDepth(int x, int y) {
    float d = texture2D(tDepth, vUv + vec2(x, y) * resolution.zw).r;
    return -perspectiveDepthToViewZ(d, cameraNear, cameraFar);
  }
  vec3 getNormal(int x, int y) {
    return texture2D(tNormal, vUv + vec2(x, y) * resolution.zw).rgb * 2.0 - 1.0;
  }
  // how much farther each neighbour is, as a fraction of this pixel's distance
  float depthEdgeIndicator(float depth) {
    float diff = 0.0;
    diff += clamp((getDepth(1, 0) - depth) / depth, 0.0, 1.0);
    diff += clamp((getDepth(-1, 0) - depth) / depth, 0.0, 1.0);
    diff += clamp((getDepth(0, 1) - depth) / depth, 0.0, 1.0);
    diff += clamp((getDepth(0, -1) - depth) / depth, 0.0, 1.0);
    return floor(smoothstep(0.015, 0.035, diff) * 2.) / 2.;
  }
  float neighborNormalEdgeIndicator(int x, int y, float depth, vec3 normal) {
    float depthDiff = (getDepth(x, y) - depth) / depth;
    vec3 neighborNormal = getNormal(x, y);
    vec3 normalEdgeBias = vec3(1., 1., 1.);
    float normalDiff = dot(normal - neighborNormal, normalEdgeBias);
    float normalIndicator = clamp(smoothstep(-.01, .01, normalDiff), 0.0, 1.0);
    // only the nearer pixel of the two draws the edge
    float depthIndicator = clamp(sign(depthDiff + .002), 0.0, 1.0);
    return (1.0 - dot(normal, neighborNormal)) * depthIndicator * normalIndicator;
  }
  float normalEdgeIndicator(float depth, vec3 normal) {
    float indicator = 0.0;
    indicator += neighborNormalEdgeIndicator(0, -1, depth, normal);
    indicator += neighborNormalEdgeIndicator(0, 1, depth, normal);
    indicator += neighborNormalEdgeIndicator(-1, 0, depth, normal);
    indicator += neighborNormalEdgeIndicator(1, 0, depth, normal);
    return step(0.1, indicator);
  }
  void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    float depth = getDepth(0, 0);
    vec3 normal = getNormal(0, 0);
    float dei = depthEdgeStrength > 0.0 ? depthEdgeIndicator(depth) : 0.0;
    float nei = normalEdgeStrength > 0.0 ? normalEdgeIndicator(depth, normal) : 0.0;
    float strength = dei > 0.0 ? (1.0 - depthEdgeStrength * dei) : (1.0 + normalEdgeStrength * nei);
    gl_FragColor = texel * strength;
  }
`;

export class TrotPixelPass extends RenderPixelatedPass {
  beautyCalls = 0;
  beautyTriangles = 0;

  constructor(pixelSize: number, scene: THREE.Scene, camera: THREE.Camera) {
    super(pixelSize, scene, camera);
    const m = this.pixelatedMaterial;
    m.fragmentShader = EDGE_SHADER;
    m.uniforms.cameraNear = { value: 0.1 };
    m.uniforms.cameraFar = { value: 1000 };
    m.needsUpdate = true;
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget) {
    const p = this as unknown as PassInternals;
    const uniforms = p._fsQuad.material.uniforms;
    uniforms.normalEdgeStrength.value = this.normalEdgeStrength;
    uniforms.depthEdgeStrength.value = this.depthEdgeStrength;
    const cam = this.camera as THREE.PerspectiveCamera;
    uniforms.cameraNear.value = cam.near;
    uniforms.cameraFar.value = cam.far;

    const info = renderer.info.render;
    const c0 = info.calls, t0 = info.triangles;
    renderer.setRenderTarget(p._beautyRenderTarget);
    renderer.render(this.scene, this.camera);
    this.beautyCalls = info.calls - c0;
    this.beautyTriangles = info.triangles - t0;

    const hidden: THREE.Object3D[] = [];
    this.scene.traverseVisible((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (o.userData.noNormalPass || (m && !Array.isArray(m) && m.transparent && !m.depthWrite)) hidden.push(o);
    });
    for (const o of hidden) o.visible = false;
    const old = this.scene.overrideMaterial;
    renderer.setRenderTarget(p._normalRenderTarget);
    this.scene.overrideMaterial = p._normalMaterial;
    renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = old;
    for (const o of hidden) o.visible = true;

    uniforms.tDiffuse.value = p._beautyRenderTarget.texture;
    uniforms.tDepth.value = p._beautyRenderTarget.depthTexture;
    uniforms.tNormal.value = p._normalRenderTarget.texture;
    if (this.renderToScreen) renderer.setRenderTarget(null);
    else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    p._fsQuad.render(renderer);
  }

  get internal(): [number, number] {
    const r = (this as unknown as PassInternals)._renderResolution;
    return [r.x, r.y];
  }
}

export class PixelPipeline {
  composer: EffectComposer;
  pass: TrotPixelPass;
  output: OutputPass;
  /**
   * Integer upscale: the internal height is the window's divided by a whole number near 270 lines
   * (240 at 720p, 270 at 1080p), so every pixel is the same size on screen. Off by default: the
   * notes ask for 480 x 270; on with ?pixels=int, for the owner to compare (DECISIONS.md).
   */
  integer = false;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.pass = new TrotPixelPass(2, scene, camera);
    // set after construction: the constructor reads `options.x || default`, so a 0 can't be passed in
    this.pass.normalEdgeStrength = 0.35;
    this.pass.depthEdgeStrength = 0.45;
    this.output = new OutputPass();
    this.composer.addPass(this.pass);
    this.composer.addPass(this.output);
  }

  /** drawing-buffer size in device pixels */
  setSize(cssW: number, cssH: number, pixelRatio: number) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(cssW, cssH);
    // the pass divides the device-pixel height by pixelSize: pick it so that comes to PIXEL_LINES
    const h = cssH * pixelRatio;
    this.pass.setPixelSize(this.integer ? Math.max(1, Math.round(h / PIXEL_LINES)) : h / PIXEL_LINES);
  }

  render() {
    this.composer.render();
  }
}
