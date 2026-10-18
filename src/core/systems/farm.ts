import { DAY_START, MAP_H, MAP_W } from '../config';
import { CROP_BY_ID, cropDef, cropStage, cropTotalDays, type CropDef, type Season } from '../data/crops';
import type { PetId } from '../data/characters';
import { itemDef, seedKey } from '../data/items';
import { emptyStats, type DayStats, type GameState, type ObjectKind, type TileState, type WorldObject } from '../state/types';
import { objectHp, type BaseMap, type Interact, type Structure } from '../world/mapgen';
import { pickWeighted, randInt } from '../util/random';
import { seasonOf } from './time';

export type Tool = 'maos' | 'enxada' | 'regador' | 'machado' | 'picareta';

export const TOOLS: { tool: Tool; name: string; icon: string }[] = [
  { tool: 'maos', name: 'Mãos', icon: '🖐️' },
  { tool: 'enxada', name: 'Enxada', icon: '🪏' },
  { tool: 'regador', name: 'Regador', icon: '💧' },
  { tool: 'machado', name: 'Machado', icon: '🪓' },
  { tool: 'picareta', name: 'Picareta', icon: '⛏️' },
];

/** "tool:enxada" ou "seed:milho" */
export type SlotKey = string;

export interface ActResult {
  message?: string;
  /** Emoji que sobe do tile como feedback. */
  fx?: string;
  interact?: Interact;
  tileChanged?: boolean;
  objectsChanged?: boolean;
  hitObject?: number;
}

export interface DayReport {
  events: string[];
  prev: DayStats;
}

/** Limite de compra por clique: protege contra valores absurdos vindos da interface. */
const MAX_BUY = 99;

/** Regras da fazenda. Não conhece Phaser: só lê e altera o GameState. */
export class Farm {
  constructor(
    public state: GameState,
    public base: BaseMap,
    private random: () => number = Math.random,
  ) {}

  get season(): Season {
    return seasonOf(this.state.day);
  }

  tile(x: number, y: number): TileState | undefined {
    return this.state.tiles[`${x},${y}`];
  }

  private ensureTile(x: number, y: number): TileState {
    return (this.state.tiles[`${x},${y}`] ??= { plowed: false, watered: false });
  }

  objectAt(x: number, y: number): WorldObject | undefined {
    return this.state.objects.find((o) => o.x === x && o.y === y);
  }

  structureAt(x: number, y: number): Structure | undefined {
    return this.base.structures.find((s) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h);
  }

  ground(x: number, y: number) {
    return this.base.ground[y]?.[x];
  }

  canPlow(x: number, y: number) {
    const g = this.ground(x, y);
    return (g === 'grama' || g === 'terra') && !this.objectAt(x, y) && !this.structureAt(x, y);
  }

  add(id: string, n: number) {
    const inv = this.state.inventory;
    inv[id] = (inv[id] ?? 0) + n;
    if (inv[id] <= 0) delete inv[id];
  }

  /**
   * Tenta agir no tile com o slot selecionado. Com `dry`, só responde se há
   * algo a fazer (sem alterar nada). null = nada a fazer ali.
   */
  act(slot: SlotKey, x: number, y: number, dry = false): ActResult | null {
    const s = this.structureAt(x, y);
    if (s) return { interact: s.interact };

    const t = this.tile(x, y);
    if (t?.crop) {
      const def = cropDef(t.crop.id);
      if (cropStage(def, t.crop.days) === 4) return dry ? {} : this.harvest(t, def);
    }

    const o = this.objectAt(x, y);
    if (o) return this.actObject(slot, o, dry);

    const [kind, id] = slot.split(':');
    if (kind === 'tool') {
      if (id === 'enxada' && this.canPlow(x, y) && !t?.plowed) {
        if (dry) return {};
        this.ensureTile(x, y).plowed = true;
        return { tileChanged: true, fx: '🟫' };
      }
      if (id === 'regador') {
        if (t?.plowed && !t.watered) {
          if (dry) return {};
          t.watered = true;
          return { tileChanged: true, fx: '💧' };
        }
        if (this.ground(x, y) === 'agua') return dry ? {} : { message: 'Regador cheio com água do córrego.', fx: '💦' };
      }
      return null;
    }

    const def = CROP_BY_ID[id];
    if (kind !== 'seed' || !def) return null;
    if (t?.plowed && !t.crop) {
      if (dry) return {};
      if ((this.state.inventory[seedKey(id)] ?? 0) <= 0) return { message: `Acabaram as sementes de ${def.name}. A van da feira tem mais!` };
      this.add(seedKey(id), -1);
      t.crop = { id, days: 0 };
      this.state.stats.plantios++;
      const offSeason = !def.seasons.includes(this.season);
      return { tileChanged: true, fx: '🌱', message: offSeason ? `${def.name} fora de época: cresce mais devagar, mas cresce.` : undefined };
    }
    if (!t?.plowed && this.canPlow(x, y)) return dry ? {} : { message: 'Prepare a terra com a enxada primeiro 🪏' };
    return null;
  }

  private harvest(t: TileState, def: CropDef): ActResult {
    const n = randInt(def.yield[0], def.yield[1], this.random);
    this.add(def.id, n);
    this.state.stats.colheitas += n;
    if (def.regrowDays) t.crop!.days = cropTotalDays(def) - def.regrowDays;
    else delete t.crop;
    return { tileChanged: true, fx: def.emoji, message: `Colheu ${n}× ${def.name}!` };
  }

  private actObject(slot: SlotKey, o: WorldObject, dry: boolean): ActResult {
    if (dry) return {};
    const tool = slot.startsWith('tool:') ? slot.slice(5) : '';
    if (o.kind === 'pequi') {
      this.removeObject(o.id);
      this.add('pequi', 1);
      return { objectsChanged: true, fx: '🟡', message: 'Pequi! Roer com cuidado, que tem espinho 😄' };
    }
    if (o.kind === 'pequizeiro') {
      if (tool === 'machado') return { message: 'Pequizeiro é nativo e protegido. Na seca ele dá pequi!' };
      return { message: this.season === 'seca' ? 'Os pequis caem sozinhos quando ficam maduros.' : 'O pequi chega na seca. Por enquanto, sombra fresca.' };
    }
    const needs: Tool = o.kind === 'eucalipto' || o.kind === 'toco' ? 'machado' : 'picareta';
    if (tool !== needs) return { message: needs === 'machado' ? 'Isso pede o machado 🪓' : 'Isso pede a picareta ⛏️' };

    o.hp--;
    if (o.hp > 0) return { hitObject: o.id, fx: needs === 'machado' ? '🪓' : '⛏️' };

    this.removeObject(o.id);
    const drops: Record<Exclude<ObjectKind, 'pequi' | 'pequizeiro'>, [string, number]> = {
      eucalipto: ['madeira', 3],
      toco: ['madeira', 1],
      pedra: ['pedra', 2],
      cupinzeiro: ['argila', 2],
    };
    const [item, n] = drops[o.kind];
    this.add(item, n);
    if (item === 'madeira') this.state.stats.madeira += n;
    else this.state.stats.pedras += n;
    if (o.kind === 'eucalipto') this.addObject('toco', o.x, o.y);
    return { objectsChanged: true, fx: '✨', message: `+${n} ${itemDef(item).name}` };
  }

  private addObject(kind: ObjectKind, x: number, y: number) {
    this.state.objects.push({ id: this.state.nextObjectId++, kind, x, y, hp: objectHp(kind) });
  }

  private removeObject(id: number) {
    this.state.objects = this.state.objects.filter((o) => o.id !== id);
  }

  /** Carinho no pet: conta um coração por dia. */
  pet(id: PetId): boolean {
    const a = this.state.affection[id];
    if (a.lastDay === this.state.day) return false;
    a.lastDay = this.state.day;
    a.points = Math.min(10, a.points + 1);
    this.state.stats.carinhos.push(id);
    return true;
  }

  buy(cropId: string, qty: number): boolean {
    const crop = CROP_BY_ID[cropId];
    if (!crop || !Number.isInteger(qty) || qty < 1 || qty > MAX_BUY) return false;
    const cost = crop.seedPrice * qty;
    if (this.state.money < cost) return false;
    this.state.money -= cost;
    this.add(seedKey(cropId), qty);
    return true;
  }

  sell(itemId: string, qty: number) {
    if (!Number.isInteger(qty) || qty < 1) return 0;
    const have = this.state.inventory[itemId] ?? 0;
    const n = Math.min(have, qty);
    if (n <= 0) return 0;
    this.add(itemId, -n);
    const earned = itemDef(itemId).sell * n;
    this.state.money += earned;
    return earned;
  }

  /** Vira o dia: as plantas regadas crescem. Nada morre, nada se perde. */
  advanceDay(): DayReport {
    const st = this.state;
    const r = this.random;
    const prev = st.stats;
    const oldSeason = this.season;
    const events: string[] = [];

    for (const t of Object.values(st.tiles)) {
      if (t.crop && t.watered) {
        const def = cropDef(t.crop.id);
        t.crop.days += def.seasons.includes(oldSeason) ? 1 : 0.5;
      }
      t.watered = false;
    }

    st.day++;
    st.minutes = DAY_START;
    const season = this.season;
    if (season !== oldSeason) {
      events.push(season === 'chuvas'
        ? 'As chuvas chegaram! A terra vermelha cheira a molhado.'
        : 'Começou a seca. Os ipês vão florir e o céu fica alaranjado no fim da tarde.');
    }

    st.weather = r() < (season === 'chuvas' ? 0.55 : 0.05) ? 'chuva' : 'sol';
    if (st.weather === 'chuva') for (const t of Object.values(st.tiles)) if (t.plowed) t.watered = true;

    if (r() < 0.35) {
      const found = pickWeighted<string>([['osso', 4], ['pedra', 3], ['quartzo', 1], ['moeda', 1]], r);
      this.add(found, 1);
      const d = itemDef(found);
      events.push(`Ravena cavou perto da cerca e trouxe: ${d.emoji} ${d.name}.`);
    }
    if (r() < 0.25) {
      this.add('pena', 1);
      events.push('Nix deixou um "presente" na porta: uma pena de seriema. Que honra.');
    }

    if (season === 'seca') {
      let dropped = 0;
      for (const tree of st.objects.filter((o) => o.kind === 'pequizeiro')) {
        if (r() > 0.45) continue;
        const spots = [[1, 0], [-1, 0], [0, 1], [1, 1], [-1, 1]].map(([dx, dy]) => [tree.x + dx, tree.y + dy]);
        const nearby = spots.filter(([x, y]) => this.objectAt(x, y)?.kind === 'pequi').length;
        const free = spots.find(([x, y]) => this.isFreeGrass(x, y));
        if (nearby < 3 && free) { this.addObject('pequi', free[0], free[1]); dropped++; }
      }
      if (dropped) events.push('Caiu pequi! Dá pra ver as bolinhas verdes debaixo dos pequizeiros.');
    }

    if (r() < 0.5) {
      for (let tries = 0; tries < 40; tries++) {
        const x = Math.floor(r() * MAP_W), y = 2 + Math.floor(r() * (MAP_H - 3));
        const nearHouse = x >= 4 && x <= 13 && y >= 2 && y <= 9;
        if (!nearHouse && this.isFreeGrass(x, y)) { this.addObject(r() < 0.5 ? 'pedra' : 'toco', x, y); break; }
      }
    }

    st.stats = emptyStats();
    return { events, prev };
  }

  private isFreeGrass(x: number, y: number) {
    return this.ground(x, y) === 'grama' && !this.objectAt(x, y) && !this.structureAt(x, y) && !this.tile(x, y)?.plowed;
  }
}
