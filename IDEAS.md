# Ideas

Anything not on `ROADMAP.md`, one line each with why. Reviewed at each gate, not acted on
between them.

- **Palette snap pass**: a last full-screen pass that maps every pixel to the nearest palette
  colour. Why: lighting and fog make off-palette tints; snapping would make the 3D read as true
  pixel art. Decide in `STYLE.md` after the owner's look.
- **Integer upscale option** (letterbox to the largest whole multiple of 480 x 270). Why: 2.667x at
  720p gives 2- and 3-pixel-wide pixels; some players notice.
- **Sonar echoes**: where a cone last saw fish, a fading "last known" smudge for a few seconds.
  Why: makes vision something you manage over time, not only on/off; real units show history too.
- **Two sonar kinds**: a cheap down-imaging buoy (a narrow cone straight down, sees one spot deep)
  and a forward-looking one (the sweeping fan). Why: the real instruments differ exactly that way,
  and it gives the node/vision layer a real choice.
- **Flooded timber as structure**: standing dead trees that hold crappie, snag trotlines and
  shadow sonar. Why: the most Texas thing about a Texas reservoir; waits for the owner's Lake 1.
- **Shore trees and reeds** as cheap instanced props. Why: scale and the feel of a shoreline; the
  proof of concept's land is bare.
