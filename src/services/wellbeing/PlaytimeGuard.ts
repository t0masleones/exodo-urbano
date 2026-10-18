import type { Bus } from '../../app/events';
import type { KeyValueStore } from '../../platform';

const KEY = 'wellbeing:v1';
/** Intervalos oferecidos ao jogador, em minutos (0 = desligado). */
export const BREAK_OPTIONS = [30, 60, 90, 120, 0] as const;
export const DEFAULT_BREAK_MIN = 60;
/** Ficar fora do jogo por mais que isso já conta como pausa. */
const AWAY_COUNTS_AS_BREAK_MS = 10 * 60_000;
/** Saltos maiores que isso (aba escondida, app suspenso) não contam como tempo jogado. */
const MAX_TICK_SEC = 5;

interface Stored {
  intervalMin: number;
  day: string;
  todaySec: number;
}

export function localDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Mecanismo contra uso excessivo (Decreto nº 12.880/2026, que regulamenta o
 * ECA Digital). Conta o tempo real em que o jogo está de fato rodando e, a
 * cada intervalo, sugere uma pausa, sem bloquear e sem punir. O jogo também
 * não tem login diário premiado, sequências, notificações nem timers que
 * obriguem a voltar. Tudo fica só no aparelho.
 */
export class PlaytimeGuard {
  intervalMin: number = DEFAULT_BREAK_MIN;
  private day: string;
  private todaySec = 0;
  private sinceBreakSec = 0;
  private unsavedSec = 0;
  private pausedAt: number | null = null;

  constructor(
    private storage: KeyValueStore,
    private bus: Bus,
    private now: () => Date = () => new Date(),
  ) {
    this.day = localDay(this.now());
  }

  async load() {
    try {
      const raw = await this.storage.get(KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as Partial<Stored>;
      if ((BREAK_OPTIONS as readonly number[]).includes(s.intervalMin as number)) this.intervalMin = s.intervalMin as number;
      if (s.day === this.day && typeof s.todaySec === 'number' && Number.isFinite(s.todaySec) && s.todaySec >= 0) {
        this.todaySec = Math.min(s.todaySec, 86_400);
      }
    } catch {
      /* valor estragado: começa do zero */
    }
  }

  /** Chamado pelo jogo a cada quadro, só enquanto ele está rodando de verdade. */
  tick(dtSec: number) {
    if (!(dtSec > 0) || dtSec > MAX_TICK_SEC) return;
    const day = localDay(this.now());
    if (day !== this.day) {
      this.day = day;
      this.todaySec = 0;
    }
    this.todaySec += dtSec;
    this.sinceBreakSec += dtSec;
    this.unsavedSec += dtSec;
    if (this.intervalMin > 0 && this.sinceBreakSec >= this.intervalMin * 60) {
      this.sinceBreakSec = 0;
      this.bus.emit('wellbeing:break', this.todayMinutes);
    }
    if (this.unsavedSec >= 60) void this.persist();
  }

  /** O jogador fez uma pausa (pelo lembrete ou saindo do app por um tempo). */
  tookBreak() {
    this.sinceBreakSec = 0;
  }

  onAppPause() {
    this.pausedAt = this.now().getTime();
    void this.persist();
  }

  onAppResume() {
    if (this.pausedAt !== null && this.now().getTime() - this.pausedAt >= AWAY_COUNTS_AS_BREAK_MS) this.tookBreak();
    this.pausedAt = null;
  }

  async setInterval(min: number) {
    if (!(BREAK_OPTIONS as readonly number[]).includes(min)) return;
    this.intervalMin = min;
    this.sinceBreakSec = 0;
    await this.persist();
  }

  get todayMinutes() {
    return Math.floor(this.todaySec / 60);
  }

  async persist() {
    this.unsavedSec = 0;
    const value: Stored = { intervalMin: this.intervalMin, day: this.day, todaySec: Math.round(this.todaySec) };
    await this.storage.set(KEY, JSON.stringify(value)).catch(() => undefined);
  }
}
