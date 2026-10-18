import { Emitter } from '../core/util/emitter';
import type { DiaryEntry } from '../core/systems/diary';
import type { SlotKey } from '../core/systems/farm';
import type { AccountSnapshot } from '../services/account/types';
import type { Ambient, HudState } from '../ui/hudState';

export type GameModal = 'sleep' | 'shop' | 'sell';

/**
 * Todos os eventos que cruzam camadas (jogo ⇄ interface ⇄ serviços).
 * O compilador garante que quem emite e quem escuta concordam nos argumentos.
 */
export type AppEvents = {
  // jogo → interface
  hud: [HudState];
  toast: [string];
  open: [GameModal];
  diary: [DiaryEntry];
  ambient: [Ambient];
  // interface → jogo
  'ui:select': [SlotKey];
  'ui:sleep': [];
  'ui:switch': [];
  'ui:modal': [boolean];
  'ui:buy': [string, number];
  'ui:sell': [string, number];
  // ciclo de vida do app
  'app:pause': [];
  'app:resume': [];
  // saves e contas
  'save:replaced': [];
  account: [AccountSnapshot];
};

export type Bus = Emitter<AppEvents>;

export const createBus = (): Bus => new Emitter<AppEvents>();
