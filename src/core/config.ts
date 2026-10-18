/**
 * Constantes de regra do jogo. `core/` não depende de Phaser, DOM, Capacitor
 * nem Firebase: roda igual no navegador, no app e nos testes (Node).
 */
export const TILE = 32;
export const MAP_W = 40;
export const MAP_H = 30;

/** O dia começa às 6h e termina à meia-noite (em minutos do relógio do jogo). */
export const DAY_START = 6 * 60;
export const DAY_END = 24 * 60;
/** 1080 minutos de jogo / 1.5 = 720 s reais ≈ 12 minutos por dia. */
export const GAME_MINUTES_PER_SECOND = 1.5;

export const SEASON_LENGTH = 28;

/** Altura de referência: 1,80 m ocupa este tanto de pixels no mundo. */
export const PX_PER_180CM = 52;
