# Trotline — Roadmap

Each milestone ends with the Definition of Done in `CLAUDE.md`. **Nothing from Milestone 3
onward starts until Milestone 2's gate is marked passed below.**

## Milestone 0 — Foundation (starter kit)

Extract the engine layer from Sprocket & Sprout into this repo (loop, input and keybinds, rng,
events, audio engine, bitmap font, IMGUI kit, atlas and sheet loading, camera, chunked ground,
lighting buffer, save scaffolding, art importers and PixelLab scripts, Playwright harness,
`Play.bat`, `Package for web.bat`, the GitHub Pages workflow, Vitest config). Strip every
S&S name. Copy and rewrite the three agents; add `balance-auditor`. Art director runs the
six-sprite palette test (water at three depths, gull, raccoon, pufferfish, eel, dock) on two
candidate palettes and writes `STYLE.md` once the owner picks.

Exit: `npm run dev` shows a shore map with water in three depth tints, a road, a dock and a
moving camera; `npm test` green on an empty sim; `npm run screens` produces a report; the
workflow publishes to GitHub Pages; `PROGRESS.md` and `DECISIONS.md` have their first entries.

**Milestone 0 status (2026-10-12):** built. Exit met except the owner's palette pick (Apollo
provisional, `pixel-art/palette-test/contact_both.png`). The 2D build is live on GitHub Pages
(https://ycgnem.github.io/trotline/), redeployed on every push to `main`.

## Milestone 1 — The vertical slice

Exactly the `DESIGN.md` slice: one hand-made shore (40-tile road with two bends hugging the
water, dock shallows, the point, the smokehouse), rod tiers 1–2, the worm bed, worm bait,
pufferfish / electric ray / terrapin as catches and defenders (the eel and the turtle until
the critic's review, `DECISIONS.md` 2026-10-12), live well with sell and deploy, bait lures
on the road, gull / raccoon / bear, 8 waves with call-early, crates and run end, win after
wave 8, restart, catch-log stubs. Placeholder art is fine for a week; the readability rules in
`CLAUDE.md` are not optional even with placeholders. Pace tests for the lessons in
`DESIGN.md` §7 and a bot that plays the deploy-all, sell-all and "good" layouts.

Exit: a new player can finish or lose a 10-minute run with a two-line title screen and three
lesson cards (first catch, first deploy, first lure); the pace tests pass; screenshots of
first catch, first deploy, a raccoon leaving the road for a worm, and a bear chewing a turtle
are in `e2e/out/` and have been looked at.

**Milestone 1 status (2026-10-12):** built; exit met. Three `indie-critic` reviews and a balance
audit are implemented (`DECISIONS.md`). The "bear chewing a turtle" shot became "raccoons lined up at a terrapin":
raccoons are the terrapin's real predator and a bear shoves it aside (`DECISIONS.md`, the
second review). Ready for the gate.

## Milestone 2 — The gate

`indie-critic` reviews the slice against `DESIGN.md` §8 and the not-list. The owner plays it.
Either the model changes (in `DESIGN.md`, then the slice is revised and reviewed again) or the
gate is marked passed here with the date.

**Gate status: not yet passed.** The critic's side is done (2026-10-12: a re-gate review and the
gate review, both implemented, `DECISIONS.md`); waiting on the owner to play it and answer
`DESIGN.md` §8, and on the owner's calls listed in `HANDOFF.md`.

## Milestone 3 — The fleet and the works

Rowboat, skiff, trawler; docks; zones the rod can't reach; the bait works with worm, chum and
cricket; scraps from kills; canals and pools; buckets. Production view: catches per minute per
zone and what each boat is waiting on.

## Milestone 4 — The catch log and the roster

Catfish, gar, bass; big / rare / golden variants; the catch log as the unlock tree with each
entry teaching depth and bait; otter, heron, pelican, poacher; the harpoon skiff.

## Milestone 5 — Depth, time and weather

Dawn/dusk bites, bands, fronts, rain filling pools, night waves with lanterns on the dock.

## Milestone 6 — The verbs

The tension pull on rare fish, the net, a second rod, lure mechanics with queues and
species preferences fully exposed in the UI.

## Milestone 7 — Runs and shores

Four to six hand-made shores; wave tables generated from a model; run end, lore awarded,
shore unlocks; save mid-run.

## Milestone 8 — Lore (between runs)

The tree from `PLAN.md`, meta save separate from run save, respec.

## Milestone 9 — Sound and juice

Procedural and jsfxr bank: cast, bite, splash, zap, puff, a gull's complaint, the bear.

## Milestone 10 — Onboarding and UX

Lesson cards triggered by events; settings, keybinds, UI scale; tooltips with rates everywhere.

## Milestone 11 — Balance and release

Bot plays every shore; the balance auditor's report is clean; perf test with 100 defenders and
300 thieves; README, itch page, GitHub Pages at the final name; domain later.

## IDEAS.md

Anything not on this list goes to `IDEAS.md` with one line of why. Reviewed at each gate.
