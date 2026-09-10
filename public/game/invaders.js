import * as T from '../vendor/three.module.js';

export function createInvaderView({ scene, game, box, mesh, material, bombModel, materials, geometries, textures }) {
  const root = new T.Group();
  scene.add(root);
  const suit = material(0x132747), white = material(0xe4e9e7), skin = material(0xdca778);
  const metal = material(0x829894), trim = material(0x273843), red = material(0xff304a,0xff2030,.5);
  const faces = [0,1].map(() => new T.MeshBasicMaterial({color:0xffffff,transparent:true,alphaTest:.1}));
  materials.push(...faces);
  let disposed = false;
  new T.TextureLoader().load('/invaders.png', atlas => {
    if (disposed) { atlas.dispose(); return; }
    textures.push(atlas);
    for(let i=0;i<2;i++) {
      const tx=atlas.clone(); tx.colorSpace=T.SRGBColorSpace; tx.magFilter=T.NearestFilter;
      tx.minFilter=T.NearestFilter; tx.generateMipmaps=false;
      tx.repeat.set(.5,.83); tx.offset.set(i*.5,.17); tx.needsUpdate=true;
      textures.push(tx); faces[i].map=tx; faces[i].needsUpdate=true;
    }
  });
  const faceGeo = new T.PlaneGeometry(1.48,1.55); geometries.push(faceGeo);
  function politician(index) {
    const g = new T.Group();
    box(g,.94,1.05,.62,0,1.05,0,suit);
    box(g,.3,.88,.66,0,1.1,.02,white);
    box(g,.16,.64,.08,0,1.11,.39,index===0?red:trim);
    box(g,1.16,1.25,.95,0,2.12,0,skin);
    box(g,1.22,.26,1.02,0,2.77,-.02,index===0?material(0xeabd52):material(0xa39a88));
    mesh(g,faceGeo,faces[index],0,2.12,.49);
    const limbs=[];
    for(const sign of [-1,1]) {
      const leg=new T.Group(); leg.position.set(sign*.25,.65,0);g.add(leg);
      box(leg,.35,.62,.4,0,-.3,0,suit);box(leg,.4,.18,.66,0,-.61,.1,trim);
      const arm=new T.Group();arm.position.set(sign*.61,1.48,0);g.add(arm);
      box(arm,.3,.6,.4,0,-.3,0,suit);box(arm,.31,.28,.4,0,-.72,0,skin);
      limbs.push(leg,arm);
    }
    g.userData.limbs=limbs;
    return g;
  }
  const trump=politician(0); root.add(trump);
  const aircraft = new T.Group();root.add(aircraft);
  box(aircraft,1.5,1.25,7,0,0,0,metal);
  box(aircraft,1.1,.85,1.3,0,0,-4,trim);
  box(aircraft,9,.2,2.1,0,-.1,-.2,metal);
  box(aircraft,4,.16,1.2,0,.35,2.8,metal);
  box(aircraft,.25,1.65,1.5,0,.8,2.7,trim);
  box(aircraft,1.58,.3,2.4,0,.66,-.2,trim);
  const pilot=politician(1);pilot.scale.setScalar(.85);pilot.position.set(0,.27,-.6);pilot.rotation.y=Math.PI;aircraft.add(pilot);
  pilot.userData.limbs[1].rotation.x=-1.1;pilot.userData.limbs[3].rotation.x=-1.1;
  const propeller=new T.Group();propeller.position.z=-4.75;aircraft.add(propeller);
  box(propeller,.16,3,.16,0,0,0,white);box(propeller,3,.16,.16,0,0,0,white);
  const markers=new Map();
  const ringGeo=new T.RingGeometry(4.25,4.7,48),discGeo=new T.CircleGeometry(4.25,48);
  geometries.push(ringGeo,discGeo);
  const ringMat=new T.MeshBasicMaterial({color:0xff183f,side:T.DoubleSide,depthWrite:false});
  const discMat=new T.MeshBasicMaterial({color:0xff183f,transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false});
  materials.push(ringMat,discMat);
  function sync(camera) {
    const invasion=game.invasion;
    const visible=['playing','spectating','paused'].includes(game.phase);
    root.visible=visible;
    aircraft.visible=invasion.stage==='arrival';
    trump.visible=invasion.kind==='trump'&&invasion.stage==='active';
    if(aircraft.visible) {
      const t=1-invasion.intro/3.2;
      aircraft.position.set(4+t*28,13+Math.sin(t*Math.PI)*2.5,18);
      aircraft.rotation.set(0,-Math.PI/2,Math.sin(t*Math.PI*2)*.08);
      propeller.rotation.z=t*110;
    }
    if(trump.visible) {
      const a=invasion.actor;trump.position.set(a.x*2.7,Math.abs(Math.sin(a.walk))*.05,a.z*2.7);
      trump.rotation.y=Math.atan2(camera.position.x-trump.position.x,camera.position.z-trump.position.z);
      trump.userData.limbs.forEach((part,i)=>part.rotation.x=Math.sin(a.walk+(i%2)*Math.PI)*.32);
    }
    const ids=new Set(invasion.targets.map(t=>t.id));
    for(const [id,g] of markers) if(!ids.has(id)){root.remove(g);markers.delete(id);}
    for(const target of invasion.targets) {
      let g=markers.get(target.id);
      if(!g) {
        g=new T.Group();root.add(g);markers.set(target.id,g);
        const disc=mesh(g,discGeo,discMat,0,.04,0);disc.rotation.x=-Math.PI/2;
        const ring=mesh(g,ringGeo,ringMat,0,.05,0);ring.rotation.x=-Math.PI/2;
        const bomb=bombModel();g.add(bomb);g.userData.bomb=bomb;
        const orb=mesh(g,new T.OctahedronGeometry(.22),red,0,.3,0);geometries.push(orb.geometry);
      }
      g.position.set(target.x*2.7,0,target.z*2.7);
      g.userData.bomb.visible=target.time<.8;
      g.userData.bomb.position.y=Math.max(.6,target.time*17);
    }
  }
  return { sync, aircraft, dispose(){disposed=true;scene.remove(root);} };
}
