"""
build_rod_station.py -- Trotline, rigs family: the ROD STATION.

What it builds
  The cheapest rig in Trotline: a small plank dock pad on the shore with a dark wooden post, a
  white PVC rod holder strapped to the post, one rod (cork grips, spinning reel, a tapered dark
  blank with gold guide wraps and a hi-vis tip) and a minnow bucket with a red band. Plus the
  parts the game drives (all direct children of the rod_station root):
    rod_tip  EMPTY at the very end of the blank, where the line leaves the rod.
    rod_butt EMPTY on the rod axis where the rod leaves the top of the holder tube.
    rod_mid  EMPTY on the rod's (bent) axis, halfway along it from rod_butt to rod_tip. At long
             range the game draws the rod as a 1-px polyline rod_butt -> rod_mid -> rod_tip.
    line     MESH, a 0.03 m square box exactly 1.0 m long, origin at its TOP (at rod_tip),
             hanging straight down. The game scales line.scale.y to reach the band.
    bobber   MESH, the red/white float alone (0.08 m), origin at its CENTRE, placed on the line
             0.3 m below the tip. The game puts that centre on the water surface.
    sinker   MESH, lead weight + gold hook (0.072 m), origin at its own top, placed at the bottom
             of the line. The game moves it to the band (on a bottom rig: onto the bed, no float).
  Everything else is merged into one flat-shaded mesh, rod_station_body. All parts are UV-mapped
  into regions of one 64x64 pixel atlas that this script draws pixel by pixel from the Apollo
  palette, with one material (ts_rigs_atlas: Principled, roughness 1, metallic 0, texture sampled
  'Closest' so the glTF sampler is NEAREST).

Coordinates
  Authored in three.js / glTF terms: 1 unit = 1 m, Y up, forward = +Z (out over the water),
  origin = ground level at the back-centre of the deck. B() converts a three.js point to Blender
  (x, -z, y); the glTF exporter's Y-up conversion turns it back, so the numbers here are the
  numbers the game sees.

Outputs (resolved from __file__; repo root = two levels above this file's folder)
  art/rigs/rod_station_tex.png   the 64x64 atlas (also embedded in the glb)
  public/models/rigs.glb         the rigs family file (only the rod_station hierarchy)
  art/rigs/preview.png           a 3/4 Workbench still, texture with closest-pixel sampling,
                                 over a stand-in shore and dark water (staging is not exported)

Run
  Live Blender (Text editor or Python console):
      p = r"C:\\Users\\jacks\\Documents\\trotline\\art\\rigs\\build_rod_station.py"
      exec(open(p).read(), {'__file__': p, '__name__': '__main__'})
  Headless, from the repo root:
      "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\blender.exe" --background
          --factory-startup --python art/rigs/build_rod_station.py

Safety
  Builds only inside the scene "trotline_rigs" (created if missing). On re-run it deletes only
  objects in that scene and datablocks whose names start with "ts_". It never saves the .blend.
  Deterministic: wood grain is placed by hand; only the cork specks use a fixed-seed xorshift.
"""

import json
import math
import os
import struct

import bmesh
import bpy
from mathutils import Vector

# --------------------------------------------------------------------------------------------
# Paths and constants
# --------------------------------------------------------------------------------------------

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
TEX_PATH = os.path.join(REPO, "art", "rigs", "rod_station_tex.png")
GLB_PATH = os.path.join(REPO, "public", "models", "rigs.glb")
PREVIEW_PATH = os.path.join(REPO, "art", "rigs", "preview.png")

SCENE_NAME = "trotline_rigs"
TEX = 64            # atlas size in pixels
INSET = 0.1         # UVs stay 0.1 texel inside every region so Closest sampling never bleeds
TRI_BUDGET = 2000   # THREEJS-NOTES rule 7: <= 2k triangles per rig

# The Apollo palette (provisional project palette). Every atlas pixel must be one of these.
PAL = {
    "navy0": "#172038", "navy1": "#253a5e", "blue2": "#3c5e8b", "blue3": "#4f8fba",
    "blue4": "#73bed3", "aqua5": "#a4dddb",
    "grn0": "#19332d", "grn1": "#25562e", "grn2": "#468232", "grn3": "#75a743",
    "grn4": "#a8ca58", "grn5": "#d0da91",
    "brn0": "#4d2b32", "brn1": "#7a4841", "brn2": "#ad7757", "brn3": "#c09473",
    "brn4": "#d7b594", "brn5": "#e7d5b3",
    "rust0": "#341c27", "rust1": "#602c2c", "rust2": "#884b2b", "rust3": "#be772b",
    "rust4": "#de9e41", "rust5": "#e8c170",
    "red0": "#241527", "red1": "#411d31", "red2": "#752438", "red3": "#a53030",
    "red4": "#cf573c", "red5": "#da863e",
    "pur0": "#1e1d39", "pur1": "#402751", "pur2": "#7a367b", "pur3": "#a23e8c",
    "pur4": "#c65197", "pur5": "#df84a5",
    "gry0": "#090a14", "gry1": "#10141f", "gry2": "#151d28", "gry3": "#202e37",
    "gry4": "#394a50", "gry5": "#577277", "gry6": "#819796", "gry7": "#a8b5b2",
    "gry8": "#c7cfcc", "gry9": "#ebede9",
}
APOLLO = set(PAL.values())

# Atlas regions: (x, y, w, h) in pixels, origin at the TOP-left of the image.
# Texel density: the big wooden parts and the bucket are sized to ~9-10 texels per metre so their
# texels stay near one internal pixel at the overview camera (~7 px/m at 480x270) instead of
# speckling. Regions of one flat colour (fascia, stringer, inner) have no density to speak of.
R = {
    "deck_top":   (0, 0, 11, 14),   # 1.2 x 1.6 m -> 9.2 x 8.8 texels/m: 5 planks (along X),
                                    # 2 rows each, 1-row seams between them
    "deck_end":   (0, 16, 14, 1),   # left/right slab sides (1.6 m): the 5 plank ends, 8.8 tx/m
    "fascia":     (0, 18, 1, 1),    # front/back slab sides: plank edge, flat colour
    "under":      (0, 20, 1, 14),   # underside: dark planks (constant along X, so 1 column)
    "stringer":   (2, 20, 1, 1),    # beams under the deck, flat colour
    "post":       (4, 20, 2, 12),   # post sides, 0.2 x 1.24 m -> 10 x 9.7 tx/m; top row = top
    "leg":        (4, 30, 1, 2),    # stub legs (0.12 x 0.21 m): bottom of the post texture
    "post_top":   (8, 20, 2, 2),    # end grain, 0.2 m -> 10 tx/m
    "leg_top":    (8, 20, 1, 1),
    "rope":       (8, 23, 2, 1),    # rope band, 0.23 x 0.12 m -> 8.8 x 8.3 tx/m
    "bucket":     (12, 20, 8, 3),   # bucket wall: 8 faces x 1 px (~9 tx/m), 3 rows (10 tx/m)
    "bait":       (12, 24, 3, 3),   # bucket contents, 0.25 m across -> 12 tx/m
    "cork":       (56, 8, 8, 8),
    "reel":       (40, 16, 8, 8),   # reel body metal with a red accent ring
    "dark":       (48, 16, 8, 8),   # dark metal: reel seat, butt cap, straps, crank
    "pvc":        (56, 16, 8, 8),   # white PVC holder tube
    "rod":        (40, 24, 8, 32),  # blank: cols 0-1 top, 2-3 side, 4-5 bottom, 6-7 side
    "line":       (48, 48, 4, 4),
    "bob_red":    (52, 48, 4, 4),
    "bob_white":  (56, 48, 4, 4),
    "lead":       (60, 48, 4, 4),
    "hook":       (48, 52, 4, 4),
    "inner":      (52, 52, 4, 4),   # bucket inside wall / bottom
    "spool":      (56, 52, 4, 4),   # pale line wound on the reel spool
    "pvc_cap":    (60, 52, 4, 4),   # top of the holder tube: white ring, dark hole
}


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin(name):
    """Palette colour as a linear RGBA tuple (for world / viewport colours)."""
    r, g, b = hex_rgb(PAL[name])
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0)


class Rng:
    """xorshift32 with a fixed seed: same grain every run, on every machine."""

    def __init__(self, seed):
        self.s = (seed & 0xFFFFFFFF) or 1

    def next(self):
        x = self.s
        x ^= (x << 13) & 0xFFFFFFFF
        x ^= x >> 17
        x ^= (x << 5) & 0xFFFFFFFF
        self.s = x & 0xFFFFFFFF
        return self.s

    def randint(self, a, b):
        return a + self.next() % (b - a + 1)


# --------------------------------------------------------------------------------------------
# The atlas, drawn pixel by pixel
# --------------------------------------------------------------------------------------------

def draw_atlas():
    C = [["gry0"] * TEX for _ in range(TEX)]  # C[y][x], y = 0 at the top; unused = darkest grey
    rng = Rng(20261012)

    def rect(x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                C[yy][xx] = c

    def px(x, y, c):
        C[y][x] = c

    # Deck top, 11 x 14 texels for 1.2 x 1.6 m (~9 texels/m): 5 bold planks running across the
    # deck (along X), each 2 rows (~0.23 m) in alternating warm tones, 1-row seams between them,
    # one or two short grain marks per plank. Row 0 = back of the deck, row 13 = front.
    tones = ["brn2", "brn3", "brn2", "brn3", "brn2"]
    grain_marks = [((2, 1, 3), (7, 0, 2)), ((5, 1, 3),), ((1, 0, 2), (8, 1, 3)), ((3, 0, 3),),
                   ((6, 1, 3), (0, 0, 2))]                    # (x, row in plank, length)
    for i, base in enumerate(tones):
        y0 = 3 * i
        rect(0, y0, 11, 2, base)
        if i < 4:
            rect(0, y0 + 2, 11, 1, "brn1")                    # seam to the next plank
        for gx, gr, gn in grain_marks[i]:
            rect(gx, y0 + gr, gn, 1, "rust2" if base == "brn2" else "brn2")

    # Slab sides: the 5 plank ends (left/right, 1.6 m), a flat plank edge (front/back), the dark
    # underside (5 planks; constant along X so one column), flat dark stringers.
    for i in range(14):
        px(i, 16, "brn0" if i % 3 == 2 else "brn1")
    px(0, 18, "brn2")
    for i in range(14):
        px(0, 20 + i, "rust0" if i % 3 == 2 else "brn0")
    px(2, 20, "rust0")

    # Post sides, 2 x 12 texels for 0.2 x 1.24 m: dark weathered wood, lighter top row, one grain
    # streak, one check crack, a wet green-black foot (the waterline on a piling). The stub legs
    # sample the bottom of the left column.
    rect(4, 20, 2, 12, "brn0")
    rect(4, 20, 2, 1, "brn1")
    rect(4, 22, 1, 3, "brn1")
    rect(5, 26, 1, 2, "rust0")
    px(5, 30, "grn0")
    rect(4, 31, 2, 1, "grn0")

    # Post top end grain (2 x 2), rope band (2 x 1: light / darker strand).
    px(8, 20, "brn1"); px(9, 20, "brn2"); px(8, 21, "brn2"); px(9, 21, "brn1")
    px(8, 23, "brn4"); px(9, 23, "brn3")

    # Cork: tan with pits and specks.
    rect(56, 8, 8, 8, "brn3")
    for _ in range(10):
        px(56 + rng.randint(0, 7), 8 + rng.randint(0, 7), "brn2")
    for _ in range(4):
        px(56 + rng.randint(0, 7), 8 + rng.randint(0, 7), "rust2")
    for _ in range(3):
        px(56 + rng.randint(0, 7), 8 + rng.randint(0, 7), "brn4")

    # Reel metal, rows along the reel axis (top row = front), red accent ring.
    for y, c in zip(range(16, 24), ["gry5", "gry6", "gry7", "gry6", "red3", "gry6", "gry5", "gry4"]):
        rect(40, y, 8, 1, c)

    # Dark metal.
    rect(48, 16, 8, 8, "gry3")
    rect(48, 16, 8, 1, "gry4")
    rect(48, 23, 8, 1, "gry2")
    px(50, 18, "gry5"); px(53, 20, "gry5")

    # White PVC tube: highlight and shade columns, darker lip at the top end.
    rect(56, 16, 8, 8, "gry8")
    rect(57, 16, 1, 8, "gry9")
    rect(62, 16, 1, 8, "gry7")
    rect(56, 16, 8, 1, "gry7")

    # Rod blank: v runs butt (row 55) -> tip (row 24), ~7 cm per row. Slate lit top face (what
    # the high game camera sees, so the rod stays a continuous line over dark water), dark sides,
    # darker belly. Only four gold wraps (winding check + three guides): more read as a striped
    # pole at this texel size. Hi-vis tip: orange then white, as on real bite-detection tips.
    for y in range(24, 56):
        rect(40, y, 2, 1, "gry5")
        rect(42, y, 2, 1, "gry3")
        rect(44, y, 2, 1, "gry2")
        rect(46, y, 2, 1, "gry3")
        if y % 6 == 0:
            px(41, y, "gry6")
    for y in (54, 46, 37, 30):
        rect(40, y, 8, 1, "rust4")
    rect(40, 26, 8, 2, "red4")
    rect(40, 24, 8, 2, "gry9")

    # Bucket wall, 8 faces x 1 texel around, 3 rows for 0.3 m: pale body, red band, shaded foot
    # (the rim face uses the white line colour). Bait, 3 x 3 for the 0.25 m water surface: dark
    # water with three silver minnow flashes.
    rect(12, 20, 8, 1, "gry8")
    rect(12, 21, 8, 1, "red3")
    rect(12, 22, 8, 1, "gry7")
    for (x, y), c in zip(((12, 24), (13, 24), (14, 24), (12, 25), (13, 25), (14, 25),
                          (12, 26), (13, 26), (14, 26)),
                         ("grn0", "grn1", "gry8", "grn0", "gry9", "grn0", "gry8", "grn0", "grn0")):
        px(x, y, c)

    # Small solids.
    rect(48, 48, 4, 4, "gry9")                                  # line
    rect(52, 48, 4, 3, "red4"); rect(52, 51, 4, 1, "red3")      # bobber top
    rect(56, 48, 4, 3, "gry9"); rect(56, 51, 4, 1, "gry8")      # bobber bottom
    rect(60, 48, 4, 4, "gry5"); rect(60, 48, 4, 1, "gry6")      # lead
    rect(48, 52, 4, 4, "rust4"); rect(48, 52, 4, 1, "rust5")    # gold hook
    rect(52, 52, 4, 4, "gry4")                                  # bucket inside
    for y in range(52, 56):                                     # line on the spool
        rect(56, y, 4, 1, "gry9" if y % 2 == 0 else "gry8")
    rect(60, 52, 4, 4, "gry8"); rect(61, 53, 2, 2, "gry2")      # tube mouth

    for row in C:
        for c in row:
            assert PAL[c] in APOLLO
    return C


def make_image(C):
    """Write the atlas into a Blender image and save it as PNG (exact palette bytes)."""
    img = bpy.data.images.new("ts_rod_station_tex", TEX, TEX, alpha=True)
    flat = []
    for by in range(TEX):            # Blender pixel rows start at the bottom
        for x in range(TEX):
            r, g, b = hex_rgb(PAL[C[TEX - 1 - by][x]])
            flat.extend((r / 255.0, g / 255.0, b / 255.0, 1.0))
    img.pixels.foreach_set(flat)
    img.filepath_raw = TEX_PATH
    img.file_format = "PNG"
    img.save()
    return img


# --------------------------------------------------------------------------------------------
# Geometry helpers (all in three.js space; converted to Blender at mesh creation)
# --------------------------------------------------------------------------------------------

def V(x, y, z):
    return Vector((x, y, z))


def B(p):
    """three.js (x, y up, z forward) -> Blender (x, y = -z, z up)."""
    return Vector((p[0], -p[2], p[1]))


def ruv(reg, uf, vf):
    """Fractional position inside an atlas region -> UV (v up, as Blender and glTF-after-flip)."""
    x, y, w, h = R[reg]
    px_ = x + INSET + uf * (w - 2 * INSET)
    py_ = y + INSET + (1.0 - vf) * (h - 2 * INSET)
    return (px_ / TEX, 1.0 - py_ / TEX)


def newell(pts):
    n = Vector((0.0, 0.0, 0.0))
    for i, a in enumerate(pts):
        b = pts[(i + 1) % len(pts)]
        n.x += (a.y - b.y) * (a.z + b.z)
        n.y += (a.z - b.z) * (a.x + b.x)
        n.z += (a.x - b.x) * (a.y + b.y)
    return n


class Builder:
    """Collects polygons with per-corner UVs; each one is wound to face along a hint vector."""

    def __init__(self):
        self.faces = []

    def poly(self, pts, uvs, hint):
        P, U = [], []
        for p, uv in zip(pts, uvs):          # drop repeated corners (cone apexes)
            if P and (p - P[-1]).length < 1e-9:
                continue
            P.append(p.copy()); U.append(uv)
        if len(P) > 2 and (P[0] - P[-1]).length < 1e-9:
            P.pop(); U.pop()
        if len(P) < 3:
            return
        if newell(P).dot(hint) < 0:
            P.reverse(); U.reverse()
        self.faces.append((P, U))


def box(b, x0, x1, y0, y1, z0, z1, top=None, bottom=None, front=None, back=None,
        left=None, right=None, sides=None):
    """Axis-aligned box. Side faces map u left->right as seen from outside, v up."""
    if sides:
        front = front or sides; back = back or sides; left = left or sides; right = right or sides
    q = lambda r: [ruv(r, 0, 0), ruv(r, 1, 0), ruv(r, 1, 1), ruv(r, 0, 1)]
    if top:
        b.poly([V(x0, y1, z1), V(x1, y1, z1), V(x1, y1, z0), V(x0, y1, z0)], q(top), V(0, 1, 0))
    if bottom:
        b.poly([V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1)], q(bottom), V(0, -1, 0))
    if front:
        b.poly([V(x0, y0, z1), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z1)], q(front), V(0, 0, 1))
    if back:
        b.poly([V(x1, y0, z0), V(x0, y0, z0), V(x0, y1, z0), V(x1, y1, z0)], q(back), V(0, 0, -1))
    if right:
        b.poly([V(x1, y0, z1), V(x1, y0, z0), V(x1, y1, z0), V(x1, y1, z1)], q(right), V(1, 0, 0))
    if left:
        b.poly([V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z0)], q(left), V(-1, 0, 0))


def frame(t):
    up = V(0, 1, 0)
    if abs(t.dot(up)) > 0.99:
        up = V(0, 0, 1)
    e1 = (up - t * up.dot(t)).normalized()
    return e1, t.cross(e1)


def loft(b, centers, apothems, sides, regs, cap0=None, cap1=None):
    """A prism / tapered prism / bent tube through `centers`, one ring per center.
    apothems: centre-to-face distance per ring (0 = a point, for cones).
    regs: one region name (v runs 0..1 over the whole length) or a list, one per segment.
    Face 0 always faces 'up' (perpendicular to the axis, toward +Y), then faces go around."""
    n = len(centers)
    rot = -math.pi / sides
    rc = 1.0 / math.cos(math.pi / sides)
    tans = []
    for i in range(n):
        if i == 0:
            t = centers[1] - centers[0]
        elif i == n - 1:
            t = centers[-1] - centers[-2]
        else:
            t = (centers[i + 1] - centers[i]).normalized() + (centers[i] - centers[i - 1]).normalized()
        tans.append(t.normalized())
    angs = [rot + 2 * math.pi * k / sides for k in range(sides)]
    rings = []
    for c, a, t in zip(centers, apothems, tans):
        e1, e2 = frame(t)
        rings.append([c + (a * rc) * (math.cos(g) * e1 + math.sin(g) * e2) for g in angs])
    lens = [0.0]
    for i in range(1, n):
        lens.append(lens[-1] + (centers[i] - centers[i - 1]).length)
    per_seg = isinstance(regs, list)
    for i in range(n - 1):
        reg = regs[i] if per_seg else regs
        v0, v1 = (0.0, 1.0) if per_seg else (lens[i] / lens[-1], lens[i + 1] / lens[-1])
        mid = (centers[i] + centers[i + 1]) * 0.5
        for k in range(sides):
            k2 = (k + 1) % sides
            pts = [rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]]
            u0, u1 = k / sides, (k + 1) / sides
            uvs = [ruv(reg, u0, v0), ruv(reg, u1, v0), ruv(reg, u1, v1), ruv(reg, u0, v1)]
            fc = (pts[0] + pts[1] + pts[2] + pts[3]) * 0.25
            b.poly(pts, uvs, fc - mid)
    cap_uv = lambda reg: [ruv(reg, 0.5 + 0.5 * math.cos(g), 0.5 + 0.5 * math.sin(g)) for g in angs]
    if cap0 and apothems[0] > 0:
        b.poly(rings[0], cap_uv(cap0), -tans[0])
    if cap1 and apothems[-1] > 0:
        b.poly(rings[-1], cap_uv(cap1), tans[-1])


def bucket(b, cx, cz, y0, y1, r_bot, r_top, r_in, y_water, r_water):
    """Octagonal bucket: tapered wall, white rim, short inner wall, bait surface, bottom."""
    n = 8
    def P(r, y, k):
        g = -math.pi / n + 2 * math.pi * k / n
        return V(cx + r * math.cos(g), y, cz + r * math.sin(g))
    def radial(k):
        g = 2 * math.pi * k / n
        return V(math.cos(g), 0, math.sin(g))
    q = lambda r, u0, u1: [ruv(r, u0, 0), ruv(r, u1, 0), ruv(r, u1, 1), ruv(r, u0, 1)]
    for k in range(n):
        k2 = (k + 1) % n
        u0, u1 = k / n, (k + 1) / n
        b.poly([P(r_bot, y0, k), P(r_bot, y0, k2), P(r_top, y1, k2), P(r_top, y1, k)],
               q("bucket", u0, u1), radial(k))
        b.poly([P(r_in, y1, k), P(r_in, y1, k2), P(r_top, y1, k2), P(r_top, y1, k)],
               q("line", 0, 1), V(0, 1, 0))
        b.poly([P(r_water, y_water, k), P(r_water, y_water, k2), P(r_in, y1, k2), P(r_in, y1, k)],
               q("inner", 0, 1), -radial(k))
    disc = [P(r_water, y_water, k) for k in range(n)]
    b.poly(disc, [ruv("bait", 0.5 + (p.x - cx) / (2 * r_water), 0.5 - (p.z - cz) / (2 * r_water))
                  for p in disc], V(0, 1, 0))
    bot = [P(r_bot, y0, k) for k in range(n)]
    b.poly(bot, [ruv("inner", 0.5 + (p.x - cx) / (2 * r_bot), 0.5 + (p.z - cz) / (2 * r_bot))
                 for p in bot], V(0, -1, 0))


# --------------------------------------------------------------------------------------------
# The rod station, part by part
# --------------------------------------------------------------------------------------------

ROD_ANGLE0 = math.radians(36.0)     # butt section and first blank segment
ROD_BUTT = V(0.0, 0.86, 1.33)       # butt end of the rod, in the holder just in front of the post


def build_body():
    b = Builder()

    # Deck pad: plank slab 1.2 x 1.6 m, top at y = 0.15, on two stringers that reach y = 0.
    box(b, -0.6, 0.6, 0.06, 0.15, -0.3, 1.3, top="deck_top", bottom="under",
        front="fascia", back="fascia", left="deck_end", right="deck_end")
    for sx in (-1, 1):
        box(b, *sorted((sx * 0.40, sx * 0.52)), 0.0, 0.06, -0.26, 1.12, sides="stringer",
            front="stringer", back="stringer")
    # Two short stub legs (piling stubs) at the front corners, standing on the ground and
    # poking 6 cm through the deck.
    for sx in (-1, 1):
        box(b, *sorted((sx * 0.42, sx * 0.54)), 0.0, 0.21, 1.12, 1.26, top="leg_top", sides="leg")

    # Post: 0.2 x 0.2 dock post at the front centre, ground to 1.24 m, low pyramid cap to 1.30.
    px0, px1, pz0, pz1, ptop = -0.1, 0.1, 1.05, 1.25, 1.24
    box(b, px0, px1, 0.0, ptop, pz0, pz1, sides="post")
    apex = V(0.0, 1.30, (pz0 + pz1) / 2)
    corners = [V(px0, ptop, pz0), V(px1, ptop, pz0), V(px1, ptop, pz1), V(px0, ptop, pz1)]
    for i in range(4):
        a, c = corners[i], corners[(i + 1) % 4]
        uv = lambda p: ruv("post_top", (p.x - px0) / (px1 - px0), (p.z - pz0) / (pz1 - pz0))
        b.poly([a, c, apex], [uv(a), uv(c), uv(apex)], (a + c) * 0.5 - V(0, ptop, apex.z))
    # Rope wrap band around the post above the deck.
    box(b, -0.113, 0.113, 0.30, 0.42, 1.037, 1.263, top="rope", bottom="rope", sides="rope")

    # Rod holder: white PVC tube along the rod, a dark bracket to the post, a dark strap clamp.
    d0 = V(0.0, math.sin(ROD_ANGLE0), math.cos(ROD_ANGLE0))
    S = lambda s: ROD_BUTT + d0 * s
    loft(b, [S(-0.02), S(0.30)], [0.05, 0.05], 6, "pvc", cap0="pvc", cap1="pvc_cap")
    loft(b, [S(0.04), S(0.09)], [0.056, 0.056], 6, "dark", cap0="dark", cap1="dark")
    box(b, -0.035, 0.035, 0.79, 0.90, 1.235, 1.32, top="dark", bottom="dark", sides="dark")

    # Rod butt: cap, rear cork grip (mostly inside the tube), reel seat, fore cork grip.
    loft(b, [S(0.0), S(0.02)], [0.036, 0.036], 6, "dark", cap0="dark", cap1="dark")
    loft(b, [S(0.02), S(0.36)], [0.036, 0.036], 6, "cork", cap1="cork")
    loft(b, [S(0.36), S(0.47)], [0.028, 0.028], 6, "dark")
    loft(b, [S(0.47), S(0.62)], [0.034, 0.028], 6, "cork", cap0="cork", cap1="cork")

    # Blank: 4-sided, tapered, three segments that droop a little toward the tip (36, 33, 29 deg)
    # like a rod carrying a rig. Total rod length 0.62 + 1.0 + 0.8 + 0.58 = 3.0 m.
    pts = [S(0.62)]
    for length, deg in ((1.0, 36.0), (0.8, 33.0), (0.58, 29.0)):
        a = math.radians(deg)
        pts.append(pts[-1] + V(0.0, math.sin(a), math.cos(a)) * length)
    # Chunkier than a real blank (5 cm -> 3 cm) so it survives the 480x270 pixel pass.
    loft(b, pts, [0.026, 0.022, 0.018, 0.015], 4, "rod", cap0="dark", cap1="line")

    # Anchors for the long-range 1-px rod polyline, on the rod's centreline (straight butt
    # section, then the three bent blank segments): rod_butt where the rod leaves the top of the
    # holder tube (s = 0.30 m), rod_mid at the arc-length midpoint between rod_butt and the tip.
    axis = [S(0.0)] + pts
    def along(s):
        for p, q in zip(axis, axis[1:]):
            seg = (q - p).length
            if s <= seg + 1e-9:
                return p + (q - p) * (s / seg)
            s -= seg
        return axis[-1].copy()
    rod_len = sum((q - p).length for p, q in zip(axis, axis[1:]))
    butt_s = 0.30
    anchors = {"rod_butt": along(butt_s), "rod_mid": along((butt_s + rod_len) / 2),
               "rod_tip": pts[-1].copy()}

    # Spinning reel hanging under the seat: stem, body, spool of pale line, crank arm and knob.
    e1, _ = frame(d0)                       # 'up' perpendicular to the rod
    Q = S(0.415)
    loft(b, [Q - e1 * 0.026, Q - e1 * 0.078], [0.011, 0.011], 4, "dark")
    body_c = Q - e1 * 0.10
    loft(b, [body_c - d0 * 0.05, body_c + d0 * 0.035], [0.042, 0.042], 6, "reel",
         cap0="dark", cap1="reel")
    loft(b, [body_c + d0 * 0.035, body_c + d0 * 0.08], [0.036, 0.036], 6, "spool", cap1="dark")
    arm0 = body_c - d0 * 0.01
    loft(b, [arm0 + V(0.035, 0, 0), arm0 + V(0.10, 0, 0)], [0.009, 0.009], 4, "dark", cap1="dark")
    loft(b, [arm0 + V(0.10, 0, 0) - e1 * 0.01, arm0 + V(0.10, 0, 0) - e1 * 0.05],
         [0.014, 0.014], 4, "dark", cap0="dark", cap1="dark")

    # Minnow bucket on the deck, left of the post: white with a red band, bait showing.
    bucket(b, cx=-0.30, cz=0.66, y0=0.15, y1=0.45, r_bot=0.125, r_top=0.155,
           r_in=0.13, y_water=0.41, r_water=0.127)
    return b, anchors


def build_line():
    """1.0 m line, origin at its top, hanging down -Y. No rotation; the game scales y.
    0.03 m square: the widest the brief allows, as wide as the rod tip, for visibility."""
    b = Builder()
    h = 0.015
    box(b, -h, h, -1.0, 0.0, -h, h, top="line", bottom="line", sides="line")
    return b


def build_bobber():
    """The float alone: a round red-over-white bobber, 0.08 m across and 0.075 m tall, origin at
    its CENTRE (the game sets that on the water surface, so half rides above, half below)."""
    b = Builder()
    ys = [0.0375, 0.0255, 0.0, -0.0255, -0.0375]
    loft(b, [V(0, y, 0) for y in ys], [0.0, 0.03, 0.04, 0.03, 0.0], 6,
         ["bob_red", "bob_red", "bob_white", "bob_white"])
    return b


def build_sinker():
    """Lead egg weight + gold hook: 0.072 m, origin at its top (where the line ties on)."""
    b = Builder()
    ys = [0.0, -0.012, -0.027, -0.039]
    loft(b, [V(0, y, 0) for y in ys], [0.0, 0.018, 0.018, 0.0], 4, "lead")
    k = 0.004
    box(b, -k, k, -0.072, -0.039, -k, k, top="hook", bottom="hook", sides="hook")      # shank
    box(b, -k, 0.026, -0.072, -0.064, -k, k, top="hook", bottom="hook", sides="hook")  # bend
    box(b, 0.018, 0.026, -0.064, -0.050, -k, k, top="hook", bottom="hook", sides="hook")  # point
    return b


def to_mesh(builder, name, mat):
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    for pts, uvs in builder.faces:
        f = bm.faces.new([bm.verts.new(B(p)) for p in pts])
        f.smooth = False
        for loop, uv in zip(f.loops, uvs):
            loop[uvl].uv = uv
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    return me


# --------------------------------------------------------------------------------------------
# Scene, material, objects
# --------------------------------------------------------------------------------------------

OUR_OBJECTS = ("rod_station", "rod_station_body", "rod_tip", "rod_butt", "rod_mid", "line",
               "bobber", "sinker")


def get_clean_scene():
    sc = bpy.data.scenes.get(SCENE_NAME) or bpy.data.scenes.new(SCENE_NAME)
    for ob in list(sc.objects):
        if all(s == sc for s in ob.users_scene):   # never touch an object linked elsewhere
            bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.collections, bpy.data.meshes, bpy.data.materials, bpy.data.images,
                 bpy.data.cameras, bpy.data.lights, bpy.data.worlds):
        for d in list(coll):
            if d.name.startswith("ts_"):
                coll.remove(d)
    for name in OUR_OBJECTS:
        if name in bpy.data.objects:
            raise RuntimeError(f"An object named {name!r} exists outside {SCENE_NAME}; "
                               "rename it so the exported node names stay exact.")
    return sc


def make_material(img):
    mat = bpy.data.materials.new("ts_rigs_atlas")
    if mat.node_tree is None:             # Blender 5 always has one; use_nodes goes in 6.0
        mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Closest"
    tex.extension = "EXTEND"
    tex.location = (bsdf.location.x - 320, bsdf.location.y)
    sock = lambda node, ident: next(s for s in node.inputs if s.identifier == ident)
    nt.links.new(next(s for s in tex.outputs if s.identifier == "Color"), sock(bsdf, "Base Color"))
    sock(bsdf, "Roughness").default_value = 1.0
    sock(bsdf, "Metallic").default_value = 0.0
    mat.use_backface_culling = True       # glTF doubleSided = false
    mat.diffuse_color = lin("brn2")
    mat.roughness = 1.0
    mat.metallic = 0.0
    return mat


def new_object(name, data, coll, parent=None, loc=(0, 0, 0)):
    ob = bpy.data.objects.new(name, data)
    coll.objects.link(ob)
    assert ob.name == name, f"name clash: got {ob.name}"
    if parent is not None:
        ob.parent = parent
        ob.matrix_parent_inverse.identity()
    ob.location = B(loc)
    return ob


def staging(sc):
    """Preview-only stand-ins (not exported): shore bank, dark water, camera, world."""
    coll = bpy.data.collections.new("ts_preview")
    sc.collection.children.link(coll)

    def flat_mat(name, colour):
        m = bpy.data.materials.new(name)
        m.diffuse_color = lin(colour)
        try:
            if m.node_tree is None:
                m.use_nodes = True
            bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
            next(s for s in bsdf.inputs if s.identifier == "Base Color").default_value = lin(colour)
        except (AttributeError, TypeError, StopIteration):
            pass
        return m

    def slab(name, x0, x1, y0, y1, z0, z1, mat):
        b = Builder()
        box(b, x0, x1, y0, y1, z0, z1, top="line", bottom="line", sides="line")
        ob = bpy.data.objects.new(name, to_mesh(b, name, mat))
        coll.objects.link(ob)
        return ob

    slab("ts_preview_shore", -3.5, 3.5, -0.6, 0.0, -3.0, 1.0, flat_mat("ts_preview_grass", "grn2"))
    slab("ts_preview_bank", -3.5, 3.5, -0.6, -0.05, 1.0, 1.25, flat_mat("ts_preview_mud", "brn1"))
    slab("ts_preview_water", -4.5, 4.5, -0.6, -0.25, 1.0, 8.0, flat_mat("ts_preview_water", "navy1"))

    cam_data = bpy.data.cameras.new("ts_preview_cam")
    cam_data.lens = 35
    cam = bpy.data.objects.new("ts_preview_cam", cam_data)
    coll.objects.link(cam)
    target = V(0.0, 1.2, 2.1)                                # front-right, above: 3/4 view
    eye = target + V(0.80, 0.50, 0.45).normalized() * 6.1
    cam.location = B(eye)
    cam.rotation_euler = (B(target) - B(eye)).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam

    world = bpy.data.worlds.new("ts_preview_world")
    world.color = lin("navy0")[:3]
    sc.world = world
    return cam, target, eye


def setup_render(sc):
    try:
        sc.render.engine = "BLENDER_WORKBENCH"
    except TypeError as e:
        raise RuntimeError(f"Workbench not available: {e}")
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "TEXTURE"
    sc.display.render_aa = "8"
    sc.render.resolution_x, sc.render.resolution_y = 960, 720
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.filepath = PREVIEW_PATH
    try:
        sc.view_settings.view_transform = "Standard"
        sc.view_settings.look = "None"
    except TypeError:
        pass
    sc.view_settings.exposure = 0.0
    sc.view_settings.gamma = 1.0


# --------------------------------------------------------------------------------------------
# Export
# --------------------------------------------------------------------------------------------

def patch_glb_samplers(path):
    """Blender writes minFilter 9984 (NEAREST_MIPMAP_NEAREST) for 'Closest'. The game wants
    NEAREST with no mipmaps (THREEJS-NOTES rule 3), so set both filters to 9728 in the JSON chunk."""
    data = open(path, "rb").read()
    magic, _version, _length = struct.unpack_from("<4sII", data, 0)
    assert magic == b"glTF"
    off, chunks = 12, []
    while off < len(data):
        clen, ctype = struct.unpack_from("<II", data, off)
        chunks.append([ctype, data[off + 8: off + 8 + clen]])
        off += 8 + clen
    js = json.loads(chunks[0][1].decode("utf-8"))
    for s in js.get("samplers", []):
        s["magFilter"] = 9728
        s["minFilter"] = 9728
    jb = json.dumps(js, separators=(",", ":")).encode("utf-8")
    jb += b" " * ((4 - len(jb) % 4) % 4)
    chunks[0][1] = jb
    body = b"".join(struct.pack("<II", len(c), t) + c for t, c in chunks)
    with open(path, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, 12 + len(body)) + body)


def export_glb(sc, objs):
    vl = sc.view_layers[0]
    for ob in sc.objects:
        ob.select_set(False, view_layer=vl)
    for ob in objs:
        ob.select_set(True, view_layer=vl)
    vl.objects.active = objs[0]
    os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
    win = bpy.context.window or (bpy.context.window_manager.windows[0]
                                 if bpy.context.window_manager.windows else None)
    kwargs = dict(
        filepath=GLB_PATH, export_format="GLB", use_selection=True, use_active_scene=True,
        export_apply=True, export_yup=True, export_cameras=False, export_lights=False,
        export_animations=False, export_materials="EXPORT", export_image_format="AUTO",
        export_texcoords=True, export_normals=True, export_tangents=False, export_extras=False,
    )
    if win is not None:
        win.scene = sc
        with bpy.context.temp_override(window=win, scene=sc, view_layer=vl):
            bpy.ops.export_scene.gltf(**kwargs)
    else:
        bpy.ops.export_scene.gltf(**kwargs)
    patch_glb_samplers(GLB_PATH)
    for ob in objs:                     # leave the viewport clean (no selection outlines)
        ob.select_set(False, view_layer=vl)


def show_in_viewport(sc, cam, target, eye):
    """Live Blender only: show trotline_rigs in the user's 3D view, textured, at the 3/4 view."""
    win = bpy.context.window
    if bpy.app.background or win is None:
        return
    win.scene = sc
    for area in win.screen.areas:
        if area.type != "VIEW_3D":
            continue
        sp = area.spaces.active
        sp.shading.type = "SOLID"
        sp.shading.color_type = "TEXTURE"
        r3d = sp.region_3d
        r3d.view_perspective = "PERSP"
        r3d.view_location = B(target)
        r3d.view_rotation = cam.rotation_euler.to_quaternion()
        r3d.view_distance = (eye - target).length * 0.9


# --------------------------------------------------------------------------------------------

def main():
    sc = get_clean_scene()
    coll = bpy.data.collections.new("ts_rigs")
    sc.collection.children.link(coll)

    img = make_image(draw_atlas())
    mat = make_material(img)

    body_b, anchors = build_body()
    tip = anchors["rod_tip"]
    meshes = {
        "body": to_mesh(body_b, "ts_rod_station_body", mat),
        "line": to_mesh(build_line(), "ts_line", mat),
        "bobber": to_mesh(build_bobber(), "ts_bobber", mat),
        "sinker": to_mesh(build_sinker(), "ts_sinker", mat),
    }
    tri = {k: sum(len(p.vertices) - 2 for p in me.polygons) for k, me in meshes.items()}
    assert sum(tri.values()) <= TRI_BUDGET, f"{tri} > budget {TRI_BUDGET}"
    assert tri["bobber"] <= 100 and tri["sinker"] <= 100, tri

    # Hierarchy: everything is a direct child of the rod_station root (identity transform), so
    # local positions are station-space positions.
    root = new_object("rod_station", None, coll)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.3
    objs = [root, new_object("rod_station_body", meshes["body"], coll, root)]
    for name in ("rod_butt", "rod_mid", "rod_tip"):
        e = new_object(name, None, coll, root, anchors[name])
        e.empty_display_type = "SPHERE"
        e.empty_display_size = 0.05
        objs.append(e)
    objs.append(new_object("line", meshes["line"], coll, root, tip))
    objs.append(new_object("bobber", meshes["bobber"], coll, root, tip - V(0, 0.3, 0)))
    objs.append(new_object("sinker", meshes["sinker"], coll, root, tip - V(0, 1.0, 0)))

    cam, target, eye = staging(sc)
    setup_render(sc)
    sc.view_layers[0].update()

    export_glb(sc, objs)
    bpy.ops.render.render(write_still=True, scene=sc.name)
    show_in_viewport(sc, cam, target, eye)

    # Summary in three.js space.
    to3 = lambda v: Vector((v.x, v.z, -v.y))
    allv = [to3(v.co) + to3(ob.location) for ob in objs if ob.type == "MESH" for v in ob.data.vertices]
    lo = [min(p[i] for p in allv) for i in range(3)]
    hi = [max(p[i] for p in allv) for i in range(3)]
    print("ROD_STATION_SUMMARY " + json.dumps({
        "triangles": sum(tri.values()), "triangles_by_mesh": tri,
        "nodes": {ob.name: [round(c, 4) for c in to3(ob.location)] for ob in objs},
        "line_bottom": [round(c, 4) for c in (tip - V(0, 1.0, 0))],
        "bbox_min": [round(c, 4) for c in lo],
        "bbox_max": [round(c, 4) for c in hi],
        "glb": GLB_PATH, "glb_bytes": os.path.getsize(GLB_PATH),
        "texture": TEX_PATH, "preview": PREVIEW_PATH,
    }))


if __name__ == "__main__":
    main()
