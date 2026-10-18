import type Phaser from 'phaser';
import type { Bus } from '../app/events';
import type { BaseMap } from '../core/world/mapgen';
import type { SaveManager } from '../services/save/SaveManager';
import type { PlaytimeGuard } from '../services/wellbeing/PlaytimeGuard';

/** O que as cenas recebem do app (injeção de dependência via registry do Phaser). */
export interface GameContext {
  bus: Bus;
  saves: SaveManager;
  base: BaseMap;
  wellbeing: PlaytimeGuard;
}

const KEY = 'ctx';

export function setContext(game: Phaser.Game, ctx: GameContext) {
  game.registry.set(KEY, ctx);
}

export function getContext(scene: Phaser.Scene): GameContext {
  const ctx = scene.registry.get(KEY) as GameContext | undefined;
  if (!ctx) throw new Error('GameContext ausente: use createGame()');
  return ctx;
}
