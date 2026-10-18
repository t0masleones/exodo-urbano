import { describe, expect, it } from 'vitest';
import type { SaveMeta } from '../../src/core/state/types';
import { decideSync, type CloudMeta } from '../../src/core/sync';

const meta = (over: Partial<SaveMeta> = {}): SaveMeta => ({
  id: 'save-aaaa-1111', revision: 10, syncedRevision: 10, createdAt: 0, updatedAt: 0, playtimeSec: 600, appVersion: 't', ...over,
});
const cloud = (over: Partial<CloudMeta> = {}): CloudMeta => ({ saveId: 'save-aaaa-1111', revision: 10, day: 5, updatedAt: 0, ...over });

describe('decisão de sincronização (3 vias)', () => {
  it('sem nada na nuvem: envia o que tem', () => {
    expect(decideSync(meta(), null, false)).toBe('upload');
    expect(decideSync(null, null, false)).toBe('none');
  });

  it('aparelho novo (jogo intocado): baixa da nuvem sem perguntar', () => {
    expect(decideSync(meta({ id: 'outro-save-22' }), cloud(), true)).toBe('download');
  });

  it('só o aparelho mudou: envia', () => {
    expect(decideSync(meta({ revision: 12 }), cloud(), false)).toBe('upload');
  });

  it('só a nuvem mudou: baixa', () => {
    expect(decideSync(meta(), cloud({ revision: 15 }), false)).toBe('download');
  });

  it('nada mudou: não faz nada', () => {
    expect(decideSync(meta(), cloud(), false)).toBe('none');
  });

  it('os dois mudaram: conflito (o jogador decide)', () => {
    expect(decideSync(meta({ revision: 12 }), cloud({ revision: 15 }), false)).toBe('conflict');
  });

  it('jogos diferentes com progresso: conflito', () => {
    expect(decideSync(meta({ id: 'outro-save-22' }), cloud(), false)).toBe('conflict');
  });
});
