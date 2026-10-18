import { describe, expect, it } from 'vitest';
import { ambienceMix } from '../../src/audio/Ambience';
import { CROPS } from '../../src/core/data/crops';
import { RECIPES } from '../../src/core/data/recipes';
import { TREES } from '../../src/core/data/trees';
import { newGame } from '../../src/core/state/save';
import { parseSave } from '../../src/core/state/schema';
import { Farm } from '../../src/core/systems/farm';
import { mulberry32 } from '../../src/core/util/random';
import { generateBaseMap } from '../../src/core/world/mapgen';
import { UI_ICONS, iconSvg } from '../../src/ui/icons';

const setup = () => {
  const base = generateBaseMap();
  const state = newGame(base, 'test');
  return { base, state, farm: new Farm(state, base, mulberry32(3)) };
};
const [X, Y] = [10, 8]; // quintal, grama livre

describe('pomar', () => {
  it('compra muda, planta na grama e a árvore ocupa o tile', () => {
    const { farm, state } = setup();
    expect(farm.buy('muda:manga', 1)).toBe(true);
    expect(state.money).toBe(150 - 120);
    expect(farm.act('muda:manga', X, Y)?.objectsChanged).toBe(true);
    const tree = farm.objectAt(X, Y);
    expect(tree?.kind).toBe('frutifera');
    expect(tree?.tree).toEqual({ id: 'manga', days: 0, ready: false });
    expect(state.inventory['muda:manga']).toBeUndefined();
  });

  it('não planta muda em canteiro arado nem sem ter a muda', () => {
    const { farm } = setup();
    farm.act('tool:enxada', X, Y);
    farm.add('muda:banana', 1);
    expect(farm.act('muda:banana', X, Y)).toBeNull();
    expect(farm.act('muda:acerola', X + 1, Y)?.message).toContain('Acabaram');
  });

  it('cresce sem rega, frutifica na época e é colhida com qualquer ferramenta', () => {
    const { farm, state } = setup();
    farm.add('muda:acerola', 1);
    farm.act('muda:acerola', X, Y);
    for (let d = 0; d < 8; d++) farm.advanceDay();
    const tree = farm.objectAt(X, Y)!;
    expect(tree.tree!.ready).toBe(true);
    expect(farm.act('tool:picareta', X, Y)?.message).toMatch(/^Colheu \d+× Acerola!$/);
    expect(state.inventory.acerola).toBeGreaterThanOrEqual(4);
    expect(tree.tree!.ready).toBe(false);
    expect(farm.act('tool:machado', X, Y)?.message).toContain('Ninguém corta');
    expect(farm.objectAt(X, Y)).toBe(tree);
  });

  it('fora da época a árvore descansa (manga só dá nas chuvas)', () => {
    const { farm, state } = setup();
    state.day = 29; // começo da seca
    farm.add('muda:manga', 1);
    farm.act('muda:manga', X, Y);
    for (let d = 0; d < 20; d++) farm.advanceDay();
    expect(farm.objectAt(X, Y)!.tree!.ready).toBe(false);
  });

  it('o save com árvores passa na validação', () => {
    const { farm, state } = setup();
    farm.add('muda:goiaba', 1);
    farm.act('muda:goiaba', X, Y);
    expect(parseSave(JSON.parse(JSON.stringify(state)))?.objects.some((o) => o.tree?.id === 'goiaba')).toBe(true);
  });
});

describe('fogão a lenha', () => {
  it('cozinha gastando ingredientes e lenha', () => {
    const { farm, state } = setup();
    farm.add('milho', 2);
    farm.add('madeira', 1);
    expect(farm.cook('pamonha')?.message).toContain('Pamonha pronto');
    expect(state.inventory['prato:pamonha']).toBe(1);
    expect(state.inventory.milho).toBeUndefined();
    expect(state.inventory.madeira).toBeUndefined();
    expect(state.stats.pratos).toBe(1);
  });

  it('não cozinha sem lenha e recusa receita inventada', () => {
    const { farm, state } = setup();
    farm.add('milho', 2);
    expect(farm.cook('pamonha')?.message).toContain('Faltam');
    expect(state.inventory.milho).toBe(2);
    expect(farm.cook('bolo-de-ouro')).toBeNull();
    expect(farm.cook('__proto__')).toBeNull();
  });

  it('pratos valem mais que os ingredientes vendidos crus', () => {
    const { farm } = setup();
    for (const r of RECIPES) {
      let raw = 0;
      for (const [id, n] of Object.entries(r.ingredients)) {
        farm.add(id, n);
        raw += farm.sell(id, n);
      }
      expect(r.sell, r.id).toBeGreaterThan(raw);
    }
  });

  it('nenhuma receita usa bebida alcoólica (classificação Livre)', () => {
    expect(RECIPES.map((r) => r.name).join(' ')).not.toMatch(/cacha[cç]a|licor|cerveja|vinho/i);
  });
});

describe('ícones próprios', () => {
  it('existe ícone para toda ferramenta, cultura, semente, muda, fruta, prato e item da interface', () => {
    const ids = [
      ...['maos', 'enxada', 'regador', 'machado', 'picareta'].map((t) => `tool:${t}`),
      ...CROPS.flatMap((c) => [c.id, `seed:${c.id}`, `semente:${c.id}`]),
      ...TREES.flatMap((t) => [t.id, `muda:${t.id}`]),
      ...RECIPES.map((r) => `prato:${r.id}`),
      ...['madeira', 'pedra', 'argila', 'pequi', 'pena', 'osso', 'quartzo', 'moeda'],
      ...UI_ICONS.map((i) => `ui:${i}`),
    ];
    for (const id of ids) {
      const svg = iconSvg(id);
      expect(svg, id).toMatch(/^<svg class="px" viewBox="0 0 12 12"/);
      expect((svg.match(/<rect /g) ?? []).length, id).toBeGreaterThan(4);
    }
  });

  it('ids desconhecidos não injetam nada nem usam emoji', () => {
    expect(iconSvg('<img onerror=x>')).not.toContain('<img');
    expect(iconSvg('tool:maos')).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe('sons ambientes do cerrado', () => {
  it('cigarras no calor do dia, mais fortes na seca, e somem com chuva', () => {
    expect(ambienceMix({ hour: 13, season: 'seca', rain: false }).cicadas).toBe(1);
    expect(ambienceMix({ hour: 13, season: 'chuvas', rain: false }).cicadas).toBeLessThan(1);
    expect(ambienceMix({ hour: 13, season: 'chuvas', rain: true }).cicadas).toBe(0);
    expect(ambienceMix({ hour: 2, season: 'seca', rain: false }).cicadas).toBe(0);
  });

  it('seriema de manhã cedo, grilos à noite, chuva quando chove', () => {
    expect(ambienceMix({ hour: 7, season: 'seca', rain: false }).seriema).toBe(1);
    expect(ambienceMix({ hour: 12, season: 'seca', rain: false }).seriema).toBe(0);
    expect(ambienceMix({ hour: 22, season: 'chuvas', rain: false }).crickets).toBe(1);
    expect(ambienceMix({ hour: 12, season: 'chuvas', rain: false }).crickets).toBe(0);
    expect(ambienceMix({ hour: 12, season: 'chuvas', rain: true }).rain).toBe(1);
  });
});
