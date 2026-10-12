# Progress

What exists, what is stubbed, what is next. Updated at the end of every session.

## Status (2026-10-12, overnight session, in progress)

**Milestone 0 (2D foundation) is done** except the owner's palette pick (Apollo is provisional) and
the GitHub Pages deploy (it runs on a push, which needs the owner's yes). **Milestone 1 (the
vertical slice) is playable end to end**: title, eight waves, win and lose, restart, continue from
a save.

## What exists

- **Engine** (`src/engine/`): fixed 60 Hz loop decoupled from rAF, input with rebindable actions,
  mulberry32 rng, event queue (drops oldest), saves with versioned migrations, procedural audio
  with a few placeholder sounds (cast, catch, zap, puff, kill, steal, coin, wave, win, lose).
- **UI** (`src/ui/`): bitmap font, IMGUI kit drawn on the same canvas as the board, the overlap
  audit used by `npm run screens`.
- **Data** (`src/data/`): the shore (40 x 22 hand-written map, two zones), species, defenders,
  thieves, bait and worms, rods, waves, rules, upgrades (with fishing columns), lessons, palette.
  Every number carries a derivation naming a DESIGN.md section (enforced by `tests/data.test.ts`).
- **Sim** (`src/sim/`): `Game.ts` (state, commands with validation, the command log, replay),
  `world.ts` (tiles, the road as a path, distances, zones), one system per file in the CLAUDE.md
  order (waves, thieves, fishing, defenders, lures, construction (stub), economy, catch log,
  stats), and `bot.ts` (deploy-all, sell-all and "good" players for the pace tests and the
  browser bot).
- **Render** (`src/render/`): integer-zoom camera that fits the whole shore, ground baked into
  chunks (code-drawn; uses `src/art/tile_*.png` strips when they exist), y-sorted sprites, gulls
  above with shadows, effects from sim events (zaps, puffs, splashes, the fish leaping to the
  angler, poofs, the "!" over a lured thief), HP bars, the eating timer, the deploy overlay (lit
  tiles plus the fish's reach), the lure overlay (road in reach) and the cast range. Sprites load
  from `src/art/<name>.png + .json`; anything missing has a code placeholder.
- **App** (`src/app/`): title (two lines, Start / Continue / New season), play (top bar, live well
  with sell and deploy, shop, status line, tooltips with rates, floating numbers, toasts, three
  lesson cards), end screen with the season's numbers. Keys: 1-6 pick a fish, X sell, F deploy,
  L lure (Shift-click for more), N send the wave, Space pause, Tab speed (x1-x3), Esc or
  right-click cancel, WASD/arrows pan, Q/E or the wheel zoom, H hide HUD, ` debug line.
- **Tests** (106): data validation, the sim's rules one by one, the five pace lessons from
  DESIGN.md §7 (means over 200 seeds), sim purity, engine.
- **e2e**: `npm run shots` (the moments: title, first catch, deploy mode, first deploy, lure mode,
  a raccoon leaving the road, eating and the queue, after wave 1, a bear chewing a turtle, wave 8,
  won, lost), `npm run screens` (overlap audit, 10 states x 3 sizes), `npm run smoke` (real input
  only), `npm run bot` (three strategies x three seeds, played in the browser).

## Stubbed or missing

- Construction (canals, buckets): Milestone 3; the system is an empty stub in its slot.
- Chum (gulls have an eat time waiting for it): Milestone 3.
- Settings, keybind screen, volume sliders: Milestone 10. Music: Milestone 9.
- Art: code placeholders until the art director's sprites land in `src/art/`.

## Known problems

- **Too easy after wave 3.** In the browser bot, deploy-all wins every season and the good bot
  ends with 16-20 crates and ~$800 it can't spend. A thief that reaches the smokehouse walks
  back out through the same kill zone, so most stolen crates come back; and money has no sink
  past the rod and the worm bed, so selling stops mattering mid-run (DESIGN.md §8, question 1).
  Waiting on the critic's review before changing the model.

## PixelLab budget

0 generations spent this session (cap 100). Art is drawn with the pixel-art-studio skill.
