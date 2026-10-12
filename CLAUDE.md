# CLAUDE.md — Trotline

You are building **Trotline** (working title), a 3D browser tower defense about fishing an
invasive run out of a lake before it spreads. Read `HANDOFF.md` (where the last session stopped,
once it exists) first, then `PLAN.md` (what and why), `THREEJS-NOTES.md` (the 3D rules),
`DESIGN.md` (every number and its derivation, once it exists: it is written after the proof of
concept), `ROADMAP.md` (what to build now), `STYLE.md` (how it looks, once it exists) and
`PROGRESS.md` (what exists) at the start of every session, in that order. `DECISIONS.md` holds
every design decision with its reason; add to it, never silently contradict it.

## Stack (decided, don't relitigate)

TypeScript strict · Vite · **Three.js, pinned** (version in `DECISIONS.md`; read
https://threejs.org/docs and `node_modules/three/src` for that version, never memory) ·
low-poly meshes with pixel textures through `RenderPixelatedPass` at **480×270** ·
fixed 60 Hz pure simulation decoupled from a rAF renderer · HUD on a 2D canvas overlay drawn
with the immediate-mode UI kit and the bitmap font · Web Audio (procedural + jsfxr bank) ·
localStorage saves with versioned migrations · Vitest for the sim · Playwright + headless
Chromium (SwiftShader, flags in `e2e/launch.mjs`) for screenshots, perf and bot play ·
Blender through the MCP for every model, as scripts · GitHub Pages via the workflow ·
Electron packaging later.

The engine layer came from Sprocket & Sprout (`C:\Users\jacks\Documents\sprocket-and-sprout`):
`src/engine/` (loop, input and keybinds, rng, events, audio, saves and migrations), the UI kit,
the font and the overlap audit, the e2e harness shape, `Play.bat`, `Package for web.bat` and the
deploy workflow. **Nothing from its `sim/`, `data/` or `render/`/art is to be copied, adapted or
consulted**, and nothing from Last Watt's (`C:\Users\jacks\Documents\candlepower`) sim or data
either. Bait is a flow re-derived for bait in `DESIGN.md`; Last Watt's satisfaction rule does not
apply (`PLAN.md` not-list).

## Architecture rules

- `src/sim/` is pure: no `three`, no DOM, canvas, audio or timers. It runs headless in tests,
  and a test fails the build if any file under `src/sim/` imports `three`. Presentation effects
  are events on the game's event queue (`src/engine/events.ts`), drained by the renderer.
- Sim coordinates: `x` east and `y` south across the lake in meters, `d` depth below the surface
  in meters (positive down). The renderer maps `(x, y, d)` to three's `(x, -d, y)`; the water
  surface is `Y = 0`. **1 unit = 1 meter, Y is up.**
- One system per file in `src/sim/systems/`, run in a fixed order from `Game.ts` (proof of
  concept: clock → school → sonar; the slice's order is set in `DESIGN.md`).
- Vision is computed once per tick, before anything that reads it: fish read their `seen` flag,
  they never test cones themselves.
- All content is typed data in `src/data/` (lakes, rigs, species, bait, waves, lore). From the
  slice on, a validation test checks every cross-reference and that **every numeric stat has a
  `derivation` string** pointing at a section of `DESIGN.md`.
- Saves: seed + deltas, `SAVE_VERSION` + ordered migrations (`src/engine/save.ts`), from the
  first milestone that has state worth saving.

## The 3D rules (from `THREEJS-NOTES.md`; that file has the reasons)

1. Three.js lives only in `src/render/` (and `src/app/` wiring). The sim knows numbers.
2. Camera: `PerspectiveCamera`, FOV 25°, ~55° down, orbiting a target on the lake, dolly zoom
   with clamped distance, four named presets (`overview`, `cove`, `dock`, `underwater-mid`).
   No free camera.
3. Look: low-poly, pixel textures with `NearestFilter` and no mipmaps, `MeshLambertMaterial` or
   `MeshToonMaterial`, one directional + one hemisphere light, the pixel pass at 480×270. No
   PBR, SSAO, bloom, shadows (one blob under the skiff), env maps, reflections or refraction.
4. Water: one transparent plane, small vertex wobble, depth tint, `depthWrite = false`, drawn
   last. Things under it read by translucency and depth fog, not refraction. Bands are faint
   contour lines on the bed.
5. Many fish = one `InstancedMesh` per species, matrices from the sim each frame. Never a
   `Mesh` per fish. 2,000 instances on screen at 60 fps.
6. Picking: a `Raycaster` against an invisible ground plane and rig hitboxes only.
7. Assets: Blender → `.glb` → `GLTFLoader`, one `.glb` per family (rigs, fish, props), ≤ 2k
   triangles per rig, ≤ 300 per fish, 64×64 or 128×128 textures, total download ≤ 15 MB.
   Every asset is a script `art/<family>/build_<asset>.py`, never a hand-edited `.blend`.
8. Anything transparent (water, sonar cones, salvinia) has an explicit `renderOrder` and
   `depthWrite = false`; sonar cones are additive.
9. `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`; the pixel pass owns the internal
   resolution.
10. Dispose geometries, materials and textures when a run ends.
11. Perf budget, measured by `e2e/perf.mjs` every milestone: ≤ 100 draw calls, ≤ 150k triangles,
    ≥ 60 fps on the owner's PC, ≥ 15 fps in headless SwiftShader (the 2020-laptop proxy).

## Definition of done (every milestone, every PR-sized change)

1. `npm run typecheck` clean, `npm test` green (sim tests, purity test, data validation, pace
   tests).
2. `npm run screens` run and the report inspected: no overlapping or cut-off HUD text.
3. For anything the player sees: `npm run shots` (the four camera presets) and **look at the
   PNGs** (Read them). Say what's wrong before anyone else has to.
4. `npm run perf` within the budget above; numbers written in `PROGRESS.md`.
5. For anything that changes a number: the derivation updated in `DESIGN.md`, and the pace test
   that encodes the lesson still passes (or is updated with the new reasoning written down).
6. `PROGRESS.md` updated (what exists, what is stubbed, what is next). `DECISIONS.md` updated if
   a decision was made. Commit with a message that says what and why.

## Standing instructions

- **Vertical slice first.** Until `ROADMAP.md` Milestone 2's gate is marked passed, build nothing
  from Milestone 3 onward, however tempting. Add ideas to `IDEAS.md` instead.
- **Flag anything derivative.** If a mechanic, number, name, species card, rig or UI pattern you
  are about to write resembles a specific shipped game, stop and say so in chat and in
  `DECISIONS.md`, then either re-derive it from how fishing works or drop it. The not-list in
  `PLAN.md` is a floor, not the whole list.
- **Fishing is true.** Real species, real behaviour (depth, structure, fronts, temperature,
  bait, bycatch, spoilage), simplified but never faked. If a mechanic needs a fact, write the
  fact and its source in `DESIGN.md`. The owner's time on the water outranks any article.
- **No new currency, no new tree** without a `DECISIONS.md` entry explaining which pillar it
  serves and why the four currencies (money, bait, reputation, spread) and the one lore tree
  can't carry it.
- **Every rig upgrade has a catch-side column**: it changes a catch rate, a band, bait use,
  selectivity or bycatch. An upgrade that only adds money or looks is rejected by the data test.
- **Readability over detail.** If the `overview` shot doesn't make which band a fish is in,
  what the sonar sees and which rigs are idle obvious within a second, fix that before adding
  anything.
- When the build is runnable, play it with the bot before asking for a review, and send
  screenshots of the moments that matter (first catch in the wrong band, first rig idle for
  bait, first bycatch, the first front pushing a run down a band).
- Ask before: changing the band count, the internal resolution, the tick rate, the units, the
  currency list, the pinned three version, the palette (once `STYLE.md` fixes it), or the
  milestone order. Everything else: decide, write it down, move on.
- **Nothing public without the owner's yes**: creating the GitHub repo, pushing, or deploying
  the Pages build. `PLAN.md` asks for a name check before the first public build.

## Agents (in `.claude/agents/`)

- `indie-critic`: design review against `PLAN.md` pillars and the not-list, and against fishing
  as it is; runs at every milestone and at the Milestone 2 gate. It plays the build and does the
  catch-rate arithmetic itself.
- `art-director`: owns `STYLE.md` (once written), builds models as Blender scripts through the
  MCP and their pixel textures in the palette, previews in Blender's viewport before exporting,
  and checks every asset in the game's own shots. Never copies a reference model.
- `qa-screens`: runs the shots, perf and HUD overlap checks and reports.
- `balance-auditor`: from the slice on, reads `src/data/*`, recomputes every derived check in
  `DESIGN.md` from the current numbers, and reports any lesson that no longer holds.

## Environment notes

Windows. Node is the portable v22.20.0 at `C:\Users\jacks\tools\node-v22.20.0-win-x64` (on the
user PATH; a shell that predates it needs `export PATH="/c/Users/jacks/tools/node-v22.20.0-win-x64:$PATH"`).
Blender 5.2.2 LTS at `C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe`;
drive the live instance with the **blender-assets** MCP (`mcp__blender-assets__*`: execute code,
`look`), and build in a scene of the script's own (`trotline_rigs`), never in the owner's open
scene. Asset scripts also run headless: `blender.exe --background --factory-startup --python
art/<family>/build_<asset>.py`. Playwright 1.48.2's Chromium is already downloaded
(`ms-playwright/chromium-1140`). The repo will be public: no tokens, account names or emails in
any file. PixelLab (`mcp__pixellab__*`) is available for 2D textures if a script can't draw one;
say what you spent in `PROGRESS.md`.
