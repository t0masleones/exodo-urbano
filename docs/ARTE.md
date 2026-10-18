# Arte: como trocar placeholders por arte de verdade

Todo sprite passa por [`src/game/assets/manifest.ts`](../src/game/assets/manifest.ts). Uma entrada sem `url` usa o placeholder desenhado por código ([`placeholders.ts`](../src/game/assets/placeholders.ts)). Uma entrada com `url` carrega um PNG de `public/`. Nenhum outro arquivo precisa mudar.

Depois de trocar, abra o jogo com `#galeria` na URL para conferir as animações.

> **Atenção, versão de loja:** a arte final precisa ser **sua** (feita por você ou encomendada com contrato de cessão). As artes LPC são CC-BY-SA/GPL: qualquer derivado também teria de ser liberado sob essa licença, o que conflita com um jogo proprietário nas lojas. Use LPC só para prototipar ou como referência, e não na versão publicada. Detalhes em [LICENCIAMENTO.md](LICENCIAMENTO.md).

> **Classificação Livre:** nas tatuagens *old school* da Carol, use só motivos neutros (andorinha, rosa, âncora, coração, ferradura). Nada de *pin-ups* sensuais. Também não desenhe bebidas alcoólicas ou cigarros em cenários e itens. Ver [CLASSIFICACAO.md](CLASSIFICACAO.md).

## 1. Personagens com LPC (só protótipo)

1. Abra o [Universal LPC Spritesheet Character Generator](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/).
2. Monte cada personagem:
   - **Tomás**: corpo masculino, pele clara, cabelo curto preto (há opções tipo *buzzcut*/*short*; o degradê pode precisar de retoque), camiseta e calça jeans, botina.
   - **Carol**: corpo feminino, pele marrom, cabelo cacheado escuro, regata e bermuda ou jardineira. As tatuagens old school não existem no gerador: pinte depois, à mão, nos braços e pernas (Aseprite, LibreSprite ou Piskel, todos gratuitos).
3. Exporte o PNG completo e salve como `public/assets/characters/tomas-lpc.png` e `carol-lpc.png`.
4. No manifesto:
   ```ts
   import { LPC_HUMAN } from './layouts';
   tomas: { key: 'tomas', url: 'assets/characters/tomas-lpc.png', layout: LPC_HUMAN },
   carol: { key: 'carol', url: 'assets/characters/carol-lpc.png', layout: LPC_HUMAN },
   ```
5. A diferença de altura (1,80 m × 1,55 m) é aplicada pelo código a partir de `heightCm`. Não precisa redimensionar a arte.
6. **Licença**: as camadas LPC são CC-BY-SA / GPL. O gerador lista os autores de cada camada usada; copie essa lista para o `CREDITS.md`.

> O LPC não tem cachorros nem gatos com a cara dos nossos. Os pets continuam como placeholder até serem encomendados.

## 2. Encomendar arte (quando fizer sentido)

Mande para o artista o contrato de [`layouts.ts`](../src/game/assets/layouts.ts):

| Asset | Frame | Grade | Linhas |
|---|---|---|---|
| Humanos | 64×64 (ou 32×48) | 9+ colunas | cima, esquerda, baixo, direita (coluna 0 = parado, 1–8 = andando) |
| Pets | 32×24 | 4 colunas × 6 linhas | andar→, parado→, dormindo→, andar←, parado←, dormindo← |
| Culturas | 32×32 | 5 colunas | semente, broto, crescendo, florindo, maduro |
| Tileset | 32×32 | 9 tiles numa linha | ordem de `TILE_INDEX` no manifesto |
| Objetos | livre | 1 imagem | casa 128×112, van 64×48, eucalipto 32×80, pequizeiro 64×64... |

Os pets têm esquerda e direita desenhadas separadamente porque o **Kuririn é pirata de um lado só**: a mancha preta aparece só de um lado do rosto.

Briefing dos bichos:
- **Ravena**: bull terrier fêmea, marrom com branco, cabeça de "ovo".
- **Chihiro**: american bully XL fêmea, lilac (cinza-arroxeado), olhos âmbar, enorme e preguiçosa.
- **Kuririn**: bulldog francês macho, branco com um lado do rosto preto, orelhas de morcego.
- **Nix**: gata SRD escaminha (preto com manchas laranja e creme), vive no telhado.

Se o layout for diferente, basta criar um novo `HumanLayout`/`AnimalLayout` descrevendo a grade; o resto do código não muda.

## Ícones da interface

Os ícones do HUD (ferramentas, itens, sementes, mudas, pratos, botões) são **pixel art própria** em `src/ui/icons.ts`: grades de 12×12 renderizadas como SVG nítido. Culturas, frutas e pratos usam moldes coloridos a partir das cores definidas nos dados, então item novo ganha ícone automaticamente. Para redesenhar, edite a grade (uma letra por pixel) ou entregue ao artista as mesmas medidas (12×12, paleta limitada).
