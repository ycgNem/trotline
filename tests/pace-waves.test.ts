// The pace tests, part 1: DESIGN.md §6-§7's lessons in single waves (wave 1 over many seeds, and
// fixed waves with chosen fish). If one fails, don't loosen it: change the model in DESIGN.md, say
// why in DECISIONS.md, then change the data.
import { describe, expect, it } from 'vitest';
import { playRun, type Strategy, type BotOpts } from '../src/sim/bot';
import { Game } from '../src/sim/Game';
import { WAVES } from '../src/data/waves';
import { mean, fixedWave, FOUR_RAYS, type Placed } from './pace-helpers';

const N = 200;
const wave1 = (strategy: Strategy, opts: BotOpts = {}) => {
  const out: number[] = [];
  for (let s = 1; s <= N; s++) out.push(playRun(s, strategy, { untilWave: 1, ...opts }).waveStats[0].leaks);
  return out;
};
const raccoons1 = WAVES[0].groups.reduce((n, [, k]) => n + k, 0);

describe('DESIGN.md §7: wave 1', () => {
  it('deploy-all leaks 7 in 10 of the raccoons or fewer (the live well is for defending)', () => {
    expect(mean(wave1('deployAll'))).toBeLessThanOrEqual(0.7 * raccoons1);
  });
  it('sell-all leaks every one', () => {
    expect(mean(wave1('sellAll'))).toBeGreaterThanOrEqual(raccoons1 - 0.5);
  });
  it('one worm on the road\'s midpoint beside the ray cuts leaks by 2 or more', () => {
    // every run starts with a ray, so every seed has the lesson
    const cut = mean(wave1('deployAll', { raySpot: 'mid' })) - mean(wave1('deployAll', { raySpot: 'mid', lureMid: true }));
    expect(cut).toBeGreaterThanOrEqual(2);
  });
});

describe('DESIGN.md §6: where the worm lands', () => {
  /** Wave 1 with only the dawn ray at (19,10) and one worm at (x,12); no line is cast. */
  const worm = (x: number) => {
    const g = new Game(1);
    expect(g.act({ k: 'deploy', slot: 0, x: 19, y: 10 }).ok).toBe(true);
    const ray = g.defenders[0];
    expect(g.act({ k: 'lure', x, y: 12 }).ok).toBe(true);
    g.act({ k: 'call' });
    while (g.wave < 1 || g.phase === 'wave') g.step();
    return { leaks: g.waveStats[0].leaks, hp: g.defenders.includes(ray) ? ray.hp : 0 };
  };
  it('a worm a tile short of the ray stops the wave and spares the ray; beside it, the line wades the ray to death', () => {
    const short = worm(18), beside = worm(19);
    expect(short.leaks).toBeLessThanOrEqual(1);
    expect(short.hp).toBeGreaterThanOrEqual(15);
    expect(beside.hp).toBe(0);
    expect(beside.leaks).toBeGreaterThanOrEqual(short.leaks + 2);
  });
});

describe('DESIGN.md §7: wave 3, the gulls (two flocks of three)', () => {
  const gulls = WAVES[2].groups.reduce((n, [, k]) => n + k, 0);
  it('terrapins don\'t stop them (they fly over): three leak all of them', () => {
    expect(fixedWave(3, [['turtle', 10, 12], ['turtle', 16, 12], ['turtle', 22, 12]]).leaks).toBe(gulls);
  });
  it('rays don\'t stop them (no shock through air): four rays leak all of them', () => {
    expect(fixedWave(3, FOUR_RAYS).leaks).toBe(gulls);
  });
  it('a pufferfish alone kills only the gull that eats it (its flock lands, then flies on): two leak 4 or more', () => {
    expect(fixedWave(3, [['puffer', 4, 11], ['puffer', 14, 11]]).leaks).toBeGreaterThanOrEqual(gulls - 2);
  });
  it('a puffer beside two rays brings a flock down where they shock it: one pair a flock leaks 1 or fewer (measured: none)', () => {
    const pairs: Placed[] = [['puffer', 4, 11], ['ray', 3, 10], ['ray', 5, 10], ['puffer', 14, 11], ['ray', 13, 10], ['ray', 15, 10]];
    expect(fixedWave(3, pairs).leaks).toBeLessThanOrEqual(1);
  });
});

describe('DESIGN.md §7: a terrapin holds the line', () => {
  it('wave 6 past four rays: a terrapin between them cuts leaks by 3 or more (measured: 8 of 18 to 3), but not the bears (they shove it aside: the slick is theirs, below)', () => {
    const without = fixedWave(6, FOUR_RAYS, undefined, 10), withT = fixedWave(6, [...FOUR_RAYS, ['turtle', 16, 12]], undefined, 10);
    expect(without.leaks - withT.leaks).toBeGreaterThanOrEqual(3);
    expect(withT.byBears).toBeGreaterThanOrEqual(8);
  });
});

describe('DESIGN.md §12: a chum slick holds the bears', () => {
  const slick = (x: number, y: number) => (g: Game) => { g.chum++; expect(g.act({ k: 'slick', x, y }).ok).toBe(true); };
  // wave 6's three bears come last, past four rays; the slick goes down before the wave
  const none = fixedWave(6, FOUR_RAYS, undefined, 5);
  it('wave 6 past four rays: without a slick the bears get to the smokehouse (measured: 15 of the 20 crates stolen)', () => {
    expect(none.byBears).toBeGreaterThanOrEqual(8);
  });
  it('a slick two tiles out between the first two rays the bears pass, (9,10), holds all three where the rays shock them: no bear gets a crate (measured: 20 stolen to 5)', () => {
    const between = fixedWave(6, FOUR_RAYS, slick(9, 10), 5);
    expect(between.byBears).toBe(0);
    expect(between.stolen).toBeLessThanOrEqual(none.stolen - 8);
  });
  it('where it lands matters: a tile from the road, (20,11), the passing raccoons eat it and the bears walk on (measured: 15 crates)', () => {
    expect(fixedWave(6, FOUR_RAYS, slick(20, 11), 5).byBears).toBeGreaterThanOrEqual(8);
  });
});
