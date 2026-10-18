/**
 * Configuração lida das variáveis de ambiente (.env*). Nada aqui é segredo:
 * a configuração web do Firebase é pública por natureza. A proteção vem das
 * regras do Firestore, do App Check e das restrições de chave no Google Cloud.
 */
export interface FirebaseEnv {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

const e = import.meta.env;

function firebaseEnv(): FirebaseEnv | null {
  const { VITE_FIREBASE_API_KEY: apiKey, VITE_FIREBASE_AUTH_DOMAIN: authDomain, VITE_FIREBASE_PROJECT_ID: projectId, VITE_FIREBASE_APP_ID: appId } = e;
  return apiKey && authDomain && projectId && appId ? { apiKey, authDomain, projectId, appId } : null;
}

export const env = {
  appVersion: __APP_VERSION__,
  /** null = build sem contas online (o jogo funciona 100% offline). */
  firebase: firebaseEnv(),
  useEmulators: e.VITE_USE_EMULATORS === 'true',
  recaptchaSiteKey: e.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || null,
  appleOnWeb: e.VITE_AUTH_APPLE_WEB === 'true',
  siteUrl: e.VITE_PUBLIC_SITE_URL || null,
} as const;

/** Idade mínima para criar conta (LGPD art. 14 / ECA Digital). Revise com assessoria jurídica. */
export const MIN_ACCOUNT_AGE = 13;
