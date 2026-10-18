import type { GameModal } from '../app/events';
import type { DiaryEntry } from '../core/systems/diary';
import { html } from './dom';
import type { HudState } from './hudState';
import type { View } from './modal';
import type { UiContext } from './context';

/** Telas do jogo (loja, mochila, família...). Todas re-renderizam com o estado. */
export function gameViews(ctx: UiContext) {
  const hud = () => ctx.hud;
  const header = (title: string) => html`<div class="row"><h2>${title}</h2><button class="btn ghost" data-act="close" aria-label="Fechar">✕</button></div>`;

  const sleep: View = {
    render: () => html`${header('🌙 Dormir?')}
      <p>Encerrar o dia e acordar amanhã cedo. As plantas regadas crescem durante a noite.</p>
      <div class="row end"><button class="btn" data-act="close">Ainda não</button><button class="btn primary" data-act="do-sleep">Boa noite</button></div>`,
    action: (act) => {
      if (act === 'do-sleep') {
        ctx.modals.close();
        ctx.bus.emit('ui:sleep');
      }
    },
  };

  const shop: View = {
    live: true,
    render: () => {
      const h = hud();
      if (!h) return html``;
      return html`${header('🚐 Van da feira')}
        <p class="muted">Sementes da estação crescem no ritmo normal; fora de época, na metade.</p>
        <ul class="list">${h.shop.map((s) => html`
          <li><span class="em">${s.emoji}</span>
            <span class="grow"><b>${s.name}</b><small>${s.days} dias${s.regrow ? ` · rebrota a cada ${s.regrow}` : ''} · ${s.inSeason ? '✅ da estação' : '🐢 fora de época'}</small></span>
            <span class="price">R$ ${s.price}</span>
            <button class="btn" data-act="buy" data-id="${s.id}" data-qty="1">+1</button>
            <button class="btn" data-act="buy" data-id="${s.id}" data-qty="5">+5</button>
          </li>`)}</ul>
        <p class="muted">Você tem R$ ${h.money}</p>`;
    },
    action: (act, el) => {
      if (act === 'buy') ctx.bus.emit('ui:buy', el.dataset.id ?? '', Number(el.dataset.qty));
    },
  };

  const inventory = (selling: boolean): View => ({
    live: true,
    render: () => {
      const h = hud();
      if (!h) return html``;
      return html`${header(selling ? '📦 Caixa de venda' : '🎒 Mochila')}
        ${h.inventory.length
          ? html`<ul class="list">${h.inventory.map((i) => html`
            <li><span class="em">${i.emoji}</span><span class="grow"><b>${i.name}</b><small>× ${i.count} · R$ ${i.sell} cada</small></span>
            ${selling ? html`<button class="btn" data-act="sell" data-id="${i.id}" data-qty="1">Vender 1</button><button class="btn" data-act="sell" data-id="${i.id}" data-qty="${i.count}">Todos</button>` : ''}
            </li>`)}</ul>`
          : html`<p class="muted">Nada por aqui ainda. Bora colher, cortar lenha ou quebrar umas pedras!</p>`}
        ${selling ? '' : html`<p class="muted">Para vender, use a caixa de madeira ao lado de casa.</p>`}`;
    },
    action: (act, el) => {
      if (act === 'sell') ctx.bus.emit('ui:sell', el.dataset.id ?? '', Number(el.dataset.qty));
    },
  });

  const family: View = {
    live: true,
    render: () => {
      const h = hud();
      if (!h) return html``;
      return html`${header('🐾 Família')}
        <ul class="list">
          ${h.humans.map((p) => html`<li><span class="em">🧑‍🌾</span><span class="grow"><b>${p.name}</b><small>${p.detail}</small></span></li>`)}
          ${h.pets.map((p) => html`<li><span class="em">${p.id === 'nix' ? '🐈' : '🐕'}</span>
            <span class="grow"><b>${p.name}</b><small>${p.breed}${p.pettedToday ? ' · já ganhou carinho hoje' : ''}</small></span>
            <span class="hearts" aria-label="${p.hearts} de 10 corações">${'❤️'.repeat(p.hearts)}${'🤍'.repeat(10 - p.hearts)}</span></li>`)}
        </ul>
        <p class="muted">Toque num bichinho para fazer carinho. Um coração por dia.</p>`;
    },
  };

  const confirmNewGame: View = {
    render: () => html`${header('Recomeçar do zero?')}
      <p>Começa uma vida nova no cerrado neste aparelho. O progresso atual fica guardado como cópia de segurança.</p>
      <div class="row end"><button class="btn" data-act="settings">Voltar</button><button class="btn danger" data-act="do-new-game">Recomeçar</button></div>`,
    action: async (act) => {
      if (act !== 'do-new-game') return;
      await ctx.saves.startNewGame();
      ctx.modals.close();
    },
  };

  const settings: View = {
    render: () => html`${header('⚙️ Opções')}
      <p><b>Controles</b><br />Toque/clique: andar e agir · WASD/setas: andar · Espaço/E: agir · 1–9: ferramentas · Tab: trocar personagem.</p>
      <p class="muted">O jogo salva sozinho ao dormir, a cada hora do jogo e quando você sai do app.</p>
      <div class="stack">
        <button class="btn" data-act="account">👤 Conta e privacidade</button>
        <button class="btn" data-act="legal" data-page="privacidade">🔒 Política de Privacidade</button>
        <button class="btn" data-act="legal" data-page="termos">📜 Termos de Uso</button>
        <button class="btn" data-act="legal" data-page="licencas">🧩 Licenças de terceiros</button>
      </div>
      <p class="muted">Êxodo Urbano v${ctx.version}</p>
      <div class="row end"><button class="btn danger" data-act="new-game">Recomeçar do zero</button></div>`,
    action: (act) => {
      if (act === 'new-game') ctx.modals.open(confirmNewGame);
    },
  };

  const views: Record<GameModal | 'bag' | 'family' | 'settings', View> = {
    sleep,
    shop,
    sell: inventory(true),
    bag: inventory(false),
    family,
    settings,
  };
  return views;
}

export function diaryView(d: DiaryEntry): View {
  return {
    render: () => html`<h2>📔 ${d.title}</h2>
      <p class="author">— ${d.author}</p>
      ${d.lines.map((l) => html`<p>${l}</p>`)}
      <div class="row end"><button class="btn primary" data-act="close">Bom dia ☀️</button></div>`,
    action: () => undefined,
  };
}

/** Atualiza a barra superior e a hotbar. */
export function renderHud(root: HTMLElement, h: HudState) {
  const field = (id: string) => root.querySelector<HTMLElement>(`[data-id="${id}"]`);
  const set = (id: string, text: string) => {
    const el = field(id);
    if (el) el.textContent = text;
  };
  set('day', `Dia ${h.day}`);
  set('season', h.seasonLabel);
  set('time', h.clock);
  set('weather', h.weather === 'chuva' ? ' 🌧️' : ' ☀️');
  set('money', `R$ ${h.money}`);
  set('partner', h.partnerName);
  const hotbar = root.querySelector<HTMLElement>('.hotbar');
  if (!hotbar) return;
  hotbar.innerHTML = html`${h.slots.map((s, i) => html`
    <button class="slot ${s.key === h.selected ? 'on' : ''}" data-act="slot" data-key="${s.key}" title="${s.label} (${i + 1})" aria-label="${s.label}">
      <span class="icon">${s.icon}</span>${s.count !== undefined ? html`<span class="count">${s.count}</span>` : ''}
      ${s.key.startsWith('seed:') ? html`<span class="seed">🌱</span>` : ''}
    </button>`)}`.value;
}
