import Phaser from 'phaser';
import { TILE } from '../config';
import { findPath, type TilePos } from '../world/pathfinding';

export interface WorldQuery {
  isBlocked(tx: number, ty: number): boolean;
}

/** Tudo que anda pelo grid: segue caminhos do BFS ou move livre (teclado). */
export abstract class Walker extends Phaser.GameObjects.Sprite {
  protected path: Phaser.Math.Vector2[] = [];
  private onArrive?: () => void;
  speed = 80;
  moving = false;

  constructor(scene: Phaser.Scene, x: number, y: number, key: string, protected world: WorldQuery) {
    super(scene, x, y, key, 0);
    scene.add.existing(this);
  }

  get tile(): TilePos {
    return { x: Math.floor(this.x / TILE), y: Math.floor((this.y - 2) / TILE) };
  }

  goToTile(target: TilePos, adjacent: boolean, onArrive?: () => void): boolean {
    const p = findPath((x, y) => this.world.isBlocked(x, y), this.tile, target, adjacent);
    if (!p) return false;
    this.path = p.map((t) => new Phaser.Math.Vector2(t.x * TILE + TILE / 2, t.y * TILE + TILE - 8));
    this.onArrive = onArrive;
    if (!this.path.length) this.arrive();
    return true;
  }

  cancelPath() {
    this.path = [];
    this.onArrive = undefined;
  }

  get hasPath() {
    return this.path.length > 0;
  }

  private arrive() {
    const cb = this.onArrive;
    this.onArrive = undefined;
    cb?.();
  }

  /** Avança no caminho. Retorna true enquanto está andando. */
  protected stepPath(dt: number): boolean {
    const target = this.path[0];
    if (!target) return false;
    const dx = target.x - this.x, dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = (this.speed * dt) / 1000;
    this.onDirection(dx, dy);
    if (dist <= step) {
      this.setPosition(target.x, target.y);
      this.path.shift();
      if (!this.path.length) this.arrive();
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
    return true;
  }

  /** Movimento livre com colisão por eixo (teclado). */
  moveFree(vx: number, vy: number, dt: number) {
    const s = dt / 1000;
    const nx = this.x + vx * s;
    if (!this.blockedAt(nx, this.y)) this.x = nx;
    const ny = this.y + vy * s;
    if (!this.blockedAt(this.x, ny)) this.y = ny;
    this.onDirection(vx, vy);
  }

  private blockedAt(px: number, py: number) {
    for (const [ox, oy] of [[-6, -1], [6, -1], [-6, -7], [6, -7]]) {
      if (this.world.isBlocked(Math.floor((px + ox) / TILE), Math.floor((py + oy) / TILE))) return true;
    }
    return false;
  }

  protected abstract onDirection(dx: number, dy: number): void;
}
