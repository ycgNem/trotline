"""Trotline ground tiles: src/art/tile_*.png strips (16x16 frames = variants, anchor [0,0], fps 0).

The renderer picks a variant per tile by a hash, so every variant of a kind shares its base and
keeps its marks one pixel off the tile edges: any two variants sit side by side without a seam.

Water (STYLE.md "water"): four values of Apollo's blue ramp, one per kind, palest = placeable.
  tile_placeable  ice   #a4dddb + bone crests       the clear shallows a fish can be put in
  tile_shallow    cyan  #73bed3 + ice crests, sky troughs, submerged stones
  tile_reeds      the shallow tile under cordgrass/needlerush clumps: plainly no room for a fish
  tile_mid        blue  #3c5e8b + sky crests, deep troughs
  tile_deep       deep  #253a5e + blue crests, abyss swells
Shore: tile_grass, tile_sand, tile_road (packed dirt, no direction: it bends), tile_dock (deck
boards laid across a dock that runs north from the road, nails over the two stringers).

Run: python pixel-art/tiles/build.py
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "_lib"))
from trotart import C, new, stamp, export, frames_of, up, REPO  # noqa: E402

from PIL import Image  # noqa: E402

OUT = HERE / "out"

# ---------------------------------------------------------------------------------- motifs
# crests: lit ripple over its trough, shifted one pixel right (light from the top-left)
M = {
    "c2": ["--.", ".__"],
    "c3": ["---", ".__"],
    "c4": ["----", ".___"],
    "k2": ["--"], "k3": ["---"], "k4": ["----"],          # calm crest, no trough
    "s3": [":::"], "s4": ["::::"], "s5": [":::::"], "s6": ["::::::"],  # deep swells
    "p2": ["pp"], "p3": [".p", "pp"],                      # submerged stones
    "g": ["*"],                                            # glint
}


def motifs(s, items, legend):
    for key, x, y in items:
        rows = M[key]
        assert x >= 1 and y >= 1 and x + len(rows[0]) <= 15 and y + len(rows) <= 15, (key, x, y)
        stamp(s, rows, legend, x, y)


WATER = {
    "deep": dict(base="deep", legend={"-": "blue", "_": "abyss", ":": "abyss"}, variants=[
        [("s5", 3, 1), ("c2", 10, 3), ("s6", 8, 6), ("c2", 1, 8), ("s5", 3, 11), ("c2", 11, 11), ("s4", 9, 14)],
        [("s4", 9, 2), ("c2", 3, 3), ("s5", 1, 6), ("c3", 10, 8), ("s6", 6, 11), ("c2", 2, 13)],
        [("c2", 6, 1), ("s6", 1, 4), ("s4", 10, 6), ("c2", 4, 8), ("s5", 8, 11), ("s3", 2, 13), ("c2", 12, 13)],
        [("s5", 6, 2), ("c2", 1, 5), ("s4", 9, 7), ("c3", 4, 10), ("s5", 9, 13)],
    ]),
    "mid": dict(base="blue", legend={"-": "sky", "_": "deep"}, variants=[
        [("c4", 4, 2), ("c3", 11, 6), ("c3", 2, 10), ("c3", 8, 13)],
        [("c3", 9, 1), ("c4", 2, 5), ("c3", 10, 9), ("c2", 4, 12)],
        [("c3", 3, 2), ("c3", 11, 4), ("c4", 6, 8), ("c2", 1, 12), ("c3", 10, 12)],
        [("c4", 8, 3), ("c2", 2, 7), ("c3", 9, 10), ("c3", 3, 13)],
    ]),
    "shallow": dict(base="cyan", legend={"-": "ice", "_": "sky", "p": "sky", "*": "ice"}, variants=[
        [("c3", 2, 1), ("g", 12, 2), ("c4", 8, 5), ("p3", 1, 8), ("c3", 11, 11), ("g", 4, 12), ("c2", 6, 13)],
        [("c3", 9, 2), ("p2", 3, 4), ("c4", 5, 8), ("g", 13, 7), ("c2", 11, 12), ("c3", 2, 12)],
        [("c2", 4, 1), ("c3", 10, 4), ("c4", 2, 7), ("p3", 12, 9), ("c3", 7, 12)],
        [("c3", 6, 2), ("c2", 1, 6), ("p2", 12, 5), ("c3", 9, 9), ("c4", 3, 12)],
    ]),
    "placeable": dict(base="ice", legend={"-": "bone", "_": "cyan", "*": "bone"}, variants=[
        [("k3", 2, 1), ("g", 12, 2), ("k4", 8, 5), ("k3", 11, 10), ("g", 4, 11), ("k2", 6, 13)],
        [("k3", 9, 2), ("k4", 3, 6), ("g", 13, 8), ("k2", 11, 12), ("k3", 2, 12)],
        [("k2", 4, 1), ("k3", 10, 4), ("k4", 2, 8), ("k3", 8, 12), ("g", 13, 13)],
        [("k3", 6, 2), ("k2", 1, 6), ("k3", 9, 9), ("g", 3, 10), ("k4", 4, 13)],
    ]),
}


def water(kind):
    spec = WATER[kind]
    s = new(16, 16, len(spec["variants"]))
    for i, items in enumerate(spec["variants"]):
        s.frame(i + 1)
        s.rect(0, 0, 15, 15, C[spec["base"]])
        motifs(s, items, spec["legend"])
    return s


# ---------------------------------------------------------------------------------- reeds
# Blades: (x, base_y, height, lean). Smooth cordgrass (green, lime, reed tips) and black
# needlerush (moss, leaf); a cattail head here and there. Each base sits on a leaf-dark pixel
# with a sky shadow on the water below it.
REEDS = [
    # two clumps, blades one pixel apart so each reads as a stem with water between, fanned out
    dict(water=0, blades=[(1, 11, 7, 0), (3, 11, 9, 0), (5, 11, 8, 1),
                          (8, 13, 8, -1), (10, 13, 11, 0), (12, 13, 9, 1), (14, 13, 6, 0)],
         rush=[(2, 11, 5, -1), (4, 11, 6, 0), (9, 13, 6, -1), (11, 13, 7, 0), (13, 13, 5, 1)],
         cattail=[(10, 13, 11)]),
    dict(water=1, blades=[(1, 13, 8, 0), (3, 13, 11, 0), (5, 13, 9, 1), (7, 13, 6, 1),
                          (10, 9, 7, -1), (12, 9, 8, 0), (14, 9, 6, 0)],
         rush=[(2, 13, 6, -1), (4, 13, 7, 0), (6, 13, 5, 1), (11, 9, 5, 0), (13, 9, 5, 1)],
         cattail=[(3, 13, 11)]),
    dict(water=2, blades=[(2, 13, 7, -1), (4, 13, 10, 0), (6, 13, 11, 0), (8, 13, 9, 1), (10, 13, 6, 1),
                          (12, 7, 6, -1), (14, 7, 5, 0)],
         rush=[(3, 13, 6, -1), (5, 13, 7, 0), (7, 13, 6, 0), (9, 13, 5, 1), (13, 7, 4, 0)],
         cattail=[(6, 13, 11)]),
    dict(water=3, blades=[(1, 8, 6, 0), (3, 8, 7, 0), (5, 8, 5, 1),
                          (7, 13, 7, -1), (9, 13, 10, 0), (11, 13, 9, 0), (13, 13, 7, 1)],
         rush=[(2, 8, 4, 0), (4, 8, 5, 1), (8, 13, 6, -1), (10, 13, 7, 0), (12, 13, 6, 1), (14, 13, 4, 0)],
         cattail=[(9, 13, 10)]),
]


def blade(s, x, base, h, lean, body, tip, top):
    pts = []
    for i in range(h):
        y = base - i
        xx = x + (round(lean * i / max(1, h - 1)) if lean else 0)
        pts.append((xx, y))
    for i, (xx, y) in enumerate(pts):
        c = body
        if i >= h - 1:
            c = top
        elif i >= h - 3:
            c = tip
        if i == 0:
            c = "leaf" if body != "moss" else "moss"
        s.px(xx, y, C[c])
    return pts


def reeds():
    base = water("shallow")
    s = new(16, 16, len(REEDS))
    for i, spec in enumerate(REEDS):
        s.frame(i + 1)
        # the shallow tile underneath, without its stones (the clump hides the bottom)
        s.rect(0, 0, 15, 15, C["cyan"])
        motifs(s, [m for m in WATER["shallow"]["variants"][spec["water"]] if not m[0].startswith("p")],
               WATER["shallow"]["legend"])
        bases = [(b[0], b[1]) for b in spec["blades"] + spec["rush"]]
        for x, y in bases:  # shadow on the water under each stem, kept off the tile edge
            s.px(x, y + 1, C["sky"])
            if x + 1 <= 14:
                s.px(x + 1, y + 1, C["sky"])
        for x, b, h, ln in spec["rush"]:
            blade(s, x, b, h, ln, "moss", "leaf", "leaf")
        for x, b, h, ln in spec["blades"]:
            blade(s, x, b, h, ln, "green", "lime", "reed")
        for x, b, h in spec["cattail"]:
            # a cattail head two pixels under the tip of that blade
            s.px(x, b - h + 2, C["copper"])
            s.px(x, b - h + 3, C["copper"])
            s.px(x, b - h + 4, C["clay"])
    return s


# ---------------------------------------------------------------------------------- land
# Grass: tufts (a V of lime blades with a leaf shadow under), single blades, leaf specks, a
# sprout tip or two; v3 has three tiny reed-yellow blossoms.
GRASS = [
    dict(tufts=[(2, 1), (11, 4), (1, 7), (8, 8), (5, 11)], blades=[(12, 12), (13, 2)],
         specks=[(10, 2), (9, 3), (7, 5), (6, 6), (13, 7), (10, 10), (13, 13), (3, 13)], tips=[(9, 8)], flowers=[]),
    dict(tufts=[(9, 1), (2, 4), (11, 9), (4, 12)], blades=[(7, 6), (14, 5), (1, 10)],
         specks=[(5, 2), (12, 4), (6, 8), (8, 11), (13, 13), (2, 8), (10, 14)], tips=[(3, 4)], flowers=[]),
    dict(tufts=[(5, 2), (12, 6), (2, 9), (8, 12)], blades=[(1, 3), (10, 2), (6, 7), (13, 12)],
         specks=[(9, 5), (4, 6), (11, 10), (5, 13), (14, 9), (2, 14)], tips=[(13, 6)], flowers=[]),
    dict(tufts=[(1, 2), (10, 3), (6, 9), (12, 11)], blades=[(4, 6), (8, 5), (2, 12)],
         specks=[(7, 2), (13, 7), (3, 9), (9, 13), (5, 14)], tips=[],
         flowers=[(12, 7), (4, 13), (13, 2)]),
]


def grass():
    s = new(16, 16, len(GRASS))
    for i, g in enumerate(GRASS):
        s.frame(i + 1)
        s.rect(0, 0, 15, 15, C["green"])
        for x, y in g["specks"]:
            s.px(x, y, C["leaf"])
        for x, y in g["tufts"]:
            for dx, dy in ((0, 0), (2, 0), (1, 1)):
                s.px(x + dx, y + dy, C["lime"])
            s.px(x + 1, y + 2, C["leaf"])
        for x, y in g["blades"]:
            s.px(x, y, C["lime"])
            s.px(x, y + 1, C["leaf"])
        for x, y in g["tips"]:
            s.px(x, y, C["sprout"])
        for x, y in g["flowers"]:
            s.px(x, y, C["reed"])
            s.px(x, y + 1, C["leaf"])
    return s


# Sand: dune base, sand ripple pairs (wind), sand and shell specks; v2 has a tiny shell.
SAND = [
    dict(ripples=[(9, 3), (3, 7), (11, 11), (2, 13)], dark=[(11, 1), (2, 4), (12, 8), (6, 12)], light=[(3, 1), (12, 6), (1, 10), (10, 10)], shell=None),
    dict(ripples=[(2, 2), (10, 6), (5, 10), (12, 13)], dark=[(7, 3), (13, 3), (1, 8), (9, 13)], light=[(5, 5), (13, 9), (3, 13)], shell=None),
    dict(ripples=[(6, 3), (11, 9), (2, 11)], dark=[(2, 2), (12, 5), (7, 13)], light=[(9, 1), (4, 7), (13, 13)], shell=(7, 7)),
    dict(ripples=[(4, 2), (12, 4), (7, 9), (1, 12)], dark=[(10, 2), (3, 6), (13, 11), (8, 14)], light=[(1, 4), (10, 7), (5, 13)], shell=None),
]


def sand():
    s = new(16, 16, len(SAND))
    for i, d in enumerate(SAND):
        s.frame(i + 1)
        s.rect(0, 0, 15, 15, C["dune"])
        for x, y in d["ripples"]:
            stamp(s, ["~~.", ".~~"], {"~": "sand"}, x, y)
        for x, y in d["dark"]:
            s.px(x, y, C["sand"])
        for x, y in d["light"]:
            s.px(x, y, C["shell"])
        if d["shell"]:
            stamp(s, ["bb", "bs"], {"b": "bone", "s": "sand"}, *d["shell"])
    return s


# Road: packed dirt, no direction. Compacted patches (clay), grit (sand), pebbles lit from the
# top-left (dune over mud), a few dark crumbs (mud).
ROAD = [
    dict(patches=[(2, 3, ["cc.", ".cc"]), (9, 10, ["ccc"]), (11, 3, ["c", "c"])],
         pebbles=[(12, 7), (4, 11)], grit=[(6, 1), (1, 8), (8, 6), (14, 13), (10, 14)], crumbs=[(7, 12), (13, 1)]),
    dict(patches=[(8, 2, ["ccc", ".c."]), (2, 9, ["cc"]), (12, 12, [".c", "cc"])],
         pebbles=[(3, 4), (10, 8)], grit=[(13, 5), (6, 7), (1, 13), (8, 13)], crumbs=[(5, 11), (14, 9)]),
    dict(patches=[(4, 6, ["cc", ".c"]), (11, 11, ["cc."]), (1, 1, ["c"])],
         pebbles=[(9, 3), (6, 12), (13, 7)], grit=[(3, 2), (11, 6), (2, 10), (9, 14)], crumbs=[(12, 2)]),
    dict(patches=[(10, 4, [".cc", "cc."]), (3, 12, ["ccc"]), (6, 8, ["c"])],
         pebbles=[(2, 6), (12, 13)], grit=[(7, 2), (14, 9), (1, 2), (9, 11), (5, 14)], crumbs=[(8, 7), (13, 3)]),
]


def road():
    s = new(16, 16, len(ROAD))
    for i, d in enumerate(ROAD):
        s.frame(i + 1)
        s.rect(0, 0, 15, 15, C["tan"])
        for x, y, rows in d["patches"]:
            stamp(s, rows, {"c": "clay"}, x, y)
        for x, y in d["grit"]:
            s.px(x, y, C["sand"])
        for x, y in d["crumbs"]:
            s.px(x, y, C["mud"])
        for x, y in d["pebbles"]:
            stamp(s, ["Oo", "oo"], {"O": "dune", "o": "mud"}, x, y)
            s.px(x + 1, y, C["sand"])
    return s


# Dock: boards across (3 px: lit edge + 2 body) with a bark gap, bark edges down both sides
# (the stringers), nails in two columns over them. Variants: butt joints, knots, one weathered
# board (sand/tan), one darker replaced board (mud/clay).
DOCK = [
    ["bLLLLLLLLLLLLLLb",
     "bwnwwkkwwwwwwnwb",
     "bwwwwwwwwkkwwwwb",
     "bbbbbbbbbbbbbbbb",
     "bLLLLLLLLLjLLLLb",
     "bwnwwwwwwwjwwnwb",
     "bwwwwkkwwwjwwwwb",
     "bbbbbbbbbbbbbbbb",
     "bLLLLLLLLLLLLLLb",
     "bwnwwwwkkwwwwnwb",
     "bwwwkkwwwwwwwwwb",
     "bbbbbbbbbbbbbbbb",
     "bLLLLjLLLLLLLLLb",
     "bwnwwjwwwwwkknwb",
     "bwwwwjwwkkwwwwwb",
     "bbbbbbbbbbbbbbbb"],
    ["bLLLLLLLjLLLLLLb",
     "bwnwwwwwjwkkwnwb",
     "bwwkkwwwjwwwwwwb",
     "bbbbbbbbbbbbbbbb",
     "bSSSSSSSSSSSSSSb",
     "bTnTTTkkTTTTTnTb",
     "bTTTTTTTTTkkTTTb",
     "bbbbbbbbbbbbbbbb",
     "bLLLLLLLLLLLLLLb",
     "bwnwwkkwwwwwwnwb",
     "bwwwwwwwwkkwwwwb",
     "bbbbbbbbbbbbbbbb",
     "bLLLLLLLLLLLjLLb",
     "bwnwwwwkkwwwjnwb",
     "bwwwkkwwwwwwjwwb",
     "bbbbbbbbbbbbbbbb"],
    ["bLLLLLLLLLLLLLLb",
     "bwnwwwwwwkkwwnwb",
     "bwwwkkwwwwwwwwwb",
     "bbbbbbbbbbbbbbbb",
     "bLLLjLLLLLLLLLLb",
     "bwnwjwwkkwwwwnwb",
     "bwwwjwwwwwwkkwwb",
     "bbbbbbbbbbbbbbbb",
     "bDDDDDDDDDDDDDDb",
     "bdndddkddddddndb",
     "bdddddddddkddddb",
     "bbbbbbbbbbbbbbbb",
     "bLLLLLLLLLLLLLLb",
     "bwnwwwwwwwwkknwb",
     "bwwwwkkwwwwwwwwb",
     "bbbbbbbbbbbbbbbb"],
    ["bLLLLLLLLLLjLLLb",
     "bwnwkkwwwwwjwnwb",
     "bwwwwwwwwwwjwwwb",
     "bbbbbbbbbbbbbbbb",
     "bLLLLLLLLLLLLLLb",
     "bwnwwwwwkwwwwnwb",
     "bwwwwwwwkwwwwwwb",
     "bbbbbbbbbbbbbbbb",
     "bLLLLLjLLLLLLLLb",
     "bwnwwwjwwwkkwnwb",
     "bwwkkwjwwwwwwwwb",
     "bbbbbbbbbbbbbbbb",
     "bSSSSSSSSSSSSSSb",
     "bTnTTkkTTTTTTnTb",
     "bTTTTTTTTkkTTTTb",
     "bbbbbbbbbbbbbbbb"],
]
DOCK_LEGEND = {"b": "bark", "L": "tan", "w": "clay", "k": "mud", "j": "mud", "n": "fog",
               "S": "sand", "T": "tan", "D": "clay", "d": "mud"}


def dock():
    s = new(16, 16, len(DOCK))
    for i, rows in enumerate(DOCK):
        s.frame(i + 1)
        stamp(s, rows, DOCK_LEGEND)
    return s


# ---------------------------------------------------------------------------------- preview
def hash2(x, y, s=0):
    """src/render/ground.ts hash2, in 32-bit integer arithmetic."""
    def i32(v):
        v &= 0xFFFFFFFF
        return v - (1 << 32) if v & 0x80000000 else v

    def imul(a, b):
        return i32((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF))

    h = i32(x * 374761393 + y * 668265263 + s * 2147483647)
    h = imul(h ^ ((h & 0xFFFFFFFF) >> 13), 1274126177)
    h = i32(h ^ ((h & 0xFFFFFFFF) >> 16))
    return (h & 0xFFFFFFFF) / 4294967296


def shore_preview(T):
    """The slice's shore (src/data/shore.ts SHORE_ROWS) built from these tiles, placeable =
    shallow within 2 tiles (Chebyshev) of the road, variants by hash."""
    src = (REPO / "src/data/shore.ts").read_text()
    rows = [ln.strip().strip("',") for ln in src.split("SHORE_ROWS = [")[1].split("]")[0].splitlines() if "'" in ln]
    H, W = len(rows), len(rows[0])
    road = [(x, y) for y in range(H) for x in range(W) if rows[y][x] == "#"]
    kind = {"~": "tile_deep", "-": "tile_mid", ".": "tile_shallow", "r": "tile_reeds", "s": "tile_sand",
            "g": "tile_grass", "T": "tile_grass", "H": "tile_grass", "#": "tile_road", "=": "tile_dock"}
    out = Image.new("RGBA", (W * 16, H * 16))
    for y in range(H):
        for x in range(W):
            k = kind[rows[y][x]]
            if k == "tile_shallow" and any(max(abs(x - a), abs(y - b)) <= 2 for a, b in road):
                k = "tile_placeable"
            fr = T[k]
            v = int(hash2(x, y, 5) * len(fr))
            out.alpha_composite(fr[v], (x * 16, y * 16))
    return out


if __name__ == "__main__":
    tiles = {
        "tile_deep": water("deep"), "tile_mid": water("mid"), "tile_shallow": water("shallow"),
        "tile_placeable": water("placeable"), "tile_reeds": reeds(), "tile_grass": grass(),
        "tile_sand": sand(), "tile_road": road(), "tile_dock": dock(),
    }
    T = {}
    for name, s in tiles.items():
        export(name, s, (0, 0), 0, OUT)
        T[name] = frames_of(s)
    m = shore_preview(T)
    m.save(OUT / "shore_1x.png")
    up(m, 2).save(OUT / "shore_2x.png")
    print("shore preview ->", OUT / "shore_2x.png")
