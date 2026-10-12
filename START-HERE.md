# Start here — Trotline (2D)

## The folder

`PLAN.md`, `DESIGN.md`, `CLAUDE.md`, `ROADMAP.md`, this file, and the seeded `DECISIONS.md`,
`PROGRESS.md`, `IDEAS.md`. `THREEJS-NOTES.md` is from the abandoned 3D version: delete it.
`STYLE.md` gets written in Milestone 0 after the palette test, because this game's look
(water in three readable depths, animals recognizable at 16–24 px) needs a test before rules.

## By hand, before Prompt 1 (10 minutes)

1. Keep or change the name. Check itch.io, Steam and the domain before the first public build.
2. `git init` in this folder.
3. Read `DESIGN.md` once as a fisherman. The species' bands, baits and jobs are the part
   where your knowledge beats mine; change anything that's wrong and write why. After this
   point the docs are law for Claude Code.
4. Candlepower is in the same state (docs done, no code). Pick one to take to its slice gate
   first. Don't run both.

## Prompt 1 — Milestone 0, the foundation

```
Read PLAN.md, DESIGN.md, CLAUDE.md and ROADMAP.md in that order before doing anything. Then
do Milestone 0 only.

Build this repo's foundation by extracting the engine layer from
C:\Users\jacks\Documents\sprocket-and-sprout: src/engine (loop, input, keybinds, rng, math,
events, audio engine incl. the jsfxr bank loader), the bitmap font and IMGUI kit from src/ui,
render/atlas.ts and the sheet loader, the camera, chunked ground rendering, the lighting
buffer, the save/migration scaffolding, scripts/ (art importers, pixellab.mjs and helpers,
make-icons), the e2e harness (screens.mjs with its overlap report, shots.mjs, smoke.mjs),
Play.bat, Package for web.bat, the GitHub Pages workflow, vite/vitest/tsconfig and
package.json with the same scripts. Do NOT copy, adapt, read for ideas, or reference anything
under its src/sim, src/data, src/app or src/render/art generators, and in particular not its
fishing minigame or fish data; this game's rules come from DESIGN.md only. Strip every
Sprocket & Sprout name, string, color alias and asset. Keep the code style and the test setup.

Copy .claude/agents/ (art-director, indie-critic, qa-screens) and rewrite each one's project
section for Trotline from PLAN.md and CLAUDE.md, including the standing instruction to flag
anything derivative (Plants vs Zombies especially). Add a balance-auditor agent as described
in CLAUDE.md. The indie-critic must hold the build to the not-list in PLAN.md and know tower
defense, fishing games and cozy games.

Then: a 48x32-tile shore map from a hand-written array (water at three depth tints, a road
along the shore with two bends, a dock, a smokehouse footprint, the point), camera pan and
zoom at integer factors, a HUD strip with placeholder money / crates / live-well slots, a
title screen with the working title. Have the art director run the six-sprite palette test
from ROADMAP.md on two candidate palettes (not Resurrect 64), render each sprite on each
water depth in a contact sheet, show me the sheet, and wait for my pick before writing
STYLE.md.

Finish with: typecheck and tests clean, npm run screens report inspected, a screenshot of the
shore that you have looked at, PROGRESS.md describing exactly what exists, DECISIONS.md with
the first entries (palette pending, anything you decided), one commit. Stop there. Do not
begin Milestone 1.
```

## Prompt 2 — Milestone 1, the slice (after the palette is picked and STYLE.md exists)

```
Read PLAN.md, DESIGN.md, CLAUDE.md, STYLE.md, ROADMAP.md, PROGRESS.md and DECISIONS.md.
Build Milestone 1, the vertical slice, exactly as DESIGN.md specifies and nothing more.

Order of work, each step tested before the next: (1) the fishing system — zones, species,
bands, bait match, reel tier, per-tick rate rolls, the live well, the worm bed — with unit
tests that check the expected catches per 45 s phase from DESIGN.md §3 over many seeded runs;
(2) the slice map with its road, shallows, point and smokehouse, and the rule for which water
tiles accept a defender; (3) thieves and waves with call-early, crates, stealing and the walk
back; (4) defenders: pufferfish, eel, turtle, placement rules, HP, being eaten (stub), the
chained zap; (5) bait lures on the road with species preference, eat time and the queue;
(6) sell and deploy from the live well, rod tier 2, the worm bed purchase; (7) run end, win
after wave 8, restart, the three lesson cards; (8) the pace tests from DESIGN.md §7 and the
bot that plays deploy-all, sell-all and the "good" run; (9) placeholder art replaced through
the art director within the budget noted in PROGRESS.md.

Every stat in src/data must carry a derivation string naming its DESIGN.md section; the data
validation test enforces this and the fishing-column rule. If a number from DESIGN.md turns
out to produce a lesson that doesn't hold (for example deploy-all leaks more than 3 in wave
1), do not tune silently: write the new derivation in DESIGN.md, explain it in DECISIONS.md,
then change the data. If you catch yourself writing a mechanic that resembles a specific
shipped game, stop and tell me.

Send me screenshots at: first catch, first deploy, a raccoon leaving the road for a worm, a
bear chewing a turtle, the win screen. Finish with the Definition of Done from CLAUDE.md,
PROGRESS.md updated, and then run the indie-critic against DESIGN.md §8 and paste its ranked
findings. Do not start Milestone 3.
```

## After the slice

Play it for an evening before reading the critic's report. The three questions in
`DESIGN.md` §8 are the only thing that matters at that point. If the answers are good, mark
the gate passed in `ROADMAP.md` and go one milestone per session. If not, change the model.
