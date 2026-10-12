// Save slots in localStorage with versioned migrations (the shape of Sprocket & Sprout's save
// layer, without its game). A save is a plain JSON object with a version `v`; MIGRATIONS[v]
// upgrades a v save to v + 1, in order, before the game reads it. The game decides what goes in
// the payload (from Milestone 1: the seed plus the deltas, never the whole world).

/** Bump when the payload's shape changes, and add the migration from the old version. */
export const SAVE_VERSION = 1;
const PREFIX = 'trotline_save_';
export const MAX_SLOTS = 6;

export interface SaveData {
  v: number;
  /** when it was written (ms since epoch) */
  saved: number;
  /** the run's seed */
  seed: number;
  [k: string]: unknown;
}

export type Migration = (d: any) => any;

/** Ordered migrations: MIGRATIONS[v] upgrades a v save to v + 1 and sets d.v. None yet. */
export const MIGRATIONS: Record<number, Migration> = {};

/** Bring any older save up to SAVE_VERSION; throws on a gap in the chain or a newer save. */
export function migrate(d: any, migrations: Record<number, Migration> = MIGRATIONS, target = SAVE_VERSION): SaveData {
  let v = d.v ?? 1;
  while (v < target) {
    const f = migrations[v];
    if (!f) throw new Error('no migration from v' + v);
    d = f(d);
    if (d.v !== v + 1) throw new Error(`migration from v${v} did not set v${v + 1}`);
    v = d.v;
  }
  if (v > target) throw new Error('save is from a newer version');
  return d as SaveData;
}

/** localStorage when it is there and allowed (private windows and tests may have none). */
export function store(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function writeSave(slot: number, payload: { seed: number; [k: string]: unknown }, s: Storage | null = store()): boolean {
  if (!s) return false;
  try {
    const d: SaveData = { ...payload, v: SAVE_VERSION, saved: Date.now() };
    s.setItem(PREFIX + slot, JSON.stringify(d));
    return true;
  } catch (err) {
    console.error('save failed', err);
    return false;
  }
}

export function readSave(slot: number, s: Storage | null = store()): SaveData | null {
  const raw = s?.getItem(PREFIX + slot);
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw));
  } catch (err) {
    console.error('load failed', err);
    return null;
  }
}

export function deleteSave(slot: number, s: Storage | null = store()) {
  s?.removeItem(PREFIX + slot);
}

export function listSlots(s: Storage | null = store()): number[] {
  const out: number[] = [];
  for (let i = 1; i <= MAX_SLOTS; i++) if (s?.getItem(PREFIX + i)) out.push(i);
  return out;
}
