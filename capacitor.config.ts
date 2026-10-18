/// <reference types="@capacitor-firebase/authentication" />
import type { CapacitorConfig } from '@capacitor/cli';

/**
 * ATENÇÃO: o appId vira o "package name" na Google Play e o "bundle ID" na
 * App Store. Depois do primeiro envio às lojas ele NUNCA mais pode mudar.
 * Confirme antes de publicar (ver docs/PUBLICACAO.md).
 */
const config: CapacitorConfig = {
  appId: 'io.github.t0masleones.exodourbano',
  appName: 'Êxodo Urbano',
  webDir: 'dist',
  // Nada de server.url aqui: o app sempre roda os arquivos empacotados nele,
  // nunca uma página remota (evita sequestro de conteúdo e funciona offline).
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'never',
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    // Tela cheia: barras do sistema escondidas; recortes de câmera viram
    // variáveis CSS (--safe-area-inset-*) usadas pelo HUD.
    SystemBars: {
      hidden: true,
      insetsHandling: 'css',
    },
    FirebaseAuthentication: {
      // O login social acontece no SDK nativo; a sessão fica no SDK JS do Firebase.
      skipNativeAuth: true,
      providers: ['google.com', 'apple.com'],
    },
  },
  experimental: {
    ios: {
      spm: {
        swiftToolsVersion: '6.1',
        packageOptions: {
          '@capacitor-firebase/authentication': { symlink: true },
        },
        // Só o SDK do Google Sign-In; o do Facebook não entra no app.
        packageTraits: {
          '@capacitor-firebase/authentication': ['Google'],
        },
      },
    },
  },
};

export default config;
