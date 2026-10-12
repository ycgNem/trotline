"""Trotline props: src/art/angler, worm, bobber, crate, tree, smokehouse, wormbed.

angler      12x22, 2 frames (0 idle, rod upright; 1 fishing, rod out), anchor at the feet (6, 20).
            Seen from behind, facing the water: straw hat, red shirt, olive waders. The rod is
            drawn after the outline so it stays one pixel wide; in frame 1 its tip is at
            anchor + (5, -14), where the renderer starts the line.
worm        10x7, 2-frame wriggle, fps 3: a pink worm on a little pile of dug dirt.
bobber      6x6, 2 frames: red over white, floating / dipped.
crate       10x9: a slatted fish crate, silver fish showing at the top.
tree        20x28: a live oak, anchor at the trunk base: broad dark crown, gnarled trunk,
            Spanish moss hanging from the lower boughs.
smokehouse  48x66, anchor bottom-centre: weathered board-and-batten walls, a rusted tin gable
            roof, a stovepipe with smoke, the door on the WEST end where the road ends.
wormbed     32x14, anchor [0, 0]: a plank-framed bed of dark soil with worms showing.
Run: python pixel-art/props/build.py
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "_lib"))
from trotart import C, new, stamp, outline, export, frames_of, board, ART  # noqa: E402

from PIL import Image  # noqa: E402

OUT = HERE / "out"

# ---------------------------------------------------------------------------------- angler
ANGLER = [
    "............",
    "...HHhhh....",
    "...Hhhhh....",
    ".bbbbbbbbb..",
    "..rrrrrrr...",
    "...rrrrr....",
    "....nnn.....",
    "..SSSSSSS...",
    ".SSSEESSSS..",
    ".SwSSSSSwS..",
    ".SwSESSSwS..",
    ".kwSSSSSwk..",
    "..wSSSSSw...",
    "..BBBBBBB...",
    "..WWWWWWW...",
    "..WWW.WWW...",
    "..WWW.WWW...",
    "..WWW.WWW...",
    "..WWw.WWw...",
    "..KKK.KKK...",
    "..KKK.KKK...",
    "............",
]
ANGLER_FISH = {  # frame 1: the right arm raised to the rod held out over the water
    (9, 11): ".", (8, 11): "w", (9, 10): "k", (8, 10): "w", (8, 9): "S",
}
ANGLER_LEGEND = {"H": "gold", "h": "amber", "b": "brass", "r": "copper", "n": "sand",
                 "S": "red", "E": "ember", "w": "wine", "k": "sand", "B": "mud",
                 "W": "leaf", "K": "bark"}


def angler():
    s = new(12, 22, 2)
    for f in range(2):
        s.frame(f + 1)
        rows = [list(r) for r in ANGLER]
        if f == 1:
            for (x, y), ch in ANGLER_FISH.items():
                rows[y][x] = ch
        stamp(s, ["".join(r) for r in rows], ANGLER_LEGEND)
        outline(s)
        if f == 0:
            # rod held upright beside the hat: cork grip by the hand, a pale tip
            s.line(10, 1, 10, 13, C["bark"])
            s.px(10, 11, C["sand"]); s.px(10, 12, C["sand"])
            s.px(10, 0, C["bone"])
        else:
            # rod out over the water from the raised hand; tip at (11, 6) = anchor + (5, -14)
            s.line(9, 12, 11, 6, C["bark"])
            s.px(9, 12, C["sand"])
            s.px(11, 6, C["bone"])
    return s


# ---------------------------------------------------------------------------------- worm
# The worm is one continuous curve (rose, pink belly-side segments), lying on a dug mound;
# frame 1 it rolls the other way and lifts its head.
WORM_PATH = [
    [(1, 3), (2, 2), (3, 2), (4, 3), (5, 3), (6, 2), (7, 2), (8, 3)],
    [(1, 3), (2, 3), (3, 2), (4, 2), (5, 3), (6, 3), (7, 2), (8, 1)],
]
WORM_MOUND = [
    "..........",
    "..........",
    "..........",
    "..........",
    "..llllll..",
    ".dddddddd.",
    "..........",
]


def worm():
    s = new(10, 7, 2)
    for f, path in enumerate(WORM_PATH):
        s.frame(f + 1)
        stamp(s, WORM_MOUND, {"l": "clay", "d": "mud"})
        for i, (x, y) in enumerate(path):
            s.px(x, y, C["pink" if i in (2, 5) else "rose"])
        outline(s)
    return s


# ---------------------------------------------------------------------------------- bobber
BOBBER = [
    ["......",
     "..RE..",
     ".RRER.",
     ".WWWW.",
     "..WW..",
     "......"],
    ["......",
     "......",
     "..RE..",
     ".RRER.",
     "-iWWi-",
     "......"],
]


def bobber():
    s = new(6, 6, 2)
    for f, rows in enumerate(BOBBER):
        s.frame(f + 1)
        stamp(s, [r.replace("-", ".").replace("i", ".") for r in rows],
              {"R": "red", "E": "ember", "W": "bone"})
        outline(s)
        # the ripple where it dips, drawn over the outline
        for x, ch in enumerate(rows[4]):
            if ch in "-i" and f == 1:
                s.px(x, 4, C["ice"])
    return s


# ---------------------------------------------------------------------------------- crate
CRATE = [
    "..........",
    ".tttttttt.",
    ".fFfFFfFt.",
    ".TTTTTTTT.",
    ".BBBBBBBB.",
    ".gggggggg.",
    ".BBBBBBBB.",
    ".gggggggg.",
    "..........",
]


def crate():
    s = new(10, 9, 1)
    stamp(s, CRATE, {"t": "amber", "T": "gold", "f": "fog", "F": "mist", "B": "brass", "g": "copper"})
    s.px(1, 4, C["copper"]); s.px(8, 4, C["copper"]); s.px(1, 6, C["copper"]); s.px(8, 6, C["copper"])
    outline(s)
    return s


# ---------------------------------------------------------------------------------- tree
# Live oak: a crown wider than it is tall, dark and clumped, lit top-left; two heavy limbs
# spreading out low under it from a short thick trunk; Spanish moss (ash) hanging off the limbs.
TREE = [
    "....................",
    "......gGGGg.gg......",
    "....gGGLLGGGgGGg....",
    "..gGGLLlLLGGgLLGg...",
    ".gGGLLLLLGGGGLLGGg..",
    ".GGGLLLGGGGGGGLGGGg.",
    ".GGGGGGGGGdGGGGGGGG.",
    ".gGGGGdGGGddGGGGdGG.",
    ".dGGGddGGGGdGGGddGd.",
    ".ddGGGGGdGGGGGdGGdd.",
    "..dddGGddddGGddddd..",
    "..dmddd.dddd.ddmdd..",
    "..m.TTTt....tTTT.m..",
    "..m...TTTttTTT...m..",
    "...m....TTtt.....m..",
    "........TTtt........",
    "........TTtt........",
    "........TTtt........",
    "........TTtt........",
    ".......TTTtt........",
    ".......TTTtt........",
    ".......TTTtt........",
    ".......TTTtt........",
    ".......TTTttt.......",
    "......TTTTtttt......",
    ".....TTT.TTt.tt.....",
    "....................",
    "....................",
]


def tree():
    s = new(20, 28, 1)
    stamp(s, TREE, {"g": "green", "G": "leaf", "L": "lime", "l": "sprout", "d": "moss",
                    "T": "clay", "t": "mud", "m": "ash"})
    outline(s)
    return s


# ---------------------------------------------------------------------------------- smokehouse
def smokehouse():
    W, H = 48, 66
    s = new(W, H, 1)
    px, line, rect = s.px, s.line, s.rect

    # roof: rusted corrugated tin, gable ridge running east-west; the south slope faces us
    top, eave = 16, 38
    for y in range(top, eave + 1):
        inset = max(0, 3 - (y - top))          # the ridge ends taper in
        for x in range(1 + inset, W - 1 - inset):
            # corrugation: a light and a dark ridge every 3 px, rust streaks below old nails
            k = x % 3
            col = "copper" if k == 0 else "rust" if k == 1 else "clay"
            if y < top + 2:
                col = "iron"                     # the ridge cap
            px(x, y, C[col])
    for x in range(4, W - 4, 3):                 # nail heads along two purlins, streaks under
        for py in (24, 32):
            px(x, py, C["ash"])
            px(x, py + 1, C["brass"])
    for x in range(13, 19):                      # one newer sheet: its ridges a step brighter
        for y in range(top + 2, eave):
            if x % 3 == 2:
                px(x, y, C["tan"])
    for x in range(1, W - 1):                    # the eave's shadow edge
        px(x, eave, C["bark"])
    # stovepipe on the east end of the roof
    rect(36, 11, 38, 22, C["iron"])
    line(36, 11, 36, 22, C["steel"])
    rect(35, 10, 39, 11, C["slate"])
    # south wall: weathered board-and-batten (silvered grey), smoke-stained under the eave
    wall0 = eave + 1
    for y in range(wall0, H - 1):
        for x in range(1, W - 1):
            col = "ash"
            if x % 4 == 0:
                col = "steel"                    # the battens' shadow side
            elif x % 4 == 1:
                col = "fog"                      # the battens' lit side
            if y < wall0 + 3:
                col = "iron" if x % 4 == 0 else "steel"   # soot under the eave
            px(x, y, C[col])
    for x in range(1, W - 1):                    # sill board at the foot
        px(x, H - 2, C["iron"])
    # vents: two dark slots high on the wall where the smoke seeps
    for x0 in (20, 30):
        rect(x0, wall0 + 4, x0 + 3, wall0 + 5, C["soot"])
    # the west door: an open doorway at the west end, fish hanging in the dark, the plank door
    # swung back against the wall, a step where the road arrives
    rect(2, wall0 + 4, 10, H - 2, C["soot"])
    for fx in (4, 7):
        line(fx, wall0 + 5, fx, wall0 + 9, C["ash"])     # hanging split fish
        px(fx + 1, wall0 + 6, C["fog"]); px(fx + 1, wall0 + 7, C["fog"])
    rect(11, wall0 + 4, 14, H - 2, C["clay"])           # the open door
    line(11, wall0 + 4, 11, H - 2, C["tan"])
    px(13, wall0 + 13, C["gold"])                        # latch
    rect(1, H - 3, 11, H - 2, C["tan"])                  # stone step / plank threshold
    line(1, H - 3, 11, H - 3, C["sand"])
    outline(s)
    # smoke after the outline (soft, no ink): puffs rising from the pipe, growing, drifting west
    for cx, cy, r, col in [(37, 7, 1, "fog"), (35, 4, 2, "mist"), (31, 2, 1, "mist"), (29, 1, 1, "fog")]:
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r and 0 <= x < W and 0 <= y < H:
                    px(x, y, C[col])
    px(36, 5, C["ash"]); px(34, 6, C["ash"])            # shaded undersides of the puffs
    return s


# ---------------------------------------------------------------------------------- wormbed
def wormbed():
    s = new(32, 14, 1)
    s.rect(1, 1, 30, 12, C["clay"])            # plank frame
    s.line(1, 1, 30, 1, C["tan"])
    s.line(1, 12, 30, 12, C["mud"])
    s.rect(3, 3, 28, 10, C["bark"])            # dark soil
    for x, y in [(5, 4), (9, 7), (14, 5), (18, 8), (22, 4), (26, 7), (7, 9), (24, 9), (12, 3), (20, 6)]:
        s.px(x, y, C["mud"])                   # clods
    for x, y, d in [(6, 6, 1), (11, 4, 1), (16, 7, -1), (21, 5, 1), (25, 8, -1), (13, 9, 1)]:
        s.px(x, y, C["rose"]); s.px(x + d, y, C["pink"]); s.px(x + 2 * d, y + 1, C["pink"])
    for x in (8, 16, 24):                      # frame corners / stakes
        s.px(x, 1, C["mud"]); s.px(x, 12, C["bark"])
    s.outline(C["ink"], where="inside")
    return s


if __name__ == "__main__":
    a, w, b, c, t, h, wb = angler(), worm(), bobber(), crate(), tree(), smokehouse(), wormbed()
    export("angler", a, (6, 20), 1, OUT)
    export("worm", w, (5, 5), 3, OUT)
    export("bobber", b, (3, 4), 2, OUT)
    export("crate", c, (5, 8), 1, OUT)
    export("tree", t, (9, 26), 1, OUT)
    export("smokehouse", h, (24, 65), 1, OUT)
    export("wormbed", wb, (0, 0), 1, OUT)
