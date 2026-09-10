export const INVASION_WARNING = 7;
export const INVASION_DURATION = 30;
export const INVASION_INTRO = 3.2;

export class Invasion {
  constructor(random) {
    this.kind = random() < 0.5 ? 'putin' : 'trump';
    this.startsAt = 12 + random() * 20;
    this.stage = 'scheduled';
    this.warning = INVASION_WARNING;
    this.remaining = INVASION_DURATION;
    this.intro = 0;
    this.shots = 0;
    this.shotClock = 2;
    this.targets = [];
    this.actor = { x: 13, z: 7, target: null, think: 0, bombClock: 1.2, walk: 0 };
  }
  tick(game, dt) {
    if (this.stage === 'done') return false;
    if (this.stage === 'scheduled') {
      if (game.elapsed < this.startsAt) return false;
      this.stage = 'warning';
      game.events.push({ type: 'invasion-warning', kind: this.kind });
      return false;
    }
    if (this.stage === 'warning') {
      const previous = Math.ceil(this.warning);
      this.warning = Math.max(0, this.warning - dt);
      if (Math.ceil(this.warning) < previous)
        game.events.push({ type: 'invasion-beep', kind: this.kind });
      if (this.warning <= 0) {
        this.stage = this.kind === 'putin' ? 'arrival' : 'active';
        this.intro = this.kind === 'putin' ? INVASION_INTRO : 0;
        game.events.push({ type: 'invasion-enter', kind: this.kind });
      }
      return this.stage === 'arrival';
    }
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining <= 0) {
      this.stage = 'done';
      this.targets = [];
      game.events.push({ type: 'invasion-exit', kind: this.kind });
      return false;
    }
    if (this.stage === 'arrival') {
      this.intro = Math.max(0, this.intro - dt);
      if (this.intro <= 0) this.stage = 'active';
      return true;
    }
    const survivors = [game.player, ...game.enemies].filter(a => a.hp > 0);
    if (this.kind === 'putin') {
      this.shotClock -= dt;
      if (this.shots < 2 && this.shotClock <= 0 && survivors.length) {
        const choices = survivors.filter(a => (a.id ?? 'player') !== this.lastTarget);
        const candidates = choices.length ? choices : survivors;
        const victim = candidates[Math.floor(game.random() * candidates.length)];
        this.lastTarget = victim.id ?? 'player';
        this.targets.push({ id: ++game.serial, x: Math.round(victim.x), z: Math.round(victim.z), time: 3, victim: this.lastTarget });
        this.shots++;
        this.shotClock = 10;
        game.events.push({ type: 'invasion-target', player: this.lastTarget === 'player' });
      }
      for (const target of this.targets.slice()) {
        target.time -= dt;
        if (target.time > 0) continue;
        this.targets.splice(this.targets.indexOf(target), 1);
        // Fixed marked area: walking away remains a reliable counterplay.
        const bomb = { id: ++game.serial, x: target.x, z: target.z, y: 0.23, owner: 'invader', range: 1, fuse: 0 };
        game.bombs.push(bomb);
        game.explode(bomb);
      }
    } else {
      const a = this.actor;
      a.think -= dt;
      a.bombClock -= dt;
      if (!a.target || a.think <= 0) {
        a.think = 0.5;
        const victim = survivors[Math.floor(game.random() * survivors.length)];
        a.target = victim ? game.path(a, [Math.round(victim.x), Math.round(victim.z)], new Set()) : null;
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
        else { const step = Math.min(distance, dt*2.1); game.move(a,dx/distance*step,dz/distance*step); a.walk += dt*10; }
      }
      if (a.bombClock <= 0) {
        game.addBomb(a.x,a.z,'invader',2,2.4);
        a.bombClock = 2.8;
      }
    }
    return false;
  }
  snapshot() {
    return { kind: this.kind, stage: this.stage, warning: this.warning, remaining: this.remaining, intro: this.intro,
      targeted: this.targets.some(t => t.victim === 'player'), shots: this.shots };
  }
}
