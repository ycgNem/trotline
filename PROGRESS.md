# Progress

What exists, what is stubbed, what is next. Updated at the end of every session.

## Status (2026-10-12, Milestone 3 session)

**Milestone 2's gate is passed** (the owner: "looks good"). **Milestone 3, the fleet and the works,
is built, reviewed and re-measured** (DESIGN.md §12, DECISIONS.md "Milestone 3" and the two
sections after it): three boats (rowboat, skiff, trawler) that fish where they are sent and bring
the catch to the live well or sell it, kind by kind; chum, a second bait, cast as a slick on the
water that pulls gulls and bears out where rays reach them; canals (built, then hidden on Back Bay
where they measure as worth nothing); a 12-wave season; the yard (B), the fleet panel and a
boat's card; sprites for the boats, the slick and the chum bucket. **The critic's Milestone 3
review is implemented**: the point's rays are a stock the lines there share, walkers keep their
room on the road, the trawl brings up what lives where it tows, a raccoon finds a slick only a
tile from the road, readability and craft fixes. **Then the re-measurement** found a stronger
reference twice (worms only in the opening; rays past three sold for a rowboat by wave 3, which
won 96-99 of 100), and the season was sized again against it: the reference now wins 74-90 of
100, and each opening has its own danger (DESIGN.md §7). **Live**: pushed with the owner's yes
at the end of the session; https://ycgnem.github.io/trotline/ is the 12-wave season.

**What is weak, for the next review** (DESIGN.md §7, DECISIONS.md): money has nothing to buy past
the fleet ($128-140 at the finale's start); terrapins are worth nothing over a run; the late board
is a solid row of rays and puffers along the north shore (the critic's "lawn row", IDEAS.md),
denser now that the finale is fifty bears and twenty-two flocks; the finale lasts ~5 minutes.

The slice's history (Milestones 0-2), kept for reference:


(The slice went live at the end of the overnight session; every push to `main` runs the tests
and redeploys GitHub Pages.)

**Milestone 0 (2D foundation) is done** except the owner's palette pick (Apollo is provisional).
**Milestone 1 (the
vertical slice) is playable end to end**: title, eight waves, win and lose, restart, continue from
a save. **The critic's first review is implemented** (DECISIONS.md, "The critic's first review"):
re-derived pufferfish and terrapin, the electric ray, cast location, thieves leaving another way,
claws, spoiling lures, money and pace ceilings, readability and craft fixes. **So is the critic's
second review** (DECISIONS.md, "The critic's second review"): fish wear out (slow rest, claws,
wading), the charge and the chain are gone (single-target ray with lock-on, no shock through air),
a paralysing puffer, terrapins as the raccoon's prey, bears not lured, rays at the point (the
rod's job), a dawn ray and a 60 s first build, lines spaced by body length, the woods trail drawn,
floaters judged in HUD pixels, and pace tests that compare the same bot with one thing removed.
**The balance audit and the critic's third review are in too** (DECISIONS.md): worm placement
shown in lure mode and taught; the dock, the reeds and the point as three habitats (puffers,
terrapins, rays); a ray's shock only through wet ground; gull flocks; no bonus for sending a
wave early; bait a cost every build (the bed makes a worm every 30 s); a strong reference bot,
and every pace threshold re-set against it over five seed sets; the crowd lure tested and
rejected. **And the re-gate review** (DECISIONS.md, "The re-gate review"): the reference bot
plays the critic's winning line; waves 4-8 grew by about half to meet it; a gull that snatches a
puffer lands its flock on the water round it, where rays reach (the alarm call, flagged as the
Potato Mine, is gone); a lure's meal is taken when it starts and its line never runs off the map;
the lure preview counts the raccoons coming; terrapins after eight rays and never where their
line wades a ray (they help now); DESIGN's pool numbers re-measured. **And the gate review**
(DECISIONS.md, "The gate review"): the bot keeps two worms on the road and a pack costs 8 (bait
is what selling pays for after the rod); wave 8 leans on bears instead of five gull flocks; a
terrapin's line stops at the start of the road (it had been holding wave 6 off the map, and a
pace test with it); deploying a puffer frames the rays that reach where a flock lands; the flock
lands in a shallow V; the first hint names the opening's fork (sell the dawn ray, or deploy it).

## What exists

- **Engine** (`src/engine/`): fixed 60 Hz loop decoupled from rAF, input with rebindable actions,
  mulberry32 rng, event queue (drops oldest), saves with versioned migrations, procedural audio
  with placeholder sounds (cast, catch, zap, puff, snatch, gulp, claw, kill, steal, coin, wave,
  win, lose).
- **UI** (`src/ui/`): bitmap font, IMGUI kit drawn on the same canvas as the board, the overlap
  audit used by `npm run screens`.
- **Data** (`src/data/`): the shore (40 x 22 hand-written map, two zones, the woods exit),
  species (least puffer, lesser electric ray, diamondback terrapin, each with where it bites),
  defenders (poison, shock, shell, with rest rates), thieves (laughing gull, raccoon, black bear),
  bait (worms and chum), rods, boats (rowboat, skiff, trawler, the trawl, the berths), waves
  (twelve, each with its spawn gap), rules, upgrades (with fishing columns), lessons, palette. Every number carries a derivation naming a DESIGN.md section (enforced by
  `tests/data.test.ts`).
- **Sim** (`src/sim/`): `Game.ts` (state, commands with validation, the command log, replay, bite
  rates per tile), `world.ts` (tiles, the road as a path, distances, zones, the exit path, the
  structure and reed maps, the water pathfinder as a cached distance field, the open-water run a
  net needs), one system per file in the CLAUDE.md order, and `bot.ts` (deploy-all,
  deploy-with-bed, sell-all and the "good" reference player for the pace tests and the browser
  bot, with options that take one thing away).
  - Boats (`systems/boats.ts`): go out by water, fish at full rate, come back with a full hold or
    no bait, unload into the live well or sell kind by kind, wait at the dock when the well is
    full; the trawler tows 60 s and brings up chum. The point's rays are shared by every line
    there (`Game.shared`, about 4 a minute).
  - Chum slicks (`systems/lures.ts`): gulls within 4 drop round one and squabble, bears within 5
    wade out and eat 8 s one at a time, raccoons find one only within a tile; it spoils at the
    wave's end. The slick preview says who reaches it first and how many it feeds.
  - Canals (`systems/construction.ts`): dig grass or sand that joins water, a tile at a time; a dug
    tile is a marsh ditch. Hidden on Back Bay (`SHORE.canals` false).
  - Gulls arrive in flocks of three; one that snatches a pufferfish drops onto the water with
    it, and the flockmates near it land round it for 6 s trying to rob it (a ray reaches gulls
    sitting on the water), then fly on.
  - Thieves: walk the road keeping 0.8 of a line spacing from the one ahead (a walker comes on
    only as the road has room), go for lures (raccoons eat one at a time, the rest in a line spaced
    by body length; gulls swallow them; bears ignore them), stop at terrapins (raccoons worry
    and gnaw one at a time, bears shove), claw fish within a tile as they walk and wade for them
    while they wait in a line, take crates and leave south down the trail (walkers) or north
    (gulls), stand paralysed when stunned, take poison over time, rejoin the road ahead of them.
  - Defenders: pufferfish snatched and eaten (poison + paralysis; not by a thief already
    paralysed), rays shock one walker at a time on wet ground and stay on it, terrapins worried by raccoons and
    shoved by bears. A tenth of an HP a second of rest between waves; a fish clawed or gnawed to 0
    is lost.
  - Lures: a raccoon takes its whole meal when it starts eating and the lure stays until that
    meal is done; no one is pulled whose place in line would be off the map; a gull swallows one
    whole; they spoil at the wave's end. The lure-mode preview counts the raccoons coming. A
    terrapin's line, like a lure's, never stands back past the start of the road.
- **Render** (`src/render/`): integer-zoom camera that fits the whole shore, ground baked into
  chunks, trees baked once into a props layer, y-sorted sprites, gulls above with shadows,
  effects from sim events (1 px shock bolts, splashes, the fish leaping to the angler, poofs,
  the "!" over a lured thief, a snatch splash, a gull's swallow ring, claw scratches), HP bars,
  eating and worrying timers, a clawed fish shaking and blinking, a retching thief
  with the puffer in its mouth and green bubbles, the deploy overlay (lit tiles plus the fish's
  reach), the lure overlay (road in reach), the slick overlay (lit water, cached), the cast range,
  boats with their rods and bobbers, the trawler's net and wake, the send path as ringed dots. Sprites load from
  `src/art/<name>.png + .json` (drawn with the pixel-art-studio skill); anything missing has a
  code placeholder. HP bars sit on the side of a fish away from the road.
- **App** (`src/app/`): title, play (top bar, live well with sell and deploy, shop, status line,
  tooltips with each water tile's rates and whether it's by the dock, the reeds or open sand,
  thief and defender tooltips with what they're doing, floating text judged for overlap in HUD
  pixels, a toast naming each wave and any new kind of thief in it, five lesson cards, a help
  card, the yard (B: the rod, the bed, the boats; the game waits while it is open), the fleet
  panel and a boat's card with Send, Moor and Sells toggles), end screen with the season's
  numbers. Keys: 1-6 pick a fish, X sell, F deploy, L lure (Shift-click for more), C slick, B the
  yard, N send the wave, Space pause, Tab speed (x1-x3), Esc or
  right-click cancel, WASD/arrows pan, Q/E or the wheel zoom, H hide HUD, M mute, / or F1 help,
  ` debug line.
- **Tests** (218): data validation (including the trail, that every species bites somewhere the
  surf rod reaches and that the reeds are in tier-1 reach), the sim's rules one by one (35), the
  fleet's (23: boats, the trawl, slicks, canals, the shared stock, walker spacing, save
  migration), the pace lessons from DESIGN.md §6-§7 in `tests/pace-*.test.ts` (fixed waves; the
  reference's season; the other openings and lines; the bot with worms, chum, boats or the rod
  taken away; one bot a file), sim purity, engine. `npm test` takes ~3 minutes on 32 threads
  (the pace tests play ~1,000 seasons; longer on CI's four cores).
- **e2e**: `npm run shots` (title, first catch, deploy mode, first deploy, lure mode, a raccoon
  leaving the road, eating and the line, after wave 1, raccoons lined up at a terrapin, a
  pufferfish snatched, a ray being clawed, a raccoon escaping south, a gull flock landing round
  a puffer, the first boat, send mode, boats fishing and unloading, slick mode, gulls and a bear
  at a slick, the yard, wave 12, won, lost), `npm run screens` (overlap audit, 19 states x 3
  sizes), `npm run smoke` (real input
  only), `npm run bot` (three strategies x three seeds, played in the browser).

## Measured (DESIGN.md §7)

Five 100-seed sets of the season (seeds 1-500). The reference: 74, 87, 88, 84, 90 wins; won runs
keep 14.9-15.8 crates; the rowboat by wave 3, the trawler by 7; boats land 112-121 fish; $128-140
at the finale's start; it loses its runs in waves 10-12. Deploying the dawn ray 79-88; the rowboat
first 72-86 (8-15 runs end at wave 4); keeping six rays before the rowboat 67-79; keeping every
boat's catch 72-77; no worms 79-83 (5 crates more lost in waves 1-2); worms all season 74-84; no
terrapins 77-92; no rod 27-41; no chum 0-2; no boats 0-2. Wave 1 (200 seeds): deploy-all leaks
2.6 of 5, sell-all 5, a midpoint worm beside the dawn ray 2.7 to 0.06. Wave 3: three terrapins or
four rays leak all 6 gulls; a puffer between two rays a flock, none. Wave 6 past four rays: 20
crates stolen, 5 with a slick between the first two rays; a terrapin cuts leaks 8 to 3.

## Stubbed or missing

- Buckets (Milestone 6), more docks, crickets (Back Bay's third bait is live shrimp, Milestone 4),
  scraps from kills (not taken): DESIGN.md §12.
- Canals are built but hidden on Back Bay; they want a shore whose road runs inland (IDEAS.md).
- Settings, keybind screen, volume sliders: Milestone 10. Music: Milestone 9.

## Known problems / watch next

- **Money past the fleet**: once the skiff and the bed are bought there is nothing to buy but
  bait, and the late waves' bounty piles up ($128-140 at the finale's start, $340-410 at the end).
  A pace test caps it at $160; the sink is a design call (IDEAS.md).
- **Terrapins are worth nothing over a run** (the bot without them wins 0-4 more): the slick took
  the bear from them. They still teach in wave 6. IDEAS.md.
- **The late board is a lawn row**: thirty-odd rays and puffers two tiles off one straight road
  (e2e/out/shots/10-wave-12-fight.png). The shared ray stock thinned the rays; Milestone 4's roster
  is what would break the row up (IDEAS.md).
- **The finale is long** (~5 of a ~25-minute season): fifty bears come on one every ~1.8 s.
- **The bed buys nothing** (as in the slice): the reference digs it last, with money it can't use.
- **In the frozen screenshot scripts** many effects (bolts, "!") from a batch of stepped ticks
  show at once; live play doesn't do that.

## PixelLab budget

0 generations spent this session (cap 100). The boats, the slick and the chum bucket are drawn with
the pixel-art-studio skill (`pixel-art/boats/`).
