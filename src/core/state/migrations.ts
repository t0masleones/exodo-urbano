import { newSaveId } from './save';
import { SAVE_SCHEMA } from './types';

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Cada migração recebe o save da versão N e devolve o da versão N+1.
 * Nunca apague migrações antigas: alguém pode abrir o jogo depois de meses.
 */
const MIGRATIONS: Record<number, (s: Json) => Json> = {
  // v1 (protótipo) → v2: adiciona metadados de sincronização.
  1: (s) => {
    const now = Date.now();
    return {
      ...s,
      version: 2,
      meta: { id: newSaveId(), revision: 1, syncedRevision: 0, createdAt: now, updatedAt: now, playtimeSec: 600, appVersion: 'legado' },
    };
  },
  // v2 → v3: pomar e fogão a lenha (contagem diária de pratos).
  2: (s) => ({
    ...s,
    version: 3,
    stats: isObj(s.stats) ? { ...s.stats, pratos: 0 } : s.stats,
  }),
};

/** Leva qualquer save conhecido até a versão atual. null = formato desconhecido. */
export function migrate(input: unknown): Json | null {
  if (!isObj(input) || typeof input.version !== 'number') return null;
  let s = input;
  while (typeof s.version === 'number' && s.version < SAVE_SCHEMA) {
    const step = MIGRATIONS[s.version];
    if (!step) return null;
    s = step(s);
  }
  return s.version === SAVE_SCHEMA ? s : null;
}
