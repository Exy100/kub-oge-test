import * as THREE from '../vendor/three.module.js';

import {createBugBody} from './workshop-bugs.js?v=2';
export function workshopModels(parent, geometry) {
  const palette = new Map();
  function cube(group,x,y,z,w,h,d,color) {
    if (!palette.has(color)) palette.set(color,new THREE.MeshStandardMaterial({color,roughness:.84}));
    const mesh = new THREE.Mesh(geometry,palette.get(color));
    mesh.position.set(x,y,z); mesh.scale.set(w,h,d);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function group(name,x,z) {
    const g = new THREE.Group();
    g.name=name; g.position.set(x,0,z); parent.add(g); return g;
  }
  let bugMaterial;
  function bug(i,x,z) {
    const g=group('repair-bug-'+i,x,z);
    if (!bugMaterial) bugMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78});
    const body=new THREE.Group();
    body.scale.y=1.25;
    g.add(body);
    const animate=createBugBody(body,i,bugMaterial);
    const hp=new THREE.Group();g.add(hp);hp.position.y=(i?1.58:1.36)*body.scale.y;
    cube(hp,0,0,0,1,.14,.045,0x293f39);
    const fill=cube(hp,0,0,.034,.93,.08,.025,0xe9aa70);
    return {g,hp,fill,animate};
  }
  function helper(x,z) {
    const g=group('friendly-program',x,z);
    cube(g,0,.72,0,.69,.68,.54,0x79c7b1);
    cube(g,0,.76,.28,.50,.4,.05,0x345c55);
    for(const a of [-.12,.12]) cube(g,a,.79,.32,.07,.08,.03,0xf8ecb0);
    cube(g,0,.65,.32,.15,.035,.03,0xf8ecb0);
    for(const a of [-.45,.45]) cube(g,a,.7,0,.18,.17,.17,0x9edac9);
    return g;
  }
  function part(item,i,x,z) {
    const g=group(item.id,x,z);
    const w=[.59,.91,.76,1,.69][i], d=[.59,.28,.29,.4,.64][i];
    cube(g,0,.25,0,w,i===4?.48:.16,d,item.color);
    const n=[1,4,2,2,3][i];
    for(let j=0;j<n;j++)cube(g,(j-(n-1)/2)*w/(n+1),i===4?.505:.36,0,w/(n+2),.05,d*.64,0x374b47);
    if(i!==4)cube(g,0,.24,d*.51,w*.76,.07,.04,0xe8c071);
    return g;
  }
  return {cube,group,bug,helper,part};
}
