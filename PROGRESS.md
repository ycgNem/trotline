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
terrapins, rays); a ray's shock only through wet ground; gull flocks and the alarm call; no bonus
for sending a wave early; bait a cost every build (the bed makes a worm every 30 s); a strong
reference bot, and every pace threshold re-set against it over five seed sets; the crowd lure
tested and rejected.

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
  - Gulls arrive in flocks of three; one that snatches a pufferfish calls the alarm and the
    flockmates near it turn back with nothing.
  - Thieves: walk the road, go for lures (raccoons eat one at a time, the rest in a line spaced
    by body length; gulls swallow them; bears ignore them), stop at terrapins (raccoons worry
    and gnaw one at a time, bears shove), claw fish within a tile as they walk and wade for them
    while they wait in a line, take crates and leave south down the trail (walkers) or north
    (gulls), stand paralysed when stunned, take poison over time, rejoin the road ahead of them.
  - Defenders: pufferfish snatched and eaten (poison + paralysis; not by a thief already
    paralysed), rays shock one walker at a time on wet ground and stay on it, terrapins worried by raccoons and
    shoved by bears. A tenth of an HP a second of rest between waves; a fish clawed or gnawed to 0
    is lost.
  - Lures: a gull swallows one whole; they spoil at the wave's end.
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
- **Tests** (144): data validation (including the trail, that every species bites somewhere the
  surf rod reaches and that the reeds are in tier-1 reach), the sim's rules one by one (30), the
  pace lessons from DESIGN.md §6-§7 (17: floors, ceilings, and comparisons of the good bot with the
  rod, the selling or the worms taken away, and fixed waves for the gulls and the terrapin), sim purity, engine. `npm test` takes ~3 minutes, mostly pace.
- **e2e**: `npm run shots` (title, first catch, deploy mode, first deploy, lure mode, a raccoon
  leaving the road, eating and the line, after wave 1, raccoons lined up at a terrapin, a
  pufferfish snatched, a ray being clawed, a raccoon escaping south, a gull flock turned by the alarm, wave 8, won, lost), `npm run screens` (overlap audit, 11 states x 3 sizes), `npm run smoke` (real input
  only), `npm run bot` (three strategies x three seeds, played in the browser).

## Measured (DESIGN.md §7)

Wave 1 (5 raccoons, 200 seeds): deploy-all leaks 3.0, sell-all 5.0, a midpoint worm beside the
dawn ray 3.42 → 0.06. A worm a tile short of the ray stops all five and spares it; beside it the
ray dies; on the dry dock foot nothing is shocked. Wave 3 (two flocks): three terrapins or four
rays leak all 6; one puffer 3; two puffers none. Wave 6 past four rays: 11 leak, 1 with a
terrapin. Whole run, the strong good bot over five 100-seed sets: 76, 77, 76, 75, 83 wins, won
runs 12-15 crates, $42-47 unspent, 1.3 fish lost; never selling 47-58; no rod 28-35; no worms
25-43; no terrapins 73-80. Crates stolen per wave 1.8, 1.8, 0.0, 2.6, 0.4, 1.1, 0.2, 1.7.

## Stubbed or missing

- Construction (canals, buckets): Milestone 3; the system is an empty stub in its slot.
- Chum: Milestone 3.
- Settings, keybind screen, volume sliders: Milestone 10. Music: Milestone 9.

## Known problems / watch next

- **Money piles up late** ($42-47 unspent for the strong bot): past the rod and the bed the slice
  sells only bait. A slice limit; Milestone 3's boats, canals and chum are the sinks (IDEAS.md).
- **Terrapins do what a worm does** over a whole run (about no wins either way with a worm down
  every wave), though one turns a fixed wave from 11 leaks to 1. A free, permanent worm; whether
  that is enough of a role is a question for the gate.
- **The gull alarm is flagged as possibly derivative** (a one-use fish, then an effect in a
  radius, like the Potato Mine's splash). The owner should judge it (DECISIONS.md).
- **Worm placement is a first-waves lesson**: it decides wave 1, but over a whole run with rays in
  numbers it is worth ~1 win. Whether lures feel like control is the gate's question 2.
- **In the frozen screenshot scripts** many effects (bolts, "!") from a batch of stepped ticks
  show at once; live play doesn't do that.

## PixelLab budget

0 generations spent this session (cap 100). Art is drawn with the pixel-art-studio skill.
