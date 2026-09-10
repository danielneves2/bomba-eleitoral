import assert from 'node:assert/strict';
import {
  Match,
  generateMap,
  blastCells,
  rng,
  predictThrow,
  FUSE,
  PHYSICS_STEP,
  advanceProjectile,
  NAMES,
  advanceFrame,
} from '../public/game/core.mjs';
const names = [];
const test = (name, fn) => {
  fn();
  names.push(name);
};
function clean() {
  const g = new Match(9);
  g.reset(0, 'treino');
  g.countdown = 0;
  g.map = Array.from({ length: 15 }, (_, z) =>
    Array.from({ length: 15 }, (_, x) =>
      x === 0 || z === 0 || x === 14 || z === 14 ? 1 : 0,
    ),
  );
  g.enemies = [
    {
      id: 999,
      x: 13,
      z: 13,
      hp: 99,
      skin: 1,
      cd: 10000,
      think: 10000,
      target: null,
      invulnerable: 0,
      speed: 0,
      walk: 0,
    },
  ];
  g.events = [];
  return g;
}
test('safe spawns and solid perimeter, 100 seeds', () => {
  for (let seed = 0; seed < 100; seed++) {
    const map = generateMap(rng(seed));
    assert.equal(map[1][1], 0);
    assert.equal(map[13][13], 0);
    assert.ok(map[0].every((c) => c === 1));
    assert.ok(map[14].every((c) => c === 1));
  }
});
test('blast stops at walls and first crate', () => {
  const g = clean();
  g.map[5][6] = 1;
  g.map[7][5] = 2;
  const cells = blastCells(g.map, 5, 5, 5).map((c) => c.join(','));
  assert.ok(!cells.includes('6,5'));
  assert.ok(cells.includes('5,7'));
  assert.ok(!cells.includes('5,8'));
});
test('chain explosion removes bombs, destroys crate and scores', () => {
  const g = clean();
  g.map[5][7] = 2;
  g.addBomb(3, 5);
  g.addBomb(5, 5);
  g.explode(g.bombs[0]);
  assert.equal(g.bombs.length, 0);
  assert.equal(g.map[5][7], 0);
  assert.equal(g.combo, 2);
  assert.equal(g.score, 25);
});
test('own fire damages once during immunity', () => {
  const g = clean();
  g.player.x = 5;
  g.player.z = 5;
  g.player.invulnerable = 0;
  g.addBomb(5, 5);
  g.explode(g.bombs[0]);
  for (let n = 0; n < 10; n++) g.tick(0.05);
  assert.equal(g.player.hp, 2);
});
test('shield blocks damage', () => {
  const g = clean();
  g.player.x = 5;
  g.player.z = 5;
  g.player.invulnerable = 0;
  g.player.shield = 5;
  g.addBomb(5, 5);
  g.explode(g.bombs[0]);
  g.tick(0.05);
  assert.equal(g.player.hp, 3);
});
test('movement cannot pass through walls', () => {
  const g = clean();
  g.map[1][2] = 1;
  for (let n = 0; n < 120; n++) g.tick(0.05, { forward: true });
  assert.ok(g.player.x < 1.3);
});
test('three player bombs maximum and refill after explosion', () => {
  const g = clean();
  for (let i = 0; i < 5; i++) {
    g.player.x = 1 + i;
    g.cooldown = 0;
    g.throwBomb(true);
  }
  assert.equal(g.bombs.length, 3);
  assert.equal(g.snapshot().bombs, 0);
  g.explode(g.bombs[0]);
  assert.ok(g.snapshot().bombs > 0);
});
test('all nine specials consume charge and recharge', () => {
  for (let c = 0; c < 9; c++) {
    const g = clean();
    g.character = c;
    g.player.hp = 2;
    assert.equal(g.special(), true);
    assert.equal(g.special(), false);
    assert.ok(g.player.shield > 0);
    if (c === 3) assert.equal(g.player.hp, 3);
    assert.equal(g.specialCharge, 0);
    g.tick(0.05);
    assert.ok(g.specialCharge > 0);
  }
});
test('pause freezes all timers and movement', () => {
  const g = clean();
  g.phase = 'paused';
  const before = JSON.stringify(g.snapshot());
  g.tick(0.05, { forward: true });
  assert.equal(JSON.stringify(g.snapshot()), before);
});
test('election requires last survivor, time limit triggers overtime', () => {
  const g = clean();
  g.player.hp = 0;
  g.tick(0.05);
  assert.equal(g.phase, 'lost');
  assert.equal(g.winner, 1);
  const h = clean();
  h.enemies = [];
  h.tick(0.05);
  assert.equal(h.phase, 'won');
  const k = clean();
  k.elapsed = 180;
  k.tick(0.05);
  assert.equal(k.phase, 'playing');
  assert.equal(k.overtime, true);
});
test('100 autonomous matches stay finite and inside arena', () => {
  for (let seed = 0; seed < 100; seed++) {
    const g = new Match(seed);
    g.reset(seed % 9, 'caos');
    for (let t = 0; t < 1200; t++) {
      if (t % 36 === 0) g.throwBomb();
      if (t % 99 === 0) g.special();
      g.player.yaw += 0.003;
      g.tick(0.05, { forward: t % 120 < 60, right: t % 180 > 90 });
      assert.ok(Number.isFinite(g.player.x));
      assert.ok(g.player.x > 0.5 && g.player.x < 13.5);
      assert.ok(g.player.z > 0.5 && g.player.z < 13.5);
      assert.ok(g.bombs.length < 40);
      if (g.phase !== 'playing') break;
    }
  }
});

test('all nine candidates spawn as unique opponents', () => {
  for (let c = 0; c < 9; c++) {
    const g = new Match(22);
    g.reset(c, 'caos');
    assert.equal(g.enemies.length, 8);
    assert.equal(new Set(g.enemies.map((e) => e.skin)).size, 8);
    assert.ok(!g.enemies.some((e) => e.skin === c));
    assert.equal(NAMES.length, 9);
  }
});
test('countdown gates movement, hold, special, and match clock', () => {
  const g = clean();
  g.countdown = 3;
  const x = g.player.x;
  assert.equal(g.beginHold(), false);
  assert.equal(g.special(), false);
  for (let n = 0; n < 30; n++) g.tick(0.05, { forward: true });
  assert.equal(g.player.x, x);
  assert.equal(g.elapsed, 0);
  assert.ok(g.countdown > 1.49);
});
test('holding counts down in hand, release preserves remaining fuse', () => {
  const g = clean();
  assert.equal(g.beginHold(), true);
  for (let n = 0; n < 20; n++) g.tick(0.05);
  assert.ok(Math.abs(g.heldBomb.fuse - 2) < 0.00001);
  assert.equal(g.snapshot().bombs, 2);
  g.releaseBomb();
  assert.equal(g.heldBomb, null);
  assert.equal(g.bombs.length, 1);
  assert.ok(Math.abs(g.bombs[0].fuse - 2) < 0.00001);
  assert.ok(g.bombs[0].moving);
});
test('overcooking explodes in hand even with starting immunity and frees capacity', () => {
  const g = clean();
  g.player.shield = 10;
  g.beginHold();
  for (let n = 0; n < 61; n++) g.tick(0.05);
  assert.equal(g.heldBomb, null);
  assert.equal(g.player.hp, 1);
  assert.ok(g.events.some((e) => e.type === 'explode'));
  assert.equal(g.snapshot().bombs, 3);
});
test('mouse pitch changes arc height and charging increases throw power', () => {
  const g = clean();
  const low = predictThrow({ ...g.player, pitch: 0 }, g.map, 0.1, 3),
    high = predictThrow({ ...g.player, pitch: 0.8 }, g.map, 0.1, 3);
  assert.ok(
    Math.max(...high.points.map((p) => p.y)) >
      Math.max(...low.points.map((p) => p.y)) + 1,
  );
  const full = predictThrow({ ...g.player, pitch: 0.3 }, g.map, 1, 3),
    quick = predictThrow({ ...g.player, pitch: 0.3 }, g.map, 0, 3);
  assert.ok(full.end.x > quick.end.x);
});
test('preview endpoint matches live physics with identical fuse and no map changes', () => {
  for (const pitch of [-0.4, 0, 0.6, 1.1]) {
    const g = clean();
    g.player.pitch = pitch;
    g.beginHold();
    for (let n = 0; n < 16; n++) g.tick(0.05);
    const pred = g.trajectory();
    g.releaseBomb();
    const b = g.bombs[0];
    for (let i = 0; i < Math.ceil(b.fuse / PHYSICS_STEP); i++)
      advanceProjectile(b, g.map, PHYSICS_STEP);
    assert.ok(Math.abs(b.x - pred.end.x) < 0.01);
    assert.ok(Math.abs(b.y - pred.end.y) < 0.01);
    assert.ok(Math.abs(b.z - pred.end.z) < 0.01);
  }
});
test('projectiles bounce off low walls and clear them on a high arc', () => {
  const g = clean();
  g.player.x = 3;
  g.player.z = 5;
  g.map[5][5] = 1;
  const direct = predictThrow({ ...g.player, pitch: -0.15 }, g.map, 0, 3);
  const lob = predictThrow({ ...g.player, pitch: 0.8 }, g.map, 0.8, 3);
  assert.ok(direct.end.x < 5);
  assert.ok(lob.points.some((p) => p.x > 5.6));
});
test('held fuse freezes during pause, resumes with no reset', () => {
  const g = clean();
  g.beginHold();
  g.tick(0.05);
  g.phase = 'paused';
  const fuse = g.heldBomb.fuse;
  g.tick(0.05);
  assert.equal(g.heldBomb.fuse, fuse);
  g.phase = 'playing';
  g.tick(0.05);
  assert.ok(g.heldBomb.fuse < fuse);
});
test('no election while multiple bots survive after player death', () => {
  const g = clean();
  g.enemies.push({ ...g.enemies[0], id: 888, skin: 2, x: 11 });
  g.player.hp = 0;
  g.tick(0.05);
  assert.equal(g.phase, 'spectating');
  assert.equal(g.winner, -1);
  g.enemies[0].hp = 0;
  g.tick(0.05);
  assert.equal(g.phase, 'lost');
  assert.equal(g.winner, 2);
});
test('simultaneous final deaths annul election instead of declaring a winner', () => {
  const g = clean();
  g.player.hp = 0;
  g.enemies[0].hp = 0;
  g.tick(0.05);
  assert.equal(g.phase, 'draw');
  assert.equal(g.winner, -2);
});
test('three invaders have equal draws and warning starts between five and ten seconds', () => {
  const counts={putin:0,trump:0,kim:0},timings=new Set();
  for(let seed=0;seed<1000;seed++) { const g=new Match(seed);counts[g.invasion.kind]++;timings.add(g.invasion.startsAt);assert.ok(g.invasion.startsAt>=5&&g.invasion.startsAt<10); }
  for(const count of Object.values(counts)) assert.ok(count>270&&count<400);
  assert.ok(timings.size>990);
});
test('warning lasts seven seconds and Putin flyby freezes actors, bombs and match clock', () => {
  const g=clean();g.invasion.kind='putin';g.invasion.startsAt=0;
  g.tick(.05);assert.equal(g.invasion.stage,'warning');
  for(let n=0;n<139;n++)g.tick(.05);
  assert.equal(g.invasion.stage,'warning');
  for(let n=0;n<2;n++)g.tick(.05);
  assert.equal(g.invasion.stage,'arrival');
  const b=g.addBomb(5,5,'player',2,2);const elapsed=g.elapsed,x=g.player.x;
  g.tick(.05,{right:true});assert.equal(g.elapsed,elapsed);assert.equal(g.player.x,x);assert.equal(b.fuse,2);
  assert.equal(g.beginHold(),false);assert.equal(g.special(),false);
  g.phase='paused';const intro=g.invasion.intro;g.tick(.05);assert.equal(g.invasion.intro,intro);
});
test('Putin fires exactly two marked strikes, locks the area and leaves after fourteen seconds', () => {
  const g=clean();g.invasion.kind='putin';g.invasion.stage='active';
  g.invasion.shotClock=0;g.invasion.tick(g,.05);
  assert.equal(g.invasion.targets.length,1);const t=g.invasion.targets[0];
  const initial=[t.x,t.z];g.player.x=9;g.enemies[0].x=8;
  for(let i=0;i<20;i++)g.invasion.tick(g,.05);
  assert.deepEqual([t.x,t.z],initial);assert.equal(g.events.filter(e=>e.type==='explode').length,0);
  for(let i=0;i<260;i++)g.invasion.tick(g,.05);
  assert.equal(g.invasion.shots,2);assert.equal(g.events.filter(e=>e.type==='explode').length,2);
  assert.equal(g.invasion.stage,'done');assert.equal(g.invasion.targets.length,0);
});
test('Trump follows traversable corridors, plants bombs and never enters election standings', () => {
  const g=clean();g.invasion.kind='trump';g.invasion.stage='active';const a=g.invasion.actor;
  const before=[a.x,a.z];
  for(let i=0;i<120;i++){g.invasion.tick(g,.05);assert.equal(g.solid(a.x,a.z),false);}
  assert.notDeepEqual([a.x,a.z],before);assert.ok(g.bombs.some(b=>b.owner==='invader'));
  assert.equal(g.enemies.length,1);g.enemies[0].hp=0;g.resolveWinner();assert.equal(g.winner,g.character);
  const remaining=g.invasion.remaining;g.tick(.05);assert.equal(g.invasion.remaining,remaining);
  g.reset();assert.equal(g.invasion.stage,'scheduled');assert.equal(g.invasion.targets.length,0);
});
test('marked strike damages a contestant who stays and spares one who leaves', () => {
  for(const escape of [false,true]) {
    const g=clean();g.nextStorm=1000;g.player.x=7;g.player.z=7;g.player.invulnerable=0;
    g.invasion.kind='putin';g.invasion.stage='active';g.invasion.shots=2;
    g.invasion.targets=[{id:123,x:7,z:7,time:3,victim:'player'}];
    assert.ok(g.danger().has('7,7'));
    if(escape)g.player.x=10;
    for(let i=0;i<62;i++)g.tick(.05);
    assert.equal(g.player.hp,escape?3:2);
  }
});
test('releasing a cooked bomb during the flyby queues it with its fuse preserved', () => {
  const g=clean();g.beginHold();g.heldBomb.fuse=1.5;
  g.invasion.kind='putin';g.invasion.stage='arrival';g.invasion.intro=.1;
  assert.equal(g.releaseBomb(),false);
  for(let i=0;i<4;i++)g.tick(.05);
  assert.equal(g.heldBomb,null);assert.equal(g.bombs.length,1);
  assert.ok(g.bombs[0].fuse>1.3&&g.bombs[0].fuse<1.5);
});
test('heart pickup stays available at full health and restores one missing heart', () => {
  const g=clean();g.items=[{id:123,x:1,z:1,type:0,wait:0}];
  g.tick(.05);assert.equal(g.items.length,1);assert.equal(g.player.hp,3);
  g.player.hp=2;g.tick(.05);assert.equal(g.items.length,0);assert.equal(g.player.hp,3);
});
test('shield pickup is forgiving to collect and never shortens longer protection', () => {
  const g=clean();g.player.shield=8;g.items=[{id:123,x:1.6,z:1,type:1,wait:0}];
  g.tick(.05);assert.equal(g.items.length,0);assert.ok(g.player.shield>7.9);
  assert.equal(g.snapshot().shieldTime,g.player.shield);
});
test('movement brakes quickly and diagonal movement has no speed advantage', () => {
  const straight=clean(),diagonal=clean();
  for(let i=0;i<15;i++){straight.tick(.05,{forward:true});diagonal.tick(.05,{forward:true,right:true});}
  const distance=g=>Math.hypot(g.player.x-1,g.player.z-1);
  assert.ok(Math.abs(distance(straight)-distance(diagonal))<.001);
  for(let i=0;i<3;i++)straight.tick(.05);
  assert.ok(Math.hypot(straight.player.vx,straight.player.vz)<.03);
});
test('open lanes and plazas reduce average crate count while preserving cover', () => {
  let crates=0;
  for(let seed=0;seed<100;seed++) {
    const map=generateMap(rng(seed));crates+=map.flat().filter(c=>c===2).length;
    for(let i=1;i<14;i++){assert.equal(map[7][i],0);assert.equal(map[i][7],0);}
  }
  assert.ok(crates/100>15&&crates/100<30);
});
test('damage feedback activates on actual damage and fades; shield feedback does not reduce HP', () => {
  for(const shield of [0,5]) {
    const g=clean();g.player.invulnerable=0;g.player.shield=shield;
    g.fires=[{id:1,x:1,z:1,life:.72,owner:'invader'}];g.tick(.05);
    assert.equal(g.player.hp,shield?3:2);
    assert.ok(shield?g.shieldFlash>0:g.damageFlash>0);
    assert.equal(shield?g.damageFlash:g.shieldFlash,0);
    g.fires=[];for(let i=0;i<20;i++)g.tick(.05);
    assert.equal(g.damageFlash,0);assert.equal(g.shieldFlash,0);
  }
});
test('hit confirmations and kills credit only damage caused by the player', () => {
  for(const owner of ['player','special','invader',888]) {
    const g=clean();g.enemies[0].hp=1;g.enemies[0].x=7;g.enemies[0].z=7;
    g.fires=[{id:1,x:7,z:7,life:.72,owner}];g.tick(.05);
    const credited=owner==='player'||owner==='special';
    assert.equal(g.kills,credited?1:0);assert.equal(g.hitMarker>0,credited);
    assert.equal(g.events.find(e=>e.type==='hit').credited,credited);
    if(credited)assert.match(g.hitText,/ELIMINADO/);
  }
});
test('seven-second warning keeps real duration at 10, 30 and 60 FPS', () => {
  for(const fps of [10,30,60]) {
    const g=clean();g.invasion.stage='warning';g.invasion.kind='trump';g.nextStorm=999;
    for(let i=0;i<fps*6.9;i++)advanceFrame(g,1/fps);
    assert.equal(g.invasion.stage,'warning');
    for(let i=0;i<Math.ceil(fps*.15);i++)advanceFrame(g,1/fps);
    assert.equal(g.invasion.stage,'arrival');
    assert.equal(g.invasion.remaining,14);
  }
});
test('all intros freeze held fuses, resume in 2.2 seconds and allow fourteen active seconds', () => {
  for(const kind of ['putin','trump','kim']) {
    const g=clean();g.beginHold();g.invasion.kind=kind;g.invasion.stage='arrival';g.invasion.intro=2.2;
    for(let i=0;i<44;i++)advanceFrame(g,.05,{forward:true});
    assert.equal(g.player.x,1);assert.equal(g.heldBomb.fuse,3);assert.equal(g.invasion.remaining,14);
    g.invasion.tick(g,.05);assert.equal(g.invasion.stage,'active');
    for(let i=0;i<281;i++)g.invasion.tick(g,.05);
    assert.equal(g.invasion.stage,'done');
  }
});
test('Kim launches three fixed marked rockets with two seconds to escape', () => {
  const g=clean();g.invasion.kind='kim';g.invasion.stage='active';g.invasion.shotClock=0;
  g.invasion.tick(g,.05);const target=g.invasion.targets[0],before=[target.x,target.z];
  g.player.x=9;g.enemies[0].x=8;
  for(let i=0;i<35;i++)g.invasion.tick(g,.05);
  assert.deepEqual([target.x,target.z],before);assert.equal(g.events.filter(e=>e.type==='explode').length,0);
  for(let i=0;i<245;i++)g.invasion.tick(g,.05);
  assert.equal(g.invasion.shots,3);assert.equal(g.events.filter(e=>e.type==='explode').length,3);
  assert.equal(g.invasion.stage,'done');
});
console.log(JSON.stringify({ passed: names.length, checks: names }, null, 2));
