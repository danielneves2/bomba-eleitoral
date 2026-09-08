// Pure deterministic game simulation. Coordinates are arena tiles.
export const SIZE = 15;
export const QUOTES = [
  'Nunca antes na história deste país',
  'Tá ok?',
  'Eu tô saudando a mandioca',
  'Não renunciarei.',
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
          : random() < 0.47
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
  for (let z = 1; z < 14; z++) map[z][1] = 0;
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
    ];
    positions.slice(0, mode === 'treino' ? 3 : 5).forEach(([x, z], i) =>
      this.enemies.push({
        id: ++this.serial,
        x,
        z,
        hp: mode === 'treino' ? 1 : 2,
        skin: (character + 1 + (i % 3)) % 4,
        cd: 3 + i * 0.65,
        think: 0,
        target: null,
        invulnerable: 0,
        speed: mode === 'treino' ? 1.03 : 1.35,
        walk: 0,
      }),
    );
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
      sx: x,
      sz: z,
    };
    this.bombs.push(b);
    this.events.push({ type: 'bomb', bomb: b });
    return b;
  }
  throwBomb(planted = false) {
    if (
      this.phase !== 'playing' ||
      this.cooldown > 0 ||
      this.bombs.filter((b) => b.owner === 'player').length >= 3
    )
      return false;
    const p = this.player;
    let tx = Math.round(p.x),
      tz = Math.round(p.z);
    if (!planted) {
      for (let s = 0.5; s <= 3.5; s += 0.18) {
        const x = Math.round(p.x - Math.sin(p.yaw) * s),
          z = Math.round(p.z - Math.cos(p.yaw) * s);
        if (x < 1 || x > 13 || z < 1 || z > 13) break;
        if (!this.solid(x, z)) {
          tx = x;
          tz = z;
        }
      }
    }
    const b = this.addBomb(tx, tz);
    if (!b) return false;
    if (!planted) {
      b.flight = 0.48;
      b.sx = p.x;
      b.sz = p.z;
    }
    this.cooldown = 0.32;
    this.events.push({ type: 'throw' });
    return true;
  }
  speak() {
    if (this.quoteTime > 1) return;
    this.quote = QUOTES[this.character];
    this.quoteTime = 3;
    this.events.push({ type: 'voice', text: this.quote });
  }
  special() {
    if (this.phase !== 'playing' || this.specialCharge < 1) return false;
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
    this.events.push({ type: 'explode', x: b.x, z: b.z, cells });
    for (const other of this.bombs.slice()) {
      if (
        other.flight <= 0 &&
        cells.some(([x, z]) => cell(x, z) === cell(other.x, other.z))
      )
        this.explode(other);
    }
  }
  danger() {
    const danger = new Set(this.fires.map((f) => cell(f.x, f.z)));
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
    if (this.phase !== 'playing') return;
    dt = Math.min(dt, 0.05);
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
      speed = (input.run ? 2.75 : 2.05) * (p.turbo > 0 ? 1.65 : 1) * dt;
    this.move(
      p,
      ((-Math.sin(p.yaw) * forward + Math.cos(p.yaw) * side) / length) * speed,
      ((-Math.cos(p.yaw) * forward - Math.sin(p.yaw) * side) / length) * speed,
    );
    for (const b of this.bombs.slice()) {
      b.flight = Math.max(0, b.flight - dt);
      b.fuse -= dt;
      if (b.fuse <= 0) this.explode(b);
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
        const goal = [Math.round(p.x), Math.round(p.z)];
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
      const near = Math.hypot(p.x - e.x, p.z - e.z) < 5;
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
    if (hit(p) && p.invulnerable <= 0 && p.shield <= 0) {
      p.hp--;
      p.invulnerable = 1.6;
      this.events.push({ type: 'hurt' });
    }
    for (const e of this.enemies) {
      const fire = hit(e);
      if (e.hp > 0 && e.invulnerable <= 0 && fire) {
        e.hp--;
        e.invulnerable = 0.9;
        this.events.push({ type: 'hit', x: e.x, z: e.z });
        if (e.hp <= 0) {
          this.kills++;
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
      if (item.wait <= 0 && Math.hypot(item.x - p.x, item.z - p.z) < 0.55) {
        if (item.type === 0) p.hp = Math.min(3, p.hp + 1);
        if (item.type === 1) p.shield = 6;
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
    if (p.hp <= 0) {
      this.phase = 'lost';
      this.events.push({ type: 'end', won: false });
    } else if (this.enemies.every((e) => e.hp <= 0) || this.elapsed >= 180) {
      this.phase = 'won';
      this.score += p.hp * 300 + Math.floor(180 - this.elapsed) * 5;
      this.events.push({ type: 'end', won: true });
    }
  }
  snapshot() {
    return {
      phase: this.phase,
      hp: this.player.hp,
      kills: this.kills,
      score: this.score,
      time: Math.max(0, 180 - this.elapsed),
      bombs: Math.max(
        0,
        3 - this.bombs.filter((b) => b.owner === 'player').length,
      ),
      special: this.specialCharge,
      chaos: this.chaos,
      enemies: this.enemies.filter((e) => e.hp > 0).length,
      quote: this.quote,
      event: this.notice,
      combo: this.combo,
      shield: this.player.shield > 0,
      wave: 1,
    };
  }
}
