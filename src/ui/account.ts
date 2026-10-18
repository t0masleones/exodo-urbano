import { MIN_ACCOUNT_AGE } from '../app/env';
import { validateEmail, validatePassword } from '../services/account/validation';
import { AuthError, type AccountSnapshot, type SaveSummary } from '../services/account/types';
import type { UiContext } from './context';
import { formatDateTime, html, type SafeHtml } from './dom';
import type { View } from './modal';

type Screen = 'home' | 'age' | 'blocked' | 'login' | 'signup' | 'reset' | 'delete';
type Pending = 'google' | 'apple' | 'login' | 'signup';

const PROVIDER_LABEL: Record<string, string> = { 'google.com': 'Google', 'apple.com': 'Apple', password: 'e-mail e senha' };

const header = (title: string) => html`<div class="row"><h2>${title}</h2><button class="btn ghost" data-act="close" aria-label="Fechar">✕</button></div>`;
const legalLinks = html`<p class="small">
  <button class="link" data-act="legal" data-page="privacidade">Política de Privacidade</button> ·
  <button class="link" data-act="legal" data-page="termos">Termos de Uso</button></p>`;

/**
 * Tela de conta: opcional, explicada em linguagem simples, com os direitos
 * do titular (baixar dados, excluir conta) a um toque de distância.
 */
export class AccountView implements View {
  private screen: Screen = 'home';
  private pending: Pending | null = null;
  private error: string | null = null;
  private notice: string | null = null;

  constructor(private ctx: UiContext) {}

  private get snap(): AccountSnapshot {
    return this.ctx.account.snapshot();
  }

  render(): SafeHtml {
    const body = this.body();
    return html`${body}
      ${this.error ? html`<p class="alert" role="alert">${this.error}</p>` : ''}
      ${this.notice ? html`<p class="notice" role="status">${this.notice}</p>` : ''}`;
  }

  private body(): SafeHtml {
    const s = this.snap;
    if (!s.available) {
      return html`${header('👤 Conta')}
        <p>As contas online ainda não estão ativas nesta versão. Seu progresso fica salvo <b>só neste aparelho</b>, e nada é enviado para servidor nenhum.</p>
        ${legalLinks}`;
    }
    if (s.user && this.screen !== 'delete') return this.signedIn(s);
    switch (this.screen) {
      case 'age': return this.ageScreen();
      case 'blocked': return this.blockedScreen();
      case 'login': return this.emailForm('login');
      case 'signup': return this.emailForm('signup');
      case 'reset': return this.resetForm();
      case 'delete': return this.deleteForm();
      default: return this.signedOut(s);
    }
  }

  private signedOut(s: AccountSnapshot): SafeHtml {
    return html`${header('👤 Conta (opcional)')}
      <p>Dá para jogar sem conta para sempre. A conta serve só para <b>guardar o progresso na nuvem</b> e continuar em outro aparelho.</p>
      <p class="muted">🔒 Guardamos apenas seu e-mail e o progresso do jogo. Sem anúncios, sem rastreamento, sem venda de dados.</p>
      <div class="stack">
        ${s.providers.includes('google') ? html`<button class="btn" data-act="acc:google" ${s.loading ? 'disabled' : ''}>Entrar com Google</button>` : ''}
        ${s.providers.includes('apple') ? html`<button class="btn" data-act="acc:apple" ${s.loading ? 'disabled' : ''}>Entrar com Apple</button>` : ''}
        <button class="btn" data-act="acc:login">Entrar com e-mail</button>
        <button class="btn ghost-border" data-act="acc:signup">Criar conta com e-mail</button>
      </div>
      <p class="small">Ao entrar, você concorda com os Termos de Uso e a Política de Privacidade.</p>
      ${legalLinks}`;
  }

  private signedIn(s: AccountSnapshot): SafeHtml {
    const u = s.user!;
    const via = u.providers.map((p) => PROVIDER_LABEL[p] ?? p).join(', ') || 'e-mail';
    return html`${header('👤 Sua conta')}
      <p>Conectado como <b>${u.email ?? 'conta sem e-mail'}</b> <span class="muted">(${via})</span></p>
      ${this.syncLine(s)}
      <h3>Seus dados</h3>
      <div class="stack">
        <button class="btn" data-act="acc:export">📦 Baixar meus dados</button>
        <button class="btn" data-act="acc:signout">Sair da conta</button>
        <button class="btn danger" data-act="acc:delete">🗑️ Excluir conta</button>
      </div>
      <p class="small">Sair mantém o progresso neste aparelho. Excluir apaga a conta e o que está na nuvem.</p>
      ${legalLinks}`;
  }

  private syncLine(s: AccountSnapshot): SafeHtml {
    switch (s.sync.state) {
      case 'needs-verification':
        return html`<div class="card">📧 Confirme seu e-mail (enviamos um link) para ativar o salvamento na nuvem.
          <div class="row end"><button class="btn" data-act="acc:resend">Reenviar e-mail</button><button class="btn primary" data-act="acc:verified">Já confirmei</button></div></div>`;
      case 'syncing':
        return html`<div class="card">☁️ Sincronizando…</div>`;
      case 'idle':
        return html`<div class="card">☁️ Progresso guardado na nuvem${s.sync.lastSyncAt ? html` (${formatDateTime(s.sync.lastSyncAt)})` : ''}.
          <div class="row end"><button class="btn" data-act="acc:sync">Sincronizar agora</button></div></div>`;
      case 'error':
        return html`<div class="card">⚠️ ${s.sync.message}<div class="row end"><button class="btn" data-act="acc:sync">Tentar de novo</button></div></div>`;
      case 'conflict':
        return html`<div class="card">☁️ Há dois progressos diferentes. <button class="btn" data-act="acc:conflict">Escolher</button></div>`;
      default:
        return html``;
    }
  }

  private ageScreen(): SafeHtml {
    const year = new Date().getFullYear();
    const years = Array.from({ length: 101 }, (_, i) => year - i);
    return html`${header('Antes de continuar')}
      <form data-form="age" class="form">
        <label>Em que ano você nasceu?
          <select name="year" required>
            <option value="">Selecione…</option>
            ${years.map((y) => html`<option value="${y}">${y}</option>`)}
          </select>
        </label>
        <button class="btn primary" type="submit">Continuar</button>
      </form>
      <p class="small">Não guardamos o ano informado: ele serve só para saber se a conta pode ser criada.</p>`;
  }

  private blockedScreen(): SafeHtml {
    return html`${header('Conta indisponível')}
      <p>Para usar uma conta é preciso ter pelo menos ${MIN_ACCOUNT_AGE} anos.</p>
      <p>Você pode continuar jogando normalmente: o progresso fica salvo neste aparelho, sem enviar nada para a internet. 🌱</p>
      ${legalLinks}`;
  }

  private emailForm(kind: 'login' | 'signup'): SafeHtml {
    const signup = kind === 'signup';
    return html`${header(signup ? 'Criar conta' : 'Entrar com e-mail')}
      <form data-form="${kind}" class="form" novalidate>
        <label>E-mail <input name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" required /></label>
        <label>Senha <input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" maxlength="128" required /></label>
        ${signup ? html`
          <label>Repita a senha <input name="confirm" type="password" autocomplete="new-password" maxlength="128" required /></label>
          <label class="check"><input name="terms" type="checkbox" required /> Li e aceito os Termos de Uso e a Política de Privacidade.</label>` : ''}
        <button class="btn primary" type="submit">${signup ? 'Criar conta' : 'Entrar'}</button>
      </form>
      <p class="small">
        ${signup ? html`<button class="link" data-act="acc:login">Já tenho conta</button>` : html`<button class="link" data-act="acc:reset">Esqueci a senha</button> · <button class="link" data-act="acc:signup">Criar conta</button>`}
        · <button class="link" data-act="acc:home">Voltar</button>
      </p>
      ${signup ? html`<p class="small">Vamos enviar um e-mail de confirmação. O salvamento na nuvem começa depois que você confirmar.</p>` : ''}
      ${legalLinks}`;
  }

  private resetForm(): SafeHtml {
    return html`${header('Nova senha')}
      <form data-form="reset" class="form" novalidate>
        <label>E-mail da conta <input name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" required /></label>
        <button class="btn primary" type="submit">Enviar link</button>
      </form>
      <p class="small"><button class="link" data-act="acc:login">Voltar</button></p>`;
  }

  private deleteForm(): SafeHtml {
    return html`${header('🗑️ Excluir conta')}
      <p>Isto apaga <b>sua conta</b> e o <b>progresso guardado na nuvem</b>. Não dá para desfazer.</p>
      <p class="small">Dica: antes, use “Baixar meus dados” se quiser guardar uma cópia.</p>
      <form data-form="delete" class="form" novalidate>
        <label class="check"><input name="local" type="checkbox" /> Apagar também o progresso deste aparelho</label>
        <label>Para confirmar, digite EXCLUIR <input name="confirm" autocomplete="off" autocapitalize="characters" maxlength="10" required /></label>
        <button class="btn danger" type="submit">Excluir para sempre</button>
      </form>
      <p class="small"><button class="link" data-act="acc:home">Cancelar</button></p>`;
  }

  // ------------------------------------------------------------ ações

  private go(screen: Screen) {
    this.screen = screen;
    this.error = null;
    this.notice = null;
    this.ctx.modals.render();
  }

  private async guarded(fn: () => Promise<void>) {
    this.error = null;
    this.notice = null;
    try {
      await fn();
    } catch (err) {
      if (err instanceof AuthError && err.code === 'cancelled') return;
      this.error = err instanceof AuthError ? err.message : 'Algo deu errado. Tente novamente.';
      if (!(err instanceof AuthError)) console.warn(err);
    } finally {
      this.ctx.modals.render();
    }
  }

  /** Antes de qualquer login/cadastro: tela neutra de idade (uma vez por aparelho). */
  private async withAgeGate(next: Pending) {
    const gate = await this.ctx.account.ageGate();
    if (gate === 'blocked') return this.go('blocked');
    if (gate === 'unknown') {
      this.pending = next;
      return this.go('age');
    }
    await this.continueWith(next);
  }

  private async continueWith(next: Pending) {
    if (next === 'login' || next === 'signup') return this.go(next);
    await this.guarded(async () => {
      await this.ctx.account.signIn(next);
      this.screen = 'home';
    });
  }

  async action(act: string): Promise<void> {
    const acc = this.ctx.account;
    switch (act) {
      case 'acc:home': return this.go('home');
      case 'acc:google': return this.withAgeGate('google');
      case 'acc:apple': return this.withAgeGate('apple');
      case 'acc:login': return this.withAgeGate('login');
      case 'acc:signup': return this.withAgeGate('signup');
      case 'acc:reset': return this.go('reset');
      case 'acc:delete': return this.go('delete');
      case 'acc:sync': return this.guarded(() => acc.syncNow());
      case 'acc:conflict': return this.ctx.modals.open(conflictView(this.ctx));
      case 'acc:resend':
        return this.guarded(async () => {
          await acc.resendVerification();
          this.notice = 'E-mail reenviado. Confira também a caixa de spam.';
        });
      case 'acc:verified':
        return this.guarded(async () => {
          const ok = await acc.checkVerified();
          this.notice = ok ? 'E-mail confirmado! O salvamento na nuvem está ativo.' : 'Ainda não aparece como confirmado. Abra o link do e-mail e tente de novo.';
        });
      case 'acc:export':
        return this.guarded(async () => {
          await acc.exportData();
          this.notice = 'Arquivo com seus dados gerado.';
        });
      case 'acc:signout':
        return this.guarded(async () => {
          await acc.signOut();
          this.screen = 'home';
          this.notice = 'Você saiu da conta. O progresso continua neste aparelho.';
        });
    }
  }

  async submit(form: HTMLFormElement, data: FormData): Promise<void> {
    const acc = this.ctx.account;
    const str = (k: string) => String(data.get(k) ?? '');
    switch (form.dataset.form) {
      case 'age': {
        const result = await acc.submitBirthYear(Number(str('year')));
        if (result === 'blocked') return this.go('blocked');
        const next = this.pending ?? 'signup';
        this.pending = null;
        return this.continueWith(next);
      }
      case 'login':
        return this.guarded(async () => {
          const problem = validateEmail(str('email'));
          if (problem) throw new AuthError('invalid-email', problem);
          await acc.signInEmail(str('email'), str('password'));
          this.screen = 'home';
        });
      case 'signup':
        return this.guarded(async () => {
          const problem = validateEmail(str('email')) ?? validatePassword(str('password'));
          if (problem) throw new AuthError('weak-password', problem);
          if (str('password') !== str('confirm')) throw new AuthError('weak-password', 'As senhas não são iguais.');
          if (!data.get('terms')) throw new AuthError('unknown', 'Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.');
          await acc.signUpEmail(str('email'), str('password'));
          this.screen = 'home';
          this.notice = 'Conta criada! Enviamos um e-mail de confirmação.';
        });
      case 'reset':
        return this.guarded(async () => {
          await acc.resetPassword(str('email'));
          this.notice = 'Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha.';
        });
      case 'delete':
        return this.guarded(async () => {
          if (str('confirm').trim().toUpperCase() !== 'EXCLUIR') throw new AuthError('unknown', 'Digite EXCLUIR para confirmar.');
          try {
            await acc.deleteAccount(data.get('local') !== null);
          } catch (err) {
            if (err instanceof AuthError && err.code === 'recent-login') {
              await acc.signOut();
              this.screen = 'home';
            }
            throw err;
          }
          this.screen = 'home';
          this.notice = 'Conta excluída. Obrigado por ter jogado com a gente.';
        });
    }
  }
}

const playtime = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

function summaryCard(title: string, s: SaveSummary, act: string): SafeHtml {
  return html`<button class="choice" data-act="${act}">
    <b>${title}</b>
    <span>Dia ${s.day}${s.money !== undefined ? ` · R$ ${s.money}` : ''}</span>
    ${s.playtimeMin !== undefined ? html`<span>${playtime(s.playtimeMin)} de jogo</span>` : ''}
    <small>salvo em ${formatDateTime(s.updatedAt)}</small>
  </button>`;
}

/** Dois progressos diferentes: o jogador escolhe; o outro vira cópia de segurança. */
export function conflictView(ctx: UiContext): View {
  return {
    locked: true,
    render: () => {
      const sync = ctx.account.snapshot().sync;
      if (sync.state !== 'conflict') return html`<h2>☁️ Tudo certo</h2><div class="row end"><button class="btn primary" data-act="conflict:done">OK</button></div>`;
      return html`<h2>☁️ Dois progressos diferentes</h2>
        <p>O progresso na nuvem é diferente do que está neste aparelho. Qual você quer manter?</p>
        <div class="choices">
          ${summaryCard('📱 Este aparelho', sync.local, 'conflict:local')}
          ${summaryCard('☁️ Nuvem', sync.cloud, 'conflict:cloud')}
        </div>
        <p class="small">O outro fica guardado como cópia de segurança neste aparelho.</p>`;
    },
    action: async (act) => {
      if (act === 'conflict:local' || act === 'conflict:cloud') {
        await ctx.account.resolveConflict(act === 'conflict:local' ? 'local' : 'cloud');
        ctx.modals.close(true);
        ctx.toast('Progresso sincronizado ☁️');
      }
      if (act === 'conflict:done') ctx.modals.close(true);
    },
  };
}
