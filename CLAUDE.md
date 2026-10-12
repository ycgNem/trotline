# CLAUDE.md — Trotline

You are building **Trotline**, a top-down pixel-art tower defense where you catch your towers.
Read `PLAN.md` (what and why), `DESIGN.md` (every number and its derivation), `ROADMAP.md`
(what to build now), `STYLE.md` (how it looks, once written) and `PROGRESS.md` (what exists)
at the start of every session, in that order. `DECISIONS.md` holds every design decision with
its reason; add to it, never silently contradict it.

## Stack (decided, don't relitigate)

TypeScript strict · Vite · one HTML5 Canvas 2D with `imageSmoothingEnabled = false`, 16 px
tiles, integer zoom · fixed 60 Hz pure simulation decoupled from a rAF renderer ·
immediate-mode UI drawn on the canvas with the bitmap font · Web Audio (procedural + jsfxr
bank) · localStorage saves with versioned migrations · Vitest for the sim · Playwright +
headless Chromium for screenshots, UI checks and bot play · GitHub Pages via the workflow.

The engine layer comes from Sprocket & Sprout (`C:\Users\jacks\Documents\sprocket-and-sprout`):
`src/engine/`, the UI kit and font, `render/atlas.ts`, chunks, camera, the lighting buffer,
the art importers and PixelLab scripts, the e2e harness, the deploy workflow. **Nothing from
its `sim/`, `data/`, `app/` or `render/art` generators is to be copied, adapted or consulted.**
S&S has a fishing minigame and fish data; do not look at them. This game's fishing comes from
`DESIGN.md` only.

## Architecture rules

- `src/sim/` is pure: no DOM, canvas, audio or timers. Presentation effects are events on the
  game's event queue, drained by the renderer each frame.
- One system per file in `src/sim/systems/`, run in a fixed order from `Game.ts`:
  waves → thieves (move, lure, steal) → fishing (rods, boats, bait works) → defenders →
  lures → construction (canals, buckets) → economy → catch log → stats.
- Two models, kept apart in code: thieves have HP and defenders deal damage; fishing is catch
  rates rolled per tick. No fish ever has "damage taken" from fishing; no thief is ever "caught".
- All content is typed data in `src/data/` (species, defenders, thieves, waves, bait, zones,
  rods, boats, lore, maps). A validation test checks every cross-reference and that **every
  numeric stat has a `derivation` string** naming a section of `DESIGN.md`, and that every
  upgrade node has a fishing-side effect (the "fishing column" rule).
- Rendering: baked static ground chunks (shore, water with three depth tints, road);
  dynamic sprites culled and y-sorted; water tiles that can take a defender are visibly
  different from water that can't.
- Saves: seed + deltas, `SAVE_VERSION` + ordered migrations, from the first milestone.

## Definition of done (every milestone, every PR-sized change)

1. `npm run typecheck` clean, `npm test` green (sim tests, data validation, pace tests).
2. `npm run screens` run and the report inspected: no overlapping or cut-off text.
3. For anything the player sees: a Playwright screenshot taken and **looked at** (Read the PNG).
4. For anything that changes a number: the derivation updated in `DESIGN.md`, and the pace
   test that encodes the lesson still passes (or is updated with the new reasoning written down).
5. `PROGRESS.md` updated (what exists, what is stubbed, what is next). `DECISIONS.md` updated
   if a decision was made. Commit with a message that says what and why.

## Standing instructions

- **Vertical slice first.** Until `ROADMAP.md` Milestone 2's gate is marked passed, build
  nothing from Milestone 3 onward. Add ideas to `IDEAS.md` instead.
- **Flag anything derivative.** If a mechanic, number, name, species role, or UI pattern you
  are about to write resembles a specific shipped game (Plants vs Zombies especially, since
  "animals as towers vs. animals as enemies" invites it), stop and say so in chat and in
  `DECISIONS.md`, then re-derive it from the model or drop it. The not-list in `PLAN.md` is a
  floor, not the whole list.
- **No new currency, no new tree** without a `DECISIONS.md` entry naming the pillar it serves.
- **Every upgrade node has a fishing column.**
- **Readability over detail.** At 1× zoom a player must tell apart: water you can place in,
  water you can't, the road, a lure on the road, and a defender that is about to be eaten.
- Play the build with the bot before asking for a review; send screenshots of the moments
  that matter (first catch, first deploy, first lure pulling a raccoon off the road, first
  bear chewing a turtle).
- Ask before: changing the tile size, the palette, the tick rate, the currency list, the two
  models, or the milestone order. Everything else: decide, write it down, move on.

## Agents (in `.claude/agents/`)

- `indie-critic`: design review against `PLAN.md` pillars and the not-list; runs at every
  milestone and at the Milestone 2 gate. Plays the build, does the arithmetic itself.
- `art-director`: owns `STYLE.md`, generates with PixelLab, quantizes to the palette, imports
  through the pipeline. Never copies a reference sprite. Species must be recognizable as the
  real animal at 16–24 px.
- `qa-screens`: runs the screenshot and overlap checks and reports.
- `balance-auditor`: reads `src/data/*`, recomputes every derived check in `DESIGN.md` §7
  from the current numbers, and reports any lesson that no longer holds.

## Environment notes

Windows. Node is a portable copy at `C:\Users\jacks\tools\node-v22.20.0-win-x64`, not on PATH
(`Play.bat` adds it; in a terminal use the PATH line from the S&S `HANDOFF.md`). PixelLab MCP
is registered at user scope; if its tools are missing, `scripts/pixellab.mjs` with
`PIXELLAB_API_TOKEN` in the environment, never in a file in the repo (the repo is public). Say
what you spent from the PixelLab budget in `PROGRESS.md`.
