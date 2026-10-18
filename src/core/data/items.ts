import { CROP_BY_ID } from './crops';
import { RECIPE_BY_ID } from './recipes';
import { TREE_BY_ID, TREES } from './trees';

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  sell: number;
}

const BASE_ITEMS: ItemDef[] = [
  { id: 'madeira', name: 'Madeira (lenha)', emoji: '🪵', sell: 4 },
  { id: 'pedra', name: 'Pedra', emoji: '🪨', sell: 3 },
  { id: 'argila', name: 'Argila de cupinzeiro', emoji: '🟫', sell: 6 },
  { id: 'pequi', name: 'Pequi', emoji: '🟡', sell: 25 },
  { id: 'pena', name: 'Pena de seriema', emoji: '🪶', sell: 2 },
  { id: 'osso', name: 'Osso velho', emoji: '🦴', sell: 1 },
  { id: 'quartzo', name: 'Cristal de quartzo', emoji: '💎', sell: 60 },
  { id: 'moeda', name: 'Moeda antiga de cruzeiro', emoji: '🪙', sell: 40 },
  ...TREES.map((t) => ({ id: t.id, name: t.fruitName, emoji: t.emoji, sell: t.fruitPrice })),
];

// Sem protótipo: "constructor" ou "__proto__" nunca viram item por acidente.
const BY_ID: Readonly<Record<string, ItemDef>> = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(BASE_ITEMS.map((i) => [i.id, i]))));

export const seedKey = (cropId: string) => `semente:${cropId}`;
export const saplingKey = (treeId: string) => `muda:${treeId}`;
export const dishKey = (recipeId: string) => `prato:${recipeId}`;

/** Separa "semente:milho" em ["semente", "milho"]; itens simples têm prefixo vazio. */
export function splitItem(id: string): [string, string] {
  const i = id.indexOf(':');
  return i < 0 ? ['', id] : [id.slice(0, i), id.slice(i + 1)];
}

/** Item que o jogo conhece (usado para validar saves vindos do disco ou da nuvem). */
export function isKnownItem(id: string): boolean {
  const [kind, rest] = splitItem(id);
  if (kind === 'semente') return rest in CROP_BY_ID;
  if (kind === 'muda') return rest in TREE_BY_ID;
  if (kind === 'prato') return rest in RECIPE_BY_ID;
  return kind === '' && (id in CROP_BY_ID || id in BY_ID);
}

export function itemDef(id: string): ItemDef {
  const [kind, rest] = splitItem(id);
  if (kind === 'semente') {
    const c = CROP_BY_ID[rest];
    if (c) return { id, name: `Sementes de ${c.name}`, emoji: '🌱', sell: Math.floor(c.seedPrice / 2) };
  }
  if (kind === 'muda') {
    const t = TREE_BY_ID[rest];
    if (t) return { id, name: `Muda de ${t.name.toLowerCase()}`, emoji: '🌳', sell: Math.floor(t.saplingPrice / 2) };
  }
  if (kind === 'prato') {
    const r = RECIPE_BY_ID[rest];
    if (r) return { id, name: r.name, emoji: r.emoji, sell: r.sell };
  }
  const crop = CROP_BY_ID[id];
  if (crop) return { id, name: crop.name, emoji: crop.emoji, sell: crop.sellPrice };
  return BY_ID[id] ?? { id, name: id, emoji: '❔', sell: 0 };
}
