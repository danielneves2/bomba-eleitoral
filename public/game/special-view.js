import * as T from '../vendor/three.module.js';
import {SPECIALS, equipment} from './specials.mjs?v=20';

export function createSpecialView({camera,scene,game,box,mesh,geometries,materials,textures,viewer}) {
  // Quem esta olhando: o heroi local, ou o boneco do convidado no multiplayer.
  const me=()=>(viewer?viewer():game.player)||game.player;
  const char=()=>game.characterOf?game.characterOf(me()):game.character;
  const root=new T.Group();camera.add(root);
  const mat=(color,opacity=1)=>{const m=new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthTest:false,depthWrite:false});materials.push(m);return m;};
  const navy=mat(0x09223d),blue=mat(0x1f78bb),gold=mat(0xffd05c),cream=mat(0xffe8b8),red=mat(0xb9333f),dark=mat(0x371b28),silver=mat(0xa3bdca),purple=mat(0x8957c5);
  const skin=mat(0xd7a16e),cuff=mat(0x153554);
  const plane=new T.PlaneGeometry(1,1);geometries.push(plane);
  const iconMats=new Map();
  function icon(group,name,w,h,x=0,y=0,z=.051){
    let material=iconMats.get(name);
    if(!material){const texture=new T.TextureLoader().load(`/specials/${name}.svg`);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;textures.push(texture);material=mat(0xffffff);material.map=texture;material.transparent=true;material.alphaTest=.1;iconMats.set(name,material);}
    const m=mesh(group,plane,material,x,y,z);m.scale.set(w,h,1);return m;
  }
  const held=new Map();
  for(const name of ['handlebar','windjar','goblet','workbook','radio','flag']){
    const g=new T.Group();root.add(g);held.set(name,g);
    box(g,.13,.14,.12,.12,-.22,.03,skin);box(g,.15,.18,.14,.14,-.35,.02,cuff);
    if(name==='workbook'){
      box(g,.33,.45,.065,0,0,0,navy);box(g,.3,.41,.072,.012,0,0,cream);
      box(g,.335,.45,.02,0,0,.05,blue);box(g,.028,.45,.075,-.15,0,.01,gold);
      icon(g,name,.48,.54,0,0,.064);
    } else if(name==='radio'){
      box(g,.29,.39,.13,0,-.02,0,navy);box(g,.025,.24,.025,.095,.27,0,silver);
      icon(g,name,.46,.55,0,.055,.072);box(g,.055,.025,.06,-.055,-.11,.093,red);
    } else if(name==='windjar'){
      box(g,.28,.32,.18,0,-.025,0,blue);box(g,.23,.035,.17,0,.16,0,cream);box(g,.19,.04,.14,0,.195,0,gold);
      icon(g,name,.46,.52,0,.01,.1);
      const wind=new T.Group();g.add(wind);g.userData.wind=wind;
      for(let i=0;i<5;i++)box(wind,.14-i*.016,.008,.012,0,-.1+i*.045,.117,cream);
    } else if(name==='goblet'){
      box(g,.27,.21,.18,0,.1,0,gold);box(g,.18,.015,.11,0,.213,0,red);box(g,.04,.25,.04,0,-.09,0,gold);box(g,.21,.035,.14,0,-.225,0,gold);
      icon(g,name,.45,.49,0,0,.1);
      box(g,.06,.07,.025,0,.08,.125,purple);
    } else if(name==='flag'){
      box(g,.035,.87,.035,-.04,0,0,gold);
      const cloth=new T.Group();g.add(cloth);g.userData.cloth=cloth;
      for(let i=0;i<6;i++)box(cloth,.052,.27,.015,.005+i*.05,.22,0,i%2?red:mat(0xdd4250));
      icon(cloth,'flag',.4,.43,.13,.19,.02);
    } else {
      box(g,.67,.04,.06,0,-.05,0,silver);box(g,.055,.15,.06,-.32,.01,0,silver);box(g,.055,.15,.06,.32,.01,0,silver);
      box(g,.17,.065,.08,-.36,.09,0,dark);box(g,.17,.065,.08,.36,.09,0,dark);
      box(g,.22,.15,.12,0,-.02,0,gold);box(g,.16,.095,.012,0,0,.075,navy);
      icon(g,'handlebar',.27,.27,0,.005,.085);
      box(g,.13,.1,.11,-.36,.07,.03,skin);box(g,.13,.1,.11,.36,.07,.03,skin);
    }
    g.rotation.set(-.07,-.15,.06);
  }
  // One thick, stepped shield: a grilled picanha face, fat rim, rivets and a grip.
  const shield=new T.Group();root.add(shield);
  const shape=new T.Shape();shape.moveTo(-.23,.3);shape.lineTo(.23,.3);shape.lineTo(.23,.25);shape.lineTo(.28,.25);shape.lineTo(.28,-.12);shape.lineTo(.22,-.12);shape.lineTo(.22,-.21);shape.lineTo(.14,-.21);shape.lineTo(.14,-.28);shape.lineTo(.06,-.28);shape.lineTo(.06,-.33);shape.lineTo(-.06,-.33);shape.lineTo(-.06,-.28);shape.lineTo(-.14,-.28);shape.lineTo(-.14,-.21);shape.lineTo(-.22,-.21);shape.lineTo(-.22,-.12);shape.lineTo(-.28,-.12);shape.lineTo(-.28,.25);shape.lineTo(-.23,.25);shape.closePath();
  const shieldGeo=new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false});geometries.push(shieldGeo);
  mesh(shield,shieldGeo,gold);const fat=mesh(shield,shieldGeo,cream,0,0,.035);fat.scale.set(.91,.91,.9);
  const beef=mesh(shield,shieldGeo,red,0,-.008,.074);beef.scale.set(.77,.77,.65);
  const roast=mat(0x73232e),highlight=mat(0xe56b60);
  for(let i=0;i<5;i++){const grill=box(shield,.24,.026,.012,0,.16-i*.072,.12,roast);grill.rotation.z=-.24;}
  for(const [x,y,w] of [[-.13,.12,.06],[.08,.18,.07],[-.08,-.11,.045],[.08,-.14,.06],[-.03,.23,.07]])box(shield,w,.02,.012,x,y,.123,highlight);
  for(const [x,y] of [[-.23,.22],[.23,.22],[-.22,-.08],[.22,-.08],[0,-.285]])box(shield,.028,.028,.022,x,y,.07,navy);
  box(shield,.035,.2,.045,.04,-.06,-.05,dark);box(shield,.12,.13,.09,.04,-.09,-.075,skin);
  const rimGlow=mat(0xffd96b,.2),glow=mesh(shield,shieldGeo,rimGlow,0,0,-.008);glow.scale.set(1.08,1.08,.4);
  let foregroundLayer=101;root.traverse(o=>{if(o.isMesh)o.renderOrder=foregroundLayer++;});

  const effectsRoot=new T.Group();scene.add(effectsRoot);
  const effectMat=new T.MeshBasicMaterial({color:0x99f4ef,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false});materials.push(effectMat);
  const ringGeo=new T.RingGeometry(.7,.8,12);geometries.push(ringGeo);
  const gusts=Array.from({length:6},()=>mesh(effectsRoot,ringGeo,effectMat));
  const batMat=new T.MeshBasicMaterial({color:0xb579df,side:T.DoubleSide});materials.push(batMat);
  const bats=Array.from({length:8},()=>{const g=new T.Group();effectsRoot.add(g);box(g,.12,.2,.08,0,0,0,batMat);const l=box(g,.4,.11,.06,-.22,0,0,batMat),r=box(g,.4,.11,.06,.22,0,0,batMat);g.userData.wings=[l,r];return g;});
  const previewMats=[0xff5d63,0x89f5b0].map(color=>{const m=new T.MeshBasicMaterial({color,transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false});materials.push(m);return m;});
  const tiles=Array.from({length:3},()=>{const m=mesh(effectsRoot,plane,previewMats[1]);m.rotation.x=-Math.PI/2;m.scale.set(2.4,2.4,1);return m;});
  return {
    sync(time,reduced){
      const active=game.phase==='playing'&&game.countdown===0&&game.invasion.stage!=='arrival'&&!game.speechTime&&!game.flight;root.visible=active;
      const eq=equipment(game,me()),name=SPECIALS[char()].asset,aspect=camera.aspect,compact=Math.min(1,aspect/.95),lift=reduced?0:me().equipTime/.45,cast=reduced?0:Math.sin(Math.min(1,me().actionAnim/.65)*Math.PI);
      for(const [id,g] of held){g.visible=id===name&&(eq.time>0||me().actionAnim>0)&&!me().heldBomb;if(!g.visible)continue;
        g.scale.setScalar(compact);g.position.set((id==='handlebar'?0:.31)*compact,-.2-lift*.45+cast*.15,-.75);
        g.rotation.z=.06-cast*.2+(reduced?0:Math.sin(time*2)*.01);
        if(id==='workbook'){g.position.x=(.26-cast*.19)*compact;g.position.z=-.72-cast*.1;}
        if(id==='handlebar'){g.position.y=-.37;g.rotation.z=reduced?0:Math.sin(time*16)*.006*(me().dashTime>0?3:1);}
        if(g.userData.wind)g.userData.wind.children.forEach((c,i)=>c.position.x=reduced?0:Math.sin(time*5+i)*.03);
        if(g.userData.cloth)g.userData.cloth.children.forEach((c,i)=>c.position.z=reduced?0:Math.sin(time*4+i*.5)*.016);
      }
      shield.visible=me().picanhaTime>0;shield.scale.setScalar(compact*1.05);shield.position.set(-.32*compact,-.19-lift*.4,-.69+game.shieldFlash*.045);shield.rotation.set(-.05,.18,-.09);rimGlow.opacity=.14+game.shieldFlash*.5+(reduced?0:Math.sin(time*7)*.04);
      const wind=game.specialEffects.find(e=>e.kind==='wind');gusts.forEach((m,i)=>{m.visible=!!wind;if(!wind)return;const f=1-wind.time/wind.max,d=f*10+i*.65;m.position.set(wind.x*2.7-Math.sin(wind.yaw)*d,1.3,wind.z*2.7-Math.cos(wind.yaw)*d);m.rotation.y=wind.yaw;m.scale.setScalar(.8+f*.8);});
      const swarm=game.specialEffects.find(e=>e.kind==='bats');bats.forEach((g,i)=>{g.visible=!!swarm;if(!swarm)return;const f=1-swarm.time/swarm.max;g.position.set((swarm.x+(swarm.tx-swarm.x)*f)*2.7+Math.sin(i*2+time*8)*.4,1.5+Math.cos(i+time*6)*.4,(swarm.z+(swarm.tz-swarm.z)*f)*2.7);g.rotation.y=camera.rotation.y;g.userData.wings.forEach((w,j)=>w.rotation.z=(j?1:-1)*Math.sin(time*24+i)*.7);});
      const spots=me().flagTime>0&&active?game.occupationPreview(me()):[];tiles.forEach((m,i)=>{const p=spots[i];m.visible=!!p;if(p){m.position.set(p.x*2.7,.065,p.z*2.7);m.material=previewMats[p.valid?1:0];}});
    },
    equipped(){return [2,3,4,5,7].includes(char())&&(equipment(game,me()).time>0||me().actionAnim>0)&&!me().heldBomb;},
    destroy(){camera.remove(root);scene.remove(effectsRoot);},
  };
}
