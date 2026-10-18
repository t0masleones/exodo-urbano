import { DAY_START, SAVE_KEY, TILE } from '../config';
import { PET_IDS, type PetId } from '../data/characters';
import { seedKey } from '../data/items';
import type { BaseMap } from '../world/mapgen';
import { emptyStats, type GameState } from './types';

export function newGame(base: BaseMap): GameState {
  const home = base.home;
  return {
    version: 1,
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

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameState;
    return data.version === 1 ? data : null;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* modo privado ou storage cheio: o jogo segue sem salvar */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
