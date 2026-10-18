# Êxodo Urbano

Cozy game 2D no navegador. Carol e Tomás largaram o mercado corporativo e foram viver numa pequena fazenda no cerrado com Ravena, Chihiro, Kuririn e Nix. Sem fome, sem perigo, sem punição: horta, lenha, pedra, bichos e pôr do sol.

Roda em PC e celular (toque ou teclado), em tela cheia e pode ser instalado como app (PWA).

## Rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173 (e na rede local, para testar no celular)
npm run build      # gera /dist, pronto para GitHub Pages, Netlify etc.
```

- `#galeria` no fim da URL abre a galeria de sprites, para conferir arte nova.
- O save fica no `localStorage` do navegador. Para recomeçar, use ⚙️ → Recomeçar.

## Controles

| Ação | Toque/mouse | Teclado |
|---|---|---|
| Andar | toque no chão | WASD / setas |
| Usar ferramenta | toque no alvo (o personagem vai até lá) | Espaço / E |
| Trocar ferramenta | hotbar | 1–9 |
| Carinho num pet | toque no pet | Espaço de frente pra ele |
| Alternar Carol ⇄ Tomás | 🔄 | Tab |

## Stack e arquitetura

Phaser 3 + TypeScript + Vite. O HUD é HTML/CSS sobre o canvas.

```
src/
  data/        conteúdo: personagens, pets, culturas, itens (edite aqui para balancear)
  systems/     regras puras, sem Phaser: farm (ações/cultivo/virada do dia), time, diary
  state/       GameState + save/load
  world/       mapa base e pathfinding
  entities/    Human, Pet (IA), Walker (movimento)
  assets/      manifest (troca de arte), layouts (contrato dos spritesheets), placeholders
  scenes/      Boot, Farm, Gallery
  ui/          HUD em DOM
```

- **Arte trocável**: veja [docs/ARTE.md](docs/ARTE.md). Hoje tudo é gerado por código, com custo zero.
- **Game design**: veja [docs/GDD.md](docs/GDD.md).
