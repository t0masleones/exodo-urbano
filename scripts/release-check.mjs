// Checagem antes de publicar nas lojas: npm run release:check
// Falha (código 1) se algo bloqueante estiver pendente. Ver docs/PUBLICACAO.md.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const fails = [];
const warns = [];
const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : '');

// 1. Textos legais e licença sem campos por preencher
const legalFiles = ['LICENSE', ...readdirSync('public/legal').filter((f) => f.endsWith('.html')).map((f) => `public/legal/${f}`)];
for (const f of legalFiles) if (read(f).includes('[PREENCHER')) fails.push(`${f}: ainda tem campos [PREENCHER ...]`);

// 2. Nada sensível versionado no git
const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n');
const forbidden = [
  [/(^|\/)\.env(\.[\w.-]+)?$/, (f) => !/\.env\.(example|emulator)$/.test(f)],
  [/google-services\.json$/, () => true],
  [/GoogleService-Info\.plist$/, () => true],
  [/\.(jks|keystore|p12|p8|mobileprovision)$/, () => true],
  [/service-?account.*\.json$/i, () => true],
];
for (const f of tracked) for (const [re, really] of forbidden) if (re.test(f) && really(f)) fails.push(`arquivo sensível versionado: ${f}`);

// 3. O app não pode carregar conteúdo remoto
if (/server\s*:\s*{[^}]*url\s*:/s.test(read('capacitor.config.ts'))) fails.push('capacitor.config.ts tem server.url (live reload): remova antes de publicar');

// 4. Build pronto, com CSP e avisos de licença
const index = read('dist/index.html');
if (!index) warns.push('dist/ não existe: rode "npm run build" antes de "npx cap sync"');
else if (!index.includes('Content-Security-Policy')) fails.push('dist/index.html sem Content-Security-Policy');
if (!existsSync('dist/licenses.txt')) warns.push('dist/licenses.txt ausente (rode "npm run build")');

// 5. Versões alinhadas
const version = JSON.parse(read('package.json')).version;
const gradle = read('android/app/build.gradle');
if (gradle && !gradle.includes(`versionName "${version}"`)) warns.push(`android: versionName diferente de ${version} (lembre de subir também o versionCode)`);

for (const w of warns) console.warn(`⚠️  ${w}`);
for (const f of fails) console.error(`❌ ${f}`);
if (fails.length) {
  console.error(`\n${fails.length} pendência(s) bloqueante(s). Veja docs/PUBLICACAO.md.`);
  process.exit(1);
}
console.log('✅ Nada bloqueante. Siga o checklist manual em docs/PUBLICACAO.md.');
