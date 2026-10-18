/** Fotografia do jogo que a cena envia ao HUD. O HUD nunca altera o estado direto. */
export interface HudState {
  day: number;
  season: 'chuvas' | 'seca';
  seasonLabel: string;
  dayInSeason: number;
  clock: string;
  weather: 'sol' | 'chuva';
  money: number;
  activeName: string;
  partnerName: string;
  /** key = "tool:enxada" | "seed:milho" | "muda:manga" (também é o id do ícone) */
  slots: { key: string; label: string; count?: number }[];
  selected: string;
  inventory: { id: string; name: string; count: number; sell: number }[];
  shop: ShopEntry[];
  recipes: RecipeEntry[];
  pets: { id: string; name: string; breed: string; hearts: number; pettedToday: boolean }[];
  humans: { name: string; detail: string }[];
}

export interface ShopEntry {
  /** "semente:milho" ou "muda:manga" */
  key: string;
  kind: 'semente' | 'muda';
  name: string;
  price: number;
  inSeason: boolean;
  info: string;
}

export interface RecipeEntry {
  id: string;
  name: string;
  sell: number;
  ingredients: { id: string; name: string; need: number; have: number }[];
  canCook: boolean;
}

export interface Ambient {
  color: string;
  alpha: number;
  rain: boolean;
  /** Hora do jogo (0–24) e estação, usadas também pelos sons ambientes. */
  hour: number;
  season: 'chuvas' | 'seca';
}
