# Decisions

Every design decision with its reason, newest at the bottom. Format: date, decision, why, what it rules out.

- 2026-10-12: 2D pixel art on the Sprocket & Sprout engine layer, not 3D/Three.js. Why: same framework as the other games; depth is handled by bands and bait, not by a 3D view.
- 2026-10-12: Two models kept apart: thieves have HP and defenders deal damage; fishing is catch rates with no HP. Why: PLAN.md "The two models".
- 2026-10-12: Towers are caught, never bought. Why: pillar 1; rules out any tower shop.
- 2026-10-12: Four currencies (money, fish/live well, bait, crates). A fifth needs an entry here.
- 2026-10-12: Palette: pending the Milestone 0 six-sprite test. Not Resurrect 64.

## Milestone 0 and the slice, the overnight session (2026-10-12)

- 2026-10-12: **The 3D proof of concept is removed**, not kept beside the 2D game: three.js, the renderer, the lake/school/sonar sim, the Blender rig and its tests are deleted (they are in git history, commit e6f9a18). Kept: the engine core it had already taken from Sprocket & Sprout (loop, input, rng, events, save/migrations, audio, bitmap font, IMGUI kit, overlap audit). Why: the plan is 2D; dead code invites confusion.
- 2026-10-12: **The 2D render layer is written fresh on S&S's patterns, not copied from its renderer.** S&S's `renderer.ts` is 1,850 lines of farm-specific drawing. Taken from it: the camera that snaps to whole world pixels, ground baked once into chunk canvases, sprites cut from PNG strips and drawn on whole pixels, the white hit flash. The scripts (`art-import.mjs`, `contact.mjs`, `pixellab.mjs`, `lib/`) are copied as they are. The lighting buffer waits for Milestone 5 (night waves); nothing in the slice is dark.
- 2026-10-12: **The shore is 40 x 22 tiles, not the 48 x 32 START-HERE asked for.** Why: the whole board fits at 2x on 1280 x 720 and 3x on 1920 x 1080, so the player never pans to see a thief (a TD board you can see whole). At 1024 x 640 it shows at 1x; the wheel zooms to 2x with panning. DESIGN.md §10.
- 2026-10-12: **The first shore is a brackish back bay ("Back Bay"), not a reservoir.** Why (fishing truth, pillar 2): pufferfish don't live in a Texas reservoir. The slice's three species all really live together in Gulf Coast brackish water: checkered puffer, American eel, diamondback terrapin. Gulls, raccoons and (Louisiana) black bears all work that shore. The turtle is a terrapin. PLAN.md's "a reservoir first" is the one line this overrides; the owner should confirm.
- 2026-10-12: **Eels bite at 1.5/min in the shallows, not 1.0.** Why: at 1.0 a third to a half of first build phases catch no eel, nothing then kills a raccoon, and deploy-all averaged 3.8 leaks in wave 1 (DESIGN.md §7 says 3 or fewer). At 1.5 it is 2.75. DESIGN.md §3 has the arithmetic.
- 2026-10-12: **A worm lure holds 36 thief-seconds of eating, lies on the road until eaten, and is cast anywhere on the road the rod reaches** (tier 1: road tiles 9-23, not "the first 15"). Why: §7's luring lesson feeds each of wave 1's six raccoons; a lure that can be set in the build phase is a plan, not a reflex. DESIGN.md §6.
- 2026-10-12: Readings of DESIGN.md §4 the table left open: distances are Chebyshev; a "water tile" for a defender is a *shallow* tile (not reeds, not mid or deep); an eel's chain hops 2 tiles; the turtle also rests 1 HP/s between waves. DESIGN.md §4.
- 2026-10-12: **Zones**: the shallows are every shallow tile (light water reads as one zone; the far-west shallows saying "nothing bites" confused); the point is the water within 4.5 tiles of its tip. DESIGN.md §10.
- 2026-10-12: **Selling pays at once**, not "between waves". Why: the build-phase choice (sell this pufferfish for the worm bed now, or deploy it) is the decision pillar 1 is about; a deferred payout hides it. Revisit with market drift.
- 2026-10-12: **8 worms to start; the bait shop's pack of 3 for 5 stays in the slice** beside the worm bed. Why: a broke player with no worms could not fish or lure, a soft lock. DESIGN.md §3.
- 2026-10-12: **Saves are the seed plus the player's command log**, replayed (`Game.replay`): every command goes through `Game.act`, which logs it with its tick. Autosave at each wave's start and end, slot 1, `SAVE_VERSION` 1. Lessons seen are a separate meta key. Why: CLAUDE.md "seed + deltas"; the sim is deterministic, so the deltas are the commands.
- 2026-10-12: The event queue drops the **oldest** events when full (it dropped the newest, and a fast-forward lost the `won` event and never showed the end screen). The app also ends the run from `game.over`, not only from the event.
- 2026-10-12: Lesson cards pause the sim and show once per player (meta save). The title's two lines and the three cards are in `src/data/lessons.ts`.
- 2026-10-12: **Palette: Apollo (46), provisional until the owner looks at `pixel-art/palette-test/contact_both.png`** against ENDESGA 32. Why (art director, agreed): Apollo's six-step blue ramp gives four clean water values in one hue. The rule that comes with it is **"clear shallows"**: the water a fish can be put in is the palest on the board (ice), shallow is cyan, mid blue, deep navy. Corner ticks, dotted rims and frames were tried and dropped as the at-rest cue (too faint, too busy, or inventory slots); the deploy mode's lit frames are code. Not Resurrect 64.
- 2026-10-12: **Art tools (owner's rule)**: the pixel-art-studio skill (installed at user level, `~/.claude/skills/pixel-art-studio`, so every project has it) for basically everything; PixelLab capped at 100 generations per session; never SpriteCook.
- 2026-10-12: **Pace tests are means over 200 seeds**, and the luring lesson is measured over the seeds whose layout has an eel (the lesson is "a lure beside the eel"). DESIGN.md §7.

### Flagged as derivative (CLAUDE.md standing instruction; owner to decide)

- **The turtle wall that thieves stop and chew maps onto Plants vs Zombies' Wall-nut** (a cheap blocker that walkers stop at and eat through while other plants hit them). What differs: it is caught, not bought; it sits on a road, not in a lane; gulls fly over it. What doesn't: the "stop and chew through HP" loop is the Wall-nut's. Re-derivation offered, not applied (it is the owner's roster): a terrapin on a road really does stop traffic, and what really happens is the animal *tries to flip it or go round it*. A version that is ours: walkers stop and nose at the turtle for a fixed time (its "patience", spent per thief, not HP chewed by all at once), then step round it onto the verge, slowed. Same job (a stall on the road), different shape.
- **The one-shot pufferfish that bursts when a thief comes close maps onto PvZ's Potato Mine** (one use, triggered by proximity, damage around it). What differs: it is grounded in the real puffer's inflation, and it sits in water beside the road. Re-derivation offered: a puffer that *puffs and blocks* (a spiny ball thieves won't step past for a few seconds, then deflates and can puff again after a rest) would be the real animal's defence, not a bomb.
- The live well's sell-or-deploy, bait lures, catch rates and placement by distance to the road are this game's own; nothing else in the slice maps onto a specific shipped game that I can name.

## The critic's first review, implemented (2026-10-12)

The indie critic reviewed the first playable build and returned 11 findings; all are in. Each
below is the finding, then what changed and why.

- **The two flagged derivatives are re-derived from the animals**, as the critic and the flag
  above both asked, not left for later:
  - **Pufferfish: poison you get eaten for**, not a proximity bomb. The first thief (gulls
    too) within a tile snatches it and eats it, stands retching 2 s with it in its mouth and
    takes 40 poison over 3 s. A puffer's real defense is tetrodotoxin: it works when eaten.
    40 is a raccoon's HP, so one puffer is one raccoon (and a dead gull). It no longer hits
    anything around it: the Potato Mine shape (one use, proximity trigger, damage in a radius)
    is gone; what is left (one use, the thief that takes it pays) is the animal's.
  - **Terrapin: bait with a shell**, not a wall chewed by everyone at once. Walkers worry it
    one at a time (a raccoon 2 s, then it walks on past; a bear 20 s), the rest stand in line
    behind; only a bear's jaws crack it (5 HP/s, so a bear and a shell use each other up).
    Gulls fly over. The Wall-nut loop (everyone stops and eats through HP) is gone; the stall
    is a queue at something they want, like a lure that doesn't run out for raccoons.
- **The eel is now the lesser electric ray** (*Narcine bancroftii*), with the eel's zap
  numbers. American eels aren't electric; the electric ray lives on Gulf back-bay sand and
  really shocks. The least puffer and the Mississippi diamondback terrapin are the other two;
  the gull is a laughing gull. Fishing truth (pillar 2).
- **Cast location matters**: puffers ×1.3 by structure (the dock, reeds) and ×0.8 on open
  sand; rays ×1.3 open, ×0.5 by structure; terrapins only within a tile of reeds; the point
  is open sand, rays only. Every water tile's tooltip shows its rates. Why: every tile of a
  zone was the same, so casting was a vending machine; now the tile is a choice of defender.
- **Thieves with crates leave another way**: walkers south down the woods path from the door,
  gulls straight north. Walking back up the road through the kill zone doubled every
  defender's work and made leaks cheap. A crate comes back only if the thief is stopped before
  it gets off the map.
- **Walkers claw at fish beside the road**: raccoons and bears within a tile of a ray do 5/s
  to it. A ray one tile out gets eaten by a wave of raccoons; two tiles out it is safe. That
  is the "defender about to be eaten" the readability rule wants, and a placement decision.
- **Lures spoil at the wave's end, and gulls swallow worms** within 2 tiles, whole. A worm is
  cast for a wave at the right moment (after the gulls, ahead of the walkers), not placed once.
- **Lines don't stack**: at a lure or a terrapin, thieves stand 0.7 tiles back, then 0.6 per
  animal, along the road.
- **Money**: bounties are 1 per 40 HP (gull 1, raccoon 1, bear 5); sell prices 8 / 15 / 12;
  the worm bed makes a worm every 15 s up to 12. Pace ceilings now sit beside the floors: the
  good run ends with ≤ $150 unspent and ≤ 15 crates; a run that never buys the rod wins ≤ 40%.
- **Readability**: defender HP bars under the sprite; the shock bolt is 1 px for 4 frames;
  clawed fish shake, blink and show scratches; a worried terrapin tucks in; money floaters are
  skipped when the board is smaller than the HUD.
- **Craft**: the trees are baked once into a props canvas (they were ~35 sorted closures a
  frame); the white hit-flash silhouette is cached per sheet; the 3D leftovers in the palette
  module (`BAND_COLOR`, `hexNum`) are deleted.

Two changes go beyond the critic's list; both came from measuring after the list was in:

- 2026-10-12: **Electric rays have a charge: 140 damage a wave**, refilled over the build
  phase. Why: with the critic's changes in, the good bot still let nothing through waves 5-8,
  even with those waves doubled, and every kill was on the road's first tiles. Thieves arrive
  one at a time, so a wall of rays kills each alone, and a defense that only ever grows beats
  any wave. Real electric rays tire with repeated discharges, so the cap is the animal's own.
  140 (3.5 raccoons) leaves wave 1 limited by time in reach, which keeps the lure lesson
  (lower charges killed it: at 60 the lure cut 0.9 leaks, not 2). It rules out "deploy rays
  once, win forever".
- 2026-10-12: **The late waves are bigger and arrive faster** (DESIGN.md §5: wave 5 600 HP at
  1.0 s, wave 6 1,080 at 1.0 s, wave 7 880 at 0.8 s, wave 8 1,720 at 0.7 s), each wave carrying
  its own spawn gap. Why: with the charge, the defense per wave is roughly the fish deployed ×
  140; the waves now ask for about what a good player has caught by then. Measured: the good
  run wins 36/40 with 14.6 crates and loses a little in waves 6 and 8; deploy-with-bed but no
  rod wins 11/40. The two floors that sit at the edge (36 wins, 15 crates) are noted in
  PROGRESS.md as the first thing to watch.

What the numbers say about the critic's §8 questions (DESIGN.md §7): sell-or-deploy is now a
timing call with close outcomes (selling fish until the bed is bought: 37/40 wins and 12.3
crates; deploying everything: 36/40 and 14.6; selling until the rod: 5/40). Close is good;
it is not yet a *strong* decision. The next lever, if play says it's still flat, is Milestone 3's
second bait and boats, not more tuning here.
