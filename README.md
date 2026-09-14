# Bomba Eleitoral — Circo do Caos

Interface arcade: logo pixel art central sobre a arena, azul profundo, dourado e branco, com fonte Silkscreen local (SIL OFL, licença em `public/fonts/Silkscreen-OFL.txt`, fonte oficial: https://github.com/googlefonts/silkscreen). Logo extraída da referência fornecida por edição com imagegen e recortada pelo mesmo carregador de fundo dos personagens.

Modos: **Contra o Sistema** (você contra oito bots), **Esquerda × Direita** (você e dois aliados contra três bots) e Aquecimento (três bots). No 3×3, escolha seu lado; qualquer personagem pode liderar qualquer equipe satírica. Companheiros não causam dano entre si, bombas próprias e invasores continuam perigosos. A equipe pode vencer mesmo após a eliminação do jogador. **Contra a População**, multiplayer online, fica explicitamente para a próxima etapa.

Entradas: Bukele fecha três gaiolas com figurantes, sobe ao microfone e faz um discurso satírico por síntese genérica em uma cena de cinco segundos. Isso não prende participantes reais durante a abertura; a captura de seis segundos ocorre no combate. Trump tem quatro segundos de câmera contínua centralizada, bandeira, águia e o letreiro “WELCOME TO AMERICA / BIG EGO. BIG BOOM.”. Putin e Kim mantêm três segundos. O escudo de picanha agora tem borda dourada e formato de escudo grande em primeira pessoa; protege por quatro segundos.

Jogo satírico em primeira pessoa, criado com Three.js e uma interface React.

Escolha entre nove personagens: Lula, Bolsonaro, Dilma, Temer, Pablo Marçal, Renan Santos, Paulo Kogos, Boulos e Datena. Dispute contra oito rivais controlados pelo jogo (três em Aquecimento). O último sobrevivente é eleito. Após três minutos começa a morte súbita; se ninguém sobreviver, a eleição é anulada. Explosões se propagam em cruz, destroem caixotes e detonam outras bombas. Elas também atingem o jogador.

Cada personagem tem uma mecânica especial própria. Lula ativa quatro segundos de invulnerabilidade com **Picanha para Todos**; Bolsonaro parte para a **Motociata** e atropela rivais; Dilma **Estoca o Vento**, absorvendo um ataque e devolvendo uma rajada; Temer firma o pacto **O Vampiro Não Renuncia** e volta com um coração após um golpe fatal; Pablo Marçal cria três ilusões com **Muda o Mindset**; Renan Santos detona remotamente as bombas em **Missão: Detonar**; Paulo Kogos fecha uma área com **Propriedade Privada**; Boulos ergue três barricadas com **Ocupação**; e Datena lança uma cadeira que ricocheteia, rebate bombas e atordoa o alvo.

Três invasores diferentes são sorteados ao iniciar cada partida, entre Putin, Trump, Kim Jong-un e Bukele. Seus retratos e a ordem de chegada aparecem junto da roleta de mapas. Nenhum invasor fica de fora de duas partidas consecutivas na mesma sessão. O primeiro aviso começa entre 5 e 10 segundos; os seguintes chegam cerca de 30 e 60 segundos depois, se a partida continuar. Cada aviso tem sete segundos de barra, retrato e sirene. As chegadas pausam participantes e pavios: Putin e Kim têm três segundos com troca de enquadramentos, Trump tem quatro segundos de câmera contínua, e Bukele tem cinco segundos para as prisões e o discurso. O invasor age por 14 segundos. Trump e Bukele entram por uma rota acessível próxima ao jogador, fora do alcance imediato de captura.

Putin pilota um avião e lança duas bombas com marcas fixas por 2,5 segundos. Trump chega com bandeira e águia, procura um rival, para e fica vermelho por 2,4 segundos antes de uma única explosão circular. Kim fica ao lado de três mísseis gigantes que decolam em sequência; os impactos circulares têm 2,8 segundos de aviso, causam mais dano no centro e não criam fogo em cruz. Bukele patrulha e captura ao alcançar alguém sem parede no caminho: gaiola por seis segundos, uma captura por participante por invasão. A gaiola impede deslocamento, mas permite mirar, lançar bombas e usar especiais. A duração restante é mostrada e a liberação funciona mesmo após a saída do invasor. Os invasores não disputam a eleição. A partida continua local contra bots.

Lula, Datena e Kogos já começam com um especial pronto; não precisam coletar um item para ver o equipamento. E ergue um único escudo grande de picanha por quatro segundos, equipa a lâmina do Kogos por oito segundos ou levanta a cadeira do Datena. A cadeira permanece visível até o clique ou um novo E arremessá-la pela mira. A lâmina usa golpes de faca: clique ou segure para atacar rivais próximos à frente, causando dois corações a cada 0,24 segundo, sem atravessar paredes. A proteção territorial continua como bônus do especial normal do Kogos. Cada equipamento tem animação de ativação, som próprio e aviso na tela. Itens pessoais em caixas e áreas acessíveis guardam até dois usos extras sem gastar a recarga normal.

A cada partida, uma roleta de 3,2 segundos alterna entre **Circo do Caos**, **Favela** e **Planalto / Congresso**, desacelera e revela a arena sorteada com chances iguais. Depois, três segundos de contagem apresentam o personagem e descem até a câmera em primeira pessoa. O relógio, participantes e invasores ficam congelados durante toda a apresentação. A trilha original é sintetizada e agendada pelo relógio de áudio, com intensidade variável, redução de volume durante alertas e explosões direcionais. Sons e música respeitam pausa e silêncio.

As arenas compartilham a escala de 15 × 15 células, mas têm layouts próprios. A Favela mistura becos conectados, ruas transversais, alvenaria quente e casas coloridas com lajes, caixas-d’água e varais no entorno. O Planalto abre uma praça central, usa piso claro, jardins, espelho-d’água e modelos facetados das torres e cúpulas do Congresso e da colunata do Palácio do Planalto. Cenários estáticos são agrupados por material e reutilizados nas partidas; a decoração fica fora da grade de colisão. A seleção é feita uma única vez no início e a roleta apenas apresenta o resultado.

A arena mantém 15 × 15 células, com menor densidade de caixas (32% antes de abrir as rotas), duas vias centrais livres e quatro pequenas praças para desviar. Dano recebido acende uma vinheta vermelha e provoca um tremor curto; bloqueio de escudo usa azul. Dano causado mostra confirmação sonora, nome do alvo e eliminação na mira. Rivais têm indicadores de vida. Eliminações de outros participantes não contam como abates do jogador. A simulação usa passos curtos para manter a contagem correta mesmo em 10 FPS; pausas e abas ocultas continuam congelando o jogo.

Arte dos invasores e da águia gerada pela ferramenta integrada de imagens, seguindo o atlas dos jogadores. Arquivos: `public/invaders-voxel-v7.png` e `public/eagle-voxel-v7.png`. Os prompts completos estão em `public/game/invader-art-prompts-v7.json`. O carregamento usa o mesmo recorte do fundo conectado às bordas usado nos jogadores, pois os PNGs gerados contêm um fundo quadriculado opaco. A renderização preserva pixels claros internos e usa filtro de vizinho mais próximo.

A arena usa piso de pedra, blocos de alvenaria, caixotes com tábuas e ferragens, iluminação quente e sombras. Caixotes são agrupados por material para reduzir chamadas de desenho, preservando a destruição individual. Os itens têm modelos voxel de coração, escudo e raio; corações são preservados enquanto a vida está cheia e o escudo mostra o tempo restante. O movimento freia rapidamente ao soltar as teclas.

- WASD: mover; mouse: mirar; Shift: correr.
- Segure o clique: acender o pavio e mirar; solte: arremessar em arco com o tempo restante. O pavio dura 3 segundos e pode explodir na mão. A seta prevê a física do arremesso e dos ricochetes.
- Espaço: plantar bomba; E: especial; Q: bordão.
- Esc ou P: pausar. Setas também permitem andar e girar a câmera.
- Ajuste a sensibilidade do mouse na pausa ou nas instruções.
- No celular: direcional à esquerda, arraste a arena para mirar e segure o botão de bomba para mirar e solte para arremessar.

Falas históricas curtas, com fontes acessíveis nos créditos. Áudio por síntese de voz do navegador, sem imitação de vozes reais. Personagens caricatos de corpo inteiro, com estética voxel inspirada na referência fornecida, gerados por IA. A arena 3D usa sprites que acompanham a câmera, com animação de passos e sombra no chão. Personagens e habilidades são sátira fictícia, sem afiliação política.

## Desenvolvimento

Node.js 22.13 ou superior. `npm install`, `npm run dev`.
`npm run build` gera o jogo estático em `dist/client`.
`node scripts/serve.mjs` abre a versão compilada no navegador.

O script de build dá 750 ms para o encerramento dos workers nativos no Windows, evitando uma falha de libuv após a conclusão bem-sucedida do Vinext.

O lint verifica o código autoral. Componentes pré-instalados e a cópia fornecida de Three.js permanecem intactos.

Three.js 0.185.1 foi reutilizado da pasta fornecida; licença MIT em `public/vendor/LICENSE`.

Novos assets pixel art (geração integrada de imagens): `public/bukele-pixel-v11.png`, `public/item-steak-pixel-v11.png`, `public/item-chair-pixel-v11.png` e `public/item-sword-pixel-v11.png`. Referência: o atlas original dos personagens. Prompts completos em `public/game/pixel-art-prompts-v11.json`. O Higgsfield não expôs ferramentas de geração nesta sessão; as animações são cenas nativas de Three.js.

Bukele e Trump usam folhas de quatro poses de caminhada, alternadas conforme os passos da patrulha. A animação pausa junto com o jogo e Trump volta à pose imóvel ao carregar sua explosão. Assets: `public/bukele-walk-v12.png` e `public/trump-walk-v12.png`; prompts em `public/game/walk-art-prompts-v12.json`.
