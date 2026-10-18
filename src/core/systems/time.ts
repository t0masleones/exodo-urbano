import { SEASON_LENGTH } from '../config';
import type { Season } from '../data/crops';

/** O jogo começa em outubro, início das chuvas no cerrado. */
export const seasonOf = (day: number): Season => (Math.floor((day - 1) / SEASON_LENGTH) % 2 === 0 ? 'chuvas' : 'seca');

export const dayInSeason = (day: number) => ((day - 1) % SEASON_LENGTH) + 1;

export const seasonLabel = (s: Season) => (s === 'chuvas' ? '🌧️ Chuvas' : '🌵 Seca');

export function formatClock(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60 / 10) * 10;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Cor e opacidade do filtro de luz conforme a hora (amanhecer, pôr do sol, noite). */
export function ambientLight(minutes: number): { color: string; alpha: number } {
  const h = minutes / 60;
  if (h < 7) return { color: '255,170,90', alpha: 0.18 * (7 - h) };
  if (h < 17) return { color: '255,255,255', alpha: 0 };
  if (h < 18.5) return { color: '255,140,60', alpha: 0.2 * ((h - 17) / 1.5) };
  if (h < 20) return { color: '120,70,110', alpha: 0.2 + 0.2 * ((h - 18.5) / 1.5) };
  return { color: '20,30,70', alpha: Math.min(0.55, 0.4 + 0.05 * (h - 20)) };
}
