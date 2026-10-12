// The HUD, drawn with the IMGUI kit on the 2D overlay canvas: the clock and the water temperature
// (the one number PLAN.md says is always shown), the sonar's returns by band (only what it sees:
// no species and no hidden total, which would give away what vision hides), the frame's cost, the
// band legend and the keys. Station tags name each rod's band and hook depth when the camera is close.
import { BANDS, BandId } from '../data/lake';
import { bandOf } from '../sim/lake';
import { BAND_COLOR, C } from '../data/palette';
import { ICON, textWidth } from '../ui/font';
import type { UI } from '../ui/ui';
import type { Game } from '../sim/Game';
import { clockLabel } from '../sim/systems/clock';
import type { View } from '../render/view';

export interface HudState {
  fps: number;
  paused: boolean;
  sonarOnly: boolean;
  showKeys: boolean;
}

const BAND_LABEL: Record<string, string> = { surface: 'surface 0-2 m', mid: 'mid 2-4 m', bottom: 'bottom 4 m+' };

function k(n: number): string {
  return n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

export function drawHud(ui: UI, g: Game, v: View, s: HudState) {
  // top left: the lake
  const lines: [string, string][] = [
    [`${ICON.clock} ${clockLabel(g.clock.minute)}   day ${g.clock.day}${s.paused ? '   PAUSED' : ''}`, C.bone],
    [`Water ${g.clock.waterTemp.toFixed(1)}°C`, C.ice],
  ];
  // the sonar's returns, counted by the band each one is in
  const returns: Record<BandId, number> = { surface: 0, mid: 0, bottom: 0 };
  let total = 0;
  for (const sc of g.schools) {
    total += sc.n;
    for (let i = 0; i < sc.n; i++) if (sc.seen[i] > 0) returns[bandOf(sc.d[i])]++;
  }
  const parts: [string, string][] = s.sonarOnly
    ? [[`${ICON.ping} Sonar returns `, C.cyan], ...BANDS.map((b): [string, string] => [`${b.id} ${returns[b.id]}  `, BAND_COLOR[b.id]])]
    : [[`${ICON.fish} All ${total} fish shown (sonar off)`, C.amber]];
  const partsW = parts.reduce((a, [t]) => a + textWidth(t) + 1, 0);
  let w = Math.max(textWidth('TROTLINE  proof of concept'), partsW);
  for (const [t] of lines) w = Math.max(w, textWidth(t));
  ui.panel(4, 4, w + 12, 16 + (lines.length + 1) * 11, 'glass');
  ui.text('TROTLINE', 10, 9, C.gold, { shadow: C.ink });
  ui.text('proof of concept', 10 + textWidth('TROTLINE  '), 9, C.steel);
  lines.forEach(([t, c], i) => ui.text(t, 10, 21 + i * 11, c, { shadow: C.ink }));
  let px = 10;
  for (const [t, c] of parts) px += ui.text(t.trimEnd(), px, 21 + lines.length * 11, c, { shadow: C.ink }) + (textWidth(t) - textWidth(t.trimEnd())) + 1;

  // top right: what the frame cost
  const st = v.stats;
  const perf: [string, string][] = [
    [`fps ${Math.round(s.fps)}`, s.fps >= 55 ? C.lime : s.fps >= 30 ? C.amber : C.ember],
    [`draw calls ${st.sceneCalls}  (frame ${st.calls})`, st.sceneCalls <= 100 ? C.bone : C.ember],
    [`triangles ${k(st.sceneTriangles)}  (frame ${k(st.triangles)})`, st.sceneTriangles <= 150000 ? C.bone : C.ember],
    [`${st.internal[0]}x${st.internal[1]} ${v.pixel ? 'pixel pass' : 'no pass'}`, v.pixel ? C.cyan : C.amber],
  ];
  let pw = 0;
  for (const [t] of perf) pw = Math.max(pw, textWidth(t));
  ui.panel(ui.w - pw - 16, 4, pw + 12, 8 + perf.length * 11, 'glass');
  perf.forEach(([t, c], i) => ui.text(t, ui.w - 10, 9 + i * 11, c, { align: 'right', shadow: C.ink }));

  // camera preset, under the perf panel (centred at the top it ran into the lake panel at 1024 wide)
  const cam = v.rig.preset === 'free' ? 'camera: free' : `camera: ${v.rig.preset}`;
  ui.text(cam, ui.w - 10, 16 + perf.length * 11, C.fog, { align: 'right', shadow: C.ink });

  // bottom left: the bands
  const legendY = ui.h - (s.showKeys ? 52 : 40);
  ui.panel(4, legendY, 84, 36, 'glass');
  BANDS.forEach((b, i) => {
    ui.fill(9, legendY + 6 + i * 10, 6, 6, BAND_COLOR[b.id]);
    ui.text(BAND_LABEL[b.id], 19, legendY + 5 + i * 10, C.bone, { shadow: C.ink });
  });

  // station tags near the camera: band and hook depth above each band ring
  if (v.rig.pose.dist < 45 && !v.rig.underwater) {
    for (const st2 of g.stations) {
      const p = v.project(st2.hookX, st2.hookY, 0);
      if (!p) continue;
      const sx = Math.round(p.x / (ui.ctx.canvas.clientWidth / ui.w)), sy = Math.round(p.y / (ui.ctx.canvas.clientHeight / ui.h));
      const label = `${st2.band.toUpperCase()} ${st2.hookDepth.toFixed(1)} m`;
      const tw = textWidth(label) + 6;
      if (sx - tw / 2 < 2 || sx + tw / 2 > ui.w - 2 || sy < 70 || sy > ui.h - 60) continue;
      ui.panel(sx - tw / 2, sy - 22, tw, 12, 'dark', false);
      ui.text(label, sx, sy - 20, BAND_COLOR[st2.band], { align: 'center' });
    }
  }

  // bottom: the keys
  if (s.showKeys) {
    const keys = '1-4 camera   drag orbit   right-drag pan   wheel zoom   P pixel   V sonar   H hud   Space pause';
    ui.panel(4, ui.h - 15, Math.min(ui.w - 8, textWidth(keys) + 10), 12, 'dark', false);
    ui.text(keys, 9, ui.h - 13, C.fog);
  }
}
