import type { CloudMeta } from '../../core/sync';

export type ProviderId = 'google' | 'apple' | 'password';

/** Só o que o jogo precisa saber de quem está logado (minimização de dados). */
export interface AuthUser {
  uid: string;
  email: string | null;
  /** Google e Apple já entregam e-mail verificado; e-mail/senha precisa confirmar. */
  emailVerified: boolean;
  providers: string[];
  createdAt: string | null;
  lastSignInAt: string | null;
}

export type AuthErrorCode =
  | 'cancelled'
  | 'invalid-credentials'
  | 'email-in-use'
  | 'weak-password'
  | 'invalid-email'
  | 'too-many-requests'
  | 'network'
  | 'popup-blocked'
  | 'recent-login'
  | 'not-enabled'
  | 'unknown';

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, message: string) {
    super(message);
  }
}

export interface AuthService {
  current(): AuthUser | null;
  onChange(cb: (user: AuthUser | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signInWithApple(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  resendVerification(): Promise<void>;
  /** Recarrega o usuário e o token (depois de confirmar o e-mail). */
  refresh(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
  /** Apaga a conta de autenticação. Lança AuthError('recent-login') se o login for antigo. */
  deleteUser(): Promise<void>;
}

export interface CloudSaveRecord extends CloudMeta {
  schema: number;
  appVersion: string;
  /** GameState serializado em JSON. */
  data: string;
}

export interface CloudSaveStore {
  get(uid: string): Promise<CloudSaveRecord | null>;
  put(uid: string, rec: Omit<CloudSaveRecord, 'updatedAt'>): Promise<void>;
  remove(uid: string): Promise<void>;
}

export interface BackendServices {
  auth: AuthService;
  cloud: CloudSaveStore;
}

export interface SaveSummary {
  day: number;
  money?: number;
  /** Tempo total de jogo, para o jogador reconhecer qual progresso é qual. */
  playtimeMin?: number;
  updatedAt: number;
}

export type SyncStatus =
  | { state: 'off' }
  | { state: 'needs-verification' }
  | { state: 'syncing' }
  | { state: 'idle'; lastSyncAt: number | null }
  | { state: 'error'; message: string }
  | { state: 'conflict'; local: SaveSummary; cloud: SaveSummary };

export interface AccountSnapshot {
  /** Contas configuradas nesta build? */
  available: boolean;
  loading: boolean;
  user: AuthUser | null;
  sync: SyncStatus;
  providers: ProviderId[];
}
