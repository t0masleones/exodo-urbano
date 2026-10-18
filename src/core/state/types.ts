import type { HumanId, PetId } from '../data/characters';

/** Versão do formato do save. Mudou o formato? Incremente e escreva a migração em migrations.ts. */
export const SAVE_SCHEMA = 2;

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

export const OBJECT_KINDS = ['eucalipto', 'pequizeiro', 'toco', 'pedra', 'cupinzeiro', 'pequi'] as const;
export type ObjectKind = (typeof OBJECT_KINDS)[number];

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

export const emptyStats = (): DayStats => ({ colheitas: 0, plantios: 0, madeira: 0, pedras: 0, carinhos: [] });
