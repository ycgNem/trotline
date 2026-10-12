# Trotline — Roadmap

Each milestone ends with the Definition of Done in `CLAUDE.md`. **Nothing from Milestone 3
onward starts until Milestone 2's gate is marked passed below.**

## Milestone 0 — Proof of concept (Prompt 0 in `START-HERE.md`)

Prove the 3D pipeline end to end and find out whether the look works. Not the game.

1. Vite + TypeScript strict + three (pinned, in `DECISIONS.md`), Vitest, Playwright, the GitHub
   Pages workflow, `Play.bat`, `Package for web.bat`. The Sprocket & Sprout engine layer
   extracted: loop, input and keybinds, rng, events, audio, saves and migrations, bitmap font,
   IMGUI kit and overlap audit. Nothing from its sim, data or render/art.
2. A scene: a 60×40 m lake bed from a hand-written heightmap with a creek channel and a shallow
   cove; a translucent water plane with depth tint and vertex wobble; three faint depth-band
   contour lines on the bed; one directional and one hemisphere light; the orbit camera with
   four named presets.
3. `RenderPixelatedPass` at 480×270 upscaled to the window, switchable, with screenshots of the
   scene with and without it.
4. One asset through the Blender MCP from `art/rigs/build_rod_station.py`: a low-poly rod
   station (dock post, rod, line down to a band), 64×64 pixel texture, NearestFilter, exported
   `.glb`, three placed on the shore; previewed in Blender's viewport before export.
5. A school of 500 fish as one `InstancedMesh`, swimming a sim-driven loop at the mid band, with
   a procedural tail wobble in the vertex shader; positions from a pure sim module.
6. A sonar cone from one rod station, additive and translucent; fish outside every cone are not
   drawn.
7. The HUD on a 2D canvas overlay with the IMGUI kit: water temperature, time of day, fps, draw
   calls, triangles.
8. `e2e/launch.mjs` (the SwiftShader flags that work here), `e2e/shots.mjs` (the four presets),
   `e2e/perf.mjs` (fps with 500 and 2,000 fish). Run, looked at, problems named.
9. Deployed to GitHub Pages (after the owner's yes and the name check).

Exit: all nine done; the owner orbits it for an evening and answers the four questions in
`START-HERE.md` (does the water read; can you see fish at different depths at a glance; does
the pixel pass make it look like a game; does a rod with a line dropping to a band mean
something). Good answers start `DESIGN.md`; bad ones change the look first.

## Milestone 1 — The vertical slice

Starts with `DESIGN.md`, written with the owner and the Lake 1 notes, built the Last Watt way:
the unit is the **catch rate** (catches per minute per rig per species per band per bait), bait
flows in units per minute, and every number has a derivation.

Exactly the `DESIGN.md` slice set: a slice of one lake (Lake 1, from the owner's notes in
`PLAN.md`), three rigs (the rod station, the trotline and one more), the sonar buoy, three
invasives and two natives, one bait type from one bait works, ten waves, money, bait,
reputation and spread, day/night and one front, a run end and restart. Placeholder art is fine;
the band read and the sonar read are not optional even with placeholders. Pace tests for the
lessons: **wrong band catches nothing; no bait, no catch; a trotline across the cove mouth is
throughput with a bycatch bill; a front at wave 5 moves everything down a band.** A bot that
plays two layouts.

Exit: a new player can finish or lose a 10–15 minute run with no explanation beyond a two-line
title screen; the four pace tests pass; screenshots of the first wrong-band rig, the first rig
idle for bait, the first bycatch and the front are in `e2e/out/` and have been looked at.

## Milestone 2 — The gate

`indie-critic` reviews the slice against the questions in `DESIGN.md` and the not-list, and
checks the fishing against how fishing works. The owner plays it. Either the model changes (in
`DESIGN.md`, then the slice is revised and reviewed again) or the gate is marked passed here
with the date.

**Gate status: not yet passed.**

## Milestone 3 — The bait works

Worm beds, shad traps, a lure bench; bait types that change what a rig attracts; bait carried
to rigs (the flow made visible on the lake); spoilage of live bait; the works' throughput named
in a Bait view that shows each rig's supply and its bottleneck.

## Milestone 4 — Rigs and runs

Rig roster to the `PLAN.md` set (cast net, trap, jug lines, the electrofishing skiff), each a
different (band, shape, bait, selectivity) tuple; re-settable bands. Invasive roster to the
`PLAN.md` set (tilapia breeding at the cove, plecos immune to nets, the zebra-mussel raft that
fouls rigs, giant salvinia that blocks sonar). Natives with their own behaviour.

## Milestone 5 — Weather, time and temperature

Fronts that push bands down, warm evenings that pull bait up, water temperature driving the
bite, day/night across a season; every species card listing its band by condition.

## Milestone 6 — The keeper's verbs

Set a band, re-bait, the manual cast (one-button tension, optional), the skiff, the sonar ping,
release a native.

## Milestone 7 — The dock

Selling catch (ice, spoilage), bounties, reputation tiers and locals' requests, the run lost to
negative reputation.

## Milestone 8 — Seasons and lakes

A run is a season on a hand-made lake; two or three more lakes; the lore tree between runs;
lake unlocks; save mid-run.

## Milestone 9 — Sound and juice

Procedural and jsfxr bank; the lake has a sound (sonar pings, a bite, a catch, a bycatch);
effects within the readability rules and only if they survive the pixel pass.

## Milestone 10 — Onboarding and UX

First-run lesson cards triggered by events (first wrong band, first idle rig, first bycatch);
settings, keybinds, UI scale; species cards; tooltips with catch rates everywhere.

## Milestone 11 — Balance and release

Bot plays every lake; the balance auditor's report is clean; perf with 2,000 fish and 100 rigs;
README, itch page, the final name; Electron later.

## IDEAS.md

Anything not on this list goes to `IDEAS.md` with one line of why. It is reviewed at each gate,
not acted on between them.
