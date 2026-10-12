"""Trotline fleet and chum (Milestone 3): src/art/rowboat, skiff, trawler, slick, chum_bucket.

Projection as the angler and the smokehouse: side view seen a little from above (the far gunwale
and a sliver of the inside show over the near gunwale), facing RIGHT (the game mirrors them).
Every boat's anchor is its hull's waterline centre.

rowboat      22x13, 3 frames, fps 4. A wooden flat-bottomed jon boat (square raked bow, flat
             sheer, transom stern) in varnished wood, one hand in a straw hat and red shirt.
             0 the catch (rower leaning aft, oar blade forward in the water), 1 the finish
             (leaning back, blade aft); 2 at anchor: oars shipped along the thwarts, an anchor
             rode off the bow, the hand turned to the bow with a rod out over it.
skiff        26x14, 3 frames, fps 6. A fibreglass bay skiff: white topsides over a green hull,
             a sharp raked stem, an outboard on the transom, the hand in a red shirt and a dark
             cap. 0/1 running: bow up, the hand seated at the tiller, spray off the motor
             alternating; 2 stopped, level, the hand standing with a long surf rod.
trawler      36x24, 2 frames (states, not a loop). A small Gulf shrimp boat: white hull with a
             flared bow, a red boot stripe and dark bottom paint, the wheelhouse forward, the
             mast and its two outrigger booms just aft of it.
             0 running: booms stowed up in a V, the green try net heaped on the aft deck;
             1 towing: booms swung out like wings (a stylisation: the true side view hides
             them in the mast), the deck empty, a warp running down into the water astern.
slick        18x10, 2 frames, fps 2, anchor at its centre (9, 5). Ground chum on the water: a
             lumpy red-brown patch with pale flecks and water showing through, in a broken
             violet film whose gold glints and plum shadows move between the frames. No outline
             (it is in the water, not on it). Drawn inside 7 x 3.5 of the anchor so the
             renderer's lure ring (9 x 5) circles it with water between.
chum_bucket  9x10, 1 frame, anchor bottom-centre (4, 9): a white plastic bait bucket, the chum
             heaped in its mouth. A HUD icon.

Rod tips (where the renderer starts the fishing line), from the anchor, on the fishing frame:
rowboat (10, -9), skiff (11, -11).

Thin things are drawn after the ink outline, as the angler's rod is, so they stay one pixel
wide: oars, rods, the anchor rode, the booms, the warps, spray.

Run: python pixel-art/boats/build.py [--draft] [name ...]
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "_lib"))
from trotart import C, new, stamp, outline, export  # noqa: E402

OUT = HERE / "out"


def put(s, pts, col, only=None):
    for x, y in pts:
        s.px(x, y, C[col], only=only)


def hspan(s, y, x0, x1, col):
    for x in range(x0, x1 + 1):
        s.px(x, y, C[col])


def spar(s, x0, y0, x1, y1, lit="mist", dark="ink", behind=False):
    """A 1 px spar that reads on any water: the lit line with an ink shadow under it (beside
    it, on the right, if the spar is steep). behind: only where nothing is drawn yet."""
    steep = abs(y1 - y0) > abs(x1 - x0)
    dx, dy = (1, 0) if steep else (0, 1)
    s.line(x0 + dx, y0 + dy, x1 + dx, y1 + dy, C[dark], only="empty")
    s.line(x0, y0, x1, y1, C[lit], only="empty" if behind else None)


# ---------------------------------------------------------------------------------- rowboat
ROW_LEGEND = {"H": "gold", "h": "amber", "b": "brass", "f": "sand", "n": "copper",
              "S": "red", "E": "ember", "w": "wine"}
# the hand, rows 0-7 (he sits inside the hull: the near gunwale on row 8 hides his legs)
ROW_HAND = [
    [  # 0 the catch: leaning aft (left) over his knees, arms out to the handles
        "......................",
        "......................",
        "........HHh...........",
        ".......bbbbb..........",
        "........ffn...........",
        ".......EESSw..........",
        "........ESSSw.........",
        ".........SSSw.........",
    ],
    [  # 1 the finish: leaning back toward the bow, the handles at his chest
        "......................",
        "......................",
        "..........HHh.........",
        ".........bbbbb........",
        "..........ffnn........",
        "..........ESSSw.......",
        "..........ESSSw.......",
        "..........SSSSw.......",
    ],
    [  # 2 at anchor: turned to face the bow, the rod in both hands
        "......................",
        "......................",
        "..........HHh.........",
        ".........bbbbb........",
        "..........nff.........",
        "..........ESSf........",
        "..........ESSw........",
        "..........SSSw........",
    ],
]
ROW_ANCHOR = (11, 10)
ROW_ROD_TIP = (21, 1)


def rowboat_hull(s):
    hspan(s, 6, 2, 19, "brass")            # the far gunwale, its top in the light
    hspan(s, 7, 3, 18, "bark")             # the inside, in shadow
    put(s, [(2, 7), (19, 7), (5, 7), (16, 7)], "copper")   # transom, bow, the two thwarts
    hspan(s, 8, 2, 20, "amber")            # the near gunwale's lit cap
    hspan(s, 9, 2, 18, "copper")           # planks
    put(s, [(19, 9)], "rust")              # the raked bow's facet
    hspan(s, 10, 2, 17, "rust")            # chine, at the waterline


def oar(s, handle, blade, forward):
    """The near oar: loom from the handle down past the gunwale to a blade in the water."""
    (hx, hy), (bx, by) = handle, blade
    s.line(hx, hy, bx, by - 1, C["dune"])
    d = 1 if forward else -1
    put(s, [(bx, by), (bx + d, by)], "dune")
    put(s, [(hx, hy)], "sand")                                # the hand on the grip


def rowboat():
    s = new(22, 13, 3)
    for f in range(3):
        s.frame(f + 1)
        rowboat_hull(s)
        stamp(s, ROW_HAND[f], ROW_LEGEND)
        outline(s)
        if f == 0:      # the catch: blade forward, dropping in with a splash
            oar(s, (6, 5), (13, 12), True)
            put(s, [(15, 12), (12, 12)], "bone")
        elif f == 1:    # the finish: blade aft, coming out with a drip
            oar(s, (12, 5), (5, 12), False)
            put(s, [(3, 11)], "ice")
        else:
            s.line(4, 7, 17, 7, C["dune"])       # oars shipped, lying on the thwarts
            put(s, [(17, 6), (18, 6)], "dune")   # their blades by the bow
            s.line(20, 9, 21, 11, C["iron"])     # the anchor rode off the bow
            s.line(13, 5, ROW_ROD_TIP[0], ROW_ROD_TIP[1], C["bark"])   # the rod over the bow
            put(s, [(13, 5)], "sand")
            put(s, [ROW_ROD_TIP], "bone")
    return s


# ---------------------------------------------------------------------------------- skiff
SKIFF_W, SKIFF_H = 26, 14
SKIFF_ANCHOR = (14, 11)
SKIFF_ROD_TIP = (25, 0)
SKIFF_LEGEND = {"K": "slate", "k": "iron", "f": "sand", "n": "copper",
                "S": "red", "E": "ember", "w": "wine"}
SKIFF_SEATED = [   # at the tiller, facing forward; columns 6-9, rows 3-7
    "KKk.",
    "nff.",
    "ESS.",
    "ESSw",
    "SSSw",
]
SKIFF_STANDING = [  # amidships, the surf rod at his hip; columns 9-12, rows 1-7
    "KKk.",
    "nff.",
    "ESSw",
    "ESSf",
    "SSSw",
    "SSSw",
    "SSSw",
]


def skiff_hull(s, lift):
    """The hull from the transom (x 5) to the stem (x 24); lift(x) raises the bow when running."""
    for x in range(5, 25):
        top = (8 if x <= 13 else 7 if x <= 19 else 6) - lift(x)
        bot = {19: 10, 20: 10, 21: 9, 22: 9, 23: 8, 24: 7}.get(x, 11) - lift(x)
        if x == 24:
            top += 0
        for y in range(top, bot + 1):
            col = "bone" if y == top else "mist" if y == top + 1 else "green"
            if y == bot and y > top + 1:
                col = "leaf"
            s.px(x, y, C[col])
        if 6 <= x <= 15:                     # the cockpit, the far gunwale beyond it
            s.px(x, top - 1, C["slate"])
            s.px(x, top - 2, C["mist"])
        elif 16 <= x <= 20:                  # the foredeck, sloping to the stem
            s.px(x, top - 1, C["mist"])


def skiff_motor(s):
    stamp(s, ["kkM", "kMm", "MMm", ".m."], {"k": "steel", "M": "iron", "m": "night"}, 2, 5)
    hspan(s, 9, 3, 3, "night"); hspan(s, 10, 3, 3, "night")    # the leg, down into the water


def skiff():
    s = new(SKIFF_W, SKIFF_H, 3)
    run = lambda x: round((x - 5) * 2 / 19)    # noqa: E731  bow up 2 px over the hull
    level = lambda x: 0                         # noqa: E731
    for f in range(3):
        s.frame(f + 1)
        skiff_hull(s, run if f < 2 else level)
        skiff_motor(s)
        if f < 2:
            stamp(s, SKIFF_SEATED, SKIFF_LEGEND, 6, 3)
            put(s, [(5, 6)], "iron")             # the tiller arm to his hand
        else:
            stamp(s, SKIFF_STANDING, SKIFF_LEGEND, 9, 1)
        outline(s)
        if f == 0:
            put(s, [(1, 10), (0, 9), (1, 11)], "bone")
        elif f == 1:
            put(s, [(0, 11), (1, 10)], "bone"); put(s, [(0, 10)], "ice")
        else:
            s.line(12, 4, SKIFF_ROD_TIP[0], SKIFF_ROD_TIP[1], C["bark"])
            put(s, [(12, 4)], "sand")
            put(s, [SKIFF_ROD_TIP], "bone")
    return s


# ---------------------------------------------------------------------------------- trawler
TRAWL_W, TRAWL_H = 36, 24
TRAWL_ANCHOR = (18, 20)
MAST_X = 18
NET_HEAP = [   # the try net heaped on the aft deck (cols 4-12, rows 11-14), floats on its headrope
    "...lll...",
    "..lgGgl..",
    ".lgGgoGg.",
    "lgGgGgGgd",
]


def trawler_hull(s):
    for x in range(2, 34):
        # low aft deck, the sheer sweeping up to a high flared bow; a rounded stern
        top = 15 if x <= 14 else 14 if x <= 20 else 13 if x <= 25 else 12 if x <= 29 else 11 if x <= 32 else 10
        bot = {2: 18, 27: 19, 28: 18, 29: 17, 30: 16, 31: 14, 32: 12, 33: 11}.get(x, 20)
        for y in range(top, bot + 1):
            col = "bone" if y == top else "mist"
            if y == 17:
                col = "fog"              # the topsides turning under
            if y == 18:
                col = "red"              # boot stripe
            if y >= 19:
                col = "slate"            # bottom paint at the waterline
            s.px(x, y, C[col])
        if 3 <= x <= 20:                 # the aft deck seen over the near bulwark
            s.px(x, top - 1, C["clay"])
            s.px(x, top - 2, C["mist"])
    # the wheelhouse, forward: a dark roof, a band of windows
    s.rect(22, 6, 29, 12, C["mist"])
    hspan(s, 6, 22, 29, "bone")
    hspan(s, 5, 21, 30, "iron")
    for x in (23, 24, 26, 27, 29):
        s.px(x, 8, C["soot"])
    # the mast just aft of it, with a crosstree
    s.line(MAST_X, 1, MAST_X, 13, C["fog"])
    hspan(s, 3, MAST_X - 1, MAST_X + 1, "fog")


def trawler():
    s = new(TRAWL_W, TRAWL_H, 2)
    for f in range(2):
        s.frame(f + 1)
        trawler_hull(s)
        if f == 0:
            stamp(s, NET_HEAP, {"l": "lime", "g": "green", "G": "leaf", "d": "moss", "o": "orange"}, 4, 11)
        outline(s)
        if f == 0:
            # running: booms stowed up in a wide V, the net aboard
            spar(s, MAST_X, 12, 10, 1, lit="fog")
            spar(s, MAST_X, 12, 26, 1, lit="fog")
        else:
            # towing: booms swung out and down like wings, the net gone from the deck; the warps
            # run from the tips down and aft into the water (the forward one behind the bow)
            spar(s, MAST_X, 12, 34, 5, lit="fog")
            spar(s, MAST_X, 12, 2, 5, lit="fog")
            s.line(34, 6, 32, 10, C["ash"], only="empty")
            s.line(2, 6, 0, 20, C["ash"])
            put(s, [(0, 21), (1, 21)], "bone")
    return s


# ---------------------------------------------------------------------------------- slick
# R chum (copper), r darker clumps (rust), E blood (red), p pale bits of flesh and scale,
# v the oily film at the edge (violet); each frame turns some of the film to gold glints
# (on the lit, top-left side) or to plum, so the sheen slides round the edge.
# Kept inside an ellipse of 7 x 3.5 round the anchor, so the renderer's lure ring (9 x 5 round
# it) circles the slick with water between them.
SLICK = [
    "..................",
    "..................",
    ".....vv.vvvv.v....",
    "...vvRRvRRrRvRv.R.",
    "..vRRpR.RRRRpRRv..",
    "..vrRRRERR.RRrRv..",
    "..vRR.RRrrRRRpRv..",
    "...vvRRvvRR.vRv...",
    "...R.vv..vvv......",
    "..................",
]
SLICK_FILM = "violet"
SLICK_GLINT = [{(5, 2), (3, 3), (2, 5)}, {(6, 2), (4, 3), (2, 4), (11, 2)}]
SLICK_DARK = [{(15, 5), (14, 7), (10, 8)}, {(15, 6), (12, 7), (6, 8)}]


def slick():
    s = new(18, 10, 2)
    for f in range(2):
        s.frame(f + 1)
        stamp(s, SLICK, {"R": "copper", "r": "rust", "E": "red", "p": "shell", "v": SLICK_FILM})
        put(s, SLICK_GLINT[f], "gold")
        put(s, SLICK_DARK[f], "plum")
    return s


# ---------------------------------------------------------------------------------- bucket
BUCKET = [
    ".........",
    "..wRRRw..",
    ".WrRrRrW.",
    ".WWWWWWw.",
    ".WvvvvvV.",
    "..WwwwV..",
    "..WwwwV..",
    "..WwwwV..",
    "..vvvvv..",
    ".........",
]


def chum_bucket():
    s = new(9, 10, 1)
    stamp(s, BUCKET, {"r": "rust", "R": "copper", "W": "bone", "w": "mist", "V": "fog", "v": "ash"})
    outline(s)
    return s


SPRITES = {
    # name: (draw, anchor, fps)
    "rowboat": (rowboat, ROW_ANCHOR, 4),
    "skiff": (skiff, SKIFF_ANCHOR, 6),
    "trawler": (trawler, TRAWL_ANCHOR, 2),
    "slick": (slick, (9, 5), 2),
    "chum_bucket": (chum_bucket, (4, 9), 1),
}

if __name__ == "__main__":
    # --draft writes the strips to out/draft/ instead of src/art/ (the game loads whatever is
    # in src/art, so only finished sprites go there)
    import trotart
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--draft" in sys.argv:
        trotart.ART = OUT / "draft"
    for name in args or SPRITES:
        draw, anchor, fps = SPRITES[name]
        sp = draw()
        export(name, sp, anchor, fps, OUT)
        for f in range(1, sp.n_frames + 1):
            sp.save_silhouette(str(OUT / ("%s_silhouette_f%d.png" % (name, f - 1))), frame=f, scale=8)
