# LGPD: como o jogo trata dados pessoais

> Material técnico de apoio. Os textos de `public/legal/` foram revisados em 18/10/2026 tendo como referência o Guia Prático de Classificação Indicativa do MJSP (5ª ed.) e o ECA Digital. Veja [CLASSIFICACAO.md](CLASSIFICACAO.md). Antes de monetizar ou abrir para o público em grande escala, vale uma revisão por advogado de proteção de dados.

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
| Tempo de jogo do dia e intervalo do lembrete de pausa | Prevenir uso excessivo | Cumprimento de obrigação (ECA Digital, Decreto nº 12.880/2026) | Aparelho | Zera diariamente |

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
- **ECA Digital (Lei nº 15.211/2025, em vigor desde 17/03/2026, regulamentado pelo Decreto nº 12.880/2026)**: vale para jogos "de acesso provável" por crianças e adolescentes. Como o jogo é **Livre**, esse é o caso. O que já está atendido:
  - sem caixas de recompensa (proibidas pelo art. 20). Pelo decreto, sem loot box também não se exige verificação de idade para esse fim;
  - sem publicidade, perfilamento ou compras;
  - sem chat ou contato entre usuários;
  - **mecanismo contra uso excessivo:** lembrete de pausa ligado por padrão, tempo de jogo do dia visível, nenhum prêmio por login diário, sequência ou notificação;
  - privacidade por padrão (convidado sem rede) e página [Para pais e responsáveis](../public/legal/responsaveis.html).

  A regulamentação é recente (ANPD ainda detalhando requisitos técnicos de aferição de idade) e a lei é questionada no STF (ADI 7999). Revise este ponto a cada nova orientação oficial.
- **Classificação indicativa:** autoavaliação **Livre** pelo Guia do MJSP, detalhada em [CLASSIFICACAO.md](CLASSIFICACAO.md). Qualquer recurso com compras, contato entre jogadores ou dados extras exige reavaliar a faixa antes do lançamento.
- **Lojas:** o público-alvo declarado na Google Play define as regras. Opções:
  - 13+: fica fora do programa Famílias;
  - incluir menores de 13 (coerente com "Livre"): exige seguir o programa Famílias da Play, que restringe SDKs e anúncios. O jogo já não usa nenhum dos dois, mas é preciso revisar os SDKs do Firebase com essa política em mãos.

## Transferência internacional (art. 33)

O Firebase Auth processa dados em servidores do Google fora do Brasil. A política informa isso e se apoia nos termos de processamento e segurança de dados do Firebase. Ao criar o projeto, aceite esses termos no console e verifique se incluem as cláusulas-padrão da ANPD (Resolução CD/ANPD nº 19/2024). O Firestore fica em São Paulo (`southamerica-east1`).

## Papéis

- **Controlador:** o titular do projeto (pessoa física ou, no futuro, a empresa).
- **Operador:** Google (Firebase).
- **Encarregado (DPO):** agentes de pequeno porte podem ser dispensados de indicar um encarregado (Resolução CD/ANPD nº 2/2022), mas **precisam manter um canal de contato**: o e-mail de privacidade nas páginas legais.
- **Registro das operações:** este documento serve de base para o registro simplificado.

## Incidentes

Ver [SEGURANCA.md](SEGURANCA.md#resposta-a-incidentes): comunicação à ANPD e aos titulares em até 3 dias úteis quando houver risco ou dano relevante (Resolução CD/ANPD nº 15/2024).

## Antes de publicar

- [x] Controlador, contato e datas preenchidos nas páginas legais (18/10/2026).
- [x] Revisão pelo Guia de Classificação Indicativa (5ª ed.) e pelo ECA Digital: autoclassificação Livre, lembrete de pausa, página para responsáveis.
- [ ] Publicar as páginas legais num endereço fixo (Firebase Hosting) e usar a URL nas lojas.
- [ ] Aceitar os termos de processamento de dados do Firebase e conferir o mecanismo de transferência internacional.
- [ ] Preencher o *Data safety* (Google Play) e o *App Privacy* (Apple) de forma coerente com a política.
- [ ] Antes de monetizar: revisão por advogado de proteção de dados e nova autoavaliação de classificação.
- [ ] Futuro (exige Cloud Functions): limpeza automática de contas inativas, se for adotada essa política.
