# Licenciamento, autoria e direitos

> Orientação prática, não é parecer jurídico. Para registro de marca e contratos, um advogado de propriedade intelectual economiza dor de cabeça.

## O que já é seu, e como provar

- **Direito autoral nasce com a criação**, sem registro (Lei nº 9.610/1998, art. 18). Código, textos, personagens, roteiro e arte criados por você ou para você já estão protegidos.
- **Software** tem lei própria (Lei nº 9.609/1998). O **registro no INPI** é opcional, mas é a prova mais forte de autoria e data. É online, barato e sai em poucos dias. O código **não é depositado**: só um resumo criptográfico (hash) dele, então ele continua secreto.
- **Histórico do git** com seu nome e e-mail também é evidência de autoria e de evolução do trabalho. Mantenha os commits no seu nome.

## A marca "Êxodo Urbano"

Direito autoral **não protege nomes**. Para o nome do jogo, o caminho é **marca no INPI**:
1. Pesquise a anterioridade na busca de marcas do INPI, na Google Play, na App Store, na Steam e em domínios.
2. Classes mais comuns para jogos: **9** (software/jogo para download) e **41** (entretenimento/jogos online).
3. No Brasil vale quem deposita primeiro. Pessoa física tem desconto nas taxas.

## Projeto proprietário (decisão atual)

O [LICENSE](../LICENSE) é **"Todos os direitos reservados"**: o repositório pode ser visto como portfólio, mas ninguém pode copiar ou reaproveitar. Motivo: **dá para abrir o código depois, mas não dá para "desabrir"**. Uma licença aberta concedida não pode ser revogada para quem já recebeu. Uma opção futura comum é abrir só o código-fonte (por exemplo MIT) e manter arte, textos, personagens e marca fechados.

Preencha seu nome completo no `LICENSE` e nas páginas legais (`npm run release:check` avisa).

## Componentes de terceiros

| Situação | Pode usar num app fechado e pago? |
|---|---|
| MIT, BSD, ISC, Apache-2.0, CC0, OFL (fontes) | Sim, mantendo os avisos. `npm run licenses` gera `licenses.txt`, que aparece dentro do jogo. |
| CC-BY | Sim, com crédito visível. |
| **CC-BY-SA, GPL, LGPL** (inclui as artes do **LPC**) | Não recomendado: obriga a liberar sob a mesma licença o que for derivado e conflita com os termos das lojas. Por isso o plano de usar LPC foi rebaixado a referência de protótipo (ver [ARTE.md](ARTE.md)). |
| **NC** (não comercial) | Não, porque o projeto pretende monetizar. |
| "Royalty free" de site desconhecido, música do YouTube | Não, salvo com a licença por escrito. |

O script `scripts/third-party-licenses.mjs` **barra o build** se entrar uma dependência com licença fora da lista permitida.

## Arte, música e textos encomendados

Encomende sempre com **contrato escrito de cessão de direitos patrimoniais** (Lei nº 9.610/1998, arts. 49 e 50). O contrato deve dizer:
- cessão total e definitiva, para todas as mídias e plataformas, em todos os países;
- direito de modificar, adaptar e usar em marketing, merchandising e continuações;
- garantia de que a obra é original e não usa IA ou material de terceiros sem licença;
- os **direitos morais** (crédito e integridade) continuam do artista por lei. Combine como ele aparece nos créditos.

## Conteúdo gerado com IA

O código e a arte provisória foram gerados com ajuda de IA a partir das suas decisões de design. Pelos termos de uso da Anthropic, o que a ferramenta produz é seu. Porém, a proteção autoral de material **puramente** gerado por IA ainda é incerta no Brasil e no mundo: em geral protege-se a contribuição humana. Para fortalecer a autoria:
- as decisões criativas (personagens, mundo, regras, textos, direção de arte) são suas. Registre-as no GDD e no histórico do git;
- reescreva e edite os textos com a sua voz (diário, falas, descrições);
- substitua a arte provisória por arte própria ou encomendada com cessão.

## Evitando esbarrar em outros jogos e marcas

- **Mecânicas e gênero não são protegidos** (art. 8º da Lei nº 9.610/1998: ideias, métodos e sistemas). Fazendinha, estações, plantio e cozy game são livres.
- **A expressão é protegida.** Não copie arte, interface tela a tela, textos, músicas, personagens, nomes de itens ou logotipos de outros jogos.
- **Nas lojas,** não cite outros jogos no título, na descrição ou nas palavras-chave (por exemplo "tipo Stardew"). A política de metadados da Google Play proíbe.
- **Ajustes já feitos no projeto:**
  - "Kombi" virou **"van da feira"**: Kombi é marca da Volkswagen, e o desenho é genérico, sem o logo nem a frente característica;
  - **Kuririn**: é o nome real do cachorro, mas também o de um personagem de Dragon Ball (marca registrada). Risco baixo como nome de pet dentro do jogo. Evite usá-lo em título, ícone ou marketing e não reproduza a aparência do personagem. Se houver reclamação, troque o nome no jogo;
  - Chihiro, Ravena e Nix são nomes comuns; sem problema.
- **Pessoas reais:** Carol e Tomás são inspirados em pessoas reais. Para uso comercial da imagem e identidade de alguém, vale uma **autorização por escrito** simples da Carol (Código Civil, art. 20).
- **Emojis do HUD:** são desenhados pela fonte do sistema de cada aparelho. Antes do lançamento, troque por ícones próprios: identidade visual e nada de arte de terceiros nos prints da loja.

## Checklist

- [ ] Nome completo no `LICENSE` e nas páginas legais
- [ ] Busca de anterioridade e depósito da marca no INPI (classes 9 e 41)
- [ ] Registro do software no INPI (opcional, recomendado antes de lançar)
- [ ] Autorização de uso de imagem da Carol
- [ ] Contratos de cessão para toda arte, música e texto de terceiros
- [ ] Ícones próprios no lugar dos emojis
