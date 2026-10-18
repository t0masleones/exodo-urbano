# Segurança

Modelo de ameaças e controles do Êxodo Urbano. Revise a cada recurso novo que envolva servidor, dinheiro ou dados pessoais.

## O que protegemos

1. Contas e e-mails dos jogadores (dados pessoais).
2. Progresso salvo na nuvem.
3. A fatura do projeto Firebase (ataques de "denial of wallet").
4. As chaves de assinatura do app e as contas de desenvolvedor (Google Play, Apple, Firebase, GitHub).
5. No futuro: compras e itens pagos.

## Ameaças × controles

| Ameaça | Controles no projeto |
|---|---|
| Ler ou alterar dados de outro jogador | Regras do Firestore: cada uid acessa só `/saves/{uid}`, sem listagem, e todo o resto é negado. 19 testes automatizados (`tests/rules`). |
| Gravar dados malformados ou enormes | Regras validam campos, tipos e tamanho (≤ 256 KB). O cliente revalida tudo ao ler (`core/state/schema.ts`). |
| Robôs, scripts e flood de gravações | E-mail confirmado para gravar. 10 s mínimos entre gravações (regra no servidor). Limites nativos do Firebase Auth. App Check (reCAPTCHA Enterprise na web; Play Integrity/App Attest no app). |
| DDoS volumétrico | Não existe servidor próprio exposto. A CDN do Firebase Hosting e o front-end do Google absorvem o tráfego. |
| Denial of wallet (inflar custos) | Plano Spark (gratuito, com teto rígido) no início. Ao migrar para Blaze: alertas de orçamento, App Check em modo obrigatório e limites de cota. Convidados não usam o backend. |
| XSS / injeção na interface | Templates `html` escapam tudo por padrão. CSP sem `unsafe-inline`/`unsafe-eval` em scripts, `object-src 'none'` e `base-uri 'none'` (testado em `tests/unit/security.test.ts`). |
| Clickjacking | `frame-ancestors 'none'` e `X-Frame-Options: DENY` (firebase.json). |
| Roubo de sessão / rede | Somente HTTPS (HSTS, `upgrade-insecure-requests`, Android sem tráfego em texto puro). Senhas nunca passam pelo nosso código: ficam com o Firebase Auth. |
| Enumeração de contas | "Esqueci a senha" responde igual exista ou não a conta. Ativar *email enumeration protection* no console. |
| App adulterado ou WebView abusado | O app não carrega páginas remotas (sem `server.url`), não permite conteúdo misto e não habilita depuração do WebView em produção. Play Integrity/App Attest. |
| Itens pagos "de graça" (futuro) | Compras validadas só no servidor (Cloud Functions + APIs das lojas) e gravadas em `/entitlements`, onde o cliente não escreve (regra testada). |
| Cadeia de suprimentos (pacotes npm) | Versões exatas, lockfile, `ignore-scripts=true`, versões com mais de 14 dias, `npm audit` de produção no CI, Dependabot com cooldown e checagem de licenças. |
| Vazamento de segredos | `.gitignore` bloqueia `.env`, keystores, `google-services.json` e contas de serviço. `npm run release:check` confere de novo. |

## Pendências antes do lançamento (dependem do console)

- [ ] Ativar **2FA com chave de segurança ou passkey** em todas as contas: Google (Play/Firebase), Apple, GitHub e e-mail de contato. Essas contas são o alvo mais valioso.
- [ ] Firebase Auth: ativar *email enumeration protection* e a política de senha (mínimo 8, letras e números) no servidor.
- [ ] App Check: registrar o app web (reCAPTCHA Enterprise) e o Android (Play Integrity, com o SHA-256 da Play App Signing), deixar um tempo em monitoramento e então **impor** (*enforce*) no Firestore e no Auth.
- [ ] Integrar o App Check nativo no app: plugin `@capacitor-firebase/app-check` com `CustomProvider` no SDK JS. Hoje o App Check está ligado só na web.
- [ ] Restringir as chaves de API no Google Cloud: web por domínio (HTTP referrer), Android por pacote + SHA-1, iOS por bundle ID.
- [ ] Firestore na região `southamerica-east1` (São Paulo). A região não muda depois de criada.
- [ ] Alertas de orçamento no Google Cloud antes de qualquer mudança para o plano Blaze.
- [ ] Usar Play App Signing (o Google guarda a chave de assinatura) e guardar a *upload key* num cofre de senhas com backup.
- [ ] GitHub: proteção da branch `main`, *secret scanning* e *push protection*.

## Resposta a incidentes

1. **Conter:** revogar chaves e tokens, impor o App Check e, se preciso, travar as regras (`allow write: if false`).
2. **Avaliar:** quais dados, quantas pessoas e qual o risco.
3. **Comunicar:** havendo risco ou dano relevante, avisar a ANPD e os titulares em até **3 dias úteis** (Resolução CD/ANPD nº 15/2024).
4. **Registrar** o incidente e as medidas, mesmo que não seja preciso comunicar.
5. **Corrigir** a causa e adicionar um teste que impeça a regressão.

## Verificações automáticas

```bash
npm test             # regras do jogo, validação de saves, sync, escape de HTML, CSP
npm run test:rules   # regras do Firestore no emulador (precisa de Java 21)
npm run licenses     # avisos de licença + bloqueio de licenças incompatíveis
npm audit --omit=dev # vulnerabilidades no que vai para o jogador
npm run release:check
```

Nota sobre o `npm audit` completo: os alertas restantes vêm do `firebase-tools` (CLI de desenvolvimento), que não entra no app. O alerta do `@grpc/grpc-js` dentro do Firestore foi resolvido com `overrides` no package.json. De qualquer forma, esse pacote só é usado no Node, não no navegador.
