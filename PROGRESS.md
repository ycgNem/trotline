# Progress

What exists, what is stubbed, what is next. Updated at the end of every session.

## Status (2026-10-12, overnight session, in progress)

**Milestone 0 (2D foundation) is done** except the owner's palette pick (Apollo is provisional) and
the GitHub Pages deploy (it runs on a push, which needs the owner's yes). **Milestone 1 (the
vertical slice) is playable end to end**: title, eight waves, win and lose, restart, continue from
a save. **The critic's first review is implemented** (DECISIONS.md, "The critic's first review"):
re-derived pufferfish and terrapin, the electric ray, cast location, thieves leaving another way,
claws, spoiling lures, money and pace ceilings, readability and craft fixes; plus the ray's charge
and faster late waves, which came out of measuring afterwards.

## What exists

- **Engine** (`src/engine/`): fixed 60 Hz loop decoupled from rAF, input with rebindable actions,
  mulberry32 rng, event queue (drops oldest), saves with versioned migrations, procedural audio
  with placeholder sounds (cast, catch, zap, puff, kill, steal, coin, wave, win, lose).
- **UI** (`src/ui/`): bitmap font, IMGUI kit drawn on the same canvas as the board, the overlap
  audit used by `npm run screens`.
- **Data** (`src/data/`): the shore (40 x 22 hand-written map, two zones, the woods exit),
  species (least puffer, lesser electric ray, diamondback terrapin, each with where it bites),
  defenders (poison, shock with a charge, shell), thieves (laughing gull, raccoon, black bear),
  bait and worms, rods, waves (each with its spawn gap), rules, upgrades (with fishing columns),
  lessons, palette. Every number carries a derivation naming a DESIGN.md section (enforced by
  `tests/data.test.ts`).
- **Sim** (`src/sim/`): `Game.ts` (state, commands with validation, the command log, replay, bite
  rates per tile), `world.ts` (tiles, the road as a path, distances, zones, the exit path, the
  structure and reed maps), one system per file in the CLAUDE.md order, and `bot.ts` (deploy-all,
  deploy-with-bed, sell-all and "good" players for the pace tests and the browser bot).
  - Thieves: walk the road, go for lures (eat one at a time, the rest in a line), stop at
    terrapins (worry one at a time, the rest wait), claw fish within a tile, take crates and leave
    south (walkers) or north (gulls), retch when stunned, take poison over time.
  - Defenders: pufferfish snatched and eaten (poison + stun), rays shock and chain until their
    charge is spent for the wave, terrapins cracked only by bears. Rest and recharge between waves.
  - Lures: a gull swallows one whole; they spoil at the wave's end.
- **Render** (`src/render/`): integer-zoom camera that fits the whole shore, ground baked into
  chunks, trees baked once into a props layer, y-sorted sprites, gulls above with shadows,
  effects from sim events (1 px shock bolts, splashes, the fish leaping to the angler, poofs,
  the "!" over a lured thief, claw scratches, a spent ray's fizzle), HP bars under defenders,
  ray charge bars, eating and worrying timers, a clawed fish shaking and blinking, a retching thief
  with the puffer in its mouth and green bubbles, the deploy overlay (lit tiles plus the fish's
  reach), the lure overlay (road in reach) and the cast range. Sprites load from
  `src/art/<name>.png + .json`; anything missing has a code placeholder.
- **App** (`src/app/`): title, play (top bar, live well with sell and deploy, shop, status line,
  tooltips with each water tile's rates and whether it's by the dock, the reeds or open sand,
  thief and defender tooltips with what they're doing, floating numbers, toasts, three lesson
  cards, a help card), end screen with the season's numbers. Keys: 1-6 pick a fish, X sell,
  F deploy, L lure (Shift-click for more), N send the wave, Space pause, Tab speed (x1-x3), Esc or
  right-click cancel, WASD/arrows pan, Q/E or the wheel zoom, H hide HUD, M mute, / or F1 help,
  ` debug line.
- **Tests** (130): data validation (including the exit path and that every species bites somewhere
  the surf rod reaches), the sim's rules one by one (27), the pace lessons from DESIGN.md §7 with
  floors and ceilings (8), sim purity, engine.
- **e2e**: `npm run shots` (title, first catch, deploy mode, first deploy, lure mode, a raccoon
  leaving the road, eating and the line, after wave 1, a bear worrying a terrapin with a line
  behind it, a pufferfish snatched, a ray being clawed, a raccoon escaping south, wave 8, won,
  lost), `npm run screens` (overlap audit, 11 states x 3 sizes), `npm run smoke` (real input
  only), `npm run bot` (three strategies x three seeds, played in the browser).

## Measured (DESIGN.md §7)

Wave 1: deploy-all leaks 2.62, sell-all 6.0, a midpoint lure beside a ray 3.04 → 0.77. Whole
run (40 seeds): the good bot wins 36/40 with 14.6 crates and $78 left; deploy-with-bed but no rod
11/40; deploy-all 0/40; sell-all 0/40.

## Stubbed or missing

- Construction (canals, buckets): Milestone 3; the system is an empty stub in its slot.
- Chum: Milestone 3.
- Settings, keybind screen, volume sliders: Milestone 10. Music: Milestone 9.
- Sounds for the new events (a snatch uses the old puff, a gull's gulp the steal sound).

## Known problems / watch next

- **Two pace checks sit at their edge**: the good run's 36/40 wins (floor 36) and 14.6 crates
  (ceiling 15). Any change to fishing rates, ray numbers or waves should re-run `npm test` first.
- **Sell-or-deploy is weak past the first waves** (DESIGN.md §7, IDEAS.md): a bot that sells
  just enough for the rod does no better than one that deploys everything (36/40 both); selling
  for the bed too does worse (33/40). Past the bed and the rod there is nothing to buy, so a fish
  is worth more on the board. The sinks are Milestone 3's (boats, canals, chum).
- **The rod comes late** for the good bot (wave ~6 from bounty alone), after the wave-4 bear.
- **In the frozen screenshot scripts** many effects (bolts, "!") from a batch of stepped ticks show
  at once; live play doesn't do that.

## PixelLab budget

0 generations spent this session (cap 100). Art is drawn with the pixel-art-studio skill.
