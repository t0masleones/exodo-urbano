import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-exodo',
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const SAVE_ID = 'save-aaaa-1111';
const save = (over: Record<string, unknown> = {}) => ({
  schema: 2, data: '{"version":2}', day: 3, revision: 5, saveId: SAVE_ID, appVersion: '0.2.0', updatedAt: serverTimestamp(), ...over,
});

const emailVerified = (uid: string) => env.authenticatedContext(uid, { email_verified: true }).firestore();
const emailUnverified = (uid: string) => env.authenticatedContext(uid, { email_verified: false }).firestore();
const google = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

/** Cria um save "antigo" (atualizado há `agoMs`), ignorando as regras. */
async function seed(uid: string, agoMs: number, over: Record<string, unknown> = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'saves', uid), { ...save(over), updatedAt: Timestamp.fromMillis(Date.now() - agoMs) });
  });
}

describe('saves: quem pode o quê', () => {
  it('visitante sem login não lê nem grava', async () => {
    await seed('ana', 60_000);
    await assertFails(getDoc(doc(anonymous(), 'saves', 'ana')));
    await assertFails(setDoc(doc(anonymous(), 'saves', 'ana'), save()));
  });

  it('dono com e-mail verificado cria e lê o próprio save', async () => {
    const db = emailVerified('ana');
    await assertSucceeds(setDoc(doc(db, 'saves', 'ana'), save()));
    await assertSucceeds(getDoc(doc(db, 'saves', 'ana')));
  });

  it('login Google conta como verificado', async () => {
    await assertSucceeds(setDoc(doc(google('bia'), 'saves', 'bia'), save()));
  });

  it('e-mail ainda não confirmado não grava na nuvem', async () => {
    await assertFails(setDoc(doc(emailUnverified('ana'), 'saves', 'ana'), save()));
  });

  it('ninguém lê, altera ou apaga o save de outra pessoa', async () => {
    await seed('ana', 60_000);
    const intruso = emailVerified('carlos');
    await assertFails(getDoc(doc(intruso, 'saves', 'ana')));
    await assertFails(setDoc(doc(intruso, 'saves', 'ana'), save({ revision: 99 })));
    await assertFails(deleteDoc(doc(intruso, 'saves', 'ana')));
  });

  it('não dá para listar a coleção inteira', async () => {
    await assertFails(getDocs(collection(emailVerified('ana'), 'saves')));
  });

  it('dono pode apagar o próprio save (exclusão de conta / LGPD)', async () => {
    await seed('ana', 60_000);
    await assertSucceeds(deleteDoc(doc(emailVerified('ana'), 'saves', 'ana')));
  });
});

describe('saves: formato e limites', () => {
  const tryCreate = (over: Record<string, unknown>) => setDoc(doc(emailVerified('ana'), 'saves', 'ana'), save(over));

  it('recusa campos extras', () => assertFails(tryCreate({ admin: true })));
  it('recusa save maior que 256 KB', () => assertFails(tryCreate({ data: 'x'.repeat(262_145) })));
  it('recusa tipos errados', () => assertFails(tryCreate({ day: '3' })));
  it('recusa saveId com caracteres estranhos', () => assertFails(tryCreate({ saveId: '../../etc' })));
  it('recusa data de atualização escolhida pelo cliente', () => assertFails(tryCreate({ updatedAt: Timestamp.now() })));
  it('recusa campo obrigatório faltando', async () => {
    const { appVersion: _, ...semVersao } = save();
    await assertFails(setDoc(doc(emailVerified('ana'), 'saves', 'ana'), semVersao));
  });
});

describe('saves: frequência e versões', () => {
  it('recusa envios em sequência (menos de 10 s)', async () => {
    await seed('ana', 2_000);
    await assertFails(setDoc(doc(emailVerified('ana'), 'saves', 'ana'), save({ revision: 6 })));
  });

  it('aceita versão mais nova depois do intervalo', async () => {
    await seed('ana', 60_000);
    await assertSucceeds(setDoc(doc(emailVerified('ana'), 'saves', 'ana'), save({ revision: 6 })));
  });

  it('recusa sobrescrever com uma revisão antiga do mesmo jogo', async () => {
    await seed('ana', 60_000);
    await assertFails(setDoc(doc(emailVerified('ana'), 'saves', 'ana'), save({ revision: 4 })));
  });

  it('aceita trocar por outro jogo (escolha num conflito)', async () => {
    await seed('ana', 60_000);
    await assertSucceeds(setDoc(doc(emailVerified('ana'), 'saves', 'ana'), save({ saveId: 'save-bbbb-2222', revision: 1 })));
  });
});

describe('itens comprados (futuro) e o resto do banco', () => {
  it('jogador lê os próprios itens mas não consegue se dar itens', async () => {
    const db = emailVerified('ana');
    await assertSucceeds(getDoc(doc(db, 'entitlements', 'ana')));
    await assertFails(setDoc(doc(db, 'entitlements', 'ana'), { roupaDeFesta: true }));
  });

  it('qualquer outra coleção é negada', async () => {
    await assertFails(setDoc(doc(emailVerified('ana'), 'qualquer', 'coisa'), { a: 1 }));
    await assertFails(getDoc(doc(emailVerified('ana'), 'users', 'ana')));
  });
});
