# Handoff

Where the last session stopped. Read this first, then the files `CLAUDE.md` lists. Rewrite it at
the end of every session.

## Stopped at (2026-10-12, end of the Milestone 3 session)

**Milestone 2's gate passed** (the owner: "looks good, see if you can get started on the next
milestones to make this game more expansive"). **Milestone 3, the fleet and the works, is built,
reviewed and re-measured, and committed but not pushed**: the live build is still the slice.

What is in: three boats (the rowboat, the skiff with an inshore rod, the trawler that tows a net
and brings up chum) that fish where they are sent and bring the catch home or sell it, kind by
kind; chum slicks on the water that hold gulls and bears where rays reach them; a 12-wave season;
the yard (B), the fleet panel and a boat's card; canals (built and tested, hidden on Back Bay where
they measure as worth nothing). `DESIGN.md` §12 has the model, §5 the waves, §7 the measurements.

The `indie-critic` reviewed Milestone 3 once; everything it asked for is in (`DECISIONS.md`, "The
critic's Milestone 3 review"): the point's rays are a stock the lines there share (it had become
"mass-produce rays"), walkers keep their room on the road (the finale was a grey ribbon), the
trawl brings up what lives where it tows, a raccoon finds a slick only a tile from the road,
keep-or-sell by kind, readability and craft fixes. **Then setting the pace thresholds found a
stronger reference twice** (`DECISIONS.md`, "The reference player re-measured"): worms only in
the opening (laid every wave they cost the fleet), and rays past three sold for a rowboat by wave
3, which won 96-99 of 100. The season was sized again against that line: waves 4-6 grew so an
early boat is a gamble, the late waves grew (the finale: twenty-two flocks, 60 raccoons, fifty
bears). The reference wins 74-90 of 100; the other openings 72-88; no chum or no boats 0-2.

**Next**: the critic's review of the re-measured season, then Milestone 4 (the catch log and the
roster). Three things the review should look at first, all in `PROGRESS.md`'s known problems:
money has nothing to buy past the fleet ($128-140 at the finale's start), terrapins are worth
nothing over a run, and the late board is a solid row of rays and puffers (the "lawn row").

## Waiting on the owner

1. **Push Milestone 3?** It is committed on `main` locally. A push runs the tests and redeploys
   GitHub Pages with the 12-wave season. Say yes when you have played it.
2. **A late money sink** (`IDEAS.md`): past the skiff there is nothing to buy but bait. A second
   boat of a kind, a third rod tier or Milestone 4's roster are the candidates; each is a design
   call (a new tree needs a `DECISIONS.md` entry naming its pillar).
3. **The worm bed still buys nothing**, as in the slice. Give it a job, or drop it (`IDEAS.md`).
4. **The palette**: Apollo is provisional. Compare `pixel-art/palette-test/contact_both.png`
   against ENDESGA 32 (`DECISIONS.md`).
5. **Back Bay instead of a reservoir** for the first shore (`DECISIONS.md`): puffers, electric
   rays and diamondback terrapins don't live in a Texas reservoir.
6. **Terrapins being sold** (`IDEAS.md`): commercial terrapin harvest is banned or tightly
   limited along most of the Gulf; a "release" that pays in something else touches the currency
   list. They also measure as worth nothing over a run now (`IDEAS.md`).
7. **`CLAUDE.md`'s screenshot moment "first bear chewing a turtle"** no longer happens: bears
   shove terrapins aside (raccoons are the predator). The shot is "raccoons lined up at a
   terrapin", and "a bear at a slick" (`e2e/out/shots/09-...`, `24-...`).
8. **The name check** (itch.io, Steam, the domain) before anything goes out under "Trotline".

## State of things outside the code

- **Git**: Milestone 3 is committed on `main` and **not pushed**. Every push to `main` runs the
  tests and redeploys GitHub Pages, so a push needs the owner's yes each time (`CLAUDE.md`).
  **Live**: https://ycgnem.github.io/trotline/ (the slice). The pace tests play ~1,000 seasons:
  ~3 minutes locally on 32 threads, longer on CI's four cores.
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
npm run typecheck && npm test     # ~3 minutes here (the pace tests play ~1,000 seasons)
npm run shots        # e2e/out/shots/*.png, the moments that matter; then Read them
npm run screens      # HUD overlap audit, 19 states x 3 window sizes
npm run smoke        # real mouse and keys only
npm run bot          # three strategies x three seeds, played in the browser
```

`e2e/out/` is ignored by git, so regenerate the shots before comparing. **Measuring the season**:
`npx vite-node scripts/measure.ts -- <from> <to> '<bot opts json>' [label]` prints a variant's
wins, crates, money (at the end and at the finale's start), fish, what it bought and when, and
crates stolen by wave and thief. Run five 100-seed sets as parallel processes (the machine has 32
threads; a season is 3-6 s) and take the worst set for any threshold. `WAVES` and `PRICES` env
JSON patch the waves and boat prices for tuning without editing data. `src/sim/bot.ts` options
make "the same bot with one thing taken away" a one-liner: `noRod`, `noBoats`, `noChum`,
`noLure`, `lureRays`, `rayFloor`, `boatSells`, `plan`, `sellRay`, `keep`, `slicks`, `fixedBoats`
and more. Headless probes: a `tests/_name.test.ts` with `it(...)` and console.log (the pace
helpers import vitest), run with `npx vitest run tests/_name.test.ts`; delete it after.

## Things that cost time (so they don't again)

- Playwright's bundled Chromium doesn't start on this PC; the scripts use the installed Chrome
  (`e2e/launch.mjs`).
- Files copied from Sprocket & Sprout came with CRLF line endings, so scripted find-and-replace
  can silently match nothing. Use the Edit tool, or assert that the replace hit.
- Shell heredocs break on apostrophes, long ones on anything, and TypeScript strings need `\'`
  (escapes inside a Python string inside a heredoc get eaten one layer at a time; check the
  diff): write Python helpers to the
  scratchpad with the Write tool and run them, then typecheck.
- The bitmap font has no `§` glyph. `tests/engine.test.ts` scans every string literal in
  `src/data/`, `hud.ts` and `app.ts` except lines with `derivation:`, so a shared constant
  holding a `§` fails it even if only derivations use it. Derivations must name a `§`
  (`tests/data.test.ts`).
- The sim steps on its own 60 Hz clock, not per rendered frame: in e2e scripts wait for a state
  (`page.waitForFunction`) rather than counting frames. Headless frames are slow and uneven.
- Shots are only deterministic frozen: `__app.freeze()` and stepped ticks. Many effects from a
  batch of stepped ticks show at once in a frozen shot, and a long stretch of stepping overflows
  the event queue (512), so the app misses earlier events (the wave-8 toast re-introduced every
  thief until the script cleared it); live play doesn't do either.
- A pace threshold set at the measured value flips on a seed's luck: keep a margin (DESIGN.md §7
  lists them), and check that a staged test's deploys succeed (one "five puffers" test was
  four puffers for a while because a tile was sand).
- A stronger line beats the reference more often than not: before setting a pace threshold,
  measure the obvious variants of the reference (sell harder, bait less, the other opening) and
  make the best one the reference, or the thresholds encode a weak player.
- Bigger waves pay more bounty: growing the finale to press a strong player piles up money it
  can't spend. Press the opening instead where you can (waves 4-6 for an early boat).
- Killing a background bash that started `vite-node` processes with `&` leaves the node processes
  running: stop them by command line (PowerShell `Get-CimInstance Win32_Process`).
- Python writing text on Windows turns `\n` into CRLF unless `newline='\n'` is passed; git
  normalises it, but diffs get noisy.
