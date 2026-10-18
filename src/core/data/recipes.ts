/**
 * Receitas do fogão a lenha. A lenha (madeira) é o combustível.
 * Classificação Livre: nada de bebida alcoólica (ver docs/CLASSIFICACAO.md).
 */
export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  /** Ingredientes (id do item → quantidade). */
  ingredients: Record<string, number>;
  /** Lenha gasta no fogão (madeira). */
  wood: number;
  sell: number;
  /** Cor principal do prato (ícone e arte). */
  color: string;
}

export const RECIPES: Recipe[] = [
  { id: 'pamonha', name: 'Pamonha', emoji: '🌽', ingredients: { milho: 2 }, wood: 1, sell: 140, color: '#e8d27a' },
  { id: 'feijao-tropeiro', name: 'Feijão-tropeiro', emoji: '🫘', ingredients: { feijao: 2, couve: 1 }, wood: 1, sell: 170, color: '#9a6a3a' },
  { id: 'mandioca-cozida', name: 'Mandioca cozida', emoji: '🥔', ingredients: { mandioca: 1 }, wood: 1, sell: 150, color: '#f2e6c4' },
  { id: 'doce-de-abobora', name: 'Doce de abóbora', emoji: '🎃', ingredients: { abobora: 1 }, wood: 1, sell: 150, color: '#e07a26' },
  { id: 'pequi-cozido', name: 'Arroz com pequi', emoji: '🟡', ingredients: { pequi: 2 }, wood: 1, sell: 90, color: '#e2c43a' },
  { id: 'doce-de-goiaba', name: 'Goiabada', emoji: '🍐', ingredients: { goiaba: 3 }, wood: 2, sell: 90, color: '#b8323a' },
  { id: 'geleia-de-manga', name: 'Geleia de manga', emoji: '🥭', ingredients: { manga: 3 }, wood: 1, sell: 130, color: '#f0a030' },
  { id: 'suco-de-acerola', name: 'Suco de acerola', emoji: '🍒', ingredients: { acerola: 5 }, wood: 0, sell: 55, color: '#d8402e' },
];

export const RECIPE_BY_ID: Readonly<Record<string, Recipe | undefined>> = Object.freeze(
  Object.assign(Object.create(null), Object.fromEntries(RECIPES.map((r) => [r.id, r]))),
);
