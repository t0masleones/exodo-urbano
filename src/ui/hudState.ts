/** Fotografia do jogo que a cena envia ao HUD. O HUD nunca altera o estado direto. */
export interface HudState {
  day: number;
  seasonLabel: string;
  dayInSeason: number;
  clock: string;
  weather: 'sol' | 'chuva';
  money: number;
  activeName: string;
  partnerName: string;
  slots: { key: string; icon: string; label: string; count?: number }[];
  selected: string;
  inventory: { id: string; name: string; emoji: string; count: number; sell: number }[];
  shop: { id: string; name: string; emoji: string; price: number; inSeason: boolean; days: number; regrow?: number }[];
  pets: { id: string; name: string; breed: string; hearts: number; pettedToday: boolean }[];
  humans: { name: string; detail: string }[];
}

export interface Ambient {
  color: string;
  alpha: number;
  rain: boolean;
}
