import Phaser from 'phaser';
import { PX_PER_180CM } from '../config';
import { HUMAN_ART } from '../assets/manifest';
import type { Dir4 } from '../assets/layouts';
import type { HumanDef } from '../data/characters';
import type { TilePos } from '../world/pathfinding';
import { Walker, type WorldQuery } from './Walker';

/** Carol ou Tomás. Quem não está sendo controlado vira NPC com rotina leve. */
export class Human extends Walker {
  facing: Dir4 = 'down';
  controlled = false;
  private aiTimer = 2000;

  constructor(scene: Phaser.Scene, public def: HumanDef, x: number, y: number, world: WorldQuery, private home: TilePos) {
    const art = HUMAN_ART[def.id];
    super(scene, x, y, art.key, world);
    const L = art.layout;
    this.setOrigin(0.5, L.feetY / L.frameHeight);
    // a diferença de altura (1,80 m × 1,55 m) vem daqui
    this.setScale(((def.heightCm / 180) * PX_PER_180CM) / L.bodyHeightPx);
    this.speed = 90;
    this.setInteractive({ useHandCursor: true });
  }

  protected onDirection(dx: number, dy: number) {
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }

  faceTile(t: TilePos) {
    const me = this.tile;
    if (t.x !== me.x || t.y !== me.y) this.onDirection(t.x - me.x, t.y - me.y);
  }

  /** Tile logo à frente (usado pelo teclado). */
  get facingTile(): TilePos {
    const t = this.tile;
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.facing];
    return { x: t.x + d[0], y: t.y + d[1] };
  }

  update(dt: number, keyboardMoving = false) {
    let walking = keyboardMoving;
    if (!keyboardMoving) walking = this.stepPath(dt);
    if (!this.controlled && !walking) this.think(dt);
    this.play(`${this.texture.key}-${walking ? 'walk' : 'idle'}-${this.facing}`, true);
    this.setDepth(this.y);
    this.moving = walking;
  }

  private think(dt: number) {
    this.aiTimer -= dt;
    if (this.aiTimer > 0) return;
    this.aiTimer = Phaser.Math.Between(3000, 8000);
    if (Math.random() < 0.55) {
      this.facing = Phaser.Utils.Array.GetRandom(['up', 'down', 'left', 'right'] as Dir4[]);
      return;
    }
    const target = { x: this.home.x + Phaser.Math.Between(-5, 9), y: this.home.y + Phaser.Math.Between(-1, 7) };
    this.goToTile(target, false);
  }
}
