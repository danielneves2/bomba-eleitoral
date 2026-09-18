import { radialImpact, clearSight } from './impact.mjs?v=18';
export const INVASION_WARNING = 7;
export const TRUMP_CHARGE = 2.4;
export const MISSILE_RADIUS = 1.75;
export const TRUMP_RADIUS = 2.2;
export const INVASION_DURATION = 14;
export const INVASION_INTRO = 3;
export const INVADERS = ['putin', 'trump', 'kim', 'bukele'];
export const CAGE_DURATION = 6;

// Lock one reachable objective per hunt; the crowd option aims at its original area.
export function chooseTrumpObjective(game, actor, survivors) {
  const reachable = survivors.filter(v => Math.hypot(v.x-actor.x,v.z-actor.z)<1.2 || game.path(actor,[Math.round(v.x),Math.round(v.z)],new Set()));
  if (!reachable.length) return null;
  if (game.random() < .5) return { victim: reachable[Math.floor(game.random()*reachable.length)] };
  const ranked = reachable.map(v => ({x:v.x,z:v.z,count:survivors.filter(p=>Math.hypot(p.x-v.x,p.z-v.z)<=TRUMP_RADIUS).length}));
  const best = Math.max(...ranked.map(v=>v.count));
  const choices = ranked.filter(v=>v.count===best);
  return choices[Math.floor(game.random()*choices.length)];
}

export class Invasion {
  constructor(random, previousOmitted = null) {
    const pool=INVADERS.slice();
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    // No invader misses two consecutive match drafts on this game session.
    if(pool[3]===previousOmitted){const j=Math.floor(random()*3);[pool[3],pool[j]]=[pool[j],pool[3]];}
    this.lineup=pool.slice(0,3);this.omitted=pool[3];
    this.kind = this.lineup[0];
    this.startsAt = 5 + random() * 5;
    this.schedule=[this.startsAt,this.startsAt+30+random()*3,this.startsAt+60+random()*3];
    this.wave = 1;
    this.resetEncounter();
  }
  resetEncounter() {
    this.stage = 'scheduled';
    this.warning = INVASION_WARNING;
    this.remaining = INVASION_DURATION;
    this.intro = 0;
    this.introDuration=INVASION_INTRO;
    this.shots = 0;
    this.shotClock = 2;
    this.targets = [];
    this.impacts = [];
    this.lastTarget = null;
    this.launchIndex = 0;
    this.captureIndex=0;this.speechPlayed=false;
    this.cages = [];
    this.captured = new Set();
    this.actor = { x: 13, z: 7, target: null, think: 0, walk: 0, state: 'hunting', charge: 0, beep: 0 };
  }
  tick(game, dt) {
    // Captures finish their full six seconds even when the patrol leaves.
    for (const cage of this.stage==='arrival'?[]:this.cages) {
      cage.time = Math.max(0,cage.time-dt);
      if(cage.victim.hp<=0) cage.time=0;
      if(cage.time===0) game.events.push({type:'cage-release',player:cage.victim===game.player});
    }
    this.cages=this.cages.filter(c=>c.time>0);
    if (this.stage === 'done') {
      if (this.wave >= this.lineup.length || game.elapsed < this.schedule[this.wave]) return false;
      this.kind = this.lineup[this.wave];
      this.startsAt = this.schedule[this.wave];
      this.wave++;
      this.resetEncounter();
    }
    if (this.stage === 'scheduled') {
      if (game.elapsed < this.startsAt) return false;
      this.stage = 'warning';
      if(this.kind==='trump'||this.kind==='bukele') {
        const options=[];
        for(let z=1;z<14;z++)for(let x=1;x<14;x++) {
          const distance=Math.hypot(x-game.player.x,z-game.player.z);
          if(!game.solid(x,z)&&distance>=4&&distance<=7&&game.path({x,z},[Math.round(game.player.x),Math.round(game.player.z)],new Set()))options.push({x,z,distance});
        }
        options.sort((a,b)=>a.distance-b.distance);
        if(options.length){this.actor.x=options[0].x;this.actor.z=options[0].z;}
      }
      game.events.push({ type: 'invasion-warning', kind: this.kind });
      return false;
    }
    if (this.stage === 'warning') {
      const previous = Math.ceil(this.warning);
      this.warning = Math.max(0, this.warning - dt);
      if (Math.ceil(this.warning) < previous)
        game.events.push({ type: 'invasion-beep', kind: this.kind });
      if (this.warning <= 0) {
        this.stage = 'arrival';
        this.introDuration=this.kind==='bukele'?5:this.kind==='trump'?4:INVASION_INTRO;
        this.intro = this.introDuration;
        game.events.push({ type: 'invasion-enter', kind: this.kind });
      }
      return this.stage === 'arrival';
    }
    if (this.stage === 'arrival') {
      this.intro = Math.max(0, this.intro - dt);
      if(this.kind==='bukele') {
        const progress=1-this.intro/this.introDuration;
        while(this.captureIndex<3&&progress>=.08+this.captureIndex*.1)game.events.push({type:'cage-slam',index:this.captureIndex++});
        if(progress>=.4&&!this.speechPlayed){this.speechPlayed=true;game.events.push({type:'invader-speech',text:'Todo mundo na grade. A ordem chegou!'});}
      }
      if(this.kind === 'kim') {
        const progress=1-this.intro/INVASION_INTRO;
        while(this.launchIndex<3 && progress>=.4+this.launchIndex*.13) {
          game.events.push({type:'missile-launch',index:this.launchIndex++});
        }
      }
      if (this.intro <= 0) { this.stage = 'active'; if(this.kind === 'kim') this.shotClock = .35; }
      return true;
    }
    this.remaining = Math.max(0, this.remaining - dt);
    for(const impact of this.impacts) impact.life -= dt;
    this.impacts = this.impacts.filter(impact => impact.life > 0);
    if (this.remaining <= 0) {
      this.stage = 'done';
      this.targets = [];
      game.events.push({ type: 'invasion-exit', kind: this.kind });
      return false;
    }
    const survivors = [game.player, ...game.enemies].filter(a => a.hp > 0);
    if (this.kind === 'putin' || this.kind === 'kim') {
      this.shotClock -= dt;
      const limit = this.kind === 'kim' ? 3 : 2;
      if (this.shots < limit && this.shotClock <= 0 && survivors.length) {
        const choices = survivors.filter(a => (a.id ?? 'player') !== this.lastTarget);
        const candidates = choices.length ? choices : survivors;
        const victim = candidates[Math.floor(game.random() * candidates.length)];
        this.lastTarget = victim.id ?? 'player';
        const duration = this.kind === 'kim' ? 2.8 : 2.5;
        this.targets.push({ id: ++game.serial, x: Math.round(victim.x), z: Math.round(victim.z), time: duration, duration, radius: this.kind === 'kim' ? MISSILE_RADIUS : 0, victim: this.lastTarget });
        this.shots++;
        this.shotClock = this.kind === 'kim' ? 3.5 : 5;
        game.events.push({ type: 'invasion-target', kind: this.kind, x: victim.x, z: victim.z, player: this.lastTarget === 'player' });
      }
      for (const target of this.targets.slice()) {
        target.time -= dt;
        if (target.time > 0) continue;
        this.targets.splice(this.targets.indexOf(target), 1);
        if (this.kind === 'kim') { radialImpact(game, target.x, target.z, MISSILE_RADIUS, 'missile'); continue; }
        // Fixed marked area: walking away remains a reliable counterplay.
        const bomb = { id: ++game.serial, x: target.x, z: target.z, y: 0.23, owner: 'invader', range: 1, fuse: 0, lethal: true };
        game.bombs.push(bomb);
        game.explode(bomb);
      }
    } else {
      const a = this.actor;
      if (a.state === 'spent') return false;
      if (a.state === 'charging') {
        a.charge += dt; a.beep -= dt;
        if(a.beep <= 0) { a.beep = .45 - .3 * Math.min(1,a.charge/TRUMP_CHARGE); game.events.push({type:'trump-beep',x:a.x,z:a.z,charge:a.charge/TRUMP_CHARGE}); }
        if(a.charge >= TRUMP_CHARGE) { a.state='spent'; radialImpact(game,a.x,a.z,TRUMP_RADIUS,'trump'); }
        return false;
      }
      if (this.kind === 'trump') {
        if (!a.objective || a.objective.victim?.hp <= 0) a.objective = chooseTrumpObjective(game,a,survivors);
        const goal = a.objective?.victim || a.objective;
        if (!goal) return false;
        if (Math.hypot(goal.x-a.x,goal.z-a.z)<1.2 && clearSight(game,a,goal)) {
          a.state='charging';a.target=null;a.charge=0;
          game.events.push({type:'trump-charge',x:a.x,z:a.z});return false;
        }
        a.think -= dt;
        if (!a.target || a.think <= 0) {
          a.think=.35;
          a.target=clearSight(game,a,goal) ? [goal.x,goal.z] : game.path(a,[Math.round(goal.x),Math.round(goal.z)],new Set());
          if (!a.target) {a.objective=null;return false;}
        }
        const dx=a.target[0]-a.x,dz=a.target[1]-a.z,distance=Math.hypot(dx,dz);
        if(distance<.06) a.target=null;
        else {const step=Math.min(distance,dt*3.2);game.move(a,dx/distance*step,dz/distance*step);a.walk+=dt*13;}
        return false;
      }
      const nearest = survivors.filter(v=>!(v===game.player&&game.flight)&&(this.kind!=='bukele'||!this.captured.has(v))).sort((p,q)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(q.x-a.x,q.z-a.z));
      const close = nearest.find(v=>Math.hypot(v.x-a.x,v.z-a.z)<1.6 && clearSight(game,a,v));
      if(close) {
        if(this.kind==='bukele') {
          if(Math.hypot(close.x-a.x,close.z-a.z)<.85) {
            this.captured.add(close);
            this.cages.push({id:++game.serial,x:close.x,z:close.z,time:CAGE_DURATION,victim:close});
            close.vx=0;close.vz=0;a.target=null;
            game.events.push({type:'cage-capture',player:close===game.player,x:close.x,z:close.z});
            return false;
          }
        } else { a.state='charging';a.target=null;a.charge=0;game.events.push({type:'trump-charge',x:a.x,z:a.z});return false; }
      }
      a.think -= dt;
      if (!a.target || a.think <= 0) {
        a.think = 0.5;
        a.target = null;
        for(const victim of nearest) { a.target = Math.hypot(victim.x-a.x,victim.z-a.z)<1.6&&clearSight(game,a,victim) ? [victim.x,victim.z] : game.path(a,[Math.round(victim.x),Math.round(victim.z)],new Set()); if(a.target) break; }
        if (!a.target) {
          const options = [[1,0],[-1,0],[0,1],[0,-1]]
            .map(([x,z]) => [Math.round(a.x)+x,Math.round(a.z)+z])
            .filter(([x,z]) => !game.solid(x,z));
          a.target = options[Math.floor(game.random()*options.length)] || null;
        }
      }
      if (a.target) {
        const dx = a.target[0]-a.x, dz = a.target[1]-a.z, distance = Math.hypot(dx,dz);
        if (distance < 0.06) { a.x = a.target[0]; a.z = a.target[1]; a.target = null; }
        else { const step = Math.min(distance, dt*2.5); game.move(a,dx/distance*step,dz/distance*step); a.walk += dt*10; }
      }
    }
    return false;
  }
  // Estado completo para a rede. Referencias a lutadores viram indices, senao
  // nao atravessam o JSON.
  netState(game) {
    const indexOf = (f) => (f === game.player ? 0 : game.enemies.indexOf(f) + 1);
    return {
      kind: this.kind, stage: this.stage, warning: this.warning, remaining: this.remaining,
      intro: this.intro, introDuration: this.introDuration, wave: this.wave,
      shots: this.shots, shotClock: this.shotClock, startsAt: this.startsAt,
      lineup: this.lineup, schedule: this.schedule, omitted: this.omitted,
      launchIndex: this.launchIndex, captureIndex: this.captureIndex, speechPlayed: this.speechPlayed,
      lastTarget: this.lastTarget,
      actor: { ...this.actor, target: this.actor.target ? indexOf(this.actor.target) : null },
      targets: this.targets.map((t) => ({ ...t })),
      impacts: this.impacts.map((i) => ({ ...i })),
      cages: this.cages.map((c) => ({ id: c.id, x: c.x, z: c.z, time: c.time, victim: indexOf(c.victim) })),
      captured: [...this.captured].map(indexOf),
    };
  }
  // Recebe o estado do servidor e volta a apontar para os lutadores desta copia.
  applyNetState(game, state) {
    if (!state) return;
    for (const key of ['kind','stage','warning','remaining','intro','introDuration','wave','shots','shotClock','startsAt','lineup','schedule','omitted','launchIndex','captureIndex','speechPlayed','lastTarget'])
      if (state[key] !== undefined) this[key] = state[key];
    const { target, ...actor } = state.actor || {};
    Object.assign(this.actor, actor);
    this.actor.target = target == null ? null : game.fighter(target);
    this.targets = (state.targets || []).map((t) => ({ ...t }));
    this.impacts = (state.impacts || []).map((i) => ({ ...i }));
    this.cages = (state.cages || [])
      .map((c) => ({ ...c, victim: game.fighter(c.victim) }))
      .filter((c) => c.victim);
    this.captured = new Set((state.captured || []).map((i) => game.fighter(i)).filter(Boolean));
  }
  snapshot() {
    return { kind: this.kind, stage: this.stage, warning: this.warning, remaining: this.remaining, intro: this.intro, introDuration:this.introDuration, duration: INVASION_DURATION, wave: this.wave, lineup:this.lineup, schedule:this.schedule,
      caged: this.cages.find(c=>c.victim.id===undefined)?.time || 0,
      targeted: this.targets.some(t => t.victim === 'player'), shots: this.shots, charging: this.actor.state === 'charging', charge: this.actor.charge/TRUMP_CHARGE };
  }
}
