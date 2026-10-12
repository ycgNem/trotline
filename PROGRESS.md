# Progress

What exists, what is stubbed, what is next. Updated at the end of every session.

## Status (2026-10-12, overnight session, in progress)

**Milestone 0 (2D foundation) is done** except the owner's palette pick (Apollo is provisional) and
the GitHub Pages deploy (it runs on a push, which needs the owner's yes). **Milestone 1 (the
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
line wades a ray (they help now); DESIGN's pool numbers re-measured.

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
  bait and worms, rods, waves (each with its spawn gap), rules, upgrades (with fishing columns),
  lessons, palette. Every number carries a derivation naming a DESIGN.md section (enforced by
  `tests/data.test.ts`).
- **Sim** (`src/sim/`): `Game.ts` (state, commands with validation, the command log, replay, bite
  rates per tile), `world.ts` (tiles, the road as a path, distances, zones, the exit path, the
  structure and reed maps), one system per file in the CLAUDE.md order, and `bot.ts` (deploy-all,
  deploy-with-bed, sell-all and "good" players for the pace tests and the browser bot).
  - Gulls arrive in flocks of three; one that snatches a pufferfish drops onto the water with
    it, and the flockmates near it land round it for 6 s trying to rob it (a ray reaches gulls
    sitting on the water), then fly on.
  - Thieves: walk the road, go for lures (raccoons eat one at a time, the rest in a line spaced
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
    whole; they spoil at the wave's end. The lure-mode preview counts the raccoons coming.
- **Render** (`src/render/`): integer-zoom camera that fits the whole shore, ground baked into
  chunks, trees baked once into a props layer, y-sorted sprites, gulls above with shadows,
  effects from sim events (1 px shock bolts, splashes, the fish leaping to the angler, poofs,
  the "!" over a lured thief, a snatch splash, a gull's swallow ring, claw scratches), HP bars,
  eating and worrying timers, a clawed fish shaking and blinking, a retching thief
  with the puffer in its mouth and green bubbles, the deploy overlay (lit tiles plus the fish's
  reach), the lure overlay (road in reach) and the cast range. Sprites load from
  `src/art/<name>.png + .json` (drawn with the pixel-art-studio skill); anything missing has a
  code placeholder. HP bars sit on the side of a fish away from the road.
- **App** (`src/app/`): title, play (top bar, live well with sell and deploy, shop, status line,
  tooltips with each water tile's rates and whether it's by the dock, the reeds or open sand,
  thief and defender tooltips with what they're doing, floating text judged for overlap in HUD
  pixels, a toast naming each wave and any new kind of thief in it, three lesson cards, a help
  card), end screen with the season's numbers. Keys: 1-6 pick a fish, X sell,
  F deploy, L lure (Shift-click for more), N send the wave, Space pause, Tab speed (x1-x3), Esc or
  right-click cancel, WASD/arrows pan, Q/E or the wheel zoom, H hide HUD, M mute, / or F1 help,
  ` debug line.
- **Tests**: data validation (including the trail, that every species bites somewhere the
  surf rod reaches and that the reeds are in tier-1 reach), the sim's rules one by one (34), the
  pace lessons from DESIGN.md §6-§7 (19: floors, ceilings, and comparisons of the good bot with the
  rod, the selling, the worms or the terrapins taken away, and fixed waves for the gulls and the
  terrapin), sim purity, engine. `npm test` takes several minutes, mostly pace.
- **e2e**: `npm run shots` (title, first catch, deploy mode, first deploy, lure mode, a raccoon
  leaving the road, eating and the line, after wave 1, raccoons lined up at a terrapin, a
  pufferfish snatched, a ray being clawed, a raccoon escaping south, a gull flock landing round a puffer, wave 8, won, lost), `npm run screens` (overlap audit, 11 states x 3 sizes), `npm run smoke` (real input
  only), `npm run bot` (three strategies x three seeds, played in the browser).

## Measured (DESIGN.md §7)

Wave 1 (5 raccoons, 200 seeds): deploy-all leaks 3.0, sell-all 5.0, a midpoint worm beside the
dawn ray 3.42 → 0.06. A worm a tile short of the ray stops all five and spares it; beside it the
ray dies; on the dry dock foot nothing is shocked. Wave 3 (two flocks): three terrapins or four
rays leak all 6; two puffers alone 4; a puffer between two rays for each flock, none. Whole run,
the good bot (the critic's line) over five 100-seed sets: 81, 78, 81, 84, 85 wins, won runs
12.8-14.3 crates, $50-55 unspent, ~2.2 fish lost; never selling 1-4; no rod 0; no worms 50-68;
no terrapins 82-84 wins but 0.6-1.8 more crates stolen in waves 5-8; never digging the bed: the
same. Wave 6 past four rays: 18 of 20 leak, 2 with a terrapin. Crates stolen per wave 0.0, 0.1,
0.4, 0.1, 0.6, 2.0, 1.5, 4.8.

## Stubbed or missing

- Construction (canals, buckets): Milestone 3; the system is an empty stub in its slot.
- Chum: Milestone 3.
- Settings, keybind screen, volume sliders: Milestone 10. Music: Milestone 9.

## Known problems / watch next

- **Money piles up late** ($50-55 unspent for the strong bot) and **the bed buys nothing**: the
  same bot never digging it wins the same runs. The owner's call (the re-gate review's G:
  a third rod, or a job for the bed; IDEAS.md).
- **The opening is close to a line**: never selling wins 1-4 of 100, no rod 0. Selling for the
  rod is the decision at its sharpest, but there is no second road to the rays (IDEAS.md).
- **Wave 8 is a spike** (4.8 of the good bot's ~9.5 stolen crates a run), and **a run can die in
  its opening**: with few early catches and the rod bought down to the last dollars, a player
  can have no worms and no money for a pack; selling a fish is the way out (the bot does), and a
  player with an empty live well waits on bounties. DESIGN §3 says a broke player is never stuck;
  that holds only with a fish to sell.
- **Worm placement is a first-waves lesson**: it decides wave 1, but over a whole run with rays in
  numbers it is worth ~1 win. Whether lures feel like control is the gate's question 2.
- **In the frozen screenshot scripts** many effects (bolts, "!") from a batch of stepped ticks
  show at once; live play doesn't do that.

## PixelLab budget

0 generations spent this session (cap 100). Art is drawn with the pixel-art-studio skill.
