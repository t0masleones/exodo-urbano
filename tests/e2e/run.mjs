// Teste de ponta a ponta: jogo real (build "emulator") + emuladores do Firebase + navegador.
// Uso: npm run test:e2e   (precisa de Java 21; navegador: Edge no Windows, Chrome no resto,
// ou defina E2E_BROWSER=chrome|msedge)
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const OUT = 'test-results/e2e';
const PORT = 4173;
const APP = `http://127.0.0.1:${PORT}/`;
const AUTH = 'http://127.0.0.1:9099';
const FS_ROOT = 'http://127.0.0.1:8080/v1/projects/demo-exodo/databases/(default)/documents';
const CHANNEL = process.env.E2E_BROWSER ?? (process.platform === 'win32' ? 'msedge' : 'chrome');

const IN_CI = !!process.env.GITHUB_ACTIONS;

mkdirSync(OUT, { recursive: true });
const results = [];
/** No GitHub Actions, falhas viram anotações legíveis na página da execução. */
function annotate(title, message) {
  if (!IN_CI) return;
  const enc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  console.log(`::error title=${enc(title).replace(/[:,]/g, ' ')}::${enc(message)}`);
}
const ok = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond });
  console.log(cond ? '  ✔' : '  ✘', name, cond ? '' : extra);
  if (!cond) annotate(`e2e: ${name}`, extra || 'verificação falhou');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const openPages = [];
let phase = 'início';
const stage = (name) => {
  phase = name;
  console.log(name);
};

function watch(page, tag) {
  const issues = [];
  page.on('console', (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to/i.test(t)) issues.push(`CSP: ${t}`);
    else if (m.type() === 'error') issues.push(`console.error: ${t}`);
  });
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`));
  page.on('dialog', (d) => d.dismiss());
  openPages.push(page);
  return Object.assign(page, { issues, tag });
}

async function closeModal(page) {
  for (let i = 0; i < 3 && (await page.locator('.modal:not(.hidden)').count()); i++) {
    const btn = page.locator('.sheet [data-act="close"]').last();
    if (await btn.count()) await btn.click();
    else await page.keyboard.press('Escape');
    await sleep(150);
  }
}

const save = async (page) => JSON.parse(await page.evaluate(() => localStorage.getItem('CapacitorStorage.save:v2') ?? 'null'));
const sheetText = (page) => page.locator('.sheet').innerText();
const firestore = async (path) => (await fetch(`${FS_ROOT}/${path}`, { headers: { Authorization: 'Bearer owner' } })).json();
const AGE_SUBMIT = 'form[data-form=age] button[type=submit]';
const EMAIL = 'carol@exemplo.com.br';
const PASSWORD = 'cerrado2026';

async function run() {
  // 1. Convidado: joga offline, sem nenhuma requisição externa
  stage('Convidado');
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const a = watch(await ctxA.newPage(), 'desktop');
  const external = [];
  a.on('request', (r) => {
    if (!r.url().startsWith(APP)) external.push(r.url());
  });
  await a.goto(APP);
  await a.waitForSelector('canvas');
  await a.waitForSelector('.sheet h2');
  ok('diário de abertura num jogo novo', (await sheetText(a)).includes('Êxodo Urbano'));
  await a.click('text=Bom dia');
  ok('hotbar com ferramentas e sementes', (await a.locator('.hotbar .slot').count()) >= 8);

  // Anda, ara, planta e rega. Espaço faz carinho se um pet estiver na frente
  // (o Kuririn segue o jogador), então confere pelo HUD e tenta de novo.
  const seeds = () => a.locator('.slot[data-key="seed:milho"] .count').innerText().then(Number);
  let planted = false;
  for (let attempt = 0; attempt < 5 && !planted; attempt++) {
    await a.keyboard.down('ArrowRight');
    await sleep(attempt === 0 ? 700 : 300);
    await a.keyboard.up('ArrowRight');
    for (const key of ['Digit2', 'Digit6', 'Digit3']) {
      await a.keyboard.press(key);
      await a.keyboard.press('Space');
      await sleep(200);
    }
    planted = (await seeds()) < 6;
  }
  ok('arar e plantar pelo teclado', planted);
  await a.click('[data-act="sleep"]');
  await a.click('text=Boa noite');
  await a.waitForSelector('.sheet >> text=Dia 2', { timeout: 10_000 });
  await a.screenshot({ path: `${OUT}/1-dia2.png` });
  await closeModal(a);
  const s1 = await save(a);
  ok('save local: dia 2 com milho plantado', s1?.day === 2 && Object.values(s1.tiles).some((t) => t.crop?.id === 'milho'),
    `dia=${s1?.day} tiles=${JSON.stringify(s1?.tiles)}`);
  ok('convidado não faz requisições externas', external.length === 0, external.slice(0, 3).join(' '));
  ok('convidado nem baixa o código do Firebase', !(await a.evaluate(() => performance.getEntriesByType('resource').some((r) => /firebase-/.test(r.name)))));

  // 2. Opções: classificação, bem-estar e páginas legais
  stage('Opções e documentos');
  await a.click('[data-act="settings"]');
  const settings = await sheetText(a);
  ok('classificação indicativa Livre visível', settings.includes('Classificação indicativa: Livre'));
  ok('tempo de jogo e lembrete de pausa visíveis', settings.includes('Tempo de jogo hoje') && settings.includes('Lembrete de pausa'));
  await a.click('[data-act="break:interval"][data-min="30"]');
  const stored = await a.evaluate(() => JSON.parse(localStorage.getItem('CapacitorStorage.wellbeing:v1') ?? '{}'));
  ok('intervalo do lembrete ajustável e salvo no aparelho', stored.intervalMin === 30);
  await a.click('.sheet [data-page="responsaveis"]');
  ok('página para pais e responsáveis abre', (await a.frameLocator('iframe.legal').locator('h1').innerText()).includes('Para pais e responsáveis'));
  await a.click('[data-act="legal-back"]');
  await a.click('.sheet [data-page="privacidade"]');
  const policy = await a.frameLocator('iframe.legal').locator('main').innerText();
  ok('política de privacidade com controlador e contato', policy.includes('Tomás Antonio Albuquerque Souza Leones') && policy.includes('tomasleones@proton.me'));
  await a.click('[data-act="legal-back"]');
  await a.click('.sheet [data-page="licencas"]');
  ok('licenças de terceiros abrem', await a.frameLocator('iframe.legal').locator('text=phaser@').first().waitFor({ timeout: 10_000 }).then(() => true, () => false));
  await closeModal(a);

  // 3. Conta por e-mail: idade, cadastro, confirmação, nuvem
  stage('Conta e nuvem');
  await a.click('[data-act="account"]');
  await a.click('[data-act="acc:signup"]');
  ok('pergunta neutra de idade antes do cadastro', (await sheetText(a)).includes('Em que ano você nasceu?'));
  await a.selectOption('select[name=year]', '1996');
  await a.click(AGE_SUBMIT);
  await a.fill('input[name=email]', EMAIL);
  await a.fill('input[name=password]', PASSWORD);
  await a.fill('input[name=confirm]', PASSWORD);
  await a.check('input[name=terms]');
  await a.click('form[data-form=signup] button[type=submit]');
  await a.waitForSelector('text=Conta criada!', { timeout: 15_000 });
  ok('nuvem só depois de confirmar o e-mail', (await sheetText(a)).includes('Confirme seu e-mail'));

  const codes = await (await fetch(`${AUTH}/emulator/v1/projects/demo-exodo/oobCodes`)).json();
  await fetch(codes.oobCodes.find((c) => c.email === EMAIL && c.requestType === 'VERIFY_EMAIL').oobLink);
  await a.click('[data-act="acc:verified"]');
  await a.waitForSelector('text=Progresso guardado na nuvem', { timeout: 15_000 });
  const doc = (await firestore('saves')).documents?.[0];
  ok('progresso enviado à nuvem', doc?.fields.day.integerValue === '2');
  const uid = doc?.name.split('/').pop();
  await a.screenshot({ path: `${OUT}/2-conta.png` });

  const [download] = await Promise.all([a.waitForEvent('download'), a.click('[data-act="acc:export"]')]);
  const exported = JSON.parse(readFileSync(await download.path(), 'utf8'));
  ok('exportação (LGPD) traz conta, aparelho e nuvem', exported.conta?.email === EMAIL && exported.progressoNesteAparelho?.day === 2 && exported.progressoNaNuvem?.estado?.day === 2);
  await closeModal(a);

  // 4. Segundo aparelho (celular): restaura da nuvem
  stage('Segundo aparelho');
  const ctxB = await browser.newContext({ viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const b = watch(await ctxB.newPage(), 'celular');
  await b.goto(APP);
  await b.waitForSelector('.sheet h2');
  await b.tap('text=Bom dia');
  await b.tap('[data-act="account"]');
  await b.tap('[data-act="acc:login"]');
  await b.selectOption('select[name=year]', '1994');
  await b.tap(AGE_SUBMIT);
  await b.fill('input[name=email]', EMAIL);
  await b.fill('input[name=password]', PASSWORD);
  await b.tap('form[data-form=login] button[type=submit]');
  await b.waitForSelector('text=Progresso guardado na nuvem', { timeout: 20_000 });
  await sleep(800);
  ok('aparelho novo recebe o progresso sem perguntar', (await save(b))?.meta.id === s1.meta.id);
  await closeModal(b);
  await b.screenshot({ path: `${OUT}/3-celular.png` });

  // 5. Os dois aparelhos jogam: conflito, e o jogador escolhe
  stage('Conflito');
  await b.tap('[data-act="sleep"]');
  await b.tap('text=Boa noite');
  await sleep(2200);
  await closeModal(b);
  await sleep(13_000); // respeita o intervalo mínimo entre envios
  await ctxB.close(); // o celular para de jogar; a nuvem guarda a versão dele
  await a.click('[data-act="sleep"]');
  await a.click('text=Boa noite');
  await sleep(2200);
  await closeModal(a);
  await a.waitForSelector('text=Dois progressos diferentes', { timeout: 40_000 });
  ok('conflito detectado', true);
  await a.screenshot({ path: `${OUT}/4-conflito.png` });
  await a.click('[data-act="conflict:cloud"]');
  await sleep(1500);
  const cloud = (await firestore(`saves/${uid}`)).fields;
  const adopted = await save(a);
  ok('escolher "nuvem" adota o progresso do outro aparelho',
    adopted?.meta.revision === Number(cloud.revision.integerValue) && adopted?.day === Number(cloud.day.integerValue),
    `local=${adopted?.meta.revision} nuvem=${cloud.revision.integerValue}`);

  // 6. Exclusão de conta (LGPD)
  stage('Exclusão');
  await a.click('[data-act="account"]');
  await a.click('[data-act="acc:delete"]');
  await a.fill('input[name=confirm]', 'excluir');
  await a.click('form[data-form=delete] button[type=submit]');
  await a.waitForSelector('text=Conta excluída', { timeout: 15_000 });
  ok('save da nuvem apagado', (await firestore(`saves/${uid}`)).error?.code === 404);
  const users = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/demo-exodo/accounts:query`, {
    method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: '{}',
  })).json();
  ok('conta apagada', !users.userInfo?.some((u) => u.email === EMAIL));
  ok('progresso do aparelho mantido', (await save(a))?.day >= 2);

  for (const p of [a, b]) ok(`sem erros nem violações de CSP (${p.tag})`, p.issues.length === 0, p.issues.slice(0, 4).join(' | '));
}

// ---------------------------------------------------------------------------

// Build próprio do teste (não colide com o dist/ de produção) e conferido antes de começar
if (!readFileSync('dist-e2e/index.html', 'utf8').includes('127.0.0.1:9099')) throw new Error('dist-e2e não é um build do modo emulator');
const server = await preview({ build: { outDir: 'dist-e2e' }, preview: { port: PORT, strictPort: true, host: '127.0.0.1' }, logLevel: 'warn' });
let browser;

try {
  // Sem GPU no CI: WebGL por software, para testar o mesmo renderizador dos jogadores.
  const args = IN_CI ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] : [];
  browser = await chromium.launch({ channel: CHANNEL, headless: true, args });
  await fetch(`${AUTH}/emulator/v1/projects/demo-exodo/accounts`, { method: 'DELETE' });
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-exodo/databases/(default)/documents', { method: 'DELETE' });
  await run();
} catch (err) {
  console.error(err);
  results.push({ name: 'execução sem exceções', pass: false });
  annotate(`e2e: exceção na etapa "${phase}"`, String(err?.stack ?? err).split('\n').slice(0, 8).join('\n'));
  for (const p of openPages) await p.screenshot({ path: `${OUT}/falha-${p.tag}.png` }).catch(() => undefined);
} finally {
  await browser?.close();
  await server.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram (${CHANNEL})`);
process.exitCode = failed.length ? 1 : 0;
