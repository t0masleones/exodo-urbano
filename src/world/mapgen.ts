import { MAP_H, MAP_W, TILE } from '../config';
import type { ObjectKind, WorldObject } from '../state/types';
import { mulberry32 } from '../util/random';

export type Ground = 'grama' | 'trilha' | 'agua' | 'terra';
export type Interact = 'dormir' | 'feira' | 'vender';

export interface Structure {
  kind: 'casa' | 'kombi' | 'caixa';
  /** Pegada bloqueada no grid, em tiles. */
  x: number;
  y: number;
  w: number;
  h: number;
  interact: Interact;
}

export interface BaseMap {
  ground: Ground[][];
  flowers: boolean[][];
  structures: Structure[];
  initialObjects: Omit<WorldObject, 'id'>[];
  /** Tile em frente à porta de casa. */
  home: { x: number; y: number };
  /** Ponto (px) no telhado onde a Nix gosta de deitar. */
  roof: { x: number; y: number };
}

const HP: Record<ObjectKind, number> = { eucalipto: 4, pequizeiro: 999, toco: 2, pedra: 2, cupinzeiro: 3, pequi: 1 };
export const objectHp = (k: ObjectKind) => HP[k];

/**
 * Mapa base determinístico da fazenda (40×30). O estado do jogador é salvo
 * à parte, então o mapa pode ser trocado por um mapa do Tiled no futuro.
 */
export function generateBaseMap(seed = 2026): BaseMap {
  const r = mulberry32(seed);
  const ground: Ground[][] = [];
  const flowers: boolean[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    ground.push(Array<Ground>(MAP_W).fill('grama'));
    flowers.push(Array.from({ length: MAP_W }, () => r() < 0.08));
  }

  // córrego serpenteando no leste
  for (let y = 0; y < MAP_H; y++) {
    const cx = 33 + Math.round(Math.sin(y / 4) * 1.5);
    ground[y][cx] = 'agua';
    ground[y][cx + 1] = 'agua';
  }

  // trilha: porta de casa → sul → leste → kombi na entrada
  for (let y = 7; y <= 20; y++) ground[y][8] = 'trilha';
  for (let x = 8; x <= 19; x++) ground[20][x] = 'trilha';
  for (let y = 20; y <= 25; y++) ground[y][19] = 'trilha';

  // campo de terra vermelha pronto pra horta
  for (let y = 9; y <= 17; y++) for (let x = 11; x <= 22; x++) ground[y][x] = 'terra';

  const structures: Structure[] = [
    { kind: 'casa', x: 6, y: 4, w: 4, h: 3, interact: 'dormir' },
    { kind: 'caixa', x: 11, y: 6, w: 1, h: 1, interact: 'vender' },
    { kind: 'kombi', x: 18, y: 26, w: 2, h: 1, interact: 'feira' },
  ];

  const objects: Omit<WorldObject, 'id'>[] = [];
  const taken = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  const reserved = (x: number, y: number) =>
    (x >= 4 && x <= 13 && y >= 2 && y <= 9) ||        // casa e quintal
    (x >= 10 && x <= 23 && y >= 8 && y <= 18) ||      // horta
    (x >= 16 && x <= 22 && y >= 24) ||                 // entrada / kombi
    ground[y][x] !== 'grama' ||
    [ground[y][x - 1], ground[y][x + 1], ground[y - 1]?.[x], ground[y + 1]?.[x]].includes('trilha');
  const place = (kind: ObjectKind, x: number, y: number) => {
    if (x < 0 || y < 1 || x >= MAP_W || y >= MAP_H || taken.has(key(x, y)) || reserved(x, y)) return false;
    taken.add(key(x, y));
    objects.push({ kind, x, y, hp: HP[kind] });
    return true;
  };

  for (const [x, y] of [[3, 13], [27, 7], [25, 22]]) place('pequizeiro', x, y);
  for (let x = 0; x < MAP_W; x += 2) if (r() < 0.75) place('eucalipto', x + (r() < 0.5 ? 1 : 0), 1);
  for (let y = 3; y < MAP_H; y += 2) if (r() < 0.6) place('eucalipto', 0, y);
  const scatter = (kind: ObjectKind, n: number) => {
    for (let placed = 0, tries = 0; placed < n && tries < 400; tries++) {
      if (place(kind, Math.floor(r() * MAP_W), 2 + Math.floor(r() * (MAP_H - 3)))) placed++;
    }
  };
  scatter('eucalipto', 10);
  scatter('pedra', 14);
  scatter('cupinzeiro', 5);
  scatter('toco', 8);

  return {
    ground,
    flowers,
    structures,
    initialObjects: objects,
    home: { x: 8, y: 8 },
    roof: { x: 8 * TILE, y: 4 * TILE + 6 },
  };
}
