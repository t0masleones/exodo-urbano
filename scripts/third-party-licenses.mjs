// Gera public/licenses.txt com as licenças de tudo que vai dentro do jogo
// (dependências de produção do package-lock.json) e barra licenças que não
// combinam com um app proprietário publicado em lojas.
//
// Uso: node scripts/third-party-licenses.mjs
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Licenças permissivas: podem ir num app fechado, desde que o aviso acompanhe.
const ALLOWED = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'CC0-1.0', 'Unlicense', 'BlueOak-1.0.0', 'Python-2.0', 'Zlib']);
// Exceções revisadas manualmente (pacote → motivo). Mantenha vazio sempre que possível.
const REVIEWED = {};

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const packages = Object.entries(lock.packages ?? {})
  .filter(([path, meta]) => path.startsWith('node_modules/') && !meta.dev && !meta.devOptional && !meta.extraneous)
  .map(([path, meta]) => ({
    path,
    name: meta.name ?? path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length),
    version: meta.version ?? '?',
    license: typeof meta.license === 'string' ? meta.license : 'DESCONHECIDA',
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const LICENSE_FILE = /^(licen[cs]e|copying|notice)(\..*)?$/i;
const problems = [];
const groups = new Map();

for (const p of packages) {
  const ids = p.license.replace(/[()]/g, '').split(/\s+(?:OR|AND)\s+/);
  const ok = p.license.includes(' OR ') ? ids.some((id) => ALLOWED.has(id)) : ids.every((id) => ALLOWED.has(id));
  if (!ok && !REVIEWED[p.name]) problems.push(`${p.name}@${p.version} (${p.license})`);

  const files = existsSync(p.path) ? readdirSync(p.path).filter((f) => LICENSE_FILE.test(f)).sort() : [];
  const text = files.map((f) => readFileSync(join(p.path, f), 'utf8').trim()).join('\n\n') || `(o pacote não inclui arquivo de licença; licença declarada: ${p.license})`;
  const hash = createHash('sha256').update(text).digest('hex');
  if (!groups.has(hash)) groups.set(hash, { text, users: [] });
  groups.get(hash).users.push(`${p.name}@${p.version}`);
}

const out = [
  'Êxodo Urbano: licenças de componentes de terceiros',
  `Gerado automaticamente a partir do package-lock.json (${packages.length} pacotes).`,
  'O jogo em si é proprietário (ver LICENSE). Os componentes abaixo pertencem aos seus',
  'respectivos autores e são usados conforme as licenças reproduzidas aqui.',
  '',
  '=== Pacotes ===',
  ...packages.map((p) => `${p.name}@${p.version}: ${p.license}`),
  '',
  '=== Textos das licenças ===',
];
for (const { text, users } of groups.values()) out.push('', `--- Usado por: ${users.join(', ')} ---`, '', text);

writeFileSync('public/licenses.txt', out.join('\n') + '\n');
console.log(`licenses.txt: ${packages.length} pacotes, ${groups.size} textos de licença distintos.`);

if (problems.length) {
  console.error('\nLicenças fora da lista permitida (revise antes de distribuir):');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
