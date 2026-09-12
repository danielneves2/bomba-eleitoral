import * as T from '../vendor/three.module.js';
import { INVASION_INTRO, TRUMP_CHARGE, TRUMP_RADIUS } from './invasion.mjs?v=11';
import { createMissileFactory } from './missile-model.js?v=11';
import { loadCutout } from './cutouts-v7.js';

export function createInvaderView({ scene, game, box, mesh, material, bombModel, materials, geometries, textures, onError }) {
  const root = new T.Group(); scene.add(root);
  const missileModel = createMissileFactory({mesh,box,material,geometries});
  let disposed = false, animation = 0;
  const white = material(0xf5efdb), metal = material(0x829894), trim = material(0x273843);
  const red = material(0xff304a, 0xff2030, .5), blue = material(0x173d8e), gold = material(0xe8b83c);
  const geo = new T.PlaneGeometry(2.7, 2.7), shadowGeo = new T.CircleGeometry(.66, 24);
  const shadowMat = new T.MeshBasicMaterial({ color: 0x090714, transparent: true, opacity: .3, depthWrite: false });
  geometries.push(geo, shadowGeo); materials.push(shadowMat);
  function spriteMaterial() {
    const mat = new T.MeshBasicMaterial({ transparent: true, alphaTest: .12, side: T.DoubleSide });
    materials.push(mat); return mat;
  }
  const portraits = [0, 1, 2].map(spriteMaterial);
  function load(url, targets, columns) {
    loadCutout(url).then(canvas => {
      if (disposed) return;
      const atlas = new T.CanvasTexture(canvas);
      if (columns === 3) canvas.toBlob(blob => {
        if (disposed || !blob) return;
        portraitUrl = URL.createObjectURL(blob);
        document.documentElement.style.setProperty('--invader-atlas', `url("${portraitUrl}")`);
      });
      textures.push(atlas);
      targets.forEach((mat, i) => {
        const tx = atlas.clone();
        tx.colorSpace = T.SRGBColorSpace; tx.magFilter = T.NearestFilter;
        tx.minFilter = T.NearestFilter; tx.generateMipmaps = false;
        tx.repeat.set(1 / columns, 1); tx.offset.set(i / columns, 0); tx.needsUpdate = true;
        textures.push(tx); mat.map = tx; mat.needsUpdate = true;
      });
    }).catch(() => { if (!disposed) onError('A arte dos invasores não carregou. Recarregue a página.'); });
  }
  let portraitUrl;
  load('/invaders-voxel-v7.png', portraits, 3);
  function politician(index) {
    const g = new T.Group();
    g.userData.figure = mesh(g, geo, portraits[index], 0, 1.22, 0);
    mesh(g, shadowGeo, shadowMat, 0, .03, 0).rotation.x = -Math.PI / 2;
    return g;
  }
  const trump = politician(0), kim = politician(2); root.add(trump, kim);
  const bukele=politician(0);root.add(bukele);
  const bukeleMat=spriteMaterial();bukele.userData.figure.material=bukeleMat;
  load('/bukele-pixel-v11.png',[bukeleMat],1);
  const walking={trump:spriteMaterial(),bukele:spriteMaterial()};
  for(const kind of ['trump','bukele'])loadCutout(`/${kind}-walk-v12.png`).then(canvas=>{
    if(disposed)return;
    const tx=new T.CanvasTexture(canvas);tx.colorSpace=T.SRGBColorSpace;tx.magFilter=T.NearestFilter;tx.minFilter=T.NearestFilter;tx.generateMipmaps=false;
    tx.repeat.set(.5,.5);tx.offset.set(0,.5);textures.push(tx);walking[kind].map=tx;walking[kind].needsUpdate=true;
  }).catch(()=>console.warn('Animação indisponível; usando retrato do invasor.'));
  let lastWalk=0;
  function cageModel() {
    const cage=new T.Group();
    for(const y of [.1,2.8]) {box(cage,2.5,.12,2.5,0,y,0,trim);}
    for(let i=0;i<6;i++) {
      const p=-1.2+i*.48;
      for(const side of [-1.2,1.2]) {box(cage,.075,2.7,.075,p,1.45,side,metal);box(cage,.075,2.7,.075,side,1.45,p,metal);}
    }
    box(cage,.28,.35,.15,.22,1.4,1.3,gold);return cage;
  }
  const entranceCage=cageModel();root.add(entranceCage);
  const cells=new Map();
  const parade = new T.Group(); root.add(parade);
  box(parade, 3.2, .35, 2.7, 0, .17, 0, blue);
  box(parade, 3.4, .1, 2.9, 0, .4, 0, gold);
  box(parade, .1, 5.3, .1, -2.2, 2.65, -.8, gold);
  const flag = new T.Group(); flag.position.set(-2.15, 4.4, -.8); parade.add(flag);
  const flagPanels = [];
  for (let c = 0; c < 12; c++) {
    const panel = new T.Group(); panel.position.x = c * .22; flag.add(panel); flagPanels.push(panel);
    for (let r = 0; r < 13; r++)
      box(panel, .23, .115, .035, .11, -r * .115, 0, c < 5 && r < 7 ? blue : r % 2 ? white : red);
    if (c < 5) for (let r = 0; r < 4; r++)
      box(panel, .045, .045, .025, .1, -.07 - r * .19, .03, white);
  }
  const eagleMat = spriteMaterial(), eagleGeo = new T.PlaneGeometry(3.2, 3.2); geometries.push(eagleGeo);
  const eagle = mesh(parade, eagleGeo, eagleMat, 0, 4.7, 0);
  load('/eagle-voxel-v7.png', [eagleMat], 1);
  const aircraft = new T.Group(); root.add(aircraft);
  box(aircraft, 1.5, 1.25, 7, 0, 0, 0, metal);
  box(aircraft, 1.1, .85, 1.3, 0, 0, -4, trim);
  box(aircraft, 9, .2, 2.1, 0, -.1, -.2, metal);
  box(aircraft, 4, .16, 1.2, 0, .35, 2.8, metal);
  box(aircraft, .25, 1.65, 1.5, 0, .8, 2.7, trim);
  box(aircraft, 1.58, .3, 2.4, 0, .66, -.2, trim);
  const pilot = politician(1); pilot.scale.setScalar(.85); pilot.position.set(0, .3, -.6); aircraft.add(pilot);
  const propeller = new T.Group(); propeller.position.z = -4.75; aircraft.add(propeller);
  box(propeller, .16, 3, .16, 0, 0, 0, white); box(propeller, 3, .16, .16, 0, 0, 0, white);
  const launcher = new T.Group(); root.add(launcher);
  box(launcher, 12.5, .5, 4, 0, .25, 0, trim);
  const salvo = [-1.5,1.2,3.9].map(x=>{
    box(launcher,2.1,.22,2.1,x,.6,-.4,gold);
    const missile=missileModel();missile.scale.setScalar(2.2);launcher.add(missile);return missile;
  });
  kim.scale.setScalar(.72);
  const focus = new T.Vector3(), markers = new Map();
  const ringGeo = new T.RingGeometry(4.25, 4.7, 48), discGeo = new T.CircleGeometry(4.25, 48);
  const orbGeo = new T.OctahedronGeometry(.22); geometries.push(ringGeo, discGeo, orbGeo);
  const ringMat = new T.MeshBasicMaterial({ color: 0xff183f, side: T.DoubleSide, depthWrite: false });
  const discMat = new T.MeshBasicMaterial({ color: 0xff183f, transparent: true, opacity: .22, side: T.DoubleSide, depthWrite: false });
  materials.push(ringMat, discMat);
  const chargeMat = new T.MeshBasicMaterial({color:0xff304a,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false});materials.push(chargeMat);
  const chargeRing=mesh(root,ringGeo,chargeMat);chargeRing.rotation.x=-Math.PI/2;
  const shockwaves = new Map();
  function sync(camera, dt = 0) {
    const invasion = game.invasion, arrival = invasion.stage === 'arrival', active = invasion.stage === 'active';
    root.visible = ['playing', 'spectating', 'paused'].includes(game.phase); animation += dt;
    aircraft.visible = invasion.kind === 'putin' && arrival;
    trump.visible = invasion.kind === 'trump' && (arrival || active && invasion.actor.state !== 'spent');
    parade.visible = invasion.kind === 'trump' && arrival;
    kim.visible = invasion.kind === 'kim' && (arrival || active); launcher.visible = kim.visible;
    const t = 1 - invasion.intro / INVASION_INTRO;
    if(['trump','bukele'].includes(invasion.kind)&&game.phase!=='paused') {
      const a=invasion.actor,kind=invasion.kind,figure=(kind==='trump'?trump:bukele).userData.figure;
      const moving=active&&a.state==='hunting'&&a.walk!==lastWalk;
      if(moving&&walking[kind].map) {
        const frame=Math.floor(a.walk)%4;
        walking[kind].map.offset.set((frame%2)*.5,(1-Math.floor(frame/2))*.5);
        figure.material=walking[kind];
      } else figure.material=kind==='trump'?portraits[0]:bukeleMat;
      lastWalk=a.walk;
    }
    bukele.visible=invasion.kind==='bukele'&&(arrival||active);
    entranceCage.visible=invasion.kind==='bukele'&&arrival;
    if(bukele.visible) {
      const a=invasion.actor;
      bukele.position.set(a.x*2.7,0,a.z*2.7);
      bukele.rotation.y=Math.atan2(camera.position.x-bukele.position.x,camera.position.z-bukele.position.z);
      bukele.userData.figure.rotation.z=arrival?Math.sin(t*6)*.025:Math.sin(a.walk)*.035;
      bukele.position.y=arrival?0:Math.abs(Math.sin(a.walk))*.05;
      entranceCage.position.set(a.x*2.7+3,Math.max(0,1-t/.55)*7,a.z*2.7);
      focus.set(a.x*2.7+.8,1.65,a.z*2.7);
    }
    const cageIds=new Set(invasion.cages.map(c=>c.id));
    for(const [id,c] of cells)if(!cageIds.has(id)){root.remove(c);cells.delete(id);}
    for(const c of invasion.cages) {
      let model=cells.get(c.id);if(!model){model=cageModel();root.add(model);cells.set(c.id,model);}
      model.position.set(c.x*2.7,Math.max(0,c.time-5.75)*12,c.z*2.7);
    }
    const charging = active && invasion.kind === 'trump' && invasion.actor.state === 'charging';
    const heat = charging ? Math.min(1,invasion.actor.charge/TRUMP_CHARGE) : 0;
    portraits[0].color.setRGB(1,1-heat*.9,1-heat*.88);
    walking.trump.color.copy(portraits[0].color);
    chargeRing.visible=charging;
    if(charging) {
      chargeRing.position.set(invasion.actor.x*2.7,.08,invasion.actor.z*2.7);
      chargeRing.scale.setScalar(TRUMP_RADIUS*2.7/4.7);
      chargeMat.opacity=.35+heat*.55;
    }
    if (aircraft.visible) {
      aircraft.position.set(4 + t * 28, 13 + Math.sin(t * Math.PI) * 2.5, 18);
      aircraft.rotation.set(0, -Math.PI / 2, Math.sin(t * Math.PI * 2) * .08);
      propeller.rotation.z = t * 110;
      pilot.quaternion.copy(aircraft.quaternion).invert().multiply(camera.quaternion);
      focus.copy(aircraft.position); focus.y += .8;
    }
    if (trump.visible) {
      const a = invasion.actor;
      trump.position.set(a.x * 2.7, arrival ? .45 : charging ? 0 : Math.abs(Math.sin(a.walk)) * .05, a.z * 2.7);
      trump.rotation.y = Math.atan2(camera.position.x - trump.position.x, camera.position.z - trump.position.z);
      trump.userData.figure.rotation.z = charging ? 0 : Math.sin(arrival ? t * 12 : a.walk) * .035;
      trump.scale.setScalar(arrival ? 1 + Math.sin(t * Math.PI) * .06 : 1+heat*.12);
      if (arrival) {
        parade.position.set(a.x * 2.7, 0, a.z * 2.7);
        flagPanels.forEach((panel, i) => panel.position.z = Math.sin(t * 14 - i * .55) * .16);
        eagle.position.set(Math.cos(t * Math.PI * 2) * 2, 4.6 + Math.sin(t * 10) * .25, .7);
        eagle.quaternion.copy(camera.quaternion); eagle.rotation.z += Math.sin(t * 10) * .12;
        focus.set(trump.position.x - .5, 2.7, trump.position.z);
      }
    }
    if (kim.visible) {
      // Kim stays relaxed beside three giant missiles; launches are staggered.
      launcher.position.set(7 * 2.7, 3.65, -3);
      kim.position.set(7 * 2.7 - 4.8, 4.17 + Math.sin(animation * 2) * .015, -1.7);
      kim.rotation.y = Math.atan2(camera.position.x - kim.position.x, camera.position.z - kim.position.z);
      salvo.forEach((missile,i)=>{
        const launch = Math.max(0,(t-.4-i*.13)/.28);
        missile.visible=arrival && launch<1.7;
        missile.position.set(-1.5+i*2.7,.7+launch*launch*15,-.4-launch*launch*4);
        missile.rotation.z=-launch*.12;
        missile.userData.exhaust.visible=launch>0;
        missile.userData.exhaust.scale.y=1+Math.sin(t*90+i)*.12;
      });
      focus.set(7 * 2.7, 6.6, -2);
    }
    ringMat.color.setHex(invasion.kind === 'kim' ? 0xff8533 : 0xff183f);
    discMat.color.copy(ringMat.color); discMat.opacity = .16 + Math.abs(Math.sin(animation * 9)) * .14;
    const ids = new Set(invasion.targets.map(target => target.id));
    for (const [id, g] of markers) if (!ids.has(id)) { root.remove(g); markers.delete(id); }
    for (const target of invasion.targets) {
      let g = markers.get(target.id);
      if (!g) {
        g = new T.Group(); root.add(g); markers.set(target.id, g);
        mesh(g, discGeo, discMat, 0, .04, 0).rotation.x = -Math.PI / 2;
        mesh(g, ringGeo, ringMat, 0, .05, 0).rotation.x = -Math.PI / 2;
        const projectile = invasion.kind === 'kim' ? missileModel() : bombModel();
        g.add(projectile); g.userData.projectile = projectile;
        mesh(g, orbGeo, red, 0, .3, 0);
      }
      g.position.set(target.x * 2.7, 0, target.z * 2.7);
      const projectile=g.userData.projectile;
      projectile.visible=invasion.kind==='kim'||target.time<.8;
      if(invasion.kind==='kim') {
        const fraction=Math.max(0,target.time/(target.duration||2.8));
        projectile.position.set(fraction*8,1.8+fraction*fraction*28,fraction*-5);
        projectile.rotation.set(-.15,0,Math.PI+.28);
        projectile.userData.exhaust.scale.y=1.6+Math.sin(animation*35)*.2;
      } else projectile.position.y=Math.max(.6,target.time*17);
    }
    const alive = new Set(invasion.impacts.map(impact=>impact.id));
    for(const [id,wave] of shockwaves) if(!alive.has(id)){root.remove(wave);shockwaves.delete(id);}
    for(const impact of invasion.impacts) {
      let wave=shockwaves.get(impact.id);
      if(!wave){wave=mesh(root,ringGeo,chargeMat);wave.rotation.x=-Math.PI/2;shockwaves.set(impact.id,wave);}
      wave.position.set(impact.x*2.7,.15,impact.z*2.7);
      wave.scale.setScalar((1-impact.life/.6)*impact.radius*2.7/4.7);
    }
  }
  return { sync, aircraft, focus, dispose() { disposed = true; scene.remove(root); if (portraitUrl) URL.revokeObjectURL(portraitUrl); } };
}
