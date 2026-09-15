import { advanceFrame,launchState } from './core.mjs?v=15';

// A disposable bot match powers the title screen. Starting a real match resets it.
export function prepareAttract(game) {
  const omitted=game.lastOmittedInvader;
  game.reset(0,'caos');
  game.lastOmittedInvader=omitted;
  game.player.hp=0;
  game.countdown=0;
  game.invasion.startsAt=Infinity;
  game.enemies.forEach((bot,i)=>{bot.cd=.2+i*.14;});
  game.events=[];
  game.phase='menu';
}
export function advanceAttract(game,seconds) {
  game.phase='spectating';
  advanceFrame(game,seconds);
  for(const event of game.events){
    if(event.type!=='bomb'||event.bomb.id%2===0)continue;
    const bot=game.enemies.find(e=>e.id===event.bomb.owner);
    const target=bot&&game.enemies.filter(e=>e!==bot&&e.hp>0).sort((a,b)=>Math.hypot(a.x-bot.x,a.z-bot.z)-Math.hypot(b.x-bot.x,b.z-bot.z))[0];
    if(target)Object.assign(event.bomb,launchState({x:bot.x,z:bot.z,yaw:Math.atan2(bot.x-target.x,bot.z-target.z),pitch:.55},.25));
  }
  const finished=['won','lost','draw'].includes(game.phase)||game.elapsed>=28||game.enemies.filter(e=>e.hp>0).length<3;
  game.events=game.events.filter(e=>['explode','crate','defeat','hit'].includes(e.type));
  game.phase='menu';
  return finished;
}
