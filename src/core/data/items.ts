import { CROP_BY_ID } from './crops';

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  sell: number;
}

const BASE_ITEMS: ItemDef[] = [
  { id: 'madeira', name: 'Madeira', emoji: '🪵', sell: 4 },
  { id: 'pedra', name: 'Pedra', emoji: '🪨', sell: 3 },
  { id: 'argila', name: 'Argila de cupinzeiro', emoji: '🟫', sell: 6 },
  { id: 'pequi', name: 'Pequi', emoji: '🟡', sell: 25 },
  { id: 'pena', name: 'Pena de seriema', emoji: '🪶', sell: 2 },
  { id: 'osso', name: 'Osso velho', emoji: '🦴', sell: 1 },
  { id: 'quartzo', name: 'Cristal de quartzo', emoji: '💎', sell: 60 },
  { id: 'moeda', name: 'Moeda antiga de cruzeiro', emoji: '🪙', sell: 40 },
];

// Sem protótipo: "constructor" ou "__proto__" nunca viram item por acidente.
const BY_ID: Readonly<Record<string, ItemDef>> = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(BASE_ITEMS.map((i) => [i.id, i]))));

export const seedKey = (cropId: string) => `semente:${cropId}`;

/** Item que o jogo conhece (usado para validar saves vindos do disco ou da nuvem). */
export function isKnownItem(id: string): boolean {
  if (id.startsWith('semente:')) return id.slice(8) in CROP_BY_ID;
  return id in CROP_BY_ID || id in BY_ID;
}

export function itemDef(id: string): ItemDef {
  if (id.startsWith('semente:')) {
    const c = CROP_BY_ID[id.slice(8)];
    if (c) return { id, name: `Sementes de ${c.name}`, emoji: '🌱', sell: Math.floor(c.seedPrice / 2) };
  }
  const crop = CROP_BY_ID[id];
  if (crop) return { id, name: crop.name, emoji: crop.emoji, sell: crop.sellPrice };
  return BY_ID[id] ?? { id, name: id, emoji: '❔', sell: 0 };
}
