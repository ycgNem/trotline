"""Trotline art helpers shared by every build script in pixel-art/<family>/build.py.

- APOLLO / C: the game palette (src/data/palette.ts), by the names the game code uses.
- Sprites are drawn as character maps (one character = one colour role, bound by a legend),
  with pixelstudio for the pixel ops (outline, dither, noise).
- export(): writes src/art/<name>.png (frames in one row, 1x, transparent) and
  src/art/<name>.json ({frame, frames, anchor, fps}), after checking that every pixel is an
  Apollo colour at full alpha and that the anchor is inside the frame. It also writes an 8x
  preview strip (with the anchor marked) and a 2x strip (game zoom) next to the build script.
"""
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
_local = REPO / ".claude/skills/pixel-art-studio/scripts"
sys.path.insert(0, str(_local if _local.exists() else Path.home() / ".claude/skills/pixel-art-studio/scripts"))
from pixelstudio import Sprite, hex2rgba, rgba2hex  # noqa: E402,F401

from PIL import Image, ImageDraw, ImageFont  # noqa: E402

ART = REPO / "src" / "art"

APOLLO = [
    '#172038', '#253a5e', '#3c5e8b', '#4f8fba', '#73bed3', '#a4dddb',
    '#19332d', '#25562e', '#468232', '#75a743', '#a8ca58', '#d0da91',
    '#4d2b32', '#7a4841', '#ad7757', '#c09473', '#d7b594', '#e7d5b3',
    '#341c27', '#602c2c', '#884b2b', '#be772b', '#de9e41', '#e8c170',
    '#241527', '#411d31', '#752438', '#a53030', '#cf573c', '#da863e',
    '#1e1d39', '#402751', '#7a367b', '#a23e8c', '#c65197', '#df84a5',
    '#090a14', '#10141f', '#151d28', '#202e37', '#394a50', '#577277',
    '#819796', '#a8b5b2', '#c7cfcc', '#ebede9',
]

# The names src/data/palette.ts uses (plus the two reds it leaves unnamed).
C = {
    'ink': '#090a14', 'soot': '#10141f', 'night': '#151d28', 'slate': '#202e37', 'iron': '#394a50',
    'steel': '#577277', 'ash': '#819796', 'fog': '#a8b5b2', 'mist': '#c7cfcc', 'bone': '#ebede9',
    'abyss': '#172038', 'deep': '#253a5e', 'blue': '#3c5e8b', 'sky': '#4f8fba', 'cyan': '#73bed3', 'ice': '#a4dddb',
    'moss': '#19332d', 'leaf': '#25562e', 'green': '#468232', 'lime': '#75a743', 'sprout': '#a8ca58', 'reed': '#d0da91',
    'mud': '#4d2b32', 'clay': '#7a4841', 'tan': '#ad7757', 'sand': '#c09473', 'dune': '#d7b594', 'shell': '#e7d5b3',
    'bark': '#341c27', 'rust': '#602c2c', 'copper': '#884b2b', 'brass': '#be772b', 'amber': '#de9e41', 'gold': '#e8c170',
    'plum0': '#241527', 'plum1': '#411d31',
    'wine': '#752438', 'red': '#a53030', 'ember': '#cf573c', 'orange': '#da863e',
    'dusk': '#1e1d39', 'plum': '#402751', 'violet': '#7a367b', 'magenta': '#a23e8c', 'pink': '#c65197', 'rose': '#df84a5',
}
assert all(v in APOLLO for v in C.values())
NAME = {v: k for k, v in C.items()}

_PAL = {hex2rgba(c)[:3] for c in APOLLO}


def new(w, h, frames=1):
    """A Sprite with n blank frames, palette-locked to Apollo."""
    s = Sprite(w, h, palette=APOLLO)
    for _ in range(frames - 1):
        s.add_frame(copy=False)
    s.frame(1)
    return s


def stamp(s, rows, legend, ox=0, oy=0, skip="."):
    """Draw a character map onto the current frame; legend maps char -> colour name or hex."""
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == skip or ch == " ":
                continue
            col = legend[ch]
            s.px(ox + x, oy + y, C.get(col, col))


def outline(s, color="ink"):
    s.outline(C.get(color, color), where="outside")


def frames_of(s):
    return [s.composite(i) for i in range(1, s.n_frames + 1)]


def check(img, name):
    bad = set()
    for r, g, b, a in img.getdata():
        if a == 0:
            continue
        if a != 255:
            bad.add("alpha %d" % a)
        elif (r, g, b) not in _PAL:
            bad.add(rgba2hex((r, g, b, 255)))
    if bad:
        raise SystemExit("OFF-PALETTE in %s: %s" % (name, sorted(bad)))


def colours(imgs):
    cnt = {}
    for im in imgs:
        for r, g, b, a in im.getdata():
            if a:
                k = rgba2hex((r, g, b, 255))
                cnt[k] = cnt.get(k, 0) + 1
    return [NAME.get(k, k) for k, _ in sorted(cnt.items(), key=lambda kv: -kv[1])]


def export(name, frames, anchor, fps, outdir, bg=None):
    """frames: list of RGBA images (or a Sprite). Writes the game strip + json and previews."""
    if isinstance(frames, Sprite):
        frames = frames_of(frames)
    w, h = frames[0].size
    assert all(f.size == (w, h) for f in frames), name + ": frames differ in size"
    ax, ay = anchor
    assert 0 <= ax < w and 0 <= ay < h, name + ": anchor outside the frame"
    strip = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        check(f, name)
        strip.alpha_composite(f, (i * w, 0))
    ART.mkdir(parents=True, exist_ok=True)
    strip.save(ART / ("%s.png" % name))
    meta = {"frame": [w, h], "frames": len(frames), "anchor": [ax, ay], "fps": fps}
    (ART / ("%s.json" % name)).write_text(json.dumps(meta) + "\n")
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    preview(strip, w, h, len(frames), anchor, outdir / ("%s_8x.png" % name), 8, bg)
    preview(strip, w, h, len(frames), None, outdir / ("%s_2x.png" % name), 2, bg)
    cols = colours(frames)
    print("%-15s %2dx%-2d x%d  anchor %s fps %s  %d colours: %s" % (name, w, h, len(frames), list(anchor), fps,
                                                                 len(cols), " ".join(cols)))
    return strip


def preview(strip, w, h, n, anchor, path, k, bg=None):
    gap = 2 if k > 2 else 1
    W = n * (w * k + gap) + gap
    out = Image.new("RGBA", (W, h * k + gap * 2), (70, 70, 78, 255))
    for i in range(n):
        cell = Image.new("RGBA", (w * k, h * k), hex2rgba(bg) if bg else (120, 120, 128, 255))
        f = strip.crop((i * w, 0, (i + 1) * w, h)).resize((w * k, h * k), Image.NEAREST)
        cell.alpha_composite(f)
        if anchor and k >= 4:
            d = ImageDraw.Draw(cell)
            ax, ay = anchor
            d.rectangle([ax * k, ay * k, ax * k + k - 1, ay * k + k - 1], outline=(255, 0, 255, 255))
        out.alpha_composite(cell, (gap + i * (w * k + gap), gap))
    out.save(path)


def up(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


FONT = ImageFont.load_default()


def board(items, path, k=2, bg=(46, 46, 52)):
    """Working view: [(label, image)] laid out in a row at zoom k (labels above)."""
    pad = 8
    W = sum(im.width * k + pad for _, im in items) + pad
    H = max(im.height * k for _, im in items) + 22
    out = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(out)
    x = pad
    for label, im in items:
        d.text((x, 4), label, fill=(225, 225, 225), font=FONT)
        big = up(im, k)
        out.paste(big.convert("RGB"), (x, 18), big)
        x += big.width + pad
    out.save(path)
    print("board ->", path)
