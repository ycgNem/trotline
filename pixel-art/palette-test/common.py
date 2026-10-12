"""Trotline palette test: shared drawing code.

Every sprite is a character map: each character is a colour ROLE ("ink", "crest", "fur"...),
never a colour. A build script binds every role to one colour of its palette by hand
(build_apollo.py, build_endesga.py), and may override a map where its palette needs a
different drawing. Nothing here remaps colours automatically: if a role is missing from a
kit the build fails, and every exported pixel is checked against the palette.

Sizes (top-down 3/4 view, 16 px tiles): water/grass/road/sand/dock tiles 16x16, gull 16x12,
raccoon 18x14, pufferfish 13x12, eel 20x8. Creatures face right and get a 1 px outline in the
palette's darkest ink.
"""
import json
import sys
from pathlib import Path

_local = Path(__file__).resolve().parents[2] / ".claude/skills/pixel-art-studio/scripts"
sys.path.insert(0, str(_local if _local.exists() else Path.home() / ".claude/skills/pixel-art-studio/scripts"))
from pixelstudio import Sprite, hex2rgba, rgba2hex  # noqa: E402

from PIL import Image, ImageDraw, ImageFont  # noqa: E402

HERE = Path(__file__).resolve().parent

# --------------------------------------------------------------------------------------------
# Maps. '.' is the tile's base role (tiles) or transparent (creatures).
# --------------------------------------------------------------------------------------------

# Water. Shallow: clear water, ripples lit on top, two submerged stones show the bottom.
# Mid: fewer, longer ripples, no bottom. Deep: long dark swells, a few dull crests.
# '-' crest  '_' trough  '*' glint  'p' bed stone  ':' swell (dark)
WATER = {
    "shallow": [
        "................",
        "..---...........",
        "...__.......*...",
        "................",
        "................",
        "........----....",
        ".........___....",
        "................",
        "..pp............",
        ".ppp............",
        "................",
        "...........---..",
        "....*.......__..",
        "................",
        "......--........",
        ".......__.......",
    ],
    "mid": [
        "................",
        "................",
        "....----........",
        ".....___........",
        "................",
        "................",
        "...........---..",
        "............__..",
        "................",
        "................",
        "..---...........",
        "...__...........",
        "................",
        "........---.....",
        ".........__.....",
        "................",
    ],
    "deep": [
        "................",
        "...:::::........",
        "................",
        "..........--....",
        "...........__...",
        "........::::::..",
        "................",
        ".--.............",
        "..__............",
        "....:::::.......",
        "................",
        "...........--...",
        "............__..",
        "..:::.....::::..",
        "................",
        "......--........",
    ],
    # Clear shallows (the placeable tile's base): the shallow tile's crests and glints but no
    # troughs or stones, so a placeable strip is visibly lighter and calmer than the rest.
    "clear": [
        "................",
        "..---...........",
        "............*...",
        "................",
        "................",
        "........----....",
        "................",
        "................",
        "................",
        "................",
        "................",
        "...........---..",
        "....*...........",
        "................",
        "......--........",
        "................",
    ],
}

# Caustic net for "clear shallows" in a palette with no pale water step: thin light lines over
# the ordinary shallow base, brighter knots where cells meet. Seamless (lines wrap). Started
# from toroidal Voronoi edges (5 cells, seed 7) and thinned by hand.
CAUSTIC = [
    ".......-.......-",
    "-......-.......-",
    "--.....-......--",
    ".-.....----..--.",
    "..-...-....---..",
    "..--.-......-...",
    ".---.........-..",
    "--...........---",
    "..--.........--.",
    "....-.......--..",
    ".....-.....--...",
    ".....------.....",
    "....--......-...",
    ".---..-......--.",
    "-......-.......-",
    "-......-........",
]

# The placeable-shallows marker, drawn over the shallow tile. 'x' mark, 'X' mark shadow.
MARK = {
    # Corner pegs: tiled, the four corners meeting at each grid vertex make one peg, so a
    # field of placeable water reads as a pegged-out pen; a lone tile shows four brackets.
    "pegs": [
        "xxx..........xxx",
        "xX............Xx",
        "x..............x",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "x..............x",
        "xX............Xx",
        "xxx..........xxx",
    ],
    # A dotted rim on every edge: tiled, a dotted grid over the placeable water.
    "rim": [
        "x.x.x.x.x.x.x.x.",
        "...............x",
        "x...............",
        "...............x",
        "x...............",
        "...............x",
        "x...............",
        "...............x",
        "x...............",
        "...............x",
        "x...............",
        "...............x",
        "x...............",
        "...............x",
        "x...............",
        ".x.x.x.x.x.x.x.x",
    ],
    # A light frame one pixel in, a darker line outside it: tiled, a raised grid of pens.
    "frame": [
        "XXXXXXXXXXXXXXXX",
        "XxxxxxxxxxxxxxxX",
        "Xx............xX",
        "Xx............xX",
        "Xx............xX",
        "Xx............xX",
        "Xx............xX",
        "Xx............xX",
        "Xx............xX",
        "Xx............xX",
        "Xx............xX",
        "Xx............xX",
        "Xx............xX",
        "Xx............xX",
        "XxxxxxxxxxxxxxxX",
        "XXXXXXXXXXXXXXXX",
    ],
}

GRASS = [
    "................",
    "..'.'...........",
    "...'......,.....",
    "...,.....,......",
    "............'.'.",
    ".......,.....'..",
    "......,......,..",
    ".'.'............",
    "..'......\".'....",
    "..,.......'.....",
    "..........,.....",
    ".....'.'........",
    "......'......,..",
    "......,.....,...",
    "............'...",
    "................",
]

# Packed dirt road, running left-right: two broken wheel ruts, pebbles lit from the top-left.
ROAD = [
    "................",
    ".....`......Oo..",
    "............oo..",
    "................",
    "::::...:::::..::",
    "................",
    "..Oo.......`....",
    "..o.............",
    "........`.......",
    "..........O.....",
    "..........o.....",
    "::..:::::...::::",
    "................",
    ".....Oo.........",
    ".`...oo.......`.",
    "................",
]

SAND = [
    "................",
    "...`.......,....",
    "................",
    ".........~~.....",
    "..,.......~~....",
    "................",
    "............`...",
    "...~~...........",
    "....~~......,...",
    "................",
    ".`........`.....",
    "...........~~...",
    "......,.....~~..",
    "................",
    "..~~.......`....",
    "...~~...........",
]

# Dock: planks run across the tile (the dock runs up-down, out from the shore). Nails line up
# in two columns over the joists; two butt joints. 'L' plank top edge (lit) 'w' plank
# 'D' butt joint 'g' gap 'k' grain 'n' nail
DOCK_PLANK = [
    "LLLLLLLLLLLLLLLL",
    "wwnwwkkwwwwwwnww",
    "wwwwwwwwwkkwwwww",
    "gggggggggggggggg",
    "LLLLLLLLLLLDLLLL",
    "wwnwwwwwwwwDwnww",
    "wwwwwwkkwwwDwwww",
    "gggggggggggggggg",
    "LLLLLLLLLLLLLLLL",
    "wwnwwwwkkwwwwnww",
    "wwwwkkwwwwwwwwww",
    "gggggggggggggggg",
    "LLLLDLLLLLLLLLLL",
    "wwnDwwwwwwkkwnww",
    "wwwDwwwkkwwwwwww",
    "gggggggggggggggg",
]

# Dock end over shallow water: planks, the end board's face (3/4 view), two piles with the
# deck's shadow on the water and a ripple where each pile enters it.
# 'F' end-board face, 'R'/'P'/'Q' pile lit/mid/dark; water: '~' base '_' trough '-' crest
# 's' shadow
DOCK_EDGE = [
    "LLLLLLLLLLLLLLLL",
    "wwnwwkkwwwwwwnww",
    "wwwwwwwwwkkwwwww",
    "gggggggggggggggg",
    "LLLLLLLLLLLDLLLL",
    "wwnwwwwwwwwDwnww",
    "wwwwwwkkwwwDwwww",
    "gggggggggggggggg",
    "LLLLLLLLLLLLLLLL",
    "FFFFFFFFFFFFFFFF",
    "sRPQssssssssRPQs",
    "_RPQ________RPQ_",
    "~RPQ~~~~~~~~RPQ~",
    "-RPQ-~~~~~~-RPQ-",
    "~---~~~~~~~~---~",
    "~~~~~~~~~~~~~~~~",
]

# ---- creatures (fill only; the ink outline is added outside, then POST pixels on top) ----

# Herring gull in flight, near wing raised (crooked at the wrist, black hand), the far wing a
# darker sliver behind it, seen from a little above.
# 'W' white 'w' white shade 'G' grey mantle 'g' mantle shade 'K' black wingtip 'Y' bill
# 'e' eye
GULL = [
    "................",
    ".KKK............",
    "..KKKGG.........",
    "....GGGGg.......",
    "......GGGg......",
    ".......gGGg.WW..",
    "..W.....gGGWeWY.",
    ".WWWWWWWWWWWWw..",
    "..wwWWWWWWWww...",
    ".....wwwwww.....",
    "................",
    "................",
]

# Raccoon walking. 'L' fur light 'F' fur 'D' fur dark 'd' far legs/feet 'M' mask
# 'W' white face 'e' eye 'N' nose 'T' tail ring dark 't' tail ring light
RACCOON = [
    "..................",
    "............W.W...",
    "........LL..dFd...",
    "......LLLLLLFFFF..",
    ".....LFFFFFFFWWWW.",
    "...TtLFFFFFFFMeMW.",
    "..tTtFFFFFFFWMMWN.",
    ".TtT.DFFFFFFWWWW..",
    ".Tt..DDFFFFDDW....",
    ".....dDDDDDDd.....",
    ".....dD.dd.dD.D...",
    ".....dD.dd.dD.D...",
    "....dd...d.dd..D..",
    "..................",
]

# Pufferfish seen from above, puffed. 'L' light 'B' body 'D' shade 's' spot 'b' belly
# 'e' eye 'f' fin. POST: spines (outside the outline) and the beak.
PUFFER = [
    ".............",
    ".............",
    ".....LLLL....",
    "....LLLBBB...",
    ".f.LLBsBEeB..",
    "ffBLBBBBsBB..",
    "ffBBsBBBBBD..",
    ".f.BBBBsEeD..",
    "....bbBBDD...",
    ".....bbbb....",
    ".............",
    ".............",
]
PUFFER_POST = [
    "....k..k.....",
    ".............",
    "..k.......k..",
    ".............",
    "............k",
    "...........m.",
    "...........m.",
    "............k",
    ".............",
    "..k.......k..",
    ".............",
    "....k..k.....",
]

# Eel swimming right in a slow S. 'D' dark back 'B' flank 'b' belly 'e' eye 'f' tail fin
# 'p' pectoral fin
EEL = [
    "....................",
    "............DDDDD...",
    ".fD.......DDBBBBeDD.",
    "..fDD....DBBBbbBBBb.",
    "...BBDDDDBBb..pbbb..",
    "....bBBBBb..........",
    ".....bbbb...........",
    "....................",
]


# --------------------------------------------------------------------------------------------
# Drawing
# --------------------------------------------------------------------------------------------

def _stamp(s, rows, legend, K, skip="."):
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == skip:
                continue
            s.px(x, y, K[legend[ch]])


def _sprite(palette, w, h):
    return Sprite(w, h, palette=palette)


MARK_BASE = {"pegs": "clear", "rim": "shallow", "frame": "shallow"}
# The pick: "clear" = no overlay; the placeable tile is the shallow tile's calm map drawn one
# value step lighter (kit "placeable"), so placeable water is the palest strip by the road.
PLACEABLE_STYLES = ("clear", "pegs", "rim", "frame")


def water_tile(depth, K, palette, maps=None, kit=None):
    maps = maps or WATER
    W = K["water"][kit or depth]
    s = _sprite(palette, 16, 16)
    s.rect(0, 0, 15, 15, W["base"])
    if W.get("dither"):  # (colour, mix, pattern): a palette with no in-between step fakes one
        c, m, pat = W["dither"]
        s.dither(0, 0, 15, 15, "keep", c, mix=m, pattern=pat)
    _stamp(s, maps[depth], {"-": "crest", "_": "trough", "*": "glint", "p": "bed", ":": "swell"}, W)
    return s


def placeable_tile(K, palette, style="clear", maps=None, mark_maps=None):
    if style == "clear":
        return water_tile("clear", K, palette, maps, kit="placeable")
    base = MARK_BASE.get(style, "shallow")
    s = water_tile(base, K, palette, maps, kit="shallow")
    _stamp(s, (mark_maps or MARK)[style], {"x": "mark", "X": "mark_shadow"}, K)
    return s


def simple_tile(rows, legend, base_role, K, palette):
    s = _sprite(palette, 16, 16)
    s.rect(0, 0, 15, 15, K[base_role])
    _stamp(s, rows, legend, K)
    return s


def grass_tile(K, palette, rows=None):
    return simple_tile(rows or GRASS, {",": "grass_dark", "'": "grass_light", '"': "grass_tip"},
                       "grass", K, palette)


def road_tile(K, palette, rows=None):
    return simple_tile(rows or ROAD, {":": "road_dark", "`": "road_light", "o": "pebble_dark",
                                      "O": "pebble_light"}, "road", K, palette)


def sand_tile(K, palette, rows=None):
    return simple_tile(rows or SAND, {",": "sand_dark", "`": "sand_light", "~": "sand_ripple"},
                       "sand", K, palette)


DOCK_LEGEND = {"L": "wood_light", "w": "wood", "D": "wood_joint", "g": "gap", "k": "grain",
               "n": "nail", "F": "board_face", "R": "pile_light", "P": "pile", "Q": "pile_dark"}


def dock_plank_tile(K, palette, rows=None):
    s = _sprite(palette, 16, 16)
    _stamp(s, rows or DOCK_PLANK, DOCK_LEGEND, K, skip=None)
    return s


def dock_edge_tile(K, palette, rows=None):
    s = _sprite(palette, 16, 16)
    W = K["water"]["shallow"]
    K2 = dict(K)
    K2.update({"w_base": W["base"], "w_trough": W["trough"], "w_crest": W["crest"],
               "w_shadow": K["dock_shadow"]})
    legend = dict(DOCK_LEGEND)
    legend.update({"~": "w_base", "_": "w_trough", "-": "w_crest", "s": "w_shadow"})
    _stamp(s, rows or DOCK_EDGE, legend, K2, skip=None)
    return s


def creature(rows, legend, K, palette, post=None, post_legend=None):
    h, w = len(rows), len(rows[0])
    assert all(len(r) == w for r in rows), "ragged map"
    s = _sprite(palette, w, h)
    _stamp(s, rows, legend, K)
    s.outline(K["ink"], where="outside")
    if post:
        _stamp(s, post, post_legend, K)
    return s


def gull(K, palette, rows=None):
    return creature(rows or GULL, {"W": "gull_white", "w": "gull_shade", "G": "gull_mantle",
                                   "g": "gull_mantle_dark", "K": "gull_tip", "Y": "gull_bill",
                                   "e": "ink"}, K, palette)


def raccoon(K, palette, rows=None):
    return creature(rows or RACCOON, {"L": "coon_light", "F": "coon_fur", "D": "coon_dark",
                                      "d": "coon_deep", "M": "coon_mask", "W": "coon_face",
                                      "e": "coon_eye", "N": "ink", "T": "coon_ring",
                                      "t": "coon_ring_light"}, K, palette)


def puffer(K, palette, rows=None, post=None):
    return creature(rows or PUFFER, {"L": "puff_light", "B": "puff", "D": "puff_dark",
                                     "s": "puff_spot", "b": "puff_belly", "e": "ink",
                                     "E": "puff_eye_ring", "f": "puff_fin"}, K, palette,
                    post=post or PUFFER_POST, post_legend={"k": "ink", "m": "puff_beak"})


def eel(K, palette, rows=None):
    return creature(rows or EEL, {"D": "eel_dark", "B": "eel", "b": "eel_belly", "e": "eel_eye",
                                  "f": "eel_fin", "p": "eel_fin"}, K, palette)


# --------------------------------------------------------------------------------------------
# Checks
# --------------------------------------------------------------------------------------------

def check_palette(img, palette_hex, name):
    pal = {hex2rgba(c)[:3] for c in palette_hex}
    bad = set()
    for r, g, b, a in img.getdata():
        if a == 0:
            continue
        if a != 255:
            bad.add("semi-alpha %d" % a)
        elif (r, g, b) not in pal:
            bad.add(rgba2hex((r, g, b, 255)))
    if bad:
        raise SystemExit("OFF-PALETTE in %s: %s" % (name, sorted(bad)))


def used(img):
    out = {}
    for r, g, b, a in img.getdata():
        if a:
            k = rgba2hex((r, g, b, 255))
            out[k] = out.get(k, 0) + 1
    return dict(sorted(out.items(), key=lambda kv: -kv[1]))


# --------------------------------------------------------------------------------------------
# Composition
# --------------------------------------------------------------------------------------------

def img(s):
    return s.composite(1)


def patch(grid):
    """grid: rows of tile images -> one image."""
    h, w = len(grid), len(grid[0])
    out = Image.new("RGBA", (16 * w, 16 * h), (0, 0, 0, 0))
    for y, row in enumerate(grid):
        for x, t in enumerate(row):
            out.alpha_composite(t, (16 * x, 16 * y))
    return out


def put(base, sprite_img, cx, cy):
    """Place a sprite with its centre at (cx, cy) on a copy of base."""
    out = base.copy()
    out.alpha_composite(sprite_img, (int(cx - sprite_img.width // 2), int(cy - sprite_img.height // 2)))
    return out


def up(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


FONT = ImageFont.load_default()
SHEET_BG = (46, 46, 52)
TEXT = (225, 225, 225)
DIM = (150, 150, 158)


def sheet(title, sections, path):
    """sections: [(heading, [(label, image), ...]), ...]; every image shown at 1x then 3x."""
    pad, gap, lh = 12, 10, 14
    rows = []
    width = 0
    for heading, items in sections:
        x = pad
        hmax = 0
        for label, im in items:
            x += im.width * 4 + 6 + gap * 2
            hmax = max(hmax, im.height * 3)
        width = max(width, x)
        rows.append((heading, items, hmax))
    height = pad + 22 + sum(lh * 2 + h + gap * 2 for _, _, h in rows) + pad
    out = Image.new("RGB", (width + pad, height), SHEET_BG)
    d = ImageDraw.Draw(out)
    d.text((pad, pad), title, fill=TEXT, font=FONT)
    y = pad + 22
    for heading, items, hmax in rows:
        d.text((pad, y), heading, fill=TEXT, font=FONT)
        y += lh
        x = pad
        for label, im in items:
            d.text((x, y), label, fill=DIM, font=FONT)
            out.paste(im.convert("RGB"), (x, y + lh), im)
            big = up(im, 3)
            out.paste(big.convert("RGB"), (x + im.width + 6, y + lh), big)
            x += im.width + 6 + big.width + gap * 2
        y += lh + hmax + gap * 2
    out.save(path)
    print("sheet ->", path, out.size)
    return out


def combine(path_a, path_b, out_path, label_a, label_b):
    a, b = Image.open(path_a).convert("RGB"), Image.open(path_b).convert("RGB")
    band = 26
    W = max(a.width, b.width)
    out = Image.new("RGB", (W, a.height + b.height + band * 2), (20, 20, 24))
    d = ImageDraw.Draw(out)
    d.rectangle([0, 0, W, band - 1], fill=(70, 60, 30))
    d.text((10, 7), label_a, fill=(255, 240, 200), font=FONT)
    out.paste(a, (0, band))
    y = band + a.height
    d.rectangle([0, y, W, y + band - 1], fill=(30, 50, 70))
    d.text((10, y + 7), label_b, fill=(200, 230, 255), font=FONT)
    out.paste(b, (0, y + band))
    out.save(out_path)
    print("combined ->", out_path, out.size)


# --------------------------------------------------------------------------------------------
# The whole test for one palette
# --------------------------------------------------------------------------------------------

def run(name, title, palette, K, overrides=None, mark_style="clear"):
    """Draw every sprite in one palette, export 1x PNGs + 8x previews, the contact sheet."""
    ov = overrides or {}
    outdir = HERE / name
    outdir.mkdir(exist_ok=True)
    wm = ov.get("water")

    t = {
        "water_shallow": water_tile("shallow", K, palette, wm),
        "water_placeable": placeable_tile(K, palette, mark_style, wm, ov.get("mark")),
        "water_mid": water_tile("mid", K, palette, wm),
        "water_deep": water_tile("deep", K, palette, wm),
        "grass": grass_tile(K, palette, ov.get("grass")),
        "road": road_tile(K, palette, ov.get("road")),
        "sand": sand_tile(K, palette, ov.get("sand")),
        "dock_plank": dock_plank_tile(K, palette, ov.get("dock_plank")),
        "dock_edge": dock_edge_tile(K, palette, ov.get("dock_edge")),
    }
    c = {
        "gull": gull(K, palette, ov.get("gull")),
        "raccoon": raccoon(K, palette, ov.get("raccoon")),
        "puffer": puffer(K, palette, ov.get("puffer"), ov.get("puffer_post")),
        "eel": eel(K, palette, ov.get("eel")),
    }
    alt_marks = {st: img(placeable_tile(K, palette, st, wm, ov.get("mark")))
                 for st in PLACEABLE_STYLES if st != mark_style}

    report = {}
    for k, s in list(t.items()) + list(c.items()):
        im = img(s)
        check_palette(im, palette, "%s/%s" % (name, k))
        s.save_png(str(outdir / ("%s.png" % k)))
        report[k] = used(im)
    for k, s in c.items():
        s.preview(str(outdir / ("%s_8x.png" % k)), scale=8, labels=False)
        s.save_silhouette(str(outdir / ("%s_silhouette.png" % k)), scale=6)
        print(k, end=" ")
        s.stats()
    for k, s in t.items():
        s.save_png(str(outdir / ("%s_8x.png" % k)), scale=8)
    (outdir / "colors.json").write_text(json.dumps(report, indent=1))

    T = {k: img(v) for k, v in t.items()}
    C = {k: img(v) for k, v in c.items()}

    def field(tile, w=3, h=2):
        return patch([[T[tile]] * w for _ in range(h)])

    sh, pl, md, dp = "water_shallow", "water_placeable", "water_mid", "water_deep"

    def pen(ptile):  # a 3x2 block of placeable water inside ordinary shallows
        return patch([[T[sh]] * 5, [T[sh], ptile, ptile, ptile, T[sh]],
                      [T[sh], ptile, ptile, ptile, T[sh]], [T[sh]] * 5])

    bands = patch([[T["road"]] * 4, [T[pl]] * 4, [T[sh]] * 4, [T[md]] * 4, [T[dp]] * 4])
    dock = patch([[T["sand"], T["dock_plank"], T["sand"]],
                  [T[sh], T["dock_plank"], T[sh]],
                  [T[sh], T["dock_edge"], T[sh]],
                  [T[sh], T[sh], T[sh]]])

    sections = [
        ("WATER  shallow | placeable shallow | mid | deep", [
            ("shallow", field(sh)), ("placeable", field(pl)), ("mid", field(md)), ("deep", field(dp))]),
        ("PLACEABLE vs NOT (pick: '%s' = one value step lighter, no overlay), bands from the road"
         % mark_style, [
            ("placeable block in shallows", pen(T[pl])), ("road/placeable/shallow/mid/deep", bands)]),
        ("PLACEABLE marker options not picked (pegs | dotted rim | frame)", [
            (st, pen(im)) for st, im in alt_marks.items()]),
        ("PUFFERFISH (defender) on shallow | mid | deep", [
            ("on placeable", put(field(pl), C["puffer"], 24, 16)),
            ("on mid", put(field(md), C["puffer"], 24, 16)),
            ("on deep", put(field(dp), C["puffer"], 24, 16))]),
        ("EEL (defender) on shallow | mid | deep", [
            ("on placeable", put(field(pl), C["eel"], 24, 16)),
            ("on mid", put(field(md), C["eel"], 24, 16)),
            ("on deep", put(field(dp), C["eel"], 24, 16))]),
        ("GULL (thief) on road | grass      RACCOON (thief) on road | grass", [
            ("gull / road", put(field("road"), C["gull"], 24, 16)),
            ("gull / grass", put(field("grass"), C["gull"], 24, 16)),
            ("raccoon / road", put(field("road"), C["raccoon"], 24, 16)),
            ("raccoon / grass", put(field("grass"), C["raccoon"], 24, 16))]),
        ("DOCK  plank | end over water | out from the beach", [
            ("plank", T["dock_plank"]), ("edge", T["dock_edge"]), ("dock", dock)]),
        ("BOARD  a slice of shore at play size", [("board", board(T, C))]),
    ]
    sheet(title, sections, str(HERE / ("contact_%s.png" % name)))
    a, b = HERE / "contact_apollo.png", HERE / "contact_endesga.png"
    if a.exists() and b.exists():
        combine(a, b, HERE / "contact_both.png", "A: APOLLO (46 colours)", "B: ENDESGA 32")
    return t, c


def board(T, C):
    """A 12x9-tile slice of shore: grass, the road, placeable shallows along it, dock shallows
    with the dock out from a beach, mid water, deep water. Defenders only on placeable water."""
    g, r, s = T["grass"], T["road"], T["sand"]
    pl, sh, md, dp = T["water_placeable"], T["water_shallow"], T["water_mid"], T["water_deep"]
    dk, de = T["dock_plank"], T["dock_edge"]
    grid = [
        [g] * 12,
        [g] * 9 + [s, s, s],
        [r] * 12,
        [pl] * 8 + [sh, s, dk, s],
        [sh] * 10 + [dk, sh],
        [sh] * 10 + [de, sh],
        [md] * 12,
        [dp] * 12,
        [dp] * 12,
    ]
    im = patch(grid)
    im = put(im, C["raccoon"], 3 * 16 + 8, 2 * 16 + 6)
    im = put(im, C["gull"], 7 * 16 + 8, 1 * 16 + 10)
    im = put(im, C["puffer"], 1 * 16 + 8, 3 * 16 + 8)
    im = put(im, C["eel"], 5 * 16, 3 * 16 + 8)
    im = put(im, C["puffer"], 7 * 16 + 8, 3 * 16 + 8)
    return im
