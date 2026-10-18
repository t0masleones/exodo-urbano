import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/core/state/save';
import { Farm } from '../../src/core/systems/farm';
import { mulberry32 } from '../../src/core/util/random';
import { generateBaseMap } from '../../src/core/world/mapgen';
import { findPath } from '../../src/core/world/pathfinding';

const setup = (seed = 1) => {
  const base = generateBaseMap();
  const state = newGame(base, 'test');
  return { base, state, farm: new Farm(state, base, mulberry32(seed)) };
};
const [X, Y] = [12, 10]; // terreiro de terra perto de casa

describe('cultivo', () => {
  it('ara, planta e gasta uma semente', () => {
    const { farm, state } = setup();
    expect(farm.act('tool:regador', X, Y)).toBeNull();
    expect(farm.act('tool:enxada', X, Y)?.tileChanged).toBe(true);
    expect(farm.act('seed:milho', X, Y)?.tileChanged).toBe(true);
    expect(state.inventory['semente:milho']).toBe(5);
  });

  it('sem água a planta pausa, mas nunca morre', () => {
    const { farm, state } = setup();
    farm.act('tool:enxada', X, Y);
    farm.act('seed:milho', X, Y);
    for (let d = 0; d < 30; d++) {
      for (const t of Object.values(state.tiles)) t.watered = false;
      state.weather = 'sol';
      farm.advanceDay();
      for (const t of Object.values(state.tiles)) t.watered = false; // anula a chuva sorteada
    }
    expect(state.tiles[`${X},${Y}`].crop).toEqual({ id: 'milho', days: expect.any(Number) });
  });

  it('regada todo dia, amadurece e é colhida com qualquer ferramenta', () => {
    const { farm, state } = setup();
    farm.act('tool:enxada', X, Y);
    farm.act('seed:milho', X, Y);
    let harvested = false;
    for (let d = 0; d < 20 && !harvested; d++) {
      farm.act('tool:regador', X, Y);
      farm.advanceDay();
      const r = farm.act('tool:machado', X, Y, true);
      if (r && state.tiles[`${X},${Y}`].crop) {
        harvested = !!farm.act('tool:machado', X, Y)?.message?.startsWith('Colheu');
      }
    }
    expect(harvested).toBe(true);
    expect(state.inventory.milho).toBeGreaterThan(0);
    expect(state.tiles[`${X},${Y}`]).toMatchObject({ plowed: true });
  });

  it('culturas que rebrotam voltam a crescer depois da colheita', () => {
    const { farm, state } = setup();
    farm.act('tool:enxada', X, Y);
    state.inventory['semente:quiabo'] = 1;
    farm.act('seed:quiabo', X, Y);
    state.tiles[`${X},${Y}`].crop!.days = 99;
    farm.act('tool:maos', X, Y);
    expect(state.tiles[`${X},${Y}`].crop?.id).toBe('quiabo');
  });
});

describe('mundo', () => {
  it('pequizeiro é protegido', () => {
    const { farm, state } = setup();
    const tree = state.objects.find((o) => o.kind === 'pequizeiro')!;
    expect(farm.act('tool:machado', tree.x, tree.y)?.message).toContain('protegido');
    expect(state.objects).toContain(tree);
  });

  it('eucalipto vira toco e dá madeira', () => {
    const { farm, state } = setup();
    const tree = state.objects.find((o) => o.kind === 'eucalipto')!;
    for (let i = 0; i < 4; i++) farm.act('tool:machado', tree.x, tree.y);
    expect(state.inventory.madeira).toBe(3);
    expect(farm.objectAt(tree.x, tree.y)?.kind).toBe('toco');
  });

  it('existe caminho da casa até a van da feira', () => {
    const { base } = setup();
    const blocked = (x: number, y: number) => base.ground[y]?.[x] === undefined || base.ground[y][x] === 'agua';
    expect(findPath(blocked, base.home, { x: 19, y: 25 }, false)).not.toBeNull();
  });
});

describe('economia e carinho', () => {
  it('um coração por pet por dia', () => {
    const { farm } = setup();
    expect(farm.pet('kuririn')).toBe(true);
    expect(farm.pet('kuririn')).toBe(false);
  });

  it('recusa compras inválidas vindas da interface', () => {
    const { farm, state } = setup();
    const money = state.money;
    for (const qty of [0, -5, 1.5, Number.NaN, 1_000_000]) expect(farm.buy('milho', qty)).toBe(false);
    expect(farm.buy('constructor', 1)).toBe(false);
    expect(farm.buy('__proto__', 1)).toBe(false);
    expect(state.money).toBe(money);
  });

  it('vende só o que tem', () => {
    const { farm, state } = setup();
    state.inventory.pedra = 2;
    expect(farm.sell('pedra', 10)).toBe(6);
    expect(state.inventory.pedra).toBeUndefined();
    expect(farm.sell('pedra', 1)).toBe(0);
  });
});
