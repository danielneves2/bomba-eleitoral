import * as T from '../vendor/three.module.js';
import {loadCutout} from './cutouts-v7.js';

export function createPixelAssets({geometries,materials,textures}) {
  const cache=new Map(),geo=new T.PlaneGeometry(1,1);geometries.push(geo);
  return (name,size=1)=>{
    let mat=cache.get(name);
    if(!mat) {
      const texture=new T.Texture();textures.push(texture);
      texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;
      mat=new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.12,side:T.DoubleSide});materials.push(mat);cache.set(name,mat);
      let disposed=false;texture.addEventListener('dispose',()=>disposed=true);
      loadCutout(`/item-${name}-pixel-v11.png`).then(canvas=>{if(!disposed){texture.image=canvas;texture.needsUpdate=true;}}).catch(error=>console.error(`Unable to load ${name} sprite`,error));
    }
    const plane=new T.Mesh(geo,mat);plane.scale.setScalar(size);return plane;
  };
}
