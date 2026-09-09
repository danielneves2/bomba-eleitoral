import * as T from '../vendor/three.module.js';
import { Match, SIZE, cell, NAMES } from './core.mjs?v=2';
const TILE = 2.7,
  COLORS = [
    0xef4269, 0x79bc39, 0xe47b36, 0x9561de, 0x66b5ff, 0xe9b54d, 0xeded9d,
    0xff5848, 0x91b9e5,
  ];
export function createGame(canvas, onState, onError) {
  let renderer;
  try {
    renderer = new T.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
  } catch {
    onError('Ative a aceleraÃ§Ã£o grÃ¡fica do navegador para usar o 3D.');
    return { destroy() {} };
  }
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const scene = new T.Scene();
  scene.background = new T.Color(0x170c2b);
  scene.fog = new T.FogExp2(0x211139, 0.013);
  const camera = new T.PerspectiveCamera(73, 1, 0.07, 150);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  const game = new Match(42424);
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
    floorA: material(0x2c224b),
    floorB: material(0x49315d),
    wall: material(0x50316a),
    trim: material(0x7b539d),
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
    wood: material(0xa64f70),
    woodEdge: material(0x542441),
    pole: material(0x482758),
  };
  function box(root, w, h, d, x, y, z, mat) {
    const m = new T.Mesh(boxGeometry, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  }
  function mesh(root, geo, mat, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  }
  function label(text, color = '#e0ff65', width = 7, height = 1) {
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
    return new T.Mesh(geo, mat);
  }
  scene.add(new T.HemisphereLight(0xb697ff, 0x743a66, 2.25));
  const sun = new T.DirectionalLight(0xffdaac, 3.1);
  sun.position.set(5, 30, 15);
  scene.add(sun);
  const blue = new T.DirectionalLight(0x746dff, 2);
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
          (x + z) % 2 ? mats.floorA : mats.floorB,
        );
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
    const sign = label('âœ¦  BOMBA  âœ¦', '#ff67b1', 9, 1.5);
    sign.position.set(center, 13, center - 12);
    staticRoot.add(sign);
  }
  makeEnvironment();
  batchStatic(staticRoot);
  let atlas = null,
    newAtlas = null;
  new T.TextureLoader().load(
    '/portraits.png',
    (tx) => {
      if (dead) {
        tx.dispose();
        return;
      }
      tx.colorSpace = T.SRGBColorSpace;
      tx.magFilter = T.NearestFilter;
      tx.minFilter = T.NearestFilter;
      atlas = tx;
      textures.push(tx);
      for (const e of game.enemies)
        if (bodies.has(e.id)) addFace(bodies.get(e.id), e.skin);
    },
    undefined,
    () => onError('Os retratos nÃ£o carregaram. Recarregue a pÃ¡gina.'),
  );
  new T.TextureLoader().load(
    '/portraits-new.png',
    (tx) => {
      if (dead) {
        tx.dispose();
        return;
      }
      tx.colorSpace = T.SRGBColorSpace;
      tx.magFilter = T.NearestFilter;
      tx.minFilter = T.NearestFilter;
      newAtlas = tx;
      textures.push(tx);
      for (const e of game.enemies)
        if (bodies.has(e.id)) addFace(bodies.get(e.id), e.skin);
    },
    undefined,
    () => onError('Os novos retratos nÃ£o carregaram. Recarregue a pÃ¡gina.'),
  );
  function addFace(root, skin) {
    const source = skin < 4 ? atlas : newAtlas;
    if (!source || root.userData.face) return;
    const tx = source.clone();
    const index = skin < 4 ? skin : skin - 4,
      cols = skin < 4 ? 2 : 3;
    tx.repeat.set(1 / cols, 0.5);
    tx.offset.set(
      (index % cols) / cols,
      Math.floor(index / cols) === 0 ? 0.5 : 0,
    );
    tx.needsUpdate = true;
    textures.push(tx);
    const mat = new T.MeshBasicMaterial({ map: tx });
    materials.push(mat);
    const geo = new T.PlaneGeometry(0.97, 0.97);
    geometries.push(geo);
    const f = mesh(root, geo, mat, 0, 1.86, 0.53);
    root.userData.face = f;
  }
  function makeEnemy(e) {
    const root = new T.Group();
    dynamic.add(root);
    const suit = material(COLORS[e.skin]);
    box(root, 0.79, 0.84, 0.5, 0, 1.05, 0, suit);
    box(root, 0.29, 0.63, 0.3, -0.23, 0.38, 0, mats.dark);
    box(root, 0.29, 0.63, 0.3, 0.23, 0.38, 0, mats.dark);
    box(root, 0.28, 0.7, 0.34, -0.55, 1.08, 0, suit);
    box(root, 0.28, 0.7, 0.34, 0.55, 1.08, 0, suit);
    box(root, 0.29, 0.23, 0.36, -0.55, 0.65, 0, mats.skin);
    box(root, 0.29, 0.23, 0.36, 0.55, 0.65, 0, mats.skin);
    box(root, 0.96, 0.98, 0.85, 0, 1.84, 0, mats.skin);
    box(root, 0.17, 0.57, 0.06, 0, 1.18, 0.28, mats.yellow);
    box(
      root,
      1.03,
      0.19,
      0.93,
      0,
      2.3,
      0,
      e.skin === 0 || e.skin === 3 || e.skin === 8 ? mats.white : mats.dark,
    );
    addFace(root, e.skin);
    const ringGeo = new T.RingGeometry(0.48, 0.57, 16);
    geometries.push(ringGeo);
    const ring = mesh(
      root,
      ringGeo,
      material(COLORS[e.skin], COLORS[e.skin], 1),
      0,
      0.025,
      0,
    );
    ring.rotation.x = -Math.PI / 2;
    const name = label(NAMES[e.skin].toUpperCase(), '#ffffff', 1.8, 0.28);
    name.position.y = 2.65;
    root.add(name);
    root.userData.name = name;
    batchStatic(root);
    bodies.set(e.id, root);
  }
  function makeCrate(x, z) {
    const g = new T.Group();
    g.position.set(x * TILE, 0, z * TILE);
    dynamic.add(g);
    box(g, 2.27, 2.1, 2.27, 0, 1.05, 0, mats.wood);
    for (const y of [0.22, 1, 1.86]) {
      box(g, 2.36, 0.13, 2.36, 0, y, 0, mats.woodEdge);
    }
    box(g, 0.17, 2.1, 2.38, -0.82, 1.05, 0, mats.woodEdge);
    box(g, 0.17, 2.1, 2.38, 0.82, 1.05, 0, mats.woodEdge);
    const a = label('?', '#ffc578', 0.95, 0.5);
    a.position.set(0, 1.15, 1.2);
    g.add(a);
    batchStatic(g);
    crates.set(cell(x, z), g);
  }
  const walls = new T.Group();
  scene.add(walls);
  function clearMap(map) {
    for (const m of map.values()) m.parent?.remove(m);
    map.clear();
  }
  function rebuild() {
    for (const maps of [bodies, bombs, flames, drops, warnings, crates])
      clearMap(maps);
    walls.clear();
    for (const p of particles) p.mesh.parent?.remove(p.mesh);
    particles.length = 0;
    for (let z = 0; z < SIZE; z++)
      for (let x = 0; x < SIZE; x++) {
        if (game.map[z][x] === 1) {
          const h = x === 0 || z === 0 || x === 14 || z === 14 ? 3.6 : 2.65;
          box(walls, 2.54, h, 2.54, x * TILE, h / 2, z * TILE, mats.wall);
          box(walls, 2.59, 0.2, 2.59, x * TILE, h - 0.2, z * TILE, mats.trim);
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
  }
  const bombGeometry = new T.SphereGeometry(0.55, 10, 8);
  geometries.push(bombGeometry);
  function bombModel(withCounter = false) {
    const root = new T.Group();
    mesh(root, bombGeometry, mats.bomb);
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
      root.userData.counter = { c, tx, last: '' };
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
    aimRoot.visible = game.phase === 'playing' && !!game.heldBomb;
    if (!aimRoot.visible) return;
    arcClock += dt;
    if (arcClock < 1 / 60) return;
    arcClock = 0;
    const prediction = game.trajectory();
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
  camera.add(hand);
  box(hand, 0.24, 0.35, 0.31, 0.34, -0.4, -0.55, mats.skin);
  box(hand, 0.28, 0.46, 0.34, 0.39, -0.67, -0.48, mats.dark);
  const heldBomb = bombModel();
  heldBomb.position.set(0.35, -0.16, -0.74);
  heldBomb.scale.setScalar(0.44);
  hand.add(heldBomb);
  hand.visible = false;
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
    nextBeat = 0,
    step = 0;
  function initAudio() {
    if (!audio) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      audio = new A();
      master = audio.createGain();
      master.gain.value = muted ? 0 : 0.32;
      master.connect(audio.destination);
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
  ) {
    if (!audio || muted) return;
    const o = audio.createOscillator(),
      g = audio.createGain(),
      t = audio.currentTime + at;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (end) o.frequency.exponentialRampToValueAtTime(end, t + duration);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + duration);
  }
  function noise(duration = 0.3) {
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
    g.gain.value = 0.6;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
  }
  function speak(text) {
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
        shake = reduced ? 0 : 0.075;
        flash.position.set(e.x * TILE, 2, e.z * TILE);
        flash.intensity = 35;
        noise(0.34);
        tone(85, 0.35, 'sine', 0.7, 0, 25);
      }
      if (e.type === 'crate') {
        const key = cell(e.x, e.z);
        dynamic.remove(crates.get(key));
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
      if (e.type === 'hit')
        burst(e.x * TILE, 1.4, e.z * TILE, 8, [mats.white, mats.pink]);
      if (e.type === 'hurt') {
        shake = reduced ? 0 : 0.11;
        tone(180, 0.4, 'sawtooth', 0.23, 0, 50);
      }
      if (e.type === 'pickup') {
        tone(440, 0.1, 'square', 0.13);
        tone(660, 0.12, 'square', 0.13, 0.08);
        tone(880, 0.15, 'square', 0.13, 0.17);
      }
      if (e.type === 'special') {
        tone(180, 0.6, 'sawtooth', 0.12, 0, 900);
      }
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
      g.position.set(e.x * TILE, Math.abs(Math.sin(e.walk)) * 0.08, e.z * TILE);
      g.rotation.y = Math.atan2(game.player.x - e.x, game.player.z - e.z);
      g.visible = e.invulnerable <= 0 || Math.sin(clock * 30) > 0;
    }
    const active = new Set(game.bombs.map((b) => b.id));
    for (const [id, g] of bombs)
      if (!active.has(id)) {
        dynamic.remove(g);
        const counter = g.userData.counter;
        if (counter) {
          counter.tx.dispose();
          const idx = textures.indexOf(counter.tx);
          if (idx >= 0) textures.splice(idx, 1);
        }
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
        dynamic.remove(g);
        drops.delete(id);
      }
    for (const i of game.items) {
      let g = drops.get(i.id);
      if (!g) {
        g = mesh(
          dynamic,
          octGeometry,
          [mats.pink, mats.cyan, mats.yellow][i.type],
        );
        g.scale.setScalar(0.45);
        drops.set(i.id, g);
      }
      g.position.set(i.x * TILE, 1 + Math.sin(clock * 3) * 0.15, i.z * TILE);
      g.rotation.y = clock * 1.5;
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
  radar.style.cssText =
    'position:fixed;right:4vw;top:175px;width:120px;height:120px;image-rendering:pixelated;border:1px solid #a97bcc55;background:#150e25bb;pointer-events:none;opacity:.88';
  canvas.parentElement.appendChild(radar);
  const rc = radar.getContext('2d');
  function drawRadar() {
    radar.style.display =
      game.phase === 'menu' || innerWidth < 700 ? 'none' : 'block';
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
      scale = Math.min(0.72, 960 / w);
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
    const snapshot = game.snapshot(),
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
  function pause() {
    if (!['playing', 'spectating'].includes(game.phase)) return;
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
    if (e.code === 'Space') game.throwBomb(true);
    if (e.code === 'KeyE') game.special();
    if (e.code === 'KeyQ' && game.phase === 'playing') game.speak();
  });
  bind(document, 'keyup', (e) => {
    keys[e.code] = false;
  });
  bind(document, 'mousemove', (e) => {
    if (game.phase !== 'playing') return;
    if (document.pointerLockElement === canvas || held) {
      game.player.yaw -= e.movementX * 0.0018 * sensitivity;
      game.player.pitch = Math.max(
        -1.35,
        Math.min(1.35, game.player.pitch - e.movementY * 0.0018 * sensitivity),
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
      game.beginHold();
    }
  });
  bind(canvas, 'pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId || game.phase !== 'playing') return;
    game.player.yaw -= (e.clientX - drag.x) * 0.005;
    game.player.pitch = Math.max(
      -1,
      Math.min(1, game.player.pitch - (e.clientY - drag.y) * 0.004),
    );
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  bind(window, 'pointerup', (e) => {
    if (e.button === 0 && held) game.releaseBomb();
    held = false;
    drag = null;
  });
  bind(window, 'pointercancel', () => {
    if (held) game.releaseBomb(true);
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
      'A conexÃ£o com o 3D foi interrompida. Recarregue a pÃ¡gina para continuar.',
    );
  });
  function loop(now) {
    if (dead) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;
    if (['playing', 'spectating'].includes(game.phase)) {
      const p = game.player;
      if (keys.ArrowLeft) p.yaw += dt * 1.7;
      if (keys.ArrowRight) p.yaw -= dt * 1.7;
      game.tick(dt, {
        forward: keys.KeyW || keys.ArrowUp,
        back: keys.KeyS || keys.ArrowDown,
        left: keys.KeyA,
        right: keys.KeyD,
        run: keys.ShiftLeft || keys.ShiftRight,
      });
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
          p.x * TILE + (Math.random() - 0.5) * shake,
          1.8 + bob + (Math.random() - 0.5) * shake,
          p.z * TILE,
        );
        camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
      }
      const fov =
        80 + (p.turbo > 0 ? 9 : keys.ShiftLeft || keys.ShiftRight ? 4 : 0);
      camera.fov += (fov - camera.fov) * (1 - Math.exp(-10 * dt));
      camera.updateProjectionMatrix();
      hand.visible = game.phase === 'playing';
      if (game.phase === 'spectating') {
        const e = game.enemies.find((e) => e.hp > 0);
        if (e) {
          camera.position.lerp(
            new T.Vector3(e.x * TILE + 7, 9, e.z * TILE + 7),
            1 - Math.exp(-3 * dt),
          );
          camera.lookAt(e.x * TILE, 1, e.z * TILE);
        }
      }
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
        game.bombs.filter((b) => b.owner === 'player').length < 3;
      heldBomb.userData.spark.visible = !!game.heldBomb;
      if (game.heldBomb && clock > nextFuseBeep) {
        tone(game.heldBomb.fuse < 1 ? 1400 : 900, 0.045, 'square', 0.12);
        nextFuseBeep = clock + (game.heldBomb.fuse < 1 ? 0.13 : 0.45);
      }
      if (audio && audio.currentTime > nextBeat) {
        nextBeat = audio.currentTime + 0.19;
        const notes = [
          130.81, 155.56, 196, 155.56, 146.83, 174.61, 220, 174.61,
        ];
        tone(notes[step % 8], 0.14, 'triangle', 0.1);
        if (step % 4 === 0) tone(70, 0.12, 'sine', 0.25, 0, 35);
        if (step % 2 === 1) tone(1100, 0.035, 'square', 0.017);
        step++;
      }
    } else if (game.phase === 'menu') {
      hand.visible = false;
      const a = 0.68 + Math.sin(clock * 0.09) * 0.1;
      camera.position.set(
        center + Math.cos(a) * 24,
        11 + Math.sin(clock * 0.13) * 0.3,
        center + Math.sin(a) * 24,
      );
      camera.lookAt(center - 2, 1.5, center);
      syncWorld(dt);
    } else hand.visible = false;
    updateAim(dt);
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
  return {
    start(character, mode) {
      game.reset(character, mode);
      for (const key of Object.keys(keys)) delete keys[key];
      held = false;
      drag = null;
      rebuild();
      kick = 0;
      shake = 0;
      initAudio();
      lock();
      emit();
      setTimeout(() => {
        if (!dead && game.phase === 'playing') game.speak();
      }, 700);
    },
    pause,
    resume,
    menu() {
      game.phase = 'menu';
      unlock();
      held = false;
      window.speechSynthesis?.cancel();
      emit();
    },
    special() {
      game.special();
    },
    throwBomb() {
      game.throwBomb(false);
    },
    beginHold() {
      game.beginHold();
    },
    releaseBomb() {
      game.releaseBomb();
    },
    sensitivity(value) {
      sensitivity = Math.max(0.25, Math.min(2.5, value));
    },
    key(code, down) {
      keys[code] = down;
    },
    mute(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.32;
      if (value) window.speechSynthesis?.cancel();
    },
    destroy() {
      dead = true;
      cancelAnimationFrame(frame);
      unlock();
      listeners.forEach((f) => f());
      audio?.close();
      window.speechSynthesis?.cancel();
      radar.remove();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
