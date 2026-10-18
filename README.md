# Êxodo Urbano

[![CI](https://github.com/t0masleones/exodo-urbano/actions/workflows/ci.yml/badge.svg)](https://github.com/t0masleones/exodo-urbano/actions/workflows/ci.yml)
![Classificação indicativa: Livre](https://img.shields.io/badge/classifica%C3%A7%C3%A3o-Livre-00a651)

Cozy game 2D para **navegador, Android e iOS**. Carol e Tomás largaram o mercado corporativo e foram viver numa pequena fazenda no cerrado com Ravena, Chihiro, Kuririn e Nix. Sem fome, sem perigo, sem punição: horta, lenha, pedra, bichos e pôr do sol.

> **About (EN):** a cozy farming game set in the Brazilian *cerrado*, built as an authorial portfolio project. One TypeScript codebase (Phaser 4 + Capacitor 8) ships to web, Android and iOS. It works fully offline. Optional accounts (Google, Apple or e-mail) back up progress to Firebase through a privacy-first, local-first sync, with server-side security rules covered by tests. All rights reserved.

## Destaques técnicos

- **Uma base, três plataformas:** Phaser 4 + TypeScript + Vite na web; Capacitor 8 gera os projetos nativos Android e iOS, em tela cheia imersiva.
- **Local-first:** o jogo funciona 100% offline. A conta é opcional e só faz backup na nuvem, com sincronização em três vias e resolução de conflitos.
- **Privacidade por padrão (LGPD):** quem joga sem conta não faz nenhuma requisição a servidores. Com conta, guardamos só e-mail e progresso. Baixar os dados e excluir a conta ficam dentro do jogo. Verificação neutra de idade.
- **Segurança em camadas:**
  - regras do Firestore testadas (dono-só, validação de formato e tamanho, limite de frequência, itens pagos só pelo servidor);
  - CSP estrita;
  - templates que escapam HTML por padrão;
  - App Check;
  - validação defensiva de saves;
  - dependências com versões exatas, verificadas e com licenças auditadas.
- **Livre para todos e saudável:** autoclassificação **Livre** pelo Guia de Classificação Indicativa do MJSP (5ª ed.). Sem chat, compras, anúncios ou loot boxes. Lembrete de pausa ligado por padrão, como pede o ECA Digital.
- **Testes, todos no CI:**
  - unidade: regras, saves, sync, segurança, bem-estar;
  - regras do banco no emulador;
  - ponta a ponta no navegador: convidado sem rede, cadastro, nuvem, segundo aparelho, conflito, exportação, exclusão, CSP.

## Rodar

```bash
npm install
npm run dev           # http://localhost:5173 (também na rede local, para testar no celular)
npm test              # testes de unidade
npm run build         # build de produção em dist/
```

Contas online em desenvolvimento, sem conta no Google, rodando tudo localmente:

```bash
npm run emulators     # Auth + Firestore locais (precisa de Java 21)
npm run dev:emu       # jogo apontando para os emuladores
npm run test:rules    # testes das regras do Firestore
npm run test:e2e      # ponta a ponta: build + emuladores + navegador (Edge no Windows, Chrome no resto)
```

Android e iOS: `npm run android` / `npm run ios`. Veja [docs/PUBLICACAO.md](docs/PUBLICACAO.md).

`#galeria` no fim da URL abre a galeria de sprites.

## Controles

| Ação | Toque/mouse | Teclado |
|---|---|---|
| Andar | toque no chão | WASD / setas |
| Usar ferramenta | toque no alvo (o personagem vai até lá) | Espaço / E |
| Trocar ferramenta | hotbar | 1–9 |
| Carinho num pet | toque no pet | Espaço de frente para ele |
| Alternar Carol ⇄ Tomás | 🔄 | Tab |

## Estrutura

```
src/
  core/       regras puras do jogo (sem Phaser/DOM/Firebase): dados, save, validação, sync
  game/       Phaser 4: cenas, entidades, arte trocável (assets/manifest.ts)
  ui/         HUD e telas em HTML (conta, privacidade, documentos)
  services/   SaveManager (local-first) e Account (contas); firebase/ carregado sob demanda
  platform/   diferenças web × Android × iOS (Capacitor)
  app/        ambiente e eventos tipados
firebase/     regras do Firestore
tests/        unidade (Node), regras (emulador) e ponta a ponta (navegador)
android/ ios/ projetos nativos (Capacitor)
public/legal/ privacidade, termos, exclusão de conta, página para responsáveis
```

## Documentação

| | |
|---|---|
| [Arquitetura](docs/ARQUITETURA.md) | Camadas, fluxo do save, decisões |
| [Segurança](docs/SEGURANCA.md) | Ameaças × controles, pendências, incidentes |
| [LGPD](docs/LGPD.md) | Inventário de dados, direitos, crianças, ECA Digital |
| [Classificação indicativa](docs/CLASSIFICACAO.md) | Autoavaliação pelo Guia do MJSP, IARC, uso excessivo |
| [Licenciamento](docs/LICENCIAMENTO.md) | Autoria, marca, INPI, terceiros, IA, cuidados com outras marcas |
| [Publicação](docs/PUBLICACAO.md) | Firebase, Google Play, App Store, checklist |
| [Monetização](docs/MONETIZACAO.md) | Backlog sem pay-to-win e sem loot box |
| [Game design](docs/GDD.md) · [Arte](docs/ARTE.md) | Design do jogo e como trocar a arte |

## Licença

Todos os direitos reservados. Veja [LICENSE](LICENSE). Componentes de terceiros: `npm run licenses` gera a lista, que também aparece dentro do jogo.
