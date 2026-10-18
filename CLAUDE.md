# Êxodo Urbano: notas para o Claude Code

- Idioma do jogo, comentários e docs: português do Brasil.
- Pilar inegociável: **sem punição** (nada morre, sem fome/energia/perigo). Não introduzir mecânicas que tirem coisas do jogador.
- Monetização futura: nunca pay-to-win, nunca aleatória paga (loot box é proibida pelo ECA Digital), sem anúncios. Ver `docs/MONETIZACAO.md`.
- Classificação **Livre** (`docs/CLASSIFICACAO.md`): nada de violência, álcool, cigarro, sustos ou nudez (inclusive em tatuagens e receitas). Compras, contato entre jogadores ou dados novos exigem refazer a autoavaliação antes de lançar.
- Bem-estar (ECA Digital): nunca criar prêmio por login diário, sequências, notificações que chamem de volta ou cronômetros em tempo real. O lembrete de pausa (`services/wellbeing`) fica ligado por padrão.
- Camadas (`docs/ARQUITETURA.md`): `src/core/` é TypeScript puro (sem Phaser, DOM, Capacitor ou Firebase). Phaser só em `src/game/`. Firebase só em `src/services/firebase/`, sempre por import dinâmico (convidado não pode baixar nem chamar o Firebase). Diferenças de plataforma só em `src/platform/`.
- Eventos entre camadas: só pelo `bus` tipado (`src/app/events.ts`).
- Interface: monte HTML **só** com o template `html` de `src/ui/dom.ts` (escapa tudo). Nunca `innerHTML` com texto cru, nunca `onclick` em string.
- Saves: mudou o formato do `GameState`? Incremente `SAVE_SCHEMA`, escreva a migração em `core/state/migrations.ts` e ajuste `core/state/schema.ts` e os testes.
- Firestore: qualquer coleção nova começa negada em `firebase/firestore.rules` e ganha testes em `tests/rules/`.
- Arte só entra pelo `src/game/assets/manifest.ts`, seguindo `src/game/assets/layouts.ts`. Nada CC-BY-SA, GPL ou NC na versão de loja (`docs/LICENCIAMENTO.md`).
- Dependências: versão exata, publicada há pelo menos 14 dias. `ignore-scripts` fica ligado. Rode `npm run licenses` depois de adicionar algo.
- Validar: `npm test`, `npm run build` (inclui `tsc` e licenças), `npm run test:rules` e `npm run test:e2e` (precisam de Java 21). Conferir sprites: `npm run dev` e abrir `/#galeria`.