# Trotline — Design model

Every number derives from this file. The numbers below are **starting hypotheses for the
vertical slice**, chosen from the model and tuned by play and by the pace tests, never by
looking up what another game uses. When you change a number, write the new derivation here.

## 1. Units

- Tick 1/60 s. Distance in tiles (16 px). Speed in tiles/s.
- **Thieves**: HP in points; defenders deal damage in points. Standard.
- **Fishing**: a *rate* in catches per minute. Each tick, a rod or boat fishing a zone rolls
  `rate / 3600` for each species it can catch; the first success catches that fish. Rates
  multiply: `rate = zoneBase(species, zone) × habitat(where the line sits) × baitMatch × reel`.
- Money is an integer. Sell price per species is fixed per run (±10% market drift later).

## 2. The loop, per wave

Build phase (60 s before wave 1, 45 s after, or until you send the wave): fish from the dock,
sell or deploy from the live well, place bait lures, buy. Wave phase: thieves walk the road;
defenders act; bait lures pull; fishing continues at half rate (you're distracted). Leaks
steal crates. Between waves fish heal a little (§4) and lures spoil (§6).

**Sending a wave early pays nothing** (2026-10-12, the critic's third review). It paid a
quarter of the next wave's bounty for the time left, which is Kingdom Rush's early-call gold,
and at $1-6 against ~1.5 fish of fishing it was never worth taking anyway. "Send wave" (N) stays,
for when the well is full and you are ready.

## 3. Fishing (slice)

The slice's shore is a brackish back bay on the Gulf (§10). Zones: **the shallows** (every
shallow tile in the bay; the tier-1 cast reaches the bowl around the dock) and **the point**
(open sand off the peninsula's tip, toward the pass; tier 2 only). Bait: **worm** only (chum
arrives in Milestone 3).

| Species | Real animal | Bay /min | Point /min | By the dock | By the reeds | Open sand | Size | Sell |
|---|---|---|---|---|---|---|---|---|
| Pufferfish | least puffer | 2.0 | — | ×1.3 | ×0.8 | ×0.8 | small | 8 |
| Electric ray | lesser electric ray | 0.4 | 2.5 | ×0.5 | ×0.5 | ×1 | medium | 15 |
| Terrapin | Mississippi diamondback terrapin | 1.0 | — | none | ×1 | none | medium | 12 |

**Where the line sits matters.** A water tile is "by the dock" within a tile (Chebyshev) of the
dock's pilings, "by the reeds" within a tile of reeds, and open sand otherwise. Least puffers
crowd pilings to pick bait off them; lesser electric rays lie buried in open sand and suck
worms out of it; diamondback terrapins live on the marsh edge, never under a dock. So **the dock
means puffers, the reeds terrapins, the point rays** (2026-10-12, the critic's third review: with
one "structure" multiplier for both, the reeds tile east of the dock had the dock's puffers and
the terrapins too, and the line sat there 74% of a run). Terrapins are common there (1.0 a
minute): diamondbacks are abundant in salt marsh and take a worm readily. The tooltip over any
water tile names its habitat and shows its rates.

**The ray is a pass fish** (2026-10-12, the critics' second and third reviews): lesser electric
rays live on high-salinity sand by passes and surf beaches and are only an occasional catch on a
brackish flat. The first model had them biting at 1.95/min in the bay, more often than the
puffer; the second at 0.8. Now: **0.4 in the bay** (a stray) and **2.5 at the point**. Before the
surf rod a player has the dawn ray and what strays in; the rod is the way to rays in numbers,
which is its job (§7, money).

Rod tier 1: reel ×1.0, a 9-tile cast (§10), medium line. Tier 2 (the surf rod, **50**): a
14-tile cast that reaches the point, large line, reel ×1.5. A terrapin is medium: it needs the
marsh edge, not a heavy line, and the reeds east of the dock are inside the tier-1 cast. Live
well: 6 slots. Every catch takes the worm off the hook. **Starting worms: 8**: the first build
phase of fishing and a lure or two. **The worm bed** (40, bought once) makes a worm every **30 s**
up to 12; the bait shop sells a pack of 3 for **8** (it was 5: at 5 a worm on two kill zones every
wave cost nothing and money piled up, the gate review), so a player with 8 to spend or a fish
to sell is never stuck (one with neither waits on bounties: an opening that buys the rod with its
last dollars and its last worm can stall there). 2 worms a
minute is about half what a tier-2 line at the point uses (3.75/min) before any lures, so
**bait is a cost every build** (2026-10-12, the critic's third review: at a worm every 15 s money
stopped mattering once the rod and the bed were bought; "selling funds bait" is pillar 1).

**Derived** (catches a minute):

| Where | Tier 1 | Tier 2 (×1.5) |
|---|---|---|
| Open sand in the bay | 1.6 puffers + 0.4 rays = 2.0 | 3.0 |
| By the dock | 2.6 puffers + 0.2 rays = 2.8 | 4.2 |
| By the reeds | 1.6 puffers + 0.2 rays + 1.0 terrapins = 2.8 | 4.2 (1.5 terrapins) |
| The point | out of reach | 3.75 rays |

So the first build (60 s, tier 1) by the dock lands ~2.6 puffers and a stray ray now and then;
with the surf rod a 45 s build at the point lands ~2.8 rays. The choice of tile is a choice of
defender: puffers by the dock (to sell, and for the gull flocks), terrapins at the reeds, rays at
the point once you can reach it.

**The run starts with a ray in the live well**, "caught at dawn" (2026-10-12, the critic's
second review): at 1.5 rays a minute the old first build caught no ray 23% of the time and no
fish at all 7%, and three of the four losses in the critic's 40 seeds were those openings
snowballing. The dawn ray makes wave 1's lessons (§7) reachable every run; the 60 s first build
gives the player time to read the board before anything walks.

**The eel became the electric ray (2026-10-12).** American eels are not electric (the
critic: "fishing has to be true"); a zapper that is a real Gulf fish is the lesser electric ray
(*Narcine bancroftii*), which lives on shallow sand and really does shock.

## 4. Defenders (slice)

| Fish | Place on | HP | What it does | Numbers |
|---|---|---|---|---|
| Pufferfish | shallow tile ≤ 1 from road | 10 | eaten by the first thief within 1 tile, which stands paralysed and sickening; one use | 24 poison over 3 s, 4 s paralysis |
| Electric ray | shallow tile ≤ 2 from road | 20 | shocks one walker within 3 tiles, staying on it while it is in reach; never a gull in the air | 6 damage/s in 0.5 s pulses |
| Terrapin | the road itself | 100 | raccoons stop and worry it one at a time while the rest wait in line; a bear shoves it aside; gulls fly over | raccoon 4 s, gnawing 1.5 HP/s; bear 3 s, no harm |

**Re-derived from the animals.** The first build's pufferfish *exploded* when a thief came
near and the turtle was a *wall* every thief chewed at once: Plants vs Zombies' Potato Mine
and Wall-nut with fish sprites (DECISIONS.md flagged both). The first re-derivation still left
the puffer in the Potato Mine's role (one use, kills exactly one basic walker) and gave the ray
a chain that was Kingdom Rush's Tesla tower. The second (2026-10-12):

- **Pufferfish: poison you get eaten for.** A puffer's defense is tetrodotoxin, which
  *paralyses*; the thief has to eat it. The first thief within a tile (Chebyshev; gulls too,
  they pick fish at the surface) snatches it, stands **paralysed 4 s** with the fish in its
  mouth and takes **24 poison over 3 s**. 24 kills a gull (20 HP). It does not kill a raccoon
  (40) on its own: it holds one still for 4 s, and inside a ray's reach that is 24 more damage,
  48 in all. A puffer is what you put *beside* a ray, and what you fish for when gulls come.
  A thief already paralysed can't take a second one, nor one on its way out.
- **Gulls come in flocks, and a puffer brings a flock down** (2026-10-12, the critic's third
  review: one puffer per gull made every gull wave a count of puffers; re-derived at the re-gate
  review, which read the first version, an alarm call turning the flock back, as the Potato
  Mine: one use, then an effect in a radius that ends the threat). Gulls arrive three at a time,
  0.3 s apart. Laughing gulls are kleptoparasites: they rob each other of food. The gull that
  snatches a pufferfish drops onto the water with it, retching; every flockmate within 2.5
  tiles lands on the water round it for **6 s** trying to take the fish, then flies on along
  the road. Nothing is killed but the snatcher; what the puffer buys is **two gulls sitting on
  the water for 6 s, where a ray reaches them** (a shock travels through water, below). A ray
  deals 6 a second and stays on the nearest (often the snatcher first, already dying): one ray
  kills one of the two, two rays both. A puffer alone delays a flock; a puffer between two rays
  brings it down (§7, measured). The answer to gulls is the same pair as the answer to
  raccoons, a puffer beside rays, placed where the flock passes. 6 s, not 4: at 4 s two rays
  killed only one more gull a flock. The eater sits on the puffer's tile 0.3 out from the road;
  its flockmates 0.85 tile either side along the shore and 0.3 further out (a shallow V; any spot
  on land moves out onto the water). At 0.7 in a row three 16 px gulls drew as one smear; at a
  full tile apart they sat out of the rays' reach often enough to cost the strong bot 4 wins.
  The critic's read at the gate review: the puffer is now a decoy that moves a flock into the
  rays' water, the same verb as a worm for raccoons (pillar 3), not a mine.
- **Electric ray: one shock at a time, through water.** No chain: a discharge goes into what it
  touches. A ray picks the nearest walker within 3 tiles and **stays on it while it is in
  reach**; switching every pulse to whichever thief stepped closest spread the damage over a
  whole line and killed nothing. **A shock travels only through water** (2026-10-12, the
  critic's third review: a lesser electric ray's 14-37 V works on contact in water, and the
  model shocked raccoons on a dry road three tiles off): the thief must stand on wet ground,
  water or land touching it. 27 of the road's 39 tiles run along the water's edge; the sand
  strip by the dock (road 11-13), the dock's foot, the bend's corner and the last stretch to the
  smokehouse are dry. Gulls are in the air, never wet, so the puffer is the gull answer. The charge (140 damage a
  wave, then spent) is gone: the critic measured 140, 200 and infinite charge at the same
  36-37/40, so it did not bind; wear (below) does the work it was meant to.
- **Terrapin: the raccoon's prey.** Raccoons are the diamondback terrapin's real predator.
  Each raccoon that reaches one stops and worries it **4 s**, gnawing **1.5 HP/s** (6 HP a
  raccoon, 17 raccoons to a shell), while the rest wait in line behind it. A bear doesn't eat
  terrapins: it **shoves it aside in 3 s** and walks on. Gulls fly over. A terrapin is a lure
  for raccoons that wears down slowly, and a short check on a bear.

**Fish wear out** (2026-10-12, the critic's second review). The first model healed 1 HP/s
between waves, so a 20 HP ray came back whole every build and a deployed fish was stock that
only grew: selling was never right. Now:

- **Rest**: **0.1 HP/s** during the build (4.5 HP a 45 s build, under a quarter of a ray).
- **Claws**: a walking raccoon or bear claws at a fish within 1 tile (Chebyshev) for
  **5 damage/s** as it passes. A raccoon at 1.2 t/s is in reach of a ray one tile out for
  ~2 tiles of road, 1.7 s, 8.3 damage: three raccoons eat it. Two tiles out it is safe from
  walkers.
- **Wading**: a thief standing in a line (at a lure or a terrapin) wades out and feels for
  food: a raccoon reaches **2 tiles at 1 damage/s**, a bear 1 tile at 5/s. A ray two tiles out
  beside a lure's line loses ~1 HP for every second a raccoon stands there.
- Busy thieves (eating, worrying) and thieves leaving don't claw; gulls never claw; pufferfish
  are snatched whole, not clawed.

So luring beside your rays costs ray HP, a clawed ray needs replacing by fishing, and a fish
sold is a fish not lost: every build asks "replace it or sell it". **Wading was cut from the
critic's proposal** (any stopped thief clawing at the full 5/s within 2 tiles): measured, a
lure beside a ray then killed the ray in ~4 s and the luring lesson fell from a 2.6-leak cut to
0.7. At 1/s for raccoons the lure is still the best first move and still costs something.

"Within 1 tile" is Chebyshev; distances to the road are Chebyshev; a water tile means a
*shallow* tile (mid and deep water is too deep to set a fish in; reeds are too thick).
Variants (big, rare, golden) arrive with the catch log in Milestone 4: ×1.5 stats, rarer rates.

## 5. Thieves (slice)

| Thief | Real animal | HP | Speed | Crates | Bounty | Length | Behavior |
|---|---|---|---|---|---|---|---|
| Gull | laughing gull | 20 | 2.5 t/s | 1 | 1 | 1 | flocks of 3; flies: over terrapins, out of a ray's reach; swallows a worm within 2 tiles whole; lands on the water 6 s round a flockmate with a pufferfish; never claws |
| Raccoon | raccoon | 40 | 1.2 t/s | 1 | 1 | 1.2 | pulled by worms within 4 tiles, eats 6 s; worries terrapins; claws 1 tile walking, wades 2 tiles in a line |
| Bear | Louisiana black bear | 160 | 0.7 t/s | 5 | 4 | 1.6 | ignores worms; shoves terrapins aside; claws 1 tile, 5/s, walking or waiting |

**Bounty is 1 per 40 HP, at least 1.** Every thief stopped over the 8 waves would pay 166.
Against 30 to start, 90 of shop (bed 40, rod 50) and bait every build, selling fish to buy the
rod sooner is the opening's real trade (§7): bounties come too late for it.

**Bears come for fish, not worms** (2026-10-12, the critic: a worm holding a bear 10 s was
false). Bears aren't pulled by worms, and a terrapin holds one 3 s. Bear HP went 200 → 160
(four raccoons) because a bear that no lure or shell can hold has to be killed walking past
rays: at 0.7 t/s a ray two tiles out from a straight has 4.47 tiles of road in reach, 6.4 s,
**39 damage a pass** (measured, 0.5 s pulses). Four passes are 156, short of 160: a bear needs
**five ray-passes, or four and a puffer**. Three passes and a puffer kill it (165) only if the
puffer sits in a ray's reach, so its 4 s of paralysis is shocked too; elsewhere it is 141 and
the bear walks on. The best pool ray (§10) does 63 a pass.

**Lines are spaced by body length** (2026-10-12): the animals in a line stand their lengths
apart (half of each, summed), so a bear and three raccoons read as four animals, not a
centipede. At a lure the eater stands on the lure; at a terrapin the first in line stands half
a tile plus half its length back from the shell.

Smokehouse starts with **20 crates**. At 0 the run ends. **A thief that takes crates leaves
another way**: walkers go south from the smokehouse door down the woods trail (x 34, drawn as
a dirt track) and off the map; gulls fly straight north over the bay. A thief stopped before it
gets away puts its crates back; no slot reaches the trail, so mostly that means one already
poisoned or half-dead as it reached the door. The end screen counts recovered crates only when
there are any.

Road length 39 tiles. Spawns 1.5 s apart unless a wave says otherwise; a gull flock's three
0.3 s apart, the wave's gap between flocks. Slice waves (2026-10-12, retuned at the re-gate
review against the stronger reference bot that plays the critic's line, §7):

| Wave | Composition (in spawn order) | Gap | Total HP | Bounty |
|---|---|---|---|---|
| 1 | 5 Raccoon | 1.5 s | 200 | 5 |
| 2 | 7 Raccoon | 1.5 s | 280 | 7 |
| 3 | 6 Gull (2 flocks) | 1.2 s | 120 | 6 |
| 4 | 10 Raccoon, 1 Bear | 1.2 s | 560 | 14 |
| 5 | 12 Gull (4 flocks), 12 Raccoon | 0.75 s | 720 | 24 |
| 6 | 18 Raccoon, 2 Bear | 0.65 s | 1,040 | 26 |
| 7 | 15 Gull (5 flocks), 20 Raccoon, 1 Bear | 0.55 s | 1,260 | 39 |
| 8 | 9 Gull (3 flocks), 22 Raccoon, 3 Bear | 0.45 s | 1,540 | 43 |

Wave 1 is five raccoons, the first lessons' wave: the dawn ray, two or three puffers and one
worm a tile short of the ray stop it (§7). The first bear comes in wave 4; wave 6's two bears are
the mid-run peak and wave 8 the last. Waves 4-8 grew by about half at the re-gate review, and
their spawns came closer: the critic's line (the dawn ray inside the rod's cast, the rod and no
bed, rays before terrapins) won 96-99 of 100 against the old ones. More raccoons barely moved
the reference bot (its mid-game holds; what loses runs is a bad opening) and paid it more bounty
than it could spend; closer spawns press without paying. **Wave 8 leans on bears** (the gate
review): with five flocks in waves 7 and 8 back to back, the finale was decided by how many
puffers bit in one 45 s build (2.9 expected, five needed); three flocks and a third bear make it
a question of where the rays are. The late waves cost the reference bot 6.6-8.5 crates a run,
about half in wave 8. **Bears stay last in their waves**: the critic proposed
bears first so a bear holds a line of raccoons behind it at a terrapin; with the bear's 3 s
shove that line no longer forms, and measured, bears-first won 22/40 against 32/40.

Starting money: **30**. Starting live well: one ray (§3). The first 60 s is fishing.

## 6. Bait lures (slice)

Cast a worm onto any road tile within the rod's cast. **Raccoons** within 4 tiles leave the
road for it, eat 6 s, then rejoin the road where they left it. One lure feeds one raccoon at a
time; the rest stand in line back along the road, spaced by length (§5), wading for fish (§4).
That's the stall. A lure costs one worm, so luring competes with fishing. Bears ignore worms.

**A lure holds 36 thief-seconds of eating**: enough for each of wave 1's raccoons to eat 6 s. Thieves already fed by a lure aren't pulled by it
again; a lure that runs out sends its line back to the road.

**Gulls swallow worms**: gulls follow ploughs for worms. A gull within 2 tiles of a worm swoops
on it and swallows the whole lure, line or no line. **A lure spoils when the wave ends** (worms
left in the sun): lures are cast for a wave, at the right moment, not placed once for the run.
Together: in the gull-led waves (5, 7, 8) a worm cast before the gulls pass is a worm thrown
away; cast it once they're through, ahead of the raccoons. Pull radii now differ by thief (gull
2, raccoon 4, bear none), so where you cast decides who stops.

**Where the worm lands decides what it costs** (2026-10-12, the balance audit). The eater
stands on the worm; the line waits behind it, back along the road toward where thieves come
from, 1.2 tiles a raccoon. A worm right beside a ray (two tiles out) puts the first raccoon in
line within its 2-tile wading reach for the whole wave; a worm one or two tiles short of the
ray, on the side the thieves come from, puts the eater in the ray's reach (2.2 tiles) and the
line out of wading reach. **Measured** (wave 1, only the dawn ray at (19,10), no other fish):
a worm at x 17 or 18 stops **all five** raccoons and the ray keeps all 20 HP; at x 19, beside
it, the line wades the ray to death and **2** get through; at x 20-22, 3-4; at x 16 (the dock's
foot, dry ground) the ray can't shock the eater and all five get through. In
lure mode, hovering a road tile shows where the line would stand, frames in red the fish it
could wade at and in gold the rays that reach the eater, and the status line counts both.
That is the lure as control: one worm, placed by the tile, decides a wave. Over a whole run,
with rays in numbers and a worm down every wave, placing it by the preview rather than beside
the most rays is worth ~1 win in 100: the lesson is the first waves'.

**A queue, not a crowd** (2026-10-12, tested on the critic's third review). The critic proposed
that everyone pulled eat at once, so a worm only pays inside a ray's reach. Measured with the
strong bot over 200 seeds: the queue wins 85; a crowd that wades wins 2 (worse than no worms,
15: the whole crowd wades the rays to death); a crowd that doesn't wade, with 60 thief-seconds of
food, wins 17. A crowd eats a worm in a few seconds, and one ray shocks one thief at a time, so
the stall is gone. The queue stays: a worm stalls raccoons one at a time where you put it, and
where you put it decides who shocks them and what the line wades at (above).

**A meal is taken when it starts, and a line never runs off the map** (2026-10-12, the re-gate
review). The first lure took food as it was eaten and pulled whenever a raccoon was near, so a
worm by the spawn grew a line back past road index 0, and a worm could feed a meal it no longer
held. Now a raccoon takes its whole meal (6 s, or what is left) the moment it starts eating;
the lure stays on the road until that meal is done, then goes; and a lure pulls no one whose
place in line would stand past the start of the road. The lure-mode preview counts the
raccoons still coming to that tile (the next wave's in the build; those behind it and those
still to spawn in a wave), up to 16, so the line it draws is the line that will form. **A
terrapin's line stops at the start of the road too** (the gate review: a terrapin at road tile 4
queued raccoons fourteen tiles off the map, sixteen off the board at once); the raccoons that
can't join it walk round it, and the preview draws only the places on the road.

The lure's reach is the rod's cast: tier 1 reaches road tiles 9 to 23 (15 tiles around the
dock's foot, §10).

## 7. Derived checks (these become pace tests)

**The reference player is strong** (2026-10-12, the critic's third review). The pace tests'
"good" bot used to buy a worm pack every time it ran dry, so it never saved for the bed, and a
simple policy (sell puffers until the rod and the bed are bought, deploy everything, one worm a
wave) beat it, winning 98 of 100 with $92 unspent. The good bot is now that player and more: it
sells puffers until the rod and then the bed are bought (except in a gull wave, and keeping the
ones the next gull wave's flocks need), fishes the dock for puffers while it invests, the reeds
for terrapins, the point for rays; keeps four worms in the can from the bait shop once invested
and a worm on the road whenever raccoons are coming, cast where rays reach the eater and the
line waits clear of them; places terrapins where rays shock their line; keeps rays two tiles out.
Measured on the old numbers it won 191 of 200: the third review's model changes are what made the
slice a game for it again.

**The reference player plays the critic's line** (2026-10-12, the re-gate review). The critic
found a simpler line that beat that bot, 96-99 of 100: the dawn ray goes inside the tier-1
rod's cast (so the first worms land in its reach), puffers are sold until the rod and no
further (the bed is skipped; packs are bought), and rays come before terrapins. The good bot now
plays it: it sells puffers until the rod only; once the rod is bought it keeps four worms from
the bait shop (and digs the bed when it has the money, which measures the same as never: below);
it scores ray tiles by the wet road they shock, double where the rod can cast a worm; it fishes
terrapins only once **eight** rays are down, and never sets one where the line waiting behind
it would wade out to a ray. **At the gate review it keeps two worms on the road** (on two
kill zones at least 5 road tiles apart, six worms in the can): the critic's "lure2" line beat the
one-worm bot by 8-22 wins, because in a two-ray zone each eater dies in 3.3 s and a worm returns
its price in bounty several times over. With packs at 8 that is where the money goes. Two more
things a strong player does: it fishes puffers for the
gull flocks only once four rays are down (a puffer alone kills only the gull that eats it, §4),
and with an empty can and less than a pack's price it sells a fish for bait rather than stop
fishing (seed 1 lost a run to that: the rod bought down to $4 with one worm, then nothing
caught for three waves). Against the old waves it won 97 of 100 with 17.4 crates: waves 4-8 grew
(§5) until it wins 80-86.

**Two openings** (the gate review). The rod is the build order: without it no run is won. But
how to reach it is a choice: deploy the dawn ray and sell puffers (the reference), or sell the
dawn ray at once ($15) with a puffer or two and have the rod in the first half-minute, paying
~0.5 crates in wave 1 for rays at the point a build early. Measured, the two are within 6 wins of
each other in every seed set (78-90 against 80-86); the first hint names the fork ("Deploy the
ray caught at dawn, or sell it toward the surf rod") and a pace test keeps them within 8.

**Wave 1, the intended lesson: deploy, don't sell.** A ray two tiles from a straight has 4.47
tiles of road in reach: a raccoon at 1.2 t/s spends 3.7 s there, 24 damage, so **a lone ray
kills nothing** (40 HP). A puffer beside it holds one raccoon 4 s in reach: 24 poison and the
rest of its HP shocked, a kill. Fish stop raccoons roughly one each, and only together. The
deploy-all bot fishes the dock (2.8 a minute) and meets wave 1 with the dawn ray and ~2.6
puffers. **Measured** (200 seeds): deploy-all leaks **3.0** of 5; selling everything leaks all 5
(structural: nothing is deployed; the comparison teaches).

**Wave 1, the luring lesson.** One worm at the road's midpoint beside the ray stalls each
raccoon 6 s in its reach (36 damage) and lines the others up. **Measured** (200 seeds, every one
with the dawn ray): **3.42 → 0.06 leaks** with the lure, a cut of **3.36**: the best move of the
first minute. Beside the ray it costs the ray; a tile or two short of it costs nothing (§6).

**Wave 3, the gull flocks.** Six gulls in two flocks. Rays can't shock them in the air,
terrapins don't stop them, a worm is swallowed; a puffer kills the gull that takes it and
lands its flock on the water round it for 6 s, where rays in reach shock them (§4).
**Measured** (20 seeds, straight to wave 3, no line cast: structural): three terrapins leak
**all 6**; four rays spread along the road **all 6**; two puffers alone **4** (each kills its
eater; the flock lands, then flies on); two puffers with those four rays **3** (the rays are
mostly out of reach of where the flocks land); a puffer beside one ray, for each flock, **2**; a
puffer between two rays, for each flock, **none**. With 4 s on the water a pair of rays killed
only one more gull a flock (2 leaked): 6 s is what lets a puffer and two rays bring a flock
down, so a gull wave asks for a puffer and two rays where each flock passes, the same pair the
raccoons ask for.
The HUD's wave tip shows the next two waves, so a player can fish the dock for the flocks a
wave ahead; the good bot holds puffers through the raccoon wave before.

**Wave 4, the bear.** 160 HP at 0.7 t/s, not lured, held 3 s by a terrapin (18 more damage from
a ray in reach). It needs five ray-passes on wet road, or four and a puffer (§5); walking past
a ray one tile out it claws at 5/s for ~2.9 s, 14 damage, most of a ray.

**A terrapin holds the line, at a price.** Wave 6 (18 raccoons and two bears) past four rays two
tiles out: 18 of 20 leak; with a terrapin between them (16,12), **5**, but its line of raccoons,
twelve long, wades two rays to death. (The pace test said 18 to 2 until the gate review: the
bot had set that terrapin at road tile 6, and its line ran off the map, holding the wave
off-board; a terrapin's line now stops at the start of the road like a lure's.) Over a whole run a
terrapin is worth its fishing time only once the rays are down: fished after four rays it cost
four rays by wave 7 and the bot did better without (re-gate review); fished after **eight**,
and never set where its line wades a ray, the same bot without terrapins loses **0.7-2.4 more
crates** in waves 5-8 at about the same wins. For the bot that casts no worms they cost wins
(44-51 against 51-64 without), so they are not a substitute for bait: they are an addition to it
in the late waves, worth a crate, not a win.

**Money and selling.** The rod (50) is the investment; bait is the running cost (packs of 3
for 8, or a worm every 30 s from the bed). With two worms on the road every wave, bait is what
selling pays for after the rod: the good bot sells ~5.9 fish a run (3.4 at the old price with one
worm) and ends with $21-22 (was $50-55). **The bed buys nothing a strong player needs**: the same
bot that never digs it wins the same runs and ends ~$14 richer. A third rod or a job for the bed
is the owner's call (IDEAS.md).

**Measured over five 100-seed sets** (seeds 1-500, the gate review's waves, prices and bot;
every threshold clears the worst set):

| Bot | Wins per 100 (five sets) | Crates, won runs | Stolen, waves 5-8 | Fish lost | Unspent |
|---|---|---|---|---|---|
| good (two worms on the road) | 80, 83, 83, 86, 84 | 12.6-14.5 | 6.6-8.5 | 1.2-1.9 | $21-22 |
| good, selling the dawn ray | 78, 81, 84, 86, 90 | 13.4-14.9 | 5.4-7.1 | 1.6-2.0 | $21-24 |
| good, one worm on the road | 67, 61, 75, 73, 74 | 13.9-15.9 | 7.4-10.7 | 1.3-2.0 | $21-27 |
| good, worms cast beside the most rays | 77, 81, 81, 83, 84 | 13.0-14.2 | 6.9-8.4 | 1.8-2.3 | $22-24 |
| good, never digging the bed | 80, 83, 83, 86, 84 | 12.6-14.5 | 6.6-8.5 | 1.3-1.9 | $35-37 |
| good, no terrapins | 73, 82, 83, 85, 82 | 11.5-13.8 | 7.6-9.7 | 0.8-1.4 | $18-21 |
| good, no worms cast | 45, 50, 51, 44, 48 | 11.5-13.7 | 5.5-7.0 | 1.1-1.6 | $30-35 |
| good, no worms cast, no terrapins | 56, 64, 61, 51, 61 | 11.1-13.7 | 4.3-6.2 | 0 | $34-39 |
| good, never selling | 0, 0, 0, 0, 0 | - | 11.0-12.1 | 0.1-0.2 | $30-33 |
| good, no rod | 0, 0, 1, 2, 0 | - | 14.7-15.1 | 0.5-0.6 | $22-24 |

The rod is the run (no rod: 0-2 wins) and selling is how it comes in time (never selling: none);
worms on the road are worth 32-42 wins (wave 1 alone: 3.2-3.8 crates without one, none with) and
a second worm 8-22 more; terrapins 0.7-2.4 crates in the late waves; the bed nothing. The
no-worms bot loses fewer crates in waves 5-8 than the good bot because it has lost the runs that
would have reached them with crates to lose. Crates stolen per wave (good, seeds 1-500): 0.0,
0.1, 0.5, 0.5, 0.9, 2.1, 0.7, 3.6: wave 6's bears and the finale are the peaks. Deploy-all and
sell-all win 0/20.

Pace tests assert (floors say the lesson is there; ceilings say the game hasn't gone soft;
comparisons take one thing away from the same bot):

- wave 1: deploy-all leaks ≤ 70% of the raccoons; sell-all leaks every one; one midpoint lure
  cuts leaks by ≥ 2;
- §6: a worm a tile short of the dawn ray stops all but ≤ 1 and leaves the ray ≥ 15 HP; beside
  it, the ray is waded to death and 2 more leak;
- wave 3: three terrapins and four rays leak every gull; two puffers alone leak ≥ 4; a puffer
  between two rays for each flock leaks ≤ 1;
- a terrapin between four rays cuts wave 6's leaks by ≥ 5 (measured: 18 of 20 to 5);
- the good run wins 65-90 of 100 (winnable, not solved); won runs end with 8-16 crates; wave 1
  costs ≤ 2.5 crates and waves 5-8 ≥ 1.5; ≤ $60 unspent; ≥ 1 fish lost a run;
- the never-selling bot wins ≤ good − 10; the no-rod bot ≤ good − 30; the no-worms bot
  ≤ good − 25; the no-terrapins bot loses ≥ 0.5 crates more in waves 5-8; selling the dawn ray
  wins within 8 of deploying it;
- sell-all and deploy-all never win.

The won-run crate ceiling went from 15 to 16 and wave 1's from 2 to 2.5 when the reference bot
became the strong player: it sells puffers through waves 1-2 to invest (a real cost in crates,
which is the decision), and its won runs keep ~14 crates. The terrapin's whole-run comparison is
replaced by the fixed-wave one above, which is what the terrapin is for.

How they are measured (`tests/pace.test.ts`): wave-1 lessons are means over 200 seeds, runs
over 100, because catches are rolls; crates are counted over won runs only (a lost run's 0
would hide a game gone soft). The bots are in `src/sim/bot.ts`: deploy-all fishes the
best-rated tile it reaches and deploys every fish on the best tile; deploy-bed also buys the
worm bed; sell-all sells everything; "good" is described at the top of `bot.ts`.

## 8. What the slice must answer

1. Does sell-or-deploy feel like a real decision every build phase?
2. Does casting bait on the road feel like control, or like a chore?
3. Does catching a fish and watching it work feel better than buying a tower would?

If any answer is no, fix the model here before anything in Milestone 3 or later.

## 9. Later systems (model sketches, not slice)

Boats: a rowboat fishes one zone at rod-tier rates with no range limit (cost 80); a skiff
twice that; a trawler fishes two zones and fills the live well fast but catches no turtles;
a harpoon skiff deals 6 damage/s to thieves within 4 tiles of a water lane. Canals: 2 money
per tile, 3 s per tile, must connect to water; a pool is 4 tiles. Buckets: a fish on land for
60 s then it must go back. Chum: pulls gulls and pelicans; catches catfish and gar. Depth and
time: dawn/dusk ×1.5 on surface species; a front ×0.5 all rates for one wave. Lore nodes
(between runs): bigger live well, lures last +4 s, start with a rowboat, worms also pull gulls.

## 10. The slice's shore (Back Bay)

A hand-written 40 × 22 tile map (`src/data/shore.ts`), sized so the whole board shows at 2×
on a 1280 × 720 window and 3× at 1920 × 1080, with no panning: a tower defense you can see
whole. The road runs 39 tiles: 30 east along the north shore from the west edge, bend 1 at
the pool, 4 south, bend 2, 5 east to the smokehouse door. Water within 2 tiles of the road
(Chebyshev) is the placeable shallows; reeds and mid/deep water are not.

- **The dock** sticks 5 tiles north from the road; the angler stands at its end. A tier-1
  cast of 9 tiles reaches road tiles 9-23 (15 tiles, §6) and the whole shallow bowl.
- **The point** is a peninsula east of bend 1; its fishing zone is the water within 4.5 tiles
  of its tip, 11-19 tiles from the angler (42 tiles): tier 2 (14) reaches 19 of them, the near
  side.
- **The pool at bend 1** is a 3 × 3 shallow pond inside the corner (one corner reeds): a ray at its best tile
  (27,13) has 8 road tiles within 3, 7 of them wet (the corner, 29, is dry), against 5 for a ray
  two tiles off a straight. **Measured** (one walker, one pass): 39 damage to a raccoon and 63 to
  a bear, against 24 and 39 on a straight; (27,14) has 9 tiles in reach but 7 wet, 36 and 60
  (re-measured at the re-gate review; the old 75 counted the dry corner); its south row, 18 and
  24-30. The kill zone is a
  place on the map, not a bonus; it is outside the tier-1 lure reach, so the first lures land on the
  straight by the dock and the bend pays off once the surf rod is bought.
- **Structure** for fishing (§3) is the dock and the reed clumps: one by the road's start,
  two east of the dock (tiles 24-25, inside the tier-1 cast) and a few along the bend and the
  point's shore. Terrapins bite only beside them.
- **Wet road** (§4): road tiles touching water are wet ground, where a ray's shock reaches; the
  sand strip by the dock (road 11-13), the dock's foot (16), the bend's corner (29) and the last
  six tiles to the smokehouse are dry.
- **The way out** (§5): from the road's end a dirt trail runs south through the woods (x 34)
  off the map's bottom edge; gulls leave straight north over the bay. Neither passes a slot, so
  a crate that leaves is gone unless the thief was already dying.

## 11. Readability (what the board must show at 1×)

Water in four tints: deep (open water), mid (the point's water), shallow, and the
**placeable shallows**, the lightest, with slot ticks at the tile corners. In deploy mode the
exact tiles that fish fits are lit; in lure mode the road tiles in reach glow pink.

A defender about to be eaten: a fish's HP bar sits on its side **away from the road** (above a
fish north of it, below one south of it), so it never covers a thief walking past; red and
blinking under 35%. A fish being clawed shakes, blinks white and has a red ripple, with claw
scratches over it. A terrapin being worried pulls into its shell and shakes, with a bar for the
worry left. A thief that snatched a pufferfish stands still with the puffed fish in its mouth,
and green bubbles rise off it while the poison works. Animals in a line stand their body
lengths apart, so a line reads as a line. A shock is a 1 px gold bolt for 4 frames: long
enough to see, short enough not to hide its target. **Wet road** has a dark damp band along
the side that touches water, dithered into the dry road; deploying a ray, the hovered slot
tints in gold the wet road it would shock; deploying a puffer, the rays that reach where a gull
flock would land round it are framed in gold and the status line counts them, as the lure
preview counts the rays that reach a worm's eater. A lure keeps a pink ring and its food bar over the
sprites, so a raccoon eating it doesn't hide it. A gull landing to rob a flockmate gets a pink
"!" where it lands, and gulls on the water (retching or robbing) are drawn down on it with no
shadow, belly under the waterline, a ripple round them and their HP bar on them, not up in the
air: those are the ones a ray can reach. The wave toast sits under the top bar, over open water (at the bottom it covered the
smokehouse), and waits while a card is open.

**Floaters** (2026-10-12, the critic's second review: "Electric ray eaten" ran into itself,
"Poisoned!" covered the line): overlap is judged in HUD pixels with the font's real widths;
a floater that would land on another steps up a whole text line; money floaters near each
other merge into one sum; word floaters are dropped when the board is drawn smaller than the
HUD (the sprite already shows it), and money floaters too (the top bar counts the money): at
that size only a lost crate still floats, at the smokehouse door. The poisoned state has no
floater at all: the bubbles say it.
