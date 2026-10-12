# Start here — Trotline

## Before anything: which project goes first

You now have two planned games. Candlepower (2D, energy flow, the engine you already know) and
Trotline (3D, fishing, Three.js you don't know yet). Pick one to take to its slice gate before
the other starts; running both is how both stall. Either order is defensible. Candlepower
first means learning nothing new while proving the doc-and-gate discipline. Trotline first
means the project you're most excited about gets your best energy, at the cost of a steeper
first two weeks. The proof-of-concept prompt below is cheap enough to run either way: it is a
weekend, it proves the 3D pipeline end to end, and it tells you whether the look excites you.

## What to do by hand (15 minutes)

1. Make `C:\Users\jacks\Documents\trotline` and put `PLAN.md`, `THREEJS-NOTES.md` and this
   file in it. Copy `CLAUDE.md`, `ROADMAP.md`, `DECISIONS.md`, `PROGRESS.md` and `IDEAS.md`
   from the Candlepower folder as starting points (Prompt 0 rewrites them).
2. `git init` there.
3. Check the Blender MCP still shows as connected in a Code session (`/mcp`).
4. Decide the first lake's name and three things that make it feel like a real Texas reservoir
   to you (flooded timber, a creek channel, a dam face, a boat ramp, a marina...). Write them
   under "Lake 1" at the bottom of `PLAN.md`. This is the part only you can do.

## Prompt 0 — proof of concept (one session, stop when it runs)

```
Read PLAN.md and THREEJS-NOTES.md first. Then rewrite CLAUDE.md, ROADMAP.md, DECISIONS.md,
PROGRESS.md and IDEAS.md (copied from the Candlepower project as templates) for Trotline:
same discipline, same definition of done, same gate rule, with the 3D rules from
THREEJS-NOTES.md added to CLAUDE.md and a ROADMAP whose Milestone 0 is this proof of
concept and whose Milestone 1 is the slice described in PLAN.md. Keep STYLE.md for later.

Then build the proof of concept, and nothing else:

1. Vite + TypeScript strict + three (pin the current release and record it in DECISIONS.md),
   Vitest, Playwright, the GitHub Pages workflow, Play.bat and Package for web.bat, taken
   from C:\Users\jacks\Documents\sprocket-and-sprout. Extract its engine layer (loop, input,
   keybinds, rng, events, audio, saves/migrations, bitmap font, IMGUI kit, e2e harness) the
   same way the Candlepower plan describes. Nothing from its sim, data or render/art.
2. A scene: a 60x40 m lake bed with a creek channel and a shallow cove (heightmap from a
   hand-written array), a translucent water plane with a depth tint and a small vertex wobble,
   three faint depth-band contour lines on the bed, one directional light and a hemisphere
   light, the orbit camera from THREEJS-NOTES.md with four named presets.
3. RenderPixelatedPass at 480x270 upscaled to the window. Show me the scene with and without
   the pass so I can see what it does.
4. One asset built through the Blender MCP by a script saved in art/rigs/build_rod_station.py:
   a low-poly rod station (dock post, rod, line down to a band) with a 64x64 pixel texture
   using NearestFilter. Export .glb, load it with GLTFLoader, place three on the shore.
   Preview in Blender's viewport before exporting and show me the screenshot.
5. A school of 500 fish as an InstancedMesh (a stretched low-poly body, one species) swimming
   a sim-driven loop at the mid band under the water plane, with a procedural tail wobble in
   the vertex shader. Fish positions come from a pure sim module that has no three import.
6. A sonar cone from one rod station: an additive-blended translucent cone; fish outside any
   cone are not drawn.
7. The HUD on a 2D canvas overlay using the IMGUI kit: water temperature, time of day, fps,
   draw calls, triangles.
8. e2e/launch.mjs with the SwiftShader flags that work on this Chromium, e2e/shots.mjs that
   screenshots the four camera presets, e2e/perf.mjs that reports fps with 500 and 2,000 fish.
   Run them and show me the screenshots. Look at them yourself first and say what's wrong.
9. Deploy to GitHub Pages and give me the URL.

Record every decision (version, flags, camera numbers, resolution) in DECISIONS.md and what
exists in PROGRESS.md. If something in THREEJS-NOTES.md turns out wrong for the pinned three
version, fix the note and tell me. Do not start the game itself.
```

## After the proof of concept

Spend an evening orbiting it. The questions: does the water read, can you see fish at
different depths at a glance, does the pixel pass make it look like a game or like a blurry
render, and does a rod station with a line dropping to a band feel like it means something?
If the answers are good, the next step is `DESIGN.md` for Trotline, built the Candlepower
way: catch rates as the unit (catches per minute per rig per species per band per bait),
bait flow in units per minute, a slice of one lake, three rigs, three invasives, two natives,
one bait type, ten waves, and the pace tests that encode the lessons (wrong band catches
nothing; no bait, no catch; a trotline across the cove mouth is throughput with a bycatch
bill; a front at wave 5 moves everything down a band). I'll write that with you after the PoC,
with your Lake 1 notes in hand.
