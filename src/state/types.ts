import type { HumanId, PetId } from '../data/characters';

export interface CropState {
  id: string;
  /** Dias de crescimento acumulados (meio dia quando fora de época). */
  days: number;
}

export interface TileState {
  plowed: boolean;
  watered: boolean;
  crop?: CropState;
}

export type ObjectKind = 'eucalipto' | 'pequizeiro' | 'toco' | 'pedra' | 'cupinzeiro' | 'pequi';

export interface WorldObject {
  id: number;
  kind: ObjectKind;
  x: number;
  y: number;
  hp: number;
}

export interface DayStats {
  colheitas: number;
  plantios: number;
  madeira: number;
  pedras: number;
  carinhos: PetId[];
}

export interface GameState {
  version: 1;
  day: number;
  minutes: number;
  money: number;
  weather: 'sol' | 'chuva';
  active: HumanId;
  humans: Record<HumanId, { x: number; y: number }>;
  inventory: Record<string, number>;
  /** Apenas tiles modificados pelo jogador, chave "x,y". */
  tiles: Record<string, TileState>;
  objects: WorldObject[];
  nextObjectId: number;
  affection: Record<PetId, { points: number; lastDay: number }>;
  stats: DayStats;
}

export const emptyStats = (): DayStats => ({ colheitas: 0, plantios: 0, madeira: 0, pedras: 0, carinhos: [] });
