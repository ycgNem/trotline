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

Zones in the slice: **dock shallows** (reachable at rod tier 1) and **the point** (needs cast
range tier 2). Bait: **worm** only in the slice (chum arrives in Milestone 3).

| Species | Zone | Band | Base rate /min (worm) | Size | Sell |
|---|---|---|---|---|---|
| Pufferfish | shallows | surface | 2.0 | small | 10 |
| Eel | shallows, point | bottom | 1.0 | medium | 25 |
| Turtle | point | surface | 0.5 | large | 15 |

Rod tier 1: reel ×1.0, range = shallows, line = medium (turtles need tier 2, cost 60).
Live well: 6 slots. Bait works: worms, 1 per 10 s, 5 money each batch of 3 (slice: a worm
bed you buy once for 40 and that produces on its own).

**Derived**: in one 45 s build phase at tier 1 in the shallows you expect ~1.5 pufferfish and
~0.75 eels: two or three fish. That is the whole early economy, by design: scarcity makes
sell-or-deploy a real decision. Over 8 waves at tier 1 you catch ~20 fish; a tier-2 rod by
wave 3 roughly doubles it and opens turtles.

## 4. Defenders (slice)

| Fish | Place on | HP | Action | Numbers |
|---|---|---|---|---|
| Pufferfish | water tile ≤ 1 from road, or bucket | 10 | explodes when a thief is within 1 tile; one use | 30 damage in radius 1.5 |
| Eel | water tile ≤ 2 from road | 20 | zaps nearest thief within 3 tiles, chains to 2 more at 50% | 4 damage/s, 0.5 s pulse |
| Turtle | the road itself | 100 | blocks; thieves stop and chew (5 dmg/s each) | gulls fly over it |

Defenders in water regenerate 1 HP/s between waves. A defender killed is a fish lost.
Variants (big, rare, golden) arrive with the catch log in Milestone 4: ×1.5 stats, rarer rates.

## 5. Thieves (slice)

| Thief | HP | Speed | Crates stolen | Bounty | Behavior |
|---|---|---|---|---|---|
| Gull | 20 | 2.5 t/s | 1 | 3 | flies: ignores turtles, pulled by chum (not worms) |
| Raccoon | 40 | 1.2 t/s | 1 | 8 | pulled hard by worms; eats a lure for 6 s |
| Bear | 200 | 0.7 t/s | 5 | 40 | pulled by any bait, eats a lure for 10 s |

Smokehouse starts with **20 crates**. At 0 the run ends. A thief that reaches the smokehouse
takes its crates and leaves by the road (killing it on the way back recovers the crates: the
bass's job in Milestone 4, and the eel's chance in the slice).

Road length 40 tiles, spawns 1.5 s apart. Slice waves:

| Wave | Composition | Total HP | Bounty |
|---|---|---|---|
| 1 | 6 Raccoon | 240 | 48 |
| 2 | 8 Raccoon | 320 | 64 |
| 3 | 10 Gull | 200 | 30 |
| 4 | 6 Raccoon, 1 Bear | 440 | 88 |
| 5 | 12 Gull, 4 Raccoon | 400 | 68 |
| 6 | 8 Raccoon, 2 Bear | 720 | 144 |
| 7 | 16 Gull, 6 Raccoon | 560 | 96 |
| 8 | 10 Raccoon, 10 Gull, 2 Bear | 1,000 | 190 |

Starting money: **30**. Starting live well: empty. The first 45 s is fishing.

## 6. Bait lures (slice)

Cast a worm onto any road tile within rod range (shallows reach = the first 15 tiles of road).
Thieves of a matching species within 4 tiles leave the road for it, eat for their eat time,
then return to the road at the nearest point. One lure feeds one thief at a time; a queue
forms (that's the stall). A lure costs one bait, so luring competes with fishing for worms.

## 7. Derived checks (these become pace tests)

**Wave 1, the intended lesson: deploy, don't sell.** Phase 1 yields ~2 fish (expected: 1–2
pufferfish, 0–1 eel). 6 raccoons = 240 HP. Raccoons are spaced ~1.8 tiles apart, so each
pufferfish usually hits one: two pufferfish take two raccoons to 10 HP. An eel beside the road
has ~5 tiles of a raccoon's path in range → 4 s × 4 dmg/s = 16 per raccoon, chained to two
more at 8. The eel finishes the two wounded raccoons and leaves the other four at ~24–32 HP.
Nothing clears wave 1 with zero leaks; **two or three leaks is the expected result**, costing 2–3 of
20 crates, and the bounty (up to 48) buys the worm bed. Selling the fish instead (≤ 45 money)
means ~6 leaks. The lesson is the live well's purpose.

**Wave 1, the luring lesson.** One worm lure at the road's midpoint beside the eel stalls each
raccoon for 6 s inside the eel's range: 6 s × 4 dmg/s = 24 extra damage each, which with the
pufferfish turns 2–3 leaks into 0–1. One worm, cast on the road instead of into the water,
is the single best move in the game's first minute. The tutorial card says exactly that.

**Wave 3, gulls teach the eel over the pufferfish.** 10 gulls at 2.5 t/s cross an eel's 5-tile
window in 2 s: 8 damage each, chain to 3 → the eel handles ~3 gulls per pass; two eels and a
pufferfish clear it. Turtles are useless here (gulls fly). Worm lures don't pull gulls. The
player who stacked turtles after wave 2 leaks.

**Wave 4, the bear teaches the turtle and the stall.** 200 HP at 0.7 t/s. A turtle costs it
20 s of chewing (100 HP ÷ 5 dmg/s), inside eel range: 80 damage. A worm lure adds 10 s: 40
more. Two eels, a turtle and one lure kill it on the road. The tier-2 rod (60 money) must be
bought by wave 3 to have caught a turtle, which the wave 1–2 bounty (112) affords with the
worm bed (40). The money model closes.

Pace tests assert: deploy-all layout leaks ≤ 3 in wave 1; sell-all leaks ≥ 5; one midpoint
lure cuts wave-1 leaks by ≥ 2; a turtle-only wave 3 leaks ≥ 6; the scripted "good" run reaches
wave 8 with ≥ 8 crates.

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
