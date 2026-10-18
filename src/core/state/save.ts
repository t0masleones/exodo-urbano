import { DAY_START, TILE } from '../config';
import { PET_IDS, type PetId } from '../data/characters';
import { seedKey } from '../data/items';
import type { BaseMap } from '../world/mapgen';
import { SAVE_SCHEMA, emptyStats, type GameState } from './types';

export function newSaveId(): string {
  return globalThis.crypto.randomUUID();
}

export function newGame(base: BaseMap, appVersion: string, now = Date.now()): GameState {
  const home = base.home;
  return {
    version: SAVE_SCHEMA,
    meta: { id: newSaveId(), revision: 0, syncedRevision: 0, createdAt: now, updatedAt: now, playtimeSec: 0, appVersion },
    day: 1,
    minutes: DAY_START,
    money: 150,
    weather: 'sol',
    active: 'carol',
    humans: {
      carol: { x: home.x * TILE + 16, y: (home.y + 1) * TILE - 8 },
      tomas: { x: (home.x + 2) * TILE + 16, y: (home.y + 1) * TILE - 8 },
    },
    inventory: { [seedKey('milho')]: 6, [seedKey('feijao')]: 6, [seedKey('mandioca')]: 3 },
    tiles: {},
    objects: base.initialObjects.map((o, i) => ({ ...o, id: i + 1 })),
    nextObjectId: base.initialObjects.length + 1,
    affection: Object.fromEntries(PET_IDS.map((id) => [id, { points: 0, lastDay: 0 }])) as Record<PetId, { points: number; lastDay: number }>,
    stats: emptyStats(),
  };
}

/** Um save "intocado" pode ser substituído pelo da nuvem sem perguntar nada. */
export function isPristine(s: GameState): boolean {
  return s.day === 1 && s.meta.playtimeSec < 120 && Object.keys(s.tiles).length === 0;
}
