"""Trotline thieves: src/art/raccoon, gull, bear (frames facing right, 1 px ink outline).

raccoon  18x15, 4-frame walk, fps 8, anchor at the feet. Grey (Apollo's steel/ash/fog), the
         black mask through the eye with white brow and muzzle, ringed tail held low.
gull     16x14, 4-frame flap (up, glide, down, glide), fps 8, anchor under the body: laughing
         gull, white body, dark grey mantle and wings, black wingtips, black hood with a white
         eye crescent, dark red bill. The renderer lifts it.
bear     26x19, 4-frame walk, fps 6, anchor at the feet: American black bear, black coat with
         a slate sheen on the back, the brown muzzle, round ears, no shoulder hump.

Walk cycles: frames 0 and 2 are contacts (near legs forward/back), 1 and 3 passing with the
body one pixel up. Run: python pixel-art/thieves/build.py
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "_lib"))
from trotart import C, new, stamp, outline, export, frames_of, board, up  # noqa: E402

OUT = HERE / "out"


def legs(s, specs, top, ground, phase):
    """specs: (x, width, colour, foot colour, swing) per leg; swing +1 swings forward in
    phase 0 and back in phase 2 (0 for passing frames)."""
    for x, w, col, foot, swing in specs:
        off = swing * phase
        for y in range(top, ground + 1):
            # the leg slants: the top stays under the body, the foot carries the offset
            k = (y - top) / max(1, ground - top)
            xx = x + round(off * k)
            for i in range(w):
                s.px(xx + i, y, C[foot if y == ground else col])


# ---------------------------------------------------------------------------------- raccoon
# Tail held out behind: bands across it, dark tip, dark ring, dark ring at the root.
RACCOON_BODY = [
    ".............W.W...",
    ".........LL..dFd...",
    ".......LLLLLLFFFF..",
    "......LFFFFFFFWWWW.",
    "..tTtTFFFFFFFFMeMW.",
    ".TtTtTFFFFFFFWMMWN.",
    "..tTt.DFFFFFFWWWW..",
    "......DDFFFFDDW....",
    ".......dDDDDDd.....",
]
RACCOON_LEGEND = {"L": "fog", "F": "steel", "D": "iron", "d": "slate", "M": "ink", "W": "mist",
                  "e": "fog", "N": "ink", "T": "slate", "t": "fog"}
# (x, width, colour, foot, swing): far legs first (darker, 1 px), near legs over them
RACCOON_LEGS_FAR = [(9, 1, "slate", "ink", -2), (12, 1, "slate", "ink", 2)]
RACCOON_LEGS_NEAR = [(7, 2, "iron", "slate", 2), (13, 2, "iron", "slate", -2)]


def raccoon():
    s = new(19, 15, 4)
    for f in range(4):
        s.frame(f + 1)
        bob = 0 if f % 2 == 0 else -1
        phase = [1, 0, -1, 0][f]
        stamp(s, RACCOON_BODY, RACCOON_LEGEND, 0, 2 + bob)   # body rows 2..10 (1..9 on bob)
        legs(s, RACCOON_LEGS_FAR, 11 + bob, 13, phase)
        legs(s, RACCOON_LEGS_NEAR, 11 + bob, 13, phase)
        outline(s)
    return s


# ---------------------------------------------------------------------------------- gull
# Laughing gull in breeding plumage, flying right: white body and tail, a dark slate-grey
# mantle and wings (steel, iron where the wing turns away or is the far one), black (ink)
# wingtips that run into the grey, a black hood (slate inside the ink outline) with a white
# nape between it and the mantle, the dark red bill two pixels long. W bone, w mist (the
# white's shadow side), H hood, o the white eye crescent, R bill.
GULL = {
    "up": [
        "................",
        ".KKK............",
        "..KKKGG.........",
        "....GGGGg.......",
        ".....GGGg.......",
        "......gGg.HHo...",
        "..W.....gWHHHRR.",
        ".WWWWWWWWWWWW...",
        "..wwWWWWWWWww...",
        ".....wwwwww.....",
        "................",
        "................",
        "................",
        "................",
    ],
    "glide": [
        "................",
        "................",
        "................",
        "................",
        "................",
        "....gggg..HHo...",
        ".KKKGGGGGWHHHRR.",
        ".WWWWWWWWWWWW...",
        "..wwWWWWWWWww...",
        ".....wwwwww.....",
        "................",
        "................",
        "................",
        "................",
    ],
    "down": [
        "................",
        "................",
        "................",
        "................",
        "................",
        "..........HHo...",
        "..WGGGGGGWHHHRR.",
        ".WWWWWWWWWWWW...",
        "..wwWGGGGGWww...",
        "....GGGGGww.....",
        "...GGGGg........",
        "..KKGg..........",
        ".KKK............",
        "................",
    ],
}
GULL_LEGEND = {"W": "bone", "w": "mist", "G": "steel", "g": "iron", "K": "ink", "H": "slate",
               "o": "bone", "R": "red"}


def gull():
    s = new(16, 14, 4)
    for f, key in enumerate(["up", "glide", "down", "glide"]):
        s.frame(f + 1)
        stamp(s, GULL[key], GULL_LEGEND)
        outline(s)
    return s


# ---------------------------------------------------------------------------------- bear
# Body: a rounded rump, a level back, the belly sagging; the head is its own map, carried a
# row lower than the back in front of the shoulders, with the long tan muzzle.
BEAR_BODY = [
    "......LLLLLL......",
    "...LLLFFFFFFLLLL..",
    "..LFFFFFFFFFFFFFL.",
    ".LFFFFFFFFFFFFFFFF",
    "tFFFFFFFFFFFFFFFFF",
    ".FFFFFFFFFFFFFFFFF",
    ".DFFFFFFFFFFFFFFFD",
    ".DDFFFFFFFFFFFFFDD",
    "..DDDFFFFFFFFFDDD.",
    "....DDDDDDDDDDD...",
]
BEAR_HEAD = [
    ".LL.LL..",
    "LFFLFFL.",
    "FFFFFFF.",
    "FFFeFMMN",
    "DFFFFMMm",
    ".DDFmmm.",
]
BEAR_LEGEND = {"L": "iron", "F": "slate", "D": "night", "t": "slate", "e": "ash",
               "M": "tan", "m": "clay", "N": "ink"}
BEAR_LEGS_FAR = [(7, 2, "night", "ink", -2), (14, 2, "night", "ink", 2)]
BEAR_LEGS_NEAR = [(3, 3, "slate", "night", 2), (16, 3, "slate", "night", -2)]


def bear():
    s = new(26, 19, 4)
    for f in range(4):
        s.frame(f + 1)
        bob = 0 if f % 2 == 0 else -1
        phase = [1, 0, -1, 0][f]
        stamp(s, BEAR_BODY, BEAR_LEGEND, 1, 2 + bob)          # body rows 2..11
        stamp(s, BEAR_HEAD, BEAR_LEGEND, 17, 4 + bob)         # head rows 4..9, nose at x24
        legs(s, BEAR_LEGS_FAR, 12 + bob, 17, phase)
        legs(s, BEAR_LEGS_NEAR, 12 + bob, 17, phase)
        outline(s)
    return s


if __name__ == "__main__":
    r, g, b = raccoon(), gull(), bear()
    export("raccoon", r, (10, 13), 8, OUT)
    export("gull", g, (8, 9), 8, OUT)
    export("bear", b, (13, 17), 6, OUT)
    # working view: each on road and grass tiles at 2x (game zoom)
    sys.path.insert(0, str(HERE.parent / "tiles"))
    from PIL import Image
    road = Image.open(HERE.parent.parent / "src/art/tile_road.png").crop((0, 0, 16, 16))
    grass = Image.open(HERE.parent.parent / "src/art/tile_grass.png").crop((0, 0, 16, 16))
    items = []
    for name, s in (("raccoon", r), ("gull", g), ("bear", b)):
        for gname, t in (("road", road), ("grass", grass)):
            for i, fr in enumerate(frames_of(s)):
                bg = Image.new("RGBA", (32, 32))
                for y in (0, 16):
                    for x in (0, 16):
                        bg.alpha_composite(t, (x, y))
                bg.alpha_composite(fr, ((32 - fr.width) // 2, (32 - fr.height) // 2))
                items.append(("%s %s %d" % (name[:4], gname[:2], i), bg))
    board(items[:8], OUT / "check_raccoon.png", 3)
    board(items[8:16], OUT / "check_gull.png", 3)
    board(items[16:], OUT / "check_bear.png", 3)
