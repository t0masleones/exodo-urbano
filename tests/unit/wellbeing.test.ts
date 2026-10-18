import { describe, expect, it } from 'vitest';
import { createBus } from '../../src/app/events';
import type { KeyValueStore } from '../../src/platform';
import { PlaytimeGuard, localDay } from '../../src/services/wellbeing/PlaytimeGuard';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: async (k) => data.get(k) ?? null,
    set: async (k, v) => void data.set(k, v),
    remove: async (k) => void data.delete(k),
  };
}

function setup(start = new Date(2026, 9, 18, 10, 0, 0)) {
  let now = start.getTime();
  const store = memoryStore();
  const bus = createBus();
  const breaks: number[] = [];
  bus.on('wellbeing:break', (min) => breaks.push(min));
  const guard = new PlaytimeGuard(store, bus, () => new Date(now));
  const play = (seconds: number) => {
    for (let s = 0; s < seconds; s++) {
      now += 1000;
      guard.tick(1);
    }
  };
  const wait = (ms: number) => (now += ms);
  return { guard, store, breaks, play, wait };
}

describe('lembrete de pausa (ECA Digital: uso excessivo)', () => {
  it('sugere pausa a cada 1 hora de jogo por padrão', () => {
    const { breaks, play } = setup();
    play(59 * 60);
    expect(breaks).toEqual([]);
    play(60);
    expect(breaks).toEqual([60]);
    play(60 * 60);
    expect(breaks).toEqual([60, 120]);
  });

  it('pode ser ajustado ou desligado, e só aceita opções válidas', async () => {
    const { guard, breaks, play } = setup();
    await guard.setInterval(30);
    play(30 * 60);
    expect(breaks.length).toBe(1);
    await guard.setInterval(0);
    play(3 * 60 * 60);
    expect(breaks.length).toBe(1);
    await guard.setInterval(7);
    expect(guard.intervalMin).toBe(0);
  });

  it('sair do app por 10 min ou mais conta como pausa', () => {
    const { guard, breaks, play, wait } = setup();
    play(50 * 60);
    guard.onAppPause();
    wait(15 * 60_000);
    guard.onAppResume();
    play(50 * 60);
    expect(breaks).toEqual([]);
  });

  it('ignora saltos de tempo (aba escondida, app suspenso)', () => {
    const { guard } = setup();
    guard.tick(3600);
    guard.tick(-5);
    guard.tick(Number.NaN);
    expect(guard.todayMinutes).toBe(0);
  });

  it('o tempo de hoje zera na virada do dia e sobrevive a reinícios', async () => {
    const { guard, store, play, wait } = setup(new Date(2026, 9, 18, 23, 0, 0));
    play(30 * 60);
    await guard.persist();
    const again = new PlaytimeGuard(store, createBus(), () => new Date(2026, 9, 18, 23, 40, 0));
    await again.load();
    expect(again.todayMinutes).toBe(30);
    wait(60 * 60_000);
    play(60);
    expect(guard.todayMinutes).toBe(1);
  });

  it('valores estragados no armazenamento não quebram nada', async () => {
    const store = memoryStore();
    store.data.set('wellbeing:v1', '{"intervalMin":"muito","todaySec":-9,"day":"x"}');
    const guard = new PlaytimeGuard(store, createBus());
    await guard.load();
    expect(guard.intervalMin).toBe(60);
    expect(guard.todayMinutes).toBe(0);
  });

  it('dia local no formato AAAA-MM-DD', () => {
    expect(localDay(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});
