import Phaser from 'phaser';
import { setContext, type GameContext } from './context';
import { BootScene } from './scenes/BootScene';
import { FarmScene } from './scenes/FarmScene';
import { GalleryScene } from './scenes/GalleryScene';

export function createGame(parent: string, ctx: GameContext) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#2f4a2a',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    input: { activePointers: 2 },
    scene: [BootScene, FarmScene, GalleryScene],
  });
  setContext(game, ctx);
  return game;
}
