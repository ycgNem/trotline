# STYLE.md: how Trotline looks

**Status: PROVISIONAL.** The palette is Apollo, picked from the Milestone 0 six-sprite test
(`pixel-art/palette-test/contact_both.png`) and waiting for the owner's confirmation
(`DECISIONS.md`). If the owner picks otherwise, the roles below stay and only the colours change.

## Palette

Apollo by AdamCYounis, 46 colours, `src/data/palette.ts` (`APOLLO`, names in `C`). Every pixel
of every sprite and tile is an Apollo colour at full alpha; the export step refuses anything
else. Not Resurrect 64.

| Role | Colours (`C` names) |
|---|---|
| Outline, darkest ink | `ink` #090a14 |
| Water, deep to placeable | `abyss` `deep` `blue` `sky` `cyan` `ice`, crests in the next step up, `bone` only on placeable water |
| Grass and reeds | `moss` `leaf` `green` `lime` `sprout` `reed` |
| Earth: road, sand, wood, the ray, the terrapin's shell | `mud` `clay` `tan` `sand` `dune` `shell`, `bark` for gaps and the darkest wood |
| Warm accents (puffer, terrapin seams and rim, hat, latch) | `copper` `brass` `amber` `gold` |
| Greys: raccoon, gull mantle and hood, weathered boards | `night` `slate` `iron` `steel` `ash` `fog` `mist` `bone` |
| Reds and pinks (shirt, bobber, worms, the gull's bill) | `wine` `red` `ember`, `pink` `rose` |
| Black bear | `night` `slate` with an `iron` sheen, `tan`/`clay` muzzle |

Apollo's greys lean cool and slightly teal; it has no warm grey. Fur that should be warm is
drawn with the earth ramp, not the greys. **The mid greys (`steel` `ash` `fog`) belong to the
raccoon**: the bear is near-black (`night` `slate`), the gull is white with a dark mantle, and
nothing that sits on the road is mid-grey, so a grey blob on the road is always a raccoon.
The terrapin's shell is earth (`mud` `clay`) with `brass`/`amber` seams for that reason (the
critic could not tell a grey terrapin from a raccoon at 1x).

## Light, outline, shading

- One light, from the top-left. Lit tops get the next step up; the lower edge and far legs get
  the step down. Cel bands (2–3 steps per material), no pillow shading, no dithering on
  anything that moves.
- **Every creature and prop has a 1 px outside outline in `ink`** (4-neighbour), so it reads on
  any ground. Drawn after the outline, on purpose, so they stay one pixel wide: the angler's
  rod, the pufferfish's spines, the bobber's ripple, the smokehouse smoke.
- Tiles have no outline. Tile marks stay one pixel off the tile edge, so any two variants of a
  kind sit side by side without a seam.

## Water and the placeable rule

Four water values, one hue family, palest = shallowest:

| Tile | Base | Marks |
|---|---|---|
| `tile_placeable` | `ice` | `bone` crests, calm |
| `tile_shallow` | `cyan` | `ice` crests over `sky` troughs, a submerged stone or two |
| `tile_mid` | `blue` | `sky` crests over `deep` troughs |
| `tile_deep` | `deep` | `blue` crests, long `abyss` swells |
| `tile_reeds` | `cyan` | cordgrass and needlerush stems with water between them, a cattail |

**Placeable water is the palest water on the board** ("clear shallows"), with no overlay:
"pale = you can put a fish here". The sim only allows shallow tiles within reach of the road,
so placeable water is always shallow and this never contradicts depth. Reeds are visibly full,
so no fish goes there. The renderer adds the deploy-mode frames, the foam line where water
meets land, and a 1 px darker shelf line where water steps down.

## Readability (CLAUDE.md, checked at 1x and at the game's 2x)

- Placeable water vs ordinary water: pale ice vs cyan, a full value step.
- The road: the one warm, flat, mid-value surface (`tan` with `clay` patches and lit pebbles), no
  direction marks (it bends).
- A lure on the road: a pink worm with an ink outline on a dark dirt mound.
- Defenders on any water depth: outlined in ink, readable on placeable, shallow, mid and deep.
  The puffer is the saturated one (amber and gold, spines); the ray is the pale one (`shell`
  wings round a `tan` body and tail), so the two never read as the same fish.
- Defenders on the road: the terrapin is dark (`mud` shell, `brass` lattice, `amber` rim) on
  the mid `tan` road, a full value step below it and nothing like the grey raccoon.
- Thieves on road and grass: grey raccoon with a white face and black mask; laughing gull
  (white body, dark grey wings, black hood, red bill); black bear with a tan muzzle. Each is a
  different value from both grounds.

## Sizes, anchors, animation

16 px tiles. Thieves and defenders 12–26 px, outline included; buildings sit on whole-tile
footprints and may rise above them. Creatures face right (the game mirrors them). Anchors: the
feet for walkers, the waterline for fish, the trunk base for trees, bottom-centre for buildings,
`[0, 0]` for tiles and the worm bed.

| Name | Frame | Frames, fps | Notes |
|---|---|---|---|
| `raccoon` | 19x15 | 4, 8 | walk: contact, passing (body up 1 px), contact, passing |
| `gull` | 16x14 | 4, 8 | laughing gull; flap: up, glide, down, glide; the renderer lifts it 10 px |
| `bear` | 26x19 | 4, 6 | walk as the raccoon; head carried low in front of the shoulders |
| `puffer` | 14x12 | 2, 3 | idle: tail fin flick |
| `puffer_big` | 17x17 | 1 | blown up, spines out (a thief within 2.5 tiles) |
| `puffer_gulp` | 11x11 | 1 | the blown-up puffer face-on, anchor at its centre: in a retching thief's jaws (puffer_big hides a gull) |
| `ray` | 15x13 | 2, 3 | lesser electric ray swimming right, anchor (7, 8) as the puffer; a wave runs along the wings, the caudal swings |
| `turtle` | 17x14 | 2, 2 | Mississippi diamondback terrapin, on the road; **frame 0 tucked in** (shown while worried), frame 1 head and legs out |
| `angler` | 12x22 | 2 | 0 idle (rod upright), 1 fishing (rod tip at anchor + (5, -14)) |
| `worm` `bobber` | 10x7, 6x6 | 2 | wriggle; float / dip |
| `crate` `tree` `smokehouse` `wormbed` | 10x9, 20x28, 48x66, 32x14 | 1 | |
| `tile_*` | 16x16 | 4 variants, fps 0 | variant picked per tile by a hash |

## Real animals, real places

Laughing gull in breeding plumage (white body and tail, dark slate-grey mantle and wings
running into black tips, black hood with a white eye crescent, dark red bill). Raccoon (mask,
ringed tail). American black bear (black, brown muzzle, no shoulder hump). Pufferfish (round,
spines, eyes on top). Lesser electric ray, *Narcine bancroftii* (a nearly round disc, sandy tan
to brown with darker rings and blotches, small eyes at the front, pelvic fins behind, a short
thick tail with two dorsal fins and a rounded caudal; no whip tail, no pointed wings).
Mississippi diamondback terrapin (dark grey-brown shell with growth rings in every scute and
yellow-orange seams and margin, pale grey skin with dark speckles). Live oak with Spanish
moss; cordgrass, needlerush and cattails in the shallows. No fantasy species, and never a copy
of a sprite from any game or sheet: draw the real animal.

Lessons from the ray (2026-10-12), for any round flat creature: a round disc with a tail
pointing down the screen reads as a **mushroom** at 1x, the same disc angled reads as a
**drumstick**, and a disc that is one value all over reads as a **potato**. What reads as a
ray is the body plan: the creature facing right like everything else, wingspan across its
travel, and the thin flat fins a full value step paler than the thick body and tail between
them. High-contrast markings on the body read as a face (two dark spots) or one big eye (a
ring), so markings go on the fins and the eyes stay low-contrast (`mud` on `tan`).

## Art sources and pipeline

1. **pixel-art-studio first.** Every asset is a build script, `pixel-art/<family>/build.py`
   (`tiles`, `thieves`, `defenders`, `props`), drawing every pixel from character maps with
   `pixelstudio.py` through `pixel-art/_lib/trotart.py`. Run the script; it writes
   `src/art/<name>.png` (frames in one row, 1x, transparent) and `src/art/<name>.json`
   (`{frame, frames, anchor, fps}`), checks every pixel against Apollo, and leaves 8x/2x previews
   in `pixel-art/<family>/out/`. Never edit an exported PNG.
2. **PixelLab** only for what can't be drawn well by hand, within the session's generation cap;
   the spend goes in `PROGRESS.md`; the output is redrawn or cleaned to Apollo through a build
   script.
3. **Never SpriteCook.**

Look before shipping: the 8x preview, the 2x strip, the sprite on its grounds
(`python pixel-art/_check/onground.py` lays every defender and thief on the tiles it sits on,
placed as `renderer.ts` places it, at 1x and 3x, plus the retching thieves), and the game's
own frames (`npm run shots`, `e2e/out/shots/`).
