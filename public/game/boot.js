import { createGame } from './engine.js?v=16';
import { loadCharacterAtlas } from './characters.js?v=4';
import { loadCutout } from './cutouts-v7.js';
window.createBombaGame = createGame;
window.loadCharacterAtlas = loadCharacterAtlas;
window.loadGameLogo=()=>loadCutout('/logo-pixel-v15.png').then(canvas=>canvas.toDataURL('image/png'));
