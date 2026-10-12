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
| Gull | laughing gull | 20 | 2.5 t/s | 1 | 1 | 1 | flocks of 3; flies: over terrapins, out of a ray's reach; swallows a worm within 2 tiles whole; squabbles 4 s over chum within 4 (§12); lands on the water 6 s round a flockmate with a pufferfish; never claws |
| Raccoon | raccoon | 40 | 1.2 t/s | 1 | 1 | 1.2 | pulled by worms within 4 tiles and chum within 1 (§12), eats 6 s; worries terrapins; claws 1 tile walking, wades 2 tiles in a line |
| Bear | Louisiana black bear | 160 | 0.7 t/s | 5 | 4 | 1.6 | ignores worms; wades 5 tiles to chum, eats 8 s (§12); shoves terrapins aside; claws 1 tile, 5/s, walking or waiting |

**Bounty is 1 per 40 HP, at least 1.** Every thief stopped over the 12 waves would pay 929,
nearly three quarters of it in waves 10-12. Against 30 to start, the rod's 50, a boat's 50-80 and bait every
build, selling fish to buy the rod and the first boat sooner is the run's real trade (§7):
bounties come too late for either.

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

**Walkers keep their room on the road** (Milestone 3 review): a walker stops **0.8** of a
line's spacing behind the one ahead, one paralysed by a puffer holds up those behind it, and a
walker comes onto the road only when there is that room at its start. Gulls fly over and aren't
spaced. At the late waves' old 0.25-0.31 s spawns the road was a grey ribbon of raccoons three
and four deep; now it carries a raccoon every ~0.8 s at most (0.96 tiles at 1.2 t/s) and a bear
every ~1.8 s, and a slow bear holds the raccoons behind it. So walker pressure has a ceiling (about
50 HP a second of raccoons) that a ray row outshoots: the late waves press with what the road
doesn't limit, gull flocks and bears.

Smokehouse starts with **20 crates**. At 0 the run ends. **A thief that takes crates leaves
another way**: walkers go south from the smokehouse door down the woods trail (x 34, drawn as
a dirt track) and off the map; gulls fly straight north over the bay. A thief stopped before it
gets away puts its crates back; no slot reaches the trail, so mostly that means one already
poisoned or half-dead as it reached the door. The end screen counts recovered crates only when
there are any.

Road length 39 tiles. Spawns 1.5 s apart unless a wave says otherwise; a gull flock's three
0.3 s apart, the wave's gap between flocks. The season (Milestone 3, 2026-10-12; waves 1-3 are
the slice's, 4-12 were reshaped for twelve waves and a fleet, §12):

| Wave | Composition (in spawn order) | Gap | Total HP | Bounty |
|---|---|---|---|---|
| 1 | 5 Raccoon | 1.5 s | 200 | 5 |
| 2 | 7 Raccoon | 1.5 s | 280 | 7 |
| 3 | 6 Gull (2 flocks) | 1.2 s | 120 | 6 |
| 4 | 9 Raccoon, 1 Bear | 1.1 s | 520 | 13 |
| 5 | 12 Gull (4 flocks), 10 Raccoon | 0.85 s | 640 | 22 |
| 6 | 15 Raccoon, 3 Bear | 0.75 s | 1,080 | 27 |
| 7 | 18 Gull (6 flocks), 14 Raccoon, 2 Bear | 0.75 s | 1,240 | 40 |
| 8 | 21 Gull (7 flocks), 15 Raccoon, 4 Bear | 0.65 s | 1,660 | 52 |
| 9 | 27 Gull (9 flocks), 20 Raccoon, 8 Bear | 0.55 s | 2,620 | 79 |
| 10 | 30 Gull (10 flocks), 30 Raccoon, 18 Bear | 0.44 s | 4,680 | 132 |
| 11 | 54 Gull (18 flocks), 46 Raccoon, 30 Bear | 0.31 s | 7,720 | 220 |
| 12 | 66 Gull (22 flocks), 60 Raccoon, 50 Bear | 0.25 s | 11,720 | 326 |

The gap is the spawn clock for gulls; a walker comes on no sooner than the road has room for it
(above), about every 0.8 s for raccoons and 1.8 s for bears, so the late gaps are floors that only
the flocks reach.

**The season's shape** (Milestone 3): the slice's waves 4-8 were sized for a player who spends
everything on defense. Kept as they were, they left nothing to save toward a boat: the reference
bot that tried to invest lost in waves 6-8. So waves 4-8 went back to roughly their sizes before
the re-gate review (below), a window where a strong player can sell rays toward a rowboat; waves
9-10 are the boats' first test, and 11-12 are sized for a run with three boats out and chum in
hand: fifty bears in the finale, where a worm does nothing and a slick is the only bait that holds
them. They were grown five times against the measurements: when won runs kept 17-18 of 20 crates
against waves a third smaller; when the rowboat first, at its first price of 40, won 98 of 100;
after the critic's review, when walkers kept their room on the road (above) and the road carried
too few raccoons to press a ray row, so waves 7-12 gained gull flocks and bears; and twice when
the reference got stronger (§7: worms only in the opening, rays past three sold for a rowboat by
wave 3, which won 96-99 of 100 against the old waves). The last time waves 4-6 grew too (a row
thinned to three rays for the rowboat pays in wave 4's bear and wave 5's four flocks), so each
opening has its own danger: the reference loses crates in the gull waves 3 and 5 and in 10-12,
the rowboat-first line in waves 1-4, the line that keeps six rays before its rowboat in 8-12.
Without boats the same player wins few (§7).

The slice's history of these waves: wave 1 is five raccoons, the first lessons' wave: the dawn
ray, two or three puffers and one worm a tile short of the ray stop it (§7). The first bear came
in wave 4; the slice's waves 4-8 grew by about half at the re-gate review, and
their spawns came closer: the critic's line (the dawn ray inside the rod's cast, the rod and no
bed, rays before terrapins) won 96-99 of 100 against the old ones. More raccoons barely moved
the reference bot (its mid-game holds; what loses runs is a bad opening) and paid it more bounty
than it could spend; closer spawns press without paying. **Wave 8 leans on bears** (the gate
review): with five flocks in waves 7 and 8 back to back, the finale was decided by how many
puffers bit in one 45 s build (2.9 expected, five needed); three flocks and a third bear make it
a question of where the rays are. **Bears stay last in their waves**: the critic proposed
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

**The reference player** (Milestone 3, re-measured after the critic's review). The pace tests'
"good" bot is the strongest line known, because a lesson only a weak bot shows isn't one. It
sells the ray caught at dawn and puffers toward the surf rod (except in a gull wave, keeping the
puffers the next flocks need), then **rays past three toward the rowboat**, which is out by wave 3,
then the line boats' catch, kind by kind, toward the trawler (by wave 7); the skiff and the bed
come when money allows. It sends each boat where the fish it is worth most bite (rays 1, puffers
0.4-0.8 with flocks coming, terrapins 0.25), the point's shared stock counted (§12), and moves a
boat at a build when better water opens. It **lays worms only while fewer than four rays are
down**, on two kill zones, a tile short of the rays, once the gulls are past (§6); it lays a chum
slick for each gull flock and, once the flocks are through, for the bears (§12); it fishes
terrapins once twelve rays are down and never sets one where its line wades a ray; it keeps rays
two tiles out; it digs no canals (worth nothing on Back Bay, §12).

Two of those were found this way. **Worms all season** (two a wave, as the slice's reference
did) won 70-88 of 100 against the old waves, and the bot that never laid one won 83-95: two worms a
wave are ~$5 a wave the fleet needed, so its boats came later and it met wave 10 with 11.3 rays to
12.9 (bears took 1.7 crates there against 0.4). Worms in the opening only won 85-94. **Rays past
three** for the rowboat (not six) brought it out three waves sooner, ~20 more boat fish a run, and
won 96-99 against the old waves with almost nothing stolen after wave 5. The season was sized again
against that line (§5): waves 4-6 grew so a row thinned for an early boat pays in the opening, and
the late waves grew so the fleet is pressed.

**Three openings and two lines.** The first buy is a fork (the first hint names it):

- **the rod first, selling the dawn ray** (the reference): wave 1 costs ~0.5 crates;
- **the rod first, deploying the dawn ray**: the rod a few seconds later, wave 1 costs nothing,
  and it wins as often;
- **the rowboat first**: a second line on the water from the first minute, paid for with 5-7
  crates in waves 1-2 and runs lost in wave 4; ahead at the end (waves 10-12 cost it ~1.5).

And two lines after it: **keeping six rays before the rowboat** (safe early, thin late: its fleet
is three waves later and waves 8-12 cost it 7-9 crates), and **keeping every boat's catch**
instead of selling toward the trawler (the trawler four waves later; waves 10-12 cost it 7-8).
Each has its own danger, so the opening is a choice about where to take the risk.

**Wave 1, the intended lesson: deploy, don't sell.** A ray two tiles from a straight has 4.47
tiles of road in reach: a raccoon at 1.2 t/s spends 3.7 s there, 24 damage, so **a lone ray
kills nothing** (40 HP). A puffer beside it holds one raccoon 4 s in reach: 24 poison and the
rest of its HP shocked, a kill. Fish stop raccoons roughly one each, and only together. The
deploy-all bot fishes the dock (2.8 a minute) and meets wave 1 with the dawn ray and ~2.6
puffers. **Measured** (200 seeds): deploy-all leaks **2.6** of 5; selling everything leaks all 5
(structural: nothing is deployed; the comparison teaches).

**Wave 1, the luring lesson.** One worm at the road's midpoint beside the ray stalls each
raccoon 6 s in its reach (36 damage) and lines the others up. **Measured** (200 seeds, every one
with the dawn ray): **2.7 → 0.06 leaks** with the lure: the best move of the first minute.
Beside the ray it costs the ray; a tile or two short of it costs nothing (§6).

**Wave 3, the gull flocks.** Six gulls in two flocks. Rays can't shock them in the air,
terrapins don't stop them, a worm is swallowed; a puffer kills the gull that takes it and
lands its flock on the water round it for 6 s, where rays in reach shock them (§4).
**Measured** (20 seeds, straight to wave 3, no line cast: structural): three terrapins leak
**all 6**; four rays spread along the road **all 6**; two puffers alone **4** (each kills its
eater; the flock lands, then flies on); a puffer between two rays, for each flock, **none**.
With 4 s on the water a pair of rays killed only one more gull a flock: 6 s is what lets a puffer
and two rays bring a flock down, so a gull wave asks for a puffer and two rays where each flock
passes, the same pair the raccoons ask for (or a slick there, §12). The HUD's wave tip shows the
next two waves, so a player can fish the dock for the flocks a wave ahead.

**Wave 4, the bear.** 160 HP at 0.7 t/s, not lured, held 3 s by a terrapin (18 more damage from
a ray in reach). It needs five ray-passes on wet road, or four and a puffer (§5); walking past
a ray one tile out it claws at 5/s for ~2.9 s, 14 damage, most of a ray.

**Wave 6: a terrapin holds the raccoons, a slick holds the bears.** Fifteen raccoons and three
bears past four rays two tiles out (10 seeds): 8 of 18 leak and the thieves take **all 20
crates**, 15 of them the bears'. With a terrapin between the rays (16,12) **3** leak, but the bears
shove it aside and still take 15. A chum slick two tiles out between the first two rays the bears
pass (9,10), laid before the wave, holds all three where the rays shock them: **no bear gets a
crate**, 20 crates stolen to 5. Between the last two (21,10) about one bear gets through (5 crates); a
tile from the road (20,11) the passing raccoons find it first (§12) and the bears walk on (15).
A slick and a terrapin together: 1 leak. So the terrapin is the raccoons' answer, the slick the
bears', and where the slick lands decides who eats it. (At the slice's wave 6 the terrapin cut 18
of 20 leaks to 5, its line wading two rays to death; with walkers keeping their room on the road,
§5, fewer raccoons reach the row at once.)

**Money.** The rod (50) and the boats (50, 60, 80) are the investments; bait is the running cost
(packs of 3 worms for 8, a bucket of chum for 5). Selling is how the investments come in time:
bounties come too late (§5). **The known gap: past the fleet, money has nothing to buy.** Once the
skiff and the bed are bought (by wave 11-12), money buys only bait, and the late waves' bounty
piles up: the reference starts the finale with **$128-140** and ends with $340-410. Laying two
slicks at once to spend it measured worse on the season before this one (67-83 wins against
83-92: buckets bought ahead delay the trawler). A late sink is Milestone 4's (IDEAS.md); the pace test only keeps it from growing.

**Measured over five 100-seed sets** (seeds 1-500, the season in §5; every threshold clears the
worst set; "late" is crates stolen in waves 10-12, "at 12" the money in hand as the finale starts):

| Bot | Wins per 100 (five sets) | Crates, won runs | Waves 1-2 | Late | At 12 | Boat fish |
|---|---|---|---|---|---|---|
| reference | 74, 87, 88, 84, 90 | 14.9-15.8 | 0.5-0.7 | 3.3-4.5 | $128-140 | 112-121 |
| selling rays past two, not three | 82, 86, 87, 88, 89 | 14.9-16.1 | 0.5-0.8 | 3.0-4.0 | $134-138 | 117-124 |
| deploying the dawn ray | 79, 80, 85, 84, 88 | 14.5-15.8 | 0.0-0.1 | 3.7-4.5 | $123-131 | 113-121 |
| the rowboat first | 74, 86, 75, 72, 83 | 12.0-13.1 | 5.2-6.6 | 1.1-1.7 | $170-183 | 102-120 |
| keeping six rays before the rowboat | 67, 73, 79, 71, 76 | 14.5-15.6 | 0.5-0.7 | 4.0-4.9 | $116-128 | 86-96 |
| keeping every boat's catch | 76, 72, 76, 77, 73 | 11.1-12.6 | 0.5-0.7 | 6.8-8.4 | $27-32 | 90-95 |
| no worms | 79, 83, 82, 79, 82 | 11.5-13.4 | 4.8-5.5 | 2.2-3.4 | $128-150 | 110-117 |
| worms all season | 74, 79, 84, 78, 83 | 14.0-15.7 | 0.5-0.7 | 4.3-6.1 | $95-105 | 111-114 |
| no terrapins | 77, 89, 92, 84, 91 | 15.6-16.2 | 0.5-0.7 | 2.2-3.7 | $144-159 | 112-122 |
| no surf rod | 27, 34, 36, 37, 41 | 14.3-15.1 | 5.4-6.6 | 0.0-0.4 | $269-271 | 40-58 |
| no chum | 1, 2, 0, 1, 2 | - | 0.5-0.7 | 8.5-9.3 | - | 61-68 |
| no boats | 2, 2, 1, 0, 1 | - | 0.5-0.7 | 14.7-15.9 | - | 0 |

Where the runs are lost: the reference in waves 10-12 (the finale's flocks), the rowboat-first
line in wave 4 (8-15 runs of 100, at the first bear), the six-rays line
in 9-12, the line that keeps every catch in 11-12. Chum and the boats are the season (none won
without either); the rod is most of it (no rod: 27-41, the rowboat rowing to the point is a second
road, and a worse one); the worm is worth ~5 crates in waves 1-2 and ~2.5 over a won run, not
wins; **terrapins are worth nothing over a run** (the bot without them wins 0-4 more: the slick
took the bear from them and the row the raccoons), and the selling floor is flat between two and
three rays. Deploy-all and sell-all win none.

Pace tests assert (floors say the lesson is there; ceilings say the game hasn't gone soft):

- wave 1: deploy-all leaks ≤ 70% of the raccoons; sell-all leaks every one; one midpoint worm
  cuts leaks by ≥ 2 (§6: a worm a tile short of the dawn ray stops all but ≤ 1 and leaves it
  ≥ 15 HP; beside it the ray is waded to death and 2 more leak);
- wave 3: three terrapins and four rays leak every gull; two puffers alone leak ≥ 4; a puffer
  between two rays for each flock leaks ≤ 1;
- wave 6 past four rays: a terrapin cuts leaks by ≥ 3 and the bears still take ≥ 8 crates; a
  slick two tiles out between the first two rays leaves the bears none and cuts the crates stolen
  by ≥ 8; a slick a tile from the road leaves the bears ≥ 8;
- the reference wins 65-90 of 100; won runs keep ≤ 16 crates; wave 1 costs ≤ 1, waves 3 and 5
  ≥ 1, waves 10-12 ≥ 2.5; the rowboat is out by wave 4 and the trawler by 8; boats land ≥ 90
  fish; ≤ $160 at the finale's start; ≥ 5 fish lost;
- deploying the dawn ray wins ≥ 70 with wave 1 under 0.3; the rowboat first wins ≥ 60, pays ≥ 4
  crates in waves 1-2, keeps ≤ 14 and loses ≤ 2.5 in waves 10-12; keeping six rays wins ≥ 55
  and loses ≥ 5.5 in waves 8-12; keeping every catch wins ≥ 60 and loses ≥ 5.5 in waves 10-12;
- without worms waves 1-2 cost ≥ 4 and won runs keep ≤ 14; without chum, or without boats, ≤ 10
  wins; without the rod 15-55 and boats land ≥ 25; sell-all and deploy-all never win.

How they are measured (`tests/pace-*.test.ts`, one bot a file so vitest plays them in parallel):
wave-1 lessons are means over 200 seeds, runs over 100 (seeds 1-100), because catches are rolls;
crates are counted over won runs only (a lost run's 0 would hide a game gone soft). The bots are in
`src/sim/bot.ts`; `scripts/measure.ts` prints a variant's numbers over a seed range (run seed sets
as parallel processes: a season is 3-6 s).

**The slice's reference** (Milestones 1-2, eight waves): the critic's third review made the
reference strong (it sells puffers for the rod, fishes each habitat for its fish, places worms a
tile short of the rays); the re-gate review gave it the critic's winning line (the dawn ray inside
the rod's cast, the rod and no bed, rays before terrapins); the gate review gave it two worms on the
road and a pack at 8. It won 80-86 of 100 on the slice's waves; selling and the rod were the run
(never selling 0, no rod 0-2), worms on the road were worth 32-42 wins. The fleet changed all three:
boats are a second road to the rays, chum a second bait, and the worm an opening's bait.
DECISIONS.md has each step.

## 8. What the slice must answer

1. Does sell-or-deploy feel like a real decision every build phase?
2. Does casting bait on the road feel like control, or like a chore?
3. Does catching a fish and watching it work feel better than buying a tower would?

If any answer is no, fix the model here before anything in Milestone 3 or later.

## 9. Later systems (model sketches, not slice)

Boats, chum and canals are built (Milestone 3, §12). Still sketches: a harpoon skiff deals 6
damage/s to thieves within 4 tiles of a water lane (Milestone 4). Buckets: a fish on land for
60 s then it must go back (Milestone 6, §12 says why it moved). Chum as hook bait catches
catfish and gar (Milestone 4); pelicans come to a slick (Milestone 4). Depth and time: dawn/dusk
×1.5 on surface species; a front ×0.5 all rates for one wave. Lore nodes (between runs): bigger
live well, lures last +4 s, start with a rowboat, worms also pull gulls.

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

## 12. The fleet and the works (Milestone 3)

The slice answered §8 with one line and two purchases; the fleet is the factory (pillar 5): more
lines in the water than one angler can hold, each one a standing sell-or-deploy decision, each one
burning bait. The model's numbers are here; what the reference bot measured with them is in §7.

### The season

**Twelve waves** (PLAN.md: a season is 12-15). Waves 1-3 are the slice's, unchanged: their
lessons (§7) are the opening's. Waves 4-12 are sized for the reference player: the surf rod
first (§7), a rowboat out by wave 3 (rays past three sold toward it), the trawler by wave 7 (the
rowboat's catch sold toward it), the skiff about wave 11. A run is ~25 minutes, the finale ~5.

### Boats

| Boat | Cost | Speed | Gear | Hold | Bait | Fishes |
|---|---|---|---|---|---|---|
| Rowboat | 50 | 1.5 t/s | a hand line: reel ×1, medium line | 3 | a worm a catch | any water a boat gets into (not reeds), no range limit |
| Skiff | 80 | 4 t/s | an outboard and a surf rod: reel ×1.5, large line | 4 | a worm a catch | the same |
| Trawler | 60 | 1 t/s | a try net, towed 60 s | 6 fish | none | open water only (mid and deep): the net, not a hook (below) |

One of each, moored at the dock's three berths. **Send a boat** by picking a water tile: it
travels there by water (round the point, never over land), fishes, and comes back when its hold is
full or its bait is gone; at the dock it puts its catch in the live well and goes out again to the
same tile. Its catch rolls exactly as the rod's line does (§1), at the tile's habitat (§3): a boat
at the point lands rays, one by the reeds terrapins. **Boats aren't distracted**: they fish at
full rate in a wave (the angler's ×0.5 is his eyes on the road, §2). A line boat goes only where
something takes a hook (the channel has no hook fish until Milestone 4), and no boat fishes on a
berth: a boat at a berth is moored.

**The point's rays are shared** (Milestone 3 review). The rays at the point come in on the pass,
about **4 a minute** for every line there together: each line's ray rate is scaled by
4 / (the sum of every line's rate there), never above its own. The surf rod alone (3.75) is
untouched; the rod and a rowboat (2.5) get 64% each, 2.4 and 1.6. So a second line at the point
mostly takes rays from the first, and where to send a boat is a choice: the point's shared rays,
the dock's puffers (2.6 a minute by the dock) for the gull flocks, or the reeds' terrapins. The
bay's strays (0.4 a minute a line in the shallows) aren't a stock. This regenerates every minute:
it is fishing pressure, not a shoal that runs out (DECISIONS.md flags Age of Empires' shoals).

**Each boat keeps or sells its catch, kind by kind.** Kept, it lands in the live well; with the
well full the boat waits at the dock with its hold full ("waiting on the live well"). The kinds it
is set to sell (rays, puffers, terrapins) go to market as they land. A boat is a standing answer
to pillar 1's question: "keep the rays, sell the puffers until the flocks come".

**Bait** (pillar 1: selling funds bait): a boat loads one worm per hold slot when it leaves. It
takes them from the can but never below **3** (what a player needs for the line and a lure), and
buys the rest from the bait shop at the dock at the pack price (§3); with neither it waits
("waiting on worms"). The worm bed's 2 a minute now has a buyer: a rowboat at the point burns 2
worms a minute, a skiff 3.4.

Derived, for a boat alone at the point (with the rod there too, the point's 4 rays a minute are
shared, above), with the trip from the berth to the near side of the point (~12 tiles of water
each way):

| | Rowboat at the point | Skiff at the point | Trawler in the channel |
|---|---|---|---|
| fishing a hold | 3 / 2.5 a min = 72 s | 4 / 3.75 = 64 s | a 60 s tow |
| there and back | 24 / 1.5 = 16 s | 24 / 4 = 6 s | ~10 s |
| rays a minute | **2.0** | **3.4** | 1.2 puffers, ~0.2 rays, 1.2 chum |
| bait a minute | 2.0 worms (~$5.4 bought) | 3.4 worms (~$9) | none |

The surf rod at the point lands 4.5 rays a wave cycle (45 s build at 3.75, ~55 s of wave at
half); a rowboat 3.4, a skiff 5.7. So a rowboat is three quarters of a second surf rod, for the
rod's price.

**Prices.** The first hypothesis (60, 120, 160, priced against the rod's 50) failed when measured:
the reference player spends about half its money on worms, and a run that sells only what it can't
deploy never had 60 spare before wave 8. At 40 the rowboat came out by wave 6, but a player who
bought it first, in wave 1, and the rod after won 98 of 100: a second line rowing to the point from
the first minute snowballs. At **50**, the rod's price, the first buy is a real fork: a better line
in hand (the rod first wins 74-90 of 100) or a second line on the water (a gamble: waves 1-2 cost
it 5-7 crates and 8-15 runs in 100 end at wave 4's bear; the rest win easily: 72-86). The rod
first then sells rays past three toward the rowboat and has it by wave 3 (§7). It pays for itself in one wave
cycle if its catch is sold (3.4 rays at $15, less ~$9 of bought worms); the skiff at
**80** is the second boat for a run that is ahead; the trawler at **60** is cheap because it is
the bait boat (below), worth what its chum saves at the bait shop more than what its fish sell
for. A boat bought late still has the last, hardest waves to pay back in.

**The trawler is the bait boat.** A shrimp trawl in a Gulf bay brings up lesser electric rays and
least puffers as bycatch (both are among the commonest), alive enough to keep, and a deck of dead
bycatch that is chum. It catches **no terrapins**: US shrimp trawls carry a turtle excluder
device. It needs no bait and tows 60 s a trip along a run of at least **4 tiles** of open water
(not its berth). A net brings up what lives where it tows (the Milestone 3 review: it had brought
1.2 rays a minute anywhere, three times the bay's hook rate): at most 1.2 rays and 1.2 puffers a
minute where each is commonest, scaled by how common each is in the water towed. The channel is
the bay's water, so its fish are the shallows': **1.2 puffers and ~0.2 rays a minute**; off the
point, 1.2 rays out of the point's shared stock. **1.2 buckets of chum a minute** anywhere: the
bait boat. Hook bites in the channel wait for Milestone 4's fish (hardhead catfish, black drum);
until then deep water is the net's.

### Chum: a slick in the water

The second bait. **Worms go on the road; chum goes in the water.** A slick is cast on placeable
shallows (pale water within 2 tiles of the road), within the rod's cast, not on a fish.

- **Gulls** within 4 tiles drop onto the water round it and squabble over it, every gull in reach
  at once, **4 s** each, then fly on. On the water they're wet: a ray in reach shocks them (§4). 
- **Bears** within 5 tiles leave the road and wade out to it, and eat **8 s**, one at a time; the
  next bear waits on the road behind (wading 1 tile at 5/s, §4). A bear raids for fish: a slick is
  what it smells from across the bay, where a worm isn't (§5).
- **Raccoons** take it only if they pass **within a tile** of it (6 s, one at a time): a raccoon
  forages the waterline by touch and finds a slick at the road's edge, never one two tiles out.
  So a slick two tiles out sorts the thieves (gulls and bears, not raccoons) and one a tile out
  feeds the raccoons too (four of them empty it).
- It holds **24 thief-seconds** (two flocks of gulls, or three bears) and spoils at the wave's
  end, as a worm does.

Derived: a bear eating 8 s beside two rays takes 96, three fifths of its 160; with one ray-pass
on the way in (39) it is dead before it reaches the smokehouse. A flock eating 4 s beside two rays
loses two of its three (each ray kills one in 3.3 s). So the slick is the bear's answer and a
second gull answer that costs bait, not a fish; a puffer between two rays is still the better gull
answer (all three, §7). **Timing**: gulls come first in a wave and eat a slick in 4 s a flock, so a
slick for the bears goes down once the flocks are through, the way a worm for the raccoons goes
down after the gulls (§6). The slick preview says who reaches it first and how many it feeds
("18 gulls first (it feeds 6), then 2 bears last (it holds 3)").

**Where chum comes from**: the bait shop's frozen chum, **a bucket for 5**, and the trawler's
bycatch. Not from kills: PLAN.md's "scraps from kills" isn't taken, because nothing a raccoon or a
gull leaves behind is bait.

### Canals

**Dig** a grass or sand tile that touches water (or touches a tile already ordered) into
shallows: **3 money and 3 s a tile**, one at a time in the order ordered. Not a tree, the road,
the dock, the trail, the smokehouse or the worm bed. A dug tile is shallow water in the shallows
zone, a marsh ditch for what bites (reed habitat: terrapins, and puffers at 0.8; the Milestone 3
review: a dug ditch is mud, not open sand), a slot if it is within 2 of the road (§4), and the road
beside it is wet ground (§4). So digging is a tower-placement decision (pillar 4):

- the **sand strip by the dock** (11-13, 11) is three tiles from the bowl: $9 makes road 11-13 wet;
- the **last stretch to the smokehouse** (road 33-38, six dry tiles) is seven tiles from the
  pool's south corner, along the road's south side: ~$21 for a kill zone at the door;
- **the road's south side** has no water but the pool: a canal west from it along row 14 gives
  ray slots that shock the road from the south, so a kill zone can have rays on both sides.

**Measured, canals are worth nothing on Back Bay** (Milestone 3). The bot that digs (a planner
that values wet road near rays and new ray slots) wins no more runs than the same bot that never
digs, and spends ~$75 a run on it; in fixed waves, three rays in a dug canal at the smokehouse
door stop no more than the same three at the pool, and the dock strip dug wets three tiles of
road for one more raccoon of wave 1. Back Bay's road hugs the water: nearly all of it is wet
already and slots are plentiful. **So Back Bay's yard doesn't offer them** (`SHORE.canals`
false; the critic's review: a menu item worth nothing teaches nothing). The verb, its rules and
its tests stay for a shore whose road runs inland (IDEAS.md, Milestone 5's maps).

### What is not in Milestone 3 (and why)

- **Buckets** move to Milestone 6 (the verbs): a fish on land on a timer works truthfully only
  for the puffer (it is eaten whole); a ray's shock needs water and a terrapin is on land already.
  It needs its own model.
- **Docks**: one landing with three berths. A second landing to shorten trips is Age of Empires'
  dock (DECISIONS.md flags the boats' resemblance); one place where the catch comes in keeps the
  live well the one bottleneck.
- **Crickets** are a freshwater bait (bream and sunfish); Back Bay's third bait is **live
  shrimp**, which arrives in Milestone 4 with the fish that want it (redfish, trout, catfish).

### The production view

Every line in the water is listed with what it is doing and what it's waiting on: the rod
(where, what bites, a minute), each boat (going out, fishing at so many a minute, coming in with
so many, waiting on the live well or on worms) and the bait (worms in from the bed, out to the
lines). Hovering a boat on the board says the same.
