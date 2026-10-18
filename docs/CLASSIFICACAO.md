# Classificação indicativa: autoavaliação

**Resultado: Livre (L).** Avaliação feita com base no **Guia Prático de Classificação Indicativa** do Ministério da Justiça e Segurança Pública (5ª edição, novembro de 2025, editado com a Portaria MJSP nº 1.048/2025). Ela vale para o jogo como está hoje, na versão 0.2.

> A classificação oficial do app nas lojas sai do questionário **IARC** (Google Play e outras), e o Ministério pode monitorar e reclassificar. Jogos distribuídos só digitalmente dispensam a análise prévia quando autoclassificados no IARC. A Portaria nº 502/2021 exige que a classificação seja informada ao público, e o jogo a mostra em ⚙️ Opções e na página [Para pais e responsáveis](../public/legal/responsaveis.html).

## Os quatro eixos do Guia

### 1. Violência: nada que eleve a faixa
- Cortar eucalipto e quebrar pedras ou cupinzeiros são ações sobre objetos, sem seres vivos envolvidos.
- Os animais nunca se machucam. Não existem inimigos, armas ou combate.
- "Osso velho" desenterrado pela Ravena: ossada sem violência, compatível com Livre.

### 2. Sexo e nudez: nada
- Personagens vestidos, sem insinuação sexual.
- **Atenção na arte final:** tatuagens *old school* tradicionalmente incluem *pin-ups*. Na arte da Carol use só motivos neutros (andorinha, rosa, âncora, coração, ferradura), sem figuras sensuais ou nuas.

### 3. Drogas: nada
- Café coado e pamonha não entram no critério de drogas.
- **Atenção em recursos futuros** (receitas no fogão a lenha): não incluir cachaça, licor de pequi, cerveja ou cigarro, nem como item, nem como diálogo.

### 4. Interatividade digital (eixo novo da 5ª edição)

| Elemento avaliado | Situação no jogo | Efeito na faixa |
|---|---|---|
| Contato ou conversa entre usuários | Não existe: sem chat, perfis públicos ou multiplayer | Nenhum |
| Compras on-line | Não existem | Nenhum |
| Incentivo a fornecer dados pessoais | Não há: conta opcional, sem prêmio por criar conta, só e-mail, a partir de 13 anos | Nenhum |
| Desativação de mecanismos de privacidade | Não há: privacidade por padrão, convidado sem rede | Nenhum |
| Compartilhamento de dados ou localização | Não há | Nenhum |
| Interação com agentes de IA | Não há | Nenhum |

**Atenuantes (positivos):** conteúdo educativo sobre o cerrado (fauna, flora nativa protegida, estações da seca e das chuvas), cuidado com os animais, convivência familiar, ausência de punições.

## O que mudaria a classificação (reavaliar antes de lançar)

| Recurso futuro | Risco pelo Guia / ECA Digital | Como manter baixo |
|---|---|---|
| Loja de cosméticos ou expansões | Compras on-line sem verificação de idade ou autorização dos responsáveis são referência de **14 anos** | Compras só com verificação de idade e/ou aprovação do responsável (controles parentais da loja), preço claro |
| Visitas entre fazendas, chat, presentes entre jogadores | Conversa entre usuários sem checagem de idade é referência de **14 anos** | Evitar contato livre. Se houver, só interações pré-definidas (emotes) e moderação |
| Caixas de recompensa | **Proibidas** para jogos com acesso provável de crianças e adolescentes (ECA Digital, art. 20) | Nunca usar |
| Compartilhar localização ou dados | Referência de **16 anos** | Não fazer |
| Bebida alcoólica, cigarro, violência contra animais, sustos | Eleva a faixa nos eixos clássicos | Fora do escopo do jogo |

## Uso excessivo (Decreto nº 12.880/2026, que regulamenta o ECA Digital)

Produtos voltados a crianças ou de acesso provável por elas precisam de mecanismos contra uso excessivo, problemático ou compulsivo. O decreto trata prêmios como incentivo a esse uso. O que o jogo faz:
- **Lembrete de pausa** ligado por padrão a cada 1 h de jogo real, ajustável (30 min, 1 h 30, 2 h ou desligado) e nunca bloqueante (`src/services/wellbeing/PlaytimeGuard.ts`, com testes).
- **Tempo de jogo do dia** visível em ⚙️ Opções. Ficar 10 min ou mais fora do jogo já conta como pausa.
- **Sem** prêmio por login diário, sequências, notificações, energia que recarrega ou qualquer cronômetro em tempo real. O jogo só avança quando está aberto, e nada estraga na ausência do jogador.

## Respostas sugeridas para o questionário IARC (Google Play)

Responda sempre pelo que **existe no build enviado**:
- Violência, medo, sexo, nudez, linguagem imprópria, drogas, álcool, tabaco, jogos de azar: **não**.
- Interação entre usuários / chat: **não**.
- Compras digitais: **não** (até existir loja).
- Compartilhamento de localização: **não**.
- Compartilhamento de informações pessoais com terceiros: **não**. O Google atua como operador (hospedagem), sem finalidade própria. Confirme o texto exato da pergunta no questionário.
- Acesso irrestrito à internet (navegador embutido): **não**.

Resultado esperado: **Livre** no Brasil (e faixas equivalentes nas outras regiões do IARC).

## Fontes

- [MJSP: lançamento da 5ª edição do Guia Prático de Classificação Indicativa](https://www.gov.br/mj/pt-br/assuntos/noticias/mjsp-lanca-nova-edicao-do-guia-pratico-de-classificacao-indicativa)
- [Tela Viva: nova faixa de 6 anos e classificação de aplicativos](https://telaviva.com.br/18/11/2025/novo-guia-da-classificacao-indicativa-inclui-faixa-etaria-de-seis-anos-e-classificacao-de-aplicativos/)
- [Mobile Time: interatividade de apps na Portaria 1.048/2025](https://www.mobiletime.com.br/noticias/15/10/2025/mjsp-interatividade-apps/)
- [Portaria MJSP nº 502/2021 (PDF, gov.br)](https://www.gov.br/mj/pt-br/assuntos/seus-direitos/classificacao-1/paginas-classificacao-indicativa/Portaria502de23denovembrode2021.pdf)
- [Mattos Filho: ECA Digital na prática (Decreto 12.880/2026)](https://www.mattosfilho.com.br/unico/eca-digital-na-pratica/)
