# Publicação: web, Google Play e App Store

## 0. Decisões que não voltam atrás

- **Package name / bundle ID:** hoje é `io.github.t0masleones.exodourbano` (`capacitor.config.ts`). Depois do primeiro envio para a loja **nunca mais muda**. Se for criar um estúdio ou domínio, troque **antes**.
- **Região do Firestore:** `southamerica-east1` (São Paulo). Também não muda depois.

## 1. Firebase (backend)

1. Crie o projeto no console do Firebase com uma conta Google que tenha 2FA forte.
2. Authentication: ative **Google**, **E-mail/senha** e **Apple** (para iOS). Ative *email enumeration protection* e a política de senha.
3. Firestore: crie na região `southamerica-east1` e publique as regras: `npx firebase deploy --only firestore:rules`.
4. Copie a configuração web para `.env.production.local` (modelo em `.env.example`).
5. App Check: registre web (reCAPTCHA Enterprise), Android (Play Integrity) e iOS (App Attest). Monitore e depois **imponha**.
6. Restrinja as chaves de API no Google Cloud e crie **alertas de orçamento**.
7. Hosting: `npm run build && npx firebase deploy --only hosting`. As páginas legais ficam em `https://SEU-SITE/legal/...`.

Tudo isso dá para fazer no plano gratuito (Spark). Só migre para o Blaze quando precisar de Cloud Functions (por exemplo, para validar compras).

## 2. Google Play

**Conta**
- Conta de desenvolvedor (taxa única de US$ 25) com verificação de identidade.
- Contas **pessoais** novas precisam de um **teste fechado com pelo menos 12 testadores por 14 dias seguidos** antes de liberar a produção. Comece a juntar testadores cedo (família, amigos, comunidades de devs). Contas de organização (CNPJ) não têm essa exigência. ([Google](https://support.google.com/googleplay/android-developer/answer/14151465))
- No Brasil, a verificação de desenvolvedor do Android vale desde 30/09/2026 também para apps fora da Play. A conta da Play já cobre isso. ([Android](https://developer.android.com/developer-verification/guides))

**Build**
- Instale o Android Studio. O projeto usa JDK 21, e o Android Studio já traz um.
- `npm run android` gera o build web, sincroniza e abre no Android Studio.
- Coloque o `google-services.json` em `android/app/` (fora do git) para o login Google nativo funcionar.
- `targetSdkVersion 36`: já atende à exigência de Android 16 para apps novos e atualizações desde 31/08/2026. ([Android](https://developer.android.com/google/play/requirements/target-sdk))
- Gere o **AAB** assinado com a *upload key* e use **Play App Signing**. Suba `versionCode` e `versionName` a cada versão.

**Ficha na loja**
- Política de Privacidade (URL), **URL de exclusão de conta** (`legal/exclusao-de-conta.html`), formulário *Data safety*, público-alvo e declaração de que não há anúncios.
- **Classificação indicativa (questionário IARC):** respostas sugeridas e resultado esperado (**Livre**) em [CLASSIFICACAO.md](CLASSIFICACAO.md). Responda pelo que existe no build enviado.
- Ícone de 512 px, gráfico de destaque de 1024×500 e prints sem marcas de terceiros.

## 3. App Store (iOS)

- Apple Developer Program (anual).
- **Precisa de um Mac com Xcode** para compilar e enviar, ou de um serviço de CI com macOS.
- No Mac: `npx cap sync ios`. No Windows o atalho do Swift Package Manager falha; no Mac funciona. Depois, `npx cap open ios`.
- Coloque o `GoogleService-Info.plist` no projeto (fora do git). Siga o guia do plugin para Google e Apple Sign-In.
- **Guideline 4.8:** quem oferece login com Google precisa oferecer uma opção equivalente com privacidade, como **Sign in with Apple**. O app já mostra "Entrar com Apple" no iOS.
- **Guideline 5.1.1:** login não pode ser obrigatório sem necessidade (o jogo funciona sem conta) e a exclusão de conta precisa existir no app (já existe).
- Preencha o *App Privacy* e o *Privacy Manifest*. O Preferences usa UserDefaults, uma "required reason API"; confirme o manifest gerado pelo Capacitor.

## 4. Checklist final

```bash
npm test && npm run test:rules
npm run build
npm run release:check   # bloqueia: [PREENCHER], segredos no git, CSP ausente, live reload
```

- [x] Campos `[PREENCHER]` resolvidos (LICENSE e páginas legais) e revisão pelo Guia de Classificação Indicativa
- [ ] Autoavaliação de classificação refeita se o build tiver recursos novos (compras, interação entre jogadores)
- [ ] Regras do Firestore publicadas, App Check imposto, alertas de orçamento criados
- [ ] Testado em celular Android real (login Google, sincronização, exclusão de conta, modo imersivo)
- [ ] Teste fechado com 12+ testadores por 14 dias (conta pessoal)
- [ ] Data safety e App Privacy coerentes com a Política de Privacidade
