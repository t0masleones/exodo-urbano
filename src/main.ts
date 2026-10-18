import { env } from './app/env';
import { createBus } from './app/events';
import { generateBaseMap } from './core/world/mapgen';
import { createGame } from './game/createGame';
import { legacySave, onLifecycle, storage } from './platform';
import { Account } from './services/account/Account';
import { SaveManager } from './services/save/SaveManager';
import { initUi } from './ui';

/**
 * Raiz de composição: cria cada peça uma vez e entrega as dependências.
 * Ordem: dados locais → interface → jogo → (opcional) conta online.
 */
async function main() {
  const bus = createBus();
  const base = generateBaseMap();
  const saves = new SaveManager(storage, bus, base, env.appVersion, legacySave);
  const { recovered } = await saves.load();
  const account = new Account(bus, saves, storage);

  initUi(document.getElementById('hud')!, { bus, account, saves, version: env.appVersion });
  onLifecycle({ pause: () => bus.emit('app:pause'), resume: () => bus.emit('app:resume') });
  createGame('game', { bus, saves, base });

  if (recovered) bus.emit('toast', 'O save anterior estava ilegível. Guardamos uma cópia e começamos um jogo novo.');
  void account.restoreSession();
}

void main();
