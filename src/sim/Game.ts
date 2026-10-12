// The proof of concept's simulation: a lake, a clock, one school and the rod stations' sonar.
// Pure (no three, no DOM); stepped at 60 Hz by the engine loop, or as fast as a test likes.
// Systems run in a fixed order each tick: clock -> school -> sonar. Vision (sonar) runs last
// and anything that wants to know whether a fish is seen reads school.seen; nothing else tests cones.
import { DT } from '../engine/loop';
import { Rng } from '../engine/rng';
import { EventQueue } from '../engine/events';
import { BandId, POC_STATIONS } from '../data/lake';
import { ROD_STATION, SONAR } from '../data/rigs';
import { BIGHEAD, SchoolDef } from '../data/species';
import { Lake, buildLake, depthAt, holdDepth, northShoreY } from './lake';
import { Clock, clockTick, newClock } from './systems/clock';
import { School, newSchool, schoolTick } from './systems/school';
import { Sonar, newSonar, sonarTick } from './systems/sonar';

export interface Station {
  /** the station's origin (back of the deck, on the bank), m */
  x: number;
  y: number;
  /** the bank's height above the water at the origin (m) */
  ground: number;
  /** which way it faces: radians, 0 = east, PI/2 = south (+y) */
  facing: number;
  band: BandId;
  /** where the line meets the water (under the rod tip) and how deep the hook holds */
  hookX: number;
  hookY: number;
  hookDepth: number;
  /** the bed's depth under the hook */
  bed: number;
  sonar: boolean;
}

export interface GameOptions {
  seed?: number;
  fish?: number;
  school?: SchoolDef;
  /** the clock's start, minutes after midnight */
  startMinute?: number;
}

export class Game {
  readonly seed: number;
  tick = 0;
  readonly rng: Rng;
  readonly lake: Lake;
  readonly events = new EventQueue();
  readonly clock: Clock;
  readonly stations: Station[];
  readonly school: School;
  readonly sonar: Sonar;

  constructor(o: GameOptions = {}) {
    this.seed = o.seed ?? 1;
    this.rng = new Rng(this.seed);
    this.lake = buildLake();
    this.clock = newClock(o.startMinute ?? 8 * 60);
    this.stations = POC_STATIONS.map((s) => this.placeStation(s.x, s.band, s.sonar));
    this.school = newSchool(o.school ?? BIGHEAD, o.fish ?? 500, new Rng(this.seed ^ 0x5eed), this.lake);
    this.sonar = newSonar(this.stations.filter((s) => s.sonar), SONAR);
  }

  /** seconds of simulated time */
  get time() {
    return this.tick * DT;
  }

  step() {
    clockTick(this.clock, DT);
    schoolTick(this.school, this.lake, this.time, DT);
    sonarTick(this.sonar, this.school, this.time, DT, this.events, this.tick);
    this.tick++;
  }

  /** a rod station on the north bluff at x, facing south over the water */
  private placeStation(x: number, band: BandId, sonar: boolean): Station {
    const shore = northShoreY(this.lake, x);
    const y = shore - ROD_STATION.setBack;
    const facing = Math.PI / 2;
    const hookX = x + Math.cos(facing) * ROD_STATION.tipForward;
    const hookY = y + Math.sin(facing) * ROD_STATION.tipForward;
    const bed = depthAt(this.lake, hookX, hookY);
    return { x, y, ground: Math.max(0, -depthAt(this.lake, x, y)), facing, band, hookX, hookY, hookDepth: holdDepth(band, bed), bed, sonar };
  }
}
