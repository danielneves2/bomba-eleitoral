// Fictional arcade events. Shared simulation; presentation never owns damage or timers.
export const HYPNOSIS_SECONDS = 5;
export const FLIGHT_SECONDS = 10;
export const SPEECH_SECONDS = 3;
export const POISON_SECONDS = 16;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export function initGlobalSpecials(g) {
  g.speechTime=0;g.poison=null;g.syringes=[];g.drains=[];g.flight=null;g.vampireTarget=null;
}
export function startFlight(g) {
  g.player.vampire=FLIGHT_SECONDS;
  g.flight={height:5.8,dive:null};
  g.vampireTarget=g.enemies.find(e=>e.hp>0&&!g.sameTeam(e,g.player))?.id??null;
  // Flying clears a previous cage; a new cage cannot grab an airborne actor.
  g.invasion.cages=g.invasion.cages.filter(c=>c.victim!==g.player);
  g.events.push({type:'vampire-transform'});
}
export function cycleVampireTarget(g) {
  if(g.phase!=='playing'||!g.flight||g.flight.dive||g.invasion.stage==='arrival')return false;
  const targets=g.enemies.filter(e=>e.hp>0&&!g.sameTeam(e,g.player));
  g.vampireTarget=targets[(targets.findIndex(e=>e.id===g.vampireTarget)+1)%targets.length]?.id??null;
  return true;
}
export function vampireDive(g,id=g.vampireTarget) {
  if(g.phase!=='playing'||!g.flight||g.flight.dive||g.speechTime>0||g.invasion.stage==='arrival')return false;
  const target=g.enemies.find(e=>e.id===id&&e.hp>0&&!g.sameTeam(e,g.player));
  if(!target)return false;
  g.vampireTarget=id;g.flight.dive={target,x:g.player.x,z:g.player.z,height:g.flight.height,time:0};
  g.events.push({type:'vampire-dive'});return true;
}
export function landVampire(g) {
  const p=g.player,spots=[],danger=g.danger();
  for(let z=1;z<14;z++)for(let x=1;x<14;x++)if(g.canMove(x,z)&&!g.enemies.some(e=>e.hp>0&&Math.hypot(x-e.x,z-e.z)<.6))spots.push({x,z,d:Math.hypot(x-p.x,z-p.z)+(danger.has(`${x},${z}`)?4:0)});
  spots.sort((a,b)=>a.d-b.d);
  if(spots.length){p.x=spots[0].x;p.z=spots[0].z;}
  p.vampire=0;p.vx=0;p.vz=0;p.invulnerable=Math.max(p.invulnerable,.7);g.flight=null;
}
export function startSpeech(g) {
  if(g.poison||g.speechTime>0)return false;
  g.speechTime=SPEECH_SECONDS;g.quote='';g.quoteTime=0;
  g.events.push({type:'poison-speech'});return true;
}
export function releasePoison(g) {
  const victims=g.enemies.filter(e=>e.hp>0&&!g.sameTeam(e,g.player));
  const id=++g.serial,count=Math.max(0,victims.length-1),spots=[],shuffled=victims.slice();
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(g.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  // Scatter near shuffled rivals so the six-second scramble is actually winnable.
  // BFS gives walk distance through corridors, not distance through walls.
  for(const victim of shuffled.slice(0,count)){
    const queue=[{x:Math.round(victim.x),z:Math.round(victim.z),steps:0}],seen=new Set(),candidates=[];
    for(let i=0;i<queue.length;i++){
      const s=queue[i],key=`${s.x},${s.z}`;if(seen.has(key)||g.solid(s.x,s.z))continue;seen.add(key);
      if(s.steps>0&&!spots.some(o=>o.x===s.x&&o.z===s.z)&&!g.bombs.some(b=>Math.hypot(s.x-b.x,s.z-b.z)<.7))candidates.push(s);
      if(s.steps<4)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({x:s.x+dx,z:s.z+dz,steps:s.steps+1});
    }
    if(candidates.length){const s=candidates[Math.floor(g.random()*candidates.length)];spots.push({x:s.x,z:s.z});}
  }
  // Distinct reachable cells, one secretly cursed dose.
  const cursed=Math.floor(g.random()*Math.min(count,spots.length));
  g.poison={id,time:POISON_SECONDS,age:0,pulse:0,victims:victims.map(e=>e.id),total:Math.min(count,spots.length)};
  g.syringes=spots.slice(0,count).map((s,i)=>({...s,id:++g.serial,fall:2,cursed:i===cursed}));
  for(const e of victims){e.antidote=0;e.target=null;e.think=0;}
  g.notice='NÉVOA VERDE · CORRIDA PELO ANTÍDOTO!';g.noticeTime=3;
  g.events.push({type:'poison-release'});
}
export function tickSpeech(g,dt) {
  if(g.speechTime<=0)return false;
  g.speechTime=Math.max(0,g.speechTime-dt);
  if(g.speechTime<=0)releasePoison(g);
  return true;
}
export function antidoteGoal(g,e) {
  if(!g.poison||!g.poison.victims.includes(e.id)||e.antidote===g.poison.id)return null;
  const doses=g.syringes.map(s=>({...s,kind:'dose'}));
  const hearts=e.hp<3?g.items.filter(i=>i.type===0&&i.wait<=0).map(s=>({...s,kind:'heart'})):[];
  const options=[...doses,...hearts].sort((a,b)=>(a.kind===b.kind?0:a.kind==='dose'?-100:100)+Math.hypot(e.x-a.x,e.z-a.z)-Math.hypot(e.x-b.x,e.z-b.z));
  return options.find(s=>Math.hypot(s.x-e.x,s.z-e.z)<.5||g.path(e,[s.x,s.z],new Set()))||null;
}
export function tickGlobalSpecials(g,dt,input) {
  const p=g.player;
  if(g.flight){
    p.vampire=Math.max(0,p.vampire-dt);
    const dive=g.flight.dive;
    if(dive){
      if(dive.target.hp<=0){g.flight.dive=null;cycleVampireTarget(g);}
      else {
        dive.time+=dt;const t=clamp(dive.time/.8,0,1),s=t*t*(3-2*t);
        p.x=dive.x+(dive.target.x-dive.x)*s;p.z=dive.z+(dive.target.z-dive.z)*s;g.flight.height=dive.height+(1.8-dive.height)*s;
        if(t>=1){
          const target=dive.target;
          g.drains.push({target,time:2.4,remaining:2});
          g.specialEffects.push({id:++g.serial,kind:'bats',x:p.x,z:p.z,tx:target.x,tz:target.z,time:1,max:1});
          g.events.push({type:'vampire-bite',x:target.x,z:target.z});g.notice='MORDIDA · 2 CORAÇÕES EM 2,4s';g.noticeTime=2.5;
          landVampire(g);
        }
      }
    } else {g.flight.height=clamp(g.flight.height+((input.ascend?1:0)-(input.descend?1:0))*dt*3,3.8,9);if(p.vampire<=0)landVampire(g);}
  }
  for(const drain of g.drains){
    if(drain.target.hp<=0){drain.remaining=0;continue;}
    const amount=Math.min(drain.remaining,dt*2/2.4),hp=drain.target.hp;
    // A bite already connected: its gradual damage is not canceled by hit flashing.
    g.hurtEnemy(drain.target,'special',amount,{continuous:true});
    const lost=hp-drain.target.hp;p.hp=Math.min(3,p.hp+lost*.5);
    drain.remaining-=amount;drain.time-=dt;
  }
  g.drains=g.drains.filter(d=>d.remaining>1e-7&&d.target.hp>0);
  if(!g.poison)return;
  const poison=g.poison;poison.age+=dt;poison.time=Math.max(0,poison.time-dt);
  for(const dose of g.syringes)dose.fall=Math.max(0,dose.fall-dt);
  for(const e of g.enemies){
    if(e.hp<=0||!poison.victims.includes(e.id)||e.antidote===poison.id)continue;
    const dose=g.syringes.find(s=>s.fall<=0&&Math.hypot(s.x-e.x,s.z-e.z)<.65);
    if(dose){
      e.antidote=poison.id;e.target=null;e.think=0;g.syringes.splice(g.syringes.indexOf(dose),1);
      if(dose.cursed){e.alligator=true;g.events.push({type:'alligator',x:e.x,z:e.z});g.notice='SURPRESA! VIROU JACARÉ!';g.noticeTime=2.5;}
      else g.events.push({type:'antidote',x:e.x,z:e.z});
    }
    const heart=g.items.find(i=>i.type===0&&i.wait<=0&&e.hp<3&&Math.hypot(i.x-e.x,i.z-e.z)<.65);
    if(heart){e.hp=Math.min(3,e.hp+1);g.items.splice(g.items.indexOf(heart),1);}
  }
  // Six seconds to scramble, then three one-heart ticks. A heart can save the last rival.
  const pulse=poison.age>=13?3:poison.age>=10?2:poison.age>=7?1:0;
  while(poison.pulse<pulse){poison.pulse++;for(const e of g.enemies)if(e.hp>0&&poison.victims.includes(e.id)&&e.antidote!==poison.id)g.hurtEnemy(e,'special',1,{continuous:true});}
  if(poison.time<=0){g.poison=null;g.syringes=[];g.events.push({type:'poison-end'});}
}
export function globalSpecialSnapshot(g) {
  return {speechTime:g.speechTime,poisonTime:g.poison?.time||0,antidotes:g.syringes.length,antidoteTotal:g.poison?.total||0,
    flying:!!g.flight,diving:!!g.flight?.dive,flightHeight:g.flight?.height||0,vampireTarget:g.vampireTarget,
    vampireTargets:g.flight?g.enemies.filter(e=>e.hp>0&&!g.sameTeam(e,g.player)).map(e=>({id:e.id,skin:e.skin,hp:e.hp})):[],
    draining:g.drains.map(d=>({id:d.target.id,skin:d.target.skin,hp:d.target.hp,time:d.time}))};
}
