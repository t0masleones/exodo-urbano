import type { FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  OAuthProvider,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { isNative } from '../../platform';
import { AuthError, type AuthErrorCode, type AuthService, type AuthUser } from '../account/types';

const VERIFIED_PROVIDERS = new Set(['google.com', 'apple.com']);
/** O Firebase exige login recente (~5 min) para apagar a conta. Conferimos antes de apagar dados. */
const RECENT_LOGIN_MS = 4 * 60_000;

function toAuthUser(u: User): AuthUser {
  const providers = u.providerData.map((p) => p.providerId);
  return {
    uid: u.uid,
    email: u.email,
    emailVerified: u.emailVerified || providers.some((p) => VERIFIED_PROVIDERS.has(p)),
    providers,
    createdAt: u.metadata.creationTime ?? null,
    lastSignInAt: u.metadata.lastSignInTime ?? null,
  };
}

const MESSAGES: Record<AuthErrorCode, string> = {
  cancelled: 'Login cancelado.',
  'invalid-credentials': 'E-mail ou senha incorretos.',
  'email-in-use': 'Já existe uma conta com esse e-mail. Tente entrar.',
  'weak-password': 'Senha fraca: use pelo menos 8 caracteres, misturando letras e números.',
  'invalid-email': 'Esse e-mail não parece válido.',
  'too-many-requests': 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  network: 'Sem conexão com a internet.',
  'popup-blocked': 'O navegador bloqueou a janela de login. Permita pop-ups para este site.',
  'recent-login': 'Por segurança, entre de novo na sua conta e repita a operação.',
  'not-enabled': 'Esse tipo de login ainda não está ativado.',
  unknown: 'Não foi possível concluir agora. Tente novamente.',
};

/** Traduz erros do Firebase sem vazar detalhes internos para a tela. */
export function mapAuthError(err: unknown): AuthError {
  const code = (err as { code?: string })?.code ?? '';
  const msg = String((err as { message?: string })?.message ?? '').toLowerCase();
  const pick = (c: AuthErrorCode) => new AuthError(c, MESSAGES[c]);
  if (err instanceof AuthError) return err;
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(code)) return pick('invalid-credentials');
  if (code === 'auth/email-already-in-use') return pick('email-in-use');
  if (code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements') return pick('weak-password');
  if (code === 'auth/invalid-email') return pick('invalid-email');
  if (code === 'auth/too-many-requests') return pick('too-many-requests');
  if (code === 'auth/network-request-failed') return pick('network');
  if (code === 'auth/popup-blocked') return pick('popup-blocked');
  if (code === 'auth/requires-recent-login') return pick('recent-login');
  if (code === 'auth/operation-not-allowed') return pick('not-enabled');
  if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'].includes(code) || msg.includes('cancel')) return pick('cancelled');
  console.warn('Erro de autenticação não mapeado', code || err);
  return pick('unknown');
}

export function createAuth(app: FirebaseApp, useEmulator: boolean): AuthService {
  // No app (WebView), getAuth() tenta carregar o resolvedor de pop-up do Google,
  // que não funciona ali: o login social é feito pelo SDK nativo.
  const auth: Auth = isNative
    ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
    : initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence], popupRedirectResolver: browserPopupRedirectResolver });
  auth.languageCode = 'pt-BR';
  if (useEmulator) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

  const wrap = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      throw mapAuthError(err);
    }
  };

  const nativeAuth = () => import('@capacitor-firebase/authentication').then((m) => m.FirebaseAuthentication);

  return {
    current: () => (auth.currentUser ? toAuthUser(auth.currentUser) : null),

    onChange: (cb) => onAuthStateChanged(auth, (u) => cb(u ? toAuthUser(u) : null)),

    signInWithGoogle: () => wrap(async () => {
      if (isNative) {
        const native = await nativeAuth();
        const res = await native.signInWithGoogle({ skipNativeAuth: true });
        const idToken = res.credential?.idToken;
        if (!idToken) throw new AuthError('cancelled', MESSAGES.cancelled);
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      }
    }),

    signInWithApple: () => wrap(async () => {
      if (isNative) {
        const native = await nativeAuth();
        const res = await native.signInWithApple({ skipNativeAuth: true });
        const idToken = res.credential?.idToken;
        if (!idToken) throw new AuthError('cancelled', MESSAGES.cancelled);
        const credential = new OAuthProvider('apple.com').credential({ idToken, rawNonce: res.credential?.nonce });
        await signInWithCredential(auth, credential);
      } else {
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        await signInWithPopup(auth, provider);
      }
    }),

    signInWithEmail: (email, password) => wrap(() => signInWithEmailAndPassword(auth, email, password)),

    signUpWithEmail: (email, password) => wrap(async () => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
    }),

    sendPasswordReset: (email) => wrap(() => sendPasswordResetEmail(auth, email)),

    resendVerification: () => wrap(async () => {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser);
    }),

    refresh: async () => {
      const u = auth.currentUser;
      if (!u) return null;
      try {
        await reload(u);
        // token novo: as regras do Firestore passam a ver email_verified = true
        await u.getIdToken(true);
      } catch (err) {
        throw mapAuthError(err);
      }
      return toAuthUser(u);
    },

    signOut: () => wrap(async () => {
      await signOut(auth);
      if (isNative) await (await nativeAuth()).signOut().catch(() => undefined);
    }),

    deleteUser: () => wrap(async () => {
      const u = auth.currentUser;
      if (!u) return;
      const last = Date.parse(u.metadata.lastSignInTime ?? '');
      if (!Number.isFinite(last) || Date.now() - last > RECENT_LOGIN_MS) throw new AuthError('recent-login', MESSAGES['recent-login']);
      await deleteUser(u);
    }),
  };
}
