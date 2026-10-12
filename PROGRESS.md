# Progress

What exists, what is stubbed, what is next. Updated at the end of every session.

## Status (2026-10-12, first session)

**Milestone 0, the proof of concept, is built: items 1-8 of `ROADMAP.md` are done and checked;
item 9 (the GitHub Pages deploy) waits for the owner's yes** (it publishes under the working
title, and `PLAN.md` asks for a name check first). `indie-critic` reviewed the first pass (12
findings, all fixed: `DECISIONS.md`, "The first indie-critic review"). Next is the owner's
evening with it and the four questions in `START-HERE.md`; then `DESIGN.md`.

**How to run:** double-click `Play.bat`, or `npm run dev` and open http://127.0.0.1:5180.
Keys: 1-4 camera presets, drag to orbit, right-drag to pan, wheel to zoom, P pixel pass on/off,
V sonar view / all fish, H HUD, Space pause, hold Shift for a fast clock. URL options: `?pixel=0`,
`?pixels=int` (integer upscale), `?cam=dock`, `?fish=2000`, `?seed=2`.

## What exists

- **Docs** rewritten for Trotline: `CLAUDE.md` (the discipline plus the 3D rules), `ROADMAP.md`
  (M0 = the proof of concept, M1 = the slice), `DECISIONS.md`, `IDEAS.md`; `THREEJS-NOTES.md`
  corrected where it was wrong for r186 and this PC ("Testing 3D headlessly", "Found in r186").
  `STYLE.md` and `DESIGN.md` come after the owner's look.
- **Agents** (`.claude/agents/`): `indie-critic` (Three.js indie dev and Texas reservoir angler),
  `art-director` (Blender scripts through the MCP), `qa-screens`, `balance-auditor` (idle until
  `DESIGN.md`).
- **Engine layer** from Sprocket & Sprout: loop (+ pure `time.ts`), input with rebindable actions,
  rng and noise, event queue, save slots with ordered migrations, audio (buses, tone/noise
  primitives, an empty jsfxr bank, a water bed, a ping on each sonar turn), bitmap font (+ degree,
  fish and ping glyphs), IMGUI kit, overlap audit.
- **Sim** (`src/sim/`, pure, tested without three): the hand-written 60 x 40 m lake (creek
  channel along a north bluff, 4-6 m basin, deep east pool, shallow south-west cove behind a spit,
  8 m mouth) with a monotone-cubic bed; bands as 2 m slabs with band-safe hold and hook depths;
  three rod stations on the bluff (surface 1.0 m, mid 3.0 m, bottom 6.7 m); a clock with water
  temperature; two schools on loops (500 bighead carp mid, 150 silver carp surface, the other way
  round), never closer than 0.5 m to the bed; one forward-facing sonar fan (20 degrees, 14 m, panning
  +/-40 degrees) that decides which fish are seen.
- **Render** (`src/render/`): bed and land with a 0.25 m colour texture and height-field normals,
  band contours, translucent water (depth tint stepped at the band edges, wobble, glints, foam, a
  lit underside), the schools as one InstancedMesh each (33 triangles, tail wobble, per-fish band
  glow drawn after the water), rod stations from `rigs.glb` (bobber at the surface for float rigs,
  sinker on the bed for the bottom rig, GL lines for line and rod, band rings), the sonar fan, lights
  by time of day, underwater fog, the orbit camera with four presets, the pixel pipeline
  (RenderPixelatedPass subclass with a linear-depth edge shader, OutputPass).
- **Rod station** (`art/rigs/build_rod_station.py`, by the art agent through the Blender MCP; runs
  live or headless, byte-identical output): 446 triangles, 64 x 64 Apollo atlas, 36.3 KB glb, nodes
  `rod_station`, `rod_butt`, `rod_mid`, `rod_tip`, `line`, `bobber`, `sinker`; preview in
  `art/rigs/preview.png`.
- **HUD**: clock, water temperature, sonar returns by band, fps, draw calls and triangles (scene
  and frame), internal resolution, camera preset, band legend, station tags, keys.
- **Harness**: `npm test` (38: sim purity through imports, the lake, band safety, schools, sonar
  geometry and scarcity, clock, saves and migrations, events, font coverage, the overlap audit);
  `npm run shots` (four presets x pixel on/off, all-fish, integer upscale; overview baseline diff
  0.00% run to run); `npm run screens` (HUD audit at 1280x720, 1920x1080, 1024x640: clean);
  `npm run perf`; `npm run smoke` (real keys and mouse: ok).

## Measured (2026-10-12, overview, frozen at the shots' tick, uncapped, p95 from synced frames)

| Device | Fish (drawn) | fps | p95 ms | Scene draw calls | Scene triangles |
|---|---|---|---|---|---|
| RTX 5070 | 650 (198 seen) | 635 | 2.0 | 20 | 23.7k |
| RTX 5070 | 650 (all) | 601 | 2.1 | 20 | 38.6k |
| RTX 5070 | 2,150 (515 seen) | 594 | 2.2 | 20 | 34.2k |
| RTX 5070 | 2,150 (all) | 531 | 2.9 | 20 | 88.1k |
| SwiftShader | 650 (198 seen) | 23.2 | 46.4 | 20 | 23.7k |
| SwiftShader | 650 (all) | 20.7 | 52.9 | 20 | 38.6k |
| SwiftShader | 2,150 (515 seen) | 23.2 | 47.3 | 20 | 34.2k |
| SwiftShader | 2,150 (all) | 15.2 | **73.4** | 20 | 88.1k |

A frame is ~1.8x the scene (the pixel pass renders twice, plus two quads). Everything is inside
the budget except SwiftShader with all 2,150 fish drawn, whose p95 (73 ms) is just over the 15 fps
line (66.7 ms); its average is 15.2 fps. In play the sonar keeps most fish undrawn.

## What's wrong (my own read of the shots, after the review's fixes)

- The lake outline is a rounded rectangle and the land is bare grass: a placeholder until the
  owner's Lake 1 notes (flooded timber, a dam face, a ramp...).
- The cove reads as murky flat water, better than ice but dull; it wants vegetation or timber.
- At the overview the bobbers are a pixel or two; the band ring carries the read.
- Up close the fish bodies are flat diamonds; Blender builds the fish family in Milestone 1.
- 2.667x upscale at 720p gives 2-3 px pixels; `?pixels=int` is there to compare.

## Not done / waiting

- **Deploy (Prompt 0 item 9)**: needs the owner's yes and a name check; the workflow is ready.
- **Lake 1 notes** in `PLAN.md`: the owner's.
- No sound design yet (a ping and a water bed); no meshopt compression (nothing to compress yet).

## PixelLab budget

Nothing spent.
