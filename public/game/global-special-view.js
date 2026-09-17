import * as T from '../vendor/three.module.js';
import {loadCutout} from './cutouts-v7.js';

export function createGlobalSpecialView({scene,game,box,mesh,materials,geometries,textures,onError}) {
  const root=new T.Group();scene.add(root);let disposed=false;
  const plane=new T.PlaneGeometry(1,1);geometries.push(plane);
  const banks={vampire:[],alligator:[],speech:[]};
  function material(color,opacity=1){const m=new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,side:T.DoubleSide,depthWrite:opacity===1});materials.push(m);return m;}
  const blank=material(0xffffff,0);
  async function load(url,kinds,rows){
    try{
      const canvas=await loadCutout(url);if(disposed)return;
      for(let row=0;row<rows;row++)for(let col=0;col<3;col++){
        const tx=new T.CanvasTexture(canvas);tx.colorSpace=T.SRGBColorSpace;tx.magFilter=T.NearestFilter;tx.minFilter=T.NearestFilter;tx.generateMipmaps=false;
        tx.repeat.set(1/3,1/rows);tx.offset.set(col/3,1-(row+1)/rows);textures.push(tx);
        const mat=new T.MeshBasicMaterial({map:tx,transparent:true,alphaTest:.12,side:T.DoubleSide});materials.push(mat);banks[kinds[row]].push(mat);
      }
    }catch{onError('Uma transformação não carregou. Recarregue o jogo.');}
  }
  void load('/specials/transformations-v20.png',['vampire','alligator'],2);
  void load('/specials/speech-v20.png',['speech'],1);
  const flyer=mesh(root,plane,blank);flyer.scale.set(2.8,2.8,1);
  const speaker=mesh(root,plane,blank);speaker.scale.set(3,6,1);
  const stage=new T.Group();root.add(stage);
  const blue=material(0x112f49),gold=material(0xfed057),green=material(0x69ef81,.22),steel=material(0xc3eff5),liquid=material(0x65edb8),white=material(0xf6ffe8);
  box(stage,3.8,.24,3.1,0,.02,0,blue);box(stage,3.9,.06,3.2,0,.14,0,gold);
  const doses=new Map();
  function syringe(s){
    const g=new T.Group();root.add(g);
    box(g,.23,.64,.23,0,.1,0,steel);box(g,.15,.4,.25,0,.08,0,liquid);
    box(g,.07,.27,.07,0,.55,0,white);box(g,.4,.06,.16,0,.71,0,white);
    box(g,.3,.05,.19,0,.4,0,white);box(g,.035,.34,.035,0,-.4,0,steel);
    for(let i=0;i<4;i++)box(g,.1,.015,.025,.06,-.1+i*.1,.13,blue);
    const ringGeo=new T.RingGeometry(.35,.45,12);geometries.push(ringGeo);const ring=mesh(g,ringGeo,liquid,0,-.68,0);ring.rotation.x=-Math.PI/2;
    doses.set(s.id,g);return g;
  }
  const cloudGeo=new T.IcosahedronGeometry(1,0);geometries.push(cloudGeo);
  const clouds=Array.from({length:35},(_,i)=>{const c=mesh(root,cloudGeo,green);c.userData.origin={x:((i*37)%130)/10+1,z:((i*53)%130)/10+1};return c;});
  const spirits=new Map();
  function spirit(effect){
    const g=new T.Group();root.add(g);const mat=material(0xc7fff0,.6),dark=material(0x124367,.6);
    box(g,.6,.65,.15,0,0,0,mat);box(g,.8,.34,.13,0,-.2,0,mat);
    box(g,.42,.18,.13,0,.4,0,mat);box(g,.12,.13,.16,-.14,.12,.06,dark);box(g,.12,.13,.16,.14,.12,.06,dark);
    box(g,.13,.16,.16,0,-.12,.06,dark);
    for(const side of [-1,1]){const arm=box(g,.43,.14,.13,side*.43,-.02,0,mat);arm.rotation.z=side*.45;}
    const sparks=Array.from({length:8},()=>box(g,.055,.055,.055,0,0,0,mat));
    g.userData={mat,dark,sparks};spirits.set(effect.id,g);return g;
  }
  return {
    alligatorMaterial(walk){return banks.alligator[[0,1,2,1][Math.floor(Math.abs(walk)*1.7)%4]]||null;},
    sync(camera,time,reduced){
      root.visible=['playing','spectating','paused'].includes(game.phase)&&game.countdown===0;
      const active=!!game.flight,p=game.player;
      flyer.visible=active;flyer.material=banks.vampire[reduced?1:Math.floor(time*7)%3]||blank;
      if(active){flyer.position.set(p.x*2.7,game.flight.height-.55,p.z*2.7);flyer.rotation.y=camera.rotation.y;flyer.rotation.z=game.flight.dive?-.25:0;}
      speaker.visible=game.speechTime>0;stage.visible=speaker.visible;
      if(speaker.visible){
        const elapsed=3-game.speechTime,frame=reduced?1:Math.floor(elapsed*4)%3;
        speaker.material=banks.speech[frame]||blank;speaker.position.set(p.x*2.7,2.85,p.z*2.7);speaker.rotation.y=Math.atan2(camera.position.x-speaker.position.x,camera.position.z-speaker.position.z);
        stage.position.set(p.x*2.7,0,p.z*2.7);
      }
      const doseIds=new Set(game.syringes.map(s=>s.id));
      for(const [id,g] of doses)if(!doseIds.has(id)){root.remove(g);doses.delete(id);}
      for(const s of game.syringes){const g=doses.get(s.id)||syringe(s);g.position.set(s.x*2.7,.85+s.fall*5+(reduced?0:Math.sin(time*2+s.id)*.08),s.z*2.7);g.rotation.y=reduced?0:time;}
      clouds.forEach((c,i)=>{c.visible=!!game.poison;if(!game.poison)return;const o=c.userData.origin;c.position.set(o.x*2.7+(reduced?0:Math.sin(time*.3+i)*1.8),.4+(i%4)*.8,o.z*2.7);c.scale.set(2.8,1,2.2);});
      green.opacity=game.poison?.time?Math.min(.13,game.poison.age*.06,game.poison.time*.08):0;
      const effects=game.specialEffects.filter(e=>e.kind==='spirit'),ids=new Set(effects.map(e=>e.id));
      for(const [id,g] of spirits)if(!ids.has(id)){root.remove(g);spirits.delete(id);}
      for(const e of effects){
        const g=spirits.get(e.id)||spirit(e),t=1-e.time/e.max;
        g.position.set(e.x*2.7+(reduced?0:Math.sin(time*4)*.2),1+t*4,e.z*2.7);g.rotation.y=camera.rotation.y;
        g.userData.mat.opacity=(1-t)*.7;g.userData.dark.opacity=(1-t)*.7;
        g.userData.sparks.forEach((s,i)=>{const a=time*3+i*.79;s.position.set(Math.cos(a)*(.65+t),Math.sin(a)*.6,Math.sin(a)*.2);});
      }
    },
    camera(camera,reduced){
      const p=game.player;
      if(game.speechTime>0){const t=1-game.speechTime/3,a=(reduced?0:Math.sin(t*Math.PI)*.13);camera.position.set(p.x*2.7+Math.sin(a)*8,3.4,p.z*2.7+8.4-t*.5);camera.lookAt(p.x*2.7,2.6,p.z*2.7);camera.fov=65;camera.updateProjectionMatrix();return true;}
      if(game.flight){
        const h=game.flight.height;
        camera.position.set(p.x*2.7+Math.sin(p.yaw)*4,h+1.8,p.z*2.7+Math.cos(p.yaw)*4);
        camera.lookAt(p.x*2.7-Math.sin(p.yaw)*4,h-.6+p.pitch*3,p.z*2.7-Math.cos(p.yaw)*4);
        return true;
      }
      return false;
    },
    destroy(){disposed=true;scene.remove(root);},
  };
}
