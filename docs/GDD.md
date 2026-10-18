# Êxodo Urbano: documento de game design

## Premissa
Carol (30, 1,55 m, parda, tatuagens old school) e Tomás (30, 1,80 m, branco, cabelo preto em degradê) deixam o mercado corporativo e se mudam para uma pequena fazenda no cerrado com três cães e uma gata. O jogo é sobre o ritmo novo: plantar, cuidar, colher, ver o céu mudar.

## Pilares
1. **Sem punição.** Não há fome, energia, perigo nem prazo. Planta não regada pausa o crescimento, mas nunca morre. Passar da meia-noite só faz o casal dormir no sofá.
2. **Autenticidade do cerrado.** Duas estações reais (chuvas e seca), terra vermelha, pequizeiro protegido, cupinzeiros, seriema, van da feira.
3. **Família como coração.** Os pets têm personalidade e o casal conversa entre si. O diário fecha cada dia.

## Loop (um dia ≈ 12 min reais, das 6h à 0h)
Acordar → diário → regar/colher → cortar eucalipto / quebrar pedra e cupinzeiro → vender na caixa → comprar sementes na van da feira → carinho nos bichos → dormir.

## Estações (28 dias cada)
| | Chuvas (começa em outubro, dia 1) | Seca |
|---|---|---|
| Clima | 55% de dias de chuva (rega automática) | 5% de chuva |
| Visual | grama verde | grama dourada, ipês |
| Culturas da estação | milho, feijão-de-corda, abóbora, quiabo, maxixe | alface, couve, tomate, cenoura |
| O ano todo | mandioca, jiló, pimenta-de-cheiro | |
| Extra | | pequi cai dos pequizeiros |

Fora de época, a planta cresce na metade da velocidade.

## Cultivo
Terra → **arar** (enxada) → **plantar** → **regar** → semente → broto → crescendo → florindo → maduro → **colher** (com qualquer ferramenta). Culturas com `regrowDays` voltam para a fase de crescimento após a colheita. Tudo é configurado em `src/core/data/crops.ts`.

## Recursos
- **Eucalipto**: 4 golpes de machado dão 3 de madeira e deixam um toco, que dá mais 1.
- **Pedra**: 2 golpes de picareta. **Cupinzeiro**: 3 golpes, dá argila.
- **Pequizeiro**: nativo e protegido, não pode ser cortado.
- Toda noite pode surgir uma pedra ou um toco novo. Os recursos não acabam.

## Família
| | Comportamento | Evento noturno |
|---|---|---|
| Ravena | explora longe, rápida | 35%: desenterra algo (osso, pedra, quartzo, moeda antiga) |
| Chihiro | dorme muito | |
| Kuririn | segue quem você controla | |
| Nix | some no telhado | 25%: deixa uma pena de "presente" |

Carinho: 1 coração por dia por pet, até 10. Quem você não controla entre Carol e Tomás vira NPC e conversa quando você toca nele.

## Próximos passos sugeridos
1. Sons ambientes (cigarra, seriema, chuva) e trilha de viola lo-fi.
2. Árvores frutíferas plantáveis (manga, banana, acerola, mamão).
3. Usos para madeira, pedra e argila: reformar varanda e cerca, construir galinheiro e compostagem.
4. Cozinha no fogão a lenha (pamonha, doce de leite, arroz com pequi).
5. Álbum de fauna do cerrado (lobo-guará, tucano, tamanduá, seriema).
6. Brinquedos e petiscos para os pets; corações destravam interações.
7. Arte LPC nos personagens e, depois, pets encomendados.
