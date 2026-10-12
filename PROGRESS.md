# Progress

What exists, what is stubbed, what is next. Updated at the end of every session.

## Status (2026-10-12, first session)

Milestone 0 (the proof of concept) is being built; the gate questions in `START-HERE.md` are for
the owner after it is done. Being reviewed by `indie-critic`.

## What exists

- Docs rewritten for Trotline: `CLAUDE.md` (with the 3D rules), `ROADMAP.md` (M0 = the proof of
  concept, M1 = the slice), `DECISIONS.md`, `IDEAS.md`. `STYLE.md` and `DESIGN.md` come later.
- Engine layer from Sprocket & Sprout: loop, input with rebindable actions, rng and noise, event
  queue, save slots with migrations, audio (buses, tone/noise primitives, jsfxr bank, a water bed),
  bitmap font (+ degree, fish and ping glyphs), IMGUI kit, overlap audit.
- Sim (`src/sim/`, pure): the hand-written lake with Catmull-Rom depth, three rod stations on the
  north bluff (surface, mid, bottom), a clock with water temperature, a 500-fish bighead school on
  a loop, one sweeping sonar cone that decides which fish are seen.
- Render (`src/render/`): bed and land, band contours, translucent water with depth tint and
  wobble, the instanced school with tail wobble and band glow, rod stations from `rigs.glb` with
  GL lines and band rings, the sonar cone, lights by time of day, the orbit camera with four
  presets, the pixel pipeline.
- HUD (`src/app/hud.ts`): clock, water temperature, sonar count, fps, draw calls, triangles,
  internal resolution, band legend, station tags, keys.
- e2e: `launch.mjs`, `shots.mjs` (+ baseline diff), `perf.mjs`, `screens.mjs`, `smoke.mjs`.

## PixelLab budget

Nothing spent.
