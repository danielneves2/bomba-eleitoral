// Original score, scheduled on the audio clock rather than render frames.
export function createSoundtrack(ctx, destination) {
  const bus=ctx.createGain();bus.gain.value=0;bus.connect(destination);
  const roots=[146.83,116.54,130.81,110], melody=[0,7,12,10,7,3,5,7,0,3,7,12,10,7,5,3];
  const active=new Set();let next=ctx.currentTime,step=0,duckUntil=0,disposed=false;
  const noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.15),ctx.sampleRate);
  const samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  function note(freq,time,length,volume,type='triangle',end) {
    const source=ctx.createOscillator(),gain=ctx.createGain();source.type=type;
    source.frequency.setValueAtTime(freq,time);if(end)source.frequency.exponentialRampToValueAtTime(end,time+length);
    gain.gain.setValueAtTime(.0001,time);gain.gain.linearRampToValueAtTime(volume,time+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,time+length);
    source.connect(gain);gain.connect(bus);active.add(source);
    source.onended=()=>{source.disconnect();gain.disconnect();active.delete(source);};source.start(time);source.stop(time+length+.01);
  }
  function drum(time,snare) {
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=noise;filter.type='highpass';filter.frequency.value=snare?1200:6500;
    gain.gain.setValueAtTime(snare ? .13 : .045,time);gain.gain.exponentialRampToValueAtTime(.0001,time+(snare ? .12 : .035));
    source.connect(filter);filter.connect(gain);gain.connect(bus);active.add(source);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();active.delete(source);};source.start(time);source.stop(time+.15);
  }
  return {
    update(game,muted) {
      if(disposed)return;
      const enabled=!muted&&['menu','playing','spectating'].includes(game.phase),calm=game.phase==='menu'||game.countdown>0;
      const tense=game.invasion.stage==='active'||game.player.hp===1;
      const duck=ctx.currentTime<duckUntil||['warning','arrival'].includes(game.invasion.stage)||game.quoteTime>0;
      bus.gain.setTargetAtTime(enabled?(duck ? .12 : calm ? .3 : .48):0,ctx.currentTime,.08);
      if(!enabled){next=ctx.currentTime+.04;return;}
      if(next<ctx.currentTime-.1)next=ctx.currentTime+.015;
      const interval=60/(calm?112:136)/4;
      while(next<ctx.currentTime+.12){
        const beat=step%16,root=roots[Math.floor(step/32)%4];
        if(beat%4===0)note(root/2,next,.28,.3);
        if(!calm&&beat%4===0)note(125,next,.16,.4,'sine',42);
        if(!calm&&beat%8===4)drum(next,true);
        if(!calm&&beat%2===1)drum(next,false);
        if(beat%2===0||tense)note(root*2*Math.pow(2,melody[step%16]/12),next,.13,calm ? .065 : .1);
        if(beat===0)for(const semitone of [0,3,7])note(root*Math.pow(2,semitone/12),next,.75,.035,'sine');
        if(tense&&beat===15)note(root*4,next,.09,.08,'square');
        next+=interval;step++;
      }
    },
    duck(seconds=.5){duckUntil=Math.max(duckUntil,ctx.currentTime+seconds);},
    reset(){step=0;next=ctx.currentTime+.02;},
    dispose(){disposed=true;for(const source of active){try{source.stop();}catch{ /* Already ended. */ }}active.clear();bus.disconnect();}
  };
}
