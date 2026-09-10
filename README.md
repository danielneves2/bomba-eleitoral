# Bomba Eleitoral — Circo do Caos

Jogo satírico em primeira pessoa, criado com Three.js e uma interface React.

Escolha entre nove personagens: Lula, Bolsonaro, Dilma, Temer, Pablo Marçal, Renan Santos, Paulo Kogos, Boulos e Datena. Dispute contra oito rivais controlados pelo jogo (três em Aquecimento). O último sobrevivente é eleito. Após três minutos começa a morte súbita; se ninguém sobreviver, a eleição é anulada. Explosões se propagam em cruz, destroem caixotes e detonam outras bombas. Elas também atingem o jogador.

Uma invasão é sorteada ao iniciar cada partida: Putin, Trump ou Kim Jong-un, com chances iguais. O aviso começa entre 5 e 10 segundos de jogo, com sete segundos de barra, retrato e sirene. Cada chegada dura 2,2 segundos e pausa participantes e pavios. Depois o invasor age por 14 segundos, ou até a eleição encerrar a partida. Putin chega de avião e lança duas bombas, com áreas fixas marcadas de vermelho por 2,5 segundos. Trump aparece com palanque, bandeira americana ondulando, águia e fanfarra; depois percorre os corredores deixando bombas. Kim chega com um lançador e dispara três foguetes, com dois segundos para sair das marcas laranja. Os invasores não disputam a eleição. A partida continua sendo local contra bots.

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
