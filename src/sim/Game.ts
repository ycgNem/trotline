// The proof of concept's simulation: a lake, a clock, two schools and the rod stations' sonar.
// Pure (no three, no DOM); stepped at 60 Hz by the engine loop, or as fast as a test likes.
// Systems run in a fixed order each tick: clock -> schools -> sonar. Vision (sonar) runs last
// and anything that wants to know whether a fish is seen reads school.seen; nothing else tests fans.
import { DT } from '../engine/time';
import { Rng } from '../engine/rng';
import { EventQueue } from '../engine/events';
import { BandId, POC_STATIONS } from '../data/lake';
import { ROD_STATION, SONAR } from '../data/rigs';
import { POC_SCHOOLS, SchoolDef } from '../data/species';
import { Lake, buildLake, depthAt, hookDepth, northShoreY } from './lake';
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
  /** the first school's count (the perf test's knob); the others keep their own */
  fish?: number;
  schools?: SchoolDef[];
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
  readonly schools: School[];
  readonly sonar: Sonar;

  constructor(o: GameOptions = {}) {
    this.seed = o.seed ?? 1;
    this.rng = new Rng(this.seed);
    this.lake = buildLake();
    this.clock = newClock(o.startMinute ?? 8 * 60);
    this.stations = POC_STATIONS.map((s) => this.placeStation(s.x, s.band, s.sonar));
    this.schools = (o.schools ?? POC_SCHOOLS).map((def, i) =>
      newSchool(def, i === 0 && o.fish !== undefined ? o.fish : def.count, new Rng((this.seed ^ 0x5eed) + i * 7919), this.lake));
    this.sonar = newSonar(this.stations.filter((s) => s.sonar), SONAR);
  }

  /** the first school (bighead carp in the proof of concept) */
  get school(): School {
    return this.schools[0];
  }

  /** seconds of simulated time */
  get time() {
    return this.tick * DT;
  }

  step() {
    clockTick(this.clock, DT);
    for (const s of this.schools) schoolTick(s, this.lake, this.time, DT);
    sonarTick(this.sonar, this.schools, this.time, DT, this.events, this.tick);
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
    const hook = hookDepth(band, bed);
    if (hook === null) throw new Error(`no ${band} band under the rod station at x ${x} (bed ${bed.toFixed(1)} m)`);
    return { x, y, ground: Math.max(0, -depthAt(this.lake, x, y)), facing, band, hookX, hookY, hookDepth: hook, bed, sonar };
  }
}
