# Trotline — Plan

*Working title (a trotline is a long line with many baited hooks: a line of defense). Rename
freely; check itch.io, Steam and the domain before the first public build.*

## The hook

A 3D browser tower defense about **fishing an invasive run out of a lake before it spreads**.
Your "towers" are rigs: rod stations, trotlines, cast nets, traps, jug lines, an electrofishing
skiff. The "waves" are runs of invasive fish moving up the lake toward the spawning cove.
You can only see what your **sonar** sees, fish hold at **depths** that change with time,
weather and water temperature, and every rig needs **bait** flowing to it from a bait works you
build and scale. Natives swim in the same water, and catching them costs you.

3D is not decoration. Depth is the core mechanic, and the one thing 2D can't show: a
translucent lake surface with fish holding at three visible depth bands beneath it, sonar
cones sweeping through the water, a rig's line dropping to the band it's set for.

## Pillars

1. **Depth is the puzzle.** Three bands (surface, mid, bottom). Every species has a preferred
   band that shifts with time of day, fronts and temperature. Every rig fishes one band (some
   can be re-set). A rig in the wrong band catches nothing. The screen shows this.
2. **You see what sonar sees.** Fish are invisible outside sonar coverage: the outpost's
   finder, sonar buoys, the skiff's unit. Weed rafts block sonar. Vision is something you
   build and place, like range in a normal TD.
3. **Bait is a flow.** Rigs consume bait per catch and sit idle without it. Bait comes from a
   works you build (worm beds, shad traps, a lure bench) and scale, with bait *types* that
   change what a rig attracts. The works is the automation half; the rigs are the wall.
   (This is the energy-flow idea from Candlepower, re-derived for bait: capital buys rigs,
   bait decides which ones work.)
4. **Selectivity over damage.** There is no "damage". A rig has a catch rate per species per
   band per bait. Natives are bycatch: catching them costs reputation and, past a line, the
   run. The skill is choosing what you catch, not how hard you hit.
5. **Fishing is true.** Mechanics come from how fishing actually works (depth, structure,
   fronts, bait, bycatch, spoilage, ice), simplified but never faked. No fantasy fish. The
   game's authority is the owner's own time on the water.

## Currencies (four is the ceiling)

| Currency | Kind | Comes from | Spent on |
|---|---|---|---|
| Money | stock | selling catch at the dock (needs ice; fish spoil), bounty per invasive stopped | rigs, rig upgrades, bait works, buoys, ice, the skiff |
| Bait | flow, typed | the bait works | consumed per catch by rigs |
| Reputation | stock, can go negative | natives released, locals' requests | unlocks dock tiers; negative ends the run |
| Spread | the loss meter | invasives reaching the cove | at 100% the lake is lost |

## Depth, time and weather

Day/night cycle per run (one run = one season, ~12–15 waves). Fronts roll through: a cold
front pushes everything deep and slows the bite; a warm evening pulls bait to the surface.
Water temperature is one number the HUD always shows. Every species card lists its band by
condition. This is the knowledge layer: a player who fishes will know it already.

## Rigs (first set)

| Rig | Band | Shape | Bait | Note |
|---|---|---|---|---|
| Rod station | any one, re-settable | single target | yes | the Lamp: cheap, flexible |
| Trotline | bottom or mid | a line across a lane, N hooks | yes, N | passive, high throughput, bycatch-prone |
| Cast net | surface | area burst, cooldown | no | a verb as much as a rig |
| Trap | bottom | small area, slow, selective | yes | the clean option |
| Jug lines | surface, drift | move with wind | yes | cheap, chaotic |
| Sonar buoy | — | vision cone | no | the node |
| Electrofishing skiff | all, mobile | stuns an area, catches everything, including natives | no | the keeper's emergency verb, with a reputation price |

## Enemies (first set; real invasive species, invented stats)

Silver carp (surface, fast, jump when stunned), bighead carp (mid, tanky), snakehead (bottom,
hunts natives on the way: a run with snakeheads costs reputation if ignored), tilapia swarm
(many, small, surface, breed if they reach the cove: spread ×2), armored catfish / plecos
(bottom, immune to nets), zebra mussel raft (static, drifts, blocks a lane and fouls rigs),
giant salvinia mat (plant; blocks sonar, must be cleared). Natives: bass, crappie, catfish,
white bass, gar.

## Keeper verbs

Set a rig's band. Re-bait. Cast (manual single catch with a short tension minigame: optional,
one button). Run the skiff. Drop a sonar ping (one-shot full reveal, cooldown). Release a
native for reputation.

## Structure

Runs on hand-made lakes (a Texas-feeling reservoir first: flooded timber, creek channels,
a dam, a spawning cove). One run is one season. Reputation and a between-run skill tree
("lore": things a fisherman learns) persist. Lakes unlock.

## The not-list

- Not a damage-and-HP TD with fish skins: no HP bars, no DPS. Catch rates and selectivity.
- Not Candlepower in water: bait is typed and consumed per catch, not a wattage; the
  satisfaction rule does not apply.
- Not a fishing sim (no stardew-style cast-and-reel loop as the core; the manual cast is one
  verb among many).
- No fantasy or invented species. Invasives and natives are real; numbers are ours.
- No borrowed rosters, numbers or UI from any shipped game.
- Nothing past Milestone 1 before the Milestone 2 gate.

## Tech (decided — see THREEJS-NOTES.md)

TypeScript strict + Vite + **Three.js** (WebGL), pixel textures on low-poly models with a
pixelated post-process at 480×270 internal resolution, fixed 60 Hz pure sim (no three in
`sim/`), HUD on a 2D canvas overlay using the IMGUI kit from Sprocket & Sprout, Blender →
glTF via the Blender MCP, Vitest + Playwright, GitHub Pages. Reused from S&S: the engine
layer (loop, input, rng, events, audio, saves, IMGUI, font, e2e harness, deploy). Reused
from Candlepower: the doc discipline (PLAN / DESIGN / CLAUDE / STYLE / ROADMAP / DECISIONS
/ PROGRESS / IDEAS), the derivation-string rule, the pace-test rule, the gate.
