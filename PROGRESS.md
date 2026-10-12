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
  - Thieves: walk the road, go for lures (raccoons eat one at a time, the rest in a line spaced
    by body length; gulls swallow them; bears ignore them), stop at terrapins (raccoons worry
    and gnaw one at a time, bears shove), claw fish within a tile as they walk and wade for them
    while they wait in a line, take crates and leave south down the trail (walkers) or north
    (gulls), stand paralysed when stunned, take poison over time, rejoin the road ahead of them.
  - Defenders: pufferfish snatched and eaten (poison + paralysis; not by a thief already
    paralysed), rays shock one walker at a time and stay on it, terrapins worried by raccoons and
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
- **Tests** (139): data validation (including the trail, that every species bites somewhere the
  surf rod reaches and that the reeds are in tier-1 reach), the sim's rules one by one (30), the
  pace lessons from DESIGN.md §7 (15: floors, ceilings, and comparisons of the good bot with the
  rod, the selling or the terrapins taken away), sim purity, engine. `npm test` takes ~3 minutes, mostly pace.
- **e2e**: `npm run shots` (title, first catch, deploy mode, first deploy, lure mode, a raccoon
  leaving the road, eating and the line, after wave 1, raccoons lined up at a terrapin, a
  pufferfish snatched, a ray being clawed, a raccoon escaping south, wave 8, won, lost), `npm run screens` (overlap audit, 11 states x 3 sizes), `npm run smoke` (real input
  only), `npm run bot` (three strategies x three seeds, played in the browser).

## Measured (DESIGN.md §7)

Wave 1 (200 seeds): deploy-all leaks 2.27, sell-all 6.0, a midpoint lure beside the dawn ray
3.09 → 0.51. Wave 3: three terrapins or four rays leak all 5 gulls; five puffers leak none.
Whole run (100 seeds): the good bot wins 78/100, won runs end with 13.2 crates, $26 unspent,
3.5 fish sold and 2.2 lost to claws a run; crates stolen per wave 1.6, 1.1, 0.5, 1.5, 1.0, 0.5,
0.8, 2.6. The same bot never selling: 51/100. Without the rod: 42/100. Without terrapins: 46/100. Deploy-with-bed ~43/100;
deploy-all and sell-all 0/20.

## Stubbed or missing

- Construction (canals, buckets): Milestone 3; the system is an empty stub in its slot.
- Chum: Milestone 3.
- Settings, keybind screen, volume sliders: Milestone 10. Music: Milestone 9.

## Known problems / watch next

- **Calling a wave early is weak** ($1-12 against ~1.8 fish of fishing). Noted in DESIGN.md §2
  and IDEAS.md; no lesson leans on it.
- **Wave 8 is the hardest wave** (2.6 crates) and wave 1 next (1.6): the curve dips in the
  middle (waves 3 and 6 cost ~0.5). Fine for a slice; watch it when Milestone 3 adds sinks.
- **Lures may still be one recipe** (one worm a wave beside the most rays, after the gulls).
  Wading makes it cost ray HP; whether it feels like control is the gate's question 2.
- **In the frozen screenshot scripts** many effects (bolts, "!") from a batch of stepped ticks
  show at once; live play doesn't do that.

## PixelLab budget

0 generations spent this session (cap 100). Art is drawn with the pixel-art-studio skill.
