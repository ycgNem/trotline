# Three.js — what to know before the first line

Read this once yourself; Claude Code reads it every session. It is the 3D equivalent of the
"Canvas 2D, imageSmoothingEnabled = false, integer zoom" rules that kept Sprocket & Sprout
crisp.

## What Three.js is, in one paragraph

A scene graph on top of WebGL. You make a `Scene`, put `Object3D`s in it (meshes = geometry +
material, lights, groups), point a `Camera` at it, and a `WebGLRenderer` draws it to a canvas
every frame. Units are whatever you say they are (we say **1 unit = 1 meter**), **Y is up**,
and the camera looks down its own −Z. It ships with TypeScript types, installs with
`npm i three`, and Vite handles it with no config. Pin the version in `package.json` at setup
and write it in `DECISIONS.md`; the API moves between releases and Claude should read the
docs for the pinned one (`node_modules/three/docs` is not shipped; use
https://threejs.org/docs/ and `node_modules/three/src` as the source of truth).

## The rules for this project

1. **Three.js lives only in `src/render/`.** The sim knows positions, bands and states as
   numbers; the renderer maps them to meshes. Same split as S&S.
2. **Camera**: a `PerspectiveCamera` with a narrow FOV (~25°) looking down at ~55°, orbiting
   around a target on the lake, zoom by dolly with clamped distance. Not fully orthographic
   (depth under water needs perspective to read), not free-look (it's a TD).
3. **The look**: low-poly meshes, pixel-art textures with `NearestFilter` and no mipmaps,
   `MeshLambertMaterial` or `MeshToonMaterial` (cheap, flat-ish), one directional light plus
   a hemisphere light, and `RenderPixelatedPass` from `three/addons/postprocessing` at
   **480×270** internal resolution scaled to the window. That pass is what makes a 3D scene
   read as pixel art. No PBR, no SSAO, no bloom until Milestone 9, and then only if it
   survives the pixel pass.
4. **Water** is a single transparent plane with a small vertex-wobble shader and a depth tint
   (deeper = darker), `depthWrite = false`, rendered last. Fish under it are visible because
   the plane is translucent, not because of refraction. The three depth bands are drawn as
   faint contour lines on the lake bed.
5. **Many fish = `InstancedMesh`**, one per species, with a per-instance matrix updated from
   the sim each frame. Never one `Mesh` per fish. Budget: 2,000 instances on screen at 60 fps.
6. **Picking** (mouse → lake grid or rig) is a `Raycaster` against an invisible ground plane
   and a list of rig hitboxes, not against every mesh in the scene.
7. **Assets**: Blender → `.glb` (glTF binary) → `GLTFLoader`, compressed with meshopt at
   build time. One `.glb` per asset family (rigs, fish, props), merged materials, ≤ 2k
   triangles per rig, ≤ 300 per fish. Textures 64×64 or 128×128, one atlas per family. Total
   download budget **15 MB**.
8. **Transparency order** bites: anything transparent (water, sonar cones, salvinia) gets an
   explicit `renderOrder` and `depthWrite = false`. Sonar cones are additive-blended.
9. **Resize and DPI**: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`; the pixel pass
   sets the internal resolution, so the window size only changes the upscale.
10. **Dispose** geometries, materials and textures when a run ends; WebGL memory does not
    garbage-collect itself.
11. **Perf budget**, measured by `e2e/perf.mjs` every milestone: ≤ 100 draw calls, ≤ 150k
    triangles on screen, ≥ 60 fps on the owner's PC and ≥ 30 fps on a 2020 laptop with
    integrated graphics (headless Chromium with SwiftShader is the proxy; if it holds 15 fps
    there, the laptop target is safe).

## Blender through the MCP

The Blender MCP on this PC lets Claude run Python in Blender: build low-poly models
procedurally (a rod station is boxes, a cylinder and a line; a carp is a stretched sphere with
a flattened tail), UV-unwrap, assign the pixel texture, and export `.glb`. Keep every asset as
a **script** in `art/<family>/build_<asset>.py`, not as a `.blend` you edit by hand; the script
is the source and can be re-run after a palette or budget change. Export with
`bpy.ops.export_scene.gltf(filepath=..., export_format='GLB', export_apply=True)`. Preview via
the viewport screenshot tool before exporting. No skeletal animation in the first two
milestones: fish swim by sim-driven position and a small procedural tail wobble in the vertex
shader; rigs animate by moving parts (a line dropping is a scaled cylinder).

## Testing 3D headlessly

Playwright's Chromium has no GPU. Launch with
`--use-angle=swiftshader --enable-unsafe-swiftshader` (and `--ignore-gpu-blocklist`);
Claude verifies which flags the pinned Chromium needs on the first run and writes them into
`e2e/launch.mjs`. Screenshots from **named camera presets** (`overview`, `cove`, `dock`,
`underwater-mid`) so "does this look right" has fixed angles. Pixel-diff the overview preset
against a stored baseline to catch rendering regressions. The sim is tested without three.

## Things that look like good ideas and aren't

- react-three-fiber: only if the game were React. It isn't.
- A physics engine: not needed. Fish follow sim paths; nothing collides but the skiff and the
  shore, which is a 2D check on the grid. Rapier can come later if a mechanic demands it.
- Shadows: expensive and mostly invisible under the pixel pass. One cheap blob under the
  skiff, nothing else.
- HDR environment maps, reflections, refraction: no.
- Free camera: no. Presets and orbit only.
- Loading models from the internet: no; everything is ours, built by script.

## Learning references (for Claude, and for you if you're curious)

- threejs.org/docs, and threejs.org/examples: `webgl_postprocessing_pixel` (the pixel pass),
  `webgl_instancing_performance`, `webgl_water`, `webgl_loader_gltf`.
- Bruno Simon's Three.js Journey for the mental model, if you want to understand what Claude
  is doing. Not required.
