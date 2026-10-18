import { DAY_END, DAY_START, MAP_H, MAP_W, TILE } from '../config';
import { HUMAN_IDS, PET_IDS, type HumanId, type PetId } from '../data/characters';
import { CROP_BY_ID } from '../data/crops';
import { TREE_BY_ID } from '../data/trees';
import { isKnownItem } from '../data/items';
import { migrate } from './migrations';
import { OBJECT_KINDS, SAVE_SCHEMA, type GameState, type ObjectKind, type TileState, type WorldObject } from './types';

/**
 * Validação defensiva de saves. Todo save que vem do disco, da nuvem ou de um
 * arquivo passa por aqui. A regra é: reconstruir o objeto do zero, campo a
 * campo, com limites. Nada do que veio de fora é reaproveitado por referência,
 * então chaves como "__proto__" ou campos extras simplesmente somem.
 */

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const isNum = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const isStr = (v: unknown, max: number, pattern?: RegExp): v is string => typeof v === 'string' && v.length <= max && (!pattern || pattern.test(v));
const own = (o: Json, k: string) => Object.prototype.hasOwnProperty.call(o, k);

const LIMITS = {
  maxDay: 100_000,
  maxMoney: 1_000_000_000,
  maxStack: 1_000_000,
  maxInventoryKeys: 200,
  maxTiles: MAP_W * MAP_H,
  maxObjects: MAP_W * MAP_H,
  maxRevision: 1_000_000_000,
  maxPlaytime: 60 * 60 * 24 * 365 * 20,
};

class Invalid extends Error {}
function check(cond: unknown, what: string): asserts cond {
  if (!cond) throw new Invalid(what);
}

/** Retorna um GameState limpo e válido, ou null (com o motivo em `onError`). */
export function parseSave(input: unknown, onError?: (reason: string) => void): GameState | null {
  try {
    const s = migrate(input);
    check(s, 'versão desconhecida');
    return build(s);
  } catch (e) {
    onError?.(e instanceof Invalid ? e.message : String(e));
    return null;
  }
}

export function parseSaveJson(json: string, onError?: (reason: string) => void): GameState | null {
  try {
    return parseSave(JSON.parse(json), onError);
  } catch {
    onError?.('JSON inválido');
    return null;
  }
}

function build(s: Json): GameState {
  check(s.version === SAVE_SCHEMA, 'version');

  const m = s.meta;
  check(isObj(m), 'meta');
  check(isStr(m.id, 64, /^[A-Za-z0-9-]{8,64}$/), 'meta.id');
  check(isInt(m.revision, 0, LIMITS.maxRevision), 'meta.revision');
  check(isInt(m.syncedRevision, 0, m.revision), 'meta.syncedRevision');
  check(isNum(m.createdAt, 0, 1e14) && isNum(m.updatedAt, 0, 1e14), 'meta.datas');
  check(isNum(m.playtimeSec, 0, LIMITS.maxPlaytime), 'meta.playtimeSec');
  check(isStr(m.appVersion, 32), 'meta.appVersion');

  check(isInt(s.day, 1, LIMITS.maxDay), 'day');
  check(isNum(s.minutes, DAY_START, DAY_END), 'minutes');
  check(isInt(s.money, 0, LIMITS.maxMoney), 'money');
  check(s.weather === 'sol' || s.weather === 'chuva', 'weather');
  check(HUMAN_IDS.includes(s.active as HumanId), 'active');

  const humansIn = s.humans;
  check(isObj(humansIn), 'humans');
  const humans = {} as GameState['humans'];
  for (const id of HUMAN_IDS) {
    const h = humansIn[id];
    check(isObj(h) && isNum(h.x, 0, MAP_W * TILE) && isNum(h.y, 0, MAP_H * TILE), `humans.${id}`);
    humans[id] = { x: h.x, y: h.y };
  }

  const invIn = s.inventory;
  check(isObj(invIn), 'inventory');
  const invKeys = Object.keys(invIn);
  check(invKeys.length <= LIMITS.maxInventoryKeys, 'inventory: itens demais');
  const inventory: Record<string, number> = {};
  for (const k of invKeys) {
    check(isStr(k, 64) && isKnownItem(k), `inventory: item desconhecido`);
    check(isInt(invIn[k], 1, LIMITS.maxStack), `inventory.${k}`);
    inventory[k] = invIn[k] as number;
  }

  const tilesIn = s.tiles;
  check(isObj(tilesIn), 'tiles');
  const tileKeys = Object.keys(tilesIn);
  check(tileKeys.length <= LIMITS.maxTiles, 'tiles: demais');
  const tiles: Record<string, TileState> = {};
  for (const k of tileKeys) {
    const match = /^(\d{1,2}),(\d{1,2})$/.exec(k);
    check(match && Number(match[1]) < MAP_W && Number(match[2]) < MAP_H, 'tiles: chave');
    const t = tilesIn[k];
    check(isObj(t) && typeof t.plowed === 'boolean' && typeof t.watered === 'boolean', `tiles.${k}`);
    const tile: TileState = { plowed: t.plowed, watered: t.watered };
    if (t.crop !== undefined) {
      const c = t.crop;
      check(isObj(c) && isStr(c.id, 32) && own(CROP_BY_ID as Json, c.id) && isNum(c.days, 0, 10_000), `tiles.${k}.crop`);
      check(t.plowed, `tiles.${k}: planta em terra não arada`);
      tile.crop = { id: c.id, days: c.days };
    }
    tiles[k] = tile;
  }

  const objsIn = s.objects;
  check(Array.isArray(objsIn) && objsIn.length <= LIMITS.maxObjects, 'objects');
  const seen = new Set<number>();
  const objects: WorldObject[] = objsIn.map((o, i) => {
    check(isObj(o), `objects[${i}]`);
    check(isInt(o.id, 1, 1e9) && !seen.has(o.id), `objects[${i}].id`);
    check(OBJECT_KINDS.includes(o.kind as ObjectKind), `objects[${i}].kind`);
    check(isInt(o.x, 0, MAP_W - 1) && isInt(o.y, 0, MAP_H - 1) && isInt(o.hp, 0, 999), `objects[${i}].pos`);
    seen.add(o.id);
    const obj: WorldObject = { id: o.id, kind: o.kind as ObjectKind, x: o.x, y: o.y, hp: o.hp };
    if (o.kind === 'frutifera') {
      const t = o.tree;
      check(isObj(t) && isStr(t.id, 32) && own(TREE_BY_ID as Json, t.id) && isInt(t.days, 0, 1e6) && typeof t.ready === 'boolean', `objects[${i}].tree`);
      obj.tree = { id: t.id, days: t.days, ready: t.ready };
    } else {
      check(o.tree === undefined, `objects[${i}].tree`);
    }
    return obj;
  });
  const maxId = objects.reduce((mx, o) => Math.max(mx, o.id), 0);
  check(isInt(s.nextObjectId, maxId + 1, 1e9), 'nextObjectId');

  const affIn = s.affection;
  check(isObj(affIn), 'affection');
  const affection = {} as GameState['affection'];
  for (const id of PET_IDS) {
    const a = affIn[id];
    check(isObj(a) && isInt(a.points, 0, 10) && isInt(a.lastDay, 0, s.day), `affection.${id}`);
    affection[id] = { points: a.points, lastDay: a.lastDay };
  }

  const st = s.stats;
  check(isObj(st), 'stats');
  for (const k of ['colheitas', 'plantios', 'madeira', 'pedras', 'pratos'] as const) check(isInt(st[k], 0, 1e6), `stats.${k}`);
  check(Array.isArray(st.carinhos) && st.carinhos.length <= PET_IDS.length && st.carinhos.every((p) => PET_IDS.includes(p as PetId)), 'stats.carinhos');

  return {
    version: SAVE_SCHEMA,
    meta: {
      id: m.id, revision: m.revision, syncedRevision: m.syncedRevision,
      createdAt: m.createdAt as number, updatedAt: m.updatedAt as number,
      playtimeSec: m.playtimeSec, appVersion: m.appVersion,
    },
    day: s.day,
    minutes: s.minutes,
    money: s.money,
    weather: s.weather,
    active: s.active as HumanId,
    humans,
    inventory,
    tiles,
    objects,
    nextObjectId: s.nextObjectId as number,
    affection,
    stats: {
      colheitas: st.colheitas as number, plantios: st.plantios as number,
      madeira: st.madeira as number, pedras: st.pedras as number, pratos: st.pratos as number,
      carinhos: [...(st.carinhos as PetId[])],
    },
  };
}
