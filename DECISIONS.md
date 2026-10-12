# Decisions

Every design decision with its reason, newest at the bottom. Format: date, decision, why, what it
rules out.

## Carried from the plan

- 2026-10-12: **Four currencies: money, bait, reputation, spread** (`PLAN.md`). Why: the plan; a
  fifth needs an entry here. Rules out: a separate research or XP currency in the run.
- 2026-10-12: **Three depth bands** (surface, mid, bottom). Why: `PLAN.md` pillar 1. Rules out:
  continuous depth as a mechanic (fish have depths, rigs fish bands).
- 2026-10-12: Bait is a typed flow consumed per catch; Last Watt's satisfaction rule does not
  apply (`PLAN.md` not-list). Re-derived in `DESIGN.md` when it is written.

## Milestone 0, the proof of concept (2026-10-12)

- **Order of projects.** Trotline's proof of concept now; Last Watt (the `candlepower` folder) has
  already passed its Milestone 2 gate, so `START-HERE.md`'s "which first" is settled. Why: the
  owner asked for Trotline. Rules out: nothing in Last Watt changes.
- **three 0.186.1, pinned exactly** (`@types/three` 0.186.0, the newest types). Why: the current
  release on 2026-10-12. Toolchain pinned to what Sprocket & Sprout and Last Watt already run on
  this PC: Vite 5.4.10, Vitest 2.1.4, Playwright 1.48.2, TypeScript 7.0.2 (the native compiler, the
  same as Last Watt's LSP). Rules out: floating `^` ranges for three.
- **Units and axes.** 1 unit = 1 m, Y up. The sim uses `x` east, `y` south, `d` depth below the
  surface (positive down); the renderer maps `(x, y, d)` to three's `(x, -d, y)`; the water surface
  is `Y = 0`. Why: the sim should speak depth, the thing the game is about. Rules out: the sim
  storing three-space vectors.
- **Bands, provisional: 2 m slabs**: surface 0-2 m, mid 2-4 m, bottom 4 m to the bed. A fish holds
  mid-slab (1 m, 3 m) or 1 m off the bed for the bottom band. The bed's three contour lines are at
  each band's lower edge: **2, 4 and 6 m**. Band colours: surface cyan `#73bed3`, mid gold
  `#e8c170`, bottom pink `#c65197`, used for contours, band rings, station tags and fish glow alike.
  Why: three slabs read in a 4-9 m Texas reservoir arm; one colour per band everywhere makes the
  band the first thing you read. `DESIGN.md` may move the edges; the count needs the owner.
- **The lake is a hand-written 31 x 21 grid of depths every 2 m** (`src/data/lake.ts`), Catmull-Rom
  between points, used by the sim and the renderer alike. A creek channel along a north bluff (where
  the rod stations stand on deep water, the classic channel-swing bank), a 4-6 m basin, a deep pool
  by the east bank, and a shallow south-west cove behind a spit with an 8 m mouth. Why: a hand
  array is editable and reviewable as text; Catmull-Rom passes through the hand values and curves
  the shore (bilinear made 2 m sawteeth). Not Lake 1: the owner's Lake 1 notes are still to come.
- **Palette: Apollo (46), provisional**, the same as Last Watt's. Why: art could not start without
  one; Apollo's water and wood ramps suit a lake; `STYLE.md` (later) fixes it with the owner. Rules
  out: treating it as decided.
- **Pixel pass: `RenderPixelatedPass` at a fixed 270 lines**, width from the window's aspect
  (exactly 480 x 270 at 16:9), then `OutputPass`. `pixelSize = drawingBufferHeight / 270`.
  Normal edge 0.35, depth edge 0.45. Our subclass skips transparent objects (water, cones, rings,
  contours) in the pass's second, normals-only render, and records the beauty render's own draw
  calls and triangles for the HUD. Why: the notes ask for 480 x 270; the stock pass would paint the
  water's and cones' normals as edges over what is under them. Facts about r186 found on the way:
  the pass renders the scene **twice** (so a frame's draw calls are 2x the scene's plus two quads);
  it writes linear colour, so it needs `OutputPass` after it; its constructor reads
  `options.x || default`, so an edge strength of 0 must be set after construction. Rules out:
  counting the normals render against the 100-draw-call budget (the HUD shows both).
- **Non-integer upscale accepted for now.** At 1280 x 720 the 480 x 270 image is scaled 2.667x, so
  pixels are 2 or 3 screen pixels wide. Integer scales come at 1080p (4x) and 1440p (5.33x, no).
  The alternative (an integer scale with a letterbox, or a floating internal size) is the owner's
  call after looking; noted for `STYLE.md`.
- **Camera numbers.** FOV 25 degrees; above water pitch 22-80 degrees, distance 10-120 m; under
  water pitch -25 to 18 degrees, distance 5-26 m; the target is clamped over the lake. Presets
  (target, yaw, pitch, distance): overview (0,-1,-1.5) 0/55/86; cove (-17,-0.5,9) 32/48/36; dock
  (1,-1.5,-14.5) -16/30/33; underwater-mid (5,-3,-5) 70/4/14. Left-drag orbits, right-drag pans,
  wheel dollies; keys 1-4 pick presets.
- **The school is bighead carp** (PLAN.md's mid-band invasive), 500 by default, drawn 1.1 m long
  (oversized a little from the common 0.6-1 m so a fish is ~8 internal pixels at the overview), on
  an ellipse over the basin at 1.1 m/s. Body built in code (33 triangles) for the proof of concept;
  Blender builds the fish family from Milestone 1. Why: Prompt 0 asks for one Blender asset.
- **A seen fish glows in its band's colour** (emissive, strong far off, faint up close), over its
  own markings. Why: at 3 m under the water a grey carp was invisible against the bed in the first
  shots; vision *is* sonar in this game, so drawing returns as returns is honest, and the band is
  readable at a glance. Rules out: natural colour only.
- **Sonar for the proof of concept: one round cone from the middle station's rod tip**, half-angle
  24 degrees, range 26 m, tilted 18 degrees down, sweeping +/-40 degrees over 10 s; a fish stays
  drawn 0.35 s after leaving it. Fish outside every cone are not drawn (instances are packed with
  the seen fish only). Why: pillar 2, and a sweeping forward-looking beam is how modern live sonar
  is used from a bank. Rules out: a downward-only 2D cone (it would see a few square meters).
- **Fishing lines are GL lines** (one pixel at any zoom through the pass); the model's 3 cm mesh
  line is kept in the file but hidden, because under the pass it broke into dots. Why: sub-pixel
  geometry flickers at 480 x 270.
- **Rod station** (`art/rigs/build_rod_station.py`, built by the art agent through the Blender
  MCP): 446 triangles, a 64 x 64 Apollo atlas, 35.9 KB `public/models/rigs.glb`, nodes
  `rod_station`, `rod_tip`, `line` (1 m, origin at its top), `sinker`. Blender 5.2's exporter
  writes `minFilter` NEAREST_MIPMAP_NEAREST for 'Closest'; the script patches the glb to NEAREST
  so three builds no mipmaps. The renderer also forces Nearest and Lambert on load.
- **Headless browser: the installed Chrome, not Playwright's bundled Chromium.** On this PC
  `chromium-1140` fails to start (`spawn UNKNOWN`). Chrome 154 headless renders on the RTX 5070 with
  no flags, and on SwiftShader with `--use-angle=swiftshader --enable-unsafe-swiftshader
  --ignore-gpu-blocklist` (`e2e/launch.mjs`). Shots and the overview baseline use SwiftShader (same
  pixels anywhere); perf measures both, uncapped (`--disable-gpu-vsync --disable-frame-rate-limit`).
- **Dev server on port 5180** (`vite.config.ts`, `.claude/launch.json`). Why: Sprocket & Sprout and
  Last Watt use 5173.
- **Deploying waits for the owner.** Creating the public GitHub repo and turning on Pages publishes
  the game under its working title; `PLAN.md` asks for a name check first.
