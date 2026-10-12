// Where gulls sit when they come down on the water round something they want: a flock round a
// flockmate with a pufferfish (DESIGN.md §4), or round a chum slick (§12). Pure geometry on the
// world; shared by the defenders and lures systems.
import type { Game } from './Game';
import { isWater, type Pt } from './world';

/**
 * Round tile (x, y): first a place on the tile itself a little out from the road (so it reads as
 * on the water), then either side along the shore and a little further out, then further out
 * still; `rings` more rings of the same further out (any place that would be on land moves out
 * onto the water).
 */
export function mobSpots(g: Game, x: number, y: number, rings = 0): Pt[] {
  const w = g.world;
  const cx = x + 0.5, cy = y + 0.5;
  const p = w.pathPt(w.roadNear[w.idx(x, y)]);
  let vx = cx - p.x, vy = cy - p.y;
  const len = Math.hypot(vx, vy) || 1;
  vx /= len; vy /= len;
  const mx = cx + vx * 0.3, my = cy + vy * 0.3;
  // 0.85 tile either side and 0.3 out: three gulls read as three (at 0.7 in a row they drew as one
  // smear), and still sit where the rays round the puffer reach them (at 1 tile apart the strong
  // bot won 4 fewer, measured)
  const k = 0.85, o = 0.3;
  const out: Pt[] = [{ x: mx, y: my }];
  for (let r = 0; r <= rings; r++) {
    const ox0 = vx * 0.8 * r, oy0 = vy * 0.8 * r;
    const ring = r ? [[ox0, oy0]] : [];
    ring.push([-vy * k + vx * o + ox0, vx * k + vy * o + oy0], [vy * k + vx * o + ox0, -vx * k + vy * o + oy0], [vx * 0.9 + ox0, vy * 0.9 + oy0]);
    for (const [ox, oy] of ring) {
      const sx = mx + ox, sy = my + oy;
      out.push(isWater(w.at(Math.floor(sx), Math.floor(sy))) ? { x: sx, y: sy } : { x: sx + vx * 0.8, y: sy + vy * 0.8 });
    }
  }
  return out;
}
