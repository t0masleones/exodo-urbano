import type { GameModal } from '../app/events';
import type { DiaryEntry } from '../core/systems/diary';
import { VOLUME_LEVELS } from '../audio/Ambience';
import { html, type SafeHtml } from './dom';
import type { HudState } from './hudState';
import { icon } from './icons';
import type { View } from './modal';
import type { UiContext } from './context';
import { wellbeingSettings } from './wellbeing';

const header = (title: string, iconId?: string) =>
  html`<div class="row"><h2>${iconId ? html`<span class="h-icon">${icon(iconId)}</span>` : ''}${title}</h2><button class="btn ghost" data-act="close" aria-label="Fechar">✕</button></div>`;

const hearts = (n: number): SafeHtml => html`${Array.from({ length: 10 }, (_, i) => icon(i < n ? 'ui:coracao' : 'ui:coracaoVazio'))}`;

/** Telas do jogo (loja, mochila, fogão, família...). Todas re-renderizam com o estado. */
export function gameViews(ctx: UiContext) {
  const hud = () => ctx.hud;

  const sleep: View = {
    render: () => html`${header('Dormir?', 'ui:lua')}
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
      const row = (s: HudState['shop'][number]) => html`
        <li><span class="em">${icon(s.key)}</span>
          <span class="grow"><b>${s.name}</b><small>${s.info} · ${s.inSeason ? 'da estação' : s.kind === 'muda' ? 'frutifica em outra época' : 'fora de época (mais lenta)'}</small></span>
          <span class="price">R$ ${s.price}</span>
          <button class="btn" data-act="buy" data-id="${s.key}" data-qty="1">+1</button>
          ${s.kind === 'semente' ? html`<button class="btn" data-act="buy" data-id="${s.key}" data-qty="5">+5</button>` : ''}
        </li>`;
      return html`${header('Van da feira', 'ui:mochila')}
        <h3>Sementes</h3>
        <p class="muted">Sementes da estação crescem no ritmo normal; fora de época, na metade.</p>
        <ul class="list">${h.shop.filter((s) => s.kind === 'semente').map(row)}</ul>
        <h3>Mudas para o pomar</h3>
        <p class="muted">Plante na grama, fora dos canteiros. Árvore não precisa de rega e nunca morre.</p>
        <ul class="list">${h.shop.filter((s) => s.kind === 'muda').map(row)}</ul>
        <p class="muted">Você tem R$ ${h.money}</p>`;
    },
    action: (act, el) => {
      if (act === 'buy') ctx.bus.emit('ui:buy', el.dataset.id ?? '', Number(el.dataset.qty));
    },
  };

  const cook: View = {
    live: true,
    render: () => {
      const h = hud();
      if (!h) return html``;
      return html`${header('Fogão a lenha', 'ui:fogao')}
        <p class="muted">A lenha vem do eucalipto. Pratos valem bem mais que os ingredientes na caixa de venda.</p>
        <ul class="list">${h.recipes.map((r) => html`
          <li><span class="em">${icon(`prato:${r.id}`)}</span>
            <span class="grow"><b>${r.name}</b>
              <small class="ingredients">${r.ingredients.map((i) => html`<span class="${i.have >= i.need ? 'ok' : 'falta'}">${icon(i.id)} ${i.have}/${i.need} ${i.name}</span>`)}</small>
              <small>vende por R$ ${r.sell}</small></span>
            <button class="btn ${r.canCook ? 'primary' : ''}" data-act="cook" data-id="${r.id}" ${r.canCook ? '' : 'disabled'}>Cozinhar</button>
          </li>`)}</ul>`;
    },
    action: (act, el) => {
      if (act === 'cook') ctx.bus.emit('ui:cook', el.dataset.id ?? '');
    },
  };

  const inventory = (selling: boolean): View => ({
    live: true,
    render: () => {
      const h = hud();
      if (!h) return html``;
      return html`${header(selling ? 'Caixa de venda' : 'Mochila', selling ? 'moeda' : 'ui:mochila')}
        ${h.inventory.length
          ? html`<ul class="list">${h.inventory.map((i) => html`
            <li><span class="em">${icon(i.id)}</span><span class="grow"><b>${i.name}</b><small>× ${i.count} · R$ ${i.sell} cada</small></span>
            ${selling ? html`<button class="btn" data-act="sell" data-id="${i.id}" data-qty="1">Vender 1</button><button class="btn" data-act="sell" data-id="${i.id}" data-qty="${i.count}">Todos</button>` : ''}
            </li>`)}</ul>`
          : html`<p class="muted">Nada por aqui ainda. Bora colher, cortar lenha ou quebrar umas pedras!</p>`}
        ${selling ? '' : html`<p class="muted">Para vender, use a caixa de madeira ao lado de casa. Para cozinhar, o fogão a lenha fica à esquerda da casa.</p>`}`;
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
      return html`${header('Família', 'ui:pata')}
        <ul class="list">
          ${h.humans.map((p) => html`<li><span class="em">${icon('ui:conta')}</span><span class="grow"><b>${p.name}</b><small>${p.detail}</small></span></li>`)}
          ${h.pets.map((p) => html`<li><span class="em">${icon(p.id === 'nix' ? 'ui:gato' : 'ui:cachorro')}</span>
            <span class="grow"><b>${p.name}</b><small>${p.breed}${p.pettedToday ? ' · já ganhou carinho hoje' : ''}</small></span>
            <span class="hearts" role="img" aria-label="${p.hearts} de 10 corações">${hearts(p.hearts)}</span></li>`)}
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

  const volumeLabel = (v: number) => (v === 0 ? 'Desligado' : v < 0.5 ? 'Baixo' : v < 0.9 ? 'Médio' : 'Alto');

  const settings: View = {
    render: () => html`${header('Opções', 'ui:engrenagem')}
      <p><b>Controles</b><br />Toque/clique: andar e agir · WASD/setas: andar · Espaço/E: agir · 1–9: ferramentas · Tab: trocar personagem.</p>
      <p class="muted">O jogo salva sozinho ao dormir, a cada hora do jogo e quando você sai do app.</p>
      <h3>Som ambiente do cerrado</h3>
      <div class="segmented" role="radiogroup" aria-label="Volume do som ambiente">
        ${VOLUME_LEVELS.map((v) => html`<button class="btn ${ctx.audio.volume === v ? 'on' : ''}" role="radio" aria-checked="${ctx.audio.volume === v ? 'true' : 'false'}" data-act="audio:volume" data-v="${v}">${volumeLabel(v)}</button>`)}
      </div>
      <p class="small">Cigarras de dia, seriema de manhã, grilos à noite e a chuva, tudo gerado pelo próprio jogo.</p>
      ${wellbeingSettings(ctx)}
      <h3>Informações</h3>
      <p class="rating"><span class="rating-badge" aria-hidden="true">L</span>
        <span>Classificação indicativa: <b>Livre</b> <span class="small">(autoclassificação)</span></span></p>
      <div class="stack">
        <button class="btn" data-act="account">${icon('ui:conta')} Conta e privacidade</button>
        <button class="btn" data-act="legal" data-page="responsaveis">Para pais e responsáveis</button>
        <button class="btn" data-act="legal" data-page="privacidade">Política de Privacidade</button>
        <button class="btn" data-act="legal" data-page="termos">Termos de Uso</button>
        <button class="btn" data-act="legal" data-page="licencas">Licenças de terceiros</button>
      </div>
      <p class="muted">Êxodo Urbano v${ctx.version}</p>
      <div class="row end"><button class="btn danger" data-act="new-game">Recomeçar do zero</button></div>`,
    action: async (act, el) => {
      if (act === 'new-game') ctx.modals.open(confirmNewGame);
      if (act === 'break:interval') {
        await ctx.wellbeing.setInterval(Number(el.dataset.min));
        ctx.modals.render();
      }
      if (act === 'audio:volume') {
        await ctx.audio.setVolume(Number(el.dataset.v));
        ctx.modals.render();
      }
    },
  };

  const views: Record<GameModal | 'bag' | 'family' | 'settings', View> = {
    sleep,
    shop,
    cook,
    sell: inventory(true),
    bag: inventory(false),
    family,
    settings,
  };
  return views;
}

export function diaryView(d: DiaryEntry): View {
  return {
    render: () => html`<h2>${d.title}</h2>
      <p class="author">— ${d.author}</p>
      ${d.lines.map((l) => html`<p>${l}</p>`)}
      <div class="row end"><button class="btn primary" data-act="close">Bom dia ${icon('ui:sol')}</button></div>`,
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
  set('season', h.season === 'chuvas' ? 'Chuvas' : 'Seca');
  set('time', h.clock);
  set('money', `R$ ${h.money}`);
  set('partner', h.partnerName);
  const seasonIcon = field('season-icon');
  if (seasonIcon) seasonIcon.innerHTML = icon(h.season === 'chuvas' ? 'ui:chuva' : 'ui:seca').value;
  const weather = field('weather');
  if (weather) {
    weather.innerHTML = icon(h.weather === 'chuva' ? 'ui:chuva' : 'ui:sol').value;
    weather.setAttribute('aria-label', h.weather === 'chuva' ? 'chovendo' : 'sol');
  }
  const hotbar = root.querySelector<HTMLElement>('.hotbar');
  if (!hotbar) return;
  hotbar.innerHTML = html`${h.slots.map((s, i) => html`
    <button class="slot ${s.key === h.selected ? 'on' : ''}" data-act="slot" data-key="${s.key}" title="${s.label} (${i + 1})" aria-label="${s.label}">
      <span class="icon">${icon(s.key)}</span>${s.count !== undefined ? html`<span class="count">${s.count}</span>` : ''}
      ${s.key.startsWith('seed:') ? html`<span class="seed">${icon('ui:broto')}</span>` : ''}
    </button>`)}`.value;
}
