# Êxodo Urbano: notas para o Claude Code

- Idioma do jogo, comentários e docs: português do Brasil.
- Pilar inegociável: **sem punição** (nada morre, sem fome/energia/perigo). Não introduzir mecânicas que tirem coisas do jogador.
- Regras do jogo ficam em `src/systems/` e não importam Phaser. Conteúdo fica em `src/data/`.
- Arte só entra pelo `src/assets/manifest.ts`, seguindo os contratos de `src/assets/layouts.ts`.
- O HUD é DOM (`src/ui/`). A cena conversa com ele só via `bus` (`hud`, `toast`, `open`, `diary`, `ambient` ↔ `ui:*`).
- Mudou o formato do `GameState`? Incremente `version` em `state/types.ts`/`save.ts`.
- Validar: `npm run build` (inclui `tsc`). Conferir sprites: `npm run dev` e abrir `/#galeria`.
