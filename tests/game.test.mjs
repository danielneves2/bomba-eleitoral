import assert from 'node:assert/strict';
import { SPECIALS } from '../public/game/specials.mjs';
import {releasePoison,antidoteGoal} from '../public/game/global-specials.mjs';
import { chooseTrumpObjective } from '../public/game/invasion.mjs';
import { radialImpact } from '../public/game/impact.mjs';
import { arrivalCamera } from '../public/game/cinematic.mjs';
import { prepareAttract,advanceAttract } from '../public/game/attract.mjs';
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
  ARENAS,
  arenaRoll,
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
test('all arenas have connected destructible routes and safe spawn exits, 100 seeds', () => {
  for(const arena of ARENAS)for(let seed=0;seed<100;seed++) {
    const map=generateMap(rng(seed),arena.id),seen=new Set(['1,1']),queue=[[1,1]];
    assert.ok(map[0].every(v=>v===1)&&map[14].every(v=>v===1));
    assert.ok(map.every(row=>row[0]===1&&row[14]===1));
    for(let i=0;i<queue.length;i++) {
      const [x,z]=queue[i];
      for(const [a,b] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]])if(map[b]?.[a]!==undefined&&map[b][a]!==1&&!seen.has(`${a},${b}`)) {
        seen.add(`${a},${b}`);queue.push([a,b]);
      }
    }
    assert.equal(seen.size,map.flat().filter(v=>v!==1).length,`${arena.id} seed ${seed} has isolated cells`);
    for(const [x,z] of [[1,1],[13,13],[1,13],[13,1],[7,7],[13,7],[7,13],[7,1],[1,7]]) {
      assert.equal(map[z][x],0);
      assert.ok([[x+1,z],[x-1,z],[x,z+1],[x,z-1]].filter(([a,b])=>map[b]?.[a]===0).length>=2);
    }
  }
  assert.equal(new Set(ARENAS.map(a=>JSON.stringify(generateMap(rng(42),a.id)))).size,3);
});

test('arena draw reaches all three maps and stays fixed throughout the reveal',()=>{
  const counts=[0,0,0];
  for(let seed=0;seed<600;seed++) {
    const g=new Match(seed);g.reset();counts[g.arenaIndex]++;
    const picked=g.arena.id;
    for(let n=0;n<124;n++){g.tick(.05);assert.equal(g.arena.id,picked);}
    assert.equal(g.snapshot().arenaRoll.index,g.arenaIndex);
  }
  assert.ok(counts.every(n=>n>150&&n<250),counts.join(','));
  for(let selected=0;selected<3;selected++) {
    const visits=new Set();
    for(let time=6.2;time>3.8;time-=.025)visits.add(arenaRoll(time,selected).index);
    assert.equal(visits.size,3);
    for(const time of [3.7,3.2,3.01,0])assert.deepEqual(arenaRoll(time,selected),{index:selected,locked:true});
  }
});

test('roulette and countdown freeze participants, match clock, invaders and pause',()=>{
  const g=new Match(15);g.reset();const x=g.player.x,z=g.player.z;
  const invasion=JSON.stringify(g.invasion.snapshot());
  const enemies=g.enemies.map(e=>[e.x,e.z]);
  for(let i=0;i<110;i++){g.primaryPress();g.special();g.tick(.05,{forward:1,attack:true});}
  assert.equal(g.player.x,x);assert.equal(g.player.z,z);assert.equal(g.elapsed,0);
  assert.equal(JSON.stringify(g.invasion.snapshot()),invasion);assert.equal(g.bombs.length,0);assert.equal(g.heldBomb,null);
  assert.deepEqual(g.enemies.map(e=>[e.x,e.z]),enemies);
  const countdown=g.countdown;g.phase='paused';g.tick(.05);assert.equal(g.countdown,countdown);
  g.phase='playing';for(let i=0;i<20;i++)g.tick(.05);assert.ok(g.elapsed>0);
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
test('all nine specials create a distinct gameplay state and recharge', () => {
  for (let c = 0; c < 9; c++) {
    const g = clean();
    g.character = c;
    g.player.x = 7;
    g.player.z = 7;
    assert.equal(g.special(), true);
    const active = [
      g.player.picanha,
      g.speechTime,
      g.player.wind,
      g.player.vampire,
      g.bookTime,
      g.remoteTime,
      g.property?.time || 0,
      g.flagTime,
      g.chairReady ? 1 : 0,
    ];
    assert.ok(active[c] > 0);
    assert.equal(g.specialCharge, 0);
    g.tick(0.05);
    if(c!==1)assert.ok(g.specialCharge > 0);
  }
});
test('Lula picanha grants four seconds of immunity including held explosions', () => {
  const g=clean();g.special();g.player.invulnerable=0;
  assert.equal(g.player.picanhaTime,4);
  for(let i=0;i<79;i++){g.hurtPlayer(9,{unblockable:true,ignoreInvulnerable:true});g.tick(.05);}
  assert.equal(g.player.hp,3);
  for(let i=0;i<3;i++)g.tick(.05);
  g.hurtPlayer();assert.equal(g.player.hp,2);
});
test('Dilma stores one blast and returns a directional wind attack', () => {
  const g=clean();g.character=2;g.player.x=7;g.player.z=7;g.special();g.player.invulnerable=0;
  g.fires=[{id:123,x:7,z:7,life:.7,owner:'invader'}];g.tick(.05);
  assert.equal(g.player.hp,3);assert.equal(g.player.wind,0);assert.ok(g.fires.some(f=>f.owner==='special'));
});
test('Temer is invulnerable throughout flight including lethal impacts', () => {
  const g=clean();g.character=3;g.player.x=7;g.player.z=7;g.special();g.player.invulnerable=0;
  g.hurtPlayer(3,{unblockable:true});
  assert.equal(g.player.hp,3);assert.equal(g.player.vampire,10);assert.ok(g.flight);
  assert.ok(g.events.some(e=>e.type==='vampire-transform'));
});
test('Bolsonaro speech freezes actors and does not cause old ram contact damage', () => {
  const g=clean();g.character=1;g.player.x=7;g.player.z=7;g.enemies[0].x=7.4;g.enemies[0].z=7;const hp=g.enemies[0].hp;
  g.special();g.tick(.05);assert.equal(g.enemies[0].hp,hp);
  g.tick(.05,{forward:true});assert.equal(g.enemies[0].hp,hp);assert.equal(g.player.x,7);assert.ok(g.speechTime>0);
});
test('Kogos property line blocks outsiders but lets them retreat', () => {
  const g=clean();g.character=6;g.player.x=7;g.player.z=7;g.special();const e=g.enemies[0];e.x=4.5;e.z=7;
  g.move(e,.4,0);assert.equal(e.x,4.5);g.move(e,-.4,0);assert.equal(e.x,4.1);
});
test('Boulos occupation creates three temporary solid barricades', () => {
  const g=clean();g.character=7;g.player.x=7;g.player.z=7;g.special();g.special();
  assert.equal(g.barricades.length,3);assert.ok(g.barricades.every(b=>g.map[b.z][b.x]===3));
  for(let i=0;i<161;i++)g.tick(.05);assert.equal(g.barricades.length,0);
});
test('Boulos occupation never creates a barricade over the player collider', () => {
  const g=clean();g.character=7;g.player.x=6.51;g.player.z=6.51;g.player.yaw=0;g.special();g.special();
  assert.ok(g.barricades.every(b=>Math.abs(g.player.x-b.x)>.71||Math.abs(g.player.z-b.z)>.71));
  const before=[g.player.x,g.player.z];for(let i=0;i<20;i++)g.tick(.05,{forward:true});
  assert.notDeepEqual([g.player.x,g.player.z],before);
});
test('Datena chair flies forward, hits once and stuns the target', () => {
  const g=clean();g.character=8;g.player.x=5;g.player.z=5;g.player.yaw=-Math.PI/2;g.enemies[0].x=7;g.enemies[0].z=5;const hp=g.enemies[0].hp;
  g.special();assert.equal(g.chairReady,true);assert.equal(g.chairs.length,0);g.primaryPress();for(let i=0;i<8;i++)g.tick(.05);
  assert.equal(g.enemies[0].hp,hp-2);assert.ok(g.enemies[0].stun>0);assert.equal(g.chairs.length,0);
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
test('four invaders have balanced draws and warning starts between five and ten seconds', () => {
  const counts={putin:0,trump:0,kim:0,bukele:0},timings=new Set();
  for(let seed=0;seed<1000;seed++) { const g=new Match(seed);counts[g.invasion.kind]++;timings.add(g.invasion.startsAt);assert.ok(g.invasion.startsAt>=5&&g.invasion.startsAt<10); }
  for(const count of Object.values(counts)) assert.ok(count>200&&count<300);
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
test('Trump follows traversable corridors and never enters election standings', () => {
  const g=clean();g.invasion.kind='trump';g.invasion.stage='active';const a=g.invasion.actor;
  const before=[a.x,a.z];
  for(let i=0;i<120;i++){g.invasion.tick(g,.05);assert.equal(g.solid(a.x,a.z),false);}
  assert.notDeepEqual([a.x,a.z],before);assert.equal(g.bombs.length,0);
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
    assert.equal(g.player.hp,escape?3:0);
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
test('all intros freeze held fuses, resume in three seconds and allow fourteen active seconds', () => {
  for(const kind of ['putin','trump','kim','bukele']) {
    const g=clean();g.beginHold();g.invasion.kind=kind;g.invasion.stage='arrival';g.invasion.intro=3;
    for(let i=0;i<60;i++)advanceFrame(g,.05,{forward:true});
    assert.equal(g.player.x,1);assert.equal(g.heldBomb.fuse,3);assert.equal(g.invasion.remaining,14);
    g.invasion.tick(g,.05);assert.equal(g.invasion.stage,'active');
    for(let i=0;i<281;i++)g.invasion.tick(g,.05);
    assert.equal(g.invasion.stage,'done');
  }
});
test('Kim launches three fixed marked rockets with 2.8 seconds to escape', () => {
  const g=clean();g.invasion.kind='kim';g.invasion.stage='active';g.invasion.shotClock=0;
  g.invasion.tick(g,.05);const target=g.invasion.targets[0],before=[target.x,target.z];
  g.player.x=9;g.enemies[0].x=8;
  for(let i=0;i<35;i++)g.invasion.tick(g,.05);
  assert.deepEqual([target.x,target.z],before);assert.equal(g.events.filter(e=>e.type==='explode').length,0);
  for(let i=0;i<245;i++)g.invasion.tick(g,.05);
  assert.equal(g.invasion.shots,3);assert.equal(g.events.filter(e=>e.type==='explode').length,3);
  assert.equal(g.invasion.stage,'done');
});
test('Trump stops to charge, lets players escape, then explodes exactly once', () => {
  for(const escape of [false,true]) {
    const g=clean();g.invasion.kind='trump';g.invasion.stage='active';
    g.enemies=[];const a=g.invasion.actor;a.x=7;a.z=7;g.player.x=8;g.player.z=7;g.player.invulnerable=0;
    g.invasion.tick(g,.05);assert.equal(a.state,'charging');assert.ok(g.danger().has('8,7'));
    if(escape)g.player.x=11;
    for(let i=0;i<46;i++)g.invasion.tick(g,.05);
    assert.equal(a.x,7);assert.equal(a.z,7);assert.equal(g.player.hp,3);
    for(let i=0;i<10;i++)g.invasion.tick(g,.05);
    assert.equal(a.state,'spent');assert.equal(g.player.hp,escape?3:0);
    assert.equal(g.events.filter(e=>e.type==='explode'&&e.style==='trump').length,1);
  }
});
test('missile impact hits diagonally, preserves shields and does not leave cross fire', () => {
  for(const shield of [0,5]) {
    const g=clean();g.player.x=8;g.player.z=8;g.player.invulnerable=0;g.player.shield=shield;
    g.map[6][6]=2;radialImpact(g,7,7,1.75,'missile');
    assert.equal(g.player.hp,shield?3:0);assert.equal(g.map[6][6],0);assert.equal(g.fires.length,0);
  }
});
test('three distinct drafted invasions arrive in order without a fourth wave', () => {
  const g=clean(),draft=g.invasion.lineup.slice();assert.equal(new Set(draft).size,3);
  for(let wave=1;wave<3;wave++) {
    g.invasion.stage='done';g.invasion.actor.state='spent';g.invasion.shots=3;
    g.elapsed=g.invasion.schedule[wave]-.1;g.invasion.tick(g,.05);assert.equal(g.invasion.stage,'done');
    g.elapsed=g.invasion.schedule[wave];g.invasion.tick(g,.05);
    assert.equal(g.invasion.stage,'warning');assert.equal(g.invasion.wave,wave+1);assert.equal(g.invasion.kind,draft[wave]);
    assert.equal(g.invasion.warning,7);assert.equal(g.invasion.shots,0);assert.equal(g.invasion.actor.state,'hunting');
  }
  g.invasion.stage='done';g.elapsed=999;g.invasion.tick(g,.05);assert.equal(g.invasion.stage,'done');
  g.reset();assert.equal(g.invasion.wave,1);
});
test('all arrivals have three finite camera shots; reduced motion keeps one shot', () => {
  for(const kind of ['putin','trump','kim','bukele']) {
    const shots=[.1,.5,.9].map(t=>arrivalCamera(kind,t,{x:19,y:7,z:19}));
    assert.deepEqual(shots.map(s=>s.shot),[0,1,2]);
    for(const s of shots)assert.ok([...Object.values(s.position),...Object.values(s.target),s.fov].every(Number.isFinite));
    for(const t of [.1,.5,.9])assert.equal(arrivalCamera(kind,t,{x:0,y:0,z:0},true).shot,0);
  }
});
test('Kim intro launches three missiles once while match clock stays frozen', () => {
  const g=clean();g.invasion.kind='kim';g.invasion.stage='arrival';g.invasion.intro=3;
  for(let i=0;i<60;i++)g.tick(.05);
  assert.equal(g.events.filter(e=>e.type==='missile-launch').length,3);assert.equal(g.elapsed,0);
});
test('Bukele captures player and bots for six seconds then releases without recapture',()=>{
  for(const bot of [false,true]) {
    const g=clean(),v=bot?g.enemies[0]:g.player;
    g.invasion.kind='bukele';g.invasion.stage='active';
    g.invasion.actor.x=7;g.invasion.actor.z=7;v.x=7.5;v.z=7;
    g.invasion.tick(g,.05);assert.equal(g.invasion.cages.length,1);
    g.move(v,1,0);assert.equal(v.x,7.5);
    for(let i=0;i<119;i++)g.invasion.tick(g,.05);
    assert.ok(g.invasion.cages[0].time>0);g.move(v,1,0);assert.equal(v.x,7.5);
    for(let i=0;i<3;i++)g.invasion.tick(g,.05);
    assert.equal(g.invasion.cages.filter(c=>c.victim===v).length,0);g.move(v,1,0);assert.equal(v.x,8.5);
    assert.equal(g.events.filter(e=>e.type==='cage-capture'&&e.player===!bot).length,1);
  }
});
test('Bukele cannot capture through walls; cages pause and survive patrol exit',()=>{
  const g=clean();g.invasion.kind='bukele';g.invasion.stage='active';
  const a=g.invasion.actor;a.x=7;a.z=7;g.player.x=7.8;g.player.z=7;g.map[7][8]=1;
  g.invasion.tick(g,.05);assert.equal(g.invasion.cages.length,0);
  g.map[7][8]=0;g.invasion.tick(g,.05);assert.equal(g.invasion.cages.length,1);
  const time=g.invasion.cages[0].time;g.phase='paused';g.tick(.05);assert.equal(g.invasion.cages[0].time,time);
  g.phase='playing';g.invasion.remaining=0;g.invasion.tick(g,.05);assert.equal(g.invasion.stage,'done');
  for(let i=0;i<121;i++)g.invasion.tick(g,.05);assert.equal(g.invasion.cages.length,0);
  g.reset();assert.equal(g.invasion.captured.size,0);
});
test('personal pickups store two uses, activate without recharge and preserve excess drops',()=>{
  for(const [character,type] of [[0,3],[8,4],[6,5]]) {
    const g=clean();g.character=character;g.specialCharge=0;
    g.items=[1,2,3].map(id=>({id,x:1,z:1,type,wait:0}));g.tick(.05);
    assert.equal(g.specialItems,2);assert.equal(g.items.length,1);assert.equal(g.special(),true);assert.equal(g.specialItems,1);
    if(character===0)assert.equal(g.player.picanhaTime,4);
    if(character===8)assert.equal(g.chairReady,true);
    if(character===6)assert.equal(g.swordTime,8);
  }
});
test('sword hits rapidly for two hearts in front and never through a wall',()=>{
  for(const wall of [false,true]) {
    const g=clean();g.character=6;g.specialItems=1;g.player.x=7;g.player.z=7;g.player.yaw=-Math.PI/2;
    const e=g.enemies[0];e.x=8;e.z=7;e.hp=10;e.invulnerable=0;g.map[7][8]=wall?1:0;
    g.special();for(let i=0;i<12;i++)g.tick(.05,{attack:true});
    assert.equal(e.hp,wall?10:4);
  }
});
test('occasional personal item appears on reachable safe ground and resets with a match',()=>{
  const g=clean();g.nextSpecialItem=0;g.tick(.05);
  const item=g.items.find(i=>i.type===3);assert.ok(item);assert.equal(g.map[item.z][item.x],0);
  assert.ok(g.path(g.player,[item.x,item.z],new Set()));g.reset();assert.equal(g.specialItems,0);assert.equal(g.swordTime,0);
});
test('equipped melee and chair use primary click; space still plants bombs',()=>{
  const g=clean();g.character=6;g.specialItems=1;g.special();
  assert.equal(g.primaryPress(),true);assert.equal(g.heldBomb,null);assert.equal(g.swordSwing,.2);assert.equal(g.primaryPress(),false);
  g.throwBomb(true);assert.equal(g.bombs.length,1);assert.equal(g.bombs[0].moving,false);
  const d=clean();d.character=8;d.special();assert.equal(d.primaryPress(),true);assert.equal(d.chairs.length,1);assert.equal(d.heldBomb,null);
  const p=clean();p.character=6;p.specialItems=1;p.special();p.phase='paused';assert.equal(p.primaryPress(),false);assert.equal(p.swordSwing,0);
});
test('no invader including Bukele is omitted from two consecutive drafts',()=>{
  const g=new Match(81);let previous=[];
  for(let i=0;i<200;i++) {
    g.reset();const lineup=g.snapshot().invasion.lineup;
    assert.equal(lineup.length,3);assert.equal(new Set(lineup).size,3);
    if(i)assert.equal(new Set([...previous,...lineup]).size,4);
    previous=lineup.slice();
  }
});
test('E equips a visible state for all three personal weapons without requiring a pickup',()=>{
  for(const character of [0,6,8]) {
    const g=clean();g.character=character;assert.equal(g.special(),true);assert.ok(g.equipTime>0);
    const s=g.snapshot();
    if(character===0)assert.equal(s.picanhaTime,4);
    if(character===6){assert.equal(s.swordTime,8);assert.ok(g.property);}
    if(character===8){assert.equal(s.chairReady,true);assert.equal(g.chairs.length,0);g.phase='paused';assert.equal(g.special(),false);assert.equal(g.chairReady,true);g.phase='playing';assert.equal(g.special(),true);assert.equal(g.chairReady,false);assert.equal(g.chairs.length,1);assert.equal(g.special(),false);}
  }
});
test('every character can lead either three-person team with unique safe spawns',()=>{
  for(const side of ['left','right'])for(let character=0;character<9;character++){
    const g=new Match(71);g.reset(character,`teams-${side}`);
    const actors=[g.player,...g.enemies];assert.equal(actors.length,6);assert.equal(g.enemies.length,5);
    for(const team of ['left','right'])assert.equal(actors.filter(a=>a.team===team).length,3);
    assert.equal(new Set([character,...g.enemies.map(e=>e.skin)]).size,6);
    for(const a of actors){assert.equal(a.hp,3);assert.equal(g.map[a.z][a.x],0);}
    assert.equal(g.snapshot().enemies,3);
  }
});
test('teams ignore friendly bombs and specials but retain self and invader damage',()=>{
  const g=new Match(12);g.reset(6,'teams-left');g.countdown=0;
  g.map=Array.from({length:15},(_,z)=>Array.from({length:15},(_,x)=>x===0||z===0||x===14||z===14?1:0));
  const ally=g.enemies.find(e=>e.team===g.player.team),rival=g.enemies.find(e=>e.team!==g.player.team);
  assert.equal(g.hurtEnemy(ally,'player'),false);assert.equal(g.hurtEnemy(ally,'special',2),false);
  assert.equal(g.hurtEnemy(ally,ally.id),true);ally.invulnerable=0;assert.equal(g.hurtEnemy(ally,'invader'),true);
  assert.equal(g.hurtEnemy(rival,'special'),true);
  g.player.invulnerable=0;g.fires=[{id:91,x:1,z:1,life:1,owner:ally.id}];g.tick(.05);assert.equal(g.player.hp,3);
  g.fires=[{id:92,x:1,z:1,life:1,owner:'player'}];g.tick(.05);assert.equal(g.player.hp,2);
});
test('team victory survives player elimination and draws remain possible',()=>{
  const g=new Match(4);g.reset(0,'teams-left');g.player.hp=0;
  assert.equal(g.resolveWinner(),false);
  for(const e of g.enemies)if(e.team==='right')e.hp=0;
  assert.equal(g.resolveWinner(),true);assert.equal(g.phase,'won');assert.equal(g.winnerTeam,'left');
  g.reset(0,'teams-left');g.player.hp=0;for(const e of g.enemies)if(e.team==='left')e.hp=0;
  g.resolveWinner();assert.equal(g.phase,'lost');assert.equal(g.winnerTeam,'right');
  for(const e of g.enemies)e.hp=0;g.resolveWinner();assert.equal(g.phase,'draw');
});
test('Bukele montage closes three cages and gives one speech while match remains frozen',()=>{
  const g=clean();g.invasion.kind='bukele';g.invasion.stage='warning';g.invasion.warning=.01;
  g.tick(.05);assert.equal(g.invasion.intro,5);
  for(let i=0;i<100;i++)g.tick(.05);
  assert.equal(g.events.filter(e=>e.type==='cage-slam').length,3);assert.equal(g.events.filter(e=>e.type==='invader-speech').length,1);assert.equal(g.elapsed,0);
});
test('Trump arrival camera remains centered and continuous across former cuts',()=>{
  const focus={x:18.9,y:6.15,z:18.9};
  for(const t of [.34,.67]){
    const a=arrivalCamera('trump',t-.0001,focus),b=arrivalCamera('trump',t+.0001,focus);
    assert.ok(Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.z-b.position.z)<.01);
    assert.deepEqual(a.target,focus);assert.deepEqual(b.target,focus);
  }
});
test('title demo fights, throws and explodes without opening gameplay or invasions',()=>{
  const game=new Match(730);const omitted=game.lastOmittedInvader;
  prepareAttract(game);const positions=game.enemies.map(e=>[e.x,e.z]);let blasts=0,airborne=0,restarts=0;
  for(let i=0;i<1200;i++){
    const restart=advanceAttract(game,.05);
    assert.equal(game.phase,'menu');assert.equal(game.invasion.stage,'scheduled');
    assert.ok(game.events.every(e=>['explode','crate','defeat','hit'].includes(e.type)));
    blasts+=game.events.filter(e=>e.type==='explode').length;airborne+=game.bombs.filter(b=>b.moving).length;game.events=[];
    if(restart){restarts++;prepareAttract(game);}
  }
  assert.ok(blasts>0&&airborne>0&&restarts>0);assert.notDeepEqual(game.enemies.map(e=>[e.x,e.z]),positions);
  assert.equal(game.lastOmittedInvader,omitted);
  game.reset(6,'teams-right');assert.equal(game.player.hp,3);assert.ok(game.countdown>0);assert.equal(game.score,0);assert.equal(game.enemies.length,5);assert.ok(Number.isFinite(game.invasion.startsAt));
});
test('Trump chooses a random reachable victim or the most populated blast area', () => {
  const g=clean(),a={x:7,z:7};
  const players=[{x:2,z:2,hp:3},{x:9,z:8,hp:3},{x:10,z:8,hp:3},{x:9,z:9,hp:3}];
  g.random=()=>.1;assert.equal(chooseTrumpObjective(g,a,players).victim,players[0]);
  g.random=()=>.8;const area=chooseTrumpObjective(g,a,players);assert.equal(area.count,3);assert.equal(area.victim,undefined);
  g.path=()=>null;assert.equal(chooseTrumpObjective(g,a,players),null);
});
test('Trump locks his charge area and kills all exposed contestants within it', () => {
  const g=clean();g.invasion.kind='trump';g.invasion.stage='active';
  Object.assign(g.invasion.actor,{x:7,z:7,state:'charging',charge:2.35});
  Object.assign(g.player,{x:8,z:7,invulnerable:0});
  g.enemies=[{id:1,x:7,z:9,hp:3,invulnerable:0},{id:2,x:10,z:7,hp:3,invulnerable:0}];
  g.invasion.tick(g,.05);assert.equal(g.player.hp,0);assert.equal(g.enemies[0].hp,0);assert.equal(g.enemies[1].hp,3);
});
test('Putin lethal fire also eliminates bots and ordinary bombs still remove one heart', () => {
  for(const lethal of [true,false]) {
    const g=clean();g.nextStorm=999;Object.assign(g.enemies[0],{x:7,z:7,hp:3});
    const bomb={id:777,x:7,z:7,range:1,owner:'invader',lethal};g.bombs.push(bomb);g.explode(bomb);g.tick(.05);
    assert.equal(g.enemies[0].hp,lethal?0:2);
  }
});
test('picanha protection blocks even lethal missiles', () => {
  const g=clean();Object.assign(g.player,{x:7,z:7,picanhaTime:4,invulnerable:0});
  radialImpact(g,7,7,1.75,'missile');assert.equal(g.player.hp,3);
});
test('Marcal requires reciprocal gaze, range and an unobstructed sightline', () => {
  for(const reason of ['valid','away','aim-away','wall','far','ally']) {
    const g=clean();g.character=4;Object.assign(g.player,{x:5,z:5,yaw:-Math.PI/2});const e=g.enemies[0];Object.assign(e,{x:7,z:5,yaw:Math.PI/2});g.special();
    if(reason==='away')e.yaw=-Math.PI/2;if(reason==='aim-away')g.player.yaw=0;if(reason==='wall')g.map[5][6]=1;if(reason==='far')e.x=11;
    if(reason==='ally'){g.teamMode=true;g.player.team='left';e.team='left';}
    assert.equal(!!g.hypnosisTarget(),reason==='valid');assert.equal(g.special(),reason==='valid');assert.equal(e.stun||0,reason==='valid'?5:0);
    assert.equal(g.bookTime,reason==='valid'?0:10);assert.equal(g.specialCharge,0);
  }
});
test('hypnosis freezes bot movement and attacks for five seconds but bombs can hurt it', () => {
  const g=clean();g.character=4;Object.assign(g.player,{x:5,z:5,yaw:-Math.PI/2});const e=g.enemies[0];Object.assign(e,{x:7,z:5,yaw:Math.PI/2,speed:1,cd:0});g.special();g.special();
  g.invasion.startsAt=999;for(let i=0;i<99;i++)g.tick(.05);assert.deepEqual([e.x,e.z],[7,5]);assert.equal(g.bombs.length,0);assert.ok(e.stun>0);assert.ok(g.specialEffects.some(s=>s.kind==='spirit'));
  const hp=e.hp;g.hurtEnemy(e,'player');assert.equal(e.hp,hp-1);
  for(let i=0;i<3;i++)g.tick(.05);assert.equal(e.stun,0);assert.ok(g.bombs.length>0||e.x!==7||e.z!==5);
});
test('Dilma manually releases two-heart gust and pushes a visible bomb forward', () => {
  const g=clean();g.character=2;Object.assign(g.player,{x:5,z:5,yaw:-Math.PI/2});const e=g.enemies[0];Object.assign(e,{x:8,z:5,hp:3});
  const bomb={id:123,x:6,z:5,y:.23,fuse:3,owner:999,range:1};g.bombs.push(bomb);g.special();assert.equal(g.special(),true);assert.equal(g.player.wind,0);assert.ok(bomb.vx>0&&bomb.moving);
  g.tick(.05);assert.equal(e.hp,1);
});
test('Temer dives then drains two hearts gradually and heals one', () => {
  const g=clean();g.character=3;Object.assign(g.player,{x:5,z:5,yaw:-Math.PI/2,hp:1});Object.assign(g.enemies[0],{x:7,z:5,hp:3});g.special();assert.equal(g.special(),true);
  g.invasion.startsAt=999;for(let i=0;i<20;i++)g.tick(.05);assert.ok(g.enemies[0].hp<3&&g.enemies[0].hp>2.5);assert.equal(g.player.vampire,0);
  for(let i=0;i<48;i++)g.tick(.05);assert.ok(Math.abs(g.enemies[0].hp-1)<1e-6);assert.ok(Math.abs(g.player.hp-2)<1e-6);assert.equal(g.drains.length,0);
});
test('Temer can fly over a wall but lands on a free arena tile', () => {
  const g=clean();g.character=3;g.invasion.startsAt=999;Object.assign(g.player,{x:5,z:5,yaw:-Math.PI/2});Object.assign(g.enemies[0],{x:7,z:5});g.map[5][6]=1;g.special();assert.equal(g.special(),true);for(let i=0;i<17;i++)g.tick(.05);assert.equal(g.flight,null);assert.equal(g.solid(g.player.x,g.player.z),false);
});
test('Renan radio preserves empty attempts and detonates only owned bombs for two hearts', () => {
  const g=clean();g.character=5;Object.assign(g.player,{x:5,z:5});Object.assign(g.enemies[0],{x:7,z:5,hp:3});g.special();assert.equal(g.special(),false);assert.equal(g.remoteTime,12);
  const own={id:123,x:7,z:5,y:.23,fuse:3,owner:'player',range:1},other={id:124,x:12,z:12,y:.23,fuse:3,owner:999,range:1};g.bombs.push(own,other);assert.equal(g.special(),true);assert.equal(other.fuse,3);assert.equal(own.damage,2);
  for(let i=0;i<7;i++)g.tick(.05);assert.equal(g.enemies[0].hp,1);assert.equal(g.remoteTime,0);
});
test('Boulos previews valid ground, excludes occupied cells and preserves blocked attempts', () => {
  const g=clean();g.character=7;Object.assign(g.player,{x:5,z:5,yaw:-Math.PI/2});g.special();assert.equal(g.barricades.length,0);
  Object.assign(g.enemies[0],{x:7,z:5});g.map[4][7]=1;g.map[6][7]=2;assert.ok(g.occupationPreview().every(s=>!s.valid));assert.equal(g.special(),false);assert.equal(g.flagTime,10);
  g.map[4][7]=0;assert.equal(g.special(),true);assert.equal(g.barricades.length,1);assert.notEqual(g.map[5][7],3);
});
test('every character can collect their own periodic special item', () => {
  for(let c=0;c<9;c++){const g=clean();g.character=c;g.invasion.startsAt=999;g.elapsed=g.nextSpecialItem;g.nextStorm=999;g.tick(.05);const item=g.items.find(i=>i.type===SPECIALS[c].type);assert.ok(item);g.player.x=item.x;g.player.z=item.z;item.wait=0;g.tick(.05);assert.equal(g.specialItems,1);}
});
test('equipped second actions pause and cannot be used while cooking a bomb', () => {
  for(const c of [1,2,3,4,5,7,8]){const g=clean();g.character=c;g.special();g.phase='paused';const before=JSON.stringify(g.snapshot());assert.equal(g.special(),false);g.tick(.05);assert.equal(JSON.stringify(g.snapshot()),before);g.phase='playing';if([1,3].includes(c)){assert.equal(g.beginHold(),false);}else{g.beginHold();assert.equal(g.special(),false);}}
});
test('flight crosses boxes, has altitude controls, and respects arena bounds', () => {
  const g=clean();g.character=3;Object.assign(g.player,{x:5,z:5,yaw:-Math.PI/2});g.map[5][6]=1;g.special();for(let i=0;i<30;i++)g.tick(.05,{forward:true,ascend:true});assert.ok(g.player.x>6.5);assert.ok(g.flight.height>5.8);g.move(g.player,100,100);assert.equal(g.player.x,13.2);assert.equal(g.player.z,13.2);
});
test('global speech freezes bombs and invasion scheduling for three seconds',()=>{
  const g=clean();g.character=1;g.invasion.startsAt=999;const b=g.addBomb(5,5,'player',2,2);g.special();const x=g.player.x;
  for(let i=0;i<59;i++)g.tick(.05,{forward:true});assert.equal(g.elapsed,0);assert.equal(b.fuse,2);assert.equal(g.player.x,x);assert.ok(g.speechTime>0);
  for(let i=0;i<2;i++)g.tick(.05);assert.equal(g.speechTime,0);assert.ok(g.poison);assert.equal(g.special(),false);
});
test('eight survivors receive six distinct reachable doses and exactly one curse',()=>{
  for(let seed=1;seed<=30;seed++){
    const g=clean();g.random=rng(seed);g.character=1;
    g.enemies=Array.from({length:7},(_,i)=>({...g.enemies[0],id:i+10,skin:i===1?2:i,x:2+i,z:7,hp:3}));releasePoison(g);
    assert.equal(g.syringes.length,6);assert.equal(new Set(g.syringes.map(s=>`${s.x},${s.z}`)).size,6);assert.equal(g.syringes.filter(s=>s.cursed).length,1);
    assert.ok(g.syringes.every(s=>!g.solid(s.x,s.z)&&g.enemies.some(e=>Math.hypot(e.x-s.x,e.z-s.z)<.5||g.path(e,[s.x,s.z],new Set()))));
  }
});
test('antidote is unavailable while falling and is consumed once by one rival',()=>{
  const g=clean();g.character=1;g.invasion.startsAt=999;g.nextStorm=999;
  g.enemies=[{...g.enemies[0],id:1,x:7,z:7,hp:3},{...g.enemies[0],id:2,x:7,z:7,hp:3},{...g.enemies[0],id:3,x:13,z:13,hp:3}];releasePoison(g);
  g.syringes=[{id:77,x:7,z:7,fall:2,cursed:true}];for(let i=0;i<38;i++)g.tick(.05);assert.equal(g.syringes.length,1);assert.ok(!g.enemies[0].alligator);
  for(let i=0;i<4;i++)g.tick(.05);assert.equal(g.syringes.length,0);assert.ok(g.enemies[0].alligator);assert.ok(!g.enemies[1].alligator);assert.equal(g.enemies[0].antidote,g.poison.id);
});
test('poison kills an untreated three-heart rival but immunity and one heart save others',()=>{
  const g=clean();g.character=1;g.invasion.startsAt=999;g.nextStorm=999;
  g.enemies=Array.from({length:3},(_,i)=>({...g.enemies[0],id:i+1,x:7+i*2,z:7,hp:3}));releasePoison(g);g.syringes=[];g.enemies[1].antidote=g.poison.id;
  for(let i=0;i<165;i++)g.tick(.05);assert.equal(g.enemies[0].hp,2);assert.equal(g.enemies[1].hp,3);assert.equal(g.player.hp,3);
  g.items.push({id:99,x:g.enemies[2].x,z:7,type:0,wait:0});g.tick(.05);assert.equal(g.enemies[2].hp,3);
  for(let i=0;i<100;i++)g.tick(.05);assert.equal(g.enemies[0].hp,0);assert.equal(g.enemies[1].hp,3);assert.equal(g.enemies[2].hp,1);assert.equal(g.player.hp,3);
});
test('bots seek antidotes, cured bots stop seeking, allies are not poisoned',()=>{
  const g=clean();g.character=1;g.teamMode=true;g.player.team='right';g.enemies=[{...g.enemies[0],id:1,team:'right'},{...g.enemies[0],id:2,team:'left'},{...g.enemies[0],id:3,team:'left'}];releasePoison(g);
  assert.equal(g.syringes.length,1);assert.equal(antidoteGoal(g,g.enemies[0]),null);assert.ok(antidoteGoal(g,g.enemies[1]));g.enemies[1].antidote=g.poison.id;assert.equal(antidoteGoal(g,g.enemies[1]),null);
});
test('flight target selection rejects allies and dead rivals and recovers if target dies',()=>{
  const g=clean();g.character=3;g.invasion.startsAt=999;g.teamMode=true;g.player.team='left';g.enemies=[{...g.enemies[0],id:1,team:'left'},{...g.enemies[0],id:2,team:'right'},{...g.enemies[0],id:3,team:'right'}];g.special();
  assert.equal(g.vampireTarget,2);assert.equal(g.diveTarget(1),false);g.cycleTarget();assert.equal(g.vampireTarget,3);assert.equal(g.diveTarget(3),true);g.enemies[2].hp=0;g.tick(.05);assert.ok(g.flight);assert.equal(g.flight.dive,null);assert.equal(g.vampireTarget,2);
});
test('pausing freezes poison, falling antidotes and gradual bites; reset clears effects',()=>{
  const g=clean();g.character=1;releasePoison(g);g.drains=[{target:g.enemies[0],time:2.4,remaining:2}];g.phase='paused';const before=JSON.stringify([g.poison,g.syringes,g.drains]);g.tick(.05);assert.equal(JSON.stringify([g.poison,g.syringes,g.drains]),before);g.reset(0);assert.equal(g.poison,null);assert.equal(g.drains.length,0);assert.equal(g.syringes.length,0);assert.ok(g.enemies.every(e=>!e.alligator));
});
test('flight expires over a box without trapping the player and Bukele cannot capture it',()=>{
  const g=clean();g.character=3;g.special();Object.assign(g.player,{x:7,z:7});g.map[7][7]=2;g.invasion.kind='bukele';g.invasion.stage='active';Object.assign(g.invasion.actor,{x:7,z:7});g.invasion.tick(g,.05);assert.equal(g.invasion.cages.length,0);g.invasion.stage='done';g.player.vampire=.01;g.tick(.05);assert.equal(g.flight,null);assert.equal(g.solid(g.player.x,g.player.z),false);
});
console.log(JSON.stringify({ passed: names.length, checks: names }, null, 2));
