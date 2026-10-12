"""Trotline defenders: src/art/puffer, puffer_big, puffer_gulp, ray, turtle (1 px ink outline).

puffer      14x12, 2-frame idle (tail and fin flick), fps 3, anchor at the waterline centre.
            Seen from above: round, both eyes on top, spines all round, amber with copper spots.
puffer_big  17x17, 1 frame: blown up to a ball, spines standing out; shown when a thief is near.
puffer_gulp 11x11, 1 frame, anchor at the centre: the same blown-up puffer, small enough to sit
            in a thief's jaws while it retches. Face-on (both eyes, the beak between them) so it
            reads the same whichever way the thief faces; the renderer does not mirror it.
ray         15x13, 2-frame idle, fps 3, anchor (7, 8) (centred on its tile as the puffer is).
            Lesser electric ray (Narcine bancroftii) from above, swimming right: a nearly
            round disc (9 long, 11 across) whose thin wings are pale (shell lit, dune in shadow)
            round a thick tan body with two small mud eyes at its front, a clay ring and a clay
            blotch on the wings, pale pelvic lobes behind, a short thick tail (two dark
            dorsal fins) ending in a fan of a caudal. Frame 1: a wave runs along the wings
            and the caudal swings (electric rays swim with the tail, not the disc).
turtle      17x14, 2-frame idle, fps 2, anchor at the feet (it sits on the road). Mississippi
            diamondback terrapin: dark mud/clay shell with growth rings in every scute, brass
            and amber seams and margin, pale skin with dark speckles. Frame 0 is TUCKED IN
            (head and legs pulled in: the renderer shows it while a walker worries the
            terrapin); frame 1 has the head, legs and tail out.
Run: python pixel-art/defenders/build.py
"""
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "_lib"))
from trotart import C, new, stamp, outline, export, frames_of, board, ART  # noqa: E402

from PIL import Image  # noqa: E402

OUT = HERE / "out"

# ---------------------------------------------------------------------------------- puffer
PUFFER = [
    "..............",
    "..............",
    "......LLLL....",
    ".....LLLBBB...",
    "..f.LLBsBEeB..",
    ".ffBLBBBBsBB..",
    ".ffBBsBBBBBD..",
    "..f.BBBBsEeD..",
    ".....bbBBDD...",
    "......bbbb....",
    "..............",
    "..............",
]
PUFFER_FLICK = {  # frame 1: the tail fin fans the other way, a pectoral fin shows
    (2, 4): ".", (1, 4): "f", (1, 5): ".", (2, 5): "f", (1, 6): ".", (2, 6): "f", (2, 7): ".", (1, 7): "f",
}
PUFFER_SPINES = [(5, 0), (8, 0), (3, 2), (11, 2), (13, 4), (13, 7), (3, 9), (11, 9), (5, 11), (8, 11)]
PUFFER_BEAK = [(12, 5), (12, 6)]
PUFFER_LEGEND = {"L": "gold", "B": "amber", "D": "brass", "s": "copper", "b": "shell", "e": "ink",
                 "E": "bone", "f": "gold"}


def puffer():
    s = new(14, 12, 2)
    for f in range(2):
        s.frame(f + 1)
        rows = [list(r) for r in PUFFER]
        if f == 1:
            for (x, y), ch in PUFFER_FLICK.items():
                rows[y][x] = ch
        stamp(s, ["".join(r) for r in rows], PUFFER_LEGEND)
        outline(s)
        for x, y in PUFFER_SPINES:
            s.px(x, y, C["ink"])
        for x, y in PUFFER_BEAK:
            s.px(x, y, C["shell"])
    return s


def puffer_big():
    """Blown up: a 13 px ball, spines standing out two pixels all round."""
    s = new(17, 17, 1)
    cx, cy, r = 8, 8, 6
    for y in range(17):
        for x in range(17):
            d = math.hypot(x - cx, y - cy)
            if d <= r + 0.3:
                # light from the top-left; belly (shell) on the bottom quarter
                lx, ly = (x - cx) / r, (y - cy) / r
                lit = -lx * 0.6 - ly * 0.8
                col = "gold" if lit > 0.45 else "amber" if lit > -0.45 else "brass"
                if ly > 0.55:
                    col = "shell" if lit > -0.6 else "dune"
                s.px(x, y, C[col])
    for x, y in [(6, 5), (10, 4), (5, 9), (8, 8), (11, 9), (7, 12)]:   # spots
        s.px(x, y, C["copper"])
    for x, y in [(4, 4), (12, 4), (3, 8), (13, 8), (5, 13), (11, 13), (8, 3), (8, 13)]:  # spine bases
        s.px(x, y, C["shell"])
    for x, y in [(11, 6), (11, 10)]:   # eyes on top, bone ring behind each
        s.px(x, y, C["ink"])
        s.px(x - 1, y, C["bone"])
    s.px(2, 7, C["gold"]); s.px(2, 8, C["gold"]); s.px(2, 9, C["gold"])   # tail stub
    outline(s)
    for a in range(12):   # spines: two pixels out from the outline at 12 angles
        ang = a * math.pi / 6 + math.pi / 12
        for k in (r + 2, r + 2.9):
            x, y = round(cx + math.cos(ang) * k), round(cy + math.sin(ang) * k)
            if 0 <= x < 17 and 0 <= y < 17 and s.get(x, y) is None:
                s.px(x, y, C["ink"])
    s.px(15, 8, C["shell"])   # the beak
    return s


# A blown-up puffer seen face-on, small enough for a raccoon's jaws: a 7 px ball (gold lit
# top-left, amber, brass in shadow, a shell belly), both eyes with a bone ring, the shell beak
# between them, spines one pixel out from the outline at eight points.
GULP = [
    "...........",
    "...........",
    "....LLB....",
    "...LLBBB...",
    "..LEeBeEB..",
    "..LBBsBBD..",
    "..BBBbBDD..",
    "...ssBDD...",
    "....sss....",
    "...........",
    "...........",
]
GULP_LEGEND = {"L": "gold", "B": "amber", "D": "brass", "s": "shell", "b": "shell", "e": "ink",
               "E": "bone"}
GULP_SPINES = [(5, 0), (0, 5), (10, 5), (5, 10), (2, 2), (8, 2), (2, 8), (8, 8)]


def puffer_gulp():
    s = new(11, 11, 1)
    stamp(s, GULP, GULP_LEGEND)
    s.px(5, 5, C["copper"])        # a spot on the brow between the eyes
    outline(s)
    for x, y in GULP_SPINES:
        s.px(x, y, C["ink"])
    return s


# ---------------------------------------------------------------------------------- ray
# Lesser electric ray from above, swimming right (the game mirrors it). What makes it read as
# a ray and not a round blob is the body plan: a thick body down the middle (sand, a couple
# of tan spots, the two small eyes at its front) running back into the tail, flanked by the
# thin flat fins, the disc's wings (wider than the disc is long, as in the animal) and the
# pelvic lobes behind it, pale shell where the light catches them and dune on the shadow
# side. The body is a full value step darker than the wings (tan, clay in shadow): with only
# a dune/sand split the whole ray read as one potato at 3x.
# Tail-down versions read as a mushroom at 1x and a diagonal one as a drumstick
# (pixel-art/defenders/build.py history, 2026-10-12). Frame 0; frame 1 is RAY_RIPPLE applied.
#   W shell (wings, lit)   D dune (wings, shadow side)   S tan (body)   T clay (body shadow,
#   spots and blotches, tail underside, caudal)   L sand (tail, lit)   c clay (a ring on
#   the lower wing; on the body it read as one big eye)
#   m mud (the two dorsal fins, dark, edge-on)   e mud (the eyes: ink made a face)
RAY = [
    "...............",
    ".......WWWWW...",
    "......WWWTTWW..",
    "...WW.WWWWTWW..",
    ".T..WWWSSSSWWW.",
    ".TLLLWSSTSSeSW.",
    ".TmSmSSSSSSSSD.",
    ".TTTTWSTSSSeSD.",
    ".T..DWWTTTTDDD.",
    "...DD.cccWWDD..",
    "......cWcWDDD..",
    ".......ccDDD...",
    "...............",
]
# frame 1: a wave runs along the wings (the upper wing's edge moves forward a pixel, the
# lower wing's back a pixel) and the caudal fin swings down a pixel.
RAY_RIPPLE = {
    (7, 1): ".", (12, 1): "W",
    (11, 11): ".", (6, 11): "W",
    (1, 4): ".", (1, 9): "T",
}
RAY_LEGEND = {"W": "shell", "D": "dune", "S": "tan", "T": "clay", "L": "sand", "c": "clay",
              "m": "mud", "e": "mud"}


def ray():
    s = new(15, 13, 2)
    for f in range(2):
        s.frame(f + 1)
        rows = [list(r) for r in RAY]
        if f == 1:
            for (x, y), ch in RAY_RIPPLE.items():
                rows[y][x] = ch
        stamp(s, ["".join(r) for r in rows], RAY_LEGEND)
        outline(s)
    return s


# ---------------------------------------------------------------------------------- turtle
# Mississippi diamondback terrapin from above-ish, facing right. The shell (x2..12, y2..9) is
# a hand map: three vertebral scutes down the crest (clay, the dome's lit band, each with a
# tan areola), two costals above and two below (mud, each with an areola: tan where lit, clay
# in shadow), brass seams (amber where the light catches them, top-left), and the margin in
# amber on top, brass at the sides, copper along the shadowed lower rim, with mud and rust
# ticks between the marginal scutes. Skin mist and fog with night speckles.
SHELL = [
    "...AAmAA...",
    ".AmmmAmmmA.",
    "AmmtmAmtmmA",
    "BctActcBtcB",
    "BccBcccBccB",
    "KmmcmBmcmmK",
    ".KmmmBmmmK.",
    "...KKrKK...",
]
SHELL_LEGEND = {"A": "amber", "B": "brass", "K": "copper", "m": "mud", "c": "clay", "t": "tan",
                "r": "rust"}
# Frame 0, tucked: only the beak tip at the shell's front and the near feet's claws show.
# Frame 1, out: head on its neck, four legs, the tail.
TURTLE_SKIN = [
    dict(head=[(13, 5, "W"), (13, 6, "w")],
         legs=[(11, 10), (3, 10)],
         tail=[], spots=[]),
    dict(head=[(12, 4, "W"), (13, 4, "W"), (14, 4, "W"), (12, 5, "W"), (13, 5, "s"), (14, 5, "e"), (15, 5, "W"),
               (12, 6, "w"), (13, 6, "w"), (14, 6, "s"), (15, 6, "w")],
         legs=[(11, 1), (12, 1), (2, 1), (3, 1), (10, 10), (11, 10), (11, 11), (3, 10), (2, 10), (2, 11)],
         tail=[(1, 6)], spots=[(12, 1), (2, 10), (11, 11)]),
]


def shell(s):
    stamp(s, SHELL, SHELL_LEGEND, 2, 2)


def turtle():
    s = new(17, 14, 2)   # 17 wide: frame 1's head pokes out to x15, its outline at x16
    for f, skin in enumerate(TURTLE_SKIN):
        s.frame(f + 1)
        for x, y in skin["legs"] + skin["tail"]:
            s.px(x, y, C["mist"])
        for x, y in skin["spots"]:
            s.px(x, y, C["night"])
        if f == 1:
            s.px(11, 5, C["mist"]); s.px(11, 6, C["fog"])   # neck under the shell's front
        for x, y, k in skin["head"]:
            s.px(x, y, C[{"W": "mist", "w": "fog", "e": "ink", "s": "night"}[k]])
        shell(s)
        outline(s)
    return s


def tiled(tile, n=2):
    bg = Image.new("RGBA", (16 * n, 16 * n))
    for yy in range(n):
        for xx in range(n):
            bg.alpha_composite(tile, (xx * 16, yy * 16))
    return bg


if __name__ == "__main__":
    p, pb, pg = puffer(), puffer_big(), puffer_gulp()
    ry, t = ray(), turtle()
    export("puffer", p, (7, 8), 3, OUT)
    export("puffer_big", pb, (8, 11), 1, OUT)
    export("puffer_gulp", pg, (5, 5), 1, OUT)
    export("ray", ry, (7, 8), 3, OUT)
    export("turtle", t, (7, 11), 2, OUT)
    ry.save_silhouette(str(OUT / "ray_silhouette.png"))
    # working view: fish on placeable / shallow / mid / deep, the terrapin on the road, 3x.
    # A defender's anchor sits at its tile's (8, 10) in the game (water) or (8, 12) (road).
    tiles = {k: Image.open(ART / ("tile_%s.png" % k)).crop((0, 0, 16, 16))
             for k in ("placeable", "shallow", "mid", "deep", "road")}
    items = []
    for name, spr, anchor in (("puffer", p, (7, 8)), ("big", pb, (8, 11)), ("ray", ry, (7, 8))):
        for k in ("placeable", "shallow", "mid", "deep"):
            bg = tiled(tiles[k])
            bg.alpha_composite(frames_of(spr)[0], (8 + 8 - anchor[0], 8 + 10 - anchor[1]))
            items.append(("%s %s" % (name, k[:4]), bg))
    for i, fr in enumerate(frames_of(t)):
        bg = tiled(tiles["road"])
        bg.alpha_composite(fr, (8 + 8 - 7, 8 + 12 - 11))
        items.append(("terrapin %d" % i, bg))
    board(items[:8], OUT / "check_fish_a.png", 3)
    board(items[8:], OUT / "check_fish_b.png", 3)
