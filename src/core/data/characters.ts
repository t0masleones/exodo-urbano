export type HumanId = 'carol' | 'tomas';
export type PetId = 'ravena' | 'chihiro' | 'kuririn' | 'nix';

export type BodyPart = 'armL' | 'armR' | 'legL' | 'legR';

export interface PersonLook {
  skin: string;
  skinShade: string;
  hair: string;
  hairShine: string;
  hairStyle: 'degrade' | 'cacheado';
  /** Cor da lateral raspada no degradê. */
  hairFade?: string;
  shirt: string;
  sleeves: boolean;
  pants: string;
  shorts: boolean;
  shoes: string;
  /** Tatuagens old school: pontos coloridos em braços/pernas (y em unidades do sprite, 10–20). */
  tattoos: { part: BodyPart; y: number; color: string }[];
}

export interface HumanDef {
  id: HumanId;
  name: string;
  age: number;
  heightCm: number;
  look: PersonLook;
  /** Falas ditas por este personagem quando o outro puxa conversa. */
  talk: string[];
}

export const HUMANS: Record<HumanId, HumanDef> = {
  tomas: {
    id: 'tomas',
    name: 'Tomás',
    age: 30,
    heightCm: 180,
    look: {
      skin: '#e8c3a4', skinShade: '#cfa585',
      hair: '#141414', hairShine: '#2a2a2a', hairStyle: 'degrade', hairFade: '#6b5a50',
      shirt: '#5b7f9e', sleeves: true,
      pants: '#3d4f6b', shorts: false,
      shoes: '#4a3528',
      tattoos: [],
    },
    talk: [
      'Sabe que eu não sinto falta nenhuma de planilha?',
      'Vi um tucano no pequizeiro hoje cedo!',
      'A Ravena achou mais coisa enterrada. Um dia ela acha um tesouro.',
      'Hoje a janta é pamonha, combinado?',
      'Bora sentar na varanda e ver o sol baixar?',
    ],
  },
  carol: {
    id: 'carol',
    name: 'Carol',
    age: 30,
    heightCm: 155,
    look: {
      skin: '#8a5a3b', skinShade: '#734a30',
      hair: '#1e1410', hairShine: '#3a2a20', hairStyle: 'cacheado',
      shirt: '#d98a3a', sleeves: false,
      pants: '#4f6b3a', shorts: true,
      shoes: '#6b3a2a',
      tattoos: [
        { part: 'armL', y: 11, color: '#c8312c' },
        { part: 'armL', y: 13, color: '#1f6f5c' },
        { part: 'armR', y: 10, color: '#1b3a6b' },
        { part: 'armR', y: 12, color: '#c8312c' },
        { part: 'legL', y: 18, color: '#1b3a6b' },
        { part: 'legR', y: 19, color: '#d4a62a' },
      ],
    },
    talk: [
      'Lembra da gente em call às sete da noite? Olha esse céu agora.',
      'Bora fazer um café coado mais tarde?',
      'A Nix tá me julgando de cima do telhado de novo.',
      'Essa terra vermelha nasceu pra dar mandioca.',
      'Tô pensando numa tattoo nova: um pé de pequi, estilo old school.',
    ],
  },
};

export interface AnimalLook {
  base: string;
  patch: string;
  patch2?: string;
  nose: string;
  eye: string;
  ear: 'pontuda' | 'morcego' | 'rosa' | 'gato';
  head: 'ovo' | 'largo' | 'curto' | 'gato';
  tail: 'fino' | 'curto' | 'gato';
  build: 'normal' | 'robusto' | 'compacto' | 'esguio';
  marks: 'bullterrier' | 'liso' | 'pirata' | 'escaminha';
}

export interface PetDef {
  id: PetId;
  name: string;
  species: 'cão' | 'gata';
  breed: string;
  sex: 'F' | 'M';
  /** Escala de exibição relativa ao sprite (porte do animal). */
  scale: number;
  speed: number;
  look: AnimalLook;
  behavior: { follow: number; sleep: number; wanderRadius: number; roof?: boolean };
  petLines: string[];
}

export const PETS: Record<PetId, PetDef> = {
  ravena: {
    id: 'ravena', name: 'Ravena', species: 'cão', breed: 'Bull terrier', sex: 'F', scale: 1.1, speed: 75,
    look: { base: '#8b5a3c', patch: '#f4efe8', nose: '#2a2020', eye: '#1a1a1a', ear: 'pontuda', head: 'ovo', tail: 'fino', build: 'normal', marks: 'bullterrier' },
    behavior: { follow: 0.25, sleep: 0.15, wanderRadius: 9 },
    petLines: ['Ravena gira em círculos de felicidade!', 'Ravena encosta a cabeça de ovo na sua mão.', 'Ravena faz aquela cara de bull terrier que ninguém entende.'],
  },
  chihiro: {
    id: 'chihiro', name: 'Chihiro', species: 'cão', breed: 'American bully XL lilac', sex: 'F', scale: 1.45, speed: 45,
    look: { base: '#a598aa', patch: '#d8d0da', nose: '#7a6a78', eye: '#c9a24a', ear: 'rosa', head: 'largo', tail: 'fino', build: 'robusto', marks: 'liso' },
    behavior: { follow: 0.2, sleep: 0.55, wanderRadius: 4 },
    petLines: ['Chihiro deita de barriga pra cima pedindo mais.', 'Chihiro te dá uma lambida gigante.', 'Chihiro encosta os 50 kg de amor em você.'],
  },
  kuririn: {
    id: 'kuririn', name: 'Kuririn', species: 'cão', breed: 'Bulldog francês pirata', sex: 'M', scale: 0.8, speed: 55,
    look: { base: '#f5f2ec', patch: '#1d1d1d', nose: '#1d1d1d', eye: '#1a1a1a', ear: 'morcego', head: 'curto', tail: 'curto', build: 'compacto', marks: 'pirata' },
    behavior: { follow: 0.65, sleep: 0.2, wanderRadius: 4 },
    petLines: ['Kuririn bufa e abana o rabicho.', 'Kuririn ronca de felicidade (sim, acordado).', 'Kuririn espirra de emoção.'],
  },
  nix: {
    id: 'nix', name: 'Nix', species: 'gata', breed: 'SRD escaminha', sex: 'F', scale: 0.75, speed: 50,
    look: { base: '#1f1915', patch: '#c8702a', patch2: '#e2b36a', nose: '#d08a8a', eye: '#d9b23a', ear: 'gato', head: 'gato', tail: 'gato', build: 'esguio', marks: 'escaminha' },
    behavior: { follow: 0.05, sleep: 0.4, wanderRadius: 5, roof: true },
    petLines: ['Nix aceita o carinho... por exatos 3 segundos.', 'Nix ronrona e se esfrega na sua perna.', 'Nix pisca devagar pra você. É amor.'],
  },
};

export const PET_IDS = Object.keys(PETS) as PetId[];
export const HUMAN_IDS = Object.keys(HUMANS) as HumanId[];
