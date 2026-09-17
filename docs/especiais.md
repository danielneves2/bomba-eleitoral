# Especiais — arsenal interativo

As habilidades são invenções satíricas. As referências abaixo explicam a inspiração visual; não descrevem poderes ou comportamentos reais das pessoas.

| Personagem | Item e interação | Limites e contra-jogo |
|---|---|---|
| Lula | Escudo de picanha com relevo, borda de gordura, grelha e aura dourada. E ativa. | Invulnerabilidade por 4 s; depois a proteção acaba. |
| Bolsonaro | Microfone e discurso global de 3 s; depois névoa por 16 s. Seringas caem do céu em 2 s. | Um antídoto a menos que os rivais vivos (8 participantes: 6 doses). Exatamente uma dose cura e transforma em jacaré até o fim da partida. Após 6 s de fuga, o veneno tira 1 coração aos 7, 10 e 13 s; um coração coletado pode salvar o rival sem dose. Bolsonaro e aliados são imunes ao veneno. |
| Dilma | Pote de vento por 8 s. E novamente libera a rajada; também devolve uma explosão que a alcance. | Rajada em linha: 2 corações. Empurra bombas visíveis; paredes bloqueiam e a primeira caixa encerra a rajada. |
| Temer | Skin de vampiro animada; voo livre por 10 s. WASD move, Espaço sobe, Ctrl desce, Q troca alvo, E mergulha. Também é possível clicar no retrato do rival. | Invulnerável no ar; ultrapassa caixas e paredes internas sem sair da arena. Mergulho de 0,8 s, pouso em célula livre. Mordida drena 2 corações em 2,4 s, recuperando até 1 coração; alvos mortos ou aliados são recusados. |
| Marçal | Carteira azul por 10 s. E equipa; E novamente exorciza um rival que olhe de frente. A seta no chão indica a direção do olhar; “OLHOU! E” confirma a oportunidade. | Alcance de 4,5 casas e visão recíproca. Hipnose por 5 s, com um espírito pixelado saindo do corpo, sem dano direto. O rival fica caído, não anda nem planta bombas, mas ainda pode receber dano. Errar mantém a carteira com intervalo de 0,6 s. |
| Renan | Rádio detonador por 12 s. E equipa, jogador planta/arremessa bombas, E detona suas bombas. | Explosões acionadas pelo rádio: 2 corações, inclusive autolesão. Não aciona bombas alheias. Sem bombas próprias, mantém o rádio. |
| Kogos | Lâmina por 8 s. E equipa, clique golpeia. | 2 corações por acerto; intervalo de golpe de 0,24 s e invulnerabilidade de dano existente. Não atravessa paredes. |
| Boulos | Bandeira por 10 s. Três posições à frente recebem uma prévia verde/vermelha; E finca as barricadas. | Cobertura por 8 s. Não nasce sobre personagens, bombas, caixas ou paredes. Pode construir parcialmente. Sem posição válida, mantém o item. |
| Datena | Cadeira visível. E equipa; clique ou E arremessa. | 2 corações e 1 s de atordoamento. Interage com bombas e ricocheteia uma vez. |

Todos os nove personagens podem coletar recargas pessoais nas caixas e em pontos livres do mapa. O inventário guarda até duas recargas. Usar a segunda ação do item equipado não gasta outra recarga. Pausa e introdução de invasor congelam os tempos; não é possível usar o especial enquanto se cozinha uma bomba.

As bombas normais continuam com dano de 1 coração; ataques letais dos invasores seguem suas regras próprias. Os ataques diretos dos **especiais de personagem** tiram 2 corações por acerto válido. A névoa global é a exceção: pode consumir 3 corações em três etapas, conforme a nova mecânica de sobrevivência. Aliados não recebem dano nem hipnose de seu companheiro.

## Referências consultadas

- [Marçal exibindo carteira de trabalho no debate de 2024 — Poder360](https://www.poder360.com.br/poder-eleicoes/marcal-mostra-carteira-de-trabalho-e-boulos-da-tapa-assista/). Inspiração da carteira azul; a hipnose é invenção do jogo.
- [Fala de Dilma sobre estocar vento, registro em vídeo — Poder360](https://www.youtube.com/watch?v=GVTn3dn5bqU). Inspiração do pote; a rajada é invenção do jogo.
- [Representação carnavalesca de Temer como vampiro — Folha](https://www1.folha.uol.com.br/cotidiano/2018/02/protestos-voltam-a-sapucai-em-desfile-das-campeas.shtml). Inspiração do cálice e morcegos.
- [Renan e o Partido Missão — CNN Brasil](https://www.cnnbrasil.com.br/politica/lider-do-missao-novo-partido-ligado-ao-mbl-afirma-que-bolsonarismo-morreu/). Inspiração do nome “Missão”; o rádio detonador é um objeto fictício de estratégia arcade.
- [Boulos: Por que ocupamos? — MTST](https://mtst.org/mtst/boulos-por-que-ocupamos/). Inspiração da bandeira e cobertura temporária.

Arte nova original: SVGs em `public/specials`, gerados por `scripts/make-special-icons.mjs`, e modelos 3D em `public/game/special-view.js`. Os retratos existentes foram preservados.

## Assets da atualização 20

Gerados com a ferramenta integrada de imagegen a partir de `public/characters-voxel.png`: `public/specials/transformations-v20.png` (atlas de 3 colunas × 2 linhas: vampiro voando e jacaré andando) e `public/specials/speech-v20.png` (3 poses de discurso ao microfone). Fundo branco removido no carregamento pelo mesmo recorte usado nos personagens existentes. Referência preservada, sprites novos em arquivos próprios.

Prompts finais: atlas pixel/voxel chibi detalhado, Temer reconhecível com capa vinho e presas em três poses de voo; jacaré verde em pé, barriga creme e três poses de caminhada, células uniformes. Discurso: Bolsonaro pixelado de terno azul, microfone na mão e três gestos de fala. Fundo branco uniforme, sem cenário ou texto.

A fala da cena e a transformação em jacaré são sátira fictícia do jogo. O especial global é compartilhado pela simulação da partida atual com bots; multiplayer online continua fora desta etapa.
