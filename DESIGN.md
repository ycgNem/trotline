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

Build phase (60 s before wave 1, 45 s after; call early for `25% × next bounty × time
remaining / build length`): fish from the dock, sell or deploy from the live well, place bait
lures, buy. Wave phase: thieves walk the road; defenders act; bait lures pull; fishing
continues at half rate (you're distracted). Leaks steal crates. Between waves fish heal a
little (§4) and lures spoil (§6).

**Calling early is weak and known to be** (2026-10-12, the critic's second review): the bonus
is $1-12 against ~1.8 fish of fishing given up. It stays as a way to skip a wait when the well
is full; it is not a lesson and no pace test leans on it. IDEAS.md has the candidates.

## 3. Fishing (slice)

The slice's shore is a brackish back bay on the Gulf (§10). Zones: **the shallows** (every
shallow tile in the bay; the tier-1 cast reaches the bowl around the dock) and **the point**
(open sand off the peninsula's tip, toward the pass; tier 2 only). Bait: **worm** only (chum
arrives in Milestone 3).

| Species | Real animal | Bay /min | Point /min | By structure | Open sand | Size | Sell |
|---|---|---|---|---|---|---|---|
| Pufferfish | least puffer | 2.0 | — | ×1.3 | ×0.8 | small | 8 |
| Electric ray | lesser electric ray | 0.8 | 2.5 | ×0.5 | ×1 | medium | 15 |
| Terrapin | Mississippi diamondback terrapin | 0.5 | — | by reeds only | none | medium | 12 |

**Where the line sits matters.** "By structure" is a water tile within a tile (Chebyshev) of
the dock or of reeds; everything else is open sand. Least puffers pick bait off pilings and
grass near the bottom, so they thicken by structure; lesser electric rays lie buried in open
sand and suck worms out of it, so they thin out by structure; diamondback terrapins live on the
marsh edge, so they bite only within a tile of reeds. The tooltip over any water tile names
its habitat and shows its rates.

**The ray is a pass fish** (2026-10-12, the critic's second review): lesser electric rays live
on high-salinity sand by passes and surf beaches and are only an occasional catch on a
brackish flat. The first model had them biting at 1.95/min in the bay, more often than the
puffer. Now: 0.8 in the bay (about a third of the point's rate) and **2.5 at the point**. That
makes the surf rod the way to rays in numbers, which is its job (§7, money).

Rod tier 1: reel ×1.0, a 9-tile cast (§10), medium line. Tier 2 (the surf rod, **50**): a
14-tile cast that reaches the point, large line, reel ×1.5. A terrapin is medium: it needs the
marsh edge, not a heavy line, and the reeds east of the dock are inside the tier-1 cast. Live
well: 6 slots. Every catch takes the worm off the hook. **Starting worms: 8**: the first build
phase of fishing and a lure or two. **The worm bed** (40, bought once) makes a worm every 15 s
up to 12; the bait shop sells a pack of 3 for 5 so a broke player is never stuck. 4 worms a
minute is about what a tier-2 line at the point uses (3.75/min) before any lures, so the bed
is a saving, not a surplus.

**Derived** (catches a minute):

| Where | Tier 1 | Tier 2 (×1.5) |
|---|---|---|
| Open sand in the bay | 1.6 puffers + 0.8 rays = 2.4 | 3.6 |
| By the dock | 2.6 puffers + 0.4 rays = 3.0 | 4.5 |
| By the reeds | 2.6 puffers + 0.4 rays + 0.5 terrapins = 3.5 | 5.25 |
| The point | out of reach | 3.75 rays |

So the first build (60 s, tier 1, open sand) lands ~2.4 fish, a 45 s build ~1.8; with the
surf rod a build at the point lands ~2.8 rays. The choice of tile is a choice of defender:
puffers by the dock (for gulls), rays at the point (once you can reach it), terrapins at the
reeds.

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
  A thief already paralysed can't take a second one.
- **Electric ray: one shock at a time.** No chain: a discharge goes into what it touches. A
  ray picks the nearest walker within 3 tiles and **stays on it while it is in reach**;
  switching every pulse to whichever thief stepped closest spread the damage over a whole line
  and killed nothing. **No shock through air**: gulls are out of its reach, which makes the
  puffer the gull answer and the dock-or-sand cast a per-wave call. The charge (140 damage a
  wave, then spent) is gone: the critic measured 140, 200 and infinite charge at the same
  36-37/40, so it did not bind; wear (below) does the work it was meant to.
- **Terrapin: the raccoon's prey.** Raccoons are the diamondback terrapin's real predator.
  Each raccoon that reaches one stops and worries it **4 s**, gnawing **1.5 HP/s** (6 HP a
  raccoon, ~16 raccoons to a shell), while the rest wait in line behind it. A bear doesn't eat
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
| Gull | laughing gull | 20 | 2.5 t/s | 1 | 1 | 1 | flies: over terrapins, out of a ray's reach; swallows a worm within 2 tiles whole; never claws |
| Raccoon | raccoon | 40 | 1.2 t/s | 1 | 1 | 1.2 | pulled by worms within 4 tiles, eats 6 s; worries terrapins; claws 1 tile walking, wades 2 tiles in a line |
| Bear | Louisiana black bear | 160 | 0.7 t/s | 5 | 4 | 1.6 | ignores worms; shoves terrapins aside; claws 1 tile, 5/s, walking or waiting |

**Bounty is 1 per 40 HP, at least 1.** Every thief stopped over the 8 waves pays 105, against
30 to start and 90 of shop (bed 40, rod 50): money stays short enough that selling a fish to
buy the rod sooner is a real trade (§7).

**Bears come for fish, not worms** (2026-10-12, the critic: a worm holding a bear 10 s was
false). Bears aren't pulled by worms, and a terrapin holds one 3 s. Bear HP went 200 → 160
(four raccoons) because a bear that no lure or shell can hold has to be killed walking past
rays: at 0.7 t/s a ray two tiles out from a straight has ~4.5 tiles of road in reach, 6.4 s,
38 damage, so a bear needs four ray-passes, or three and a puffer.

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

Road length 39 tiles. Spawns 1.5 s apart unless a wave says otherwise. Slice waves:

| Wave | Composition (in spawn order) | Gap | Total HP | HP/s arriving | Bounty |
|---|---|---|---|---|---|
| 1 | 6 Raccoon | 1.5 s | 240 | 27 | 6 |
| 2 | 8 Raccoon | 1.5 s | 320 | 27 | 8 |
| 3 | 5 Gull | 1.2 s | 100 | 17 | 5 |
| 4 | 6 Raccoon, 1 Bear | 1.5 s | 400 | 38 | 10 |
| 5 | 6 Gull, 8 Raccoon | 1.0 s | 440 | 31 | 14 |
| 6 | 12 Raccoon, 1 Bear | 1.0 s | 640 | 49 | 16 |
| 7 | 7 Gull, 12 Raccoon | 0.8 s | 620 | 41 | 19 |
| 8 | 5 Gull, 14 Raccoon, 2 Bear | 0.7 s | 980 | 67 | 27 |

(HP/s arriving: total HP over count × gap.) **Gull counts halved** (2026-10-12) when rays
stopped reaching gulls: a gull costs a puffer now, and fishing the dock for the two builds before
a gull wave lands ~4 puffers at tier 1 (2.6 a minute) or ~6 with the surf rod. **Bears stay last in their waves**: the critic proposed bears first
so a bear holds a line of raccoons behind it at a terrapin; with the bear's 3 s shove that
line no longer forms, and measured, bears-first won 22/40 against 32/40.

Starting money: **30**. Starting live well: one ray (§3). The first 60 s is fishing.

## 6. Bait lures (slice)

Cast a worm onto any road tile within the rod's cast. **Raccoons** within 4 tiles leave the
road for it, eat 6 s, then rejoin the road where they left it. One lure feeds one raccoon at a
time; the rest stand in line back along the road, spaced by length (§5), wading for fish (§4).
That's the stall. A lure costs one worm, so luring competes with fishing. Bears ignore worms.

**A lure holds 36 thief-seconds of eating**: §7's luring lesson has the one midpoint worm
stall each of wave 1's six raccoons for 6 s. Thieves already fed by a lure aren't pulled by it
again; a lure that runs out sends its line back to the road.

**Gulls swallow worms**: gulls follow ploughs for worms. A gull within 2 tiles of a worm swoops
on it and swallows the whole lure, line or no line. **A lure spoils when the wave ends** (worms
left in the sun): lures are cast for a wave, at the right moment, not placed once for the run.
Together: in the gull-led waves (5, 7, 8) a worm cast before the gulls pass is a worm thrown
away; cast it once they're through, ahead of the raccoons. Pull radii now differ by thief (gull
2, raccoon 4, bear none), so where you cast decides who stops.

The lure's reach is the rod's cast: tier 1 reaches road tiles 9 to 23 (15 tiles around the
dock's foot, §10).

## 7. Derived checks (these become pace tests)

**Wave 1, the intended lesson: deploy, don't sell.** The first build yields the dawn ray plus
~2.4 fish on open sand (~1.6 puffers, ~0.8 rays). A ray two tiles from a straight has ~4.5
road tiles in reach: a raccoon at 1.2 t/s spends ~3.7 s there, 22 damage. A puffer beside it
holds a raccoon 4 s in reach: 24 poison + 24 shock, a kill. So a ray and a puffer stop two or
three of six; two or three leaks is the expected result. **Measured** (200 seeds): deploy-all
leaks **2.27**; selling everything leaks **6.0**.

**Wave 1, the luring lesson.** One worm at the road's midpoint beside a ray stalls each
raccoon 6 s in its reach (36 damage) and lines the others up behind it, wading at the ray for
1/s. **Measured** (200 seeds, every one with the dawn ray): **3.09 → 0.51 leaks** with the
lure, a cut of **2.58**. One worm cast on the road instead of into the water is the best move
of the first minute, and it costs the ray a few HP.

**Wave 3, gulls.** Five gulls at 2.5 t/s. Rays can't shock them, terrapins don't stop them,
a worm on the road is swallowed; a puffer kills one outright (24 poison, 20 HP). **Measured**
(20 seeds, straight to wave 3): three terrapins leak **all 5**; four rays leak **all 5**; five
puffers by the road leak **none**, and four leak exactly the one gull without a puffer. The gull wave asks you to have fished by the dock for it,
and the good bot holds puffers through the raccoon wave before it.

**Wave 4, the bear.** 160 HP at 0.7 t/s, not lured, held 3 s by a terrapin. It needs four
ray-passes (§5) or puffers to hold it in reach; walking past a ray one tile out it claws at 5/s
for ~2.9 s, 14 damage, most of a ray. Bears are what rays two tiles out, and the rod's rays in
numbers, are for.

**Money and selling.** Bounty is 105 a run; the shop is 90 plus worm packs. The surf rod
(50) is the investment: at the point it lands rays at ~4.7 times the bay's rate. The good bot
sells pufferfish to buy the rod first (unless gulls are coming), then the bed from bounty. It
sells **3.5 fish a run** and ends with **$26**. The same bot that never sells (bed first, rod
from bounty) wins **51/100** against **78/100**: selling to invest is worth ~27 wins. Without
the rod at all it wins **42/100**: the rod is worth ~36. Without terrapins (it never fishes the
reeds and sells any it catches) it wins **46/100**: the shell that lines raccoons up in the
rays' reach is worth ~32.

**Fish wear out.** With 0.1 HP/s rest, claws and wading, the good run loses **2.2 fish a run**
to claws and gnawing, which it replaces by fishing.

**The whole run, measured** (100 seeds): the good bot wins **78/100**, won runs ending with
**13.2** crates; crates stolen per wave 1.6, 1.1, 0.5, 1.5, 1.0, 0.5, 0.8, 2.6 (the late waves
press; wave 8 hardest). Deploy-with-bed-never-rod wins ~43/100; deploy-all (no bed, no rod)
and sell-all win 0/20.

Pace tests assert (floors say the lesson is there; ceilings say the game hasn't gone soft;
comparisons take one thing away from the same bot):

- wave 1: deploy-all leaks ≤ 3; sell-all ≥ 5; one midpoint lure cuts leaks by ≥ 2;
- wave 3: three terrapins leak ≥ 4 of 5; four rays leak all 5; five puffers leak ≤ 1;
- the good run wins ≥ 70/100; won runs end with 8-15 crates; wave 1 costs ≤ 2 crates and
  waves 5-8 ≥ 1.5; ≤ $150 unspent; ≥ 1 fish lost a run;
- the never-selling bot wins ≤ good − 15; the no-rod bot ≤ good − 20; the no-terrapin bot
  ≤ good − 20;
- sell-all and deploy-all never win.

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
  of its tip, 12-15 tiles from the angler: tier 2 (14) reaches its near side only.
- **The pool at bend 1** is a 3 × 3 shallow pond inside the corner: a ray there has 9 road
  tiles within 3 tiles, against ~4.5 for a ray beside a straight. The kill zone is a place on
  the map, not a bonus; it is outside the tier-1 lure reach, so the first lures land on the
  straight by the dock and the bend pays off once the surf rod is bought.
- **Structure** for fishing (§3) is the dock and the reed clumps: one by the road's start,
  two east of the dock (tiles 24-25, inside the tier-1 cast) and a few along the bend and the
  point's shore. Terrapins bite only beside them.
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
enough to see, short enough not to hide its target.

**Floaters** (2026-10-12, the critic's second review: "Electric ray eaten" ran into itself,
"Poisoned!" covered the line): overlap is judged in HUD pixels with the font's real widths;
a floater that would land on another steps up a whole text line; money floaters near each
other merge into one sum; word floaters are dropped when the board is drawn smaller than the
HUD (the sprite already shows it), and money floaters too (the top bar counts the money). The
poisoned state has no floater at all: the bubbles say it.
