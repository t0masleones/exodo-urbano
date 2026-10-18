import { BREAK_OPTIONS } from '../services/wellbeing/PlaytimeGuard';
import type { UiContext } from './context';
import { html, type SafeHtml } from './dom';
import type { View } from './modal';

export const formatMinutes = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/** Lembrete gentil: nunca bloqueia, nunca pune, sempre oferece sair. */
export function breakView(ctx: UiContext, minutesToday: number): View {
  return {
    render: () => html`<h2>🌅 Que tal uma pausa?</h2>
      <p>Hoje você já jogou <b>${formatMinutes(minutesToday)}</b>. Bebe uma água, estica as pernas, olha um pouco pela janela.</p>
      <p class="muted">A fazenda espera sem pressa: nada estraga enquanto você descansa.</p>
      <div class="row end">
        <button class="btn" data-act="break:continue">Jogar mais um pouco</button>
        <button class="btn primary" data-act="break:pause">Fazer uma pausa</button>
      </div>
      <p class="small">Você pode mudar a frequência deste lembrete em ⚙️ Opções.</p>`,
    action: (act) => {
      if (act === 'break:continue') ctx.modals.close();
      if (act === 'break:pause') {
        ctx.bus.emit('app:pause'); // salva o jogo
        ctx.modals.open(pausedView(ctx));
      }
    },
  };
}

function pausedView(ctx: UiContext): View {
  return {
    render: () => html`<h2>⏸️ Jogo pausado</h2>
      <p>O progresso está salvo. Quando quiser voltar, é só tocar no botão.</p>
      <div class="row end"><button class="btn primary" data-act="break:resume">Voltar a jogar</button></div>`,
    action: (act) => {
      if (act !== 'break:resume') return;
      ctx.wellbeing.tookBreak();
      ctx.modals.close();
    },
  };
}

/** Bloco "Bem-estar" da tela de opções. */
export function wellbeingSettings(ctx: UiContext): SafeHtml {
  const w = ctx.wellbeing;
  const label = (min: number) => (min === 0 ? 'Desligado' : formatMinutes(min));
  return html`<h3>🌿 Bem-estar</h3>
    <p class="small">Tempo de jogo hoje: <b>${formatMinutes(w.todayMinutes)}</b></p>
    <p class="small">Lembrete de pausa:</p>
    <div class="segmented" role="radiogroup" aria-label="Lembrete de pausa">
      ${BREAK_OPTIONS.map((min) => html`<button class="btn ${w.intervalMin === min ? 'on' : ''}" role="radio" aria-checked="${w.intervalMin === min ? 'true' : 'false'}" data-act="break:interval" data-min="${min}">${label(min)}</button>`)}
    </div>`;
}
