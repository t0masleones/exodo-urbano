import type { Bus } from '../app/events';
import { canToggleFullscreen, onBackButton } from '../platform';
import type { Account } from '../services/account/Account';
import type { SaveManager } from '../services/save/SaveManager';
import { AccountView, conflictView } from './account';
import type { LegalPage, UiContext } from './context';
import { html, setHtml } from './dom';
import { diaryView, gameViews, renderHud } from './hud';
import { Modals, type View } from './modal';
import './hud.css';

const LEGAL: Record<LegalPage, { title: string; src: string }> = {
  privacidade: { title: 'Política de Privacidade', src: 'legal/privacidade.html' },
  termos: { title: 'Termos de Uso', src: 'legal/termos.html' },
  exclusao: { title: 'Exclusão de conta e dados', src: 'legal/exclusao-de-conta.html' },
  licencas: { title: 'Licenças de terceiros', src: 'licenses.txt' },
};

/**
 * Interface em HTML/CSS por cima do canvas: nítida em qualquer tela, acessível
 * a leitores de tela e fácil de trocar os emojis por ícones próprios depois.
 */
export function initUi(root: HTMLElement, deps: { bus: Bus; account: Account; saves: SaveManager; version: string }) {
  setHtml(root, html`
    <div class="top">
      <div class="panel clock" aria-live="off">
        <span data-id="day"></span><span class="sep">·</span><span data-id="season"></span>
        <span class="sep">·</span><span data-id="time"></span><span data-id="weather"></span>
      </div>
      <div class="panel money" data-id="money"></div>
      <div class="buttons">
        <button class="btn" data-act="switch" title="Trocar personagem (Tab)">🔄 <span data-id="partner"></span></button>
        <button class="btn" data-act="bag" title="Mochila" aria-label="Mochila">🎒</button>
        <button class="btn" data-act="family" title="Família" aria-label="Família">🐾</button>
        <button class="btn" data-act="account" title="Conta" aria-label="Conta">👤</button>
        <button class="btn" data-act="sleep" title="Dormir" aria-label="Dormir">🌙</button>
        ${canToggleFullscreen ? html`<button class="btn" data-act="fullscreen" title="Tela cheia" aria-label="Tela cheia">⛶</button>` : ''}
        <button class="btn" data-act="settings" title="Opções" aria-label="Opções">⚙️</button>
      </div>
    </div>
    <div class="toasts" role="status" aria-live="polite"></div>
    <div class="hotbar panel" role="toolbar" aria-label="Ferramentas"></div>
    <div class="modal hidden"><div class="sheet" role="dialog" aria-modal="true"></div></div>
  `);

  const { bus } = deps;
  const overlay = root.querySelector<HTMLElement>('.modal')!;
  const sheet = root.querySelector<HTMLElement>('.sheet')!;
  const toasts = root.querySelector<HTMLElement>('.toasts')!;
  const tint = document.getElementById('tint');
  const rain = document.getElementById('rain');
  const modals = new Modals(overlay, sheet, (open) => bus.emit('ui:modal', open));

  const toast = (msg: string) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toasts.appendChild(el);
    while (toasts.children.length > 3) toasts.firstElementChild?.remove();
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => el.remove(), 3700);
  };

  const openLegal = (page: LegalPage) => {
    const doc = LEGAL[page];
    const previous = modals.current;
    const view: View = {
      wide: true,
      render: () => html`<div class="row"><h2>${doc.title}</h2><button class="btn ghost" data-act="legal-back" aria-label="Fechar">✕</button></div>
        <iframe class="legal" src="${doc.src}" title="${doc.title}" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer"></iframe>`,
      action: (act) => {
        if (act !== 'legal-back') return;
        if (previous) modals.open(previous);
        else modals.close();
      },
    };
    modals.open(view);
  };

  const ctx: UiContext = { ...deps, modals, hud: null, toast, openLegal };
  const views = gameViews(ctx);
  let conflict: View | null = null;

  bus.on('hud', (h) => {
    ctx.hud = h;
    renderHud(root, h);
    modals.refreshLive();
  });
  bus.on('ambient', (a) => {
    if (tint) tint.style.background = `rgba(${a.color},${a.alpha})`;
    rain?.classList.toggle('on', a.rain);
  });
  bus.on('toast', toast);
  bus.on('open', (which) => modals.open(views[which]));
  bus.on('diary', (d) => modals.open(diaryView(d)));
  bus.on('account', (snap) => {
    if (snap.sync.state === 'conflict' && modals.current !== conflict) {
      conflict = conflictView(ctx);
      modals.open(conflict);
    } else if (modals.current instanceof AccountView || modals.current === conflict) {
      modals.render();
    }
  });

  const globalActions: Record<string, (el: HTMLElement) => void> = {
    close: () => modals.close(),
    switch: () => bus.emit('ui:switch'),
    bag: () => modals.open(views.bag),
    family: () => modals.open(views.family),
    settings: () => modals.open(views.settings),
    sleep: () => modals.open(views.sleep),
    account: () => modals.open(new AccountView(ctx)),
    fullscreen: () => toggleFullscreen(toast),
    legal: (el) => openLegal((el.dataset.page as LegalPage) ?? 'privacidade'),
    slot: (el) => bus.emit('ui:select', el.dataset.key ?? ''),
  };

  root.addEventListener('click', (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el) {
      if (ev.target === overlay) modals.close();
      return;
    }
    const act = el.dataset.act ?? '';
    const global = globalActions[act];
    if (global) return global(el);
    void modals.run(modals.current?.action?.(act, el));
  });

  root.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const form = ev.target as HTMLFormElement;
    void modals.run(modals.current?.submit?.(form, new FormData(form)));
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Escape') modals.close();
  });
  onBackButton(() => modals.close());

  return ctx;
}

function toggleFullscreen(toast: (msg: string) => void) {
  const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  const iosHint = () => toast('No iPhone: toque em Compartilhar → “Adicionar à Tela de Início” para jogar em tela cheia.');
  if (doc.fullscreenElement || doc.webkitFullscreenElement) {
    (doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc))?.();
    return;
  }
  if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(iosHint);
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else iosHint();
}
