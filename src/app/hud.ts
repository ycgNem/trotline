// The HUD, drawn with the IMGUI kit over the board in UI pixels: the top bar (money, crates,
// worms, rod, wave clock, send the wave), the live well with sell / deploy, the shop, the status line
// (what the line is doing, or what the current mode wants), floating numbers, toasts, lesson cards,
// tooltips over the board, and the title and end screens.
import type { App } from './app';
import { C, rgba } from '../data/palette';
import { ICON, textWidth, wrapText, LINE_H } from '../ui/font';
import { SPECIES, type SpeciesId } from '../data/species';
import { DEFENDERS } from '../data/defenders';
import { THIEVES } from '../data/thieves';
import { WAVES } from '../data/waves';
import { RODS } from '../data/rods';
import { WORMS } from '../data/bait';
import { RULES } from '../data/rules';
import { TITLE, FIRST_HINT } from '../data/lessons';
import { sheet, drawSprite } from '../render/sprites';
import { isSlot } from '../render/ground';
import { Tile, isWater } from '../sim/world';
import { lurePreview } from '../sim/systems/lures';
import { pufferRays } from '../sim/systems/defenders';
import type { TipLine } from '../ui/ui';

const BAR_H = 18;

/** The help card: [keys, what they do]. */
const HELP: [string, string][] = [
  ['Goal', 'Keep crates in the smokehouse through 8 waves of hungry thieves.'],
  ['Click', 'Cast into the water. Puffers bite by the dock and reeds, terrapins only at the reeds; rays are strays in the bay and common at the point (surf rod). Hover water to see. Every catch takes a worm.'],
  ['1-6', 'Pick a fish in the live well.'],
  ['X', 'Sell it for money.'],
  ['F', 'Deploy it: pale water by the road for pufferfish and rays, the road itself for a terrapin.'],
  ['L', 'Cast a worm on the road. Raccoons stop to eat it; a gull swallows it; bears ignore it. Shift-click for more.'],
  ['N', 'Send the next wave now, when you are ready.'],
  ['Space', 'Pause. Tab speeds up (x1 to x3).'],
  ['Esc', 'Cancel (or right-click).'],
  ['Wheel', 'Zoom (or Q / E); WASD or the arrows pan.'],
  ['M / H', 'Sound on or off / hide the HUD.'],
];
const PANEL_H = 44;

export class Hud {
  constructor(public app: App) {}

  draw(dt: number) {
    const a = this.app;
    if (a.screen === 'title') return this.title();
    // floating numbers belong to the live board, not under a card or the end screen
    if (a.screen === 'play' && !a.lesson && !a.help) this.floaters(dt);
    if (a.screen === 'play') {
      this.topBar();
      this.liveWell();
      this.shop();
      this.status();
      this.boardTip();
      if (a.paused && !a.lesson) this.banner('Paused', 'Space to carry on');
      // a card open takes the screen; the toast waits (and keeps its time) until it closes
      if (!a.lesson && !a.help) this.toast(dt);
      if (a.lesson) this.lessonCard();
      else if (a.help) this.helpCard();
    } else this.endScreen();
    if (a.debug) this.debugLine();
  }

  // ---------------------------------------------------------------- top bar

  private topBar() {
    const { ui, game: g } = this.app;
    ui.panel(0, 0, ui.w, BAR_H);
    let x = 6;
    const y = 5;
    const item = (s: string, col: string, tip: string) => {
      const w = textWidth(s);
      ui.text(s, x, y, col, { shadow: C.ink });
      if (ui.hover(x - 2, 0, w + 4, BAR_H)) ui.tip([{ text: tip }]);
      x += w + 12;
    };
    item(ICON.coin + ' ' + g.money, C.gold, 'Money. From selling fish and from every thief you stop. Spend it on worms, the worm bed and a better rod.');
    item('Crates ' + g.crates + '/' + RULES.crates, g.crates <= 5 ? C.ember : C.shell, 'The season\'s catch in the smokehouse. Thieves carry crates off; stop a thief on its way out and you get them back. At 0 the season is over.');
    item('Worms ' + g.worms + (g.wormBed ? ' (bed)' : ''), C.rose, 'Bait. Every fish you catch takes a worm, and so does every lure on the road.' + (g.wormBed ? ` The worm bed makes one every ${WORMS.period} s.` : ''));
    item('Rod ' + g.rodTier, C.mist, `${g.rod.name}: casts ${g.rod.range} tiles, lands ${g.rod.line} fish, reel x${g.rod.reel}.`);
    // the wave clock
    const wave = g.phase === 'build'
      ? `Wave ${g.wave + 1}/${WAVES.length} in ${Math.ceil(g.phaseTime)}s`
      : `Wave ${g.wave}/${WAVES.length}: ${g.spawnQueue.length + g.thieves.filter((t) => t.mode !== 'dead' && t.mode !== 'gone').length} thieves`;
    item(wave, g.phase === 'wave' ? C.ember : C.bone, g.phase === 'build' ? this.nextWaveTip() : 'Thieves are on the road. Fishing runs at half speed while you watch them. ' + this.comingTip());
    // right side: send the wave, pause, speed
    const a = this.app;
    let rx = ui.w - 4;
    const btn = (id: string, w: number, label: string, tip: string, active = false) => {
      rx -= w;
      const hit = ui.button(id, rx, 2, w, BAR_H - 4, label, { tip, active });
      rx -= 3;
      return hit;
    };
    if (btn('help', 18, '?', 'Help and keys (/).', a.help)) a.help = !a.help;
    if (btn('speed', 22, 'x' + a.speed, 'Game speed (Tab).', a.speed > 1)) a.speed = a.speed >= 3 ? 1 : a.speed + 1;
    if (btn('pause', 22, a.paused ? '>' : 'II', 'Pause (Space).', a.paused)) a.paused = !a.paused;
    if (g.phase === 'build') {
      const label = 'Send wave';
      if (btn('call', textWidth(label) + 12, label, 'Start the next wave now (N), when you are ready for it.')) a.act({ k: 'call' });
    }
  }

  private nextWaveTip(): string {
    const t = this.comingTip();
    return t ? t + ' Fish, sell and deploy until the clock runs out.' : '';
  }

  /** The next two waves, so a player can fish ahead for them (a gull wave wants puffers). */
  private comingTip(): string {
    const g = this.app.game;
    const who = (i: number) => WAVES[i]?.groups.map(([id, n]) => `${n} ${THIEVES[id].name.toLowerCase()}${n > 1 ? 's' : ''}`).join(', ');
    const a = who(g.wave), b = who(g.wave + 1);
    if (!a) return 'This is the last wave.';
    return `Next: ${a}.` + (b ? ` Then: ${b}.` : ' Then the season is done.');
  }

  // ---------------------------------------------------------------- live well

  private liveWell() {
    const a = this.app, { ui, game: g } = a;
    const n = g.liveWell.length;
    const W = n * 26 + 8, x = 4, y = ui.h - PANEL_H - 4;
    ui.panel(x, y, W, PANEL_H);
    const used = g.liveWell.filter(Boolean).length;
    ui.text(`Live well ${used}/${n}`, x + 5, y + 4, used === n ? C.ember : C.bone);
    if (ui.hover(x, y, W, 12)) ui.tip([{ text: 'Your catch. Click a fish (or press 1-6), then sell it or deploy it. A full live well stops your fishing.' }]);
    for (let i = 0; i < n; i++) {
      const sx = x + 4 + i * 26, sy = y + 15;
      const s = g.liveWell[i];
      const sel = a.selected === i;
      const hov = ui.hover(sx, sy, 24, 25);
      ui.fill(sx, sy, 24, 25, sel ? C.blue : hov && s ? C.iron : C.night);
      ui.fill(sx, sy, 24, 1, sel ? C.sky : C.slate);
      ui.block(sx, sy, 24, 25);
      if (s) {
        const sh = sheet(s);
        drawSprite(ui.ctx, sh, 0, sx + 12 - Math.floor(sh.w / 2) + sh.ax, sy + 13 - Math.floor(sh.h / 2) + sh.ay);
        if (hov) ui.tip(this.fishTip(s));
        if (hov && ui.clicked) { ui.eat(); a.pick(i); a.audio.sfx('click'); }
      }
      ui.text(String(i + 1), sx + 2, sy + 1, s ? C.ash : C.iron);
    }
    // the picked fish's choice
    if (a.selected !== null && g.liveWell[a.selected]) {
      const s = g.liveWell[a.selected]!;
      const sp = SPECIES[s], d = DEFENDERS[s];
      const label = sp.name + ': ' + (d.kind === 'poison' ? 'poison bait' : d.kind === 'zap' ? 'shocker' : 'shell');
      const bw = Math.max(W, textWidth(label) + 10);
      const by = y - 36;
      ui.panel(x, by, bw, 34);
      ui.text(label, x + 5, by + 4, C.gold);
      if (ui.button('sell', x + 4, by + 15, 60, 16, `Sell $${sp.sell}`, { tip: `Sell it now for $${sp.sell} (X).` })) a.sellSelected();
      const dep = a.mode.k === 'deploy';
      if (ui.button('deploy', x + 68, by + 15, 60, 16, dep ? 'Cancel' : 'Deploy', { active: dep, tip: this.deployTip(s) })) a.deploySelected();
    }
  }

  private fishTip(s: SpeciesId): TipLine[] {
    const sp = SPECIES[s], d = DEFENDERS[s];
    return [
      { text: sp.name + ' (' + sp.real + ')', color: C.gold },
      { text: d.job },
      { text: `Sells for $${sp.sell}. ${d.hp} HP.`, color: C.ash },
    ];
  }

  private deployTip(s: SpeciesId): string {
    const d = DEFENDERS[s];
    return d.place === 'road'
      ? 'Deploy (F): put it on any road tile. Raccoons stop to worry it one at a time while the rest wait, gnawing it down; a bear shoves it aside in 3 s. Gulls fly over.'
      : d.kind === 'zap'
        ? 'Deploy (F): light shallow water within 2 tiles of the road. Its shock reaches the wet road (gold) and not the dry. 1 tile out, walkers claw at it as they pass; 2 tiles out only a raccoon waiting in a lure\'s line reaches it, slowly.'
        : `Deploy (F): light shallow water within ${d.maxRoadDist} tile of the road. Set it between rays: a gull flock lands round it, and the rays framed in gold reach them.`;
  }

  // ---------------------------------------------------------------- shop

  private shop() {
    const a = this.app, { ui, game: g } = a;
    const W = 168, x = ui.w - W - 4, y = ui.h - PANEL_H - 4;
    ui.panel(x, y, W, PANEL_H);
    const bed = g.price('wormbed'), rod = g.price('rod'), pack = g.price('worms')!;
    const bw = 78, bh = 18;
    if (ui.button('bed', x + 4, y + 4, bw, bh, bed === null ? 'Worm bed' : `Worm bed $${bed}`, {
      disabled: bed === null || g.money < bed,
      tip: bed === null ? `Your worm bed makes a worm every ${WORMS.period} s.` : `Dig a worm bed: a worm every ${WORMS.period} s, for good. Bait for fishing and for lures.`,
    })) a.act({ k: 'buy', item: 'wormbed' });
    const next = RODS[g.rodTier];
    if (ui.button('rod', x + 86, y + 4, bw, bh, rod === null ? 'Surf rod' : `Surf rod $${rod}`, {
      disabled: rod === null || g.money < rod,
      tip: next ? `${next.name}: casts ${next.range} tiles, out to the point where the rays live (only rays bite there), reel x${next.reel}.` : 'Your best rod.',
    })) a.act({ k: 'buy', item: 'rod' });
    if (ui.button('pack', x + 4, y + 24, bw, bh, `${WORMS.packSize} worms $${pack}`, { disabled: g.money < pack, tip: 'A pack of worms from the bait shop.' })) a.act({ k: 'buy', item: 'worms' });
    const lure = a.mode.k === 'lure';
    if (ui.button('lure', x + 86, y + 24, bw, bh, lure ? 'Cancel' : 'Lure (L)', { active: lure, disabled: g.worms < 1 && !lure, tip: 'Cast a worm onto the road in reach. Raccoons within 4 tiles leave the road to eat it, one at a time, and the ones waiting in line claw at fish within 2 tiles. A gull within 2 swallows it whole; bears ignore it. It spoils when the wave ends. Shift-click to cast more.' })) a.toggleLure();
  }

  // ---------------------------------------------------------------- status line

  private status() {
    const a = this.app, { ui, game: g } = a;
    const left = 4 + g.liveWell.length * 26 + 8 + 4, right = ui.w - 168 - 8;
    const W = right - left;
    if (W < 60) return;
    const y = ui.h - PANEL_H - 4;
    ui.panel(left, y, W, PANEL_H);
    let l1: string, l2 = '', c1: string = C.bone;
    if (a.mode.k === 'deploy') {
      const s = g.liveWell[a.mode.slot]!;
      l1 = `Deploy the ${SPECIES[s].name.toLowerCase()}: click a lit tile.`;
      l2 = 'Right-click or Esc to cancel.';
      c1 = C.gold;
      const h = a.hover;
      if (s === 'puffer' && h && g.canDeploy(s, h.x, h.y).ok) {
        const n = pufferRays(g, h.x, h.y).length;
        l1 = n ? `${n} ray${n > 1 ? 's reach' : ' reaches'} where a gull flock lands round it (gold).` : 'No ray reaches where a gull flock would land round it.';
      }
    } else if (a.mode.k === 'lure') {
      l1 = 'Cast a worm: click a pink road tile.';
      l2 = 'Right-click or Esc to cancel.';
      c1 = C.rose;
      const h = a.hover;
      if (h && g.canLure(h.x, h.y).ok) {
        const pv = lurePreview(g, h.x, h.y);
        const n = pv.shocks.length, m = pv.waded.length;
        l1 = n ? `${n} ray${n > 1 ? 's reach' : ' reaches'} the raccoon eating here (gold).` : pv.dry ? 'Dry ground: no shock reaches a raccoon eating here.' : 'No ray reaches the raccoon eating here.';
        l2 = m ? `The line waiting behind it can claw ${m} fish (red).` : 'The line waits clear of your fish.';
        if (m) c1 = C.ember;
      }
    } else if (!g.fishing) {
      l1 = FIRST_HINT;
    } else {
      const block = g.fishBlock();
      l1 = 'Fishing: ' + g.zoneName(g.fishZone) + (g.phase === 'wave' ? ' (half speed)' : '');
      if (block) { l2 = block + '.'; c1 = C.ember; }
      else l2 = g.biteTable().map((b) => `${SPECIES[b.s].name} ${b.rate ? b.rate.toFixed(1) + '/min' : '(' + b.why + ')'}`).join(', ');
    }
    // every line is drawn: one that doesn't fit spills out of the panel, where the overlap audit
    // (npm run screens) catches it, rather than being dropped unseen
    const lines = [...wrapText(l1, W - 10), ...(l2 ? wrapText(l2, W - 10) : [])];
    lines.forEach((s, i) => ui.text(s, left + 5, y + 4 + i * LINE_H, i === 0 ? c1 : C.ash));
  }

  // ---------------------------------------------------------------- the board under the mouse

  private boardTip() {
    const a = this.app, { ui, game: g } = a;
    const h = a.hover;
    if (!h || ui.captured || a.mode.k !== 'idle') return;
    const near = (x: number, y: number) => Math.hypot(x - h.x - 0.5, y - h.y - 0.5) < 0.8;
    const t = g.thieves.find((q) => q.mode !== 'dead' && q.mode !== 'gone' && near(q.x, q.y));
    if (t) {
      const d = THIEVES[t.kind];
      const doing = t.stunT > 0 ? 'Retching up a pufferfish!'
        : t.mode === 'eat' ? 'Eating a worm.' : t.mode === 'queue' ? 'Waiting for the worm.' : t.mode === 'toLure' ? 'Going for the worm!'
        : t.mode === 'worry' ? 'Worrying a terrapin.' : t.mode === 'wait' ? 'Waiting its turn at the terrapin.'
        : t.mode === 'exit' ? `Making off with ${t.carrying} crate${t.carrying === 1 ? '' : 's'}.`
        : t.grabbing ? 'Clawing at a fish!' : 'Heading for the smokehouse.';
      const lines: TipLine[] = [{ text: `${d.name} (${d.real})  ${Math.ceil(t.hp)}/${d.hp} HP`, color: C.ember }, { text: doing }];
      if (t.poisonT > 0) lines.push({ text: `Poisoned: ${Math.ceil(t.poison)} more damage coming.`, color: C.lime });
      lines.push({ text: d.note, color: C.ash });
      ui.tip(lines);
      return;
    }
    const d = g.defenders.find((q) => q.x === h.x && q.y === h.y);
    if (d) {
      const def = DEFENDERS[d.species];
      const lines: TipLine[] = [{ text: `${SPECIES[d.species].name}  ${Math.ceil(d.hp)}/${d.maxHp} HP`, color: C.gold }, { text: def.job }];
      if (g.thieves.some((t) => t.grabbing === d.id)) lines.push({ text: 'Being clawed!', color: C.red });
      ui.tip(lines);
      return;
    }
    const tile = g.world.at(h.x, h.y);
    if (isWater(tile)) {
      const w = g.world, i = w.idx(h.x, h.y);
      const z = w.zone[i];
      const where = !z ? '' : { dock: ', by the dock', reeds: ', by the reeds', open: ', open sand' }[w.habitat(i)];
      const lines: TipLine[] = [{ text: g.zoneName(z) + where, color: C.ice }];
      const bites = g.biteTable(h);
      if (bites.length) lines.push({ text: 'Bites: ' + bites.map((b) => `${SPECIES[b.s].name} ${b.rate ? b.rate.toFixed(1) + '/min' : '(' + b.why + ')'}`).join(', ') });
      else lines.push({ text: 'Nothing bites out here yet.', color: C.ash });
      if (isSlot(w, h.x, h.y)) {
        const dist = w.roadDist[i];
        lines.push(dist <= 1
          ? { text: 'A slot: pufferfish or ray. Walkers claw at a ray this close.', color: C.lime }
          : { text: 'A slot: ray only. Walkers passing can\'t reach it; a raccoon waiting in a lure\'s line can.', color: C.lime });
      } else if (tile === Tile.Reeds) lines.push({ text: 'Reeds: no room for a fish.', color: C.ash });
      const reach = g.world.castDist(h.x, h.y) <= g.rod.range;
      lines.push({ text: reach ? 'Click to cast here.' : `Out of reach (your rod casts ${g.rod.range} tiles).`, color: reach ? C.bone : C.ember });
      ui.tip(lines);
    } else if (tile === Tile.Road) {
      ui.tip([{ text: 'The road', color: C.tan }, { text: 'Thieves walk it to the smokehouse. Terrapins sit on it; lures land on it.' }]);
    } else if (tile === Tile.House) {
      ui.tip([{ text: 'The smokehouse', color: C.copper }, { text: `${g.crates} crates of the season's catch.` }]);
    }
  }

  // ---------------------------------------------------------------- floaters, toast, banners

  private floaters(dt: number) {
    const a = this.app, { ui } = a;
    const k = a.uiScale;
    for (const f of a.floaters) {
      f.t += a.paused || a.lesson ? 0 : dt;
      const p = a.renderer.toScreen(f.x, f.y);
      const y = p.y / k - f.t * 12;
      ui.text(f.text, p.x / k, y, f.col, { align: 'center', shadow: C.ink });
    }
    a.floaters = a.floaters.filter((f) => f.t < 1.4);
  }

  private toast(dt: number) {
    const a = this.app, { ui } = a;
    if (!a.toast) return;
    a.toast.t += dt;
    if (a.toast.t > a.toast.life) { a.toast = null; return; }
    // under the top bar, over open water: at the bottom it covered the smokehouse and its crates
    const w = Math.min(ui.w - 20, 360, textWidth(a.toast.text) + 14);
    const lines = wrapText(a.toast.text, w - 10);
    const h = lines.length * LINE_H + 8;
    const x = Math.floor((ui.w - w) / 2), y = BAR_H + 6;
    ui.panel(x, y, w, h, 'dark', false);
    lines.forEach((l, i) => ui.text(l, x + 5, y + 5 + i * LINE_H, C.shell));
  }

  private banner(title: string, sub: string) {
    const { ui } = this.app;
    const w = Math.max(textWidth(title) * 2, textWidth(sub)) + 24;
    const x = Math.floor((ui.w - w) / 2), y = Math.floor(ui.h / 2) - 24;
    ui.panel(x, y, w, 40, 'dark', false);
    ui.text(title, ui.w / 2, y + 6, C.bone, { scale: 2, align: 'center', shadow: C.ink });
    ui.text(sub, ui.w / 2, y + 26, C.ash, { align: 'center' });
  }

  private lessonCard() {
    const a = this.app, { ui } = a;
    const l = a.lesson!;
    const w = Math.min(280, ui.w - 20);
    const lines = wrapText(l.text, w - 16);
    const h = 26 + lines.length * LINE_H + 26;
    const x = Math.floor((ui.w - w) / 2), y = Math.max(BAR_H + 4, Math.floor((ui.h - h) / 2) - 30);
    ui.fill(0, 0, ui.w, ui.h, C.ink, 0.35);
    ui.panel(x, y, w, h);
    ui.text(l.title, x + 8, y + 7, C.gold, { shadow: C.ink });
    lines.forEach((s, i) => ui.text(s, x + 8, y + 22 + i * LINE_H, C.bone));
    if (ui.button('lesson', x + w - 62, y + h - 22, 54, 16, 'Got it') || a.input.keyPressed('Enter') || a.input.keyPressed('Escape')) {
      a.lesson = null;
      a.input.pressed.delete('Escape');
    }
  }

  private helpCard() {
    const a = this.app, { ui } = a;
    const w = Math.min(330, ui.w - 20);
    const rows = HELP.flatMap(([k, t]) => {
      const lines = wrapText(t, w - 76);
      return lines.map((l, i) => [i === 0 ? k : '', l] as const);
    });
    const h = 24 + rows.length * LINE_H + 26;
    const x = Math.floor((ui.w - w) / 2), y = Math.max(BAR_H + 2, Math.floor((ui.h - h) / 2) - 20);
    ui.fill(0, 0, ui.w, ui.h, C.ink, 0.35);
    ui.panel(x, y, w, h);
    ui.text('How to fish this shore', x + 8, y + 7, C.gold, { shadow: C.ink });
    rows.forEach(([k, t], i) => {
      if (k) ui.text(k, x + 8, y + 22 + i * LINE_H, C.ice);
      ui.text(t, x + 70, y + 22 + i * LINE_H, C.bone);
    });
    if (ui.button('helpClose', x + w - 62, y + h - 22, 54, 16, 'Close')) a.help = false;
  }

  // ---------------------------------------------------------------- title and end

  private title() {
    const a = this.app, { ui } = a;
    ui.fill(0, 0, ui.w, ui.h, C.ink, 0.45);
    const w = Math.min(300, ui.w - 20);
    const lines = TITLE.lines.flatMap((s) => wrapText(s, w - 20));
    const save = a.hasSave();
    const h = 50 + lines.length * LINE_H + 34;
    const x = Math.floor((ui.w - w) / 2), y = Math.floor((ui.h - h) / 2);
    ui.panel(x, y, w, h);
    ui.text(TITLE.name, ui.w / 2, y + 10, C.gold, { scale: 3, align: 'center', shadow: C.rust });
    lines.forEach((s, i) => ui.text(s, ui.w / 2, y + 44 + i * LINE_H, i < wrapText(TITLE.lines[0], w - 20).length ? C.bone : C.mist, { align: 'center' }));
    const by = y + h - 24;
    if (save) {
      if (ui.button('continue', x + w / 2 - 98, by, 92, 18, 'Continue')) a.continueRun();
      if (ui.button('new', x + w / 2 + 6, by, 92, 18, 'New season')) a.newRun();
    } else if (ui.button('new', x + w / 2 - 50, by, 100, 18, 'Start fishing') || a.input.keyPressed('Enter')) a.newRun();
    ui.text('Back Bay, a brackish shore.  Press / in play for help and keys.', ui.w / 2, ui.h - 12, C.ash, { align: 'center', shadow: C.ink });
  }

  private endScreen() {
    const a = this.app, { ui, game: g } = a;
    const won = g.phase === 'won';
    const st = g.stats;
    const caught = g.caught.puffer + g.caught.ray + g.caught.turtle;
    const rows = [
      won ? `${g.crates} of ${RULES.crates} crates saved.` : `Lost on wave ${g.wave} of ${WAVES.length}.`,
      `Fish caught: ${caught} (${g.caught.puffer} puffer, ${g.caught.ray} ray, ${g.caught.turtle} terrapin).`,
      `Deployed ${st.deployed}, sold ${st.sold}. Lures cast: ${st.lures}.`,
      `Thieves stopped: ${st.killed}. Reached the smokehouse: ${st.leaks}.`,
      `Fish lost to claws and gnawing: ${st.lost}.`,
      ...(st.recovered ? [`Crates taken back from fleeing thieves: ${st.recovered}.`] : []),
    ];
    const w = Math.min(300, ui.w - 20), h = 34 + rows.length * LINE_H + 30;
    const x = Math.floor((ui.w - w) / 2), y = Math.floor((ui.h - h) / 2);
    ui.fill(0, 0, ui.w, ui.h, C.ink, 0.4);
    ui.panel(x, y, w, h);
    ui.text(won ? 'The season\'s catch is safe' : 'The smokehouse is empty', ui.w / 2, y + 8, won ? C.gold : C.ember, { scale: 1, align: 'center', shadow: C.ink });
    rows.forEach((s, i) => ui.text(s, x + 10, y + 26 + i * LINE_H, i === 0 ? C.bone : C.mist));
    if (ui.button('again', x + w / 2 - 50, y + h - 24, 100, 18, 'Fish again') || a.input.keyPressed('Enter')) a.newRun();
  }

  private debugLine() {
    const a = this.app, { ui, game: g } = a;
    const s = `fps ${a.loop.fps.toFixed(0)}  tick ${g.tick}  ms ${a.loop.tickMs.toFixed(2)}/${a.loop.frameMs.toFixed(2)}  zoom ${a.renderer.cam.zoom}  ui ${a.uiScale}  thieves ${g.thieves.length}`;
    ui.fill(0, BAR_H, textWidth(s) + 8, 11, C.ink, 0.8);
    ui.text(s, 4, BAR_H + 1, C.lime);
    void rgba;
  }
}
