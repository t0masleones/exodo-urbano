import { CROP_BY_ID, type CropDef } from '../core/data/crops';
import { splitItem } from '../core/data/items';
import { RECIPE_BY_ID } from '../core/data/recipes';
import { TREE_BY_ID } from '../core/data/trees';
import { SafeHtml } from './dom';

/**
 * Ícones próprios em pixel art (12×12), desenhados em código e renderizados
 * como SVG nítido em qualquer tela. Substituem os emojis do sistema: mesma
 * aparência em todo aparelho e nenhuma arte de terceiros na interface.
 *
 * Cada grade usa uma letra por pixel ('.' = transparente). Nos moldes,
 * F/f = cor da fruta (clara/escura) e L/l = cor da folha.
 */
const PAL: Record<string, string> = {
  k: '#2b1d14', w: '#fff8e8', g: '#8a8a86', G: '#c4c4bc', d: '#5a5a58',
  b: '#7a5228', B: '#b07c44', n: '#4a3220', s: '#e8c3a4', t: '#b0623a',
  y: '#e0a82a', Y: '#f8e08a', o: '#e07a26', r: '#d8402e', R: '#8e2a20',
  u: '#3b6ea5', U: '#9fd0e8', v: '#5f9a3a', V: '#3f6b2f', p: '#a598aa', h: '#fff7d6',
};

const G: Record<string, string[]> = {
  maos: ['....k.k.....', '...kskskk...', '...ksksksk..', '...kskskskk.', '..kksssssk..', '.ksksssssk..', '.kssssssk...', '..kssssssk..', '...kssssk...', '....kkkk....'],
  enxada: ['........gGg.', '.......gGgg.', '......b.gg..', '.....b...g..', '....b.......', '...b........', '..b.........', '.b..........', 'n...........'],
  regador: ['............', '..uuuuu.....', '.uUUUUUu..u.', '.uUuuuuu.uu.', '.uUuuuuuuu..', '.uuuuuuuu...', '.uuuuuuu....', '..uuuuu.....'],
  machado: ['..gggg......', '.gGGggb.....', '.gGgg.b.....', '..gg..b.....', '......b.....', '......b.....', '......b.....', '......b.....', '......n.....'],
  picareta: ['.gggggggg...', 'gG..b...Gg..', 'g...b....g..', '....b.......', '....b.......', '....b.......', '....b.......', '....n.......'],
  trocar: ['............', '.......u....', '..uuuuuuu...', '.......u....', '............', '....o.......', '...ooooooo..', '....o.......'],
  mochila: ['....bbbb....', '...b....b...', '..BBBBBBBB..', '..BbbbbbbB..', '..BbyybbbB..', '..BbbbbbbB..', '..BBBBBBBB..', '..BbbbbbbB..', '..BBBBBBBB..'],
  pata: ['...nn..nn...', '...nn..nn...', '.nn......nn.', '.nn.nnnn.nn.', '...nnnnnn...', '..nnnnnnnn..', '..nnnnnnnn..', '...nnnnnn...'],
  conta: ['....kkkk....', '...kssssk...', '...kssssk...', '...kssssk...', '....kkkk....', '..kuuuuuuk..', '.kuuuuuuuuk.', '.kuuuuuuuuk.', '.kuuuuuuuuk.'],
  lua: ['....yyyy....', '...yyy......', '..yyy.......', '..yy........', '..yy........', '..yyy.......', '...yyy......', '....yyyy....'],
  telacheia: ['.kkk....kkk.', '.k........k.', '.k........k.', '............', '............', '............', '.k........k.', '.k........k.', '.kkk....kkk.'],
  engrenagem: ['.....gg.....', '..g.gggg.g..', '...gggggg...', '..ggg..ggg..', '.ggg....ggg.', '.ggg....ggg.', '..ggg..ggg..', '...gggggg...', '..g.gggg.g..', '.....gg.....'],
  sol: ['.....y......', '..y..y..y...', '...yyyyy....', '...yYYYy....', '.yyyYYYyyy..', '...yYYYy....', '...yyyyy....', '..y..y..y...', '.....y......'],
  chuva: ['....GGG.....', '..GGGGGGG...', '.GGGGGGGGG..', '.GGGGGGGGG..', '..GGGGGGG...', '............', '..u..u..u...', '.u..u..u....'],
  seca: ['........tt..', '......ttt...', '....ottt....', '...ootto....', '..oooto.....', '..ooot......', '...oo.......', '..b.........', '.b..........'],
  broto: ['............', '...vv..vv...', '..vvv..vvv..', '...vvvvvv...', '.....vv.....', '.....v......', '...nnnnnn...', '..nnnnnnnn..'],
  madeira: ['............', '..bbbbbbbB..', '.bBBBBBBbYB.', '.bbbbbbbbYB.', '.bBBBBBBbBB.', '..bbbbbbbB..'],
  pedra: ['............', '....gggg....', '..ggGGggg...', '.gGGGgggggg.', '.gGgggggggg.', '.ggggggggdg.', '..gggggddd..'],
  argila: ['............', '.....tt.....', '...ttttt....', '..ttottttt..', '..tttttttt..', '.tttttttttt.', '.tttttttttt.'],
  pena: ['..........G.', '.........GG.', '........GwG.', '.......GwG..', '......GwG...', '.....GwG....', '....GwG.....', '...GwG......', '..GG........', '.k..........'],
  osso: ['............', '.ww......ww.', 'wwww....wwww', '.wwwwwwwwww.', '.wwwwwwwwww.', 'wwww....wwww', '.ww......ww.'],
  quartzo: ['.....U......', '....UuU.....', '...UUuUU....', '...UuuuU....', '...UuuuU....', '..UUuuuUU...', '..UuuuuuU...', '...UUUUU....'],
  moeda: ['....yyyy....', '...yYYYYy...', '..yYyyyYYy..', '..yYyYYYYy..', '..yYyyyYYy..', '..yYYYyYYy..', '..yYyyyYYy..', '...yYYYYy...', '....yyyy....'],
  cachorro: ['............', '.nn.........', '.nnnnn......', '.nknnnnnnnn.', '..nnnnnnnnnn', '....nnnnnnnn', '....n.n..n.n', '....n.n..n.n'],
  gato: ['.k.k........', '.kkk........', '.kykk.....k.', '.kkkk....k..', '..kkkkkkkk..', '...kkkkkkk..', '...k.k..k.k.', '...k.k..k.k.'],
  coracao: ['............', '..rr...rr...', '.rrrr.rrrr..', '.rrrrrrrrr..', '.rrrrrrrrr..', '..rrrrrrr...', '...rrrrr....', '....rrr.....', '.....r......'],
  coracaoVazio: ['............', '..GG...GG...', '.G..G.G..G..', '.G...G...G..', '.G.......G..', '..G.....G...', '...G...G....', '....G.G.....', '.....G......'],
  fogao: ['....dd......', '....dd......', '.tttddttttt.', '.tttttttttt.', '.tkkkkkkkkt.', '.tkoyoyokkt.', '.tkkkkkkkkt.', '.tttttttttt.', '.t........t.'],
  milho: ['.......L....', '......YYL...', '.....YYYyL..', '....YYYYyL..', '...YYYYYyL..', '..YYYYYyL...', '..YYYYyL....', '.LYYYyL.....', '.LLYyL......', '..LLL.......'],
  // moldes coloridos pela fruta/folha
  redondo: ['.....l......', '.....lL.....', '...FFFFFF...', '..FFhFFFFF..', '.FFhhFFFFFf.', '.FFhFFFFFFf.', '.FFFFFFFFFf.', '.FFFFFFFFff.', '..FFFFFFff..', '...ffffff...'],
  vagem: ['..........L.', '.........LL.', '........FF..', '.......FFf..', '......FFf...', '.....FFf....', '....FFf.....', '...FFf......', '..FFf.......', '.Ff.........'],
  abobora: ['.....l......', '.....l......', '..FFFlFFFF..', '.FFfFFFfFFF.', 'FFFfFFFfFFFf', 'FFFfFFFfFFFf', 'FFFfFFFfFFFf', '.FFfFFFfFFf.', '..ffffffff..'],
  raiz: ['....L.L.L...', '.....LLL....', '....FFFF....', '....FFFf....', '.....FFf....', '.....FFf....', '......Ff....', '......Ff....', '.......f....'],
  folha: ['............', '...LLLLLL...', '..LLhLLhLL..', '.LLLLhhLLLL.', '.LLhLLLLhLL.', '.LLLLhLLLLL.', '.lLLLLLLLLl.', '..lLLLLLLl..', '...llllll...'],
  banana: ['.........n..', '........Ff..', '.......FFf..', '......FFFf..', '.....FFFf...', '...FFFFf....', '.FFFFFf.....', '.fFFff......', '..ff........'],
  muda: ['............', '....LLLL....', '...LLLLLL...', '..LLLlLLLL..', '...LLlLLL...', '.....b......', '.....b......', '.....b......', '...nnnnnn...', '..nnnnnnnn..'],
  prato: ['............', '............', '...FFFFFF...', '..FFhFFFFF..', '.wwwwwwwwww.', '.Gwwwwwwwww.', '..GwwwwwwG..', '...GGGGGG...'],
};

function darken(hex: string, k = 0.28): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const c = (v: number) => Math.round(v * (1 - k)).toString(16).padStart(2, '0');
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

const cache = new Map<string, string>();

function render(grid: string[], fruit = '#d8402e', leaf = '#5f9a3a'): string {
  const colors: Record<string, string> = { ...PAL, F: fruit, f: darken(fruit), L: leaf, l: darken(leaf) };
  const top = Math.floor((12 - grid.length) / 2);
  let rects = '';
  grid.forEach((row, ry) => {
    const line = row.padEnd(12, '.').slice(0, 12);
    for (let x = 0; x < 12; ) {
      const ch = line[x];
      let w = 1;
      while (x + w < 12 && line[x + w] === ch) w++;
      if (ch !== '.' && colors[ch]) rects += `<rect x="${x}" y="${ry + top}" width="${w}" height="1" fill="${colors[ch]}"/>`;
      x += w;
    }
  });
  return `<svg class="px" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
}

function cropGrid(c: CropDef): [string[], string, string] {
  if (c.id === 'milho') return [G.milho, c.fruit, c.leaf];
  if (c.id === 'abobora') return [G.abobora, c.fruit, c.leaf];
  if (c.shape === 'rama' || c.id === 'quiabo') return [G.vagem, c.fruit, c.leaf];
  if (c.shape === 'raiz') return [G.raiz, c.fruit, c.leaf];
  if (c.shape === 'folha') return [G.folha, c.fruit, c.leaf];
  return [G.redondo, c.fruit, c.leaf];
}

/** SVG do ícone. Aceita ids de interface ("ui:sol"), ferramentas ("tool:enxada"), slots e itens. */
export function iconSvg(id: string): string {
  const hit = cache.get(id);
  if (hit) return hit;
  let out: string;
  const [kind, rest] = splitItem(id);
  const crop = CROP_BY_ID[kind === 'seed' || kind === 'semente' ? rest : id];
  const tree = TREE_BY_ID[kind === 'muda' ? rest : id];
  if (kind === 'ui' || kind === 'tool') out = render(G[rest] ?? G.engrenagem);
  else if (kind === 'muda' && tree) out = render(G.muda, tree.fruit, tree.leaf);
  else if (kind === 'prato') out = render(G.prato, RECIPE_BY_ID[rest]?.color ?? '#e8d27a');
  else if (crop) out = render(...cropGrid(crop));
  else if (tree) out = render(tree.id === 'banana' ? G.banana : G.redondo, tree.fruit, tree.leaf);
  else if (id === 'pequi') out = render(G.redondo, '#9aa82e', '#3f6b2f');
  else out = render(G[id] ?? G.broto);
  cache.set(id, out);
  return out;
}

export const icon = (id: string) => new SafeHtml(iconSvg(id));

/** Todos os ids que a interface usa (para testes e para a galeria). */
export const UI_ICONS = ['trocar', 'mochila', 'pata', 'conta', 'lua', 'telacheia', 'engrenagem', 'sol', 'chuva', 'seca', 'fogao', 'coracao', 'coracaoVazio', 'cachorro', 'gato', 'broto'];
