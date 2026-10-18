import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/core/state/save';
import { parseSave, parseSaveJson } from '../../src/core/state/schema';
import { generateBaseMap } from '../../src/core/world/mapgen';

const base = generateBaseMap();
const fresh = () => JSON.parse(JSON.stringify(newGame(base, 'test'))) as Record<string, any>;

describe('validação de saves', () => {
  it('aceita um save válido e devolve uma cópia limpa', () => {
    const s = fresh();
    const parsed = parseSave(s);
    expect(parsed).toEqual(s);
    expect(parsed).not.toBe(s);
  });

  it('migra o save do protótipo (v1) para o formato atual', () => {
    const s = fresh();
    delete s.meta;
    delete s.stats.pratos;
    s.version = 1;
    const parsed = parseSave(s);
    expect(parsed?.version).toBe(3);
    expect(parsed?.meta.revision).toBe(1);
    expect(parsed?.stats.pratos).toBe(0);
  });

  it('migra v2 (antes do pomar e da cozinha) para v3', () => {
    const s = fresh();
    delete s.stats.pratos;
    s.version = 2;
    expect(parseSave(s)?.stats.pratos).toBe(0);
  });

  it.each([
    ['dinheiro negativo', (s: any) => (s.money = -1)],
    ['dinheiro infinito', (s: any) => (s.money = Number.POSITIVE_INFINITY)],
    ['dia fracionado', (s: any) => (s.day = 1.5)],
    ['item inexistente', (s: any) => (s.inventory.diamante = 1)],
    ['item com nome de protótipo', (s: any) => (s.inventory.constructor = 1)],
    ['quantidade absurda', (s: any) => (s.inventory.madeira = 1e12)],
    ['tile fora do mapa', (s: any) => (s.tiles['99,99'] = { plowed: true, watered: false })],
    ['planta desconhecida', (s: any) => (s.tiles['1,1'] = { plowed: true, watered: false, crop: { id: 'toString', days: 1 } })],
    ['planta sem terra arada', (s: any) => (s.tiles['1,1'] = { plowed: false, watered: false, crop: { id: 'milho', days: 1 } })],
    ['objeto com id repetido', (s: any) => s.objects.push({ ...s.objects[0] })],
    ['tipo de objeto inventado', (s: any) => (s.objects[0].kind = 'tesouro')],
    ['personagem inexistente', (s: any) => (s.active = 'admin')],
    ['carinho acima do máximo', (s: any) => (s.affection.nix.points = 99)],
    ['id de save com caracteres estranhos', (s: any) => (s.meta.id = '<script>alert(1)</script>')],
    ['revisão sincronizada maior que a atual', (s: any) => (s.meta.syncedRevision = s.meta.revision + 1)],
    ['versão desconhecida', (s: any) => (s.version = 99)],
    ['árvore inventada', (s: any) => s.objects.push({ id: 9999, kind: 'frutifera', x: 1, y: 1, hp: 999, tree: { id: 'jabuticaba-magica', days: 1, ready: false } })],
    ['árvore sem dados', (s: any) => s.objects.push({ id: 9999, kind: 'frutifera', x: 1, y: 1, hp: 999 })],
    ['dados de árvore em objeto comum', (s: any) => (s.objects[0].tree = { id: 'manga', days: 1, ready: true })],
    ['prato inventado', (s: any) => (s.inventory['prato:bolo-de-ouro'] = 1)],
    ['muda inventada', (s: any) => (s.inventory['muda:constructor'] = 1)],
  ])('recusa: %s', (_, tamper) => {
    const s = fresh();
    tamper(s);
    expect(parseSave(s)).toBeNull();
  });

  it('descarta campos extras e chaves perigosas sem poluir protótipos', () => {
    const json = JSON.stringify({ ...fresh(), extra: 'ignorado' }).replace('{', '{"__proto__":{"hacked":true},');
    const parsed = parseSaveJson(json) as Record<string, unknown> | null;
    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty('extra');
    expect(({} as Record<string, unknown>).hacked).toBeUndefined();
  });

  it('JSON quebrado não derruba o jogo', () => {
    const reasons: string[] = [];
    expect(parseSaveJson('{"version":2,', (r) => reasons.push(r))).toBeNull();
    expect(reasons).toEqual(['JSON inválido']);
  });
});
