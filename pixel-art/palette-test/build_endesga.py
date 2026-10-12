"""Palette test B: ENDESGA 32 (Endesga; PALETTES["endesga32"] in the pixel-art-studio skill).

Binds every colour role in common.py to one ENDESGA 32 colour, chosen by hand for this
palette (it has fewer steps per hue than Apollo, so several roles share a colour on purpose).
Run: python pixel-art/palette-test/build_endesga.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402

ENDESGA32 = [
    "#be4a2f", "#d77643", "#ead4aa", "#e4a672", "#b86f50",
    "#733e39", "#3e2731", "#a22633", "#e43b44", "#f77622",
    "#feae34", "#fee761", "#63c74d", "#3e8948", "#265c42",
    "#193c3e", "#124e89", "#0099db", "#2ce8f5", "#ffffff",
    "#c0cbdc", "#8b9bb4", "#5a6988", "#3a4466", "#262b44",
    "#181425", "#ff0044", "#68386c", "#b55088", "#f6757a",
    "#e8b796", "#c28569",
]

K = {
    "ink": "#181425",
    # Water: ENDESGA has one blue ramp (#124e89 > #0099db > #2ce8f5) plus the navy greys, so
    # the bands are bright blue / deep blue / navy, and each band's ripples borrow its
    # neighbour.
    "water": {
        "shallow": {"base": "#0099db", "crest": "#2ce8f5", "trough": "#124e89",
                    "glint": "#2ce8f5", "bed": "#124e89", "swell": "#124e89"},
        "mid": {"base": "#124e89", "crest": "#0099db", "trough": "#262b44",
                "glint": "#0099db", "bed": "#262b44", "swell": "#262b44"},
        # Deep: the dark teal reads as a lake's green-black depths; the navy grey #262b44 read
        # as asphalt at night. Blue crests are lighter than it, the near-black swells darker.
        "deep": {"base": "#193c3e", "crest": "#124e89", "trough": "#181425",
                 "glint": "#124e89", "bed": "#181425", "swell": "#181425"},
        # Placeable ("clear shallows"): ENDESGA's only water lighter than #0099db is the neon
        # cyan #2ce8f5; as a flat fill it glows like a selection, so it is drawn as a caustic
        # net (common.CAUSTIC) over the shallow blue instead.
        "placeable": {"base": "#0099db", "crest": "#2ce8f5", "trough": "#124e89",
                      "glint": "#ffffff", "bed": "#124e89", "swell": "#124e89"},
    },
    # Overlay markers (options not picked): pure white, a blue shadow pixel under each.
    "mark": "#ffffff", "mark_shadow": "#124e89",
    # Shore: ENDESGA's three greens; no lighter green, so blade tips reuse the light green
    "grass_dark": "#265c42", "grass": "#3e8948", "grass_light": "#63c74d", "grass_tip": "#63c74d",
    "road_dark": "#b86f50", "road": "#c28569", "road_light": "#e4a672",
    "pebble_dark": "#733e39", "pebble_light": "#ead4aa",
    "sand_dark": "#e4a672", "sand": "#ead4aa", "sand_light": "#ffffff", "sand_ripple": "#e4a672",
    # Dock: dark brown planks lit rust-tan, darker than the road and the beach; ENDESGA's
    # blue greys read as metal, not wood.
    "wood_light": "#b86f50", "wood": "#733e39", "wood_joint": "#3e2731", "gap": "#3e2731",
    "grain": "#3e2731", "nail": "#8b9bb4", "board_face": "#3e2731",
    "pile_light": "#733e39", "pile": "#3e2731", "pile_dark": "#181425", "dock_shadow": "#124e89",
    # Gull: white, cool-grey mantle, ink wingtips, yellow bill (no red spot at 16 px)
    "gull_white": "#ffffff", "gull_shade": "#c0cbdc", "gull_mantle": "#8b9bb4",
    "gull_mantle_dark": "#5a6988", "gull_tip": "#181425", "gull_bill": "#fee761",
    # Raccoon: ENDESGA's blue-grey ramp, ink mask, white face
    "coon_light": "#8b9bb4", "coon_fur": "#5a6988", "coon_dark": "#3a4466", "coon_deep": "#262b44",
    "coon_mask": "#181425", "coon_face": "#c0cbdc", "coon_eye": "#8b9bb4",
    "coon_ring": "#262b44", "coon_ring_light": "#c0cbdc",
    # Pufferfish: orange-yellow ramp, brown spots, cream belly
    "puff_light": "#fee761", "puff": "#feae34", "puff_dark": "#f77622", "puff_spot": "#b86f50",
    "puff_belly": "#ead4aa", "puff_fin": "#fee761", "puff_beak": "#ead4aa",
    "puff_eye_ring": "#ffffff",
    # Eel (yellow-phase American eel): dark green back, brown flank, yellow belly; the
    # all-brown version vanishes on the navy deep water.
    "eel_dark": "#265c42", "eel": "#733e39", "eel_belly": "#feae34", "eel_eye": "#fee761",
    "eel_fin": "#733e39",
}

if __name__ == "__main__":
    common.run("endesga", "B: ENDESGA 32", ENDESGA32, K,
               overrides={"water": {**common.WATER, "clear": common.CAUSTIC}})
