import { CROPS } from '../data/crops';
import type { HumanId, PetId } from '../data/characters';
import { ANIMAL_LAYOUT, PLACEHOLDER_HUMAN, type AnimalLayout, type HumanLayout } from './layouts';

/**
 * MANIFESTO DE ARTE — o único lugar que precisa mudar para trocar a arte.
 *
 * Sem `url`: o jogo gera um placeholder por código (custo zero).
 * Com `url`: carrega a imagem de /public. Ex. para usar LPC na Carol:
 *   carol: { key: 'carol', url: 'assets/characters/carol-lpc.png', layout: LPC_HUMAN }
 *
 * Veja docs/ARTE.md para o passo a passo.
 */
export interface HumanArt { key: string; layout: HumanLayout; url?: string }
export interface PetArt { key: string; layout: AnimalLayout; url?: string }
export interface StaticArt { key: string; url?: string; frameWidth?: number; frameHeight?: number }

export const HUMAN_ART: Record<HumanId, HumanArt> = {
  tomas: { key: 'tomas', layout: PLACEHOLDER_HUMAN },
  carol: { key: 'carol', layout: PLACEHOLDER_HUMAN },
};

export const PET_ART: Record<PetId, PetArt> = {
  ravena: { key: 'ravena', layout: ANIMAL_LAYOUT },
  chihiro: { key: 'chihiro', layout: ANIMAL_LAYOUT },
  kuririn: { key: 'kuririn', layout: ANIMAL_LAYOUT },
  nix: { key: 'nix', layout: ANIMAL_LAYOUT },
};

/** Tileset: 9 tiles de 32×32 lado a lado, na ordem de `TILE_INDEX`. */
export const TILE_INDEX = {
  grama: 0,
  gramaFlor: 1,
  gramaSeca: 2,
  gramaSecaFlor: 3,
  trilha: 4,
  agua: 5,
  terra: 6,
  arado: 7,
  aradoMolhado: 8,
} as const;

export const STATIC_ART: StaticArt[] = [
  { key: 'tiles' },
  { key: 'casa' },
  { key: 'kombi' },
  { key: 'caixa' },
  { key: 'eucalipto' },
  { key: 'pequizeiro' },
  { key: 'toco' },
  { key: 'pedra' },
  { key: 'cupinzeiro' },
  { key: 'pequi' },
  // Cada cultura: 5 frames 32×32 (semente, broto, crescendo, florindo, maduro).
  ...CROPS.map((c) => ({ key: `crop-${c.id}`, frameWidth: 32, frameHeight: 32 })),
];
