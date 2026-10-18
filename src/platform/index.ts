import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';

/**
 * Tudo que muda entre navegador, Android e iOS passa por aqui. O resto do
 * código não sabe (nem precisa saber) em qual plataforma está rodando.
 */
export type PlatformName = 'web' | 'android' | 'ios';
export const platformName = Capacitor.getPlatform() as PlatformName;
export const isNative = Capacitor.isNativePlatform();

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * Armazenamento persistente: SharedPreferences (Android), UserDefaults (iOS)
 * e localStorage (web). No iOS o localStorage do WebView pode ser apagado
 * pelo sistema, por isso os saves não ficam lá.
 */
export const storage: KeyValueStore = {
  async get(key) {
    try {
      return (await Preferences.get({ key })).value;
    } catch {
      return null;
    }
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
  async remove(key) {
    try {
      await Preferences.remove({ key });
    } catch {
      /* armazenamento indisponível (ex.: navegação privada) */
    }
  },
};

/** Save da versão protótipo, que usava localStorage direto (só existe no navegador). */
export const legacySave = {
  key: 'exodo-urbano:save:v1',
  read(): string | null {
    try {
      return globalThis.localStorage?.getItem(this.key) ?? null;
    } catch {
      return null;
    }
  },
  clear() {
    try {
      globalThis.localStorage?.removeItem(this.key);
    } catch {
      /* ignore */
    }
  },
};

/** Avisa quando o app vai para segundo plano (hora de salvar) e quando volta. */
export function onLifecycle(handlers: { pause: () => void; resume: () => void }) {
  if (isNative) {
    void App.addListener('pause', handlers.pause);
    void App.addListener('resume', handlers.resume);
    return;
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? handlers.pause() : handlers.resume()));
  window.addEventListener('pagehide', handlers.pause);
}

/** Botão "voltar" do Android: `handler` retorna true se tratou (ex.: fechou um modal). */
export function onBackButton(handler: () => boolean) {
  if (platformName !== 'android') return;
  void App.addListener('backButton', () => {
    if (!handler()) void App.minimizeApp();
  });
}

/** Entrega um arquivo de texto ao jogador: download no navegador, compartilhar no celular. */
export async function shareTextFile(filename: string, text: string, title: string) {
  if (!isNative) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const res = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
  await Share.share({ title, files: [res.uri] });
}

/** Tela cheia no navegador. No app, Android/iOS já abrem em modo imersivo. */
export const canToggleFullscreen = !isNative;
