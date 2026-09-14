import * as T from '../vendor/three.module.js';

// Scenery stays outside the collision grid; gameplay cover keeps its exact height.
export function createArenaWorlds({scene,box,mesh,material,batchStatic,geometries,label}) {
  const roots={favela:new T.Group(),planalto:new T.Group()};
  const cream=material(0xe9e6ce),glass=material(0x316f82),dark=material(0x26383d),grass=material(0x4a864b),gold=material(0xe8bd4b);
  const brick=material(0xa45438),roof=material(0x65534f),water=material(0x3271a5),window=material(0xffdf99,0xc48b32,.3);
  const paints=[brick,material(0xd49b4c),material(0x4d9896),material(0x6b86b4),material(0xd48977)];
  const stone=[material(0x777571),material(0x86837b)],marble=[material(0xbfc9c6),material(0xd5d8c7)];
  const tankGeo=new T.CylinderGeometry(.7,.6,1.1,8),dishGeo=new T.SphereGeometry(.62,8,4,0,Math.PI*2,0,Math.PI/2);
  geometries.push(tankGeo,dishGeo);
  for(const [kind,root] of Object.entries(roots)) {
    scene.add(root);root.visible=false;
    for(let z=0;z<15;z++)for(let x=0;x<15;x++) {
      box(root,2.67,.14,2.67,x*2.7,-.09,z*2.7,(kind==='favela'?stone:marble)[(x+z)%2]);
      if(kind==='planalto'&&(x===7||z===7))box(root,.15,.015,2.55,x*2.7,.002,z*2.7,gold);
    }
  }
  const favela=roots.favela;
  for(let side=0;side<4;side++) {
    const street=new T.Group();street.position.set(18.9,0,18.9);street.rotation.y=side*Math.PI/2;favela.add(street);
    for(let n=0;n<9;n++) {
      const x=-22+n*5,levels=1+(n+side)%3;
      for(let level=0;level<levels;level++) {
        const y=level*3;
        box(street,4.55,2.9,4.2,x,y+1.45,-25,paints[(n+side+level)%paints.length]);
        box(street,4.8,.18,4.45,x,y+2.97,-25,roof);
        for(const dx of [-1.15,1.15]) {
          box(street,.9,1.05,.06,x+dx,y+1.7,-22.85,dark);
          box(street,.67,.8,.07,x+dx,y+1.7,-22.8,(n+level)%2?window:glass);
        }
        if(level===0)box(street,.85,1.75,.08,x,y+.88,-22.8,dark);
      }
      mesh(street,tankGeo,water,x,levels*3+.55,-25.5);
      const dish=mesh(street,dishGeo,cream,x+1.2,levels*3+.3,-24);dish.rotation.x=-.6;
      if(n<8) {
        box(street,4.8,.035,.035,x+2.4,4,-22.45,dark);
        for(let j=0;j<3;j++)box(street,.55,.7,.04,x+1+j,3.66,-22.45,paints[(n+j+side)%5]);
      }
    }
    const sign=label(side%2?'LAJE DO CAOS':'VIELA DAS PROMESSAS','#ffd37e',10,1);sign.position.set(0,5,-22.3);street.add(sign);
  }
  const planalto=roots.planalto;
  // Congress: twin towers and its two opposite hemispheres, in faceted geometry.
  const congress=new T.Group();congress.position.set(18.9,0,-12);planalto.add(congress);
  box(congress,36,.7,9,0,.35,0,cream);
  for(const x of [-2,2]) {
    box(congress,2.6,17,3,x,9,0,cream);
    for(let y=1.5;y<17;y+=.65)box(congress,2.35,.35,.04,x,y,1.52,glass);
  }
  box(congress,2,.6,2,0,11,0,cream);
  const domeGeo=new T.SphereGeometry(4.8,16,8,0,Math.PI*2,0,Math.PI/2);geometries.push(domeGeo);
  mesh(congress,domeGeo,cream,-10,.7,0);
  const bowl=mesh(congress,domeGeo,cream,10,5.5,0);bowl.rotation.z=Math.PI;
  const sign=label('CONGRESSO NACIONAL','#e4f9ff',15,1.1);sign.position.set(0,2,4.6);congress.add(sign);
  // Palace colonnade to the east: slender white slanted supports and glass.
  const palace=new T.Group();palace.position.set(48,0,18.9);palace.rotation.y=-Math.PI/2;planalto.add(palace);
  box(palace,28,.4,8,0,.2,0,cream);box(palace,27,4.2,5,0,3,0,glass);box(palace,31,.5,9,0,5.4,0,cream);
  for(let x=-13;x<=13;x+=3.25)for(const z of [-3.6,3.6]) {
    const column=box(palace,.38,5.3,.45,x,2.7,z,cream);column.rotation.z=(x<0?1:-1)*.13;
  }
  for(const side of [-1,1])for(let n=0;n<7;n++) {
    box(planalto,3.5,.25,2.4,3+n*5,.1,side<0?-4:42,grass);
    box(planalto,.24,3,.24,3+n*5,1.5,side<0?-4:42,dark);
    box(planalto,2.1,1.4,1.7,3+n*5,3,side<0?-4:42,grass);
  }
  box(planalto,22,.06,2.3,18.9,0,-6,glass);
  for(const root of Object.values(roots))batchStatic(root);
  return roots;
}
