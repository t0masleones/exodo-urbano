import { initializeApp } from 'firebase/app';
import type { FirebaseEnv } from '../../app/env';
import { isNative } from '../../platform';
import type { BackendServices } from '../account/types';
import { createAuth } from './auth';
import { createCloudStore } from './cloud';

/**
 * Ponto único de inicialização do Firebase. Este módulo é carregado sob
 * demanda (import dinâmico): quem joga sem conta nunca baixa este código e
 * nunca faz nenhuma chamada a servidores.
 */
export async function createBackend(cfg: FirebaseEnv, opts: { useEmulators: boolean; recaptchaSiteKey: string | null }): Promise<BackendServices> {
  const app = initializeApp(cfg);

  // App Check: prova que as chamadas vêm do jogo de verdade (e não de um
  // script usando a configuração pública). Na web usa reCAPTCHA Enterprise;
  // no Android/iOS usará Play Integrity / App Attest (ver docs/SEGURANCA.md).
  if (!opts.useEmulators && !isNative && opts.recaptchaSiteKey) {
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(opts.recaptchaSiteKey), isTokenAutoRefreshEnabled: true });
  }

  return {
    auth: createAuth(app, opts.useEmulators),
    cloud: createCloudStore(app, opts.useEmulators),
  };
}
