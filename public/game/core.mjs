// Pure deterministic game simulation. Coordinates are arena tiles.
import { Invasion } from './invasion.mjs?v=7';
export const SIZE = 15;
export const QUOTES = [
  'Nunca antes na história deste país',
  'Tá ok?',
  'Eu tô saudando a mandioca',
  'Não renunciarei.',
  'Faz o M!',
  'O STF precisa voltar para a casinha',
  'Imposto é roubo',
  'Nós vamos virar essa eleição',
  'Me ajuda aí!',
];
export function rng(seed = 14) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const cell = (x, z) => `${Math.round(x)},${Math.round(z)}`;
export function generateMap(random = Math.random) {
  const map = Array.from({ length: SIZE }, (_, z) =>
    Array.from({ length: SIZE }, (_, x) =>
      x === 0 || z === 0 || x === 14 || z === 14
        ? 1
        : x % 2 === 0 && z % 2 === 0
          ? 1
          : random() < 0.32
            ? 2
            : 0,
    ),
  );
  const spawns = [
    [1, 1],
    [13, 13],
    [1, 13],
    [13, 1],
    [7, 7],
    [7, 13],
    [13, 7],
  ];
  for (const [x, z] of spawns)
    for (const [dx, dz] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      if (x + dx > 0 && x + dx < 14 && z + dz > 0 && z + dz < 14)
        map[z + dz][x + dx] = 0;
    }
  for (let x = 1; x < 14; x++) {
    map[7][x] = 0;
    map[1][x] = 0;
  }
  for (let z = 1; z < 14; z++) {
    map[z][1] = 0;
    map[z][7] = 0;
  }
  // Small plazas create room to dodge and lob bombs without losing cover.
  for (const [cx, cz] of [[3, 3], [11, 3], [3, 11], [11, 11]])
    for (let z = cz - 1; z <= cz + 1; z++)
      for (let x = cx - 1; x <= cx + 1; x++)
        if (map[z][x] === 2) map[z][x] = 0;
  return map;
}
export function blastCells(map, x, z, range) {
  x = Math.round(x);
  z = Math.round(z);
  const cells = [[x, z]];
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ])
    for (let i = 1; i <= range; i++) {
      const a = x + dx * i,
        b = z + dz * i;
      if (!map[b] || map[b][a] === undefined || map[b][a] === 1) break;
      cells.push([a, b]);
      if (map[b][a] === 2) break;
    }
  return cells;
}
export const NAMES = [
  'Lula',
  'Bolsonaro',
  'Dilma',
  'Temer',
  'Pablo Marçal',
  'Renan Santos',
  'Paulo Kogos',
  'Boulos',
  'Datena',
];
export const FUSE = 3;
export function advanceFrame(game, seconds, input = {}) {
  for (let remaining = Math.min(Math.max(0, seconds), .25); remaining > 1e-8; remaining -= .05)
    game.tick(Math.min(.05, remaining), input);
}
export const PHYSICS_STEP = 1 / 120;
const RADIUS = 0.19;
function obstacleHeight(map, x, z) {
  const cx = Math.round(x),
    cz = Math.round(z),
    v = map[cz]?.[cx];
  if (v === undefined) return 4;
  if (v === 1)
    return cx === 0 || cz === 0 || cx === 14 || cz === 14
      ? 3.6 / 2.7
      : 2.65 / 2.7;
  return v === 2 ? 2.1 / 2.7 : 0;
}
function supportHeight(map, x, z) {
  return Math.max(
    ...[
      [0, 0],
      [RADIUS, 0],
      [-RADIUS, 0],
      [0, RADIUS],
      [0, -RADIUS],
    ].map(([dx, dz]) => obstacleHeight(map, x + dx, z + dz)),
  );
}
export function launchState(player, heldTime = 0) {
  const power = Math.min(1, heldTime / 0.95),
    speed = 4.7 + power * 2.3,
    flat = Math.cos(player.pitch) * speed;
  return {
    x: player.x,
    z: player.z,
    y: 0.72,
    vx: -Math.sin(player.yaw) * flat,
    vz: -Math.cos(player.yaw) * flat,
    vy: Math.sin(player.pitch) * speed + 1.65,
    moving: true,
    flight: 1,
  };
}
// The prediction and live projectile use this exact integrator and fixed step.
export function advanceProjectile(b, map, dt) {
  if (!b.moving) return;
  b.vy -= 8.5 * dt;
  const nx = b.x + b.vx * dt,
    nz = b.z + b.vz * dt,
    ny = b.y + b.vy * dt;
  const xTop = supportHeight(map, nx, b.z);
  if (xTop > 0 && ny - RADIUS < xTop - 0.015 && b.y - RADIUS < xTop - 0.015) {
    b.vx *= -0.32;
  } else b.x = nx;
  const zTop = supportHeight(map, b.x, nz);
  if (zTop > 0 && ny - RADIUS < zTop - 0.015 && b.y - RADIUS < zTop - 0.015) {
    b.vz *= -0.32;
  } else b.z = nz;
  const top = supportHeight(map, b.x, b.z);
  if (ny <= top + RADIUS) {
    b.y = top + RADIUS;
    b.vy = Math.abs(b.vy) * 0.22;
    b.vx *= Math.exp(-dt * 12);
    b.vz *= Math.exp(-dt * 12);
    if (b.vy < 0.42) b.vy = 0;
    if (Math.hypot(b.vx, b.vz) < 0.14 && b.vy === 0) {
      b.vx = 0;
      b.vz = 0;
      b.moving = false;
      b.flight = 0;
    }
  } else b.y = ny;
}
export function predictThrow(player, map, heldTime = 0, fuse = FUSE) {
  const b = launchState(player, heldTime),
    points = [{ x: b.x, y: b.y, z: b.z }];
  const count = Math.ceil(Math.max(0, fuse) / PHYSICS_STEP);
  for (let n = 0; n < count; n++) {
    advanceProjectile(b, map, PHYSICS_STEP);
    if (n % 4 === 0 || !b.moving) points.push({ x: b.x, y: b.y, z: b.z });
    if (!b.moving) break;
  }
  const end = { x: b.x, y: b.y, z: b.z };
  points.push(end);
  return {
    points,
    end,
    airburst: b.y > supportHeight(map, b.x, b.z) + RADIUS + 0.2,
  };
}
export class Match {
  constructor(seed = Date.now()) {
    this.random = rng(seed);
    this.serial = 0;
    this.reset(0, 'caos');
    this.phase = 'menu';
  }
  reset(character = 0, mode = 'caos') {
    this.character = character;
    this.mode = mode;
    this.map = generateMap(this.random);
    this.phase = 'playing';
    this.player = {
      x: 1,
      z: 1,
      yaw: -Math.PI / 2,
      pitch: 0,
      hp: 3,
      invulnerable: 3,
      shield: 0,
      turbo: 0,
    };
    this.bombs = [];
    this.heldBomb = null;
    this.pendingRelease = null;
    this.countdown = 3;
    this.winner = -1;
    this.overtime = false;
    this.overtimeClock = 0;
    this.damageClock = 0;
    this.hitMarker = 0;
    this.damageFlash = 0;
    this.shieldFlash = 0;
    this.hitText = '';
    this.physicsAccumulator = 0;
    this.player.vx = 0;
    this.player.vz = 0;
    this.fires = [];
    this.items = [];
    this.events = [];
    this.score = 0;
    this.kills = 0;
    this.elapsed = 0;
    this.chaos = 0;
    this.cooldown = 0;
    this.specialCharge = 1;
    this.quote = '';
    this.quoteTime = 0;
    this.notice = 'BEM-VINDO AO CIRCO!';
    this.noticeTime = 3;
    this.combo = 0;
    this.comboTime = 0;
    this.nextStorm = mode === 'caos' ? 20 : 45;
    this.storm = [];
    this.range = 3;
    this.enemies = [];
    const positions = [
      [13, 13],
      [1, 13],
      [13, 1],
      [7, 7],
      [13, 7],
      [7, 13],
      [7, 1],
      [1, 7],
    ];
    positions.slice(0, mode === 'treino' ? 3 : 8).forEach(([x, z], i) =>
      this.enemies.push({
        id: ++this.serial,
        x,
        z,
        hp: mode === 'treino' ? 1 : 2,
        skin: (character + 1 + i) % NAMES.length,
        cd: 3 + i * 0.65,
        think: 0,
        target: null,
        invulnerable: 0,
        speed: mode === 'treino' ? 1.03 : 1.35,
        walk: 0,
      }),
    );
    this.invasion = new Invasion(this.random);
    this.events.push({ type: 'reset' });
  }
  solid(x, z) {
    return (
      !this.map[Math.round(z)] || this.map[Math.round(z)][Math.round(x)] !== 0
    );
  }
  canMove(x, z, r = 0.21) {
    return ![
      [r, r],
      [-r, r],
      [r, -r],
      [-r, -r],
    ].some(([dx, dz]) => this.solid(x + dx, z + dz));
  }
  move(actor, dx, dz) {
    if (this.canMove(actor.x + dx, actor.z)) actor.x += dx;
    if (this.canMove(actor.x, actor.z + dz)) actor.z += dz;
  }
  addBomb(x, z, owner = 'player', range = this.range, fuse = 2.3) {
    if (
      this.solid(x, z) ||
      this.bombs.some((b) => cell(b.x, b.z) === cell(x, z))
    )
      return null;
    const b = {
      id: ++this.serial,
      x: Math.round(x),
      z: Math.round(z),
      owner,
      range,
      fuse,
      maxFuse: fuse,
      flight: 0,
      y: 0.23,
      moving: false,
      sx: x,
      sz: z,
    };
    this.bombs.push(b);
    this.events.push({ type: 'bomb', bomb: b });
    return b;
  }
  beginHold() {
    if (
      this.invasion.stage === 'arrival' ||
      this.phase !== 'playing' ||
      this.countdown > 0 ||
      this.heldBomb ||
      this.cooldown > 0 ||
      this.bombs.filter((b) => b.owner === 'player').length >= 3
    )
      return false;
    this.heldBomb = { fuse: FUSE, heldTime: 0 };
    this.events.push({ type: 'pin' });
    return true;
  }
  releaseBomb(planted = false) {
    if (this.invasion.stage === 'arrival') { this.pendingRelease = planted; return false; }
    if (this.phase !== 'playing' || !this.heldBomb) return false;
    const h = this.heldBomb;
    this.heldBomb = null;
    const motion = planted
      ? {
          x: this.player.x,
          z: this.player.z,
          y: 0.23,
          vx: 0,
          vy: 0,
          vz: 0,
          moving: false,
          flight: 0,
        }
      : launchState(this.player, h.heldTime);
    const b = {
      id: ++this.serial,
      ...motion,
      owner: 'player',
      range: this.range,
      fuse: h.fuse,
      maxFuse: FUSE,
    };
    this.bombs.push(b);
    this.cooldown = 0.18;
    this.events.push({ type: 'throw' });
    return true;
  }
  throwBomb(planted = false) {
    if (!this.heldBomb && !this.beginHold()) return false;
    return this.releaseBomb(planted);
  }
  trajectory() {
    return this.heldBomb
      ? predictThrow(
          this.player,
          this.map,
          this.heldBomb.heldTime,
          this.heldBomb.fuse,
        )
      : null;
  }
  resolveWinner() {
    const alive = this.enemies.filter((e) => e.hp > 0);
    if (this.player.hp > 0 && alive.length === 0) this.winner = this.character;
    else if (this.player.hp <= 0 && alive.length === 1)
      this.winner = alive[0].skin;
    else if (this.player.hp <= 0 && alive.length === 0) this.winner = -2;
    else return false;
    this.phase =
      this.winner === this.character
        ? 'won'
        : this.winner === -2
          ? 'draw'
          : 'lost';
    if (this.phase === 'won')
      this.score +=
        this.player.hp * 300 + Math.max(0, Math.floor(180 - this.elapsed)) * 5;
    this.heldBomb = null;
    this.events.push({ type: 'end', won: this.phase === 'won' });
    return true;
  }
  speak() {
    if (this.quoteTime > 1) return;
    this.quote = QUOTES[this.character];
    this.quoteTime = 3;
    this.events.push({ type: 'voice', text: this.quote });
  }
  special() {
    if (
      this.invasion.stage === 'arrival' ||
      this.phase !== 'playing' ||
      this.countdown > 0 ||
      this.player.hp <= 0 ||
      this.specialCharge < 1
    )
      return false;
    this.specialCharge = 0;
    this.quoteTime = 0;
    this.speak();
    const p = this.player;
    p.shield = Math.max(p.shield, 4);
    if (this.character === 0) {
      for (let n = 2; n <= 6; n++) {
        const x = Math.round(p.x - Math.sin(p.yaw) * n),
          z = Math.round(p.z - Math.cos(p.yaw) * n);
        if (x > 0 && x < 14 && z > 0 && z < 14 && !this.solid(x, z))
          this.addBomb(x, z, 'special', 4, 1 + n * 0.13);
      }
      this.notice = 'ONDA VERMELHA!';
    }
    if (this.character === 1) {
      p.turbo = 6;
      p.shield = 6;
      this.notice = 'TÁ TURBO, TÁ OK?';
    }
    if (this.character === 2) {
      const b = this.addBomb(
        Math.round(p.x),
        Math.round(p.z),
        'special',
        6,
        0.7,
      );
      if (!b) {
        for (const b of this.bombs)
          if (cell(b.x, b.z) === cell(p.x, p.z)) {
            b.range = 6;
            b.owner = 'special';
            b.fuse = 0.7;
          }
      }
      this.notice = 'SAUDAÇÃO EXPLOSIVA!';
    }
    if (this.character === 3) {
      p.hp = Math.min(3, p.hp + 1);
      p.shield = 5;
      this.notice = 'NÃO RENUNCIAREI!';
    }
    if (this.character === 4) {
      p.turbo = 5;
      p.shield = 5;
      this.range = Math.min(6, this.range + 1);
      this.notice = 'MENTALIDADE EXPLOSIVA!';
    }
    if (this.character === 5) {
      this.specialCharge = 0;
      this.cooldown = 0;
      for (const b of this.bombs)
        if (b.owner === 'player') b.fuse = Math.min(b.fuse, 0.25);
      this.notice = 'MISSÃO: DETONAR!';
    }
    if (this.character === 6) {
      p.shield = 8;
      this.notice = 'PROPRIEDADE PROTEGIDA!';
    }
    if (this.character === 7) {
      p.hp = Math.min(3, p.hp + 1);
      p.turbo = 4;
      this.notice = 'VIRADA NA ARENA!';
    }
    if (this.character === 8) {
      this.addBomb(Math.round(p.x), Math.round(p.z), 'special', 7, 0.8);
      this.notice = 'ME AJUDA AÍ!';
    }
    this.noticeTime = 2.6;
    this.events.push({ type: 'special' });
    return true;
  }
  explode(b) {
    if (!this.bombs.includes(b)) return;
    this.bombs.splice(this.bombs.indexOf(b), 1);
    const cells = blastCells(this.map, b.x, b.z, b.range);
    this.combo = this.comboTime > 0 ? this.combo + 1 : 1;
    this.comboTime = 1.1;
    this.chaos = Math.min(100, this.chaos + 3);
    for (const [x, z] of cells) {
      if (this.map[z][x] === 2) {
        this.map[z][x] = 0;
        this.events.push({ type: 'crate', x, z });
        if (b.owner === 'player' || b.owner === 'special') this.score += 25;
        if (this.random() < 0.29)
          this.items.push({
            id: ++this.serial,
            x,
            z,
            type: Math.floor(this.random() * 3),
            wait: 0.9,
          });
      }
      this.fires.push({ id: ++this.serial, x, z, life: 0.72, owner: b.owner });
    }
    this.events.push({
      type: 'explode',
      x: b.x,
      y: b.y || 0.23,
      z: b.z,
      cells,
    });
    for (const other of this.bombs.slice()) {
      if (
        (other.y || 0) < 1.4 &&
        cells.some(([x, z]) => cell(x, z) === cell(other.x, other.z))
      )
        this.explode(other);
    }
  }
  danger() {
    const danger = new Set(this.fires.map((f) => cell(f.x, f.z)));
    for (const target of this.invasion.targets)
      for (const [x,z] of blastCells(this.map,target.x,target.z,1)) danger.add(cell(x,z));
    for (const b of this.bombs)
      for (const [x, z] of blastCells(this.map, b.x, b.z, b.range))
        danger.add(cell(x, z));
    for (const s of this.storm)
      for (const [x, z] of blastCells(this.map, s.x, s.z, 2))
        danger.add(cell(x, z));
    return danger;
  }
  path(start, goal, danger, escape = false) {
    const sx = Math.round(start.x),
      sz = Math.round(start.z),
      queue = [[sx, sz, null]],
      seen = new Set([cell(sx, sz)]);
    for (let i = 0; i < queue.length && i < 225; i++) {
      const [x, z, first] = queue[i];
      if (
        first &&
        ((escape && !danger.has(cell(x, z))) ||
          (!escape && x === goal[0] && z === goal[1]))
      )
        return first;
      const directions = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (const [dx, dz] of directions) {
        const nx = x + dx,
          nz = z + dz,
          key = cell(nx, nz);
        if (seen.has(key) || this.solid(nx, nz)) continue;
        if (!escape && danger.has(key)) continue;
        seen.add(key);
        queue.push([nx, nz, first || [nx, nz]]);
      }
    }
    return null;
  }
  tick(dt, input = {}) {
    if (!['playing', 'spectating'].includes(this.phase)) return;
    dt = Math.min(dt, 0.05);
    if (this.countdown > 0) {
      this.countdown = Math.max(0, this.countdown - dt);
      return;
    }
    // Every contestant, bomb fuse and match clock pauses for the shared flyby.
    if (this.invasion.tick(this, dt)) return;
    if (this.pendingRelease !== null) { const planted=this.pendingRelease;this.pendingRelease=null;this.releaseBomb(planted); }
    this.hitMarker = Math.max(0, this.hitMarker - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);
    this.shieldFlash = Math.max(0, this.shieldFlash - dt);
    const p = this.player;
    this.elapsed += dt;
    this.cooldown -= dt;
    this.specialCharge = Math.min(1, this.specialCharge + dt / 22);
    this.quoteTime -= dt;
    if (this.quoteTime <= 0) this.quote = '';
    this.noticeTime -= dt;
    if (this.noticeTime <= 0) this.notice = '';
    this.comboTime -= dt;
    if (this.comboTime <= 0) this.combo = 0;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.shield = Math.max(0, p.shield - dt);
    p.turbo = Math.max(0, p.turbo - dt);
    const forward = (input.forward ? 1 : 0) - (input.back ? 1 : 0),
      side = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const length = Math.hypot(forward, side) || 1,
      speed = (input.run ? 3.3 : 2.5) * (p.turbo > 0 ? 1.5 : 1),
      blend = 1 - Math.exp(-(forward || side ? 22 : 36) * dt);
    const active = p.hp > 0 && this.phase === 'playing';
    p.vx +=
      (active
        ? ((-Math.sin(p.yaw) * forward + Math.cos(p.yaw) * side) / length) *
            speed -
          p.vx
        : -p.vx) * blend;
    p.vz +=
      (active
        ? ((-Math.cos(p.yaw) * forward - Math.sin(p.yaw) * side) / length) *
            speed -
          p.vz
        : -p.vz) * blend;
    if (active) this.move(p, p.vx * dt, p.vz * dt);
    if (this.heldBomb) {
      this.heldBomb.heldTime += dt;
      this.heldBomb.fuse -= dt;
      if (this.heldBomb.fuse <= 0) {
        this.heldBomb = null;
        const b = {
          id: ++this.serial,
          x: p.x,
          z: p.z,
          y: 0.72,
          owner: 'player',
          range: this.range,
          fuse: 0,
        };
        this.bombs.push(b);
        this.explode(b);
        p.hp = Math.max(0, p.hp - 2);
        p.invulnerable = 1.6;
        this.damageFlash = 0.55;
        this.events.push({ type: 'hurt' });
        this.notice = 'EXPLODIU NA MÃO!';
        this.noticeTime = 2;
      }
    }
    this.physicsAccumulator += dt;
    while (this.physicsAccumulator >= PHYSICS_STEP) {
      for (const b of this.bombs.slice()) {
        advanceProjectile(b, this.map, PHYSICS_STEP);
        b.fuse -= PHYSICS_STEP;
        if (b.fuse <= 0) this.explode(b);
      }
      this.physicsAccumulator -= PHYSICS_STEP;
    }
    for (const f of this.fires) f.life -= dt;
    this.fires = this.fires.filter((f) => f.life > 0);
    const hazard = this.danger();
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.invulnerable = Math.max(0, e.invulnerable - dt);
      e.cd -= dt;
      e.think -= dt;
      const endangered = hazard.has(cell(e.x, e.z));
      if (e.think <= 0 || !e.target) {
        e.think = 0.24;
        const targets = [
          ...(p.hp > 0 ? [p] : []),
          ...this.enemies.filter((other) => other.id !== e.id && other.hp > 0),
        ];
        const victim =
          targets.sort(
            (a, b) =>
              Math.hypot(e.x - a.x, e.z - a.z) -
              Math.hypot(e.x - b.x, e.z - b.z),
          )[0] || p;
        const goal = [Math.round(victim.x), Math.round(victim.z)];
        e.target = this.path(e, goal, hazard, endangered);
        if (!e.target) {
          const possible = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]
            .map(([dx, dz]) => [Math.round(e.x) + dx, Math.round(e.z) + dz])
            .filter(([x, z]) => !this.solid(x, z) && !hazard.has(cell(x, z)));
          e.target =
            possible[Math.floor(this.random() * possible.length)] || null;
        }
      }
      if (e.target) {
        const dx = e.target[0] - e.x,
          dz = e.target[1] - e.z,
          d = Math.hypot(dx, dz);
        if (d < 0.05) {
          e.x = e.target[0];
          e.z = e.target[1];
          e.target = null;
        } else {
          const move = Math.min(d, e.speed * dt * (endangered ? 1.65 : 1));
          this.move(e, (dx / d) * move, (dz / d) * move);
          e.walk += dt * 8;
        }
      }
      const near =
        (p.hp > 0 && Math.hypot(p.x - e.x, p.z - e.z) < 5) ||
        this.enemies.some(
          (other) =>
            other.id !== e.id &&
            other.hp > 0 &&
            Math.hypot(other.x - e.x, other.z - e.z) < 5,
        );
      const blocked = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(
        ([dx, dz]) =>
          this.map[Math.round(e.z) + dz]?.[Math.round(e.x) + dx] === 2,
      );
      if (e.cd <= 0 && !endangered && (near || blocked)) {
        const bomb = this.addBomb(e.x, e.z, e.id, 2, 2.7);
        e.cd = 4 + this.random() * 2;
        if (bomb) {
          e.target = null;
          e.think = 0;
        }
      }
    }
    const hit = (a) =>
      this.fires.find(
        (f) => Math.abs(f.x - a.x) < 0.58 && Math.abs(f.z - a.z) < 0.58,
      );
    if (p.hp > 0 && hit(p) && p.invulnerable <= 0 && p.shield > 0 && this.shieldFlash <= 0) {
      this.shieldFlash = 0.45;
      this.events.push({ type: 'shield-block' });
    }
    if (p.hp > 0 && hit(p) && p.invulnerable <= 0 && p.shield <= 0) {
      p.hp--;
      p.invulnerable = 1.6;
      this.damageFlash = 0.55;
      this.events.push({ type: 'hurt' });
    }
    for (const e of this.enemies) {
      const fire = hit(e);
      if (e.hp > 0 && e.invulnerable <= 0 && fire) {
        e.hp--;
        e.invulnerable = 0.9;
        const credited = fire.owner === 'player' || fire.owner === 'special';
        this.events.push({ type: 'hit', id: e.id, x: e.x, z: e.z, credited, lethal: e.hp <= 0 });
        if (credited) {
          this.hitMarker = e.hp <= 0 ? 0.9 : 0.5;
          this.hitText = e.hp <= 0 ? `${NAMES[e.skin]} ELIMINADO +500` : `${NAMES[e.skin]} · -1 CORAÇÃO`;
        }
        if (e.hp <= 0) {
          if (credited) this.kills++;
          this.score +=
            fire.owner === 'player' || fire.owner === 'special' ? 500 : 200;
          this.chaos = Math.min(100, this.chaos + 12);
          this.specialCharge = Math.min(1, this.specialCharge + 0.2);
          this.events.push({ type: 'defeat', id: e.id, x: e.x, z: e.z });
          this.notice = [
            'CASSADO PELO CAOS!',
            'MANDATO ENCERRADO!',
            'VIROU CONFETE!',
          ][Math.floor(this.random() * 3)];
          this.noticeTime = 1.7;
        }
      }
    }
    for (const item of this.items) item.wait -= dt;
    for (const item of this.items.slice())
      if (
        p.hp > 0 &&
        item.wait <= 0 &&
        (item.type !== 0 || p.hp < 3) &&
        Math.hypot(item.x - p.x, item.z - p.z) < 0.68
      ) {
        if (item.type === 0) p.hp = Math.min(3, p.hp + 1);
        if (item.type === 1) p.shield = Math.max(p.shield, 6);
        if (item.type === 2) this.range = Math.min(6, this.range + 1);
        this.items.splice(this.items.indexOf(item), 1);
        this.score += 100;
        this.notice = [
          'CORAÇÃO RECUPERADO!',
          'ESCUDO ATIVADO!',
          'MAIS ALCANCE!',
        ][item.type];
        this.noticeTime = 1.8;
        this.events.push({ type: 'pickup' });
      }
    if (this.elapsed >= this.nextStorm) {
      this.nextStorm += this.mode === 'caos' ? 22 : 40;
      this.notice = 'CHUVA DE PROMESSAS!';
      this.noticeTime = 3;
      for (let i = 0; i < 6; i++) {
        const x = 1 + Math.floor(this.random() * 13),
          z = 1 + Math.floor(this.random() * 13);
        if (this.map[z][x] === 0 && Math.hypot(x - p.x, z - p.z) > 2)
          this.storm.push({ id: ++this.serial, x, z, time: 2.2 + i * 0.12 });
      }
      this.events.push({ type: 'storm' });
    }
    for (const s of this.storm.slice()) {
      s.time -= dt;
      if (s.time <= 0) {
        this.storm.splice(this.storm.indexOf(s), 1);
        this.addBomb(s.x, s.z, 'circus', 2, 0.12);
      }
    }
    this.chaos = Math.min(100, this.chaos + dt * 0.08);
    if (p.hp <= 0 && this.phase === 'playing') {
      this.phase = 'spectating';
      this.heldBomb = null;
      this.events.push({ type: 'spectate' });
      this.notice = 'ELIMINADO · A ELEIÇÃO CONTINUA';
      this.noticeTime = 4;
    }
    if (this.elapsed >= 180) {
      if (!this.overtime) {
        this.overtime = true;
        this.notice = 'SEGUNDO TURNO · MORTE SÚBITA';
        this.noticeTime = 4;
      }
      this.overtimeClock += dt;
      this.damageClock += dt;
      if (this.overtimeClock >= 2) {
        this.overtimeClock = 0;
        for (const a of [p, ...this.enemies].filter((a) => a.hp > 0))
          this.storm.push({
            id: ++this.serial,
            x: Math.round(a.x),
            z: Math.round(a.z),
            time: 1.6,
          });
      }
      if (this.damageClock >= 10) {
        this.damageClock = 0;
        for (const a of [p, ...this.enemies]) if (a.hp > 0) a.hp--;
      }
    }
    this.resolveWinner();
  }

  snapshot() {
    return {
      phase: this.phase,
      invasion: this.invasion.snapshot(),
      countdown: this.countdown,
      holding: !!this.heldBomb,
      fuse: this.heldBomb ? Math.max(0, this.heldBomb.fuse) : 0,
      power: this.heldBomb ? Math.min(1, this.heldBomb.heldTime / 0.95) : 0,
      winner: this.winner,
      overtime: this.overtime,
      hitMarker: this.hitMarker,
      hitText: this.hitText,
      damageFlash: this.damageFlash,
      shieldFlash: this.shieldFlash,
      hp: this.player.hp,
      kills: this.kills,
      score: this.score,
      time: Math.max(0, 180 - this.elapsed),
      bombs: Math.max(
        0,
        3 -
          this.bombs.filter((b) => b.owner === 'player').length -
          (this.heldBomb ? 1 : 0),
      ),
      special: this.specialCharge,
      chaos: this.chaos,
      enemies: this.enemies.filter((e) => e.hp > 0).length,
      quote: this.quote,
      event: this.notice,
      combo: this.combo,
      shield: this.player.shield > 0,
      shieldTime: this.player.shield,
      wave: 1,
    };
  }
}
