"""Check sheet for the fleet and chum: every boat frame and the slick on the water it sits on,
placed as src/render/renderer.ts places them, at 1x and 3x, with the thieves and fish they
must not be confused with beside them.

  1. each boat frame on placeable, shallow, mid and deep water (3 x 2 tiles, anchor at the
     middle tile's centre, as the renderer draws a boat at (b.x, b.y) * TILE);
  2. the slick on placeable and shallow water, beside a worm lure on the road, a puffer and a
     ray on the same water, and a laughing gull down on it;
  3. a bay scene: grass, road, the placeable shallows with the dock, shallow, mid and deep water
     with all three boats out, a slick, fish and gulls, at 1x, 2x and 3x;
  4. the chum bucket on the HUD's dark panel and on water, 1x and 3x.

Run: python pixel-art/boats/onwater.py [--draft]   (--draft reads pixel-art/boats/out/draft/)
Writes pixel-art/boats/out/onwater.png and onwater_scene_1x.png / _2x.png.
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
ART = REPO / "src" / "art"
NEW = HERE / "out" / "draft" if "--draft" in sys.argv else ART
OUT = HERE / "out"
T = 16
FONT = ImageFont.load_default()
NEWNAMES = {"rowboat", "skiff", "trawler", "slick", "chum_bucket"}


class Sheet:
    def __init__(self, name):
        d = NEW if name in NEWNAMES else ART
        meta = json.loads((d / (name + ".json")).read_text())
        self.w, self.h = meta["frame"]
        self.n = meta["frames"]
        self.ax, self.ay = meta["anchor"]
        strip = Image.open(d / (name + ".png")).convert("RGBA")
        self.frames = [strip.crop((i * self.w, 0, (i + 1) * self.w, self.h)) for i in range(self.n)]

    def draw(self, img, f, x, y, flip=False):
        fr = self.frames[f % self.n]
        px, py = round(x), round(y)
        if flip:
            img.alpha_composite(fr.transpose(Image.FLIP_LEFT_RIGHT), (px - (self.w - self.ax), py - self.ay))
        else:
            img.alpha_composite(fr, (px - self.ax, py - self.ay))


def tile(name, v=0):
    return Image.open(ART / ("tile_%s.png" % name)).convert("RGBA").crop((v * T, 0, (v + 1) * T, T))


KEY = {"g": "grass", "r": "road", "p": "placeable", "s": "shallow", "m": "mid", "d": "deep",
       "k": "dock", "n": "sand", "e": "reeds"}


def ground(rows):
    img = Image.new("RGBA", (len(rows[0]) * T, len(rows) * T))
    for ty, row in enumerate(rows):
        for tx, ch in enumerate(row):
            img.alpha_composite(tile(KEY[ch], (tx * 7 + ty * 3) % 4), (tx * T, ty * T))
    return img


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


WATERS = (("p", "plac"), ("s", "shal"), ("m", "mid"), ("d", "deep"))

if __name__ == "__main__":
    row, skiff, trawl = Sheet("rowboat"), Sheet("skiff"), Sheet("trawler")
    slick, bucket = Sheet("slick"), Sheet("chum_bucket")
    worm, puffer, ray, gull = Sheet("worm"), Sheet("puffer"), Sheet("ray"), Sheet("gull")
    raccoon, bear = Sheet("raccoon"), Sheet("bear")
    parts = []

    # 1. each boat frame on each water
    for sh, name, cols, rows in ((row, "rowboat", 2, 2), (skiff, "skiff", 2, 2), (trawl, "trawler", 3, 2)):
        cells = []
        for f in range(sh.n):
            for g, lab in WATERS:
                img = ground([g * cols] * rows)
                sh.draw(img, f, cols * T // 2, rows * T // 2 + 4)
                cells.append(("%s f%d %s" % (name, f, lab), img))
        parts += [row_of(cells, 1)] + [row_of(cells[i:i + 8], 3) for i in range(0, len(cells), 8)]

    # 2. the slick and what it must not look like
    cells = []
    for f in range(slick.n):
        for g, lab in (("p", "plac"), ("s", "shal")):
            img = ground([g * 2] * 2)
            slick.draw(img, f, 16, 16 + 1)
            cells.append(("slick f%d %s" % (f, lab), img))
    for f in range(slick.n):   # with the renderer's lure ring (renderer.ts lureRing: 9 x 5, amber)
        img = ground(["pp", "pp"])
        slick.draw(img, f, 16, 16 + 1)
        for i in range(14):
            a = i / 14 * 2 * math.pi + f * 0.3
            img.putpixel((round(16 + math.cos(a) * 9), round(16 + 1 + math.sin(a) * 5)), (222, 158, 65, 255))
        cells.append(("slick f%d ring" % f, img))
    img = ground(["rr", "rr"]); worm.draw(img, 0, 16, 16 + 3); cells.append(("worm road", img))
    img = ground(["pp", "pp"]); puffer.draw(img, 0, 16, 18); cells.append(("puffer plac", img))
    img = ground(["ss", "ss"]); ray.draw(img, 0, 16, 18); cells.append(("ray shal", img))
    img = ground(["ppp", "ppp"]); slick.draw(img, 0, 24, 17); gull.draw(img, 1, 14, 18); gull.draw(img, 3, 33, 16, True)
    cells.append(("gulls at slick", img))
    img = ground(["ppp", "ppp"]); slick.draw(img, 1, 24, 17); bear.draw(img, 0, 20, 20)
    cells.append(("bear at slick", img))
    parts += [row_of(cells, 1), row_of(cells, 3)]

    # 3. the bay
    scene = ground([
        "ddddddddddddddddd",
        "ddddddddddddddddd",
        "mmmmmmmmmmmmmmmmm",
        "ssssssskssssssssm",
        "pppppppkpppppppss",
        "pppppppkppppppppe",
        "rrrrrrrrrrrrrrrrr",
        "ggggggggggggggggg",
    ])
    trawl.draw(scene, 1, 3.5 * T, 1.0 * T + 4)
    trawl.draw(scene, 0, 12 * T, 1.2 * T + 2, True)
    row.draw(scene, 2, 3.5 * T, 3.5 * T)
    row.draw(scene, 0, 10.5 * T, 2.5 * T, True)
    skiff.draw(scene, 0, 14.5 * T, 3.0 * T)
    skiff.draw(scene, 2, 5.5 * T, 2.4 * T, True)
    row.draw(scene, 1, 8.8 * T, 3.5 * T)     # at the dock
    skiff.draw(scene, 1, 8.8 * T, 4.4 * T)
    slick.draw(scene, 0, 12.5 * T, 5.5 * T + 1)
    gull.draw(scene, 1, 12 * T, 5.5 * T + 2)
    slick.draw(scene, 1, 2.5 * T, 4.5 * T + 1)
    ray.draw(scene, 0, 4.5 * T, 4.5 * T + 2)
    puffer.draw(scene, 0, 1.5 * T, 5.5 * T + 2)
    ray.draw(scene, 1, 10.5 * T, 4.5 * T + 2, True)
    puffer.draw(scene, 1, 15.5 * T, 4.5 * T + 2)
    raccoon.draw(scene, 0, 5 * T, 6.5 * T + 4)
    bear.draw(scene, 1, 14 * T, 6.5 * T + 4)
    worm.draw(scene, 0, 7.5 * T, 6.5 * T + 3)
    parts += [row_of([("bay scene", scene)], 1), row_of([("bay at 3x", scene)], 3)]
    scene.save(OUT / "onwater_scene_1x.png")
    up(scene, 2).save(OUT / "onwater_scene_2x.png")

    # 4. the chum bucket as a HUD icon
    cells = []
    panel = Image.new("RGBA", (16, 14), (21, 29, 40, 255))
    bucket.draw(panel, 0, 8, 12)
    cells.append(("bucket hud", panel))
    img = ground(["p"]); bucket.draw(img, 0, 8, 13); cells.append(("bucket plac", img))
    img = ground(["d"]); bucket.draw(img, 0, 8, 13); cells.append(("bucket deep", img))
    parts += [row_of(cells, 1), row_of(cells, 3)]

    sheet = stack(parts)
    OUT.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT / "onwater.png")
    print(OUT / "onwater.png", sheet.size)
