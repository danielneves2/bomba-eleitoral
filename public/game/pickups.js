import * as T from '../vendor/three.module.js';

// Functional pickup symbols are solid voxel models, readable from the FPS camera.
export function createPickupFactory({ mesh, box, material, batchStatic, geometries, materials }) {
  const patterns = [
    ['.XXX.XXX.','XXXXXXXXX','X++XXXXXX','X+XXXXXXX','.XXXXXXX.','..XXXXX..','...XXX...','....X....'],
    ['OOOOOOOOO','OXXXXXXXO','OX++XXXXO','OXXXOXXXO','OXXOOOXXO','OXXXOXXXO','.OXXXXXO.','..OXXXO..','...OXO...','....O....'],
    ['....XX...','...XXX...','..XXXX...','.XXXXX...','XXXXXXXXX','...XXXXX.','...XXXX..','...XXX...','...XX....']
  ];
  const colors=[0xff3b59,0x3eafff,0xffc642];
  const palettes=colors.map(color=>({
    fill:material(color,color,.35),edge:material(0xf9e2a7),light:material(0xfff4e2,0xffffff,.18),
    side:material(new T.Color(color).multiplyScalar(.36))
  }));
  const ringGeo=new T.RingGeometry(.43,.49,24),shadowGeo=new T.CircleGeometry(.55,24);
  geometries.push(ringGeo,shadowGeo);
  const rings=colors.map(color=>new T.MeshBasicMaterial({color,transparent:true,opacity:.65,side:T.DoubleSide}));
  const shadow=new T.MeshBasicMaterial({color:0x080e18,transparent:true,opacity:.32,depthWrite:false});
  materials.push(...rings,shadow);
  return type=>{
    const root=new T.Group(),figure=new T.Group();root.add(figure);root.userData.figure=figure;
    const pattern=patterns[type],palette=palettes[type],pixel=.115;
    pattern.forEach((row,y)=>row.split('').forEach((value,x)=>{
      if(value==='.')return;
      const px=(x-4)*pixel,py=(pattern.length/2-y)*pixel;
      box(figure,pixel,pixel,.2,px,py,0,palette.side);
      box(figure,pixel*.96,pixel*.96,.045,px,py,.123,value==='O'?palette.edge:value==='+'?palette.light:palette.fill);
    }));
    batchStatic(figure);
    const ring=mesh(root,ringGeo,rings[type],0,.035,0);ring.rotation.x=-Math.PI/2;
    const shade=mesh(root,shadowGeo,shadow,0,.025,0);shade.rotation.x=-Math.PI/2;
    return root;
  };
}
