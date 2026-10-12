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

## The critic's second review, implemented (2026-10-12)

The critic played the build above, measured it with the bots (one change at a time over 40
seeds) and returned 11 ranked findings. Its headline: selling was still never right (rays
never died, so a deployed fish was stock that only grew), wave 1 was the hardest wave, the
ray's charge didn't bind (140, 200 and infinite charge all won 36-37/40), and the pace tests
could not tell a good bot from a bad one. All 11 are in; three were changed from what the
critic proposed, said below. This **supersedes** the charge and the late-wave sizes of the
first review. DESIGN.md §2-§7, §10 and §11 are rewritten to match.

- **Fish wear out** (finding 1). Rest is 0.1 HP/s, during the build only (was 1 HP/s, a full
  heal every build). Walkers claw at reach 1 while they walk (5/s). Thieves standing in a line
  at a lure or a terrapin *wade*: raccoons 2 tiles at 1/s, bears 1 tile at 5/s. Busy and
  leaving thieves don't claw. Why: a fish on the board must be able to be lost, or selling
  never pays. **Changed from the critic's proposal** (any stopped thief clawing at 5/s within
  2 tiles): measured, a lure beside a ray then killed the ray in ~4 s and the luring lesson
  fell from a 2.6-leak cut to 0.7. A raccoon feeling around in the water is slower than one
  swiping as it passes; 1/s keeps the lure the best first move and still costs the ray.
- **The charge is removed** (finding 2): it didn't bind, so it was a number with no decision
  behind it. Wear does its job (late waves press because fish wear out, not because rays run
  dry). The ray's "recharge over the build" (an instant refill) goes with it.
- **The first build is 60 s and the run starts with a ray in the live well**, "caught at
  dawn" (finding 2): the losses the critic traced were first builds with no ray (23% of runs)
  or no fish (7%). Wave 1's lessons now hold on every seed.
- **The pace tests compare the same bot with one thing taken away** (finding 3): the good bot
  against itself without the rod (`noRod`) and without selling (`naive`: bed first, never
  sells). Crates are counted over won runs only. Runs are 100 seeds, wave-1 checks 200, every
  threshold a margin from the measured mean. Per-wave targets: wave 1 costs ≤ 2 crates, waves
  5-8 ≥ 1.5. The critic asked for 200-seed runs; 100 keeps the suite under 3 minutes and the
  margins (8 wins on the floor, 12-16 on the comparisons) are several times the spread.
- **The ray is a pass fish; the rod's job is rays** (findings 4 and 7). Lesser electric rays
  are high-salinity surf and pass fish, an occasional catch on a brackish flat: 0.8/min in the
  bay, 2.5 at the point. The surf rod costs 50 (was 60). The good bot sells puffers to buy it
  first unless gulls are coming. Measured: without the rod the same bot wins 42/100 against 78;
  without selling, 51. Selling to invest is now worth ~27 wins: finding 1's question has an
  answer.
- **Rays can't shock a gull** (finding 7): no discharge goes through air. Gull counts are
  halved (wave 3: 5; 5: 6; 7: 7; 8: 5) and the puffer is the gull answer. The good bot fishes
  the dock for puffers when a gull wave is this one or the next, and holds them in the live
  well through the raccoon wave before it.
- **The pufferfish paralyses** (finding 8): 24 poison over 3 s and a 4 s stun (was 40 and 2 s).
  It kills a gull, not a raccoon: beside a ray it holds a raccoon in reach for 24 more. The
  Potato Mine's role (one use that kills exactly one basic walker) is gone; what is left is
  the animal's. A thief already paralysed can't snatch a second puffer (finding 11).
- **The ray's chain is removed** (finding 8). **Flagged as derivative**: "the shock jumps to 2
  more within 2 tiles at 50%" is Kingdom Rush's Tesla tower, and a discharge doesn't hop
  between animals on dry land. A ray now shocks one walker, staying on it while it is in reach.
  Lock-on is ours, from measuring: nearest-each-pulse spread the damage over a line of
  raccoons and killed none.
- **Terrapin predator truth** (finding 7). Raccoons are the diamondback terrapin's real
  predator; black bears aren't. Raccoons now worry a terrapin 4 s each, gnawing 1.5 HP/s; a
  bear shoves it aside in 3 s and does it no harm. The first model had it backwards (raccoons
  gave up in 2 s, only bears cracked it).
- **Bears aren't pulled by worms** (finding 7): bears raid for fish. Bear HP 200 → 160 and
  bounty 5 → 4 (1 per 40 HP), one bear in waves 4 and 6, two in 8: a bear that nothing holds
  long has to be killed by rays as it walks.
- **Bears first, tested and rejected** (finding 4). The critic proposed spawning bears first so
  raccoons line up behind a bear at a terrapin. With the 3 s shove the line doesn't form, and
  measured bears-first won 22/40 against 32/40 for bears last. Bears stay last. The shot of
  a line at a terrapin is now raccoons, which is the true picture.
- **Smaller truths** (finding 7): the least puffer lives near the bottom (band `bottom`); a
  terrapin needs the marsh edge, not a heavy line (size medium), and the reeds east of the
  dock are inside the tier-1 cast.
- **Floaters judged in HUD pixels** (finding 5): overlap by the font's real width and line
  height, stacked a whole line up, money floaters merged, word floaters dropped when the board
  is smaller than the HUD, and no "Poisoned!" floater at all.
- **Lines spaced by body length** (finding 6): gull 1, raccoon 1.2, bear 1.6 tiles; each
  animal stands half its length plus half the one ahead's behind it. A thief that leaves a
  line or a terrapin rejoins the road at the nearest road point ahead of it (it used to walk
  back to where it left the road).
- **The way out is drawn** (finding 10): a dirt trail down column 34 (`Tile.Trail`), and the
  stray sand tile at (36,18) is grass. The end screen shows recovered crates only when there
  are any; no slot reaches the trail, and that is on purpose (a crate that leaves is gone).
- **Lures** (finding 9): pull radii now differ by thief (gull 2, raccoon 4, bear none), and a
  line at a lure wades at your rays. Whether that makes lures control rather than a recipe is
  a question for play; the pace test shows the lure is still the best first move.
- **Craft** (finding 11): the nearest road index is precomputed per tile in `World`
  (`roadNear`), not searched per defender per frame; DESIGN.md's "two raccoons eat a ray one
  tile out" is corrected to three; PLAN.md's defender table is updated and its note moved below
  it; HANDOFF.md is rewritten for the 2D game.
- **Calling early stays weak** (finding 11): $1-12 against ~1.8 fish of fishing. Left as is and
  noted in DESIGN.md §2 and IDEAS.md; no lesson or pace test leans on it.

What the numbers say about §8 now (DESIGN.md §7, 100 seeds): the good bot wins 78/100 with
13.2 crates in won runs and $26 unspent; it sells 3.5 fish a run and loses 2.2 to claws.
Taking selling away costs 27 wins, the rod 36, the terrapins 32 (a pace test each). Sell-or-deploy is a decision with a measured
price on both sides; whether it *feels* like one is the Milestone 2 gate's question.

## The balance audit after the second review (2026-10-12)

The `balance-auditor` recomputed DESIGN.md from `src/data` and ran each pace comparison on five
100-seed sets. Fixed:

- **Numbers DESIGN.md had wrong**: a bear needs five ray-passes (39 each), not four; a lone ray
  kills no raccoon on a straight (24 < 40) and a ray and a puffer stop 1 of 6, not 2-3; the
  deploy-all bot meets wave 1 with ~4.4 fish because it fishes by the reeds, not ~3.4 on open
  sand; call-early pays $1-6, not $1-12; the point is 11-19 tiles out; 17 raccoons crack a
  shell. Stale derivations fixed (the rod's "60 money", "§3 money", the bear's unused `eat: 10`,
  the puffer's never-spent HP). The ray's deploy tip no longer says two tiles out is safe.
- **Where a worm lands decides what it costs** (DESIGN.md §6). The audit found a worm beside a
  ray kills the ray by wading in a quarter of wave-1 seeds; measuring every tile showed a worm
  one or two tiles short of the ray stops all six raccoons and spares it, and beside it the ray
  dies every time. That is a placement decision the player couldn't see, and the lesson card
  taught the losing version ("cast a worm beside your fish"). Now: lure mode previews where the
  line would stand, frames in red the fish it could wade at and in gold the rays that reach the
  eater, and the status line counts both; the cards say "a tile or two short of your ray, on
  the side the thieves come from"; the good bot scores worm tiles the same way (`lurePreview`
  in `systems/lures.ts`, one helper for the overlay and the bot). A deterministic pace test
  holds the lesson.
- **The HUD shows the next two waves**: the good bot planned puffers two waves ahead, which a
  player could not see.
- **Pace tests that held by seed luck**: the no-terrapin comparison failed on two of five seed
  sets and the never-sell one measured purchase order as well as selling. The never-sell bot
  now only stops selling (`noSell`); every threshold clears the worst of the five sets; the
  money ceiling is $60 (the $150 one could never fail).

## The critic's third review, implemented (2026-10-12)

The `indie-critic` reviewed commit b7419a5 as the gate review. Its verdict: ready for the owner
to play, not ready to pass the gate, because a simple policy (sell puffers until the rod and
the bed are bought, deploy everything, one worm a wave) won 98/100 with $92 unspent, one reeds
tile was the whole fishing game, and lures metered thieves rather than placed the fight. Its
eight findings, and what changed (DESIGN.md §2-§7, §10, §11 rewritten):

- **The reference bot was weak** (finding 1). It bought a worm pack each time it ran dry and
  never saved for the bed. The good bot is now the critic's strong policy and more (DESIGN.md
  §7): it invests in the rod then the bed with puffer sales, keeps a worm down and four in the
  can once invested, plans a puffer per gull flock, places terrapins and worms by where rays
  shock the line. On the old numbers it won 191/200; every pace threshold is re-set against it,
  over five seed sets.
- **Money needed a use every build** (finding 1). The worm bed makes a worm every 30 s, not 15:
  half what a tier-2 line uses, so bait is bought every build ("selling funds bait", pillar 1).
  The critic's other option, a worm fed to a deployed fish healing it, was not taken: a new verb
  for the slice, and feeding a wild fish set in the shallows is not something anglers do. The
  good bot still ends with $42-47: past the rod and the bed, the slice sells only bait. That is
  the slice's limit (two purchases); Milestone 3's boats, canals and chum are the sinks. Noted
  in IDEAS.md; not solved here.
- **The dock means puffers, the reeds terrapins, the point rays** (finding 2). One "structure"
  multiplier for the dock and the reeds put the dock's puffers at the reeds too, with the
  terrapins, so the line sat by the reeds 74% of a run. Now three habitats: puffers ×1.3 by the
  dock, ×0.8 by reeds and on open sand; rays 0.4 in the bay (a stray; was 0.8), 2.5 at the
  point; terrapins only by reeds, at 1.0 a minute (was 0.5: diamondbacks are abundant in salt
  marsh, and at 0.5 a terrapin cost five rays of fishing time).
- **Lures: the critic's crowd, tested and rejected** (finding 3). Everyone pulled eating at once
  won 2/200 with wading and 17/200 without, against 85 for the queue: a crowd eats a worm in
  seconds and a ray shocks one thief at a time. The queue stays. What answers the finding is
  wet ground (below) and the placement preview: a worm on dry road (the dock's foot) stops
  nothing; beside a ray it costs the ray; a tile short of it stops wave 1. Over a whole run, with
  rays in numbers and a worm down every wave, placement is worth ~1 win: it is a lesson of the
  first waves, said so in DESIGN.md §6.
- **Gull flocks and the alarm call** (finding 4: one puffer a gull was the Potato Mine's role,
  moved to gulls, and tied the line to the dock). Gulls arrive in flocks of three, 0.3 s apart;
  a gull that snatches a pufferfish gives an alarm call and every gull within 2.5 tiles turns
  back north with nothing. Gull waves are three flocks now (6, 9, 9, 9 gulls). **Flagged as
  possibly derivative** (CLAUDE.md): a one-use fish followed by an effect in a radius is the
  shape of the Potato Mine's splash, the shape the first review removed. What differs: nothing
  is damaged; only gulls react, and only to a gull's distress; they leave with no crate and pay
  no bounty; it is the animal's behaviour (laughing gulls flock and alarm-call). The owner should
  judge whether it reads as a mine.
- **Sending a wave early pays nothing** (finding 5): the bonus for time left on the clock is
  Kingdom Rush's early-call gold, and it was never worth taking. "Send wave" stays.
- **A shock travels through water** (finding 6: the ray shocked raccoons on a dry road three
  tiles off, but a lesser electric ray's discharge works on contact in water). A ray shocks only
  a thief on wet ground: water, or land touching it. 27 of 39 road tiles are wet; the sand strip
  by the dock, the dock's foot, the bend's corner and the last approach to the smokehouse are
  dry. Wet road is drawn with a damp band along the water; deploying a ray tints the wet road it
  would shock; the lure preview says when the eater would stand on dry ground. The bots place
  rays by wet road in reach.
- **Readability at 1x** (finding 7): at a board zoom below the HUD's, only a lost crate floats
  (money floaters were still drawn at HUD size); a lure keeps a pink ring and its food bar over
  the sprites (a raccoon eating it hid it); the wave toast sits under the top bar (it covered the
  smokehouse) and waits while a card is open.
- **Craft** (finding 8): the renderer's y-sort reuses tagged entries instead of a closure per
  sprite per frame; clawed fish come from one set a frame, not a scan of every thief per fish;
  the deploy overlay's lit tiles are cached until a fish or a lure comes or goes; effects are
  compacted in place. The rod's "60 money" derivation was already fixed.
- **Wave 1 is five raccoons** and the waves are retuned against the strong bot (DESIGN.md §5):
  it wins 75-83 of 100 over five seed sets, the first bear and the finale the peaks.

Measured (DESIGN.md §7): selling is worth ~25 wins, the rod ~45, a worm on the road every wave
~42; terrapins about nothing over a whole run (they do what the worm does) but 11 leaks to 1 in
a fixed wave, so their pace test is the fixed wave.
