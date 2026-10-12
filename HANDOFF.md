# Handoff

Where the last session stopped. Read this first, then the files `CLAUDE.md` lists. Rewrite it at
the end of every session.

## Stopped at (2026-10-12, end of the overnight session)

**The game is 2D now and the vertical slice (Milestone 1) is playable end to end**: title, a
60 s first build with a ray caught at dawn in the live well, eight waves, win and lose, restart,
continue from a save. `npm run dev` (or `Play.bat`) and click Start. The 3D proof of concept is
gone (in git history at e6f9a18).

The `indie-critic` reviewed the slice **twice** and both reviews are implemented
(`DECISIONS.md`, "The critic's first review" and "The critic's second review"). The second one
rebuilt the defense model: fish wear out (slow rest, claws as thieves walk past, wading while
they wait in a line), the ray shocks one walker at a time and never a gull, the pufferfish
paralyses, raccoons are the terrapin's predator and bears shove it aside, bears ignore worms,
rays live at the point (the surf rod's job). `DESIGN.md` §2-§7, §10 and §11 describe exactly what
is built, with the measured numbers. Nothing is half-built.

**Milestone 2, the gate, is next**: the owner plays it, then the critic reviews it against
`DESIGN.md` §8. Nothing from Milestone 3 until the gate is marked passed in `ROADMAP.md`.

## Waiting on the owner

1. **Play the slice** and answer `DESIGN.md` §8's three questions (is sell-or-deploy a
   decision, is a lure control or a chore, does catching a fish beat buying a tower). The bot
   says selling to buy the surf rod is worth ~27 wins of 100; whether it *feels* like a
   decision is yours to say.
2. **The palette**: Apollo is provisional. Compare `pixel-art/palette-test/contact_both.png`
   against ENDESGA 32 (`DECISIONS.md`).
3. **Back Bay instead of a reservoir** for the first shore (`DECISIONS.md`): puffers, electric
   rays and diamondback terrapins don't live in a Texas reservoir. `PLAN.md` said "a reservoir
   first"; this is the one line the slice overrides.
4. **The derivative flags** in `DECISIONS.md` (PvZ's Potato Mine and Wall-nut, Kingdom Rush's
   Tesla chain): all three are re-derived and the shapes are gone; say if any still reads as
   borrowed.
5. **Terrapins being sold** (`IDEAS.md`): commercial terrapin harvest is banned or tightly
   limited along most of the Gulf. A "release" that pays in something other than money would be
   truer, but it touches the currency list, so it is your call.
6. **`CLAUDE.md`'s screenshot moment "first bear chewing a turtle"** no longer happens: bears
   shove terrapins aside in 3 s (raccoons are the real predator). The shot is now "raccoons
   lined up at a terrapin" (`e2e/out/shots/09-...`). Say if you want the line in `CLAUDE.md`
   changed.
7. **The name check** (itch.io, Steam, the domain) before anything goes out under "Trotline".

## State of things outside the code

- **Git**: `main` is the whole session's commits ahead of `origin/main`, all local. Every push to `main` runs the
  tests and redeploys GitHub Pages, so pushing needs the owner's yes (`CLAUDE.md`). The live
  Pages build is still the 3D proof of concept until that push.
- **PixelLab**: 0 of the session's 100 generations spent. All art is drawn with the
  pixel-art-studio skill (user level, `~/.claude/skills/pixel-art-studio`): build scripts in
  `pixel-art/<name>/build.py`, PNG strips plus JSON in `src/art/`. Never SpriteCook.
- **GitHub Actions** annotates that `actions/*@v4` run on Node 20, which is being retired: bump
  the action versions in `.github/workflows/deploy.yml` when they ship Node 24 builds.

## How to pick up

Node is not on PATH: in Git Bash, `export PATH="/c/Users/jacks/tools/node-v22.20.0-win-x64:$PATH"`
(`Play.bat` does this for itself). The e2e scripts need the dev server running.

```
npm run dev          # http://127.0.0.1:5180 (or Play.bat)
npm run typecheck && npm test     # 139 tests, ~3 minutes (the pace tests play ~1,200 runs)
npm run shots        # e2e/out/shots/*.png, the moments that matter; then Read them
npm run screens      # HUD overlap audit, 11 states x 3 window sizes
npm run smoke        # real mouse and keys only
npm run bot          # three strategies x three seeds, played in the browser
```

`e2e/out/` is ignored by git, so regenerate the shots before comparing. Headless probes: write a
`tests/_name.ts` and run it with `npx vite-node tests/_name.ts` (vitest only picks up
`*.test.ts`); delete it after. `src/sim/bot.ts` options (`noRod`, `naive`, `keep`, `raySpot`,
`lureMid`) make "the same bot with one thing taken away" a one-liner.

## Things that cost time (so they don't again)

- Playwright's bundled Chromium doesn't start on this PC; the scripts use the installed Chrome
  (`e2e/launch.mjs`).
- Files copied from Sprocket & Sprout came with CRLF line endings, so scripted find-and-replace
  can silently match nothing. Use the Edit tool, or assert that the replace hit.
- Shell heredocs break on apostrophes, and TypeScript strings need `\'`: write Python helpers to
  the scratchpad and run them, then typecheck.
- The bitmap font has no `§` glyph. `tests/engine.test.ts` scans every string literal in
  `src/data/`, `hud.ts` and `app.ts` except lines with `derivation:`, so a shared constant
  holding a `§` fails it even if only derivations use it. Derivations must name a `§`
  (`tests/data.test.ts`).
- The sim steps on its own 60 Hz clock, not per rendered frame: in e2e scripts wait for a state
  (`page.waitForFunction`) rather than counting frames. Headless frames are slow and uneven.
- Shots are only deterministic frozen: `__app.freeze()` and stepped ticks. Many effects from a
  batch of stepped ticks show at once in a frozen shot; live play doesn't do that.
- A pace threshold set at the measured value flips on a seed's luck: keep a margin (DESIGN.md §7
  lists them), and check that a staged test's deploys succeed (one "five puffers" test was
  four puffers for a while because a tile was sand).
