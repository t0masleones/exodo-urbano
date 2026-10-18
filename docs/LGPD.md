# LGPD: como o jogo trata dados pessoais

> Material técnico de apoio, não é parecer jurídico. Antes de publicar, revise com um advogado de proteção de dados as páginas em `public/legal/` e as decisões abaixo.

## Princípio: privacidade por padrão (art. 6º e 46)

- **Sem conta, nenhum dado pessoal sai do aparelho.** Convidados nem baixam o código do Firebase (verificado no teste de ponta a ponta).
- **Com conta, coletamos o mínimo:** e-mail e progresso. Não há anúncios, analytics, rastreamento, chat, localização, contatos, câmera nem microfone.
- **Os direitos do titular estão dentro do jogo:** "Baixar meus dados" e "Excluir conta" ficam a um toque.

## Inventário de dados

| Dado | Finalidade | Base legal | Local | Retenção |
|---|---|---|---|---|
| Progresso (aparelho) | Salvar o jogo | Execução de contrato (art. 7º, V) | Aparelho | Até o jogador apagar |
| E-mail, uid, provedor, datas (Firebase Auth) | Conta e segurança | Execução de contrato (art. 7º, V) | Google, inclusive fora do Brasil | Enquanto a conta existir |
| Nome/foto vindos do Google ou da Apple | Não usamos (o Firebase guarda por padrão) | — | Google | Enquanto a conta existir |
| Progresso na nuvem | Backup e outro aparelho | Execução de contrato (art. 7º, V) | Firestore, São Paulo | Enquanto a conta existir |
| Sinais de segurança (IP, aparelho) | Antifraude (App Check, reCAPTCHA, Play Integrity) | Legítimo interesse (art. 7º, IX) | Google | Políticas do Google |
| Resultado da verificação de idade | Liberar ou não a conta | Cumprimento de obrigação (art. 14 / ECA Digital) | Aparelho | Até apagar os dados do jogo |

O ano de nascimento informado **não é guardado**: o aparelho registra só "permitido" ou "bloqueado por 24 h".

## Direitos do titular (art. 18) no produto

| Direito | Como o jogador exerce |
|---|---|
| Acesso e portabilidade | Conta → Baixar meus dados (JSON com conta, progresso local e da nuvem) |
| Eliminação | Conta → Excluir conta (apaga primeiro o save na nuvem, depois a conta). Página web: `legal/exclusao-de-conta.html` |
| Correção | Progresso é do próprio jogo; e-mail por contato |
| Informação | Política de Privacidade dentro do jogo e na web |
| Reclamação | Contato do controlador e ANPD (indicados na política) |

Prazo de resposta por e-mail: até 15 dias (art. 19, II).

## Crianças e adolescentes

- **LGPD art. 14**: dados de crianças exigem consentimento específico de um responsável. A solução adotada evita o problema: **conta só a partir de 13 anos**, com uma pergunta neutra sobre idade (sem sugerir a resposta "certa"). Abaixo disso a pessoa joga como convidada, sem nenhum dado coletado.
- **ECA Digital (Lei nº 15.211/2025, em vigor desde 17/03/2026)**: vale para jogos "de acesso provável" por crianças e adolescentes. O projeto já atende a pontos centrais dele:
  - sem caixas de recompensa (proibidas pelo art. 20 para esse público);
  - sem publicidade ou perfilamento;
  - sem chat;
  - configurações mais protetivas por padrão.

  A lei tem regulamentação recente e está sendo questionada no STF (ADI 7999), então **confirme com um advogado** as exigências de verificação de idade e de supervisão parental antes de lançar.
- **Lojas:** na Google Play, defina o público-alvo como 13+ (fora do programa Famílias). Se um dia o público incluir menores de 13, o programa Famílias tem regras próprias de SDKs e anúncios.

## Transferência internacional (art. 33)

O Firebase Auth processa dados em servidores do Google fora do Brasil. É preciso mencionar isso na política (já está) e confirmar o mecanismo contratual do Google, como as cláusulas-padrão da ANPD (Resolução CD/ANPD nº 19/2024). O Firestore fica em São Paulo (`southamerica-east1`).

## Papéis

- **Controlador:** o titular do projeto (pessoa física ou, no futuro, a empresa).
- **Operador:** Google (Firebase).
- **Encarregado (DPO):** agentes de pequeno porte podem ser dispensados de indicar um encarregado (Resolução CD/ANPD nº 2/2022), mas **precisam manter um canal de contato**: o e-mail de privacidade nas páginas legais.
- **Registro das operações:** este documento serve de base para o registro simplificado.

## Incidentes

Ver [SEGURANCA.md](SEGURANCA.md#resposta-a-incidentes): comunicação à ANPD e aos titulares em até 3 dias úteis quando houver risco ou dano relevante (Resolução CD/ANPD nº 15/2024).

## Antes de publicar

- [ ] Preencher os campos `[PREENCHER ...]` de `public/legal/*.html` (o `npm run release:check` bloqueia enquanto existirem).
- [ ] Publicar as páginas legais num endereço fixo (Firebase Hosting) e usar a URL nas lojas.
- [ ] Revisão jurídica: política, termos, idade mínima, ECA Digital, transferência internacional.
- [ ] Definir a política de contas inativas (sugestão: aviso por e-mail e exclusão após 24 meses sem acesso).
- [ ] Preencher o *Data safety* (Google Play) e o *App Privacy* (Apple) de forma coerente com a política.
