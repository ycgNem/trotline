# Trotline — Plan (2D)

*Working title kept: a trotline is one line with many hooks, which is now literally what your
defense is. Rename freely; check itch.io, Steam and the domain before the first public build.
This supersedes the 3D plan; THREEJS-NOTES.md is dead and can be deleted.*

## The hook

A top-down pixel-art tower defense where **you don't buy towers, you catch them**. A fishing
village on a shore. Hungry thieves (gulls, raccoons, otters, herons, bears, pelicans, poachers)
come down the shore road to raid the smokehouse where your season's catch is stored. You stand
on the dock with a rod. What you catch goes in the live well, and every fish in it is a choice:
**sell it for money, or put it in the water beside the road as a defender.** Pufferfish
poison whatever eats them, electric rays shock, terrapins hold up the road, catfish slap, gar
pierce. Bait does double duty:
it decides what you catch, and cast onto the road it lures thieves (they're hungry) into stalls,
traps and kill zones. A fleet of boats off to the side fishes the lake for you and, later,
fights from the water. The map is water and shore, and you dig canals so fish can defend
further inland.

Typical TD shape (a road, waves, HP, damage, upgrades, money per kill), with fishing as the
tower shop, the economy, the pathing control and the map.

## Pillars

1. **Every fish is money or a tower.** The live well is the core decision. Selling funds bait,
   rods, boats and canals; deploying stops the wave. Nothing is bought from a menu that could
   have been caught.
2. **Fishing is true (and funny).** Species hold at depths and bite at times; bait matches
   species; rods have cast range and line strength; boats fish zones. Simplified, never faked.
   Defenders are real animals doing cartoonish versions of real things. No fantasy species.
3. **Bait moves trouble.** Thieves are animals that want food. Bait on the road pulls them off
   their line toward it, stalls them while they eat, and sorts them (worms pull raccoons, chum
   pulls gulls and pelicans). You decide where the fight happens; the fish decide how it goes.
4. **Water is the build space.** Fish defend from water. Shallows, pools and canals beside the
   road are where towers can go, so the map is a fishing map first and a TD map second, and
   digging a canal is a tower-placement decision. (Buckets come later: a fish on land, on a
   timer.)
5. **Boats are the factory.** The fleet automates catching (rowboats, skiffs, a trawler),
   supplies bait (shad traps, chum boats) and, with upgrades, fights (harpoon skiffs on the
   water lanes). Scaling the fleet is the automation half.

## Currencies (four is the ceiling)

| Currency | Kind | Comes from | Spent on |
|---|---|---|---|
| Money | stock | selling fish at market, bounty per thief stopped | bait, rod tiers, boats, docks, canals, buckets, smokehouse upgrades |
| Fish (the live well) | typed stock, capped | rod, boats | deploy as defender (one each) or sell |
| Bait | typed flow | bait works, chum boats, a little from kills (scraps) | each cast consumes one; road lures consume one |
| Crates | the loss meter | the season's stored catch | thieves steal them on a leak; at 0 the run ends |

## The two models (decided)

- **Thieves have HP and defenders deal damage.** Normal TD arithmetic.
- **Fishing is catch rates, never HP.** A rod or boat in a zone rolls per tick against a rate
  (per species × bait × depth/time × rod tier). A fish is caught or it isn't. No reeling
  minigame as the core (an optional one-button tension verb for rare fish only).

## Defenders (first set — real species, cartoon jobs)

| Fish | Job | Where | Note |
|---|---|---|---|
| Pufferfish | poison: the first thief beside it snatches it, retches and sickens; one use | water or bucket | the cheap first catch |
| Electric ray | shock: chains to 3 thieves within 3 tiles, until its charge is spent for the wave | water only | the DPS backbone, wants water near the road |
| Terrapin | bait with a shell: walkers stop to worry it one at a time, only a bear cracks it | road (it walks) | the stall; slow to catch, by the reeds |

(2026-10-12: the first three rows were re-derived after the critic's review. A pufferfish that
exploded and a turtle every thief chewed at once were Plants vs Zombies' Potato Mine and
Wall-nut with fish sprites, and American eels aren't electric. See `DECISIONS.md`.)
| Catfish | slap: single target, heavy | water, bottom bait | the big-hitter, needs line strength |
| Gar | pierce: line attack along the road | water | needs cast range to catch |
| Bass | jump: leaps at a thief carrying a crate, makes it drop it | water | the recovery tool |

Each defender has a stat line that is the species' real traits turned up: pufferfish inflate,
electric rays shock, terrapins are armored, gar are long. A fish out of water (bucket) runs a
timer; back in water it rests. Defenders can be eaten: herons snipe them, pelicans swallow
them, otters raid water tiles. Losing a defender hurts because it was a fish you could have sold.

## Thieves (first set)

Gull (fast, flies over turtles, low HP, 1 crate), raccoon (medium, 1 crate, loves worms),
otter (swims: takes the water lanes, attacks defenders), heron (ranged, picks off defenders in
water), bear (tank, 5 crates, bait holds it longest), pelican (swallows a defender whole, then
is slow), poacher (human, cuts a line, immune to bait). Bosses later: the Old Bear, the
Pelican Flock, a game warden who confiscates (a joke boss).

## Fishing (the real part)

Zones: dock shallows, the point, the channel, the flats, open water. Each zone has species by
depth band (surface, mid, bottom) and by time of day (dawn/dusk bite), and a bait table. Rod:
cast range (which zones you reach from the dock), line strength (max fish size), reel (catch
rate). Boats reach zones the rod can't and fish on their own. Bait works turns money or scraps
into bait types. Weather: a front slows the bite for a wave; rain fills a dry pool.

## Depth: three trees and the verbs

- **Rod tree** (money): cast range, line strength, reel speed, a second rod, a net.
- **Fleet and works** (money): boats, docks, bait works, canals, buckets, the smokehouse.
- **Catch log** (catching): the first catch of each species unlocks it as a defender and its
  entry teaches its depth/bait; variants (big, rare, golden) with stronger stats.
- **Lore** (between runs): things a fisherman learns, as rule changes (a bigger live well,
  bait lures last longer, a rowboat from day one). No flat stat boosts.
- **Verbs**: cast (fish), cast bait (lure thieves), deploy, sell, dig, run the skiff, the
  tension pull on rare fish.

Rule: **every upgrade node has a fishing column.** A node that doesn't touch what, where or how
you catch is rejected.

## Structure

Runs on hand-made shores (a reservoir first), a run is a season of 12–15 waves with the catch
log and lore persisting. Call the next wave early for bonus money. Day/night per wave.

## The not-list

- Not Plants vs Zombies with fish: no lanes, no sun; a road with luring, a water map, catch
  rates, sell-or-deploy.
- Not a fishing sim: catching is a rate, not a minigame; the one tension verb is for rare fish.
- Not Candlepower: bait is typed and consumed per cast, not a wattage; no satisfaction rule.
- Not Kingdom Rush / Bloons towers: no tower that isn't an animal you caught; no fixed path
  mazing (luring moves thieves).
- No fantasy species; no borrowed rosters, numbers or UI from any shipped game.
- Nothing past Milestone 1 before the Milestone 2 gate.

## Tech (decided)

Same as Sprocket & Sprout and Candlepower: TypeScript strict + Vite, one Canvas 2D at 16 px
tiles with integer zoom, fixed 60 Hz pure sim, IMGUI canvas UI with the bitmap font, Web Audio,
Vitest + Playwright, GitHub Pages. Engine layer extracted from S&S; nothing from its `sim/`,
`data/` or `render/art`. Art through PixelLab with a new palette (not Resurrect 64), decided by
a six-sprite test: water at three depths, a gull, a raccoon, a pufferfish, an eel and the dock.
