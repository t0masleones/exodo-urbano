import { env } from './app/env';
import { Ambience } from './audio/Ambience';
import { createBus } from './app/events';
import { generateBaseMap } from './core/world/mapgen';
import { createGame } from './game/createGame';
import { legacySave, onLifecycle, storage } from './platform';
import { Account } from './services/account/Account';
import { SaveManager } from './services/save/SaveManager';
import { PlaytimeGuard } from './services/wellbeing/PlaytimeGuard';
import { initUi } from './ui';

/**
 * Raiz de composição: cria cada peça uma vez e entrega as dependências.
 * Ordem: dados locais → interface → jogo → (opcional) conta online.
 */
async function main() {
  const bus = createBus();
  const base = generateBaseMap();
  const saves = new SaveManager(storage, bus, base, env.appVersion, legacySave);
  const wellbeing = new PlaytimeGuard(storage, bus);
  const audio = new Ambience(storage);
  const [{ recovered }] = await Promise.all([saves.load(), wellbeing.load(), audio.load()]);
  const account = new Account(bus, saves, storage);

  initUi(document.getElementById('hud')!, { bus, account, saves, wellbeing, audio, version: env.appVersion });
  onLifecycle({
    pause: () => {
      wellbeing.onAppPause();
      audio.suspend();
      bus.emit('app:pause');
    },
    resume: () => {
      wellbeing.onAppResume();
      audio.resume();
      bus.emit('app:resume');
    },
  });
  // sons ambientes: seguem a hora/estação/clima do jogo; só tocam após o 1º gesto
  bus.on('ambient', (a) => audio.update(a));
  const unlockAudio = () => audio.unlock();
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio);
  createGame('game', { bus, saves, base, wellbeing });

  if (recovered) bus.emit('toast', 'O save anterior estava ilegível. Guardamos uma cópia e começamos um jogo novo.');
  void account.restoreSession();
}

void main();
