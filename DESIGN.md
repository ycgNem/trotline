# Trotline — Design model

Every number derives from this file. The numbers below are **starting hypotheses for the
vertical slice**, chosen from the model and tuned by play and by the pace tests, never by
looking up what another game uses. When you change a number, write the new derivation here.

## 1. Units

- Tick 1/60 s. Distance in tiles (16 px). Speed in tiles/s.
- **Thieves**: HP in points; defenders deal damage in points. Standard.
- **Fishing**: a *rate* in catches per minute. Each tick, a rod or boat fishing a zone rolls
  `rate / 3600` for each species it can catch; the first success catches that fish. Rates
  multiply: `rate = zoneBase(species, band, timeOfDay) × baitMatch × reelTier`.
- Money is an integer. Sell price per species is fixed per run (±10% market drift later).

## 2. The loop, per wave

Build phase (45 s, or call early for `25% × next bounty × time remaining / 45`): fish from
the dock, sell or deploy from the live well, place bait lures, dig. Wave phase: thieves walk
the road; defenders act; bait lures pull; fishing continues at half rate (you're distracted).
Leaks steal crates. Between waves the market pays out and the catch log updates.

## 3. Fishing (slice)

The slice's shore is a brackish back bay on the Gulf (§10). Zones: **the shallows** (every
shallow tile; the tier-1 cast reaches the bowl around the dock) and **the point** (open sand
off the peninsula's tip, tier 2 only). Bait: **worm** only (chum arrives in Milestone 3).

| Species | Real animal | Zone | Base rate /min (worm) | By structure | Open sand | Size | Sell |
|---|---|---|---|---|---|---|---|
| Pufferfish | least puffer | shallows | 2.0 | ×1.3 | ×0.8 | small | 8 |
| Electric ray | lesser electric ray | shallows, point | 1.5 | ×0.5 | ×1.3 | medium | 15 |
| Terrapin | Mississippi diamondback terrapin | shallows | 0.5 | by reeds only | none | large | 12 |

**Where the line sits matters** (2026-10-12, the critic's review: casting was a vending machine,
every tile of a zone the same). "By structure" is a water tile within a tile (Chebyshev) of the
dock or of reeds; everything else is open sand. Least puffers pick bait off pilings and grass,
so they thicken by structure; lesser electric rays lie buried in open sand, so they thin out by
it; diamondback terrapins live on the marsh edge, so they bite only within a tile of reeds.
The point is all open sand, rays only. The tooltip over any water tile shows its rates.

Rod tier 1: reel ×1.0, a 9-tile cast (§10), medium line. Tier 2 (the surf rod, 60): a
14-tile cast that reaches the point, large line (terrapins), reel ×1.5. Live well: 6 slots.
Every catch takes the worm off the hook. **Starting worms: 8**: two build phases of fishing
plus a lure. **The worm bed** (40, bought once) makes a worm every 15 s up to 12; the bait
shop sells a pack of 3 for 5 so a broke player is never stuck. 4 worms a minute can't keep a
tier-2 line fed (~5/min on open sand, below), so packs stay a running cost: the bed is a
saving, not a tap.

**Derived** (tier 1, worm):

- Open sand off the dock: 1.6 puffers + 1.95 rays = 3.55/min, **~2.7 fish a 45 s build**.
- By the dock: 2.6 puffers + 0.75 rays = 3.35/min, nearly all puffers.
- Tier 2 on open sand: ×1.5 = 5.3/min (~4 a build); at the point, rays only at 2.9/min;
  by the reeds 3.9 puffers, 1.1 rays and 0.75 terrapins a minute.

So the choice of tile is a choice of defender: puffers by the dock, rays out on the sand,
terrapins (rare, slow) at the reeds with the surf rod. Over a run the good bot catches ~35 fish.

**The eel became the electric ray (2026-10-12).** American eels are not electric (the
critic: "fishing has to be true"); a zapper that is a real Gulf back-bay fish is the lesser
electric ray (*Narcine bancroftii*), which lives on shallow sand and really does shock. The
rate history stays: the shallows rate went 1.0 → 1.5 in the first pace run because at 1.0 a
45 s phase caught no zapper 47% of the time and wave 1 read as luck.

## 4. Defenders (slice)

| Fish | Place on | HP | What it does | Numbers |
|---|---|---|---|---|
| Pufferfish | shallow tile ≤ 1 from road | 10 | snatched and eaten by the first thief within 1 tile, which retches and sickens; one use | 40 poison over 3 s, 2 s stun |
| Electric ray | shallow tile ≤ 2 from road | 20 | shocks the nearest thief within 3 tiles; the shock jumps to 2 more within 2 tiles at 50%; spent after 140 damage a wave | 4 damage/s in 0.5 s pulses |
| Terrapin | the road itself | 100 | walkers stop and worry it one at a time while the rest wait in line behind; only a bear's jaws crack it; gulls fly over | raccoon 2 s, bear 20 s; bear cracks 5 HP/s |

**Re-derived from the animals (2026-10-12, the critic's review).** The first build's
pufferfish *exploded* when a thief came near and the turtle was a *wall* every thief chewed at
once: those were Plants vs Zombies' Potato Mine and Wall-nut with fish sprites (DECISIONS.md
flagged both). Re-derived:

- **Pufferfish: poison you get eaten for.** A puffer's defense is tetrodotoxin; the thief has
  to *eat* it. The first thief within a tile (Chebyshev; gulls too, they pick fish at the
  surface) snatches it, stands retching 2 s (stunned, the fish in its mouth) and takes 40
  poison over 3 s. 40 is a raccoon's HP: one puffer is one raccoon, a gull twice over, a fifth
  of a bear (and 2 s of it standing in a ray's reach).
- **Electric ray: a battery.** Real electric rays tire with repeated discharges. 4 damage/s,
  chained, until it has dealt **140 damage in a wave** (3.5 raccoons' worth), then it is spent
  and recharges over the build phase. Without the charge, rays stacked at the road's entrance
  killed every thief of every late wave one at a time (§7): defense grew with how long fish had
  sat there, not with how many you had caught.
- **Terrapin: bait with a shell.** Raccoons and bears worry a terrapin as they would a meal,
  one at a time; the rest stand in line behind it (0.7 tiles back, then 0.6 per animal) and
  wait their turn. A raccoon gives up after 2 s and walks on past it; a bear spends 20 s on it
  and its jaws crack 5 HP/s, so one bear and one shell use each other up. Gulls fly over. It is
  a lure that never runs out for raccoons and is only consumed by bears.

**Claws** (2026-10-12): raccoons and bears fish the water's edge. A walker within a tile
(Chebyshev) of a ray claws at it for 5 damage/s as it passes or stands; a raccoon walking past
a ray one tile out spends ~2 s in reach (10 damage, half the ray), so two raccoons eat it.
Two tiles out it is safe, at the cost of a little road in reach. Pufferfish aren't clawed:
they are snatched whole. Gulls don't claw.

Defenders regenerate 1 HP/s between waves (the terrapin hauls out at the road's edge to rest).
"Within 1 tile" is Chebyshev; distances to the road are Chebyshev; a water tile means a
*shallow* tile (mid and deep water is too deep to set a fish in; reeds are too thick).
Variants (big, rare, golden) arrive with the catch log in Milestone 4: ×1.5 stats, rarer rates.

## 5. Thieves (slice)

| Thief | Real animal | HP | Speed | Crates | Bounty | Behavior |
|---|---|---|---|---|---|---|
| Gull | laughing gull | 20 | 2.5 t/s | 1 | 1 | flies over terrapins; swallows a worm lure within 2 tiles whole |
| Raccoon | raccoon | 40 | 1.2 t/s | 1 | 1 | pulled by worms within 4 tiles, eats 6 s; claws fish within 1 tile |
| Bear | Louisiana black bear | 200 | 0.7 t/s | 5 | 5 | pulled by worms within 4 tiles, eats 10 s; claws fish; cracks terrapins |

**Bounty is 1 per 40 HP, at least 1** (2026-10-12; was 3/8/40 and then 1/2/10). Every thief
stopped over the 8 waves pays 166, against 30 to start and 100 of shop (bed and rod): money
stays short enough that selling a fish to buy the rod sooner is a real trade (§7).

Smokehouse starts with **20 crates**. At 0 the run ends. **A thief that takes crates leaves
another way** (2026-10-12, the critic: walking back up the road through the kill zone made
leaks cheap and doubled every defender's work): walkers go south from the smokehouse door
down the woods path (x 34) and off the map; gulls fly straight north over the bay. A thief
stopped before it gets away puts its crates back; mostly that means one already poisoned or
half-dead as it reached the door.

Road length 39 tiles. Spawns 1.5 s apart, faster in the late waves. Slice waves:

| Wave | Composition | Gap | Total HP | HP/s arriving | Bounty |
|---|---|---|---|---|---|
| 1 | 6 Raccoon | 1.5 s | 240 | 27 | 6 |
| 2 | 8 Raccoon | 1.5 s | 320 | 27 | 8 |
| 3 | 10 Gull | 1.2 s | 200 | 17 | 10 |
| 4 | 6 Raccoon, 1 Bear | 1.5 s | 440 | 42 | 11 |
| 5 | 14 Gull, 8 Raccoon | 1.0 s | 600 | 27 | 22 |
| 6 | 12 Raccoon, 3 Bear | 1.0 s | 1,080 | 72 | 27 |
| 7 | 20 Gull, 12 Raccoon | 0.8 s | 880 | 34 | 32 |
| 8 | 16 Raccoon, 14 Gull, 4 Bear | 0.7 s | 1,720 | 72 | 50 |

(HP/s arriving: total HP over the seconds it takes the wave to spawn.) **Waves 5-8 grew and
quickened** (2026-10-12): the first late waves (400-1,000 HP at 1.5 s) let the good bot
through with nothing stolen, because everything you deploy stays and a wave doesn't. The
charge (§4) makes each ray worth ~140 damage a wave; the late waves ask for roughly the fish a
good player has caught by then.

Starting money: **30**. Starting live well: empty. The first 45 s is fishing.

## 6. Bait lures (slice)

Cast a worm onto any road tile within the rod's cast. Raccoons and bears within 4 tiles
leave the road for it, eat for their eat time, then return to the road at the nearest point.
One lure feeds one thief at a time; the rest stand in line back along the road (0.7 tiles,
then 0.6 per animal, so they don't stack into one sprite). That's the stall. A lure costs one
worm, so luring competes with fishing.

**A lure holds 36 thief-seconds of eating**: §7's luring lesson has the one midpoint worm
stall each of wave 1's six raccoons for 6 s (or 3.6 bears' 10 s meals). Thieves already fed by
a lure aren't pulled by it again; a lure that runs out sends its line back to the road.

**Gulls swallow worms** (2026-10-12): gulls follow ploughs for worms. A gull within 2 tiles
of a worm swoops on it and swallows the whole lure, line or no line. **A lure spoils when the
wave ends** (worms left in the sun): lures are cast for a wave, at the right moment, not
placed once for the run. Together: in the gull-led waves (5, 7) a worm cast before the gulls
pass is a worm thrown away; cast it once they're through, ahead of the walkers.

The lure's reach is the rod's cast: tier 1 reaches road tiles 9 to 23 (15 tiles around the
dock's foot, §10).

## 7. Derived checks (these become pace tests)

**Wave 1, the intended lesson: deploy, don't sell.** Phase 1 yields ~2.7 fish on open sand
(~1.2 puffers, ~1.5 rays). Each puffer kills one raccoon outright (40 poison, 40 HP). A ray
beside a straight has ~5 road tiles in reach: a raccoon at 1.2 t/s spends ~4 s there, 16
damage plus chained hits on the next one in line, and the ray's 140 charge covers 3.5
raccoons, so in wave 1 a ray is limited by time in reach, not charge. Two leaks or three is
the expected result. **Measured** (200 seeds): deploy-all leaks **2.62**; selling everything
leaks **6.0**. The lesson is the live well's purpose.

**Wave 1, the luring lesson.** One worm at the road's midpoint beside a ray stalls each
raccoon 6 s in its reach and lines the others up behind for the chain. **Measured** over the
171 of 200 seeds whose layout has a ray: **3.04 → 0.77 leaks** with the lure. One worm cast on
the road instead of into the water is the best move of the first minute.

**Wave 3, gulls.** 10 gulls at 2.5 t/s cross a ray's 5-tile window in 2 s (8 damage each,
chained to two more at 4). Terrapins are useless (gulls fly); a worm on the road is swallowed;
a puffer kills a gull outright. **Measured**: three terrapins and nothing else leak **≥ 6**.

**Wave 4, the bear.** 200 HP at 0.7 t/s. A terrapin holds it 20 s and is cracked doing it:
inside two rays' reach that is 2 × 4 × 20 = 160 damage plus chains, and a worm adds 10 s
more. Raccoons behind it wait in the line (2 s each once the bear is through), bunched for the
chain. The surf rod has to be bought for terrapins, and the bounty alone pays for it only by
wave 4-6: that is the money decision (below).

**The late waves.** Before the charge and the quicker gaps, the good bot let nothing through
waves 5-8 even with the waves doubled, every kill on the road's first tiles: thieves arrive
one at a time, so a wall of rays kills each alone and wave size doesn't matter. With 140
charge a ray and gaps down to 0.7 s, the measured good run loses ~0.5 crates in wave 6 and
~0.3 in wave 8: the late waves press, they don't sweep.

**Money and selling.** Bounty for every thief is 166 a run; the shop is 100 plus worm packs.
The good bot deploys almost everything (34.8 of 35 fish) and buys the rod from bounty at
wave ~5.7, ending with **$78**. Selling fish until the bed is bought (1.6 sold) wins 37/40 with
12.3 crates; selling until the rod is bought (rod by wave 1.3) wins **5/40**. Sell-or-deploy is
a timing call whose outcomes are close, not a dominated choice. The terrapin is what the rod
buys: deploy every fish with the bed but never buy the rod, and the run wins **11/40**.

**The whole run, measured** (40 seeds): the good bot wins **36/40** with **14.6** crates;
deploy-with-bed-never-rod 11/40; deploy-all (no bed, no rod) 0/40, out of worms by wave 4;
sell-all 0/40, lost by wave 3 with $165 in hand.

Pace tests assert (floors say the lesson is there; ceilings say the game hasn't gone soft):
deploy-all leaks ≤ 3 in wave 1; sell-all leaks ≥ 5; one midpoint lure cuts leaks by ≥ 2 over
seeds with a ray; a terrapin-only wave 3 leaks ≥ 6; the good run wins ≥ 36/40 with 8-15
crates and ≤ $150 unspent; deploy-with-bed-never-rod wins ≤ 16/40; sell-all never wins.

How they are measured (`tests/pace.test.ts`): wave-1 lessons are means over 200 seeds, runs
over 40, because catches are rolls. The bots are in `src/sim/bot.ts`: deploy-all fishes the
best-rated tile it reaches and deploys every fish on the best tile; deploy-bed also buys the
worm bed; sell-all sells everything; "good" buys the bed then the rod, deploys every ray and
puffer (rays two tiles out, clear of claws), keeps up to three terrapins for the bears and
fishes the reeds for them, tops up worms from the shop, and lures into its rays' reach once
the gulls are past.

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
  tiles within 3 tiles, against 5 for a ray beside a straight. The kill zone is a place on
  the map, not a bonus; it is outside the tier-1 lure reach, so the first lures land on the
  straight by the dock and the bend pays off once the surf rod is bought.
- **Structure** for fishing (§3) is the dock and the reed clumps: one by the road's start,
  two east of the dock (tiles 24-25, inside the tier-1 cast) and a few along the bend and the
  point's shore. Terrapins bite only beside them.
- **The way out** (§5): from the road's end a path runs south through the woods (x 34) off
  the map's bottom edge; gulls leave straight north over the bay. Neither passes a slot, so a
  crate that leaves is gone unless the thief was already dying.

## 11. Readability (what the board must show at 1×)

Water in four tints: deep (open water), mid (the point's water), shallow, and the
**placeable shallows**, the lightest, with slot ticks at the tile corners. In deploy mode the
exact tiles that fish fits are lit; in lure mode the road tiles in reach glow pink.

A defender about to be eaten (2026-10-12, the critic's review): a fish's HP bar sits on
its side **away from the road** (above a fish north of it, below one south of it), so it never
covers a thief walking past; red and blinking under 35%. A fish
being clawed shakes, blinks white and has a red ripple, with claw scratches over it. A
terrapin being worried pulls into its shell and shakes. A spent ray is drawn at half strength,
and during a wave a gold bar under it shows the charge left. A thief that snatched a
pufferfish shudders with the puffed fish in its mouth, and green bubbles rise off it while
the poison works. Thieves in a line stand 0.7 tiles then 0.6 apart, so a line reads as a
line. A shock is a 1 px gold bolt for 4 frames: long enough to see, short enough not to hide
its target. Money floaters are skipped when the board is drawn smaller than the HUD (the top
bar counts the money).
