# Bomba Eleitoral — Circo do Caos

Jogo satírico em primeira pessoa, criado com Three.js e uma interface React.

Escolha Lula, Bolsonaro, Dilma ou Temer. Elimine cinco rivais (três em Aquecimento), ou sobreviva por três minutos. Explosões se propagam em cruz, destroem caixotes e detonam outras bombas. Elas também atingem o jogador.

- WASD: mover; mouse: mirar; Shift: correr.
- Clique: arremessar; Espaço: plantar bomba; E: especial; Q: bordão.
- Esc ou P: pausar. Setas também permitem andar e girar a câmera.
- No celular: direcional à esquerda, arraste a arena para mirar e toque na bomba para arremessar.

Falas históricas curtas, com fontes acessíveis nos créditos. Áudio por síntese de voz do navegador, sem imitação de vozes reais. Retratos gerados por IA. Personagens e habilidades são sátira fictícia, sem afiliação política.

## Desenvolvimento

Node.js 22.13 ou superior. `npm install`, `npm run dev`.
`npm run build` gera o jogo estático em `dist/client`.
`node scripts/serve.mjs` abre a versão compilada no navegador.

O script de build dá 750 ms para o encerramento dos workers nativos no Windows, evitando uma falha de libuv após a conclusão bem-sucedida do Vinext.

O lint verifica o código autoral. Componentes pré-instalados e a cópia fornecida de Three.js permanecem intactos.

Three.js 0.185.1 foi reutilizado da pasta fornecida; licença MIT em `public/vendor/LICENSE`.
