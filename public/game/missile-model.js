import * as T from '../vendor/three.module.js';

export function createMissileFactory({ mesh, box, material, geometries }) {
  const body = material(0x879d8b), dark = material(0x293c38), nose = material(0xcf493e);
  const hot = material(0xffba4f,0xff7426,.8), core = material(0xfff1b5,0xffca60,1);
  const hull = new T.CylinderGeometry(.25,.25,1.65,8);
  const tip = new T.ConeGeometry(.25,.65,8);
  const jet = new T.ConeGeometry(.2,1,6);
  geometries.push(hull,tip,jet);
  return function missile() {
    const g = new T.Group();
    mesh(g,hull,body,0,.9,0); mesh(g,tip,nose,0,2.05,0);
    for(const sign of [-1,1]) {
      box(g,.45,.5,.08,sign*.31,.25,0,dark);
      box(g,.08,.5,.45,0,.25,sign*.31,dark);
    }
    box(g,.51,.13,.51,0,1.45,0,dark);
    const exhaust = new T.Group();g.add(exhaust);
    const flame=mesh(exhaust,jet,hot,0,-.45,0);flame.rotation.z=Math.PI;
    const inner=mesh(exhaust,jet,core,0,-.25,0);inner.rotation.z=Math.PI;inner.scale.set(.55,.65,.55);
    g.userData.exhaust=exhaust;
    return g;
  };
}
