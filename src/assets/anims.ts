import Phaser from 'phaser';
import type { AnimalLayout, Dir4, HumanLayout } from './layouts';

const DIRS: Dir4[] = ['up', 'left', 'down', 'right'];

export function createHumanAnims(scene: Phaser.Scene, key: string, L: HumanLayout) {
  for (const dir of DIRS) {
    const row = L.rows[dir] * L.columns;
    scene.anims.create({
      key: `${key}-walk-${dir}`,
      frames: L.walkCols.map((c) => ({ key, frame: row + c })),
      frameRate: L.frameRate,
      repeat: -1,
    });
    scene.anims.create({ key: `${key}-idle-${dir}`, frames: [{ key, frame: row + L.idleCol }], frameRate: 1 });
  }
}

export function createPetAnims(scene: Phaser.Scene, key: string, L: AnimalLayout) {
  const seq = (row: number, n: number) => Array.from({ length: n }, (_, i) => ({ key, frame: row * L.columns + i }));
  for (const side of ['r', 'l'] as const) {
    const r = side === 'r' ? { w: L.rows.walkR, i: L.rows.idleR, s: L.rows.sleepR } : { w: L.rows.walkL, i: L.rows.idleL, s: L.rows.sleepL };
    scene.anims.create({ key: `${key}-walk-${side}`, frames: seq(r.w, L.walkFrames), frameRate: 8, repeat: -1 });
    scene.anims.create({ key: `${key}-idle-${side}`, frames: seq(r.i, L.idleFrames), frameRate: 2, repeat: -1 });
    scene.anims.create({ key: `${key}-sleep-${side}`, frames: seq(r.s, L.sleepFrames), frameRate: 1, repeat: -1 });
  }
}
