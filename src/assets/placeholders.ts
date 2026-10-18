import Phaser from 'phaser';
import { TILE } from '../config';
import { CROPS, type CropDef } from '../data/crops';
import { HUMANS, PETS, type AnimalLook, type BodyPart, type PersonLook } from '../data/characters';
import { mulberry32 } from '../util/random';
import { HUMAN_ART, PET_ART } from './manifest';
import { ANIMAL_LAYOUT, PLACEHOLDER_HUMAN, type Dir4 } from './layouts';

/**
 * Arte provisória desenhada por código, em "pixels" de 2×2.
 * Só é gerada para chaves que ainda não foram carregadas de um arquivo,
 * então trocar por arte de verdade não exige mexer aqui.
 */
const U = 2;
type Ctx = CanvasRenderingContext2D;
type Px = (x: number, y: number, w: number, h: number, color: string) => void;

export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function canvas(scene: Phaser.Scene, key: string, w: number, h: number) {
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`Não foi possível criar a textura ${key}`);
  return tex;
}

function pxAt(c: Ctx, ox: number, oy: number, mirrorW?: number): Px {
  return (x, y, w, h, color) => {
    const xx = mirrorW !== undefined ? mirrorW - x - w : x;
    c.fillStyle = color;
    c.fillRect(ox + xx * U, oy + y * U, w * U, h * U);
  };
}

function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

export function generatePlaceholders(scene: Phaser.Scene) {
  const missing = (key: string) => !scene.textures.exists(key);

  if (missing('tiles')) drawTiles(scene);
  for (const def of Object.values(HUMANS)) {
    const art = HUMAN_ART[def.id];
    if (missing(art.key)) drawHumanSheet(scene, art.key, def.look);
  }
  for (const def of Object.values(PETS)) {
    const art = PET_ART[def.id];
    if (missing(art.key)) drawAnimalSheet(scene, art.key, def.look, def.id.length * 977);
  }
  for (const crop of CROPS) if (missing(`crop-${crop.id}`)) drawCropSheet(scene, crop);

  const statics: [string, number, number, (c: Ctx) => void][] = [
    ['casa', 128, 112, drawHouse],
    ['kombi', 64, 48, drawKombi],
    ['caixa', 32, 32, drawCrate],
    ['eucalipto', 32, 80, drawEucalyptus],
    ['pequizeiro', 64, 64, drawPequizeiro],
    ['toco', 32, 32, drawStump],
    ['pedra', 32, 32, drawRock],
    ['cupinzeiro', 32, 48, drawTermiteMound],
    ['pequi', 16, 16, drawPequi],
  ];
  for (const [key, w, h, draw] of statics) {
    if (!missing(key)) continue;
    const t = canvas(scene, key, w, h);
    draw(t.context);
    t.refresh();
  }
}

// ---------------------------------------------------------------- terreno

function drawTiles(scene: Phaser.Scene) {
  const t = canvas(scene, 'tiles', TILE * 9, TILE);
  const c = t.context;
  const r = mulberry32(7);
  const tile = (i: number, base: string, specks: [string, number][]) => {
    c.fillStyle = base;
    c.fillRect(i * TILE, 0, TILE, TILE);
    for (const [col, count] of specks) {
      c.fillStyle = col;
      for (let k = 0; k < count; k++) c.fillRect(i * TILE + Math.floor(r() * 16) * 2, Math.floor(r() * 16) * 2, 2, 2);
    }
  };
  const furrows = (i: number, line: string) => {
    c.fillStyle = line;
    for (let y = 3; y < TILE; y += 8) c.fillRect(i * TILE + 2, y, TILE - 4, 2);
  };
  const grass: [string, number][] = [['#6a9a3e', 40], ['#8fc25a', 25]];
  const dry: [string, number][] = [['#a8964a', 40], ['#d6c878', 25]];
  tile(0, '#7cae4a', grass);
  tile(1, '#7cae4a', [...grass, ['#f2e86d', 4], ['#ffffff', 4], ['#e57ab0', 3]]);
  tile(2, '#c2b25a', dry);
  tile(3, '#c2b25a', [...dry, ['#b06cc8', 4], ['#f0c419', 3]]);
  tile(4, '#c08d5c', [['#a47648', 40], ['#d2a678', 20]]);
  tile(5, '#4a90b8', [['#5aa4cc', 30], ['#3a7aa0', 20]]);
  c.fillStyle = '#9fd2ec';
  c.fillRect(5 * TILE + 6, 10, 8, 2);
  c.fillRect(5 * TILE + 18, 22, 8, 2);
  tile(6, '#a8613d', [['#924f30', 40], ['#bb7450', 20]]);
  tile(7, '#7d4a2e', [['#6d3f26', 20]]);
  furrows(7, '#5e3520');
  tile(8, '#55301c', [['#4a2818', 20], ['#7a5a48', 6]]);
  furrows(8, '#3d2012');
  t.refresh();
}

// ---------------------------------------------------------------- pessoas

function drawHumanSheet(scene: Phaser.Scene, key: string, look: PersonLook) {
  const L = PLACEHOLDER_HUMAN;
  const t = canvas(scene, key, L.frameWidth * L.columns, L.frameHeight * 4);
  (Object.entries(L.rows) as [Dir4, number][]).forEach(([dir, row]) => {
    for (let f = 0; f < L.columns; f++) {
      const ox = f * L.frameWidth, oy = row * L.frameHeight;
      drawPerson(t.context, ox, oy, look, dir, f);
      t.add(row * L.columns + f, 0, ox, oy, L.frameWidth, L.frameHeight);
    }
  });
  t.refresh();
}

function drawPerson(c: Ctx, ox: number, oy: number, L: PersonLook, dir: Dir4, f: number) {
  const p = pxAt(c, ox, oy);
  const ph = f === 0 ? 0 : Math.sin(((f - 1) / 8) * Math.PI * 2);
  const side = dir === 'left' || dir === 'right';
  const tattoosOn = (part: BodyPart, x: number, dy = 0, maxY = 99) => {
    for (const t of L.tattoos) if (t.part === part && t.y + dy < maxY) p(x, t.y + dy, 1, 1, t.color);
  };

  ellipse(c, ox + 16, oy + 45, 8, 2.5, 'rgba(0,0,0,0.22)');

  // pernas (y 15–21)
  const leg = (x: number, lift: number, part: BodyPart, back = false) => {
    const bottom = 21 - lift;
    const pantsEnd = L.shorts ? 17 : bottom;
    p(x, 15, 3, pantsEnd - 15, L.pants);
    if (L.shorts) {
      p(x, 17, 3, bottom - 17, L.skin);
      tattoosOn(part, x + 1, 0, bottom);
    }
    p(x, bottom, 3, 1, L.shoes);
    if (back) p(x, 15, 3, bottom - 14, 'rgba(0,0,0,0.18)');
  };
  if (!side) {
    const lLift = ph > 0.35 ? 1 : 0, rLift = ph < -0.35 ? 1 : 0;
    if (dir === 'down') { leg(5, lLift, 'legR'); leg(8, rLift, 'legL'); }
    else { leg(5, rLift, 'legL'); leg(8, lLift, 'legR'); }
  } else {
    const s = Math.round(ph * 1.5);
    const front: BodyPart = dir === 'left' ? 'legL' : 'legR';
    const back: BodyPart = dir === 'left' ? 'legR' : 'legL';
    leg(6 - s, 0, back, true);
    leg(6 + s, 0, front);
  }

  // tronco
  if (!side) {
    p(4, 7, 8, 8, L.shirt);
    p(4, 14, 8, 1, shade(L.shirt, -0.15));
  } else {
    p(5, 7, 6, 8, L.shirt);
    p(5, 14, 6, 1, shade(L.shirt, -0.15));
  }

  // braços
  const arm = (x: number, dy: number, part: BodyPart) => {
    const top = 7 + dy;
    if (L.sleeves) { p(x, top, 1, 3, L.shirt); p(x, top + 3, 1, 4, L.skin); }
    else p(x, top, 1, 7, L.skin);
    p(x, top + 6, 1, 1, L.skinShade);
    tattoosOn(part, x, dy);
  };
  if (!side) {
    const a = ph > 0.35 ? 1 : 0, b = ph < -0.35 ? 1 : 0;
    if (dir === 'down') { arm(3, b, 'armR'); arm(12, a, 'armL'); }
    else { arm(3, a, 'armL'); arm(12, b, 'armR'); }
  } else {
    arm(7 - Math.round(ph), 0, dir === 'left' ? 'armL' : 'armR');
  }

  // cabeça
  p(7, 6, 2, 1, L.skinShade);
  p(5, 1, 6, 5, L.skin);
  if (dir === 'down') { p(6, 4, 1, 1, '#1b1b1b'); p(9, 4, 1, 1, '#1b1b1b'); p(7, 5, 2, 1, L.skinShade); }
  if (dir === 'left') { p(6, 4, 1, 1, '#1b1b1b'); p(4, 3, 1, 1, L.skin); }
  if (dir === 'right') { p(9, 4, 1, 1, '#1b1b1b'); p(11, 3, 1, 1, L.skin); }

  // cabelo
  const h = L.hair, fade = L.hairFade ?? L.hair;
  if (L.hairStyle === 'degrade') {
    p(5, 0, 6, 2, h);
    p(6, 0, 2, 1, L.hairShine);
    if (dir === 'down') { p(5, 2, 1, 2, fade); p(10, 2, 1, 2, fade); }
    if (dir === 'up') p(5, 2, 6, 3, fade);
    if (dir === 'left') p(8, 2, 3, 3, fade);
    if (dir === 'right') p(5, 2, 3, 3, fade);
  } else {
    p(4, 0, 8, 2, h);
    if (dir === 'down') { p(4, 2, 1, 4, h); p(11, 2, 1, 4, h); p(5, 2, 1, 1, h); p(10, 2, 1, 1, h); }
    if (dir === 'up') p(4, 2, 8, 5, h);
    if (dir === 'left') { p(8, 2, 4, 5, h); p(4, 2, 1, 1, h); }
    if (dir === 'right') { p(4, 2, 4, 5, h); p(11, 2, 1, 1, h); }
    p(6, 0, 1, 1, L.hairShine);
    p(9, 1, 1, 1, L.hairShine);
  }
}

// ---------------------------------------------------------------- animais

function drawAnimalSheet(scene: Phaser.Scene, key: string, look: AnimalLook, seed: number) {
  const L = ANIMAL_LAYOUT;
  const t = canvas(scene, key, L.frameWidth * L.columns, L.frameHeight * 6);
  const rows: [number, 'walk' | 'idle' | 'sleep', 'r' | 'l', number][] = [
    [L.rows.walkR, 'walk', 'r', L.walkFrames], [L.rows.idleR, 'idle', 'r', L.idleFrames], [L.rows.sleepR, 'sleep', 'r', L.sleepFrames],
    [L.rows.walkL, 'walk', 'l', L.walkFrames], [L.rows.idleL, 'idle', 'l', L.idleFrames], [L.rows.sleepL, 'sleep', 'l', L.sleepFrames],
  ];
  for (const [row, mode, facing, n] of rows) {
    for (let f = 0; f < L.columns; f++) {
      const ox = f * L.frameWidth, oy = row * L.frameHeight;
      if (f < n) drawAnimal(t.context, ox, oy, look, mode, f, facing, seed);
      t.add(row * L.columns + f, 0, ox, oy, L.frameWidth, L.frameHeight);
    }
  }
  t.refresh();
}

const BUILDS = {
  normal: { x: 3, y: 4, w: 9, h: 4 },
  robusto: { x: 2, y: 3, w: 10, h: 5 },
  compacto: { x: 4, y: 5, w: 7, h: 4 },
  esguio: { x: 3, y: 5, w: 9, h: 3 },
};

function drawAnimal(c: Ctx, ox: number, oy: number, A: AnimalLook, mode: 'walk' | 'idle' | 'sleep', f: number, facing: 'r' | 'l', seed: number) {
  const p = pxAt(c, ox, oy, facing === 'l' ? 16 : undefined);
  const B = BUILDS[A.build];
  const sleeping = mode === 'sleep';
  const by = sleeping ? 11 - B.h : B.y;
  const legW = A.build === 'robusto' ? 2 : 1;

  ellipse(c, ox + 16, oy + 22, 11, 2, 'rgba(0,0,0,0.22)');

  // rabo
  const wag = mode === 'idle' ? f % 2 : mode === 'walk' ? (f % 2) : 0;
  if (A.tail === 'fino') { p(B.x - 1, by + 1 - wag, 1, 1, A.base); p(B.x - 2, by - wag, 1, 1, A.base); }
  if (A.tail === 'curto') p(B.x - 1, by + 1, 1, 1, A.base);
  if (A.tail === 'gato') {
    if (sleeping) p(B.x - 2, by + B.h - 1, 3, 1, A.base);
    else { p(B.x - 1, by - 3 + wag, 1, 4 - wag, A.base); p(B.x - 2, by - 4 + wag, 1, 1, A.base); }
  }

  // patas
  if (!sleeping) {
    const legTop = B.y + B.h;
    const legH = 11 - legTop;
    const liftA = mode === 'walk' && f === 1 ? 1 : 0;
    const liftB = mode === 'walk' && f === 3 ? 1 : 0;
    const far = shade(A.base, -0.2);
    p(B.x + 2, legTop, legW, legH - liftB, far);
    p(B.x + B.w - 2, legTop, legW, legH - liftA, far);
    p(B.x + 1, legTop, legW, legH - liftA, A.base);
    p(B.x + B.w - 3, legTop, legW, legH - liftB, A.base);
    if (A.marks === 'bullterrier') {
      p(B.x + 1, 10 - liftA, legW, 1, A.patch);
      p(B.x + B.w - 3, 10 - liftB, legW, 1, A.patch);
    }
  }

  // corpo
  const breathe = mode === 'idle' && f === 1 ? 1 : 0;
  p(B.x, by + breathe, B.w, B.h - breathe, A.base);
  p(B.x + 1, by + B.h - 1, B.w - 2, 1, shade(A.base, -0.12));

  // cabeça
  const hx = B.x + B.w - 1;
  const hy = sleeping ? by : by - 2;
  let eye: [number, number] = [hx + 2, hy + 1];
  if (A.head === 'ovo') {
    p(hx, hy, 4, 4, A.base); p(hx + 1, hy - 1, 2, 1, A.base); p(hx + 3, hy + 1, 2, 3, A.base);
    p(hx + 4, hy + 3, 1, 1, A.nose);
  } else if (A.head === 'largo') {
    p(hx, hy - 1, 5, 5, A.base); p(hx + 1, hy + 4, 4, 1, shade(A.base, -0.15));
    p(hx + 4, hy + 1, 1, 1, A.nose);
    eye = [hx + 2, hy];
  } else if (A.head === 'curto') {
    p(hx, hy, 4, 4, A.base); p(hx + 3, hy + 2, 1, 2, shade(A.base, -0.1));
    p(hx + 3, hy + 2, 1, 1, A.nose);
  } else {
    p(hx, hy + 1, 4, 3, A.base);
    p(hx + 3, hy + 2, 1, 1, A.nose);
  }

  // marcas de pelagem
  if (A.marks === 'bullterrier') {
    p(hx + 3, hy + 1, 2, 3, A.patch);
    p(B.x + B.w - 2, by + 1, 2, B.h - 1, A.patch);
    p(hx + 4, hy + 3, 1, 1, A.nose);
  } else if (A.marks === 'liso') {
    p(B.x + B.w - 2, by + 2, 2, B.h - 2, A.patch);
  } else if (A.marks === 'pirata') {
    if (facing === 'r') { p(hx, hy, 3, 3, A.patch); }
    p(B.x + 2, by, 2, 1, A.patch);
  } else if (A.marks === 'escaminha') {
    const r = mulberry32(seed);
    for (let k = 0; k < 16; k++) {
      const onHead = k < 4;
      const x = onHead ? hx + Math.floor(r() * 3) : B.x + Math.floor(r() * B.w);
      const y = onHead ? hy + 1 + Math.floor(r() * 2) : by + Math.floor(r() * B.h);
      p(x, y, 1, 1, k % 3 === 0 ? (A.patch2 ?? A.patch) : A.patch);
    }
  }

  // orelhas
  const earCol = A.marks === 'pirata' ? A.patch : A.base;
  if (A.ear === 'pontuda') { p(hx + 1, hy - 2, 1, 2, A.base); p(hx + 2, hy - 1, 1, 1, A.base); }
  if (A.ear === 'morcego') { p(hx, hy - 2, 1, 2, earCol); p(hx + 2, hy - 2, 1, 2, facing === 'r' ? earCol : A.base); }
  if (A.ear === 'rosa') p(hx + 1, hy - 1, 2, 1, shade(A.base, -0.18));
  if (A.ear === 'gato') { p(hx, hy, 1, 1, A.base); p(hx + 3, hy, 1, 1, A.base); }

  // olho
  if (sleeping) p(eye[0], eye[1], 1, 1, shade(A.base, -0.45));
  else p(eye[0], eye[1], 1, 1, A.eye);
}

// ---------------------------------------------------------------- plantas

function drawCropSheet(scene: Phaser.Scene, crop: CropDef) {
  const t = canvas(scene, `crop-${crop.id}`, 32 * 5, 32);
  for (let s = 0; s < 5; s++) {
    drawCrop(pxAt(t.context, s * 32, 0), crop, s);
    t.add(s, 0, s * 32, 0, 32, 32);
  }
  t.refresh();
}

function drawCrop(p: Px, C: CropDef, stage: number) {
  const leaf = C.leaf, dark = shade(C.leaf, -0.25), light = shade(C.leaf, 0.25);
  if (stage === 0) {
    p(4, 12, 8, 1, '#5e3520');
    p(5, 11, 1, 1, '#e8d48a'); p(9, 11, 1, 1, '#e8d48a'); p(7, 12, 1, 1, '#e8d48a');
    return;
  }
  if (stage === 1) {
    p(7, 10, 1, 3, dark); p(6, 10, 1, 1, leaf); p(8, 9, 1, 1, leaf);
    return;
  }
  const flowers = stage === 3 || (stage === 4 && C.shape !== 'folha' && C.shape !== 'raiz');
  const ripe = stage === 4;
  const big = C.fruitSize === 'grande' ? 3 : C.fruitSize === 'medio' ? 2 : 1;
  switch (C.shape) {
    case 'folha':
      if (stage === 2) { p(5, 9, 6, 4, leaf); p(6, 10, 4, 2, light); }
      else { p(3, 6, 10, 7, dark); p(4, 7, 8, 5, leaf); p(6, 8, 4, 3, light); p(7, 9, 2, 2, C.fruit); }
      break;
    case 'arbusto':
      p(7, 8, 1, 5, dark);
      if (stage === 2) p(5, 7, 6, 4, leaf);
      else { p(4, 5, 8, 7, leaf); p(5, 6, 3, 2, light); }
      if (flowers && !ripe) { p(5, 6, 1, 1, C.flower); p(9, 7, 1, 1, C.flower); p(7, 5, 1, 1, C.flower); }
      if (ripe) { p(5, 8, big, big, C.fruit); p(9, 6, big, big, C.fruit); p(7, 10, big, big, C.fruit); }
      break;
    case 'alto':
      if (stage === 2) { p(7, 6, 2, 7, dark); p(5, 8, 2, 1, leaf); p(9, 7, 2, 1, leaf); }
      else {
        p(7, 2, 2, 11, dark);
        p(4, 6, 3, 1, leaf); p(9, 5, 3, 1, leaf); p(4, 10, 3, 1, leaf); p(9, 9, 3, 1, leaf);
        p(7, 1, 2, 1, C.flower);
        if (ripe) { p(9, 6, 1, 1 + big, C.fruit); p(5, 8, 1, 1 + big, C.fruit); if (big > 1) p(10, 6, 1, 3, '#c9d98a'); }
      }
      break;
    case 'rama':
      if (stage === 2) { p(4, 11, 8, 1, dark); p(4, 10, 2, 1, leaf); p(9, 10, 2, 1, leaf); }
      else {
        p(2, 11, 12, 1, dark); p(3, 9, 3, 2, leaf); p(10, 9, 3, 2, leaf); p(7, 10, 2, 1, light);
        if (flowers && !ripe) { p(6, 9, 1, 1, C.flower); p(11, 8, 1, 1, C.flower); }
        if (ripe) {
          if (big === 3) { p(5, 7, 6, 4, C.fruit); p(6, 8, 2, 1, shade(C.fruit, 0.3)); p(8, 6, 1, 1, dark); }
          else { p(4, 9, 2, 1, C.fruit); p(9, 10, 2, 1, C.fruit); p(7, 9, 1, 2, C.fruit); }
        }
      }
      break;
    case 'raiz':
      if (stage === 2) { p(6, 8, 4, 4, leaf); p(7, 9, 2, 2, light); }
      else { p(5, 5, 6, 7, leaf); p(4, 7, 8, 3, dark); p(6, 6, 2, 2, light); }
      if (ripe) p(6, 11, 4, 2, C.fruit);
      break;
  }
}

// ---------------------------------------------------------------- objetos

function drawHouse(c: Ctx) {
  const p = pxAt(c, 0, 0);
  ellipse(c, 64, 108, 60, 5, 'rgba(0,0,0,0.2)');
  p(4, 24, 56, 30, '#efe6d2');            // paredes
  p(4, 50, 56, 4, '#cdbf9f');             // rodapé
  for (let i = 0; i < 22; i++) p(11 - Math.floor(i / 2), i, 42 + Math.floor(i / 2) * 2, 1, '#b5532e'); // telhado
  p(0, 22, 64, 4, '#9a4424');             // beiral
  for (let y = 3; y < 22; y += 3) p(12 - Math.floor(y / 2), y, 40 + Math.floor(y / 2) * 2, 1, 'rgba(0,0,0,0.12)');
  p(46, 2, 5, 10, '#8a8a8a');             // chaminé do fogão a lenha
  p(45, 1, 7, 2, '#6e6e6e');
  p(28, 36, 8, 18, '#3b6ea5');            // porta
  p(34, 45, 1, 1, '#f2c94c');
  p(10, 32, 10, 9, '#9fd0e8'); p(8, 32, 2, 9, '#4f8a4a'); p(20, 32, 2, 9, '#4f8a4a');
  p(44, 32, 10, 9, '#9fd0e8'); p(42, 32, 2, 9, '#4f8a4a'); p(54, 32, 2, 9, '#4f8a4a');
  p(2, 26, 2, 28, '#7a5228'); p(60, 26, 2, 28, '#7a5228'); // esteios da varanda
}

function drawKombi(c: Ctx) {
  const p = pxAt(c, 0, 0);
  ellipse(c, 32, 45, 28, 3, 'rgba(0,0,0,0.25)');
  p(2, 6, 28, 10, '#f2efe6');
  p(2, 14, 28, 8, '#3a78b5');
  p(4, 8, 6, 5, '#9fd0e8'); p(12, 8, 6, 5, '#9fd0e8'); p(20, 8, 7, 5, '#9fd0e8');
  p(13, 15, 1, 1, '#f2efe6'); p(18, 15, 1, 1, '#f2efe6');
  p(5, 21, 4, 2, '#1d1d1d'); p(23, 21, 4, 2, '#1d1d1d');
  for (let i = 0; i < 7; i++) p(1 + i * 4, 3, 4, 3, i % 2 ? '#f2efe6' : '#d8402e'); // toldo da feira
  p(24, 17, 2, 2, '#f2c94c');
}

function drawCrate(c: Ctx) {
  const p = pxAt(c, 0, 0);
  ellipse(c, 16, 29, 12, 2, 'rgba(0,0,0,0.22)');
  p(2, 4, 12, 10, '#a8743c');
  p(2, 4, 12, 1, '#c8945c');
  p(2, 8, 12, 1, '#7a5228'); p(2, 13, 12, 1, '#7a5228');
  p(2, 4, 1, 10, '#7a5228'); p(13, 4, 1, 10, '#7a5228');
  p(6, 10, 4, 2, '#f2c94c');
}

function drawEucalyptus(c: Ctx) {
  const p = pxAt(c, 0, 0);
  ellipse(c, 16, 77, 10, 2.5, 'rgba(0,0,0,0.22)');
  p(7, 20, 2, 19, '#d9cfc0'); p(7, 26, 1, 4, '#b8a894'); p(8, 33, 1, 3, '#b8a894');
  ellipse(c, 16, 22, 11, 20, '#4d7a5a');
  ellipse(c, 13, 18, 7, 14, '#5e8c6a');
  ellipse(c, 19, 30, 6, 10, '#3f6a4c');
  ellipse(c, 14, 10, 4, 6, '#7aa486');
}

function drawPequizeiro(c: Ctx) {
  const p = pxAt(c, 0, 0);
  ellipse(c, 32, 61, 22, 3, 'rgba(0,0,0,0.22)');
  p(15, 20, 3, 11, '#5a4030'); p(13, 18, 2, 4, '#5a4030'); p(18, 16, 2, 5, '#5a4030'); p(14, 24, 1, 3, '#3e2c20');
  ellipse(c, 32, 26, 28, 16, '#335a26');
  ellipse(c, 24, 22, 14, 10, '#4f7d38');
  ellipse(c, 42, 24, 12, 9, '#3f6b2f');
  ellipse(c, 30, 16, 10, 6, '#5d8c44');
  for (const [x, y] of [[18, 30], [40, 32], [30, 22], [48, 20]]) ellipse(c, x, y, 2.5, 2.5, '#c8c040');
}

function drawStump(c: Ctx) {
  const p = pxAt(c, 0, 0);
  ellipse(c, 16, 28, 10, 2, 'rgba(0,0,0,0.22)');
  p(5, 8, 6, 6, '#8a6440'); p(4, 12, 8, 2, '#7a5430');
  ellipse(c, 16, 17, 6, 2.5, '#c4a070');
  ellipse(c, 16, 17, 2.5, 1, '#9a7a50');
}

function drawRock(c: Ctx) {
  ellipse(c, 16, 26, 11, 3, 'rgba(0,0,0,0.25)');
  ellipse(c, 16, 20, 11, 8, '#7e7e78');
  ellipse(c, 14, 18, 8, 5, '#9a9a92');
  ellipse(c, 12, 16, 3, 2, '#b8b8ae');
}

function drawTermiteMound(c: Ctx) {
  const p = pxAt(c, 0, 0);
  ellipse(c, 16, 45, 12, 3, 'rgba(0,0,0,0.25)');
  p(4, 10, 8, 13, '#b0623a');
  p(5, 5, 6, 6, '#b0623a'); p(6, 2, 4, 4, '#b0623a'); p(7, 1, 2, 2, '#c8794a');
  p(3, 16, 2, 6, '#9a5230'); p(11, 14, 2, 8, '#9a5230');
  p(6, 8, 1, 2, '#c8794a'); p(9, 13, 2, 1, '#c8794a'); p(5, 18, 2, 1, '#8a4628');
}

function drawPequi(c: Ctx) {
  ellipse(c, 8, 13, 5, 1.5, 'rgba(0,0,0,0.25)');
  ellipse(c, 8, 9, 5, 4.5, '#9aa82e');
  ellipse(c, 7, 8, 2, 1.5, '#c8d04a');
}
