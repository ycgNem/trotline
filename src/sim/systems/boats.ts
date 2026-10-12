// Boats (DESIGN.md §12), run by the fishing system: each boat travels by water to the tile it was
// sent to, fishes there (a baited line rolls the tile's bite table as the rod's does; the trawler's
// net rolls the trawl table in open water and brings up chum), and comes home when its hold is
// full or its bait is gone (the trawler after a 60 s tow). At the dock it puts its catch in the
// live well, or sells it if it is set to, takes on chum, loads worms (from the can down to the
// reserve, then from the bait shop) and goes out again. A full live well, or no worms and no money
// for them, keeps it waiting at the dock.
import type { Game, Boat } from '../Game';
import { Tile } from '../world';
import { BOATS, TRAWL, FLEET } from '../../data/boats';
import { WORMS } from '../../data/bait';
import type { SpeciesId } from '../../data/species';

export function tickBoats(g: Game, dt: number) {
  for (const b of g.boats) {
    switch (b.state) {
      case 'moored':
        break;
      case 'dock':
        dock(g, b);
        break;
      case 'out':
      case 'in':
        travel(g, b, BOATS[b.kind].speed * dt);
        break;
      case 'fishing':
        fish(g, b, dt);
        break;
    }
  }
}

/** At its berth: unload, take on bait, set out. */
function dock(g: Game, b: Boat) {
  const def = BOATS[b.kind];
  while (b.hold.length) {
    const s = b.hold[0];
    if (b.sell.includes(s)) g.sellFish(s, b.x, b.y, b.kind);
    else {
      const slot = g.liveWell.indexOf(null);
      if (slot < 0) { b.wait = 'well'; return; }
      g.liveWell[slot] = s;
      g.events.push({ type: 'land', tick: g.tick, id: s, x: b.x, y: b.y, value: slot });
    }
    b.hold.shift();
  }
  if (b.chum) {
    g.chum += b.chum;
    g.events.push({ type: 'chumIn', tick: g.tick, x: b.x, y: b.y, value: b.chum });
    b.chum = 0;
  }
  if (!b.anchor) { b.state = 'moored'; b.wait = ''; return; }
  if (def.gear === 'line' && b.bait < def.hold) {
    // from the can, never below the reserve (the line and a lure), then the bait shop at the dock
    const take = Math.min(def.hold - b.bait, Math.max(0, g.worms - FLEET.reserve));
    g.worms -= take;
    b.bait += take;
    while (b.bait < def.hold && g.money >= WORMS.packCost) {
      g.money -= WORMS.packCost;
      g.stats.baitSpent += WORMS.packCost;
      b.bait += WORMS.packSize;
      g.events.push({ type: 'buy', tick: g.tick, id: 'worms', value: WORMS.packCost, d: 1 });
    }
    // a pack is three: what the hold can't use goes in the can
    if (b.bait > def.hold) { g.worms += b.bait - def.hold; b.bait = def.hold; }
    if (b.bait < 1) { b.wait = 'worms'; return; }
  }
  g.route(b, b.anchor, 'out');
}

function travel(g: Game, b: Boat, step: number) {
  while (step > 0 && b.routeI < b.route.length) {
    const p = b.route[b.routeI];
    const dx = p.x - b.x, dy = p.y - b.y;
    const dist = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.01) b.facing = dx > 0 ? 1 : -1;
    if (dist > step) { b.x += (dx / dist) * step; b.y += (dy / dist) * step; return; }
    b.x = p.x;
    b.y = p.y;
    step -= dist;
    b.routeI++;
  }
  if (b.routeI < b.route.length) return;
  if (b.state === 'in') {
    b.x = b.berth.x + 0.5;
    b.y = b.berth.y + 0.5;
    b.state = 'dock';
    g.events.push({ type: 'boatIn', tick: g.tick, id: b.kind, x: b.x, y: b.y, value: b.hold.length });
    return;
  }
  b.state = 'fishing';
  b.towT = 0;
  if (BOATS[b.kind].gear === 'net') towLine(g, b);
}

/** The trawler tows back and forth across its anchor, along whichever way the open water runs. */
function towLine(g: Game, b: Boat) {
  const w = g.world, a = b.anchor!;
  const open = (x: number, y: number) => w.at(x, y) === Tile.Mid || w.at(x, y) === Tile.Deep;
  b.towDx = 0;
  b.towDy = 0;
  if (open(a.x - 1, a.y) && open(a.x + 1, a.y)) b.towDx = 1;
  else if (open(a.x, a.y - 1) && open(a.x, a.y + 1)) b.towDy = 1;
}

function fish(g: Game, b: Boat, dt: number) {
  const def = BOATS[b.kind];
  const a = b.anchor;
  if (!a) { g.route(b, b.berth, 'in'); return; }
  if (def.gear === 'net') {
    b.towT += dt;
    // the net out, the boat running slowly up and down its tow
    const k = Math.sin((b.towT / TRAWL.tow) * Math.PI * 2) * 0.9;
    const px = b.x;
    b.x = a.x + 0.5 + b.towDx * k;
    b.y = a.y + 0.5 + b.towDy * k;
    if (Math.abs(b.x - px) > 1e-4) b.facing = b.x > px ? 1 : -1;
    for (const s of Object.keys(TRAWL.fish) as SpeciesId[]) {
      if (b.hold.length >= def.hold) break;
      if (g.rng.next() < (g.trawlRate(a, s, b.kind).rate * dt) / 60) catchOne(g, b, s);
    }
    if (g.rng.next() < (TRAWL.chum * dt) / 60) b.chum++;
    if (b.towT >= TRAWL.tow || b.hold.length >= def.hold) g.route(b, b.berth, 'in');
    return;
  }
  if (b.bait < 1 || b.hold.length >= def.hold) { g.route(b, b.berth, 'in'); return; }
  // a boat isn't distracted by the road: it fishes at full rate in a wave (DESIGN.md §12)
  for (const bite of g.biteTable(a, def, false, b.kind)) {
    if (bite.rate <= 0) continue;
    if (g.rng.next() < (bite.rate * dt) / 60) {
      b.bait--;
      catchOne(g, b, bite.s);
      return;
    }
  }
}

function catchOne(g: Game, b: Boat, s: SpeciesId) {
  b.hold.push(s);
  b.landed++;
  g.stats.boatFish++;
  g.tickCatches.push(s);
  g.events.push({ type: 'boatCatch', tick: g.tick, id: s, x: b.x, y: b.y });
}

/** What a boat is doing, in words, for the production view and its tooltip. */
export function boatDoing(g: Game, b: Boat): string {
  const def = BOATS[b.kind];
  const where = b.anchor ? g.zoneName(g.world.zone[g.world.idx(b.anchor.x, b.anchor.y)]).replace(/^The /, 'the ') : '';
  switch (b.state) {
    case 'moored': return 'Moored. Send it somewhere to fish.';
    case 'dock':
      if (b.wait === 'well') return `Waiting on the live well (${b.hold.length} aboard).`;
      if (b.wait === 'worms') return `Waiting on worms (none in the can, no $${WORMS.packCost} for a pack).`;
      return 'Loading at the dock.';
    case 'out': return `Going out to ${where}.`;
    case 'in': return `Coming in with ${b.hold.length} fish${b.chum ? ` and ${b.chum} chum` : ''}.`;
    case 'fishing':
      if (def.gear === 'net') return `Towing in ${where}: ${b.hold.length}/${def.hold} fish, ${b.chum} chum.`;
      return `Fishing ${where}: ${b.hold.length}/${def.hold}, ${b.bait} worm${b.bait === 1 ? '' : 's'} left.`;
  }
}
