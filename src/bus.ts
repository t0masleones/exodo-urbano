import Phaser from 'phaser';

/** Canal único de eventos entre a cena do jogo (Phaser) e o HUD (DOM). */
export const bus = new Phaser.Events.EventEmitter();
