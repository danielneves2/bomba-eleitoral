import { Server } from 'socket.io';
import http from 'http';
import { Match, advanceFrame } from '../public/game/core.mjs';

const PORT = process.env.PORT || 4000;

const server = http.createServer();
// Em producao, ALLOWED_ORIGINS lista as URLs do jogo separadas por virgula.
// Sem a variavel, so o desenvolvimento local e liberado.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"]
  }
});

// Armazena as salas ativas e suas instâncias de jogo
const rooms = {};

// Convidados precisam confirmar "estou pronto"; o host so consegue iniciar quando todos confirmarem.
function roomState(room) {
  const indexes = Object.values(room.players);
  const guests = indexes.filter(i => i !== 0);
  const readyGuests = guests.filter(i => room.ready[i]);
  return {
    total: indexes.length,
    guests: guests.length,
    ready: readyGuests.length,
    allReady: guests.length > 0 && readyGuests.length === guests.length
  };
}
function broadcastRoomState(room) {
  io.to(room.code).emit('roomState', roomState(room));
}

io.on('connection', (socket) => {
  console.log(`[+] Jogador conectado: ${socket.id}`);

  // 1. Criar Sala
  socket.on('createRoom', (callback) => {
    // Gera um código de 4 caracteres (ex: A2F9)
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Inicia a partida (Autoritária) na memória do servidor
    const seed = Date.now();
    rooms[roomCode] = {
      seed,
      match: new Match(seed), // A engine crua rodando no servidor
      players: {}, // Mapeia o socket.id para o índice do personagem (0 a 8)
      host: socket.id,
      code: roomCode,
      ready: {},
      characters: { 0: 0 }
    };

    void socket.join(roomCode);
    rooms[roomCode].players[socket.id] = 0; // O Criador assume o Player 0
    
    console.log(`Sala criada: ${roomCode} por ${socket.id}`);
    callback({ success: true, roomCode, playerIndex: 0, seed: rooms[roomCode].seed });
  });

  // 2. Entrar em Sala
  socket.on('joinRoom', (roomCode, callback) => {
    roomCode = roomCode.toUpperCase();
    const room = rooms[roomCode];

    if (room) {
      const playerCount = Object.keys(room.players).length;
      if (playerCount < 9) { // Máximo de 9 personagens no jogo
        void socket.join(roomCode);
        room.players[socket.id] = playerCount; // Pega o próximo índice livre
        
        console.log(`Jogador ${socket.id} entrou na sala ${roomCode}`);
        callback({ success: true, playerIndex: playerCount, seed: room.seed });
        
        // Avisa aos outros da sala que um novo jogador entrou
        socket.to(roomCode).emit('playerJoined', { id: socket.id, index: playerCount });
        broadcastRoomState(room);
      } else {
        callback({ success: false, message: 'A sala está cheia!' });
      }
    } else {
      callback({ success: false, message: 'Sala não encontrada.' });
    }
  });

  // 2.5 Iniciar o Jogo
  socket.on('startGame', (data) => {
    const { roomCode, character, mode } = data;
    const room = rooms[roomCode];
    if (room && room.players[socket.id] === 0) {
      if (!roomState(room).allReady) {
        socket.emit('startRefused', { reason: 'Espere todos os convidados confirmarem que estao prontos.' });
        return;
      }
      const seed = Date.now();
      room.seed = seed;
      room.characters[0] = character;
      const humans = Object.values(room.players).sort((a, b) => a - b);
      room.match = new Match(seed);
      room.match.reset(character, mode);
      room.match.setNetworked({ remote: false });
      for (const index of humans) room.match.claimFighter(index, room.characters[index]);
      room.playersInputs = {};
      io.to(roomCode).emit('matchStarted', { seed, character, mode, humans, characters: room.characters });
    }
  });

  // 2.6 Convidado confirma que esta pronto
  socket.on('playerReady', (data) => {
    const room = rooms[(data?.roomCode || '').toUpperCase()];
    if (!room) return;
    const playerIndex = room.players[socket.id];
    if (playerIndex === undefined || playerIndex === 0) return;
    room.ready[playerIndex] = true;
    if (Number.isInteger(data.character)) room.characters[playerIndex] = data.character;
    broadcastRoomState(room);
  });

  // 3. Receber Inputs (Comandos do Teclado/Mouse)
  socket.on('input', (data) => {
    const { roomCode, input } = data;
    const room = rooms[roomCode];
    if (room) {
      const playerIndex = room.players[socket.id];
      if (playerIndex !== undefined) {
        // Guarda o input recebido para ser processado no próximo Tick do servidor
        room.playersInputs = room.playersInputs || {};
        room.playersInputs[playerIndex] = input;
      }
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log(`[-] Jogador desconectado: ${socket.id}`);
    for (const room of Object.values(rooms)) {
      const playerIndex = room.players[socket.id];
      if (playerIndex === undefined) continue;
      delete room.players[socket.id];
      delete room.ready[playerIndex];
      delete room.playersInputs?.[playerIndex];
      // Quem cai vira bot: a partida continua em vez de travar com um boneco parado.
      const abandoned = room.match?.fighter(playerIndex);
      if (abandoned) abandoned.human = false;
      if (Object.keys(room.players).length === 0) delete rooms[room.code];
      else broadcastRoomState(room);
    }
    // Futuro: Transformar o jogador que caiu em BOT para a partida não quebrar
  });
});

// ==========================================
// GAME LOOP AUTORITÁRIO (Tick Rate: 20 vezes por segundo)
// ==========================================
setInterval(() => {
  for (const [roomCode, room] of Object.entries(rooms)) {
    if (!room.match || !['playing', 'spectating'].includes(room.match.phase)) continue;
    // Aqui avançamos a simulação do core.mjs
    advanceFrame(room.match, 0.05, room.playersInputs || {});
    // Serializa o estado para enviar aos clientes da sala
    const stateSnapshot = {
      phase: room.match.phase,
      countdown: room.match.countdown,
      time: Math.max(0, 180 - room.match.elapsed),
      score: room.match.score,
      kills: room.match.kills,
      players: [room.match.player, ...room.match.enemies].map(p => ({
        x: p.x, 
        z: p.z, 
        hp: p.hp, 
        rot: p.yaw // Ângulo em que está olhando
      })),
      bombs: room.match.bombs.map(b => ({
        id: b.id, x: b.x, y: b.y, z: b.z, fuse: b.fuse, owner: b.owner, range: b.range
      })),
      // O cliente parou de sortear: item, fogo e tempestade vem prontos daqui.
      items: room.match.items.map(i => ({ id: i.id, x: i.x, z: i.z, type: i.type, wait: i.wait })),
      fires: room.match.fires.map(f => ({ id: f.id, x: f.x, z: f.z, life: f.life, owner: f.owner })),
      storm: room.match.storm.map(t => ({ id: t.id, x: t.x, z: t.z, time: t.time })),
      // Objetos criados por especiais de qualquer jogador.
      chairs: room.match.chairs.map(c => ({ ...c })),
      barricades: room.match.barricades.map(b => ({ ...b })),
      decoys: room.match.decoys.map(d => ({ ...d })),
      specialEffects: room.match.specialEffects.map(e => ({ ...e })),
      map: room.match.map,
      invasion: room.match.invasion.netState(room.match)
    };

    // Dispara o estado oficial (Snapshot) para todos os clientes
    io.to(roomCode).emit('tick', stateSnapshot);
  }
}, 50); // 50ms = 20 Ticks/segundo

server.listen(PORT, () => {
  console.log(`[⚡] Servidor Koyeb (Socket.io) rodando na porta ${PORT}`);
});
