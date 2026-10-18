import { bus } from '../bus';
import type { DiaryEntry } from '../systems/diary';
import type { Ambient, HudState } from './hudState';
import './hud.css';

/**
 * HUD em HTML/CSS por cima do canvas: fica nítido em qualquer tela, é fácil de
 * deixar responsivo e de trocar os emojis por ícones desenhados depois.
 */
export function initHud(root: HTMLElement) {
  root.innerHTML = `
    <div class="top">
      <div class="panel clock">
        <span data-id="day"></span><span class="sep">·</span><span data-id="season"></span>
        <span class="sep">·</span><span data-id="time"></span><span data-id="weather"></span>
      </div>
      <div class="panel money" data-id="money"></div>
      <div class="buttons">
        <button class="btn" data-act="switch" title="Trocar personagem (Tab)">🔄 <span data-id="partner"></span></button>
        <button class="btn" data-act="bag" title="Mochila">🎒</button>
        <button class="btn" data-act="family" title="Família">🐾</button>
        <button class="btn" data-act="sleep" title="Dormir">🌙</button>
        <button class="btn" data-act="fullscreen" title="Tela cheia">⛶</button>
        <button class="btn" data-act="settings" title="Opções">⚙️</button>
      </div>
    </div>
    <div class="toasts"></div>
    <div class="hotbar panel"></div>
    <div class="modal hidden"><div class="sheet"></div></div>
  `;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const field = (id: string) => $(`[data-id="${id}"]`);
  const hotbar = $('.hotbar');
  const toasts = $('.toasts');
  const modal = $('.modal');
  const sheet = $('.sheet');
  const tint = document.getElementById('tint')!;
  const rain = document.getElementById('rain')!;

  let hud: HudState | null = null;
  let renderModal: (() => string) | null = null;
  let modalLocked = false;

  // ---------------------------------------------------------------- estado
  bus.on('hud', (h: HudState) => {
    hud = h;
    field('day').textContent = `Dia ${h.day}`;
    field('season').textContent = h.seasonLabel;
    field('time').textContent = h.clock;
    field('weather').textContent = h.weather === 'chuva' ? ' 🌧️' : ' ☀️';
    field('money').textContent = `R$ ${h.money}`;
    field('partner').textContent = h.partnerName;
    hotbar.innerHTML = h.slots.map((s, i) => `
      <button class="slot ${s.key === h.selected ? 'on' : ''}" data-slot="${s.key}" title="${s.label} (${i + 1})">
        <span class="icon">${s.icon}</span>${s.count !== undefined ? `<span class="count">${s.count}</span>` : ''}
        ${s.key.startsWith('seed:') ? '<span class="seed">🌱</span>' : ''}
      </button>`).join('');
    if (renderModal) sheet.innerHTML = renderModal();
  });

  bus.on('ambient', (a: Ambient) => {
    tint.style.background = `rgba(${a.color},${a.alpha})`;
    rain.classList.toggle('on', a.rain);
  });

  bus.on('toast', (msg: string) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toasts.appendChild(el);
    while (toasts.children.length > 3) toasts.firstElementChild?.remove();
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => el.remove(), 3700);
  });

  bus.on('open', (which: 'sleep' | 'shop' | 'sell') => open(which));
  bus.on('diary', (d: DiaryEntry) => openWith(() => `
    <h2>📔 ${d.title}</h2>
    <p class="author">— ${d.author}</p>
    ${d.lines.map((l) => `<p>${l}</p>`).join('')}
    <div class="row end"><button class="btn primary" data-act="close">Bom dia ☀️</button></div>`));

  // ---------------------------------------------------------------- modais
  function openWith(render: () => string, locked = false) {
    renderModal = render;
    modalLocked = locked;
    sheet.innerHTML = render();
    modal.classList.remove('hidden');
    bus.emit('ui:modal', true);
  }

  function close() {
    renderModal = null;
    modal.classList.add('hidden');
    bus.emit('ui:modal', false);
  }

  const header = (title: string) => `<div class="row"><h2>${title}</h2><button class="btn ghost" data-act="close">✕</button></div>`;

  function open(which: string) {
    if (!hud) return;
    switch (which) {
      case 'sleep':
        return openWith(() => `${header('🌙 Dormir?')}
          <p>Encerrar o dia e acordar amanhã cedo. As plantas regadas crescem durante a noite.</p>
          <div class="row end"><button class="btn" data-act="close">Ainda não</button><button class="btn primary" data-act="do-sleep">Boa noite</button></div>`);
      case 'shop':
        return openWith(() => `${header('🚐 Kombi da feira')}
          <p class="muted">Sementes da estação crescem no ritmo normal; fora de época, na metade.</p>
          <ul class="list">${hud!.shop.map((s) => `
            <li><span class="em">${s.emoji}</span>
              <span class="grow"><b>${s.name}</b><small>${s.days} dias${s.regrow ? ` · rebrota a cada ${s.regrow}` : ''} · ${s.inSeason ? '✅ da estação' : '🐢 fora de época'}</small></span>
              <span class="price">R$ ${s.price}</span>
              <button class="btn" data-buy="${s.id}" data-qty="1">+1</button>
              <button class="btn" data-buy="${s.id}" data-qty="5">+5</button>
            </li>`).join('')}</ul>
          <p class="muted">Você tem R$ ${hud!.money}</p>`);
      case 'sell':
      case 'bag': {
        const selling = which === 'sell';
        return openWith(() => `${header(selling ? '📦 Caixa de venda' : '🎒 Mochila')}
          ${hud!.inventory.length ? `<ul class="list">${hud!.inventory.map((i) => `
            <li><span class="em">${i.emoji}</span><span class="grow"><b>${i.name}</b><small>× ${i.count} · R$ ${i.sell} cada</small></span>
            ${selling ? `<button class="btn" data-sell="${i.id}" data-qty="1">Vender 1</button><button class="btn" data-sell="${i.id}" data-qty="${i.count}">Todos</button>` : ''}
            </li>`).join('')}</ul>` : '<p class="muted">Nada por aqui ainda. Bora colher, cortar lenha ou quebrar umas pedras!</p>'}
          ${selling ? '' : '<p class="muted">Para vender, use a caixa de madeira ao lado de casa.</p>'}`);
      }
      case 'family':
        return openWith(() => `${header('🐾 Família')}
          <ul class="list">
            ${hud!.humans.map((h) => `<li><span class="em">🧑‍🌾</span><span class="grow"><b>${h.name}</b><small>${h.detail}</small></span></li>`).join('')}
            ${hud!.pets.map((p) => `<li><span class="em">${p.id === 'nix' ? '🐈' : '🐕'}</span>
              <span class="grow"><b>${p.name}</b><small>${p.breed}${p.pettedToday ? ' · já ganhou carinho hoje' : ''}</small></span>
              <span class="hearts">${'❤️'.repeat(p.hearts)}${'🤍'.repeat(10 - p.hearts)}</span></li>`).join('')}
          </ul>
          <p class="muted">Toque num bichinho para fazer carinho. Um coração por dia.</p>`);
      case 'settings':
        return openWith(() => `${header('⚙️ Opções')}
          <p><b>Controles</b><br/>Toque/clique: andar e agir · WASD/setas: andar · Espaço/E: agir · 1–9: ferramentas · Tab: trocar personagem.</p>
          <p class="muted">O jogo salva sozinho ao dormir, a cada hora do jogo e quando você sai da página.</p>
          <p class="muted">Arte provisória gerada por código. Créditos em CREDITS.md.</p>
          <div class="row end"><button class="btn danger" data-act="reset">Recomeçar do zero</button></div>`);
    }
  }

  // ---------------------------------------------------------------- cliques
  root.addEventListener('click', (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act],[data-slot],[data-buy],[data-sell]');
    if (!el) {
      if (ev.target === modal && !modalLocked) close();
      return;
    }
    const d = el.dataset;
    if (d.slot) return void bus.emit('ui:select', d.slot);
    if (d.buy) return void bus.emit('ui:buy', d.buy, Number(d.qty));
    if (d.sell) return void bus.emit('ui:sell', d.sell, Number(d.qty));
    switch (d.act) {
      case 'close': return close();
      case 'switch': return bus.emit('ui:switch');
      case 'do-sleep': close(); return bus.emit('ui:sleep');
      case 'fullscreen': return toggleFullscreen();
      case 'reset':
        if (confirm('Apagar o save e recomeçar a vida no cerrado?')) bus.emit('ui:reset');
        return;
      default: return open(d.act ?? '');
    }
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Escape' && renderModal && !modalLocked) close();
  });

  function toggleFullscreen() {
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      (doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc))?.();
      return;
    }
    if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(iosHint);
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else iosHint();
  }

  function iosHint() {
    bus.emit('toast', 'No iPhone: toque em Compartilhar → “Adicionar à Tela de Início” para jogar em tela cheia.');
  }
}
