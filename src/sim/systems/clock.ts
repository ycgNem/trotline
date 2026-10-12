// Time of day and water temperature. One number the HUD always shows (PLAN.md): the surface
// temperature, which lags the sun and swings a little over the day.

export interface Clock {
  /** minutes after midnight, 0..1440 */
  minute: number;
  day: number;
  /** game minutes per real second (2 = a day in 12 minutes) */
  rate: number;
  /** surface water temperature, degrees C */
  waterTemp: number;
}

/**
 * Late-spring Texas reservoir, provisional: the surface sits near 22 C and swings about 1.2 C,
 * warmest around 16:00 (water lags the air by a few hours) and coolest around 04:00.
 */
export const WATER = { base: 22, swing: 1.2, warmestHour: 16 };

export function newClock(startMinute: number): Clock {
  const c: Clock = { minute: startMinute, day: 1, rate: 2, waterTemp: 0 };
  c.waterTemp = waterTempAt(c.minute);
  return c;
}

export function waterTempAt(minute: number): number {
  const h = minute / 60;
  return WATER.base + WATER.swing * Math.cos(((h - WATER.warmestHour) / 24) * Math.PI * 2);
}

export function clockTick(c: Clock, dt: number) {
  c.minute += c.rate * dt;
  while (c.minute >= 1440) {
    c.minute -= 1440;
    c.day++;
  }
  c.waterTemp = waterTempAt(c.minute);
}

/** "07:30" */
export function clockLabel(minute: number): string {
  const m = Math.floor(minute) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
