"""Check sheet: the defenders and thieves on the ground they sit on, placed the way
src/render/renderer.ts places them, at 1x and 3x.

  - a cell per (sprite, ground, frame): ray on placeable and shallow water, terrapin on the
    road, laughing gull over the road and over shallow water, the raccoon beside them for
    the terrapin-vs-raccoon value check;
  - a small shore scene (grass, road, placeable, shallow, mid) with everything in it at once;
  - a stunned raccoon, bear and gull with the puffer in their jaws, facing both ways: with
    puffer_big and puffer_gulp where the renderer puts it today, and with puffer_gulp at each
    animal's mouth (MOUTH below).

Placement (renderer.ts): a defender's anchor sits at its tile's centre + (0, 2) on water and
+ (0, 4) on the road; a thief's at its position + (0, 4), lifted 10 px if it flies; the
puffer while a thief retches at x + facing * max(2, w / 2 - 3), y - 1 - lift, unmirrored.

Run: python pixel-art/_check/onground.py [out.png]   (default: pixel-art/_check/out/onground.png)
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[2]
ART = REPO / "src" / "art"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "out" / "onground.png"
T = 16
FONT = ImageFont.load_default()


class Sheet:
    def __init__(self, name):
        meta = json.loads((ART / (name + ".json")).read_text())
        self.w, self.h = meta["frame"]
        self.n = meta["frames"]
        self.ax, self.ay = meta["anchor"]
        strip = Image.open(ART / (name + ".png")).convert("RGBA")
        self.frames = [strip.crop((i * self.w, 0, (i + 1) * self.w, self.h)) for i in range(self.n)]

    def draw(self, img, f, x, y, flip=False):
        """drawSprite(): frame f with its anchor at (x, y); a flip keeps the same box."""
        fr = self.frames[f % self.n]
        px, py = round(x), round(y)
        if flip:
            img.alpha_composite(fr.transpose(Image.FLIP_LEFT_RIGHT), (px - (self.w - self.ax), py - self.ay))
        else:
            img.alpha_composite(fr, (px - self.ax, py - self.ay))


def tile(name, v=0):
    return Image.open(ART / ("tile_%s.png" % name)).convert("RGBA").crop((v * T, 0, (v + 1) * T, T))


def ground(rows):
    """rows: list of strings of tile keys -> an image of tiles (variants by position)."""
    key = {"g": "grass", "r": "road", "p": "placeable", "s": "shallow", "m": "mid", "d": "deep"}
    img = Image.new("RGBA", (len(rows[0]) * T, len(rows) * T))
    for ty, row in enumerate(rows):
        for tx, ch in enumerate(row):
            img.alpha_composite(tile(key[ch], (tx * 7 + ty * 3) % 4), (tx * T, ty * T))
    return img


def defender(img, sh, f, tx, ty, water=True, flip=False):
    sh.draw(img, f, tx * T + 8, ty * T + 8 + (2 if water else 4), flip)


def thief(img, sh, f, tx, ty, lift=0, flip=False):
    sh.draw(img, f, tx * T + 8, ty * T + 8 + 4 - lift, flip)


# Where the puffer's centre goes for each thief if it is placed at the mouth instead: offset
# from the thief's anchor (dx forward, dy up being negative), measured on frame 0.
MOUTH = {"raccoon": (8, -6), "bear": (11, -8), "gull": (7, -3)}


def retching(img, sh, puff, tx, ty, lift=0, facing=1, mouth=None):
    thief(img, sh, 0, tx, ty, lift, facing < 0)
    if mouth is None:   # renderer.ts today
        puff.draw(img, 0, tx * T + 8 + facing * max(2, sh.w / 2 - 3), ty * T + 8 - 1 - lift)
    else:
        puff.draw(img, 0, tx * T + 8 + facing * mouth[0], ty * T + 8 + 4 - lift + mouth[1])


def up(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def row_of(cells, k, gap=4):
    W = sum(c.width * k + gap for _, c in cells) + gap
    H = max(c.height * k for _, c in cells) + 14
    out = Image.new("RGBA", (W, H), (34, 34, 40, 255))
    d = ImageDraw.Draw(out)
    x = gap
    for label, c in cells:
        if k > 1:
            d.text((x, 1), label, fill=(220, 220, 220, 255), font=FONT)
        out.alpha_composite(up(c, k), (x, 13))
        x += c.width * k + gap
    return out


def stack(parts, gap=6):
    W = max(p.width for p in parts)
    H = sum(p.height + gap for p in parts)
    out = Image.new("RGBA", (W, H), (34, 34, 40, 255))
    y = 0
    for p in parts:
        out.alpha_composite(p, (0, y))
        y += p.height + gap
    return out


if __name__ == "__main__":
    ray, turtle, gull = Sheet("ray"), Sheet("turtle"), Sheet("gull")
    raccoon, bear, puffer = Sheet("raccoon"), Sheet("bear"), Sheet("puffer")
    big, gulp = Sheet("puffer_big"), Sheet("puffer_gulp")

    # 1. one cell per sprite, ground and frame (2x2 tiles, the sprite in the top-left tile's
    #    neighbourhood, placed as the game places it in tile (0, 0) of a 2x2 patch offset by 8)
    cells = []
    for f in range(ray.n):
        for g in ("p", "s"):
            img = ground([g * 2] * 2)
            ray.draw(img, f, 16, 18)
            cells.append(("ray %s f%d" % ({"p": "plac", "s": "shal"}[g], f), img))
    for f in range(turtle.n):
        img = ground(["rr", "rr"])
        turtle.draw(img, f, 16, 20)
        cells.append(("terrapin f%d" % f, img))
    img = ground(["rr", "rr"])
    raccoon.draw(img, 0, 16, 22)
    cells.append(("raccoon", img))
    for f in range(gull.n):
        for g in ("r", "s"):
            img = ground([g * 2] * 2)
            gull.draw(img, f, 16, 20 - 6)
            cells.append(("gull %s f%d" % ({"r": "road", "s": "shal"}[g], f), img))

    # 2. the shore scene: grass, road, placeable, shallow, mid; everything at once
    scene = ground(["gggggggggggg", "rrrrrrrrrrrr", "pppppppppppp", "ssssssssssss", "mmmmmmmmmmmm"])
    thief(scene, raccoon, 1, 1, 1)
    defender(scene, turtle, 1, 3, 1, water=False)
    thief(scene, bear, 2, 5.2, 1)
    defender(scene, turtle, 0, 7, 1, water=False)
    thief(scene, raccoon, 3, 8.1, 1, flip=True)
    thief(scene, gull, 0, 10, 1, lift=10)
    defender(scene, ray, 0, 1, 2)
    defender(scene, puffer, 0, 3, 2)
    defender(scene, ray, 1, 5, 2, flip=True)
    defender(scene, ray, 0, 2, 3)
    defender(scene, puffer, 1, 6, 3)
    defender(scene, ray, 1, 9, 3)
    thief(scene, gull, 1, 8, 3, lift=10)
    defender(scene, ray, 0, 4, 4)
    defender(scene, puffer, 0, 10, 4)

    # 3. retching: puffer_big (today) vs puffer_gulp, both facings, on the road
    retch = []
    for label, puff, at in (("big", big, False), ("gulp", gulp, False), ("gulp at MOUTH", gulp, True)):
        img = ground(["gggggggggggggg", "rrrrrrrrrrrrrr", "rrrrrrrrrrrrrr"])
        m = (lambda k: MOUTH[k]) if at else (lambda k: None)
        retching(img, raccoon, puff, 1, 1, mouth=m("raccoon"))
        retching(img, raccoon, puff, 3.5, 1, facing=-1, mouth=m("raccoon"))
        retching(img, bear, puff, 6, 1, mouth=m("bear"))
        retching(img, bear, puff, 9, 1, facing=-1, mouth=m("bear"))
        retching(img, gull, puff, 11, 1, lift=10, mouth=m("gull"))
        retching(img, gull, puff, 12.6, 1, lift=10, facing=-1, mouth=m("gull"))
        retch.append(("retching with puffer_%s" % label, img))

    sheet = stack([
        row_of(cells[:10], 1), row_of(cells[:10], 3),
        row_of(cells[10:], 1), row_of(cells[10:], 3),
        row_of([("shore scene", scene)], 1), row_of([("shore scene at 3x", scene)], 3),
        row_of(retch, 1), row_of(retch[:2], 3), row_of(retch[2:], 3),
    ])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT)
    print(OUT, sheet.size)
