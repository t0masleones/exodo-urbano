/**
 * Layouts de spritesheet. Toda arte (placeholder gerado, LPC ou encomendada)
 * precisa seguir um destes layouts — é o "contrato" entre arte e código.
 */
export type Dir4 = 'up' | 'left' | 'down' | 'right';

export interface HumanLayout {
  frameWidth: number;
  frameHeight: number;
  /** Colunas por linha na imagem (para calcular o índice do frame). */
  columns: number;
  rows: Record<Dir4, number>;
  idleCol: number;
  walkCols: number[];
  /** Altura do corpo desenhado dentro do frame (usada para escalar 1,80 m vs 1,55 m). */
  bodyHeightPx: number;
  /** Linha (px) dos pés dentro do frame — vira a origem do sprite. */
  feetY: number;
  frameRate: number;
}

/** Placeholder gerado por código: 9 colunas × 4 linhas (cima, esquerda, baixo, direita). */
export const PLACEHOLDER_HUMAN: HumanLayout = {
  frameWidth: 32,
  frameHeight: 48,
  columns: 9,
  rows: { up: 0, left: 1, down: 2, right: 3 },
  idleCol: 0,
  walkCols: [1, 2, 3, 4, 5, 6, 7, 8],
  bodyHeightPx: 44,
  feetY: 45,
  frameRate: 10,
};

/**
 * Spritesheet padrão do Universal LPC Character Generator (64×64, 13 colunas).
 * Linhas 8–11 = caminhada (cima, esquerda, baixo, direita).
 */
export const LPC_HUMAN: HumanLayout = {
  frameWidth: 64,
  frameHeight: 64,
  columns: 13,
  rows: { up: 8, left: 9, down: 10, right: 11 },
  idleCol: 0,
  walkCols: [1, 2, 3, 4, 5, 6, 7, 8],
  bodyHeightPx: 48,
  feetY: 62,
  frameRate: 10,
};

export interface AnimalLayout {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  /** Linhas para o animal virado para a direita (r) e para a esquerda (l). */
  rows: { walkR: number; idleR: number; sleepR: number; walkL: number; idleL: number; sleepL: number };
  walkFrames: number;
  idleFrames: number;
  sleepFrames: number;
  feetY: number;
}

/**
 * Animais: 4 colunas × 6 linhas. Direita e esquerda são desenhadas separadas
 * (não espelhadas) porque o Kuririn tem a mancha preta de um lado só do rosto.
 */
export const ANIMAL_LAYOUT: AnimalLayout = {
  frameWidth: 32,
  frameHeight: 24,
  columns: 4,
  rows: { walkR: 0, idleR: 1, sleepR: 2, walkL: 3, idleL: 4, sleepL: 5 },
  walkFrames: 4,
  idleFrames: 2,
  sleepFrames: 2,
  feetY: 23,
};
