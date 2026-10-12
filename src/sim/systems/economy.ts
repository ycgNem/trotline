// Economy: the worm bed's output, and the run's end when the last crate is gone (DESIGN.md §3, §5).
import type { Game } from '../Game';
import { WORMS } from '../../data/bait';

export function tickEconomy(g: Game, dt: number) {
  if (g.wormBed && g.worms < WORMS.cap) {
    g.wormBedT += dt;
    if (g.wormBedT >= WORMS.period) {
      g.wormBedT -= WORMS.period;
      g.worms++;
      g.events.push({ type: 'worm', tick: g.tick });
    }
  }
  if (g.crates <= 0 && g.carried <= 0) {
    g.phase = 'lost';
    g.events.push({ type: 'lost', tick: g.tick });
  }
}
