import Phaser from 'phaser';
import { createHumanAnims, createPetAnims } from '../assets/anims';
import { HUMAN_ART, PET_ART, STATIC_ART } from '../assets/manifest';
import { generatePlaceholders } from '../assets/placeholders';

/** Carrega arte real (quando existir no manifesto) e gera placeholders para o resto. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    for (const a of [...Object.values(HUMAN_ART), ...Object.values(PET_ART)]) {
      if (a.url) this.load.spritesheet(a.key, a.url, { frameWidth: a.layout.frameWidth, frameHeight: a.layout.frameHeight });
    }
    for (const a of STATIC_ART) {
      if (!a.url) continue;
      if (a.frameWidth) this.load.spritesheet(a.key, a.url, { frameWidth: a.frameWidth, frameHeight: a.frameHeight ?? a.frameWidth });
      else this.load.image(a.key, a.url);
    }
  }

  create() {
    generatePlaceholders(this);
    for (const a of Object.values(HUMAN_ART)) createHumanAnims(this, a.key, a.layout);
    for (const a of Object.values(PET_ART)) createPetAnims(this, a.key, a.layout);
    this.scene.start(window.location.hash === '#galeria' ? 'gallery' : 'farm');
  }
}
