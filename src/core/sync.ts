import type { SaveMeta } from './state/types';

/** O que a nuvem guarda sobre o save (sem precisar baixar o conteúdo inteiro para decidir). */
export interface CloudMeta {
  saveId: string;
  revision: number;
  day: number;
  /** epoch ms, carimbado pelo servidor. */
  updatedAt: number;
}

export type SyncDecision = 'upload' | 'download' | 'none' | 'conflict';

/**
 * Sincronização local-first em três vias: compara o save local e o da nuvem
 * com a última revisão que os dois tinham em comum (`syncedRevision`).
 *
 * - só o aparelho mudou  → envia
 * - só a nuvem mudou     → baixa
 * - os dois mudaram      → conflito (o jogador escolhe; nada é descartado em silêncio)
 */
export function decideSync(local: SaveMeta | null, cloud: CloudMeta | null, localPristine: boolean): SyncDecision {
  if (!cloud) return local ? 'upload' : 'none';
  if (!local || localPristine) return 'download';
  if (local.id !== cloud.saveId) return 'conflict';

  const base = local.syncedRevision;
  const localChanged = local.revision > base;
  const cloudChanged = cloud.revision > base;
  if (localChanged && cloudChanged) return 'conflict';
  if (localChanged) return 'upload';
  if (cloudChanged) return 'download';
  return 'none';
}
