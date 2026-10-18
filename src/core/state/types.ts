import type { HumanId, PetId } from '../data/characters';

/** Versão do formato do save. Mudou o formato? Incremente e escreva a migração em migrations.ts. */
export const SAVE_SCHEMA = 3;

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

export const OBJECT_KINDS = ['eucalipto', 'pequizeiro', 'toco', 'pedra', 'cupinzeiro', 'pequi', 'frutifera'] as const;
export type ObjectKind = (typeof OBJECT_KINDS)[number];

export interface WorldObject {
  id: number;
  kind: ObjectKind;
  x: number;
  y: number;
  hp: number;
  /** Só para kind "frutifera": qual árvore, dias desde o plantio e se há frutos. */
  tree?: TreeState;
}

export interface TreeState {
  id: string;
  days: number;
  ready: boolean;
}

export interface DayStats {
  colheitas: number;
  plantios: number;
  madeira: number;
  pedras: number;
  pratos: number;
  carinhos: PetId[];
}

/** Metadados usados pela sincronização com a nuvem. */
export interface SaveMeta {
  /** Identidade desta "linhagem" de save (gerada no novo jogo). */
  id: string;
  /** Incrementa a cada salvamento local. */
  revision: number;
  /** Revisão confirmada na nuvem no último sync (0 = nunca sincronizou). */
  syncedRevision: number;
  createdAt: number;
  updatedAt: number;
  playtimeSec: number;
  appVersion: string;
}

export interface GameState {
  version: typeof SAVE_SCHEMA;
  meta: SaveMeta;
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

export const emptyStats = (): DayStats => ({ colheitas: 0, plantios: 0, madeira: 0, pedras: 0, pratos: 0, carinhos: [] });
