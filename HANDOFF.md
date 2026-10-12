# Handoff

Where the last session stopped. Read this first, then the files `CLAUDE.md` lists. Rewrite it at
the end of every session.

## Stopped at (2026-10-12, end of the first session)

**Milestone 0, the proof of concept, is finished, reviewed, committed and live on GitHub Pages**
(the live link is in the repo's About box, never in a file). Nothing is half-built. `PROGRESS.md`
has what exists and the measured perf; `DECISIONS.md` has every decision and the first
`indie-critic` review's twelve fixes.

**Do not start Milestone 1 code.** It starts with `DESIGN.md`, which is written *with the owner*
after their answers below.

## Waiting on the owner

1. **The evening with it** and the four questions in `START-HERE.md`: does the water read, can
   you see fish at different depths at a glance, does the pixel pass look like a game, does a rod
   with a line dropping to a band mean something. Good answers: start `DESIGN.md` together.
   Bad ones: change the look first (and `STYLE.md` gets written then).
2. **Lake 1 notes** in `PLAN.md` (outline, structure, ramp, timber...). The lake is a placeholder.
3. **Integer upscale or not**: compare the default with `?pixels=int` (or the `overview-int` and
   `dock-int` shots). `DECISIONS.md` has the default as 2.667x at 720p, provisional.
4. **Where the rod's butt sits** in the 1-px rod line: the holder mouth (now) or the cork joint
   (`DECISIONS.md`, last entry).
5. **The name check** (itch.io, Steam, the domain) before anything beyond the proof of concept
   goes out under "Trotline".
6. **The fishing fact from the review** to confirm from the owner's own fishing: bighead and
   silver carp almost never take a baited hook, so rod stations shouldn't catch them; nets and
   the skiff do (`DECISIONS.md`, "Fishing facts for `DESIGN.md`").

## State of things outside the code

- **Git**: `main` tracks the public GitHub repo. Every push to `main` runs the tests and redeploys
  Pages, so a push still needs the owner's yes (`CLAUDE.md`). Check `git status`: the handoff
  commit may be local only, waiting for that yes.
- **Blender**: the live instance has a scene `trotline_rigs` that the rod station script builds;
  the owner's own scene was never touched. The script also runs headless (`CLAUDE.md`).
- **PixelLab**: nothing spent.
- **GitHub Actions** annotates that `actions/*@v4` run on Node 20, which is being retired: bump
  the action versions in `.github/workflows/deploy.yml` when they ship Node 24 builds. Not urgent;
  the deploy works.

## How to pick up

```
npm run dev          # http://127.0.0.1:5180 (or Play.bat)
npm run typecheck && npm test     # 38 tests
npm run shots        # e2e/out/shots/*.png, then Read them
npm run screens      # HUD overlap audit at three sizes
npm run perf         # GPU and SwiftShader, p95 gated
```

`e2e/out/` is ignored by git, so regenerate the shots before comparing.

## Things that cost time in the first session (so they don't again)

- Playwright's bundled Chromium doesn't start on this PC; the scripts use the installed Chrome
  (`e2e/launch.mjs`). Headless Chrome uses the GPU unless given the SwiftShader flags.
- Files copied from Sprocket & Sprout came with CRLF line endings, so scripted find-and-replace
  can silently match nothing. Use the Edit tool, or check that the replace hit.
- Shell heredocs break on apostrophes: write Python helpers to the scratchpad and run them.
- The Browser pane's screenshot can lag a frame behind: check state through `window.__app`.
- Shots are only deterministic frozen: `__app.freeze(ticks)` (the shots use `SHOT_TICKS`); every
  shader animation reads sim time, never wall time.
- r186 surprises (the pixel pass renders twice, raw-depth edges, `forceSinglePass`, the
  `onBeforeCompile` cache key...) are in `THREEJS-NOTES.md`, "Found in r186". Read it before
  touching `src/render/`.
