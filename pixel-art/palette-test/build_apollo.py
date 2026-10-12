"""Palette test A: Apollo (AdamCYounis, 46 colours; src/data/palette.ts APOLLO).

Binds every colour role in common.py to one Apollo colour, chosen by hand for this palette.
Run: python pixel-art/palette-test/build_apollo.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402

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

K = {
    "ink": "#090a14",
    # Water: Apollo's six-step blue ramp, two steps between bands so each band has its own
    # base and borrows only its neighbours for ripples.
    "water": {
        "shallow": {"base": "#73bed3", "crest": "#a4dddb", "trough": "#4f8fba",
                    "glint": "#a4dddb", "bed": "#4f8fba", "swell": "#4f8fba"},
        "mid": {"base": "#3c5e8b", "crest": "#4f8fba", "trough": "#253a5e",
                "glint": "#73bed3", "bed": "#253a5e", "swell": "#253a5e"},
        "deep": {"base": "#253a5e", "crest": "#3c5e8b", "trough": "#172038",
                 "glint": "#4f8fba", "bed": "#172038", "swell": "#172038"},
        # Placeable ("clear shallows"): the ramp's top step, ice, with bone crests and cyan
        # troughs: the palest water on the board, so "pale = you can put a fish here".
        "placeable": {"base": "#a4dddb", "crest": "#ebede9", "trough": "#73bed3",
                      "glint": "#ebede9", "bed": "#73bed3", "swell": "#73bed3"},
    },
    # Overlay markers (options not picked): bone white, a blue shadow pixel under each.
    "mark": "#ebede9", "mark_shadow": "#3c5e8b",
    # Shore
    "grass_dark": "#25562e", "grass": "#468232", "grass_light": "#75a743", "grass_tip": "#a8ca58",
    "road_dark": "#7a4841", "road": "#ad7757", "road_light": "#c09473",
    "pebble_dark": "#4d2b32", "pebble_light": "#d7b594",
    "sand_dark": "#c09473", "sand": "#d7b594", "sand_light": "#e7d5b3", "sand_ripple": "#c09473",
    # Dock: clay planks lit tan, mud joints, bark gaps, fog nails. Darker than the road and
    # the beach so the dock never reads as either; Apollo's greys read as metal, not wood.
    "wood_light": "#ad7757", "wood": "#7a4841", "wood_joint": "#4d2b32", "gap": "#341c27",
    "grain": "#4d2b32", "nail": "#a8b5b2", "board_face": "#4d2b32",
    "pile_light": "#7a4841", "pile": "#4d2b32", "pile_dark": "#341c27", "dock_shadow": "#4f8fba",
    # Gull: bone white, fog/ash grey mantle, ink wingtips, gold bill (the red gonys spot was
    # one pixel of noise at 16 px, so it is left out)
    "gull_white": "#ebede9", "gull_shade": "#c7cfcc", "gull_mantle": "#a8b5b2",
    "gull_mantle_dark": "#819796", "gull_tip": "#090a14", "gull_bill": "#e8c170",
    # Raccoon: Apollo's grey ramp (cool), ink mask, mist face, slate tail rings
    "coon_light": "#819796", "coon_fur": "#577277", "coon_dark": "#394a50", "coon_deep": "#202e37",
    "coon_mask": "#090a14", "coon_face": "#c7cfcc", "coon_eye": "#a8b5b2",
    "coon_ring": "#202e37", "coon_ring_light": "#a8b5b2",
    # Pufferfish: amber body, gold light, brass shade, copper spots, shell belly
    "puff_light": "#e8c170", "puff": "#de9e41", "puff_dark": "#be772b", "puff_spot": "#884b2b",
    "puff_belly": "#e7d5b3", "puff_fin": "#e8c170", "puff_beak": "#e7d5b3",
    "puff_eye_ring": "#ebede9",
    # Eel (yellow-phase American eel): leaf-green back, clay flank, sprout belly = olive-brown
    # with a yellow-green underside; the belly line keeps it visible on deep water.
    "eel_dark": "#25562e", "eel": "#7a4841", "eel_belly": "#a8ca58", "eel_eye": "#e8c170",
    "eel_fin": "#7a4841",
}

if __name__ == "__main__":
    common.run("apollo", "A: APOLLO (46 colours)", APOLLO, K)
