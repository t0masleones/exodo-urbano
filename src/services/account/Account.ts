import { MIN_ACCOUNT_AGE, env } from '../../app/env';
import type { Bus } from '../../app/events';
import { isNative, platformName, shareTextFile, type KeyValueStore } from '../../platform';
import type { SaveManager } from '../save/SaveManager';
import { AuthError, type AccountSnapshot, type AuthUser, type BackendServices, type ProviderId } from './types';
import { validateEmail, validatePassword } from './validation';

const KEY_HINT = 'account:hint';
const KEY_AGE = 'privacy:age-gate';
const RECENT_LOGIN_MS = 4 * 60_000;
const BLOCK_MS = 24 * 60 * 60_000;

export type AgeGate = 'ok' | 'blocked' | 'unknown';

/**
 * Fachada de contas. Mantém o Firebase fora do pacote inicial: ele só é
 * baixado quando o jogador decide entrar numa conta (ou já entrou antes
 * neste aparelho). Quem joga como convidado não fala com servidor nenhum.
 */
export class Account {
  readonly available = env.firebase !== null;
  readonly providers: ProviderId[];
  private backend: Promise<BackendServices> | null = null;
  private user: AuthUser | null = null;
  private loading = false;

  constructor(private bus: Bus, private saves: SaveManager, private storage: KeyValueStore) {
    const apple = platformName === 'ios' || (env.appleOnWeb && !isNative);
    this.providers = apple ? ['google', 'apple', 'password'] : ['google', 'password'];
    saves.onStatus(() => this.emit());
  }

  snapshot(): AccountSnapshot {
    return { available: this.available, loading: this.loading, user: this.user, sync: this.saves.status, providers: this.providers };
  }

  private emit() {
    this.bus.emit('account', this.snapshot());
  }

  /** Na abertura: só carrega o Firebase se este aparelho já teve uma conta conectada. */
  async restoreSession() {
    if (this.available && (await this.storage.get(KEY_HINT)) === '1') await this.load().catch(() => undefined);
  }

  private load(): Promise<BackendServices> {
    const cfg = env.firebase;
    if (!cfg) return Promise.reject(new AuthError('not-enabled', 'Contas online não estão ativas nesta versão.'));
    if (!this.backend) {
      this.loading = true;
      this.emit();
      this.backend = import('../firebase')
        .then((m) => m.createBackend(cfg, { useEmulators: env.useEmulators, recaptchaSiteKey: env.recaptchaSiteKey }))
        .then((b) => {
          b.auth.onChange((u) => void this.onUser(b, u));
          return b;
        })
        .catch((err) => {
          this.backend = null;
          throw err instanceof AuthError ? err : new AuthError('network', 'Não deu para carregar as contas agora. Confira a internet.');
        })
        .finally(() => {
          this.loading = false;
          this.emit();
        });
    }
    return this.backend;
  }

  private async onUser(b: BackendServices, u: AuthUser | null) {
    this.user = u;
    if (u) {
      await this.storage.set(KEY_HINT, '1').catch(() => undefined);
      await this.saves.attachCloud(b.cloud, u.uid, u.emailVerified);
    } else {
      this.saves.detachCloud();
    }
    this.emit();
  }

  get currentUser() {
    return this.user;
  }

  // ------------------------------------------------------------ verificação de idade

  async ageGate(): Promise<AgeGate> {
    const raw = await this.storage.get(KEY_AGE);
    if (!raw) return 'unknown';
    try {
      const v = JSON.parse(raw) as { status?: string; until?: number };
      if (v.status === 'ok') return 'ok';
      if (v.status === 'blocked' && typeof v.until === 'number' && Date.now() < v.until) return 'blocked';
    } catch {
      /* valor estragado: pergunta de novo */
    }
    return 'unknown';
  }

  /** Tela neutra de idade. Não guardamos o ano informado, só o resultado. */
  async submitBirthYear(year: number): Promise<'ok' | 'blocked'> {
    const now = new Date().getFullYear();
    // conservador: considera que a pessoa ainda não fez aniversário este ano
    const ok = Number.isInteger(year) && year >= now - 120 && year <= now && now - year - 1 >= MIN_ACCOUNT_AGE;
    const value = ok ? { status: 'ok' } : { status: 'blocked', until: Date.now() + BLOCK_MS };
    await this.storage.set(KEY_AGE, JSON.stringify(value)).catch(() => undefined);
    return ok ? 'ok' : 'blocked';
  }

  // ------------------------------------------------------------ login

  async signIn(provider: 'google' | 'apple') {
    const b = await this.load();
    await (provider === 'google' ? b.auth.signInWithGoogle() : b.auth.signInWithApple());
  }

  async signInEmail(email: string, password: string) {
    const b = await this.load();
    await b.auth.signInWithEmail(email.trim(), password);
  }

  async signUpEmail(email: string, password: string) {
    const problem = validateEmail(email) ?? validatePassword(password);
    if (problem) throw new AuthError('weak-password', problem);
    const b = await this.load();
    await b.auth.signUpWithEmail(email.trim(), password);
  }

  async resetPassword(email: string) {
    const problem = validateEmail(email);
    if (problem) throw new AuthError('invalid-email', problem);
    const b = await this.load();
    try {
      await b.auth.sendPasswordReset(email.trim());
    } catch (err) {
      // não revela se o e-mail existe ou não (proteção contra enumeração de contas)
      if (!(err instanceof AuthError) || err.code === 'too-many-requests' || err.code === 'network') throw err;
    }
  }

  async resendVerification() {
    const b = await this.load();
    await b.auth.resendVerification();
  }

  /** Depois que o jogador clica no link do e-mail: recarrega e liga a nuvem. */
  async checkVerified(): Promise<boolean> {
    const b = await this.load();
    const u = await b.auth.refresh();
    this.user = u;
    if (u?.emailVerified) await this.saves.attachCloud(b.cloud, u.uid, true);
    this.emit();
    return !!u?.emailVerified;
  }

  async signOut() {
    const b = await this.load();
    this.saves.detachCloud();
    await b.auth.signOut();
    await this.storage.remove(KEY_HINT);
  }

  syncNow() {
    return this.saves.sync();
  }

  resolveConflict(keep: 'local' | 'cloud') {
    return this.saves.resolveConflict(keep);
  }

  // ------------------------------------------------------------ direitos do titular (LGPD art. 18)

  /**
   * Exclusão definitiva: primeiro os dados, depois a conta. A checagem de
   * login recente vem antes de tudo, para nunca ficar "meio apagado".
   */
  async deleteAccount(alsoLocal: boolean) {
    const b = await this.load();
    const u = this.user;
    if (!u) return;
    const last = Date.parse(u.lastSignInAt ?? '');
    if (!Number.isFinite(last) || Date.now() - last > RECENT_LOGIN_MS) {
      throw new AuthError('recent-login', 'Por segurança, entre de novo na sua conta e repita a exclusão.');
    }
    this.saves.detachCloud();
    await b.cloud.remove(u.uid);
    await b.auth.deleteUser();
    await this.storage.remove(KEY_HINT);
    if (alsoLocal) {
      await this.storage.remove(KEY_AGE);
      await this.saves.wipeLocal();
    }
  }

  /** Portabilidade/acesso: entrega um arquivo com tudo o que guardamos. */
  async exportData() {
    let cloud = null;
    try {
      cloud = await this.saves.readCloudForExport();
    } catch {
      cloud = null;
    }
    const u = this.user;
    const parse = (s: string) => {
      try {
        return JSON.parse(s) as unknown;
      } catch {
        return s;
      }
    };
    const payload = {
      formato: 'exodo-urbano/meus-dados@1',
      geradoEm: new Date().toISOString(),
      sobre: 'Cópia dos dados pessoais e do progresso guardados pelo Êxodo Urbano (LGPD, art. 18).',
      conta: u ? { id: u.uid, email: u.email, provedores: u.providers, criadaEm: u.createdAt, ultimoLogin: u.lastSignInAt } : null,
      progressoNesteAparelho: this.saves.current,
      progressoNaNuvem: cloud
        ? { atualizadoEm: new Date(cloud.updatedAt).toISOString(), revisao: cloud.revision, versaoDoApp: cloud.appVersion, estado: parse(cloud.data) }
        : null,
      preferenciasNesteAparelho: { verificacaoDeIdade: await this.ageGate() },
    };
    const date = new Date().toISOString().slice(0, 10);
    await shareTextFile(`exodo-urbano-meus-dados-${date}.json`, JSON.stringify(payload, null, 2), 'Meus dados - Êxodo Urbano');
  }
}
