import Phaser from 'phaser';
import { TILE } from '../../core/config';
import { PET_ART } from '../assets/manifest';
import type { PetDef } from '../../core/data/characters';
import type { TilePos } from '../../core/world/pathfinding';
import { Walker, type WorldQuery } from './Walker';

type PetMode = 'idle' | 'wander' | 'follow' | 'sleep' | 'roof';

export interface PetContext extends WorldQuery {
  player(): { x: number; y: number; tile: TilePos };
  home: TilePos;
  roof: { x: number; y: number };
}

/**
 * IA simples e com personalidade: cada pet sorteia entre dormir, seguir quem
 * você controla ou passear, com pesos definidos em data/characters.ts.
 */
export class Pet extends Walker {
  side: 'r' | 'l' = 'r';
  mode: PetMode = 'idle';
  private timer = Phaser.Math.Between(500, 2500);
  private followCheck = 0;
  private zz?: Phaser.GameObjects.Text;
  private busy = false;

  constructor(scene: Phaser.Scene, public def: PetDef, x: number, y: number, private ctx: PetContext) {
    const art = PET_ART[def.id];
    super(scene, x, y, art.key, ctx);
    this.setOrigin(0.5, art.layout.feetY / art.layout.frameHeight);
    this.setScale(def.scale);
    this.speed = def.speed;
    this.setInteractive({ useHandCursor: true });
  }

  protected onDirection(dx: number) {
    if (Math.abs(dx) > 0.01) this.side = dx > 0 ? 'r' : 'l';
  }

  override update(dt: number) {
    const key = this.texture.key;
    if (this.busy) return;
    if (this.mode === 'roof' || this.mode === 'sleep') {
      this.play(`${key}-sleep-${this.side}`, true);
      this.updateZz();
      this.tick(dt);
      return;
    }
    this.hideZz();
    const walking = this.stepPath(dt);
    if (this.mode === 'follow') {
      this.followCheck -= dt;
      if (this.followCheck <= 0) {
        this.followCheck = 1000;
        const pl = this.ctx.player();
        if (Phaser.Math.Distance.Between(this.x, this.y, pl.x, pl.y) > TILE * 2.5) this.goToTile(pl.tile, true);
      }
    }
    this.play(`${key}-${walking ? 'walk' : 'idle'}-${this.side}`, true);
    this.setDepth(this.y);
    if (!walking) this.tick(dt);
  }

  private tick(dt: number) {
    this.timer -= dt;
    if (this.timer <= 0) this.decide();
  }

  private decide() {
    if (this.mode === 'roof') {
      this.jumpTo(this.ctx.home.x * TILE + 16, (this.ctx.home.y + 1) * TILE - 8, () => (this.mode = 'idle'));
      this.timer = 2000;
      return;
    }
    const b = this.def.behavior;
    const r = Math.random();
    if (r < b.sleep) {
      if (b.roof && Math.random() < 0.6) {
        this.jumpTo(this.ctx.roof.x, this.ctx.roof.y, () => {
          this.mode = 'roof';
          this.setDepth(100000);
        });
      } else this.mode = 'sleep';
      this.timer = Phaser.Math.Between(8000, 20000);
    } else if (r < b.sleep + b.follow) {
      this.mode = 'follow';
      this.followCheck = 0;
      this.timer = Phaser.Math.Between(6000, 14000);
    } else {
      this.mode = 'wander';
      const t = this.tile, R = b.wanderRadius;
      const target = { x: t.x + Phaser.Math.Between(-R, R), y: t.y + Phaser.Math.Between(-R, R) };
      // não deixa ninguém sumir pelo mapa: volta pra perto de casa se for longe demais
      if (Math.abs(target.x - this.ctx.home.x) > 16 || Math.abs(target.y - this.ctx.home.y) > 14) Object.assign(target, this.ctx.home);
      this.goToTile(target, false);
      this.timer = Phaser.Math.Between(2000, 5000);
    }
  }

  private jumpTo(x: number, y: number, done: () => void) {
    this.busy = true;
    this.cancelPath();
    this.side = x > this.x ? 'r' : 'l';
    this.play(`${this.texture.key}-walk-${this.side}`, true);
    this.setDepth(100000);
    this.scene.tweens.add({
      targets: this,
      x, y,
      duration: 650,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        this.busy = false;
        if (y > this.ctx.roof.y + 4) this.setDepth(this.y);
        done();
      },
    });
  }

  /** Reação ao carinho. Bichos dormindo continuam dormindo (mas felizes). */
  react() {
    if (this.mode === 'sleep' || this.mode === 'roof' || this.busy) return;
    this.mode = 'idle';
    this.timer = 2500;
    this.cancelPath();
    this.scene.tweens.add({ targets: this, y: this.y - 6, duration: 120, yoyo: true, repeat: 1 });
  }

  placeAt(x: number, y: number) {
    this.scene.tweens.killTweensOf(this);
    this.busy = false;
    this.cancelPath();
    this.setPosition(x, y);
    this.mode = 'idle';
    this.timer = Phaser.Math.Between(500, 2500);
  }

  private updateZz() {
    if (!this.zz) {
      this.zz = this.scene.add.text(0, 0, 'z', { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff', stroke: '#33334d', strokeThickness: 2 });
    }
    const t = this.scene.time.now / 600;
    this.zz.setVisible(true).setPosition(this.x + 6, this.y - 22 - (t % 1) * 6).setText(Math.floor(t) % 2 ? 'zZ' : 'z').setDepth(100001);
  }

  private hideZz() {
    this.zz?.setVisible(false);
  }
}
