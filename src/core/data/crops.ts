export type Season = 'chuvas' | 'seca';
export type CropShape = 'folha' | 'arbusto' | 'alto' | 'rama' | 'raiz';

export interface CropDef {
  id: string;
  name: string;
  emoji: string;
  shape: CropShape;
  leaf: string;
  flower: string;
  fruit: string;
  fruitSize: 'pequeno' | 'medio' | 'grande';
  /** Dias em cada fase antes de amadurecer: [semente, broto, crescimento, floração]. 0 pula a fase. */
  stageDays: [number, number, number, number];
  /** Se definido, a planta rebrota e dá nova colheita após N dias. */
  regrowDays?: number;
  /** Estações ideais. Fora delas a planta cresce na metade da velocidade (nunca morre). */
  seasons: Season[];
  seedPrice: number;
  sellPrice: number;
  yield: [number, number];
}

export const STAGE_NAMES = ['Semente', 'Broto', 'Crescendo', 'Florindo', 'Pronto pra colher'] as const;

export const CROPS: CropDef[] = [
  { id: 'milho', name: 'Milho', emoji: '🌽', shape: 'alto', leaf: '#5f9a3a', flower: '#e8d27a', fruit: '#f2c94c', fruitSize: 'medio', stageDays: [1, 2, 3, 2], seasons: ['chuvas'], seedPrice: 20, sellPrice: 45, yield: [1, 2] },
  { id: 'feijao', name: 'Feijão-de-corda', emoji: '🫘', shape: 'rama', leaf: '#4f8a34', flower: '#e7c6f0', fruit: '#9db04a', fruitSize: 'pequeno', stageDays: [1, 1, 2, 2], seasons: ['chuvas'], seedPrice: 15, sellPrice: 30, yield: [2, 3] },
  { id: 'abobora', name: 'Abóbora', emoji: '🎃', shape: 'rama', leaf: '#3f7f2f', flower: '#f5b93a', fruit: '#e07a26', fruitSize: 'grande', stageDays: [1, 3, 3, 3], seasons: ['chuvas'], seedPrice: 30, sellPrice: 90, yield: [1, 1] },
  { id: 'quiabo', name: 'Quiabo', emoji: '🫛', shape: 'alto', leaf: '#4c8c3c', flower: '#f6e7a1', fruit: '#7fbf4a', fruitSize: 'pequeno', stageDays: [1, 2, 2, 1], regrowDays: 2, seasons: ['chuvas'], seedPrice: 25, sellPrice: 18, yield: [2, 3] },
  { id: 'maxixe', name: 'Maxixe', emoji: '🥒', shape: 'rama', leaf: '#4a8a30', flower: '#f2d64b', fruit: '#8fc45a', fruitSize: 'pequeno', stageDays: [1, 1, 2, 1], regrowDays: 2, seasons: ['chuvas'], seedPrice: 20, sellPrice: 15, yield: [2, 3] },
  { id: 'mandioca', name: 'Mandioca', emoji: '🥔', shape: 'raiz', leaf: '#3d7a3a', flower: '#d9d9a0', fruit: '#8a5a3a', fruitSize: 'grande', stageDays: [2, 3, 4, 3], seasons: ['chuvas', 'seca'], seedPrice: 25, sellPrice: 110, yield: [2, 3] },
  { id: 'jilo', name: 'Jiló', emoji: '🫑', shape: 'arbusto', leaf: '#3f7a32', flower: '#d8c4f0', fruit: '#6fae3f', fruitSize: 'medio', stageDays: [1, 2, 2, 2], regrowDays: 3, seasons: ['chuvas', 'seca'], seedPrice: 20, sellPrice: 16, yield: [2, 3] },
  { id: 'pimenta', name: 'Pimenta-de-cheiro', emoji: '🌶️', shape: 'arbusto', leaf: '#3b7a2c', flower: '#ffffff', fruit: '#e6a020', fruitSize: 'pequeno', stageDays: [1, 2, 3, 2], regrowDays: 3, seasons: ['chuvas', 'seca'], seedPrice: 25, sellPrice: 14, yield: [3, 5] },
  { id: 'alface', name: 'Alface', emoji: '🥬', shape: 'folha', leaf: '#8cc65a', flower: '#ffffff', fruit: '#b6e07a', fruitSize: 'medio', stageDays: [1, 1, 2, 0], seasons: ['seca'], seedPrice: 10, sellPrice: 28, yield: [1, 1] },
  { id: 'couve', name: 'Couve', emoji: '🥬', shape: 'folha', leaf: '#3f7f4a', flower: '#ffffff', fruit: '#5a9a5f', fruitSize: 'medio', stageDays: [1, 2, 2, 0], regrowDays: 3, seasons: ['seca'], seedPrice: 15, sellPrice: 20, yield: [1, 2] },
  { id: 'tomate', name: 'Tomate', emoji: '🍅', shape: 'arbusto', leaf: '#4a8a3a', flower: '#f2d64b', fruit: '#d8402e', fruitSize: 'medio', stageDays: [1, 2, 3, 2], regrowDays: 3, seasons: ['seca'], seedPrice: 30, sellPrice: 22, yield: [2, 4] },
  { id: 'cenoura', name: 'Cenoura', emoji: '🥕', shape: 'raiz', leaf: '#5aa040', flower: '#ffffff', fruit: '#f08a24', fruitSize: 'medio', stageDays: [1, 2, 2, 0], seasons: ['seca'], seedPrice: 15, sellPrice: 35, yield: [1, 2] },
];

// Sem protótipo: CROP_BY_ID['constructor'] é undefined (e não a função Object).
export const CROP_BY_ID: Readonly<Record<string, CropDef | undefined>> = Object.freeze(
  Object.assign(Object.create(null), Object.fromEntries(CROPS.map((c) => [c.id, c]))),
);

/** Para ids já validados (vindos do estado do jogo). */
export function cropDef(id: string): CropDef {
  const c = CROP_BY_ID[id];
  if (!c) throw new Error(`Cultura desconhecida: ${id}`);
  return c;
}

export const cropTotalDays = (c: CropDef) => c.stageDays.reduce((a, b) => a + b, 0);

/** 0 semente · 1 broto · 2 crescendo · 3 florindo · 4 maduro */
export function cropStage(c: CropDef, days: number): number {
  if (days >= cropTotalDays(c)) return 4;
  let acc = 0;
  for (let s = 0; s < 4; s++) {
    acc += c.stageDays[s];
    if (days < acc) return s;
  }
  return 4;
}
