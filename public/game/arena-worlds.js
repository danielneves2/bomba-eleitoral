import * as T from '../vendor/three.module.js';

// Every decorative structure is outside the playable 15×15 collision grid.
// Repeated voxel details are instanced by material at the end of construction.
export function createArenaWorlds({scene,box,mesh,material,batchStatic,geometries,label}) {
  const roots={favela:new T.Group(),planalto:new T.Group()};
  const cream=material(0xf3edd9),glass=material(0x376275),dark=material(0x283539),grass=material(0x59823b),gold=material(0xe2b849);
  const brick=material(0xb86b45),mortar=material(0xd39368),roof=material(0x9d9e8d),water=material(0x277bb4),window=material(0xe7cc7d);
  const paints=[brick,material(0xd5b36d),material(0x72a79b),material(0x97a4b8),material(0xce8f75),material(0xbfb5a0)];
  const cloth=[material(0xf1e6cc),material(0xdec453),material(0x729bb5),material(0xd47465)];
  const stone=[material(0x8d8a7c),material(0x94918a)],marble=[material(0xcfd3c2),material(0xdaddce)];
  const hillMat=[material(0x477365),material(0x62826b),material(0x346760)];
  const hillGeo=new T.SphereGeometry(1,9,5),domeGeo=new T.SphereGeometry(4.8,24,10,0,Math.PI*2,0,Math.PI/2);
  // Hollow, shallow bowl: the Senate is not an upside-down solid dome.
  const bowlGeo=new T.LatheGeometry([new T.Vector2(2.4,0),new T.Vector2(3.4,.6),new T.Vector2(5.7,2.5),new T.Vector2(5.52,2.5),new T.Vector2(3.25,.65),new T.Vector2(2.4,.24)],24);
  geometries.push(hillGeo,domeGeo,bowlGeo);
  for(const [kind,root] of Object.entries(roots)) {
    scene.add(root);root.visible=false;
    for(let z=0;z<15;z++)for(let x=0;x<15;x++) {
      box(root,2.67,.14,2.67,x*2.7,-.09,z*2.7,(kind==='favela'?stone:marble)[(x+z)%2]);
      if(kind==='planalto'&&(x===7||z===7))box(root,.15,.015,2.55,x*2.7,.002,z*2.7,gold);
    }
    // Stepped cloud banks keep the sky graphic and pixel-like, without textures.
    for(let n=0;n<10;n++){
      const a=n*Math.PI/5,x=18.9+Math.cos(a)*76,z=18.9+Math.sin(a)*76,y=26+(n%3)*5;
      for(let j=0;j<3;j++)box(root,7+j*2,1.7+(j%2),5,x+j*4,y+j*.8,z,cream);
    }
  }
  const favela=roots.favela;
  // Distant green massifs and terraced neighbourhoods rise behind the near alleys.
  for(let n=0;n<8;n++){
    const a=n*Math.PI/4,m=mesh(favela,hillGeo,hillMat[n%3],18.9+Math.cos(a)*70,1,18.9+Math.sin(a)*70);
    m.scale.set(21+(n%3)*6,22+(n%4)*6,24);m.rotation.y=n*.7;
  }
  function house(root,x,y,z,w,h,seed) {
    const paint=paints[seed%paints.length];
    box(root,w,h,4.4,x,y+h/2,z,paint);
    box(root,w+.35,.2,4.7,x,y+h+.1,z,roof);
    // Exposed masonry is built in actual voxel strips and staggered joints.
    if(seed%3===0){
      for(let row=0;row<Math.floor(h/.4);row++){
        box(root,w,.035,.035,x,y+.2+row*.4,z+2.22,mortar);
        for(let k=0;k<5;k++)box(root,.035,.36,.035,x-w/2+.35+k*.86+(row%2)*.3,y+.38+row*.4,z+2.22,mortar);
      }
    }
    for(const dx of [-w*.26,w*.26]){
      box(root,1.06,1.12,.14,x+dx,y+h*.62,z+2.24,cream);
      box(root,.82,.9,.16,x+dx,y+h*.62,z+2.32,seed%4===0?window:glass);
      box(root,.055,.9,.18,x+dx,y+h*.62,z+2.35,dark);
    }
    box(root,.8,1.65,.12,x,y+.82,z+2.26,dark);
    if(seed%2===0){
      box(root,1.3,.83,1.25,x+.65,y+h+.62,z-.35,water);
      box(root,1.45,.12,1.4,x+.65,y+h+1.1,z-.35,water);
      box(root,1.35,.07,1.3,x+.65,y+h+.46,z-.35,cream);
    }
    if(seed%3===1){
      box(root,.055,1.6,.055,x-w*.35,y+h+.9,z,dark);
      box(root,1.1,.045,.045,x-w*.35,y+h+1.45,z,dark);
    }
    if(seed%4===2)for(let n=0;n<4;n++)box(root,.1,.65,.1,x-w/2+.12+n*.15,y+h+.35,z+1.9,dark);
  }
  for(let side=0;side<4;side++){
    const street=new T.Group();street.position.set(18.9,0,18.9);street.rotation.y=side*Math.PI/2;favela.add(street);
    for(let tier=0;tier<3;tier++)for(let n=0;n<9;n++){
      const x=-23+n*5.8+(tier%2)*1.3,y=tier*5.2,z=-26-tier*7,seed=n+side*9+tier*13,h=3+(seed%3)*1.25;
      if(tier>0)box(street,5.7,y,6.9,x,y/2,z,hillMat[(tier+side)%3]);
      house(street,x,y,z,4.8,h,seed);
      if(seed%3===1)house(street,x+.3,y+h+.2,z-.15,4.15,2.8,seed+3);
      // Laundry: distinct shirts and trousers, suspended above the frontage.
      if(n<8&&tier<2){
        const ly=y+h*.65+1;
        box(street,5.8,.025,.025,x+2.9,ly,z+2.9,dark);
        for(let j=0;j<4;j++){
          const px=x+1.4+j*1.1,py=ly-.35,mat=cloth[(seed+j)%4];
          box(street,.08,.15,.06,px,ly-.04,z+2.9,roof);
          if(j%2===0){box(street,.5,.7,.045,px,py,z+2.9,mat);box(street,.86,.24,.05,px,py+.2,z+2.9,mat);}
          else{for(const dx of [-.16,.16])box(street,.24,.85,.045,px+dx,py-.08,z+2.9,mat);}
        }
      }
    }
    // Side stairs climb the tiers, with overhead utility poles along the street.
    for(let n=0;n<13;n++)box(street,1.25,.4+n*.4,.75,-26,.2+n*.2,-23-n*.75,roof);
    for(const x of [-17,6,23]){
      box(street,.22,10,.22,x,5,-22.5,dark);box(street,2,.12,.12,x,9,-22.5,dark);
      box(street,17,.04,.04,x-8.5,9,-22.5,dark);
    }
    const sign=label(side%2?'LAJE DO CAOS':'VIELA DAS PROMESSAS','#ffd37e',8,.7);sign.position.set(0,3.7,-22.3);street.add(sign);
  }
  const planalto=roots.planalto;
  // The photographed Congress silhouette: low glass plinth, white twin slabs,
  // Chamber dome on the left and the shallow Senate bowl on the right.
  const congress=new T.Group();congress.position.set(18.9,0,-15);planalto.add(congress);
  box(congress,46,1.5,11,0,.8,0,glass);box(congress,47,.3,12,0,1.7,0,cream);
  for(let x=-22;x<=22;x+=1.7)box(congress,.12,1.6,.2,x,.85,5.55,cream);
  for(const x of [-2,2]){
    box(congress,2.65,22,3.8,x,12.85,-2.6,cream);
    // Narrow window strips sit on the sides; the concrete faces stay monumental.
    for(const dx of [-1.34,1.34]){
      box(congress,.025,20.9,3.1,x+dx,12.8,-2.6,glass);
      for(let y=2.6;y<23;y+=.65)box(congress,.04,.07,3.18,x+dx,y,-2.6,cream);
    }
    for(let y=3;y<24;y+=1.2)box(congress,2.65,.035,.025,x,y,-.685,marble[0]);
  }
  for(const y of [6,12.5,23.4])box(congress,1.4,.45,2.2,0,y,-2.6,cream);
  mesh(congress,domeGeo,cream,-11,1.9,.2).scale.y=.66;
  mesh(congress,bowlGeo,cream,11,1.9,.2);
  // Central rising ramp and broad lawns are outside the arena perimeter.
  for(let n=0;n<9;n++)box(congress,3.5,.2+n*.18,1.1,-3,.1+n*.09,13-n*.85,cream);
  box(planalto,62,.22,18,18.9,-.32,-20,grass);
  box(planalto,42,.06,2.5,18.9,-.02,-6.4,glass);
  for(const x of [-7,46])box(planalto,7,.12,43,x,-.1,18.9,grass);
  box(congress,.1,12,.1,3.7,7,-.7,dark);
  box(congress,1.4,.85,.04,4.4,12.2,-.7,grass);box(congress,.65,.5,.06,4.4,12.2,-.66,gold);
  const palace=new T.Group();palace.position.set(51,0,18.9);palace.rotation.y=-Math.PI/2;planalto.add(palace);
  box(palace,28,.4,8,0,.2,0,cream);box(palace,27,4.2,5,0,3,0,glass);box(palace,31,.5,9,0,5.4,0,cream);
  for(let x=-13;x<=13;x+=3.25)for(const z of [-3.6,3.6]){
    const column=box(palace,.38,5.3,.45,x,2.7,z,cream);column.rotation.z=(x<0?1:-1)*.13;
  }
  for(let n=0;n<8;n++){
    const x=1+n*5;
    box(planalto,.22,3,.22,x,1.5,44,dark);box(planalto,2.3,1.6,2,x,3,44,grass);
  }
  for(const root of Object.values(roots))batchStatic(root);
  return roots;
}
