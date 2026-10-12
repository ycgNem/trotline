// The pixel look: three's RenderPixelatedPass at a fixed 270 lines (480 x 270 at 16:9), then
// OutputPass for sRGB (the pixelated shader writes linear colour and does no conversion).
// One change from the stock pass: its second render (normals, for the edge highlights) skips
// transparent things (water, sonar cones, band rings), so their normals don't paint edges over
// what is under them. It also records what the beauty render alone cost, for the HUD.
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

export class TrotPixelPass extends RenderPixelatedPass {
  beautyCalls = 0;
  beautyTriangles = 0;

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget) {
    const p = this as unknown as PassInternals;
    const uniforms = p._fsQuad.material.uniforms;
    uniforms.normalEdgeStrength.value = this.normalEdgeStrength;
    uniforms.depthEdgeStrength.value = this.depthEdgeStrength;

    const info = renderer.info.render;
    const c0 = info.calls, t0 = info.triangles;
    renderer.setRenderTarget(p._beautyRenderTarget);
    renderer.render(this.scene, this.camera);
    this.beautyCalls = info.calls - c0;
    this.beautyTriangles = info.triangles - t0;

    const hidden: THREE.Object3D[] = [];
    this.scene.traverseVisible((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (o.userData.noNormalPass || (m && !Array.isArray(m) && m.transparent)) hidden.push(o);
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
    this.pass.setPixelSize((cssH * pixelRatio) / PIXEL_LINES);
  }

  render() {
    this.composer.render();
  }
}
