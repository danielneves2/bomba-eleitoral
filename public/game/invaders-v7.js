import * as T from '../vendor/three.module.js';
import { INVASION_INTRO } from './invasion.mjs?v=7';
import { loadCutout } from './cutouts-v7.js';

export function createInvaderView({ scene, game, box, mesh, material, bombModel, materials, geometries, textures, onError }) {
  const root = new T.Group(); scene.add(root);
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
  box(launcher, 3.2, .65, 2, 0, .45, 0, trim);
  for (const x of [-1, 0, 1]) {
    box(launcher, .48, 2.9, .48, x, 2, -.4, metal);
    box(launcher, .3, .5, .3, x, 3.55, -.4, red);
  }
  const focus = new T.Vector3(), markers = new Map();
  const ringGeo = new T.RingGeometry(4.25, 4.7, 48), discGeo = new T.CircleGeometry(4.25, 48);
  const orbGeo = new T.OctahedronGeometry(.22); geometries.push(ringGeo, discGeo, orbGeo);
  const ringMat = new T.MeshBasicMaterial({ color: 0xff183f, side: T.DoubleSide, depthWrite: false });
  const discMat = new T.MeshBasicMaterial({ color: 0xff183f, transparent: true, opacity: .22, side: T.DoubleSide, depthWrite: false });
  materials.push(ringMat, discMat);
  function sync(camera, dt = 0) {
    const invasion = game.invasion, arrival = invasion.stage === 'arrival', active = invasion.stage === 'active';
    root.visible = ['playing', 'spectating', 'paused'].includes(game.phase); animation += dt;
    aircraft.visible = invasion.kind === 'putin' && arrival;
    trump.visible = invasion.kind === 'trump' && (arrival || active);
    parade.visible = invasion.kind === 'trump' && arrival;
    kim.visible = invasion.kind === 'kim' && (arrival || active); launcher.visible = kim.visible;
    const t = 1 - invasion.intro / INVASION_INTRO;
    if (aircraft.visible) {
      aircraft.position.set(4 + t * 28, 13 + Math.sin(t * Math.PI) * 2.5, 18);
      aircraft.rotation.set(0, -Math.PI / 2, Math.sin(t * Math.PI * 2) * .08);
      propeller.rotation.z = t * 110;
      pilot.quaternion.copy(aircraft.quaternion).invert().multiply(camera.quaternion);
      focus.copy(aircraft.position); focus.y += .8;
    }
    if (trump.visible) {
      const a = invasion.actor;
      trump.position.set(a.x * 2.7, arrival ? .45 : Math.abs(Math.sin(a.walk)) * .05, a.z * 2.7);
      trump.rotation.y = Math.atan2(camera.position.x - trump.position.x, camera.position.z - trump.position.z);
      trump.userData.figure.rotation.z = Math.sin(arrival ? t * 12 : a.walk) * .035;
      trump.scale.setScalar(arrival ? 1 + Math.sin(t * Math.PI) * .06 : 1);
      if (arrival) {
        parade.position.set(a.x * 2.7, 0, a.z * 2.7);
        flagPanels.forEach((panel, i) => panel.position.z = Math.sin(t * 14 - i * .55) * .16);
        eagle.position.set(Math.cos(t * Math.PI * 2) * 2, 4.6 + Math.sin(t * 10) * .25, .7);
        eagle.quaternion.copy(camera.quaternion); eagle.rotation.z += Math.sin(t * 10) * .12;
        focus.set(trump.position.x - .5, 2.7, trump.position.z);
      }
    }
    if (kim.visible) {
      // Mount the launcher above the 3.6-unit perimeter so the arrival and
      // the miniature remain visible from the arena, rather than behind it.
      launcher.position.set(7 * 2.7, 3.65, -3);
      kim.position.set(7 * 2.7, 4.4 + Math.sin(animation * 3) * .025, -1.8);
      kim.rotation.y = Math.atan2(camera.position.x - kim.position.x, camera.position.z - kim.position.z);
      focus.set(kim.position.x, 5.85, kim.position.z);
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
        const projectile = invasion.kind === 'kim' ? new T.Group() : bombModel();
        if (invasion.kind === 'kim') {
          box(projectile, .36, 1.5, .36, 0, .3, 0, metal);
          box(projectile, .25, .35, .25, 0, -.6, 0, red);
          box(projectile, .7, .3, .15, 0, 1, 0, trim);
        }
        g.add(projectile); g.userData.projectile = projectile;
        mesh(g, orbGeo, red, 0, .3, 0);
      }
      g.position.set(target.x * 2.7, 0, target.z * 2.7);
      g.userData.projectile.visible = target.time < .8;
      g.userData.projectile.position.y = Math.max(.6, target.time * 17);
    }
  }
  return { sync, aircraft, focus, dispose() { disposed = true; scene.remove(root); if (portraitUrl) URL.revokeObjectURL(portraitUrl); } };
}
