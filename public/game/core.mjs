// Pure deterministic game simulation. Coordinates are arena tiles.
import { Invasion, TRUMP_RADIUS } from './invasion.mjs?v=15';
import { circleCells } from './impact.mjs?v=11';
import { clearSight } from './impact.mjs?v=11';
export const SIZE = 15;
export const ARENAS = [
  {id:'circo',name:'Circo do Caos',subtitle:'Luzes, lona e promessas explosivas',color:'#d5ff46'},
  {id:'favela',name:'Favela',subtitle:'Becos, lajes e muita correria',color:'#ffb04e'},
  {id:'planalto',name:'Planalto / Congresso',subtitle:'O último debate na Praça dos Poderes',color:'#76ddff'},
];
export function arenaRoll(countdown,selected) {
  const t=Math.max(0,Math.min(1,(6.2-countdown)/2.4));
  return {index:t>=1?selected:Math.floor((15+selected)*(1-Math.pow(1-t,3)))%ARENAS.length,locked:t>=1};
}
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
export function generateMap(random = Math.random, arena = 'circo') {
  const map = Array.from({ length: SIZE }, (_, z) =>
    Array.from({ length: SIZE }, (_, x) =>
      x === 0 || z === 0 || x === 14 || z === 14
        ? 1
        : (arena==='favela' ? (z%4===0&&x%3!==1 || x%4===0&&z%4===2) : arena==='planalto' ? (x%4===0&&z%4===0 || z===4&&x%2===0 || z===10&&x%2===0) : x % 2 === 0 && z % 2 === 0)
          ? 1
          : random() < (arena==='planalto'?.26:arena==='favela'?.3:.32)
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
  // Connected perimeter and cross streets guarantee routes between every spawn.
  if(arena!=='circo') {
    for(let i=1;i<14;i++){map[13][i]=0;map[i][13]=0;}
    if(arena==='favela')for(let i=1;i<14;i++){map[3][i]=0;map[11][i]=0;}
    if(arena==='planalto')for(let z=5;z<=9;z++)for(let x=5;x<=9;x++)map[z][x]=0;
  }
  // Small plazas create room to dodge and lob bombs without losing cover.
  for (const [cx, cz] of [[3, 3], [11, 3], [3, 11], [11, 11]])
    for (let z = cz - 1; z <= cz + 1; z++)
      for (let x = cx - 1; x <= cx + 1; x++)
        if (map[z][x] === 2) map[z][x] = 0;
  return map;
}
const ARENA_PREVIEWS=ARENAS.map(arena=>({...arena,tiles:generateMap(rng(42),arena.id).flat()}));
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
      if (!map[b] || map[b][a] === undefined || map[b][a] === 1 || map[b][a] === 3) break;
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
  return v === 2 || v === 3 ? 2.1 / 2.7 : 0;
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
    this.teamMode=mode.startsWith('teams-');
    this.playerTeam=mode==='teams-right'?'right':'left';this.winnerTeam=null;
    this.arenaIndex=Math.floor(this.random()*ARENAS.length);
    this.arena=ARENAS[this.arenaIndex];
    this.map = generateMap(this.random,this.arena.id);
    this.phase = 'playing';
    this.player = {
      team:this.teamMode?this.playerTeam:null,
      x: 1,
      z: 1,
      yaw: -Math.PI / 2,
      pitch: 0,
      hp: 3,
      invulnerable: 3,
      shield: 0,
      turbo: 0,
      picanha: 0,
      picanhaTime: 0,
      wind: 0,
      vampire: 0,
      ram: 0,
    };
    this.bombs = [];
    this.heldBomb = null;
    this.pendingRelease = null;
    this.countdown = 6.2;
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
    this.chairs = [];
    this.chairReady=false;this.chairThrowTime=0;this.equipTime=0;
    this.decoys = [];
    this.barricades = [];
    this.property = null;
    this.items = [];
    this.events = [];
    this.score = 0;
    this.kills = 0;
    this.elapsed = 0;
    this.chaos = 0;
    this.cooldown = 0;
    this.specialCharge = 1;
    this.specialItems = 0;
    this.nextSpecialItem = 12 + this.random()*8;
    this.swordTime = 0; this.swordCooldown = 0; this.swordSwing = 0;
    this.quote = '';
    this.quoteTime = 0;
    this.notice = this.arena.name.toUpperCase()+' • VALE A FAIXA!';
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
        ramCooldown: 0,
        speed: mode === 'treino' ? 1.03 : 1.35,
        walk: 0,
      }),
    );
    if(this.teamMode) {
      const squads={left:[0,2,7],right:[1,4,6]},opposite=this.playerTeam==='left'?'right':'left';
      const allies=squads[this.playerTeam].filter(s=>s!==character).slice(0,2);
      const used=new Set([character,...allies]);
      const rivals=[...squads[opposite],...NAMES.map((_,i)=>i)].filter((s,i,list)=>!used.has(s)&&list.indexOf(s)===i).slice(0,3);
      const spots=[[1,7],[1,13],[13,1],[13,7],[13,13]];
      this.enemies=this.enemies.slice(0,5);
      this.enemies.forEach((e,i)=>{e.skin=[...allies,...rivals][i];e.team=i<2?this.playerTeam:opposite;[e.x,e.z]=spots[i];e.hp=3;});
    }
    this.invasion = new Invasion(this.random,this.lastOmittedInvader);
    this.lastOmittedInvader=this.invasion.omitted;
    this.events.push({ type: 'reset' });
  }
  solid(x, z) {
    return (
      !this.map[Math.round(z)] || this.map[Math.round(z)][Math.round(x)] !== 0
    );
  }
  sameTeam(a,b){return this.teamMode&&a?.team!=null&&a.team===b?.team;}
  friendlyDamage(actor,owner){
    const source=owner==='player'||owner==='special'?this.player:this.enemies.find(e=>e.id===owner);
    return source!==actor&&this.sameTeam(actor,source);
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
    if(this.invasion.cages.some(c=>c.victim===actor&&c.time>0)) { actor.vx=0;actor.vz=0;return; }
    const propertyBlocks = (x, z) => {
      if (!this.property || this.property.time <= 0 || actor === this.player || this.sameTeam(actor,this.player)) return false;
      const before = Math.hypot(actor.x - this.property.x, actor.z - this.property.z);
      const after = Math.hypot(x - this.property.x, z - this.property.z);
      return before >= this.property.radius && after < this.property.radius;
    };
    if (this.canMove(actor.x + dx, actor.z) && !propertyBlocks(actor.x + dx, actor.z)) actor.x += dx;
    if (this.canMove(actor.x, actor.z + dz) && !propertyBlocks(actor.x, actor.z + dz)) actor.z += dz;
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
  primaryPress() {
    if(this.phase!=='playing'||this.countdown>0||this.invasion.stage==='arrival'||this.player.hp<=0)return false;
    if(this.swordTime>0)return this.swingSword();
    if(this.chairReady)return this.throwChair();
    return this.beginHold();
  }
  swingSword() {
    if(this.swordTime<=0||this.swordCooldown>0||this.phase!=='playing'||this.countdown>0||this.invasion.stage==='arrival'||this.player.hp<=0)return false;
    this.swordCooldown=.24;this.swordSwing=.2;
    const p=this.player;
    const victim=this.enemies.find(e=>!this.sameTeam(e,p)&&e.hp>0&&e.invulnerable<=0&&Math.hypot(e.x-p.x,e.z-p.z)<1.55&&
      (-(e.x-p.x)*Math.sin(p.yaw)-(e.z-p.z)*Math.cos(p.yaw))>Math.hypot(e.x-p.x,e.z-p.z)*.5&&clearSight(this,p,e));
    const hit=victim&&this.hurtEnemy(victim,'special',2);
    if(hit)victim.invulnerable=.22;
    this.events.push({type:hit?'sword-hit':'sword-swing'});return true;
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
    if(this.teamMode) {
      const survivors=[...(this.player.hp>0?[this.player]:[]),...alive],teams=new Set(survivors.map(a=>a.team));
      if(teams.size>1)return false;
      this.winnerTeam=teams.size?[...teams][0]:null;
      this.winner=this.winnerTeam===this.playerTeam?this.character:survivors[0]?.skin??-2;
    }
    else if (this.player.hp > 0 && alive.length === 0) this.winner = this.character;
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
  insideProperty(actor = this.player) {
    return !!this.property && this.property.time > 0 &&
      Math.hypot(actor.x - this.property.x, actor.z - this.property.z) < this.property.radius;
  }
  reviveVampire() {
    const p = this.player;
    const danger = this.danger();
    let safe = null;
    for (let z = 1; z < SIZE - 1; z++)
      for (let x = 1; x < SIZE - 1; x++) {
        if (this.map[z][x] !== 0 || danger.has(cell(x, z))) continue;
        if (this.enemies.some((e) => e.hp > 0 && Math.hypot(e.x - x, e.z - z) < 1.1)) continue;
        const distance = Math.hypot(p.x - x, p.z - z);
        if (!safe || distance < safe.distance) safe = { x, z, distance };
      }
    if (safe) {
      p.x = safe.x;
      p.z = safe.z;
    }
    p.hp = 1;
    p.vampire = 0;
    p.invulnerable = 1.25;
    p.vx = 0;
    p.vz = 0;
    this.notice = 'VOLTOU DO ALÉM!';
    this.noticeTime = 2.6;
    this.events.push({ type: 'vampire-revive', x: p.x, z: p.z });
  }
  hurtPlayer(amount = 1, { unblockable = false, ignoreInvulnerable = false } = {}) {
    const p = this.player;
    if(p.picanhaTime>0) {this.shieldFlash=.3;return false;}
    if (p.hp <= 0 || (!ignoreInvulnerable && p.invulnerable > 0)) return false;
    if (!unblockable && (p.shield > 0 || this.insideProperty(p))) {
      p.invulnerable = 0.75;
      this.shieldFlash = 0.45;
      this.events.push({ type: 'shield-block' });
      return false;
    }
    p.hp = Math.max(0, p.hp - amount);
    p.invulnerable = 1.6;
    this.damageFlash = 0.55;
    this.events.push({ type: 'hurt' });
    if (p.hp <= 0 && p.vampire > 0) this.reviveVampire();
    return true;
  }
  hurtEnemy(enemy, owner = 'special', amount = 1) {
    if (!enemy || enemy.hp <= 0 || enemy.invulnerable > 0 || this.friendlyDamage(enemy,owner)) return false;
    enemy.hp = Math.max(0, enemy.hp - amount);
    enemy.invulnerable = 0.9;
    const credited = owner === 'player' || owner === 'special';
    this.events.push({ type: 'hit', id: enemy.id, x: enemy.x, z: enemy.z, credited, lethal: enemy.hp <= 0 });
    if (credited) {
      this.hitMarker = enemy.hp <= 0 ? 0.9 : 0.5;
      this.hitText = enemy.hp <= 0 ? `${NAMES[enemy.skin]} ELIMINADO +500` : `${NAMES[enemy.skin]} · -${amount} CORAÇÕES`;
    }
    if (enemy.hp <= 0) {
      if (credited) this.kills++;
      this.score += credited ? 500 : 200;
      this.chaos = Math.min(100, this.chaos + 12);
      this.specialCharge = Math.min(1, this.specialCharge + 0.2);
      this.events.push({ type: 'defeat', id: enemy.id, x: enemy.x, z: enemy.z });
      this.notice = ['CASSADO PELO CAOS!', 'MANDATO ENCERRADO!', 'VIROU CONFETE!'][Math.floor(this.random() * 3)];
      this.noticeTime = 1.7;
    }
    return true;
  }
  releaseStoredWind() {
    const p = this.player;
    p.wind = 0;
    for (let n = 1; n <= 6; n++) {
      const x = Math.round(p.x - Math.sin(p.yaw) * n),
        z = Math.round(p.z - Math.cos(p.yaw) * n);
      if (x <= 0 || x >= SIZE - 1 || z <= 0 || z >= SIZE - 1 || this.map[z][x] === 1 || this.map[z][x] === 3) break;
      this.fires.push({ id: ++this.serial, x, z, life: 0.5, owner: 'special' });
      if (this.map[z][x] === 2) {
        this.map[z][x] = 0;
        this.events.push({ type: 'crate', x, z });
        break;
      }
    }
    this.notice = 'VENTO DEVOLVIDO!';
    this.noticeTime = 2;
    this.events.push({ type: 'wind-release', x: p.x, z: p.z, yaw: p.yaw });
  }
  special() {
    if(this.character===8&&this.chairReady)return this.throwChair();
    if (
      this.invasion.stage === 'arrival' ||
      this.phase !== 'playing' ||
      this.countdown > 0 ||
      this.player.hp <= 0 ||
      (this.specialCharge < 1 && this.specialItems < 1)
    )
      return false;
    const item = this.specialItems>0;
    if(item) this.specialItems--; else this.specialCharge = 0;
    this.quoteTime = 0;
    this.equipTime=.45;
    this.speak();
    const p = this.player;
    if (this.character === 0) {
      p.picanha = 3;
      p.picanhaTime = 4;
      this.notice = 'PICANHA PARA TODOS!';
    }
    if (this.character === 1) {
      p.turbo = 6;
      p.ram = 6;
      this.notice = 'MOTOCIATA!';
    }
    if (this.character === 2) {
      p.wind = 8;
      this.notice = 'ESTOCANDO O VENTO!';
    }
    if (this.character === 3) {
      p.vampire = 10;
      this.notice = 'O VAMPIRO NÃO RENUNCIA!';
    }
    if (this.character === 4) {
      this.decoys = [0, 1, 2].map((n) => {
        const angle = p.yaw + (n - 1) * 1.45;
        return { id: ++this.serial, x: p.x + Math.sin(angle) * 1.25, z: p.z + Math.cos(angle) * 1.25, skin: this.character, time: 7, walk: n };
      }).filter((d) => this.canMove(d.x, d.z));
      this.notice = 'MUDA O MINDSET!';
    }
    if (this.character === 5) {
      this.specialCharge = 0;
      this.cooldown = 0;
      for (const b of this.bombs)
        if (b.owner === 'player') b.fuse = Math.min(b.fuse, 0.25);
      this.notice = 'MISSÃO: DETONAR!';
    }
    if (this.character === 6) {
      this.swordTime=8;this.swordCooldown=0;this.notice='LÂMINA EQUIPADA · CLIQUE PARA GOLPEAR!';
      if(!item)this.property = { x: p.x, z: p.z, radius: 2.35, time: 8 };
    }
    if (this.character === 7) {
      const fx = Math.abs(Math.sin(p.yaw)) > Math.abs(Math.cos(p.yaw)) ? -Math.sign(Math.sin(p.yaw)) : 0,
        fz = fx === 0 ? -Math.sign(Math.cos(p.yaw)) : 0,
        px = Math.round(p.x), pz = Math.round(p.z),
        spots = [[px - fx, pz - fz], [px - fz, pz + fx], [px + fz, pz - fx]];
      for (const [x, z] of spots)
        if (x > 0 && x < SIZE - 1 && z > 0 && z < SIZE - 1 && this.map[z][x] === 0 &&
          !(Math.abs(p.x - x) <= 0.71 && Math.abs(p.z - z) <= 0.71) &&
          !this.enemies.some((e) => e.hp > 0 && cell(e.x, e.z) === cell(x, z))) {
          this.map[z][x] = 3;
          const barrier = { id: ++this.serial, x, z, time: 8 };
          this.barricades.push(barrier);
          this.events.push({ type: 'barricade', ...barrier });
        }
      this.notice = 'OCUPAÇÃO DA ARENA!';
    }
    if (this.character === 8) {
      this.chairReady=true;
      this.notice = 'CADEIRA NA MÃO · CLIQUE PARA ARREMESSAR!';
    }
    this.noticeTime = 2.6;
    this.events.push({ type: 'special' });
    return true;
  }
  throwChair() {
    if(!this.chairReady||this.heldBomb||this.countdown>0||this.phase!=='playing'||this.invasion.stage==='arrival'||this.player.hp<=0)return false;
    const p=this.player,speed=8.5;
    this.chairReady=false;this.chairThrowTime=.35;
    this.chairs.push({id:++this.serial,x:p.x,z:p.z,vx:-Math.sin(p.yaw)*speed,vz:-Math.cos(p.yaw)*speed,time:2,bounces:1});
    this.notice='CADEIRA VOADORA!';this.noticeTime=1.5;this.events.push({type:'chair-throw'});return true;
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
            type: [0,6,8].includes(this.character)&&this.random()<.4 ? ({0:3,8:4,6:5}[this.character]) : Math.floor(this.random() * 3),
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
      for (const [x,z] of (target.radius ? circleCells(this.map,target.x,target.z,target.radius) : blastCells(this.map,target.x,target.z,1))) danger.add(cell(x,z));
    if (this.invasion.actor.state === 'charging')
      for(const [x,z] of circleCells(this.map,this.invasion.actor.x,this.invasion.actor.z,TRUMP_RADIUS)) danger.add(cell(x,z));
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
    this.swordTime=Math.max(0,this.swordTime-dt);this.swordCooldown-=dt;this.swordSwing=Math.max(0,this.swordSwing-dt);
    this.equipTime=Math.max(0,this.equipTime-dt);this.chairThrowTime=Math.max(0,this.chairThrowTime-dt);
    if(input.attack&&this.swordTime>0)this.swingSword();
    if([0,6,8].includes(this.character)&&this.elapsed>=this.nextSpecialItem) {
      this.nextSpecialItem=this.elapsed+18+this.random()*12;
      if(this.items.filter(i=>i.type>=3).length<3) {
        const spots=[],danger=this.danger();
        for(let z=1;z<SIZE-1;z++)for(let x=1;x<SIZE-1;x++)if(!this.solid(x,z)&&!this.items.some(i=>cell(i.x,i.z)===cell(x,z))&&!danger.has(cell(x,z))&&Math.hypot(x-p.x,z-p.z)>1&&this.path(p,[x,z],new Set()))spots.push([x,z]);
        if(spots.length){const [x,z]=spots[Math.floor(this.random()*spots.length)];this.items.push({id:++this.serial,x,z,type:({0:3,8:4,6:5}[this.character]),wait:.5});}
      }
    }
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
    p.picanhaTime = Math.max(0, p.picanhaTime - dt);
    if (p.picanhaTime <= 0) p.picanha = 0;
    p.wind = Math.max(0, p.wind - dt);
    p.vampire = Math.max(0, p.vampire - dt);
    p.ram = Math.max(0, p.ram - dt);
    if (this.property) {
      this.property.time -= dt;
      if (this.property.time <= 0) this.property = null;
    }
    for (const decoy of this.decoys) decoy.time -= dt;
    this.decoys = this.decoys.filter((decoy) => decoy.time > 0);
    for (const barrier of this.barricades.slice()) {
      barrier.time -= dt;
      if (barrier.time <= 0) {
        if (this.map[barrier.z]?.[barrier.x] === 3) this.map[barrier.z][barrier.x] = 0;
        this.barricades.splice(this.barricades.indexOf(barrier), 1);
        this.events.push({ type: 'barricade-end', id: barrier.id });
      }
    }
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
        this.hurtPlayer(2, { unblockable: true, ignoreInvulnerable: true });
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
    for (const chair of this.chairs.slice()) {
      chair.time -= dt;
      const nx = chair.x + chair.vx * dt,
        nz = chair.z + chair.vz * dt,
        hitX = this.solid(nx, chair.z),
        hitZ = this.solid(chair.x, nz);
      if (hitX || hitZ) {
        const cx = Math.round(hitX ? nx : chair.x), cz = Math.round(hitZ ? nz : chair.z);
        if (this.map[cz]?.[cx] === 2) {
          this.map[cz][cx] = 0;
          this.events.push({ type: 'crate', x: cx, z: cz });
          this.score += 25;
          chair.time = 0;
        } else if (chair.bounces > 0) {
          if (hitX) chair.vx *= -0.72;
          if (hitZ) chair.vz *= -0.72;
          chair.bounces--;
          this.events.push({ type: 'chair-bounce', x: chair.x, z: chair.z });
        } else chair.time = 0;
      } else {
        chair.x = nx;
        chair.z = nz;
      }
      const bomb = this.bombs.find((b) => Math.hypot(b.x - chair.x, b.z - chair.z) < 0.55);
      if (bomb) {
        bomb.moving = true;
        bomb.y = Math.max(0.35, bomb.y || 0.23);
        bomb.vx = chair.vx * 0.72;
        bomb.vz = chair.vz * 0.72;
        bomb.vy = 1.2;
        bomb.flight = 1;
        chair.time = 0;
        this.events.push({ type: 'chair-bomb', x: chair.x, z: chair.z });
      }
      const victim = this.enemies.find((e) => !this.sameTeam(e,p) && e.hp > 0 && Math.hypot(e.x - chair.x, e.z - chair.z) < 0.62);
      if (victim && this.hurtEnemy(victim, 'special')) {
        const length = Math.hypot(chair.vx, chair.vz) || 1;
        for (let n = 0; n < 4; n++) this.move(victim, chair.vx / length * 0.24, chair.vz / length * 0.24);
        victim.invulnerable = 1.35;
        chair.time = 0;
        this.notice = 'CADEIRADA!';
        this.noticeTime = 1.8;
        this.events.push({ type: 'chair-hit', x: victim.x, z: victim.z });
      }
      if (chair.time <= 0) this.chairs.splice(this.chairs.indexOf(chair), 1);
    }
    for (const f of this.fires) f.life -= dt;
    this.fires = this.fires.filter((f) => f.life > 0);
    const hazard = this.danger();
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.invulnerable = Math.max(0, e.invulnerable - dt);
      e.ramCooldown = Math.max(0, (e.ramCooldown || 0) - dt);
      e.cd -= dt;
      e.think -= dt;
      const endangered = hazard.has(cell(e.x, e.z));
      if (e.think <= 0 || !e.target) {
        e.think = 0.24;
        const targets = [
          ...(p.hp > 0 && !this.sameTeam(e,p) ? [p] : []),
          ...(!this.sameTeam(e,p)?this.decoys:[]),
          ...this.enemies.filter((other) => other.id !== e.id && other.hp > 0 && !this.sameTeam(e,other)),
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
        (p.hp > 0 && !this.sameTeam(e,p) && Math.hypot(p.x - e.x, p.z - e.z) < 5) ||
        this.enemies.some(
          (other) =>
            other.id !== e.id &&
            !this.sameTeam(e,other) &&
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
      const ramSpeed = Math.hypot(p.vx, p.vz);
      if (p.ram > 0 && ramSpeed > 1.1 && e.ramCooldown <= 0 && Math.hypot(p.x - e.x, p.z - e.z) < 0.82) {
        e.ramCooldown = 1.4;
        if (this.hurtEnemy(e, 'special')) {
          for (let n = 0; n < 5; n++) this.move(e, p.vx / ramSpeed * 0.2, p.vz / ramSpeed * 0.2);
          this.notice = 'ABRE CAMINHO!';
          this.noticeTime = 1.2;
          this.events.push({ type: 'ram-hit', x: e.x, z: e.z });
        }
      }
    }
    const hit = (a) =>
      this.fires.find(
        (f) => !this.friendlyDamage(a,f.owner) && Math.abs(f.x - a.x) < 0.58 && Math.abs(f.z - a.z) < 0.58,
      );
    if (p.hp > 0 && hit(p) && p.invulnerable <= 0) {
      if (p.wind > 0) {
        p.invulnerable = 0.75;
        this.releaseStoredWind();
      } else this.hurtPlayer();
    }
    for (const e of this.enemies) {
      const fire = hit(e);
      if (fire) this.hurtEnemy(e, fire.owner);
    }
    for (const item of this.items) item.wait -= dt;
    for (const item of this.items.slice())
      if (
        p.hp > 0 &&
        item.wait <= 0 &&
        (item.type !== 0 || p.hp < 3) &&
        (item.type < 3 || this.specialItems < 2) &&
        Math.hypot(item.x - p.x, item.z - p.z) < 0.68
      ) {
        if (item.type === 0) p.hp = Math.min(3, p.hp + 1);
        if (item.type === 1) p.shield = Math.max(p.shield, 6);
        if (item.type === 2) this.range = Math.min(6, this.range + 1);
        if(item.type>=3)this.specialItems++;
        this.items.splice(this.items.indexOf(item), 1);
        this.score += 100;
        this.notice = [
          'CORAÇÃO RECUPERADO!',
          'ESCUDO ATIVADO!',
          'MAIS ALCANCE!',
          'PICANHA COLETADA · E PARA USAR!',
          'CADEIRA COLETADA · E PARA LANÇAR!',
          'ESPADA COLETADA · E PARA EQUIPAR!',
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
        if (p.hp > 0) this.hurtPlayer(1, { unblockable: true, ignoreInvulnerable: true });
        for (const a of this.enemies) if (a.hp > 0) a.hp--;
      }
    }
    this.resolveWinner();
  }

  snapshot() {
    return {
      phase: this.phase,
      teamMode:this.teamMode,playerTeam:this.playerTeam,winnerTeam:this.winnerTeam,
      teams:['left','right'].map(id=>({id,alive:[this.player,...this.enemies].filter(a=>a.team===id&&a.hp>0).length})),
      roster:this.teamMode?[{skin:this.character,team:this.player.team,hp:this.player.hp},...this.enemies.map(e=>({skin:e.skin,team:e.team,hp:e.hp}))]:[],
      invasion: this.invasion.snapshot(),
      countdown: this.countdown,
      arena: this.arena,
      arenaRoll: arenaRoll(this.countdown,this.arenaIndex),
      arenaOptions: ARENA_PREVIEWS,
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
      special: this.chairReady||this.specialItems>0?1:this.specialCharge,
      chairReady:this.chairReady,
      specialItems: this.specialItems, swordTime: this.swordTime,
      chaos: this.chaos,
      enemies: this.enemies.filter((e) => e.hp > 0&&!this.sameTeam(e,this.player)).length,
      quote: this.quote,
      event: this.notice,
      combo: this.combo,
      shield: this.player.shield > 0,
      shieldTime: this.player.shield,
      picanha: this.player.picanha,
      picanhaTime: this.player.picanhaTime,
      windTime: this.player.wind,
      vampireTime: this.player.vampire,
      ramTime: this.player.ram,
      propertyTime: this.property?.time || 0,
      decoys: this.decoys.length,
      barricades: this.barricades.length,
      wave: 1,
    };
  }
}
