"""Trotline defenders: src/art/puffer, puffer_big, eel, turtle (facing right, 1 px ink outline).

puffer      14x12, 2-frame idle (tail and fin flick), fps 3, anchor at the waterline centre.
            Seen from above: round, both eyes on top, spines all round, amber with copper spots.
puffer_big  17x17, 1 frame: blown up to a ball, spines standing out; shown when a thief is near.
eel         20x8, 3-frame swim, fps 4, anchor at the waterline centre. Yellow-phase American
            eel: dark leaf-green back, clay flank, sprout-yellow belly, gold eye; the head stays
            still and a wave runs down the body to the tail.
turtle      17x14, 2-frame idle, fps 2, anchor at the feet (it sits on the road). Diamondback
            terrapin: grey shell with concentric rings in every scute, pale spotted skin.
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


# ---------------------------------------------------------------------------------- eel
EEL_HEAD = [   # x15..18, rows 1..4: the head stays still; eye high, pointed snout, jaw
    "DD..",
    "BeDD",
    "BBBb",
    "bbb.",
]
EEL_PEC = (14, 4)   # the pectoral fin just behind the head, below the body line
# The body's centre row for x = 1..14 in each frame: a wave runs from the head to the tail,
# swinging wider toward the tail (frame 0 is the palette test's eel).
EEL_CENTRE = [
    [2.0, 2.5, 3.5, 4.0, 5.0, 5.0, 5.0, 5.0, 4.0, 3.0, 3.0, 2.0, 2.0, 2.0],
    [4.5, 4.5, 4.5, 5.0, 4.5, 4.0, 3.0, 2.0, 2.0, 2.0, 2.5, 3.0, 3.0, 2.5],
    [2.0, 2.0, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0],
]


def eel_maps():
    maps = []
    for centres in EEL_CENTRE:
        grid = [["."] * 20 for _ in range(8)]
        for x, yc in enumerate(centres, start=1):
            t = 1 if x == 1 else 2 if x <= 3 else 3
            top = math.floor(yc - (t - 1) / 2 + 0.5)
            roles = ["f"] if t == 1 else ["D", "b"] if t == 2 else ["D", "B", "b"]
            for i, ch in enumerate(roles):
                grid[top + i][x] = ch
        for j, row in enumerate(EEL_HEAD):
            for i, ch in enumerate(row):
                if ch != ".":
                    grid[1 + j][15 + i] = ch
        grid[EEL_PEC[1]][EEL_PEC[0]] = "p"
        maps.append(["".join(r) for r in grid])
    return maps


EEL_LEGEND = {"D": "leaf", "B": "clay", "b": "sprout", "e": "gold", "f": "clay", "p": "clay"}


def eel(maps):
    s = new(20, 8, len(maps))
    for f, rows in enumerate(maps):
        s.frame(f + 1)
        stamp(s, rows, EEL_LEGEND)
        outline(s)
    return s


# ---------------------------------------------------------------------------------- turtle
# Diamondback terrapin from above-ish, facing right. Shell: three vertebral scutes along the
# middle and costals above and below, each a ring (ash) round a dark centre (iron), grooves in
# iron, the rim's lower edge in slate; skin mist with slate spots.
SHELL_C = (7.0, 5.5)            # shell centre; the shell is an ellipse x2..12, y2..9
SHELL_R = (5.4, 4.1)
SCUTES = [(4.0, 5.5), (7.0, 5.5), (10.0, 5.5),           # vertebrals down the middle
          (5.5, 3.0), (8.5, 3.0), (5.5, 8.0), (8.5, 8.0)]  # costals above and below
# skin parts per frame: legs at the four corners (far legs on top, near legs below), the
# tail, the head on its neck. Frame 1: head out a pixel, legs paddled.
TURTLE_SKIN = [
    dict(head=[(12, 4, "W"), (13, 4, "W"), (12, 5, "W"), (13, 5, "e"), (14, 5, "W"), (12, 6, "s"), (13, 6, "W"), (14, 6, "w")],
         legs=[(10, 1), (11, 1), (3, 1), (2, 1), (10, 10), (11, 10), (11, 11), (3, 10), (2, 10), (2, 11)],
         tail=[(1, 6)], spots=[(11, 1), (2, 10), (11, 11)]),
    dict(head=[(12, 4, "W"), (13, 4, "W"), (14, 4, "W"), (12, 5, "W"), (13, 5, "W"), (14, 5, "e"), (15, 5, "W"), (12, 6, "s"), (13, 6, "W"), (14, 6, "W"), (15, 6, "w")],
         legs=[(11, 1), (12, 1), (2, 1), (3, 1), (9, 10), (10, 10), (10, 11), (4, 10), (3, 10), (3, 11)],
         tail=[(1, 6)], spots=[(12, 1), (3, 10), (10, 11)]),
]


def shell(s):
    cx, cy = SHELL_C
    rx, ry = SHELL_R
    for y in range(14):
        for x in range(17):
            e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if e > 1.0:
                continue
            if e > 0.72:
                # the rim (marginal scutes): lit ash on top, steel at the sides, the lower rim
                # (the shell's side, seen in 3/4) in slate shadow; iron ticks between scutes
                col = "ash" if y < cy - 1 else "slate" if y > cy + 1 else "steel"
                if x % 3 == 0:
                    col = "iron"
                s.px(x, y, C[col])
                continue
            ds = sorted(abs(x - a) + abs(y - b) for a, b in SCUTES)
            if ds[1] - ds[0] < 1.0:
                col = "iron"                       # the groove between scutes
            else:
                # concentric growth rings: dark centre, a light ring round it, steel, light
                ring = int(ds[0])
                col = ["iron", "ash", "steel", "ash"][min(ring, 3)]
                if col == "ash" and x <= cx and y <= cy:
                    col = "fog"                    # rings lit from the top-left
            s.px(x, y, C[col])


def turtle():
    s = new(17, 14, 2)   # 17 wide: frame 1's head pokes out to x15, its outline at x16
    for f, skin in enumerate(TURTLE_SKIN):
        s.frame(f + 1)
        for x, y in skin["legs"] + skin["tail"]:
            s.px(x, y, C["mist"])
        for x, y in skin["spots"]:
            s.px(x, y, C["slate"])
        s.px(11, 5, C["mist"]); s.px(11, 6, C["fog"])   # neck under the shell's front
        for x, y, k in skin["head"]:
            s.px(x, y, C[{"W": "mist", "w": "fog", "e": "ink", "s": "slate"}[k]])
        shell(s)
        outline(s)
    return s


if __name__ == "__main__":
    p, pb = puffer(), puffer_big()
    em = eel_maps()
    print("\n".join("\n".join(m) + "\n" for m in em))
    e = eel(em)
    export("puffer", p, (7, 8), 3, OUT)
    export("puffer_big", pb, (8, 11), 1, OUT)
    export("eel", e, (10, 5), 4, OUT)
    t = turtle()
    export("turtle", t, (7, 11), 2, OUT)
    # working view: fish on placeable / shallow / mid / deep, the terrapin on the road, 3x
    tiles = {k: Image.open(ART / ("tile_%s.png" % k)).crop((0, 0, 16, 16))
             for k in ("placeable", "shallow", "mid", "deep", "road")}
    items = []
    for name, spr, anchor in (("puffer", p, (7, 8)), ("big", pb, (8, 11)), ("eel", e, (10, 5))):
        for k in ("placeable", "shallow", "mid", "deep"):
            bg = Image.new("RGBA", (32, 32))
            for yy in (0, 16):
                for xx in (0, 16):
                    bg.alpha_composite(tiles[k], (xx, yy))
            fr = frames_of(spr)[0]
            bg.alpha_composite(fr, (16 - anchor[0], 18 - anchor[1]))
            items.append(("%s %s" % (name, k[:4]), bg))
    for i, fr in enumerate(frames_of(t)):
        bg = Image.new("RGBA", (32, 32))
        for yy in (0, 16):
            for xx in (0, 16):
                bg.alpha_composite(tiles["road"], (xx, yy))
        bg.alpha_composite(fr, (16 - 7, 20 - 11))
        items.append(("terrapin %d" % i, bg))
    board(items[:8], OUT / "check_fish_a.png", 3)
    board(items[8:], OUT / "check_fish_b.png", 3)
