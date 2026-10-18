import type { Bus } from '../app/events';
import type { Account } from '../services/account/Account';
import type { SaveManager } from '../services/save/SaveManager';
import type { PlaytimeGuard } from '../services/wellbeing/PlaytimeGuard';
import type { HudState } from './hudState';
import type { Modals } from './modal';

export type LegalPage = 'privacidade' | 'termos' | 'exclusao' | 'responsaveis' | 'licencas';

/** Dependências compartilhadas pelas telas da interface. */
export interface UiContext {
  bus: Bus;
  account: Account;
  saves: SaveManager;
  wellbeing: PlaytimeGuard;
  modals: Modals;
  version: string;
  /** Último estado do jogo recebido (null antes da primeira atualização). */
  hud: HudState | null;
  toast(msg: string): void;
  openLegal(page: LegalPage): void;
}
