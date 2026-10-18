import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * Content Security Policy: a página só executa scripts do próprio jogo e dos
 * domínios do Google necessários para login e App Check. Um script injetado
 * (XSS) não roda, e a página não consegue mandar dados para outros domínios.
 * Vale no navegador e dentro do app (WebView). frame-ancestors (anti-clickjacking)
 * vai como cabeçalho HTTP em firebase.json, porque não funciona em <meta>.
 */
export function contentSecurityPolicy(useEmulators: boolean): string {
  const google = ['https://apis.google.com', 'https://www.gstatic.com', 'https://www.google.com', 'https://www.recaptcha.net'];
  const emulators = useEmulators ? ['http://127.0.0.1:9099', 'http://127.0.0.1:8080', 'http://localhost:9099', 'http://localhost:8080'] : [];
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...google],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https://www.gstatic.com', 'https://www.google.com'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", 'https://*.googleapis.com', 'https://*.firebaseio.com', 'https://www.google.com', 'https://www.recaptcha.net', ...emulators],
    'frame-src': ["'self'", 'https://*.firebaseapp.com', 'https://*.web.app', 'https://accounts.google.com', 'https://www.google.com', 'https://recaptcha.google.com', 'https://www.recaptcha.net', ...emulators],
    'media-src': ["'self'", 'data:', 'blob:'],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
  };
  const policy = Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`);
  if (!useEmulators) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}

function cspPlugin(policy: string): Plugin {
  return {
    name: 'exodo-csp',
    apply: 'build', // no modo dev o Vite precisa de scripts inline para o hot reload
    transformIndexHtml(html) {
      return html.replace('<!--CSP-->', `<meta http-equiv="Content-Security-Policy" content="${policy}" />`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    // base relativo: funciona em subpastas (GitHub Pages) e dentro do app (Capacitor)
    base: './',
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    plugins: [cspPlugin(contentSecurityPolicy(env.VITE_USE_EMULATORS === 'true'))],
    build: {
      target: 'es2022',
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
    },
  };
});
