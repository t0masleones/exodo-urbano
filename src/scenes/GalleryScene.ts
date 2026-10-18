import Phaser from 'phaser';
import { HUMAN_ART, PET_ART, STATIC_ART } from '../assets/manifest';
import type { Dir4 } from '../assets/layouts';

/**
 * Galeria de sprites para conferir arte nova: abra o jogo com #galeria na URL.
 * Mostra os personagens andando em todas as direções, os pets e todos os objetos.
 */
export class GalleryScene extends Phaser.Scene {
  constructor() {
    super('gallery');
  }

  create() {
    this.cameras.main.setBackgroundColor('#4a6a3a');
    const label = (x: number, y: number, t: string) => this.add.text(x, y, t, { fontSize: '12px', color: '#fff' }).setResolution(2);
    let y = 20;
    for (const a of Object.values(HUMAN_ART)) {
      label(10, y, a.key);
      (['down', 'left', 'up', 'right'] as Dir4[]).forEach((d, i) => {
        this.add.sprite(60 + i * 70, y + 90, a.key).setOrigin(0.5, 1).setScale(2).play(`${a.key}-walk-${d}`);
      });
      y += 110;
    }
    Object.values(PET_ART).forEach((a, i) => {
      label(10 + i * 150, y, a.key);
      this.add.sprite(50 + i * 150, y + 60, a.key).setScale(2.5).play(`${a.key}-walk-r`);
      this.add.sprite(110 + i * 150, y + 60, a.key).setScale(2.5).play(`${a.key}-sleep-l`);
    });
    y += 100;
    let x = 10;
    for (const s of STATIC_ART) {
      if (s.key === 'tiles') continue;
      const frames = this.textures.get(s.key).frameTotal - 1;
      for (let f = 0; f < Math.max(1, frames); f++) {
        const img = this.add.image(x, y, s.key, frames > 1 ? f : undefined).setOrigin(0, 0);
        x += img.width + 6;
        if (x > this.scale.width - 140) { x = 10; y += 120; }
      }
    }
    this.add.image(10, y + 130, 'tiles').setOrigin(0, 0).setScale(2);
  }
}
