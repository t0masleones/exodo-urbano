import type { Bus } from '../../app/events';
import { isPristine, newGame } from '../../core/state/save';
import { parseSaveJson } from '../../core/state/schema';
import { SAVE_SCHEMA, type GameState } from '../../core/state/types';
import { decideSync } from '../../core/sync';
import type { BaseMap } from '../../core/world/mapgen';
import type { KeyValueStore } from '../../platform';
import type { CloudSaveRecord, CloudSaveStore, SaveSummary, SyncStatus } from '../account/types';

const KEY_SAVE = 'save:v2';
const KEY_BACKUP = 'save:backup';
const KEY_CORRUPT = 'save:corrupt';

/** Envios para a nuvem: no máximo um por minuto em jogo normal. */
const PUSH_INTERVAL_MS = 60_000;
/** Ao dormir/sair do app, envia logo, respeitando o limite das regras (10 s). */
const PUSH_MIN_GAP_MS = 12_000;
/** As regras do servidor exigem 10 s entre gravações do MESMO documento (vindas de qualquer aparelho). */
const SERVER_GAP_MS = 12_000;
/** Depois de uma falha, tenta de novo com espera crescente (15 s, 30 s, 60 s... até 5 min). */
const RETRY_MIN_MS = 15_000;
const RETRY_MAX_MS = 300_000;

export type CommitReason = 'autosave' | 'sleep' | 'pause' | 'action';

interface CloudLink {
  store: CloudSaveStore;
  uid: string;
}

/**
 * Local-first: o jogo sempre salva no aparelho; a nuvem é um backup opcional
 * para quem tem conta. Sem conta, nada sai do aparelho.
 */
export class SaveManager {
  current!: GameState;
  status: SyncStatus = { state: 'off' };
  private cloud: CloudLink | null = null;
  private pendingCloud: CloudSaveRecord | null = null;
  private lastPush = 0;
  private lastSyncAt: number | null = null;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = 0;
  private busy = false;
  private statusListeners = new Set<(s: SyncStatus) => void>();

  constructor(
    private storage: KeyValueStore,
    private bus: Bus,
    private base: BaseMap,
    private appVersion: string,
    private legacy: { read(): string | null; clear(): void } = { read: () => null, clear: () => undefined },
  ) {}

  /** Carrega o save do aparelho. `recovered` = havia um save ilegível (guardamos uma cópia). */
  async load(): Promise<{ recovered: boolean }> {
    let raw = await this.storage.get(KEY_SAVE);
    const fromLegacy = raw === null && (raw = this.legacy.read()) !== null;
    if (!raw) {
      this.current = newGame(this.base, this.appVersion);
      return { recovered: false };
    }
    const parsed = parseSaveJson(raw, (why) => console.warn('Save local inválido:', why));
    if (parsed) {
      this.current = parsed;
      if (fromLegacy) {
        // grava no formato novo ANTES de apagar o antigo: nunca existe um momento sem save
        await this.storage.set(KEY_SAVE, JSON.stringify(parsed));
        this.legacy.clear();
      }
      return { recovered: false };
    }
    await this.storage.set(KEY_CORRUPT, raw.slice(0, 1_000_000)).catch(() => undefined);
    this.current = newGame(this.base, this.appVersion);
    return { recovered: true };
  }

  /** Salva no aparelho e agenda o envio para a nuvem. */
  async commit(state: GameState, reason: CommitReason) {
    state.meta.revision++;
    state.meta.updatedAt = Date.now();
    state.meta.appVersion = this.appVersion;
    this.current = state;
    await this.writeLocal();
    this.schedulePush(reason === 'sleep' || reason === 'pause' ? 'soon' : 'later');
  }

  private async writeLocal() {
    try {
      await this.storage.set(KEY_SAVE, JSON.stringify(this.current));
    } catch (err) {
      console.warn('Não foi possível salvar no aparelho', err);
    }
  }

  /** Começa um jogo novo (o anterior fica guardado como cópia de segurança). */
  async startNewGame() {
    await this.storage.set(KEY_BACKUP, JSON.stringify(this.current)).catch(() => undefined);
    this.current = newGame(this.base, this.appVersion);
    await this.writeLocal();
    this.bus.emit('save:replaced');
  }

  /** Apaga o progresso deste aparelho (usado na exclusão de conta, se o jogador pedir). */
  async wipeLocal() {
    for (const k of [KEY_SAVE, KEY_BACKUP, KEY_CORRUPT]) await this.storage.remove(k);
    this.current = newGame(this.base, this.appVersion);
    this.bus.emit('save:replaced');
  }

  // ------------------------------------------------------------ nuvem

  onStatus(fn: (s: SyncStatus) => void): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private setStatus(s: SyncStatus) {
    this.status = s;
    for (const fn of this.statusListeners) fn(s);
  }

  /** Conecta a nuvem (usuário logado). Se ainda não puder gravar, só sinaliza o motivo. */
  async attachCloud(store: CloudSaveStore, uid: string, canWrite: boolean) {
    this.cloud = canWrite ? { store, uid } : null;
    if (!canWrite) {
      this.setStatus({ state: 'needs-verification' });
      return;
    }
    await this.sync();
  }

  detachCloud() {
    this.cloud = null;
    this.pendingCloud = null;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = null;
    this.setStatus({ state: 'off' });
  }

  async sync(): Promise<void> {
    const link = this.cloud;
    if (!link || this.busy) return;
    this.busy = true;
    this.setStatus({ state: 'syncing' });
    try {
      const remote = await link.store.get(link.uid);
      const decision = decideSync(this.current.meta, remote, isPristine(this.current));
      if (decision === 'upload') {
        // Outro aparelho gravou há instantes: espera a janela do servidor em vez de ser recusado.
        const wait = remote ? remote.updatedAt + SERVER_GAP_MS - Date.now() : 0;
        if (wait > 0) {
          this.retryIn(Math.min(wait, SERVER_GAP_MS));
          return;
        }
        await this.upload(link);
      } else if (decision === 'download' && remote) {
        await this.download(remote);
      } else if (decision === 'conflict' && remote) {
        this.pendingCloud = remote;
        this.setStatus({ state: 'conflict', local: this.summary(this.current), cloud: this.remoteSummary(remote) });
        return;
      }
      this.retryDelay = 0;
      this.lastSyncAt = Date.now();
      this.setStatus({ state: 'idle', lastSyncAt: this.lastSyncAt });
    } catch (err) {
      console.warn('Falha ao sincronizar', err);
      this.retryDelay = Math.min(Math.max(RETRY_MIN_MS, this.retryDelay * 2), RETRY_MAX_MS);
      this.retryIn(this.retryDelay);
      this.setStatus({ state: 'error', message: 'Não deu para sincronizar agora. O progresso continua salvo no aparelho e tentaremos de novo.' });
    } finally {
      this.busy = false;
    }
  }

  private retryIn(ms: number) {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.sync();
    }, ms);
  }

  /** O jogador escolheu qual progresso manter. O outro vira cópia de segurança local. */
  async resolveConflict(keep: 'local' | 'cloud') {
    const link = this.cloud;
    const remote = this.pendingCloud;
    if (!link || !remote) return;
    this.pendingCloud = null;
    this.busy = true;
    try {
      if (keep === 'cloud') {
        await this.download(remote);
      } else {
        await this.storage.set(KEY_BACKUP, remote.data).catch(() => undefined);
        // A nova versão precisa "vencer" a da nuvem também nas regras do servidor.
        this.current.meta.revision = Math.max(this.current.meta.revision, remote.revision) + 1;
        await this.upload(link);
      }
      this.lastSyncAt = Date.now();
      this.setStatus({ state: 'idle', lastSyncAt: this.lastSyncAt });
    } catch (err) {
      console.warn('Falha ao resolver conflito', err);
      this.setStatus({ state: 'error', message: 'Não deu para concluir agora. Tente sincronizar de novo.' });
    } finally {
      this.busy = false;
    }
  }

  private async upload(link: CloudLink) {
    const s = this.current;
    if (s.meta.revision === 0) s.meta.revision = 1;
    await link.store.put(link.uid, {
      schema: SAVE_SCHEMA,
      data: JSON.stringify(s),
      day: s.day,
      revision: s.meta.revision,
      saveId: s.meta.id,
      appVersion: this.appVersion,
    });
    this.lastPush = Date.now();
    s.meta.syncedRevision = s.meta.revision;
    await this.writeLocal();
  }

  private async download(remote: CloudSaveRecord) {
    const parsed = parseSaveJson(remote.data, (why) => console.warn('Save da nuvem inválido:', why));
    if (!parsed) throw new Error('save da nuvem inválido');
    if (!isPristine(this.current)) await this.storage.set(KEY_BACKUP, JSON.stringify(this.current)).catch(() => undefined);
    parsed.meta.revision = Math.max(parsed.meta.revision, remote.revision);
    parsed.meta.syncedRevision = parsed.meta.revision;
    this.current = parsed;
    await this.writeLocal();
    this.bus.emit('save:replaced');
  }

  private schedulePush(when: 'soon' | 'later') {
    if (!this.cloud || this.status.state === 'conflict') return;
    const gap = when === 'soon' ? PUSH_MIN_GAP_MS : PUSH_INTERVAL_MS;
    const wait = Math.max(0, this.lastPush + gap - Date.now());
    if (this.pushTimer) {
      if (when === 'later') return;
      clearTimeout(this.pushTimer);
    }
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.sync();
    }, wait);
  }

  // ------------------------------------------------------------ resumo e exportação

  summary(s: GameState): SaveSummary {
    return { day: s.day, money: s.money, playtimeMin: Math.round(s.meta.playtimeSec / 60), updatedAt: s.meta.updatedAt };
  }

  private remoteSummary(remote: CloudSaveRecord): SaveSummary {
    const parsed = parseSaveJson(remote.data);
    return parsed ? { ...this.summary(parsed), updatedAt: remote.updatedAt } : { day: remote.day, updatedAt: remote.updatedAt };
  }

  async readCloudForExport(): Promise<CloudSaveRecord | null> {
    return this.cloud ? this.cloud.store.get(this.cloud.uid) : null;
  }
}
