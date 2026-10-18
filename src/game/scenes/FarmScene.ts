import Phaser from 'phaser';
import { DAY_END, GAME_MINUTES_PER_SECOND, MAP_H, MAP_W, TILE } from '../../core/config';
import { CROPS, CROP_BY_ID, cropDef, cropStage, cropTotalDays } from '../../core/data/crops';
import { HUMANS, HUMAN_IDS, PETS, PET_IDS, type HumanId } from '../../core/data/characters';
import { itemDef, seedKey } from '../../core/data/items';
import type { GameState } from '../../core/state/types';
import { buildDiary, type DiaryEntry } from '../../core/systems/diary';
import { Farm, TOOLS, type SlotKey } from '../../core/systems/farm';
import { ambientLight, dayInSeason, formatClock, seasonLabel } from '../../core/systems/time';
import { pick } from '../../core/util/random';
import type { BaseMap, Interact, Structure } from '../../core/world/mapgen';
import type { TilePos } from '../../core/world/pathfinding';
import type { CommitReason } from '../../services/save/SaveManager';
import type { HudState } from '../../ui/hudState';
import { TILE_INDEX } from '../assets/manifest';
import { getContext, type GameContext } from '../context';
import { Human } from '../entities/Human';
import { Pet } from '../entities/Pet';

const INTRO: DiaryEntry = {
  title: 'Êxodo Urbano',
  author: 'Carol & Tomás',
  lines: [
    'Pedimos demissão no mesmo mês. Vendemos o apartamento, enchemos o carro de cachorro (e uma gata indignada) e viemos pro cerrado.',
    'A terra é vermelha, o céu é enorme e o vizinho mais próximo é uma seriema.',
    'A horta começa no terreiro de terra vermelha perto de casa. Sem pressa: aqui nada morre se a gente esquecer um dia.',
    'Como jogar: toque ou clique para andar e usar a ferramenta escolhida. No teclado: WASD/setas, Espaço para agir, 1–9 para ferramentas, Tab para alternar entre Carol e Tomás.',
  ],
};

export class FarmScene extends Phaser.Scene {
  private ctx!: GameContext;
  private state!: GameState;
  private base!: BaseMap;
  private farm!: Farm;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private blocked = new Uint8Array(MAP_W * MAP_H);
  private objSprites = new Map<number, Phaser.GameObjects.Image>();
  private cropSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private humans!: Record<HumanId, Human>;
  private pets: Pet[] = [];
  private selected: SlotKey = 'tool:enxada';
  private paused = false;
  private sleeping = false;
  private lastHudTick = -1;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('farm');
  }

  private get player() {
    return this.humans[this.state.active];
  }

  private get partner() {
    return this.humans[this.state.active === 'carol' ? 'tomas' : 'carol'];
  }

  isBlocked(tx: number, ty: number) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
    return this.blocked[ty * MAP_W + tx] === 1;
  }

  create() {
    this.ctx = getContext(this);
    this.base = this.ctx.base;
    this.state = this.ctx.saves.current;
    this.farm = new Farm(this.state, this.base);
    this.objSprites.clear();
    this.cropSprites.clear();
    this.pets = [];
    // começa no "tick" atual: autosave só quando o tempo de jogo realmente avança
    this.lastHudTick = Math.floor(this.state.minutes / 10);
    this.sleeping = false;

    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: MAP_W, height: MAP_H });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    this.layer = map.createBlankLayer('ground', tileset)!.setDepth(-10);
    this.refreshAll();

    for (const s of this.base.structures) {
      this.add.image((s.x + s.w / 2) * TILE, (s.y + s.h) * TILE, s.kind)
        .setOrigin(0.5, 1)
        .setDepth((s.y + s.h) * TILE)
        .setInteractive({ useHandCursor: true })
        .setData('structure', s);
    }

    this.humans = Object.fromEntries(HUMAN_IDS.map((id) => {
      const pos = this.state.humans[id];
      return [id, new Human(this, HUMANS[id], pos.x, pos.y, this, this.base.home)];
    })) as Record<HumanId, Human>;
    this.player.controlled = true;

    const home = this.base.home;
    this.pets = PET_IDS.map((id, i) => new Pet(this, PETS[id], (home.x - 1 + i) * TILE + 16, (home.y + 2) * TILE - 8, {
      isBlocked: (x, y) => this.isBlocked(x, y),
      player: () => this.player,
      home,
      roof: this.base.roof,
    }));

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE).setBackgroundColor('#2f4a2a').setRoundPixels(true);
    cam.startFollow(this.player, true, 0.15, 0.15);
    this.applyZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);

    this.setupInput();
    const unsubscribe = this.setupBus();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    });

    this.emitHud();
    this.emitAmbient();
    if (this.state.meta.revision === 0) this.ctx.bus.emit('diary', INTRO);
  }

  override update(_time: number, dt: number) {
    const active = !this.paused && !this.sleeping;
    if (active) {
      this.state.minutes += (dt / 1000) * GAME_MINUTES_PER_SECOND;
      this.state.meta.playtimeSec += dt / 1000;
      this.ctx.wellbeing.tick(dt / 1000);
      if (this.state.minutes >= DAY_END) this.sleep(true);
    }

    let vx = 0, vy = 0;
    if (active) {
      const k = this.keys;
      if (k.A.isDown || k.LEFT.isDown) vx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) vx += 1;
      if (k.W.isDown || k.UP.isDown) vy -= 1;
      if (k.S.isDown || k.DOWN.isDown) vy += 1;
    }
    const pl = this.player;
    const kbMoving = vx !== 0 || vy !== 0;
    if (kbMoving) {
      pl.cancelPath();
      const len = Math.hypot(vx, vy);
      pl.moveFree((vx / len) * pl.speed, (vy / len) * pl.speed, dt);
    }
    if (active) {
      pl.update(dt, kbMoving);
      this.partner.update(dt);
      for (const p of this.pets) p.update(dt);
    }

    const tick = Math.floor(this.state.minutes / 10);
    if (tick !== this.lastHudTick) {
      this.lastHudTick = tick;
      this.emitHud();
      this.emitAmbient();
      if (tick % 6 === 0 && active) this.persist('autosave');
    }
  }

  // ------------------------------------------------------------ mundo

  private applyZoom() {
    const short = Math.min(this.scale.width, this.scale.height);
    const zoom = Phaser.Math.Clamp(Math.floor((short / (10 * TILE)) * 2) / 2, 1, 4);
    this.cameras.main.setZoom(zoom);
  }

  private groundIndex(x: number, y: number) {
    const t = this.farm.tile(x, y);
    if (t?.plowed) return t.watered ? TILE_INDEX.aradoMolhado : TILE_INDEX.arado;
    const g = this.base.ground[y][x];
    if (g === 'trilha') return TILE_INDEX.trilha;
    if (g === 'agua') return TILE_INDEX.agua;
    if (g === 'terra') return TILE_INDEX.terra;
    const flower = this.base.flowers[y][x];
    if (this.farm.season === 'seca') return flower ? TILE_INDEX.gramaSecaFlor : TILE_INDEX.gramaSeca;
    return flower ? TILE_INDEX.gramaFlor : TILE_INDEX.grama;
  }

  private refreshTile(x: number, y: number) {
    this.layer.putTileAt(this.groundIndex(x, y), x, y);
    const key = `${x},${y}`;
    const crop = this.farm.tile(x, y)?.crop;
    let sprite = this.cropSprites.get(key);
    if (!crop) {
      sprite?.destroy();
      this.cropSprites.delete(key);
      return;
    }
    const stage = cropStage(cropDef(crop.id), crop.days);
    const texture = `crop-${crop.id}`;
    if (!sprite) {
      sprite = this.add.sprite(x * TILE + 16, (y + 1) * TILE - 2, texture, stage).setOrigin(0.5, 1);
      sprite.setDepth(sprite.y - 12);
      this.cropSprites.set(key, sprite);
    }
    sprite.setTexture(texture, stage);
  }

  private refreshAll() {
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) this.refreshTile(x, y);
    this.syncObjects();
  }

  private syncObjects() {
    const alive = new Set(this.state.objects.map((o) => o.id));
    for (const [id, img] of this.objSprites) if (!alive.has(id)) { img.destroy(); this.objSprites.delete(id); }
    for (const o of this.state.objects) {
      if (this.objSprites.has(o.id)) continue;
      const img = this.add.image(o.x * TILE + 16, (o.y + 1) * TILE, o.kind).setOrigin(0.5, 1);
      img.setDepth(o.kind === 'pequi' ? o.y * TILE + 4 : (o.y + 1) * TILE);
      img.setInteractive({ useHandCursor: true }).setData('tile', { x: o.x, y: o.y });
      this.objSprites.set(o.id, img);
    }
    this.blocked.fill(0);
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (this.base.ground[y][x] === 'agua') this.blocked[y * MAP_W + x] = 1;
    for (const s of this.base.structures) for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) this.blocked[y * MAP_W + x] = 1;
    for (const o of this.state.objects) if (o.kind !== 'pequi') this.blocked[o.y * MAP_W + o.x] = 1;
  }

  // ------------------------------------------------------------ entrada

  private setupInput() {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as FarmScene['keys'];
    kb.addCapture('SPACE,TAB');
    kb.on('keydown', (ev: KeyboardEvent) => {
      if (this.paused || this.sleeping) return;
      if (ev.code === 'Space' || ev.code === 'KeyE') this.keyboardAct();
      else if (ev.code === 'Tab') this.switchCharacter();
      else if (/^Digit[1-9]$/.test(ev.code)) {
        const slot = this.slots()[Number(ev.code.slice(5)) - 1];
        if (slot) this.select(slot.key);
      }
    });

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.paused || this.sleeping) return;
      const pet = over.find((o): o is Pet => o instanceof Pet);
      if (pet) return this.approachPet(pet);
      if (over.some((o) => o === this.partner)) return this.approachPartner();
      const structure = over.map((o) => o.getData('structure') as Structure | undefined).find(Boolean);
      if (structure) return this.walkAndAct({ x: structure.x + Math.floor(structure.w / 2), y: structure.y + structure.h - 1 });
      const objTile = over.map((o) => o.getData('tile') as TilePos | undefined).find(Boolean);
      const t = objTile ?? { x: Math.floor(p.worldX / TILE), y: Math.floor(p.worldY / TILE) };
      this.tapMarker(t);
      if (this.farm.act(this.selected, t.x, t.y, true)) this.walkAndAct(t);
      else this.player.goToTile(t, this.isBlocked(t.x, t.y));
    });
    this.input.mouse?.disableContextMenu();
  }

  private keyboardAct() {
    const pl = this.player;
    const ft = pl.facingTile;
    const cx = ft.x * TILE + 16, cy = ft.y * TILE + 24;
    const pet = this.pets.find((p) => Phaser.Math.Distance.Between(p.x, p.y, cx, cy) < 26);
    if (pet) return this.petPet(pet);
    if (Phaser.Math.Distance.Between(this.partner.x, this.partner.y, cx, cy) < 26) return this.talk();
    if (!this.doAct(ft)) this.doAct(pl.tile);
  }

  private walkAndAct(t: TilePos) {
    const pl = this.player;
    const me = pl.tile;
    if (Math.abs(me.x - t.x) + Math.abs(me.y - t.y) <= 1) {
      pl.cancelPath();
      pl.faceTile(t);
      this.doAct(t);
      return;
    }
    const ok = pl.goToTile(t, true, () => {
      pl.faceTile(t);
      this.doAct(t);
    });
    if (!ok) this.ctx.bus.emit('toast', 'Não dá pra chegar lá.');
  }

  private doAct(t: TilePos): boolean {
    const res = this.farm.act(this.selected, t.x, t.y);
    if (!res) return false;
    if (res.interact) {
      this.interact(res.interact);
      return true;
    }
    if (res.tileChanged) this.refreshTile(t.x, t.y);
    if (res.objectsChanged) this.syncObjects();
    if (res.hitObject !== undefined) {
      const img = this.objSprites.get(res.hitObject);
      if (img) this.tweens.add({ targets: img, x: img.x + 2, duration: 50, yoyo: true, repeat: 2 });
    }
    if (res.fx) this.floatText(t.x * TILE + 16, t.y * TILE + 4, res.fx);
    if (res.message) this.ctx.bus.emit('toast', res.message);
    this.emitHud();
    return true;
  }

  private interact(kind: Interact) {
    this.ctx.bus.emit('open', kind === 'dormir' ? 'sleep' : kind === 'feira' ? 'shop' : 'sell');
  }

  private approachPet(pet: Pet) {
    if (pet.mode === 'roof') {
      this.ctx.bus.emit('toast', `${pet.def.name} está no telhado, fora de alcance (e ela sabe disso).`);
      return;
    }
    const close = () => Phaser.Math.Distance.Between(this.player.x, this.player.y, pet.x, pet.y) < TILE * 1.7;
    const go = (tries: number) => {
      const ok = this.player.goToTile(pet.tile, true, () => {
        if (close() || tries <= 0) this.petPet(pet);
        else go(tries - 1);
      });
      if (!ok) this.ctx.bus.emit('toast', `Não dá pra chegar até ${pet.def.name} agora.`);
    };
    if (close()) this.petPet(pet);
    else go(2);
  }

  private petPet(pet: Pet) {
    const first = this.farm.pet(pet.def.id);
    pet.react();
    this.floatText(pet.x, pet.y - 24, '❤️');
    this.ctx.bus.emit('toast', `${pick(pet.def.petLines)}${first ? '  ❤️ +1' : ''}`);
    this.emitHud();
  }

  private approachPartner() {
    const partner = this.partner;
    partner.cancelPath();
    this.player.goToTile(partner.tile, true, () => this.talk());
  }

  private talk() {
    const partner = this.partner;
    partner.cancelPath();
    partner.faceTile(this.player.tile);
    this.player.faceTile(partner.tile);
    this.floatText(partner.x, partner.y - 50, '💬');
    this.ctx.bus.emit('toast', `${partner.def.name}: “${pick(partner.def.talk)}”`);
  }

  private switchCharacter() {
    this.player.controlled = false;
    this.player.cancelPath();
    this.state.active = this.state.active === 'carol' ? 'tomas' : 'carol';
    this.player.controlled = true;
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.ctx.bus.emit('toast', `Agora você joga com ${this.player.def.name}.`);
    this.emitHud();
  }

  private select(key: SlotKey) {
    this.selected = key;
    this.emitHud();
  }

  // ------------------------------------------------------------ dia

  private sleep(auto: boolean) {
    if (this.sleeping) return;
    this.sleeping = true;
    const cam = this.cameras.main;
    cam.fadeOut(700, 10, 10, 20);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const report = this.farm.advanceDay();
      if (auto) report.events.unshift('Passou da meia-noite e a gente apagou no sofá com os cachorros em cima. Tudo bem.');
      this.placeAtHome();
      this.refreshAll();
      this.persist('sleep');
      cam.fadeIn(700, 10, 10, 20);
      this.sleeping = false;
      this.emitHud();
      this.emitAmbient();
      this.ctx.bus.emit('diary', buildDiary(this.state, report));
    });
  }

  private placeAtHome() {
    const h = this.base.home;
    this.humans.carol.cancelPath();
    this.humans.tomas.cancelPath();
    this.humans.carol.setPosition(h.x * TILE + 16, (h.y + 1) * TILE - 8);
    this.humans.tomas.setPosition((h.x + 2) * TILE + 16, (h.y + 1) * TILE - 8);
    this.pets.forEach((p, i) => p.placeAt((h.x - 1 + i) * TILE + 16, (h.y + 2) * TILE - 8));
  }

  private persist(reason: CommitReason) {
    for (const id of HUMAN_IDS) this.state.humans[id] = { x: this.humans[id].x, y: this.humans[id].y };
    void this.ctx.saves.commit(this.state, reason);
  }

  // ------------------------------------------------------------ HUD

  private setupBus(): () => void {
    const { bus } = this.ctx;
    const offs = [
      bus.on('ui:select', (key) => this.select(key)),
      bus.on('ui:sleep', () => this.sleep(false)),
      bus.on('ui:switch', () => this.switchCharacter()),
      bus.on('ui:modal', (open) => (this.paused = open)),
      bus.on('ui:buy', (id, qty) => {
        const crop = CROP_BY_ID[id];
        if (crop && this.farm.buy(id, qty)) bus.emit('toast', `Comprou ${qty}× sementes de ${crop.name}.`);
        else bus.emit('toast', 'Dinheiro não dá. Que tal vender umas coisas na caixa?');
        this.emitHud();
      }),
      bus.on('ui:sell', (id, qty) => {
        const earned = this.farm.sell(id, qty);
        if (earned) bus.emit('toast', `Vendeu ${itemDef(id).name}: +R$ ${earned}`);
        this.emitHud();
      }),
      bus.on('app:pause', () => this.persist('pause')),
      // save trocado (novo jogo ou progresso baixado da nuvem): recomeça a cena com ele
      bus.on('save:replaced', () => this.scene.restart()),
    ];
    return () => offs.forEach((off) => off());
  }

  private slots() {
    const tools = TOOLS.map((t) => ({ key: `tool:${t.tool}`, icon: t.icon, label: t.name, count: undefined as number | undefined }));
    const seeds = CROPS.filter((c) => (this.state.inventory[seedKey(c.id)] ?? 0) > 0).map((c) => ({
      key: `seed:${c.id}`,
      icon: c.emoji,
      label: `Sementes de ${c.name}`,
      count: this.state.inventory[seedKey(c.id)],
    }));
    return [...tools, ...seeds];
  }

  private emitHud() {
    const st = this.state;
    const slots = this.slots();
    if (!slots.some((s) => s.key === this.selected)) this.selected = 'tool:maos';
    const season = this.farm.season;
    const hud: HudState = {
      day: st.day,
      seasonLabel: seasonLabel(season),
      dayInSeason: dayInSeason(st.day),
      clock: formatClock(st.minutes),
      weather: st.weather,
      money: st.money,
      activeName: this.player.def.name,
      partnerName: this.partner.def.name,
      slots,
      selected: this.selected,
      inventory: Object.entries(st.inventory)
        .filter(([id]) => !id.startsWith('semente:'))
        .map(([id, count]) => ({ ...itemDef(id), count })),
      shop: CROPS.map((c) => ({
        id: c.id, name: c.name, emoji: c.emoji, price: c.seedPrice,
        inSeason: c.seasons.includes(season), days: cropTotalDays(c), regrow: c.regrowDays,
      })),
      pets: PET_IDS.map((id) => ({
        id, name: PETS[id].name, breed: PETS[id].breed,
        hearts: st.affection[id].points, pettedToday: st.affection[id].lastDay === st.day,
      })),
      humans: HUMAN_IDS.map((id) => ({ name: HUMANS[id].name, detail: `${HUMANS[id].age} anos · ${(HUMANS[id].heightCm / 100).toFixed(2).replace('.', ',')} m` })),
    };
    this.ctx.bus.emit('hud', hud);
  }

  private emitAmbient() {
    this.ctx.bus.emit('ambient', { ...ambientLight(this.state.minutes), rain: this.state.weather === 'chuva' });
  }

  // ------------------------------------------------------------ efeitos

  private floatText(x: number, y: number, text: string) {
    const t = this.add.text(x, y, text, { fontSize: '14px' }).setOrigin(0.5).setDepth(200000).setResolution(3);
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  private tapMarker(t: TilePos) {
    const g = this.add.rectangle(t.x * TILE + 16, t.y * TILE + 16, TILE - 4, TILE - 4).setStrokeStyle(2, 0xffffff, 0.8).setDepth(-5);
    this.tweens.add({ targets: g, alpha: 0, duration: 450, onComplete: () => g.destroy() });
  }
}
