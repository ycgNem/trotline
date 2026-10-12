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
| Earth: road, sand, wood | `mud` `clay` `tan` `sand` `dune` `shell`, `bark` for gaps and the darkest wood |
| Warm accents (fish, hat, latch) | `copper` `brass` `amber` `gold` |
| Greys: raccoon, gull mantle, terrapin, weathered boards | `night` `slate` `iron` `steel` `ash` `fog` `mist` `bone` |
| Reds and pinks (shirt, bobber, worms) | `wine` `red` `ember`, `pink` `rose` |
| Black bear | `night` `slate` with an `iron` sheen, `tan`/`clay` muzzle |

Apollo's greys lean cool and slightly teal; it has no warm grey. Fur that should be warm is
drawn with the earth ramp, not the greys.

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
- Defenders on any water depth: warm fish (amber puffer; olive eel with a `sprout` belly and a
  `gold` eye) outlined in ink, readable on placeable, shallow, mid and deep.
- Thieves on road and grass: grey raccoon with a white face and black mask; white gull with
  black wingtips; black bear with a tan muzzle. Each is a different value from both grounds.

## Sizes, anchors, animation

16 px tiles. Thieves and defenders 12–26 px, outline included; buildings sit on whole-tile
footprints and may rise above them. Creatures face right (the game mirrors them). Anchors: the
feet for walkers, the waterline for fish, the trunk base for trees, bottom-centre for buildings,
`[0, 0]` for tiles and the worm bed.

| Name | Frame | Frames, fps | Notes |
|---|---|---|---|
| `raccoon` | 19x15 | 4, 8 | walk: contact, passing (body up 1 px), contact, passing |
| `gull` | 16x14 | 4, 8 | flap: up, glide, down, glide; the renderer lifts it 10 px |
| `bear` | 26x19 | 4, 6 | walk as the raccoon; head carried low in front of the shoulders |
| `puffer` | 14x12 | 2, 3 | idle: tail fin flick |
| `puffer_big` | 17x17 | 1 | blown up, spines out (a thief within 2.5 tiles) |
| `eel` | 20x8 | 3, 4 | swim: head still, a wave runs down to the tail |
| `turtle` | 17x14 | 2, 2 | diamondback terrapin, on the road |
| `angler` | 12x22 | 2 | 0 idle (rod upright), 1 fishing (rod tip at anchor + (5, -14)) |
| `worm` `bobber` | 10x7, 6x6 | 2 | wriggle; float / dip |
| `crate` `tree` `smokehouse` `wormbed` | 10x9, 20x28, 48x66, 32x14 | 1 | |
| `tile_*` | 16x16 | 4 variants, fps 0 | variant picked per tile by a hash |

## Real animals, real places

Herring gull (white, pale grey mantle, black wingtips, yellow bill). Raccoon (mask, ringed
tail). American black bear (black, brown muzzle, no shoulder hump). Pufferfish (round, spines,
eyes on top). American eel in its yellow phase (olive back, yellow belly). Diamondback terrapin
(grey shell, concentric rings in every scute, pale spotted skin; a brackish back bay). Live oak
with Spanish moss; cordgrass, needlerush and cattails in the shallows. No fantasy species, and
never a copy of a sprite from any game or sheet: draw the real animal.

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

Look before shipping: the 8x preview, the 2x strip, the sprite on its grounds, and the game's
own frames (`npm run shots`, `e2e/out/shots/`).
