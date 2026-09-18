import * as T from '../vendor/three.module.js';
import {createSpecialView} from './special-view.js?v=20';
import {createGlobalSpecialView} from './global-special-view.js?v=20';
import {createArenaWorlds} from './arena-worlds.js?v=16';
import {prepareAttract,advanceAttract} from './attract.mjs?v=16';
import { createPixelAssets } from './pixel-assets.js?v=20';
import { createInvaderView } from './invaders-v7.js?v=18';
import { createSoundtrack } from './soundtrack.js?v=16';
import { arrivalCamera } from './cinematic.mjs?v=15';
import { createPickupFactory } from './pickups.js?v=20';
import { loadCharacterAtlas } from './characters.js?v=4';
import { Match, SIZE, cell, NAMES, advanceFrame, arenaRoll } from './core.mjs?v=20';
const TILE = 2.7,
  COLORS = [
    0xef4269, 0x79bc39, 0xe47b36, 0x9561de, 0x66b5ff, 0xe9b54d, 0xeded9d,
    0xff5848, 0x91b9e5,
  ];
export function createGame(canvas, onState, onError, isMultiplayer = false, socket = null, roomCode = null, playerIndex = 0) {
  let renderer;
  function _doStart(character, mode, seed = null, humans = null, characters = null) {
    if (seed !== null) game = new Match(seed);
    // Todos os clientes resetam com o personagem do host, senao a arena sorteada diverge.
    game.reset(character, mode);
    if (isMultiplayer) game.setNetworked({ remote: true });
    if (humans) for (const index of humans) game.claimFighter(index, characters?.[index]);
    for (const key of Object.keys(keys)) delete keys[key];
    held = false; drag = null; kick = 0; shake = 0; lastCountdown=-1;lastArenaTick=-1;lastArenaLocked=false;
    rebuild();
    initAudio(); soundtrack?.reset();
    lock();
    setTimeout(() => { if (!dead && game.phase === 'playing') game.speak(); }, 6500);
    emit();
  }
  // Entidade que ESTE cliente controla: o heroi local, ou o rival do seu indice na sala.
  // Rivais nascem sem pitch; sem esse default a camera recebe NaN e nada e desenhado.
  // Desliza cada boneco remoto ate o ultimo lugar informado pelo servidor.
  function smoothRemotes(dt) {
    const blend = 1 - Math.exp(-14 * dt);
    for (let i = 0; i < 9; i++) {
      const f = game.fighter(i);
      if (!f || i === playerIndex || !f.netTarget) continue;
      f.x += (f.netTarget.x - f.x) * blend;
      f.z += (f.netTarget.z - f.z) * blend;
      let delta = f.netTarget.yaw - f.yaw;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      f.yaw += delta * blend;
    }
  }
  function controlled() {
    const own = isMultiplayer && playerIndex > 0 ? game.enemies[playerIndex - 1] : null;
    if (!own) return game.player;
    if (typeof own.pitch !== 'number') own.pitch = 0;
    return own;
  }
  try {
    renderer = new T.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
  } catch {
    onError('Ative a aceleração gráfica do navegador para usar o 3D.');
    const matchApi = { syncSeed(seed) { game = new Match(seed); } };
  return { ...matchApi, destroy() {} };
  }
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color(0x101c30);
  scene.fog = new T.FogExp2(0x18283a, 0.009);
  const camera = new T.PerspectiveCamera(73, 1, 0.07, 150);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  let game = new Match();
  let dead = false,
    frame = 0,
    last = performance.now(),
    hudClock = 0,
    clock = 0,
    kick = 0,
    shake = 0,
    muted = false,
    drag = null,
    held = false;
  let sensitivity = 1,
    pausedPhase = 'playing',
    nextFuseBeep = 0,
    arcClock = 0;
  const keys = {},
    listeners = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const materials = [],
    geometries = [],
    textures = [],
    bodies = new Map(),
    bombs = new Map(),
    flames = new Map(),
    drops = new Map(),
    warnings = new Map(),
    crates = new Map(),
    chairs = new Map(),
    decoyBodies = new Map(),
    barricadeBodies = new Map(),
    particles = [];
  const staticRoot = new T.Group(),
    dynamic = new T.Group();
  scene.add(staticRoot, dynamic);
  const boxGeometry = new T.BoxGeometry(1, 1, 1),
    octGeometry = new T.OctahedronGeometry(1, 0);
  geometries.push(boxGeometry, octGeometry);
  const material = (color, emissive = 0, intensity = 0) => {
    const m = new T.MeshStandardMaterial({
      color,
      roughness: 0.83,
      metalness: 0.08,
      emissive,
      emissiveIntensity: intensity,
      flatShading: true,
    });
    materials.push(m);
    return m;
  };
  const mats = {
    floorA: material(0x465260),
    floorB: material(0x536170),
    wall: material(0x345470),
    trim: material(0x77929e),
    yellow: material(0xf8dc5a, 0xfcc42f, 0.3),
    pink: material(0xff4ca6, 0xff278e, 0.6),
    cyan: material(0x5ce6ef, 0x20cedd, 0.55),
    dark: material(0x151026),
    white: material(0xf9e7ca),
    skin: material(0xd99b71),
    bomb: material(0x171426),
    red: material(0xff3053, 0xff1c30, 1.5),
    fire: material(0xffa829, 0xff6611, 2),
    core: material(0xfff9a0, 0xffdb38, 2.5),
    wood: material(0xb27636),
    woodEdge: material(0x493422),
    woodLight: material(0xd09b51),
    steel: material(0xa1acac),
    grout: material(0x202a35),
    green: material(0x3b7656),
    pole: material(0x293c50),
    steak: material(0xd85d48, 0x7c1f27, 0.18),
    fat: material(0xffd9a2),
    occupation: material(0xc8263e, 0x7d1025, 0.25),
  };
  function box(root, w, h, d, x, y, z, mat) {
    const m = new T.Mesh(boxGeometry, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.castShadow = y > 0 && h > .1 && mat.emissiveIntensity <= .5;
    m.receiveShadow = true;
    root.add(m);
    return m;
  }
  function mesh(root, geo, mat, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  }
  const labelCache = new Map();
  function label(text, color = '#e0ff65', width = 7, height = 1) {
    const key=JSON.stringify([text,color,width,height]);
    const cached=labelCache.get(key);
    if(cached)return new T.Mesh(cached.geo,cached.mat);
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 80;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#211131';
    ctx.fillRect(0, 0, 512, 80);
    ctx.fillStyle = color;
    ctx.font = 'bold 45px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 42);
    const tx = new T.CanvasTexture(c);
    tx.magFilter = T.NearestFilter;
    tx.minFilter = T.NearestFilter;
    textures.push(tx);
    const mat = new T.MeshBasicMaterial({ map: tx });
    materials.push(mat);
    const geo = new T.PlaneGeometry(width, height);
    geometries.push(geo);
    labelCache.set(key,{geo,mat});
    return new T.Mesh(geo, mat);
  }
  scene.add(new T.HemisphereLight(0xc3ddfa, 0x293041, 1.7));
  const sun = new T.DirectionalLight(0xffdfad, 2.7);
  sun.position.set(8, 45, 10);
  sun.target.position.set(19,0,19);scene.add(sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-31,right:31,top:31,bottom:-31,near:1,far:85});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-.0003;sun.shadow.normalBias=.045;
  scene.add(sun);
  const blue = new T.DirectionalLight(0x75b6e8, .65);
  blue.position.set(-25, 10, -10);
  scene.add(blue);
  const flash = new T.PointLight(0xff8c22, 0, 22, 1.5);
  scene.add(flash);
  const center = 7 * TILE;
  function batchStatic(root) {
    root.updateMatrixWorld(true);
    const groups = new Map();
    root.traverse((m) => {
      if (
        m.isMesh &&
        (m.geometry === boxGeometry || m.geometry === octGeometry)
      ) {
        const key = m.geometry.uuid + m.material.uuid;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(m);
      }
    });
    for (const list of groups.values()) {
      if (list.length < 3) continue;
      const instance = new T.InstancedMesh(
        list[0].geometry,
        list[0].material,
        list.length,
      );
      list.forEach((m, i) => {
        instance.setMatrixAt(
          i,
          new T.Matrix4()
            .copy(root.matrixWorld)
            .invert()
            .multiply(m.matrixWorld),
        );
        m.parent.remove(m);
      });
      instance.instanceMatrix.needsUpdate = true;
      instance.castShadow=list.some(m=>m.castShadow);
      instance.receiveShadow=true;
      root.add(instance);
    }
  }
  function makeEnvironment() {
    for (let z = 0; z < SIZE; z++)
      for (let x = 0; x < SIZE; x++) {
        box(
          staticRoot,
          TILE - 0.035,
          0.18,
          TILE - 0.035,
          x * TILE,
          -0.12,
          z * TILE,
          mats.grout,
        );
        for(let a=0;a<2;a++)for(let b=0;b<2;b++) {
          const tile=box(staticRoot,1.28,.08,1.28,x*TILE+(a-.5)*1.34,-.03,z*TILE+(b-.5)*1.34,(x+z+a+b)%3?mats.floorA:mats.floorB);
          tile.castShadow=false;
        }
      }
    for (let i = 0; i < 4; i++) {
      const side = new T.Group();
      side.position.set(center, 0, center);
      side.rotation.y = (i * Math.PI) / 2;
      staticRoot.add(side);
      box(side, 43, 1.1, 1, 0, 2.1, -21, mats.pole);
      box(side, 42, 0.13, 0.2, 0, 2.65, -20.4, i % 2 ? mats.cyan : mats.pink);
      for (let p = -20; p <= 20; p += 4) {
        box(side, 0.32, 10, 0.32, p, 4.5, -21, mats.pole);
        box(side, 0.5, 0.16, 0.5, p, 7.3, -21, mats.yellow);
      }
      const sign = label(
        i % 2 ? 'PROMESSAS EXPLOSIVAS' : 'CIRCO DO CAOS',
        i % 2 ? '#54e8ee' : '#e0ff65',
        12,
        1.9,
      );
      sign.position.set(0, 5.4, -20.8);
      side.add(sign);
      for (let n = -19; n < 20; n += 2.1) {
        const bulb = mesh(
          side,
          octGeometry,
          n % 2 ? mats.pink : mats.yellow,
          n,
          7.5,
          -20.8,
        );
        bulb.scale.setScalar(0.16);
      }
    }
    // Low-poly striped circus canopy; these triangles are the playable world's roof.
    const roofColors = [
      material(0x6b255a),
      material(0x252048),
      material(0x9d3767),
      material(0x30284e),
    ];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2,
        b = ((i + 1) / 32) * Math.PI * 2;
      const geo = new T.BufferGeometry();
      geo.setAttribute(
        'position',
        new T.Float32BufferAttribute(
          [
            center,
            27,
            center,
            center + Math.cos(a) * 34,
            11,
            center + Math.sin(a) * 34,
            center + Math.cos(b) * 34,
            11,
            center + Math.sin(b) * 34,
          ],
          3,
        ),
      );
      geo.computeVertexNormals();
      geometries.push(geo);
      const mat = roofColors[i % 4];
      mat.side = T.DoubleSide;
      mesh(staticRoot, geo, mat);
    }
    for (let n = 0; n < 5; n++) {
      const z = n * 9.6 - 0.5;
      box(staticRoot, 40, 0.06, 0.06, center, 10, z, mats.pole);
      for (let x = 0; x < 40; x += 2) {
        const geo = new T.BufferGeometry();
        geo.setAttribute(
          'position',
          new T.Float32BufferAttribute(
            [x, 10, z, x + 1.2, 10, z, x + 0.6, 8.8, z],
            3,
          ),
        );
        geo.computeVertexNormals();
        geometries.push(geo);
        const mat = n % 2 ? mats.pink : mats.cyan;
        mat.side = T.DoubleSide;
        mesh(staticRoot, geo, mat);
      }
    }
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const balloon = mesh(
        staticRoot,
        octGeometry,
        [mats.pink, mats.cyan, mats.yellow][i % 3],
        center + Math.cos(a) * 25,
        6 + (i % 4),
        center + Math.sin(a) * 25,
      );
      balloon.scale.set(0.8, 1.1, 0.8);
      box(
        staticRoot,
        0.025,
        5,
        0.025,
        balloon.position.x,
        balloon.position.y - 3,
        balloon.position.z,
        mats.trim,
      );
    }
    const sign = label('✦  BOMBA  ✦', '#ff67b1', 9, 1.5);
    sign.position.set(center, 13, center - 12);
    staticRoot.add(sign);
  }
  makeEnvironment();
  batchStatic(staticRoot);
  const arenaWorlds=createArenaWorlds({scene,box,mesh,material,batchStatic,geometries,label});
  // Detailed full-body voxel sprites share one atlas in the 3D arena.
  // Alpha testing keeps silhouettes crisp and lets bombs remain visible through empty pixels.
  let characterAtlas = null;
  const characterMaterials = new Map();
  const decoyMaterials = new Map();
  const characterGeometry = new T.PlaneGeometry(2.7, 2.7);
  const characterShadowGeometry = new T.CircleGeometry(.66, 24);
  const characterRingGeometry = new T.RingGeometry(.67,.73,20);
  const propertyGeometry = new T.RingGeometry(2.18*TILE,2.35*TILE,48);
  const propertyMaterial = new T.MeshBasicMaterial({color:0xffd43b,transparent:true,opacity:.48,side:T.DoubleSide,depthWrite:false});
  const characterRingMaterials = COLORS.map(color=>material(color,color,.35));
  const characterShadowMaterial = new T.MeshBasicMaterial({color:0x090714,transparent:true,opacity:.3,depthWrite:false});
  geometries.push(characterGeometry,characterShadowGeometry,characterRingGeometry,propertyGeometry);materials.push(characterShadowMaterial,propertyMaterial);
  const propertyRing=mesh(dynamic,propertyGeometry,propertyMaterial);propertyRing.rotation.x=-Math.PI/2;propertyRing.position.y=.06;propertyRing.visible=false;
  loadCharacterAtlas().then(canvas=>{
    if(dead)return;
    const tx=new T.CanvasTexture(canvas);
    tx.colorSpace=T.SRGBColorSpace;tx.magFilter=T.NearestFilter;tx.minFilter=T.NearestFilter;
    tx.generateMipmaps=false;characterAtlas=tx;textures.push(tx);
    for(const e of game.enemies)if(bodies.has(e.id))addCharacterSprite(bodies.get(e.id),e.skin);
  }).catch(()=>onError('Os personagens não carregaram. Recarregue a página.'));
  function addCharacterSprite(root,skin){
    if(!characterAtlas||root.userData.character)return;
    let mat=characterMaterials.get(skin);
    if(!mat){const tx=characterAtlas.clone();const [top,height]=[[0,425],[425,430],[855,399]][Math.floor(skin/3)];tx.repeat.set(1/3,height/1254);tx.offset.set((skin%3)/3,1-(top+height)/1254);tx.needsUpdate=true;textures.push(tx);
      mat=new T.MeshBasicMaterial({map:tx,transparent:true,alphaTest:.12,depthWrite:true,side:T.DoubleSide});materials.push(mat);characterMaterials.set(skin,mat);}
    const figure=mesh(root,characterGeometry,mat,0,1.22,0);
    root.userData.character=figure;
  }
  function makeEnemy(e){
    const root=new T.Group();dynamic.add(root);addCharacterSprite(root,e.skin);
    const shadow=mesh(root,characterShadowGeometry,characterShadowMaterial,0,.025,0);shadow.rotation.x=-Math.PI/2;
    const ring=mesh(root,characterRingGeometry,characterRingMaterials[e.skin],0,.035,0);ring.rotation.x=-Math.PI/2;
    const ally=game.sameTeam(e,game.player);
    const name=label((game.teamMode?(ally?'ALIADO · ':'RIVAL · '):'')+NAMES[e.skin].toUpperCase(),game.teamMode?(ally?'#82e9ff':'#ff8e72'):'#fff0ce',game.teamMode?2.5:1.8,.25);name.position.y=2.68;root.add(name);root.userData.name=name;
    const health = new T.Group(); health.position.y = 2.93; root.add(health);
    for(let i=0;i<3;i++) box(health,.2,.055,.035,(i-1)*.26,0,0,mats.red);
    root.userData.health=health;
    const sleep=label('Z Z Z','#ffdc7a',1.1,.38);sleep.position.y=1.55;sleep.visible=false;root.add(sleep);root.userData.sleep=sleep;
    const gaze=label('OLHOU! E','#96ffce',1.6,.3);gaze.position.y=3.25;gaze.visible=false;root.add(gaze);root.userData.gaze=gaze;
    const arrow=new T.Group();root.add(arrow);root.userData.facing=arrow;
    const marker=box(arrow,.15,.04,.7,0,.05,-.96,mats.cyan);
    box(arrow,.43,.04,.16,0,.05,-1.25,mats.cyan);marker.renderOrder=1;
    bodies.set(e.id,root);
  }
  function makeDecoy(e) {
    const root = new T.Group();dynamic.add(root);
    addCharacterSprite(root,e.skin);
    if(root.userData.character){
      const original=root.userData.character.material;
      let ghost=decoyMaterials.get(e.skin);
      if(!ghost){ghost=original.clone();ghost.opacity=.42;ghost.transparent=true;ghost.depthWrite=false;materials.push(ghost);decoyMaterials.set(e.skin,ghost);}
      root.userData.character.material=ghost;
    }
    const ring=mesh(root,characterRingGeometry,mats.cyan,0,.035,0);ring.rotation.x=-Math.PI/2;
    decoyBodies.set(e.id,root);
  }
  function chairModel() {
    const root=new T.Group();
    const sprite=pixelAsset('chair',1.9);sprite.position.y=.9;root.add(sprite);
    return root;
  }
  function makeBarricade(e) {
    const root=new T.Group();root.position.set(e.x*TILE,0,e.z*TILE);dynamic.add(root);
    box(root,2.3,1.42,2.3,0,.71,0,mats.occupation);
    box(root,2.42,.16,2.42,0,1.42,0,mats.yellow);
    const sign=label('OCUPADO','#fff0ce',1.75,.34);sign.position.set(0,1.02,1.18);root.add(sign);
    const flag=pixelAsset('flag',1.5);flag.position.set(.7,2.2,0);root.add(flag);root.userData.flag=flag;
    barricadeBodies.set(e.id,root);
  }
  function makeCrate(x, z) {
    const g = new T.Group();
    g.position.set(x * TILE, 0, z * TILE);
    dynamic.add(g);
    box(g, 2.27, 2.1, 2.27, 0, 1.05, 0, mats.woodEdge);
    for(let row=0;row<4;row++) {
      const plank=row%2?mats.wood:mats.woodLight,y=.27+row*.51;
      box(g,2.27,.47,2.31,0,y,0,plank);
      box(g,2.31,.47,2.27,0,y,0,plank);
    }
    for(const side of [-1,1])for(const xPos of [-.82,.82]) {
      box(g,.2,2.16,.075,xPos,1.08,side*1.2,mats.steel);
      box(g,.11,.11,.095,xPos,1.85,side*1.22,mats.dark);
      box(g,.11,.11,.095,xPos,.28,side*1.22,mats.dark);
    }
    for (const y of [0.22, 1, 1.86]) {
      box(g, 2.36, 0.13, 2.36, 0, y, 0, mats.woodEdge);
    }
    box(g, 0.17, 2.1, 2.38, -0.82, 1.05, 0, mats.woodEdge);
    box(g, 0.17, 2.1, 2.38, 0.82, 1.05, 0, mats.woodEdge);
    const a = label('?', '#ffc578', 0.95, 0.5);
    a.position.set(0, 1.15, 1.2);
    g.add(a);
    crates.set(cell(x, z), g);
  }
  const walls = new T.Group();
  const crateBatch = new T.Group();
  scene.add(walls,crateBatch);
  function batchCrates() {
    const groups=new Map();
    for(const g of crates.values()) {
      g.updateMatrixWorld(true);g.userData.instanceSlots=[];
      g.traverse(m=>{
        if(!m.isMesh)return;
        const key=m.geometry.uuid+m.material.uuid;
        if(!groups.has(key))groups.set(key,[]);
        groups.get(key).push({m,g});
      });
    }
    for(const list of groups.values()) {
      const instance=new T.InstancedMesh(list[0].m.geometry,list[0].m.material,list.length);
      instance.castShadow=list.some(({m})=>m.castShadow);instance.receiveShadow=true;
      list.forEach(({m,g},index)=>{
        instance.setMatrixAt(index,m.matrixWorld);
        g.userData.instanceSlots.push({instance,index});m.parent.remove(m);
      });
      instance.instanceMatrix.needsUpdate=true;crateBatch.add(instance);
    }
  }
  const hiddenInstance=new T.Matrix4().makeScale(0,0,0);
  function releaseObject(object) {
    if(!object)return;
    object.parent?.remove(object);
    for(const {instance,index} of object.userData.instanceSlots||[]) {
      instance.setMatrixAt(index,hiddenInstance);instance.instanceMatrix.needsUpdate=true;
    }
    object.traverse(m=>{if(m.isInstancedMesh)m.dispose();});
    const counter=object.userData.counter;
    if(counter) {
      counter.tx.dispose();const ti=textures.indexOf(counter.tx);if(ti>=0)textures.splice(ti,1);
      counter.mat.dispose();const mi=materials.indexOf(counter.mat);if(mi>=0)materials.splice(mi,1);
    }
  }
  function clearMap(map) {
    for (const m of map.values()) releaseObject(m);
    map.clear();
  }
  function rebuild() {
    const kind=game.arena.id;
    staticRoot.visible=kind==='circo';
    for(const [id,root] of Object.entries(arenaWorlds))root.visible=id===kind;
    const theme=kind==='favela'?{sky:0x71bacd,fog:0x9cc5c4,wall:0xb96643,trim:0xb19a79,green:0x528e86}:kind==='planalto'?{sky:0x5aa9d9,fog:0xb7d4db,wall:0xd1d8cc,trim:0xf3ebd4,green:0x619877}:{sky:0x101c30,fog:0x18283a,wall:0x345470,trim:0x77929e,green:0x3b7656};
    scene.background.setHex(theme.sky);scene.fog.color.setHex(theme.fog);
    scene.fog.density=kind==='circo'?.009:.003;
    mats.wall.color.setHex(theme.wall);mats.trim.color.setHex(theme.trim);mats.green.color.setHex(theme.green);
    sun.color.setHex(kind==='favela'?0xffce9a:kind==='planalto'?0xf1faff:0xffdfad);
    for (const maps of [bodies, bombs, flames, drops, warnings, crates, chairs, decoyBodies, barricadeBodies])
      clearMap(maps);
    while(crateBatch.children.length)releaseObject(crateBatch.children[0]);
    while(walls.children.length)releaseObject(walls.children[0]);
    for (const p of particles) p.mesh.parent?.remove(p.mesh);
    particles.length = 0;
    for (let z = 0; z < SIZE; z++)
      for (let x = 0; x < SIZE; x++) {
        if (game.map[z][x] === 1) {
          const h = x === 0 || z === 0 || x === 14 || z === 14 ? 3.6 : 2.65;
          const blockColor=(x+z)%4===0?mats.green:mats.wall;
          box(walls, 2.54, h, 2.54, x * TILE, h / 2, z * TILE, blockColor);
          box(walls,2.6,.18,2.6,x*TILE,.12,z*TILE,mats.dark);
          box(walls, 2.59, 0.2, 2.59, x * TILE, h - 0.12, z * TILE, mats.trim);
          for(let y=.88;y<h-.25;y+=.88)box(walls,2.555,.045,2.555,x*TILE,y,z*TILE,mats.grout);
          for(const side of [-1,1]) {
            box(walls,.045,h-.32,.035,x*TILE+.46,h/2,z*TILE+side*1.28,mats.grout);
            box(walls,.035,h-.32,.045,x*TILE+side*1.28,h/2,z*TILE-.46,mats.grout);
          }
          if (x % 4 === 0 && z % 4 === 0) {
            box(
              walls,
              2.62,
              0.07,
              2.62,
              x * TILE,
              h + 0.01,
              z * TILE,
              mats.cyan,
            );
          }
        } else if (game.map[z][x] === 2) makeCrate(x, z);
      }
    for (const e of game.enemies) makeEnemy(e);
    batchStatic(walls);
    batchCrates();
  }
  const bombGeometry = new T.SphereGeometry(0.55, 10, 8);
  geometries.push(bombGeometry);
  function bombModel(withCounter = false) {
    const root = new T.Group();
    const shell=mesh(root, bombGeometry, mats.bomb);shell.castShadow=true;
    box(root,.18,.14,.06,-.2,.3,.43,mats.steel);
    box(root,.08,.22,.05,-.32,.15,.43,mats.trim);
    box(root, 0.22, 0.25, 0.22, 0, 0.58, 0, mats.trim);
    box(root, 0.07, 0.23, 0.07, 0.07, 0.78, 0, mats.yellow);
    const spark = mesh(root, octGeometry, mats.core, 0.07, 0.95, 0);
    spark.scale.setScalar(0.11);
    root.userData.spark = spark;
    const stripe = mesh(root, octGeometry, mats.red, 0, 0.05, 0.54);
    stripe.scale.set(0.15, 0.15, 0.04);
    if (withCounter) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 64;
      const tx = new T.CanvasTexture(c);
      tx.magFilter = T.NearestFilter;
      textures.push(tx);
      const mat = new T.SpriteMaterial({ map: tx, depthTest: false });
      materials.push(mat);
      const badge = new T.Sprite(mat);
      badge.position.y = 1.3;
      badge.scale.set(1.25, 0.625, 1);
      root.add(badge);
      root.userData.counter = { c, tx, mat, last: '' };
    }
    return root;
  }
  function updateCounter(g, fuse) {
    const d = g.userData.counter;
    if (!d) return;
    const value = Math.max(0, fuse).toFixed(1);
    if (value === d.last) return;
    d.last = value;
    const ctx = d.c.getContext('2d');
    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = fuse < 1 ? '#ff3454' : '#181124dd';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = fuse < 1 ? '#ffffff' : '#d8ff48';
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(value, 64, 46);
    d.tx.needsUpdate = true;
  }
  const aimRoot = new T.Group();
  scene.add(aimRoot);
  aimRoot.visible = false;
  const aimGeometry = new T.BufferGeometry();
  aimGeometry.setAttribute(
    'position',
    new T.BufferAttribute(new Float32Array(512 * 3), 3),
  );
  geometries.push(aimGeometry);
  const aimMaterial = new T.LineBasicMaterial({
    color: 0xd8ff48,
    transparent: true,
    opacity: 0.9,
    depthTest: true,
  });
  materials.push(aimMaterial);
  const aimLine = new T.Line(aimGeometry, aimMaterial);
  aimLine.frustumCulled = false;
  aimRoot.add(aimLine);
  const aimArrow = new T.ArrowHelper(
    new T.Vector3(0, -1, 0),
    new T.Vector3(),
    0.9,
    0xd8ff48,
    0.6,
    0.35,
  );
  aimRoot.add(aimArrow);
  const aimGeo = new T.RingGeometry(0.32, 0.48, 24);
  geometries.push(aimGeo);
  const targetMat = new T.MeshBasicMaterial({
    color: 0xd8ff48,
    side: T.DoubleSide,
  });
  materials.push(targetMat);
  const aimTarget = mesh(aimRoot, aimGeo, targetMat);
  aimTarget.rotation.x = -Math.PI / 2;
  function updateAim(dt) {
    aimRoot.visible = game.phase === 'playing' && game.invasion.stage !== 'arrival' && !!controlled().heldBomb;
    if (!aimRoot.visible) return;
    arcClock += dt;
    if (arcClock < 1 / 60) return;
    arcClock = 0;
    const prediction = game.trajectory(controlled());
    if (!prediction) return;
    const points = prediction.points,
      pos = aimGeometry.attributes.position;
    for (let i = 0; i < points.length; i++)
      pos.setXYZ(i, points[i].x * TILE, points[i].y * TILE, points[i].z * TILE);
    aimGeometry.setDrawRange(0, points.length);
    pos.needsUpdate = true;
    const end = points[points.length - 1],
      prev = points[Math.max(0, points.length - 3)];
    const direction = new T.Vector3(
      end.x - prev.x,
      end.y - prev.y,
      end.z - prev.z,
    );
    if (direction.lengthSq() < 0.00001) direction.set(0, -1, 0);
    direction.normalize();
    aimArrow.position.set(end.x * TILE, end.y * TILE, end.z * TILE);
    aimArrow.setDirection(direction);
    const color = game.heldBomb.fuse < 1 ? 0xff4265 : 0xd8ff48;
    aimArrow.setColor(color);
    aimMaterial.color.setHex(color);
    targetMat.color.setHex(color);
    aimTarget.position.set(end.x * TILE, end.y * TILE - 0.45, end.z * TILE);
  }
  const hand = new T.Group();
  const pixelAsset=createPixelAssets({geometries,materials,textures});
  const equippedSword=pixelAsset('sword',.58);equippedSword.position.set(.33,-.22,-.68);hand.add(equippedSword);
  const equippedChair=pixelAsset('chair',.72);equippedChair.position.set(.32,-.13,-.82);hand.add(equippedChair);
  for(const sprite of [equippedSword,equippedChair]) {
    sprite.material=sprite.material.clone();materials.push(sprite.material);sprite.material.depthTest=false;sprite.material.depthWrite=false;sprite.renderOrder=100;
  }
  equippedSword.scale.setScalar(.7);equippedChair.scale.setScalar(.86);
  const specialView=createSpecialView({camera,scene,game,box,mesh,geometries,materials,textures,viewer:()=>controlled()});
  camera.add(hand);
  box(hand, 0.24, 0.35, 0.31, 0.34, -0.4, -0.55, mats.skin);
  box(hand, 0.28, 0.46, 0.34, 0.39, -0.67, -0.48, mats.dark);
  const heldBomb = bombModel();
  heldBomb.position.set(0.35, -0.16, -0.74);
  heldBomb.scale.setScalar(0.44);
  hand.add(heldBomb);
  hand.visible = false;
  prepareAttract(game);
  rebuild();
  function burst(x, y, z, n = 25, palette = [mats.fire, mats.core, mats.pink]) {
    for (let i = 0; i < n && particles.length < 280; i++) {
      const m = mesh(
        dynamic,
        boxGeometry,
        palette[i % palette.length],
        x,
        y,
        z,
      );
      m.scale.setScalar(0.08 + Math.random() * 0.2);
      particles.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * 8 + 2,
        vz: (Math.random() - 0.5) * 10,
        life: 0.5 + Math.random() * 0.6,
        max: 1.1,
      });
    }
  }
  let audio = null,
    master = null,
    soundtrack = null,
    lastCountdown = -1;
  let lastArenaTick=-1,lastArenaLocked=false;
  function initAudio() {
    if (!audio) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      audio = new A();
      master = audio.createGain();
      master.gain.value = muted ? 0 : 0.32;
      const compressor=audio.createDynamicsCompressor();
      compressor.threshold.value=-16;compressor.knee.value=20;compressor.ratio.value=5;
      compressor.attack.value=.003;compressor.release.value=.2;
      master.connect(compressor);compressor.connect(audio.destination);
      soundtrack=createSoundtrack(audio,master);
    }
    audio.resume().catch(() => {});
  }
  function tone(
    freq,
    duration = 0.1,
    type = 'square',
    gain = 0.15,
    at = 0,
    end,
    pan = 0,
  ) {
    if (!audio || muted) return;
    const o = audio.createOscillator(),
      g = audio.createGain(),
      t = audio.currentTime + at;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (end) o.frequency.exponentialRampToValueAtTime(end, t + duration);
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + .006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    const stereo=audio.createStereoPanner();stereo.pan.value=pan;
    g.connect(stereo);stereo.connect(master);
    o.onended=()=>{o.disconnect();g.disconnect();stereo.disconnect();};
    o.start(t);
    o.stop(t + duration);
  }
  function noise(duration = 0.3, level = 1, pan = 0) {
    if (!audio || muted) return;
    const buffer = audio.createBuffer(
        1,
        Math.ceil(audio.sampleRate * duration),
        audio.sampleRate,
      ),
      d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = audio.createBufferSource(),
      g = audio.createGain(),
      filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;
    src.buffer = buffer;
    g.gain.value = 0.6 * level;
    src.connect(filter);
    filter.connect(g);
    const stereo=audio.createStereoPanner();stereo.pan.value=pan;
    g.connect(stereo);stereo.connect(master);
    src.onended=()=>{src.disconnect();filter.disconnect();g.disconnect();stereo.disconnect();};
    src.start();
  }
  function speak(text) {
    soundtrack?.duck(2.5);
    if (muted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    u.rate = 1.08;
    u.pitch = 1;
    u.volume = 0.8;
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang === 'pt-BR');
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }
  function events() {
    for (const e of game.events.splice(0)) {
      if (e.type === 'reset') continue;
      if (e.type === 'invasion-warning' || e.type === 'invasion-beep') {
        soundtrack?.duck(.8);
        tone(420,.42,'sawtooth',.2,0,980);
        tone(980,.4,'sawtooth',.18,.42,420);
      }
      if (e.type === 'invasion-enter') {
        tone(90,1.4,'sawtooth',.27,0,e.kind==='putin'?360:40);
        game.player.vx=0;game.player.vz=0;
        if(e.kind==='trump') {
          burst(13*TILE,3,7*TILE,45,[mats.red,mats.cyan,mats.white]);
          [392,523,659,784].forEach((note,i)=>tone(note,.25,'triangle',.18,i*.18));
        }
      }
      if(e.type==='cage-slam'){noise(.12,.23);tone(140,.19,'square',.15,0,65);}
      if(e.type==='invader-speech'){soundtrack?.duck(3);speak(e.text);}
      if(e.type==='invasion-target') {
        if(e.kind==='kim') { tone(220,.9,'sawtooth',.13,0,1400);noise(.22,.2); }
        tone(1300,.1,'sine',e.player ? .2 : .08);tone(1500,.1,'sine',e.player ? .2 : .08,.25);
      }
      if(e.type==='missile-launch') { soundtrack?.duck(.6);tone(80,.7,'sawtooth',.2,0,480);noise(.4,.35); }
      if(e.type==='cage-capture') {tone(180,.25,'square',e.player?.22:.08,0,70);noise(.12,.18);}
      if(e.type==='cage-release'&&e.player) {[520,780].forEach((n,i)=>tone(n,.16,'triangle',.15,i*.12));}
      if(e.type==='hypnosis'){[880,1108,1318,1760].forEach((n,i)=>tone(n,.18,'sine',.12,i*.08));burst(e.x*TILE,1.6,e.z*TILE,22,[mats.cyan,mats.yellow]);}
      if(e.type==='book-miss')tone(200,.12,'triangle',.08,0,130);
      if(e.type==='remote-trigger'){tone(1200,.08,'square',.1);tone(1600,.08,'square',.1,.1);}
      if(e.type==='flag-plant'){noise(.15,.13);tone(210,.3,'triangle',.15,0,430);}
      if(e.type==='vampire-bite'){tone(180,.35,'sawtooth',.1,0,600);noise(.18,.07);}
      if(e.type==='vampire-transform'){tone(140,.8,'triangle',.13,0,720);}
      if(e.type==='vampire-dive'){tone(900,.65,'sine',.12,0,110);}
      if(e.type==='poison-speech'){window.speechSynthesis?.cancel();speak('Não vai ter vacina!');tone(220,.15,'square',.08);}
      if(e.type==='poison-release'){noise(.9,.1);tone(110,.9,'triangle',.08);}
      if(e.type==='antidote'){tone(780,.15,'sine',.09,0,1100);}
      if(e.type==='alligator'){[260,520,390].forEach((n,i)=>tone(n,.15,'square',.1,i*.13));burst(e.x*TILE,1.3,e.z*TILE,20,[mats.cyan,mats.yellow]);}
      if(e.type==='motor-boost'){tone(90,.55,'sawtooth',.13,0,280);}
      if(e.type==='sword-hit') {noise(.07,.16);tone(1300,.1,'triangle',.15,0,320);}
      if(e.type==='sword-swing') {noise(.065,.055);}
      if(e.type==='trump-charge') {soundtrack?.duck(2.4);tone(200,.3,'triangle',.2,0,400);}
      if(e.type==='trump-beep') {
        const distance=Math.hypot(e.x-game.player.x,e.z-game.player.z);
        tone(500+e.charge*1100,.075,'sine',.28/(1+distance*.3));
      }
      if(e.type==='invasion-exit') tone(650,.8,'triangle',.18,0,160);
      if (e.type === 'pin') {
        tone(1400, 0.07, 'triangle', 0.14);
        nextFuseBeep = 0;
      }
      if (e.type === 'spectate') {
        unlock();
        held = false;
      }
      if (e.type === 'throw') {
        kick = 0.4;
        tone(440, 0.16, 'triangle', 0.3, 0, 140);
      }
      if (e.type === 'explode') {
        burst(e.x * TILE, (e.y || 0.23) * TILE, e.z * TILE, 30);
        const distance = Math.hypot(e.x-game.player.x,e.z-game.player.z);
        shake = Math.max(shake, reduced ? 0 : .07 * Math.max(0,1-distance/6));
        flash.position.set(e.x * TILE, 2, e.z * TILE);
        flash.intensity = 35;
        const level=(game.phase==='menu'?.12:1)/(1+distance*.2);
        const pan=Math.max(-.85,Math.min(.85,((e.x-game.player.x)*Math.cos(game.player.yaw)-(e.z-game.player.z)*Math.sin(game.player.yaw))/8));
        if(game.phase!=='menu')soundtrack?.duck(.4);
        noise(e.style==='missile' ? .5 : .34,level,pan);
        tone(e.style==='missile'?115:85,.4,'sine',.7*level,0,25,pan);
      }
      if (e.type === 'crate') {
        const key = cell(e.x, e.z);
        releaseObject(crates.get(key));
        crates.delete(key);
        burst(e.x * TILE, 1, e.z * TILE, 12, [
          mats.wood,
          mats.yellow,
          mats.pink,
        ]);
      }
      if (e.type === 'defeat') {
        const body = bodies.get(e.id);
        if (body) {
          dynamic.remove(body);
          bodies.delete(e.id);
        }
        burst(e.x * TILE, 1.4, e.z * TILE, 45, [
          mats.cyan,
          mats.pink,
          mats.yellow,
        ]);
        tone(520, 0.16, 'square', 0.1);
        tone(780, 0.2, 'square', 0.1, 0.1);
      }
      if (e.type === 'hit') {
        burst(e.x * TILE, 1.4, e.z * TILE, 8, [mats.white, mats.pink]);
        if(e.credited) tone(e.lethal?1100:820,.1,'triangle',.22,0,e.lethal?1500:1200);
      }
      if (e.type === 'hurt') {
        shake = reduced ? 0 : 0.24;
        tone(180, 0.4, 'sawtooth', 0.23, 0, 50);
      }
      if(e.type==='shield-block') tone(1400,.15,'sine',.15,0,450);
      if(e.type==='picanha-block') {
        burst(game.player.x*TILE,1.2,game.player.z*TILE,12,[mats.steak,mats.fat,mats.yellow]);
        tone(980,.16,'square',.17,0,420);
      }
      if(e.type==='wind-release') {
        burst(e.x*TILE,1.2,e.z*TILE,24,[mats.cyan,mats.white]);
        tone(240,.7,'sine',.2,0,1200);
      }
      if(e.type==='vampire-revive') {
        burst(e.x*TILE,1.4,e.z*TILE,48,[mats.dark,mats.pink,mats.red]);
        tone(90,.8,'sawtooth',.24,0,620);
      }
      if(e.type==='ram-hit') { shake=reduced?0:.1;tone(115,.22,'square',.2,0,55); }
      if(e.type==='chair-bounce') tone(310,.12,'square',.14,0,170);
      if(e.type==='chair-bomb') tone(760,.18,'triangle',.18,0,320);
      if(e.type==='chair-hit') { shake=reduced?0:.18;burst(e.x*TILE,1.2,e.z*TILE,18,[mats.wood,mats.steel,mats.yellow]);tone(125,.35,'square',.28,0,45); }
      if (e.type === 'pickup') {
        tone(440, 0.1, 'square', 0.13);
        tone(660, 0.12, 'square', 0.13, 0.08);
        tone(880, 0.15, 'square', 0.13, 0.17);
      }
      if (e.type === 'special') {
        if(game.character===0){tone(330,.3,'triangle',.2,0,660);tone(880,.2,'sine',.16,.1);}
        else if(game.character===6){noise(.12,.1);tone(1500,.2,'triangle',.18,0,650);}
        else if(game.character===8){tone(230,.14,'square',.17);tone(460,.1,'triangle',.14,.08);}
        else if(game.character===4){tone(640,.18,'sine',.12);tone(960,.2,'sine',.1,.12);}
        else if(game.character===2){noise(.22,.09);tone(380,.4,'sine',.12,0,720);}
        else if(game.character===3){tone(160,.5,'triangle',.13,0,80);}
        else if(game.character===5){tone(700,.07,'square',.09);tone(1000,.1,'square',.1,.1);}
        else tone(180, 0.6, 'sawtooth', 0.12, 0, 900);
      }
      if(e.type==='chair-throw'){kick=.2;noise(.18,.12);tone(280,.22,'triangle',.18,0,90);}
      if (e.type === 'voice') speak(e.text);
      if (e.type === 'storm') {
        tone(220, 0.35, 'square', 0.1);
        tone(180, 0.35, 'square', 0.1, 0.4);
      }
      if (e.type === 'end') {
        unlock();
        held = false;
        if (e.won) {
          [392, 523, 659, 784].forEach((f, i) =>
            tone(f, 0.4, 'square', 0.14, i * 0.15),
          );
        } else tone(180, 1, 'triangle', 0.25, 0, 45);
      }
    }
  }
  function syncWorld(dt) {
    for (const e of game.enemies) {
      const g = bodies.get(e.id);
      if (!g) continue;
      if(e.hp<=0){dynamic.remove(g);bodies.delete(e.id);continue;}
      g.position.set(e.x*TILE,0,e.z*TILE);
      const figure=g.userData.character;if(figure){const asleep=e.stun>0&&e.stunKind==='hypnosis';figure.position.y=asleep?.45:1.22+Math.abs(Math.sin(e.walk))*.035;figure.rotation.z=asleep?-1.4:Math.sin(e.walk)*.018;figure.scale.y=1-Math.abs(Math.sin(e.walk))*.012;if(e.alligator){const mat=globalSpecialView.alligatorMaterial(e.walk);if(mat)figure.material=mat;}}
      g.userData.sleep.visible=e.stun>0;g.userData.sleep.position.x=reduced?0:Math.sin(clock*4)*.2;
      g.userData.gaze.visible=game.hypnosisTarget()===e;
      g.userData.facing.visible=controlled().bookTime>0&&!(e.stun>0);
      g.rotation.y = Math.atan2(camera.position.x/TILE - e.x, camera.position.z/TILE - e.z);
      g.userData.facing.rotation.y=(e.yaw||0)-g.rotation.y;
      g.visible = e.invulnerable <= 0 || Math.sin(clock * 30) > 0;
      g.userData.health.children.forEach((pip,i)=>{pip.visible=i<e.hp;pip.scale.x=Math.max(0,Math.min(1,e.hp-i));});
    }
    const activeDecoys=new Set(game.decoys.map(e=>e.id));
    for(const [id,g] of decoyBodies)if(!activeDecoys.has(id)){releaseObject(g);decoyBodies.delete(id);}
    for(const e of game.decoys){
      let g=decoyBodies.get(e.id);if(!g){makeDecoy(e);g=decoyBodies.get(e.id);}
      g.position.set(e.x*TILE,0,e.z*TILE);g.rotation.y=Math.atan2(camera.position.x/TILE-e.x,camera.position.z/TILE-e.z);
      g.visible=Math.sin(clock*13+e.id)>-.35;
    }
    const activeChairs=new Set(game.chairs.map(e=>e.id));
    for(const [id,g] of chairs)if(!activeChairs.has(id)){releaseObject(g);chairs.delete(id);}
    for(const e of game.chairs){
      let g=chairs.get(e.id);if(!g){g=chairModel();dynamic.add(g);chairs.set(e.id,g);}
      g.position.set(e.x*TILE,.2+Math.sin(Math.max(0,2-e.time)*Math.PI/2)*1.2,e.z*TILE);g.rotation.y=Math.atan2(camera.position.x-g.position.x,camera.position.z-g.position.z);g.rotation.z+=dt*5;
    }
    const activeBarricades=new Set(game.barricades.map(e=>e.id));
    for(const [id,g] of barricadeBodies)if(!activeBarricades.has(id)){releaseObject(g);barricadeBodies.delete(id);}
    for(const e of game.barricades){if(!barricadeBodies.has(e.id))makeBarricade(e);const g=barricadeBodies.get(e.id);g.scale.y=reduced?1:Math.min(1,(8-e.time)*4+.05);g.userData.flag.rotation.y=Math.atan2(camera.position.x-g.position.x,camera.position.z-g.position.z);}
    propertyRing.visible=!!game.property;
    if(game.property){propertyRing.position.x=game.property.x*TILE;propertyRing.position.z=game.property.z*TILE;propertyMaterial.opacity=.3+Math.sin(clock*7)*.14;}
    const active = new Set(game.bombs.map((b) => b.id));
    for (const [id, g] of bombs)
      if (!active.has(id)) {
        releaseObject(g);
        bombs.delete(id);
      }
    for (const b of game.bombs) {
      let g = bombs.get(b.id);
      if (!g) {
        g = bombModel(true);
        dynamic.add(g);
        bombs.set(b.id, g);
      }
      g.position.set(b.x * TILE, (b.y ?? 0.23) * TILE, b.z * TILE);
      updateCounter(g, b.fuse);
      if (b.moving) g.children[0].rotation.z += dt * 3;
      const pulse = 1 + Math.sin(clock * (b.fuse < 1 ? 28 : 12)) * 0.055;
      g.scale.setScalar(pulse);
      g.userData.spark.scale.setScalar(0.1 + Math.random() * 0.08);
    }
    const alive = new Set(game.fires.map((f) => f.id));
    for (const [id, g] of flames)
      if (!alive.has(id)) {
        dynamic.remove(g);
        flames.delete(id);
      }
    for (const f of game.fires) {
      let g = flames.get(f.id);
      if (!g) {
        g = new T.Group();
        dynamic.add(g);
        box(g, 2.3, 0.25, 2.3, 0, 0.12, 0, mats.fire);
        for (let n = 0; n < 3; n++) {
          const m = mesh(
            g,
            octGeometry,
            n === 1 ? mats.core : mats.fire,
            (n - 1) * 0.55,
            0.6,
            0,
          );
          m.scale.set(0.48, 1.2, 0.48);
        }
        flames.set(f.id, g);
      }
      g.position.set(f.x * TILE, 0, f.z * TILE);
      g.scale.y = 0.55 + f.life;
      g.rotation.y = ((Math.floor(clock * 9) % 2) * Math.PI) / 2;
    }
    const ids = new Set(game.items.map((i) => i.id));
    for (const [id, g] of drops)
      if (!ids.has(id)) {
        releaseObject(g);
        drops.delete(id);
      }
    for (const i of game.items) {
      let g = drops.get(i.id);
      if (!g) {
        g = makePickup(i.type);
        dynamic.add(g);
        drops.set(i.id, g);
      }
      g.position.set(i.x * TILE, 0, i.z * TILE);
      const figure=g.userData.figure;
      figure.position.y=1.05+(reduced?0:Math.sin(clock*2.6+i.id)*.09);
      figure.rotation.y=Math.atan2(camera.position.x-g.position.x,camera.position.z-g.position.z)+(reduced?0:Math.sin(clock*1.8)*.12);
      g.visible = i.wait <= 0;
    }
    const stormIds = new Set(game.storm.map((i) => i.id));
    for (const [id, g] of warnings)
      if (!stormIds.has(id)) {
        dynamic.remove(g);
        warnings.delete(id);
      }
    for (const s of game.storm) {
      let g = warnings.get(s.id);
      if (!g) {
        g = new T.Group();
        box(g, 2.4, 0.035, 0.14, 0, 0.02, 0, mats.red);
        box(g, 0.14, 0.035, 2.4, 0, 0.02, 0, mats.red);
        const bomb = bombModel();
        bomb.position.y = 10;
        g.add(bomb);
        g.userData.bomb = bomb;
        dynamic.add(g);
        warnings.set(s.id, g);
      }
      g.position.set(s.x * TILE, 0, s.z * TILE);
      g.userData.bomb.position.y = Math.max(0.8, s.time * 5);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        dynamic.remove(p.mesh);
        particles.splice(i, 1);
        continue;
      }
      p.vy -= 16 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 4;
      p.mesh.rotation.z += dt * 3;
      if (p.mesh.position.y < 0.1) {
        p.mesh.position.y = 0.1;
        p.vy *= -0.3;
      }
    }
    flash.intensity = Math.max(0, flash.intensity - dt * 110);
  }
  const radar = document.createElement('canvas');
  radar.width = 150;
  radar.height = 150;
  radar.className='game-radar';
  canvas.parentElement.appendChild(radar);
  const rc = radar.getContext('2d');
  function drawRadar() {
    radar.style.display =
      game.phase === 'menu' ? 'none' : 'block';
    rc.clearRect(0, 0, 150, 150);
    for (let z = 0; z < SIZE; z++)
      for (let x = 0; x < SIZE; x++) {
        rc.fillStyle =
          game.map[z][x] === 1
            ? '#685080'
            : game.map[z][x] === 2
              ? '#a75372'
              : '#20172d';
        rc.fillRect(x * 10 + 1, z * 10 + 1, 8, 8);
      }
    for (const b of game.bombs) {
      rc.fillStyle = '#ffba55';
      rc.fillRect(b.x * 10 + 2, b.z * 10 + 2, 6, 6);
    }
    for (const e of game.enemies)
      if (e.hp > 0) {
        rc.fillStyle = '#ff538c';
        rc.fillRect(e.x * 10 + 2, e.z * 10 + 2, 6, 6);
      }
    rc.fillStyle = '#d8ff48';
    rc.fillRect(game.player.x * 10 + 1, game.player.z * 10 + 1, 8, 8);
  }
  function resize() {
    const w = innerWidth,
      h = innerHeight,
      scale = Math.min(1, (matchMedia('(pointer: coarse)').matches?900:1280) / w);
    renderer.setSize(
      Math.max(1, Math.floor(w * scale)),
      Math.max(1, Math.floor(h * scale)),
      false,
    );
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  let previousSnapshot = '';
  function emit() {
    const snapshot = game.snapshot(playerIndex),
      serialized = JSON.stringify(snapshot);
    if (serialized !== previousSnapshot) {
      onState(snapshot);
      previousSnapshot = serialized;
    }
    drawRadar();
  }
  function lock() {
    if (matchMedia('(pointer: coarse)').matches) return;
    try {
      const promise = canvas.requestPointerLock?.({ unadjustedMovement: true });
      promise?.catch?.(() => {
        try {
          canvas.requestPointerLock?.()?.catch?.(() => {});
        } catch {}
      });
    } catch {}
  }
  function unlock() {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }
  function pause() { if(isMultiplayer)return; if (!['playing', 'spectating'].includes(game.phase)) return;
    pausedPhase = game.phase;
    game.phase = 'paused';
    held = false;
    Object.keys(keys).forEach((k) => delete keys[k]);
    unlock();
    window.speechSynthesis?.cancel();
    emit();
  }
  function resume() {
    if (game.phase !== 'paused') return;
    game.phase = pausedPhase;
    initAudio();
    if (game.phase === 'playing') lock();
    emit();
  }
  function bind(target, type, fn, options) {
    target.addEventListener(type, fn, options);
    listeners.push(() => target.removeEventListener(type, fn, options));
  }
  bind(window, 'pointerdown', initAudio, { once: true });
  bind(window, 'resize', resize);
  bind(document, 'keydown', (e) => {
    if (
      e.target instanceof HTMLElement &&
      ['INPUT', 'TEXTAREA'].includes(e.target.tagName)
    )
      return;
    if (
      game.phase === 'playing' &&
      [
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'KeyQ',
        'KeyE',
      ].includes(e.code)
    )
      e.preventDefault();
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (['playing', 'spectating'].includes(game.phase)) pause();
      else if (game.phase === 'paused') resume();
      return;
    }
    keys[e.code] = true;
    if (e.repeat) return;
    if (isMultiplayer && playerIndex > 0) {
      // Convidado: tudo viaja no input do quadro, senao um emit avulso apaga o movimento.
    } else {
      if (e.code === 'Space') game.throwBomb(true);
      if (e.code === 'KeyE' && !e.repeat) game.special();
      if (e.code === 'KeyQ' && game.phase === 'playing') {if(game.flight)game.cycleTarget();else if(!game.speechTime)game.speak();}
    }
  });
  bind(document, 'keyup', (e) => {
    keys[e.code] = false;
  });
  bind(document, 'mousemove', (e) => {
    if (game.phase !== 'playing' || game.invasion.stage === 'arrival') return;
    if (document.pointerLockElement === canvas || held) {
      const p = controlled();
      p.yaw -= e.movementX * 0.0018 * sensitivity;
      p.pitch = Math.max(
        -1.35,
        Math.min(1.35, p.pitch - e.movementY * 0.0018 * sensitivity),
      );
    }
  });
  bind(canvas, 'pointerdown', (e) => {
    if (game.phase !== 'playing') return;
    if (e.pointerType === 'touch') {
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      canvas.setPointerCapture(e.pointerId);
    } else if (e.button === 0) {
      held = true;
      lock();
      if (controlled() === game.player) game.primaryPress();
    }
  });
  bind(canvas, 'pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId || game.phase !== 'playing' || game.invasion.stage === 'arrival') return;
    const p = controlled();
    p.yaw -= (e.clientX - drag.x) * 0.005;
    p.pitch = Math.max(
      -1,
      Math.min(1, p.pitch - (e.clientY - drag.y) * 0.004),
    );
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  bind(window, 'pointerup', (e) => {
    if (e.button === 0 && held && controlled() === game.player) game.releaseBomb();
    held = false;
    drag = null;
  });
  bind(window, 'pointercancel', () => {
    if (held && controlled() === game.player) game.releaseBomb(true);
    held = false;
    drag = null;
    Object.keys(keys).forEach((k) => delete keys[k]);
  });
  bind(canvas, 'contextmenu', (e) => e.preventDefault());
  bind(document, 'pointerlockchange', () => {
    if (
      !document.pointerLockElement &&
      game.phase === 'playing' &&
      !matchMedia('(pointer:coarse)').matches
    )
      pause();
  });
  bind(window, 'blur', pause);
  bind(document, 'visibilitychange', () => {
    if (document.hidden) pause();
  });
  bind(canvas, 'webglcontextlost', (e) => {
    e.preventDefault();
    pause();
    onError(
      'A conexão com o 3D foi interrompida. Recarregue a página para continuar.',
    );
  });
  const makePickup=createPickupFactory({mesh,box,material,batchStatic,geometries,materials,textures});
  const invaderView = createInvaderView({scene,game,box,mesh,material,bombModel,materials,geometries,textures,onError});
  const globalSpecialView=createGlobalSpecialView({scene,game,box,mesh,materials,geometries,textures,onError});
  function loop(now) {
    const equipLift=reduced?0:controlled().equipTime/.45;
    equippedSword.visible=controlled().swordTime>0&&!controlled().heldBomb;
    const slash=reduced?0:Math.sin(Math.max(0,controlled().swordSwing)/.2*Math.PI);
    equippedSword.rotation.z=-slash*.9;equippedSword.position.set(.29-slash*.18,-.16+slash*.12-equipLift*.32,-.68-slash*.2);
    equippedChair.visible=controlled().chairReady&&!controlled().heldBomb;
    equippedChair.position.set(.3,-.08-equipLift*.36,-.82);equippedChair.rotation.z=-equipLift*.3;
    if (dead) return;
    const elapsedFrame = Math.min((now - last) / 1000, 0.25);
    const dt = Math.min(elapsedFrame, 0.05);
    last = now;
    clock += dt;
    if (['playing', 'spectating'].includes(game.phase)) {
      const p = controlled();
      if (game.invasion.stage !== 'arrival') {
        if (keys.ArrowLeft) p.yaw += dt * 1.7;
        if (keys.ArrowRight) p.yaw -= dt * 1.7;
      }
      const input = {
        forward: keys.KeyW || keys.ArrowUp,
        back: keys.KeyS || keys.ArrowDown,
        left: keys.KeyA,
        right: keys.KeyD,
        run: keys.ShiftLeft || keys.ShiftRight,
        attack: held,
        plant: keys.Space,
        special: keys.KeyE,
        ascend:keys.Space,descend:keys.ControlLeft||keys.ControlRight,
      };
      // Catch up in small physics steps instead of stretching seconds at low FPS.
      if (isMultiplayer && socket) { socket.emit('input', { roomCode, input: { ...input, yaw: p.yaw, pitch: p.pitch } }); }
      advanceFrame(game,elapsedFrame, isMultiplayer ? { [playerIndex]: input } : input);
      if (isMultiplayer) smoothRemotes(dt);
      events();
      syncWorld(dt);
      const moving = keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD;
      const bob = reduced
        ? 0
        : moving
          ? Math.sin(clock * 11) * 0.018
          : Math.sin(clock * 2) * 0.004;
      shake = Math.max(0, shake - dt);
      if (game.phase === 'playing') {
        camera.position.set(
          p.x * TILE + Math.sin(clock*73) * shake * .18,
          1.8 + bob + Math.sin(clock*91) * shake * .12,
          p.z * TILE,
        );
        camera.rotation.set(p.pitch, p.yaw, Math.sin(clock*60)*shake*.025, 'YXZ');
      }
      const fov =
        80 + (p.turbo > 0 ? 9 : keys.ShiftLeft || keys.ShiftRight ? 4 : 0);
      camera.fov += (fov - camera.fov) * (1 - Math.exp(-10 * dt));
      camera.updateProjectionMatrix();
      hand.visible = game.phase === 'playing'&&!specialView.equipped();
      if (game.phase === 'spectating') {
        const e = game.enemies.find((e) => e.hp > 0&&game.sameTeam(e,game.player))||game.enemies.find((e) => e.hp > 0);
        if (e) {
          camera.position.lerp(
            new T.Vector3(e.x * TILE + 7, 9, e.z * TILE + 7),
            1 - Math.exp(-3 * dt),
          );
          camera.lookAt(e.x * TILE, 1, e.z * TILE);
        }
      }
      invaderView.sync(camera,dt);
      if(game.countdown>3) {
        camera.position.set(center+24,27,center+29);camera.lookAt(center,0,center);hand.visible=false;
      } else if(game.countdown>0 && !reduced) {
        const t=1-game.countdown/3,ease=t*t*(3-2*t);
        camera.position.set(p.x*TILE+(1-ease)*8,1.8+(1-ease)*10,p.z*TILE+(1-ease)*8);
        camera.lookAt(p.x*TILE-Math.sin(p.yaw)*5,1.8,p.z*TILE-Math.cos(p.yaw)*5);
        hand.visible=false;
      }
      if(game.invasion.stage==='arrival') {
        const shot=arrivalCamera(game.invasion.kind,1-game.invasion.intro/game.invasion.introDuration,invaderView.focus,reduced);
        camera.position.set(shot.position.x,shot.position.y,shot.position.z);
        camera.lookAt(shot.target.x,shot.target.y,shot.target.z);
        camera.fov=shot.fov;camera.updateProjectionMatrix();hand.visible=false;
        invaderView.sync(camera);
      }
      if(game.invasion.stage!=='arrival'&&globalSpecialView.camera(camera,reduced))hand.visible=false;
      kick = Math.max(0, kick - dt * 2);
      hand.position.set(
        Math.sin(clock * 5) * 0.008,
        bob * 0.5 - kick * 0.5,
        kick * 0.2,
      );
      hand.rotation.x =
        -kick * 2 -
        (game.heldBomb?.heldTime
          ? Math.min(0.25, game.heldBomb.heldTime * 0.25)
          : 0);
      heldBomb.visible =
        !equippedSword.visible&&!equippedChair.visible&&game.bombs.filter((b) => b.owner === 'player').length < 3;
      heldBomb.userData.spark.visible = !!game.heldBomb;
      if (game.heldBomb && clock > nextFuseBeep) {
        tone(game.heldBomb.fuse < 1 ? 1400 : 900, 0.045, 'square', 0.12);
        nextFuseBeep = clock + (game.heldBomb.fuse < 1 ? 0.13 : 0.45);
      }
    } else if (game.phase === 'menu') {
      hand.visible = false;
      if(!document.hidden&&!reduced){
        const restart=advanceAttract(game,elapsedFrame);
        events();
        if(restart){prepareAttract(game);rebuild();}
      }
      const a = 0.8 + (reduced?0:Math.sin(clock * 0.045) * 0.2);
      camera.position.set(
        center + Math.cos(a) * 32,
        21 + (reduced?0:Math.sin(clock * 0.13) * 0.3),
        center + Math.sin(a) * 32,
      );
      camera.lookAt(center - 2, 1.5, center);camera.fov=64;camera.updateProjectionMatrix();
      syncWorld(dt);
    } else hand.visible = false;
    invaderView.sync(camera);
    globalSpecialView.sync(camera,game.elapsed,reduced);
    soundtrack?.update(game,muted||document.hidden);
    if(game.phase==='playing') {
      if(game.countdown>3) {
        const roll=arenaRoll(game.countdown,game.arenaIndex);
        if(roll.index!==lastArenaTick){lastArenaTick=roll.index;tone(500+roll.index*160,.055,'square',.09);}
        if(roll.locked&&!lastArenaLocked){lastArenaLocked=true;[523,659,784].forEach((n,i)=>tone(n,.18,'triangle',.16,i*.1));}
      }
      if(game.countdown<=3) {
        const count=Math.ceil(game.countdown);
        if(count!==lastCountdown){lastCountdown=count;tone(count?440:880,count ? .12 : .35,'triangle',.25);}
      }
    }
    updateAim(dt);
    specialView.sync(clock,reduced);
    hudClock += dt;
    if (hudClock > 0.05) {
      hudClock = 0;
      emit();
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(loop);
  }
  frame = requestAnimationFrame(loop);
  emit();
  const matchApi = { syncSeed(seed) { game = new Match(seed); } };
  return { ...matchApi,
    enterLobby() {
      initAudio();soundtrack?.reset();
      [523.25,659.25,783.99,1046.5].forEach((n,i)=>tone(n,.14,'square',.1,i*.075));
    },
        
    start(character, mode) {
      if (isMultiplayer && socket) {
        socket.emit('startGame', { roomCode, character, mode });
        lock();
        initAudio();
      } else {
        _doStart(character, mode);
      }
    },
    pause,
    resume,
    menu() {
      prepareAttract(game);rebuild();
      unlock();
      held = false;
      window.speechSynthesis?.cancel();
      emit();
    },
    special() {
      game.special();
    },
    diveTarget(id){game.diveTarget(id);},
    cycleTarget(){game.cycleTarget();},
    throwBomb() {
      game.throwBomb(false);
    },
    plantBomb() { game.throwBomb(true); },
    quote() { if(game.phase==='playing'&&game.countdown===0)game.speak(); },
    beginHold() {
      held=true;game.primaryPress();
    },
    releaseBomb() {
      held=false;game.releaseBomb();
    },
    sensitivity(value) {
      sensitivity = Math.max(0.25, Math.min(2.5, value));
    },
    key(code, down) {
      keys[code] = down;
    },
        mute(value) {
      muted = value;
      if(!value)initAudio();
      if (master) master.gain.setTargetAtTime(value ? 0 : .32,audio.currentTime,.025);
      if (value) window.speechSynthesis?.cancel();
    },
    setMultiplayer(soc, room, idx) {
      let wasSpectating = false;
      socket = soc;
      roomCode = room;
      playerIndex = idx;
      isMultiplayer = true;
      socket.on('matchStarted', (data) => { _doStart(data.character, data.mode, data.seed, data.humans, data.characters); });
                  socket.on('tick', (serverState) => {
        if (!game) return;
        if (serverState.phase) game.phase = serverState.phase;
        // Cada tela vai para a arquibancada pela morte do PROPRIO boneco, nao pela
        // do host. A partida no servidor segue em 'playing' para os vivos.
        if (game.phase === 'playing' && (game.fighter(playerIndex)?.hp ?? 1) <= 0) {
          game.phase = 'spectating';
          if (!wasSpectating) { wasSpectating = true; game.events.push({ type: 'spectate' }); }
        } else if (game.phase === 'playing') wasSpectating = false;
        // O relogio e a contagem regressiva sao do servidor; o cliente so exibe.
        if (serverState.time !== undefined) game.elapsed = Math.max(0, 180 - serverState.time);
        if (serverState.countdown !== undefined) game.countdown = serverState.countdown;
        if (serverState.score !== undefined) game.score = serverState.score;
        if (serverState.kills !== undefined) game.kills = serverState.kills;
        if (game.phase !== 'playing') return;
        
        serverState.players.forEach((sp, i) => {
          const target = game.fighter(i);
          if (!target) return;
          target.hp = sp.hp;
          // O proprio boneco e previsto localmente; os outros ganham um alvo para
          // onde deslizar, senao andariam aos trancos a cada pacote.
          if (i !== playerIndex) target.netTarget = { x: sp.x, z: sp.z, yaw: sp.rot };
        });
        
        // Listas que agora sao do servidor. Reaproveitamos o objeto local quando o
        // id ja existe, para o render nao recriar a malha a cada pacote.
        for (const key of ['items', 'fires', 'storm', 'chairs', 'barricades', 'decoys', 'specialEffects']) {
          if (!serverState[key]) continue;
          const local = new Map(game[key].map((o) => [o.id, o]));
          game[key] = serverState[key].map((o) => Object.assign(local.get(o.id) || {}, o));
        }
        if (serverState.map) game.map = serverState.map;
        if (serverState.invasion) game.invasion.applyNetState(game, serverState.invasion);
        if (serverState.bombs) {
          const localBombs = {};
          game.bombs.forEach(b => localBombs[b.id] = b);
          game.bombs = serverState.bombs.map(sb => {
             const lb = localBombs[sb.id];
             if (lb) {
               lb.x = sb.x; lb.z = sb.z; lb.y = sb.y; lb.fuse = sb.fuse; return lb;
             }
             return sb;
          });
        }
      });
    },
    destroy() {
      dead = true;
      invaderView.dispose();
      cancelAnimationFrame(frame);
      specialView.destroy();
      globalSpecialView.destroy();
      unlock();
      listeners.forEach((f) => f());
      soundtrack?.dispose();
      audio?.close();
      window.speechSynthesis?.cancel();
      radar.remove();
      scene.traverse(object=>{if(object.isInstancedMesh)object.dispose();});
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
