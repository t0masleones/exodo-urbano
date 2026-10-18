import { env } from './app/env';
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
  const [{ recovered }] = await Promise.all([saves.load(), wellbeing.load()]);
  const account = new Account(bus, saves, storage);

  initUi(document.getElementById('hud')!, { bus, account, saves, wellbeing, version: env.appVersion });
  onLifecycle({
    pause: () => {
      wellbeing.onAppPause();
      bus.emit('app:pause');
    },
    resume: () => {
      wellbeing.onAppResume();
      bus.emit('app:resume');
    },
  });
  createGame('game', { bus, saves, base, wellbeing });

  if (recovered) bus.emit('toast', 'O save anterior estava ilegível. Guardamos uma cópia e começamos um jogo novo.');
  void account.restoreSession();
}

void main();
