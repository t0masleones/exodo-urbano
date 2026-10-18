import type { Season } from './crops';

/**
 * Árvores frutíferas: compradas como muda na van da feira e plantadas na
 * grama. Não precisam de rega (são do cerrado ou bem adaptadas a ele) e nunca
 * morrem. Depois de adultas, dão frutos a cada `cycleDays` na época certa.
 */
export interface TreeDef {
  id: string;
  /** Nome da árvore (mangueira) e da fruta (manga). */
  name: string;
  fruitName: string;
  emoji: string;
  leaf: string;
  fruit: string;
  matureDays: number;
  cycleDays: number;
  seasons: Season[];
  saplingPrice: number;
  fruitPrice: number;
  yield: [number, number];
}

export const TREES: TreeDef[] = [
  { id: 'manga', name: 'Mangueira', fruitName: 'Manga', emoji: '🥭', leaf: '#2f6b35', fruit: '#f0a030', matureDays: 12, cycleDays: 4, seasons: ['chuvas'], saplingPrice: 120, fruitPrice: 30, yield: [3, 5] },
  { id: 'banana', name: 'Bananeira', fruitName: 'Banana', emoji: '🍌', leaf: '#5fae3a', fruit: '#f2d64b', matureDays: 8, cycleDays: 5, seasons: ['chuvas', 'seca'], saplingPrice: 80, fruitPrice: 18, yield: [4, 6] },
  { id: 'acerola', name: 'Aceroleira', fruitName: 'Acerola', emoji: '🍒', leaf: '#3f7a32', fruit: '#d8402e', matureDays: 8, cycleDays: 2, seasons: ['chuvas', 'seca'], saplingPrice: 70, fruitPrice: 8, yield: [4, 7] },
  { id: 'goiaba', name: 'Goiabeira', fruitName: 'Goiaba', emoji: '🍐', leaf: '#4c8c3c', fruit: '#9fc85a', matureDays: 10, cycleDays: 3, seasons: ['chuvas'], saplingPrice: 90, fruitPrice: 15, yield: [3, 5] },
  { id: 'mamao', name: 'Mamoeiro', fruitName: 'Mamão', emoji: '🍈', leaf: '#5a9a3a', fruit: '#f08a24', matureDays: 9, cycleDays: 3, seasons: ['chuvas', 'seca'], saplingPrice: 75, fruitPrice: 20, yield: [2, 3] },
];

export const TREE_BY_ID: Readonly<Record<string, TreeDef | undefined>> = Object.freeze(
  Object.assign(Object.create(null), Object.fromEntries(TREES.map((t) => [t.id, t]))),
);

export function treeDef(id: string): TreeDef {
  const t = TREE_BY_ID[id];
  if (!t) throw new Error(`Árvore desconhecida: ${id}`);
  return t;
}

/** 0 = muda, 1 = adulta, 2 = com frutos */
export const treeStage = (def: TreeDef, days: number, ready: boolean) => (days < def.matureDays ? 0 : ready ? 2 : 1);
