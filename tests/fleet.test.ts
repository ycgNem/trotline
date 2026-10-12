// Milestone 3's rules (DESIGN.md §12): boats that fish by themselves and bring their catch to the
// dock, the trawler's net, chum slicks that pull gulls and bears onto the water, canals dug from
// the water's edge, and that a run using all of them replays from its seed and command log.
import { describe, expect, it } from 'vitest';
import { Game, type Thief, type Defender } from '../src/sim/Game';
import { Tile, isWater } from '../src/sim/world';
import { THIEVES } from '../src/data/thieves';
import { BOATS, FLEET, TRAWL } from '../src/data/boats';
import { BAIT, CHUM, WORMS } from '../src/data/bait';
import { CANAL, ZONES } from '../src/data/shore';
import { roadPos, walkGap } from '../src/sim/systems/thieves';
import { SPECIES, type SpeciesId } from '../src/data/species';
import { MIGRATIONS, SAVE_VERSION, migrate } from '../src/engine/save';

function put(g: Game, kind: Thief['kind'], i: number): Thief {
  const p = g.world.pathPt(i);
  const d = THIEVES[kind];
  const t: Thief = {
    id: g.id(), kind, x: p.x, y: p.y, hp: d.hp, maxHp: d.hp, pathI: i + 1, exitI: 0, carrying: 0, mode: 'road',
    lure: 0, eatLeft: 0, eatFull: 0, turtle: 0, worryLeft: 0, fed: [], stunT: 0, poison: 0, poisonT: 0, grabbing: 0, mobOf: 0, mobX: 0, mobY: 0, mobT: 0,
    facing: 1, hitT: 99, wave: 1,
  };
  g.thieves.push(t);
  return t;
}

function fish(g: Game, species: SpeciesId, x: number, y: number): Defender {
  g.liveWell[0] = species;
  const r = g.act({ k: 'deploy', slot: 0, x, y });
  if (!r.ok) throw new Error(r.why);
  return g.defenders[g.defenders.length - 1];
}

function waveGame(seed = 1) {
  const g = new Game(seed);
  g.phase = 'wave';
  g.wave = 1;
  g.waveStats.push({ wave: 1, start: 0, leaks: 0, stolen: 0, recovered: 0, escaped: 0, killed: 0, mobbed: 0 });
  return g;
}

const g0 = () => new Game(1);
const secs = (g: Game, s: number) => { for (let i = 0; i < Math.round(s * 60); i++) g.step(); };
const tileOf = (g: Game, t: { x: number; y: number }) => g.world.at(Math.floor(t.x), Math.floor(t.y));

// Back Bay: the point's open water is north-east, the channel north of the dock, the road row 12
const POINT = { x: 33, y: 2 };
const CHANNEL = { x: 10, y: 3 };

describe('boats (DESIGN.md §12)', () => {
  it('a boat costs its price and starts moored at its berth', () => {
    const g = new Game(1);
    g.money = 200;
    expect(g.act({ k: 'buy', item: 'rowboat' }).ok).toBe(true);
    expect(g.money).toBe(200 - BOATS.rowboat.cost);
    const b = g.boat('rowboat')!;
    expect(b.state).toBe('moored');
    expect([Math.floor(b.x), Math.floor(b.y)]).toEqual([FLEET.berths.rowboat.x, FLEET.berths.rowboat.y]);
    expect(g.act({ k: 'buy', item: 'rowboat' }).ok).toBe(false);
    expect(g.price('rowboat')).toBeNull();
  });

  it('loads worms from the can down to the reserve, buys a pack for the rest, and puts what it can\'t hold back in the can', () => {
    const g = new Game(1);
    g.money = 100;
    g.act({ k: 'buy', item: 'rowboat' });
    g.worms = FLEET.reserve + 1;
    const m = g.money;
    g.act({ k: 'send', boat: 'rowboat', ...POINT });
    g.step();
    const b = g.boat('rowboat')!;
    expect(b.state).toBe('out');
    expect(b.bait).toBe(BOATS.rowboat.hold);
    // one from the can, a pack of three bought, one of the pack left over and back in the can
    expect(g.money).toBe(m - WORMS.packCost);
    expect(g.stats.baitSpent).toBe(WORMS.packCost);
    expect(g.worms).toBe(FLEET.reserve + 1);
  });

  it('goes out by water, fishes at full rate in a wave, and brings its catch to the live well', () => {
    const g = new Game(4);
    g.money = 100;
    g.act({ k: 'buy', item: 'rowboat' });
    g.liveWell.fill(null);
    g.act({ k: 'send', boat: 'rowboat', ...POINT });
    const b = g.boat('rowboat')!;
    g.step();
    // the route keeps to water a boat can cross: no reeds, no land, no cutting a corner of land
    let px = Math.floor(b.x), py = Math.floor(b.y);
    for (const p of b.route) {
      const x = Math.floor(p.x), y = Math.floor(p.y);
      expect(isWater(g.world.at(x, y)) && g.world.at(x, y) !== Tile.Reeds).toBe(true);
      expect(Math.max(Math.abs(x - px), Math.abs(y - py))).toBe(1);
      if (x !== px && y !== py) expect(isWater(g.world.at(x, py)) && isWater(g.world.at(px, y))).toBe(true);
      px = x;
      py = y;
    }
    expect([px, py]).toEqual([POINT.x, POINT.y]);
    // a boat isn't distracted by the road: in a wave the rod's rates halve and the boat's don't
    g.phase = 'wave';
    const full = g.biteTable(POINT, BOATS.rowboat, false).reduce((n, q) => n + q.rate, 0);
    const half = g.biteTable(POINT, BOATS.rowboat).reduce((n, q) => n + q.rate, 0);
    expect(full).toBeCloseTo(half * 2);
    g.phase = 'build';
    let landed = 0;
    for (let i = 0; i < 60 * 400 && landed < BOATS.rowboat.hold; i++) {
      g.phaseTime = 30; // hold the build phase so no wave interrupts
      g.step();
      landed = g.liveWell.filter((s) => s !== null).length;
    }
    expect(landed).toBe(BOATS.rowboat.hold);
    expect(b.landed).toBe(BOATS.rowboat.hold);
    expect(g.stats.boatFish).toBe(BOATS.rowboat.hold);
  });

  it('with the live well full it waits at the dock; set to sell a kind, it sells that kind there and keeps the rest', () => {
    const g = new Game(1);
    g.money = 100;
    g.act({ k: 'buy', item: 'rowboat' });
    g.act({ k: 'send', boat: 'rowboat', ...POINT });
    const b = g.boat('rowboat')!;
    g.liveWell.fill('puffer');
    b.hold = ['ray', 'ray'];
    b.state = 'dock';
    g.step();
    expect(b.wait).toBe('well');
    expect(b.hold.length).toBe(2);
    // selling puffers doesn't move rays
    g.act({ k: 'boatSell', boat: 'rowboat', species: 'puffer', sell: true });
    g.step();
    expect(b.hold.length).toBe(2);
    g.act({ k: 'boatSell', boat: 'rowboat', species: 'ray', sell: true });
    expect(b.sell.sort()).toEqual(['puffer', 'ray']);
    const m = g.money;
    g.events.drain();
    g.step();
    expect(b.hold.length).toBe(0);
    expect(g.money).toBe(m + 2 * SPECIES.ray.sell);
    expect(g.events.drain().filter((e) => e.type === 'sell' && e.d === 1).length).toBe(2);
    expect(b.state).toBe('out');
    g.act({ k: 'boatSell', boat: 'rowboat', species: 'ray', sell: false });
    expect(b.sell).toEqual(['puffer']);
  });

  it('with no worms above the reserve and no money for a pack it waits at the dock', () => {
    const g = new Game(1);
    g.money = BOATS.rowboat.cost;
    g.act({ k: 'buy', item: 'rowboat' });
    g.worms = FLEET.reserve;
    g.act({ k: 'send', boat: 'rowboat', ...POINT });
    g.step();
    const b = g.boat('rowboat')!;
    expect(b.state).toBe('dock');
    expect(b.wait).toBe('worms');
    expect(g.worms).toBe(FLEET.reserve);
    g.money = WORMS.packCost;
    g.step();
    expect(b.state).toBe('out');
  });

  it('goes where a boat can: not land, not the reeds; a line where something bites; the trawler to open water with room to tow, not a berth', () => {
    const g = new Game(1);
    g.money = 500;
    for (const k of ['rowboat', 'skiff', 'trawler'] as const) g.act({ k: 'buy', item: k });
    expect(g.act({ k: 'send', boat: 'rowboat', x: 10, y: 14 }).ok).toBe(false);
    expect(g.act({ k: 'send', boat: 'rowboat', x: 0, y: 10 }).ok).toBe(false);
    expect(g.world.at(0, 10)).toBe(Tile.Reeds);
    expect(g.act({ k: 'send', boat: 'skiff', x: 18, y: 10 }).ok).toBe(true);
    expect(g.act({ k: 'send', boat: 'trawler', x: 18, y: 10 }).ok).toBe(false);
    expect(g.act({ k: 'send', boat: 'trawler', ...CHANNEL }).ok).toBe(true);
    // no hook bites in the channel: a line boat would sit there for ever
    expect(g.canSend('rowboat', CHANNEL.x, CHANNEL.y).why).toMatch(/hook/);
    expect(g.canSend('trawler', FLEET.berths.trawler.x, FLEET.berths.trawler.y).ok).toBe(false);
    // the mid water at (16,6), between the dock and the shallows, is a single tile: no tow
    expect(g.world.openRun(16, 6)).toBeLessThan(TRAWL.open);
    expect(g.canSend('trawler', 16, 6).ok).toBe(false);
  });

  it('the trawler tows its net for a minute in the channel: no bait, the bay\'s puffers and a stray ray, never a terrapin, and chum', () => {
    let fishN = 0, chumN = 0, rays = 0;
    for (let s = 1; s <= 20; s++) {
      const g = new Game(s);
      g.money = 100;
      g.act({ k: 'buy', item: 'trawler' });
      g.liveWell.fill(null);
      const worms = g.worms, money = g.money;
      g.act({ k: 'send', boat: 'trawler', ...CHANNEL });
      const b = g.boat('trawler')!;
      let towStart = -1, towEnd = -1;
      for (let i = 0; i < 60 * 200; i++) {
        g.phaseTime = 30;
        g.step();
        if (b.state === 'fishing' && towStart < 0) towStart = g.tick;
        if (towStart >= 0 && b.state === 'in' && towEnd < 0) towEnd = g.tick;
        // a tick at the dock unloads it
        if (towEnd >= 0 && b.state === 'dock') { g.step(); break; }
      }
      expect(towEnd).toBeGreaterThan(0);
      // a tow ends at a minute, or sooner with the hold full
      expect((towEnd - towStart) / 60).toBeLessThanOrEqual(TRAWL.tow + 0.05);
      if (b.landed < BOATS.trawler.hold) expect((towEnd - towStart) / 60).toBeGreaterThan(TRAWL.tow - 0.05);
      expect(g.worms).toBe(worms);
      expect(g.money).toBe(money);
      expect(g.liveWell.filter((f) => f !== null).length).toBe(b.landed);
      for (const f of g.liveWell) if (f) expect(['ray', 'puffer']).toContain(f);
      rays += g.liveWell.filter((f) => f === 'ray').length;
      fishN += b.landed;
      chumN += g.chum;
    }
    // the channel is the bay's water: 1.2 puffers and 1.2 x 0.4/2.5 = 0.19 rays a minute, 1.2 chum
    expect(g0().trawlRate(CHANNEL, 'puffer').rate).toBeCloseTo(1.2);
    expect(g0().trawlRate(CHANNEL, 'ray').rate).toBeCloseTo((1.2 * 0.4) / 2.5);
    expect(fishN / 20).toBeGreaterThan(0.8);
    expect(fishN / 20).toBeLessThan(2.2);
    expect(rays).toBeLessThan(fishN / 3);
    expect(chumN / 20).toBeGreaterThan(0.5);
    expect(chumN / 20).toBeLessThan(2);
  });

  it('moored, it comes home and ties up', () => {
    const g = new Game(1);
    g.money = 100;
    g.act({ k: 'buy', item: 'rowboat' });
    g.act({ k: 'send', boat: 'rowboat', ...POINT });
    const b = g.boat('rowboat')!;
    secs(g, 3);
    expect(b.state).toBe('out');
    g.act({ k: 'moor', boat: 'rowboat' });
    expect(b.state).toBe('in');
    secs(g, 30);
    expect(b.state).toBe('moored');
    expect(b.anchor).toBeNull();
  });
});

describe('chum slicks (DESIGN.md §12)', () => {
  const SLICK = { x: 18, y: 11 };

  it('goes on the pale water beside the road in the rod\'s reach, and costs a bucket', () => {
    const g = waveGame();
    expect(g.act({ k: 'slick', ...SLICK }).ok).toBe(false); // no chum yet
    g.money = 20;
    g.act({ k: 'buy', item: 'chum' });
    expect(g.money).toBe(20 - CHUM.bucketCost);
    expect(g.chum).toBe(1);
    expect(g.act({ k: 'slick', x: 18, y: 12 }).ok).toBe(false); // the road
    expect(g.act({ k: 'slick', x: 18, y: 9 }).ok).toBe(false); // 3 from the road
    expect(g.act({ k: 'slick', x: 10, y: 7 }).ok).toBe(false); // mid water
    expect(g.act({ k: 'slick', x: 4, y: 11 }).ok).toBe(false); // out of reach
    expect(g.act({ k: 'slick', ...SLICK }).ok).toBe(true);
    expect(g.chum).toBe(0);
    expect(g.lures[0].bait).toBe('chum');
    expect(g.lures[0].food).toBe(BAIT.chum.lureFood);
  });

  it('gulls drop onto the water round it and eat together, where a ray reaches them', () => {
    const g = waveGame();
    g.chum = 1;
    const ray = fish(g, 'ray', 19, 10);
    g.act({ k: 'slick', ...SLICK });
    const gulls = [put(g, 'gull', 16), put(g, 'gull', 17), put(g, 'gull', 18)];
    let together = false;
    for (let i = 0; i < 60 * 4; i++) {
      g.step();
      if (gulls.every((t) => t.mode === 'eat')) together = true;
    }
    expect(together).toBe(true);
    expect(g.lures[0]?.crowd.length ?? 0).toBeLessThanOrEqual(3);
    expect(gulls.reduce((n, t) => n + t.hp, 0)).toBeLessThan(3 * THIEVES.gull.hp);
    expect(ray.hp).toBe(ray.maxHp);
  });

  it('a bear within 5 tiles leaves the road, wades out to it and eats 8 s, in a ray\'s reach', () => {
    const g = waveGame();
    g.chum = 1;
    fish(g, 'ray', 19, 10);
    g.act({ k: 'slick', ...SLICK });
    const bear = put(g, 'bear', 14);
    let ate = 0, wet = true;
    for (let i = 0; i < 60 * 20; i++) {
      g.step();
      if (bear.mode === 'eat') { ate++; if (!isWater(tileOf(g, bear))) wet = false; }
    }
    expect(ate / 60).toBeCloseTo(THIEVES.bear.meal.chum!, 0);
    expect(wet).toBe(true);
    expect(bear.hp).toBeLessThan(THIEVES.bear.hp);
    expect(bear.mode).toBe('road');
    expect(g.lures[0].food).toBe(BAIT.chum.lureFood - THIEVES.bear.meal.chum!);
  });

  it('a raccoon takes it only if it passes within a tile: one 2 tiles out it never finds', () => {
    const far = waveGame();
    far.chum = 1;
    far.act({ k: 'slick', x: 18, y: 10 });
    const r1 = put(far, 'raccoon', 15);
    secs(far, 6);
    expect(r1.fed.length).toBe(0);
    expect(far.lures[0].food).toBe(BAIT.chum.lureFood);
    const near = waveGame();
    near.chum = 1;
    near.act({ k: 'slick', ...SLICK });
    const r2 = put(near, 'raccoon', 15);
    secs(near, 6);
    expect(['toLure', 'eat']).toContain(r2.mode);
    expect(near.lures[0].food).toBe(BAIT.chum.lureFood - THIEVES.raccoon.meal.chum!);
  });

  it('spoils when the wave ends', () => {
    const g = new Game(1);
    g.chum = 1;
    g.act({ k: 'slick', ...SLICK });
    g.act({ k: 'call' });
    while (g.wave < 1 || g.phase === 'wave') g.step();
    expect(g.lures.length).toBe(0);
  });
});

describe('canals (DESIGN.md §12)', () => {
  it('digs grass or sand that joins water, one tile at a time, for a price', () => {
    const g = new Game(1);
    g.money = 30;
    expect(g.act({ k: 'dig', x: 10, y: 13 }).ok).toBe(false); // grass that touches no water
    expect(g.act({ k: 'dig', x: 10, y: 12 }).ok).toBe(false); // the road
    expect(g.act({ k: 'dig', x: 10, y: 10 }).ok).toBe(false); // water already
    expect(g.act({ k: 'dig', x: 25, y: 13 }).ok).toBe(true); // sand beside the shallows
    expect(g.act({ k: 'dig', x: 24, y: 13 }).ok).toBe(true); // joins the tile already ordered
    expect(g.act({ k: 'dig', x: 24, y: 13 }).ok).toBe(false);
    expect(g.money).toBe(30 - 2 * CANAL.cost);
    const v = g.world.version;
    secs(g, CANAL.seconds + 0.1);
    expect(g.world.at(25, 13)).toBe(Tile.Shallow);
    expect(g.world.at(24, 13)).toBe(Tile.Grass);
    secs(g, CANAL.seconds);
    expect(g.world.at(24, 13)).toBe(Tile.Shallow);
    expect(g.world.version).toBe(v + 2);
    expect(g.stats.dug).toBe(2);
  });

  it('a canal tile wets the road beside it and takes a ray', () => {
    const g = new Game(1);
    g.money = 30;
    const road = g.world.idx(12, 12);
    expect(g.world.wet[road]).toBe(0);
    expect(g.act({ k: 'dig', x: 12, y: 11 }).ok).toBe(true);
    secs(g, CANAL.seconds + 0.1);
    expect(g.world.wet[road]).toBe(1);
    expect(g.world.zone[g.world.idx(12, 11)]).toBe('shallows');
    g.liveWell[0] = 'ray';
    expect(g.act({ k: 'deploy', slot: 0, x: 12, y: 11 }).ok).toBe(true);
  });
});

describe('the point\'s rays are shared (DESIGN.md §12)', () => {
  const STOCK = ZONES.find((z) => z.id === 'point')!.stock!.ray!;
  // the point's near side, in the surf rod's cast
  const NEAR = { x: 27, y: 4 };
  const ray = (bites: { s: string; rate: number }[]) => bites.find((q) => q.s === 'ray')?.rate ?? 0;

  it('the surf rod alone at the point fishes it at full rate', () => {
    const g = new Game(1);
    g.rodTier = 2;
    expect(g.act({ k: 'cast', ...NEAR }).ok).toBe(true);
    expect(ray(g.biteTable())).toBeCloseTo(SPECIES.ray.rates.point! * 1.5);
    expect(ray(g.biteTable())).toBeLessThan(STOCK);
  });

  it('a rowboat fishing there too: the two share about 4 rays a minute, each in proportion to its gear', () => {
    const g = new Game(1);
    g.money = 200;
    g.rodTier = 2;
    expect(g.act({ k: 'cast', ...NEAR }).ok).toBe(true);
    g.act({ k: 'buy', item: 'rowboat' });
    g.act({ k: 'send', boat: 'rowboat', x: NEAR.x + 1, y: NEAR.y });
    const b = g.boat('rowboat')!;
    for (let i = 0; i < 60 * 60 && b.state !== 'fishing'; i++) g.step();
    expect(b.state).toBe('fishing');
    const rod = ray(g.biteTable()), boat = ray(g.biteTable(b.anchor, BOATS.rowboat, false, 'rowboat'));
    expect(rod + boat).toBeCloseTo(STOCK);
    expect(rod / boat).toBeCloseTo(1.5);
    expect(g.biteTable().find((q) => q.s === 'ray')!.shared).toBe(1);
    // the bay's rays aren't a stock: a line in the shallows is never shared
    expect(g.biteTable({ x: 14, y: 7 }).find((q) => q.s === 'ray')!.shared).toBeUndefined();
  });

  it('a line not fishing there yet sees what it would get, counted once', () => {
    const g = new Game(1);
    g.rodTier = 2;
    expect(g.act({ k: 'cast', ...NEAR }).ok).toBe(true);
    const alone = ray(g.biteTable(NEAR, BOATS.skiff, false, 'skiff'));
    expect(alone).toBeCloseTo((STOCK * 3.75) / (3.75 + 3.75));
    expect(ray(g.biteTable(NEAR, g.rod, false, 'rod'))).toBeCloseTo(3.75);
  });
});

describe('walkers keep their room on the road (DESIGN.md §5)', () => {
  it('two raccoons put on the same tile come apart and keep 0.8 of a line spacing', () => {
    const g = waveGame();
    const a = put(g, 'raccoon', 5), b = put(g, 'raccoon', 5);
    secs(g, 3);
    expect(Math.abs(roadPos(g, a) - roadPos(g, b))).toBeGreaterThanOrEqual(walkGap('raccoon', 'raccoon') - 0.02);
  });

  it('one paralysed by a pufferfish holds up the one behind it', () => {
    const g = waveGame();
    const a = put(g, 'raccoon', 10), b = put(g, 'raccoon', 8);
    a.stunT = 4;
    secs(g, 3);
    expect(roadPos(g, a)).toBeCloseTo(10, 0);
    expect(roadPos(g, a) - roadPos(g, b)).toBeCloseTo(walkGap('raccoon', 'raccoon'), 1);
  });

  it('a wave comes onto the road only as fast as there is room: a 0.25 s gap is a walker a body length apart', () => {
    const g = new Game(1);
    g.wave = 10;
    g.act({ k: 'call' });
    let max = 0;
    for (let i = 0; i < 60 * 20; i++) {
      g.step();
      const walkers = g.thieves.filter((t) => t.mode === 'road' && !THIEVES[t.kind].flies).map((t) => roadPos(g, t)).sort((p, q) => p - q);
      for (let k = 1; k < walkers.length; k++) max = Math.max(max, walkGap('raccoon', 'raccoon') - (walkers[k] - walkers[k - 1]));
    }
    // no two walkers closer than their gap, give or take a frame's step
    expect(max).toBeLessThan(0.05);
  });
});

describe('a run with boats, slicks and canals', () => {
  it('replays from its seed and command log to the same state', () => {
    const g = new Game(7);
    g.act({ k: 'buy', item: 'wormbed' });
    const play = (t: number, c: Parameters<Game['act']>[0]) => { while (g.tick < t) g.step(); g.act(c); };
    // money comes from the sim's own catches: sell what lands until a boat is affordable
    while (g.money < BOATS.rowboat.cost + 10 && g.tick < 60 * 900) {
      g.step();
      const s = g.liveWell.findIndex((f) => f !== null);
      if (s >= 0 && g.phase === 'build') g.act({ k: 'sell', slot: s });
      if (!g.fishing) g.act({ k: 'cast', x: 14, y: 7 });
    }
    play(g.tick + 1, { k: 'buy', item: 'rowboat' });
    play(g.tick + 1, { k: 'send', boat: 'rowboat', ...POINT });
    play(g.tick + 60, { k: 'buy', item: 'chum' });
    play(g.tick + 1, { k: 'slick', x: 18, y: 11 });
    play(g.tick + 1, { k: 'dig', x: 12, y: 11 });
    play(g.tick + 600, { k: 'boatSell', boat: 'rowboat', species: 'ray', sell: true });
    g.run(60 * 120);
    const s = g.snapshot();
    const r = Game.replay(s.seed, s.log, s.tick);
    expect(r.tick).toBe(g.tick);
    expect([r.money, r.crates, r.worms, r.chum, r.wave, r.phase]).toEqual([g.money, g.crates, g.worms, g.chum, g.wave, g.phase]);
    expect(r.boats.map((b) => [b.kind, b.state, b.landed, b.hold.join()])).toEqual(g.boats.map((b) => [b.kind, b.state, b.landed, b.hold.join()]));
    expect([...r.world.dug]).toEqual([...g.world.dug]);
    expect(r.liveWell).toEqual(g.liveWell);
    expect(g.boats[0].landed).toBeGreaterThan(0);
  });

  it('a slice save (v1) migrates to a fresh run on its seed: the rules it was played under changed', () => {
    expect(SAVE_VERSION).toBe(2);
    const d = migrate({ v: 1, seed: 9, log: [{ t: 0, c: { k: 'call' } }], tick: 100 });
    expect(d.v).toBe(2);
    expect(d.seed).toBe(9);
    expect(d.log).toBeNull();
    expect(MIGRATIONS[1]).toBeTypeOf('function');
  });
});
