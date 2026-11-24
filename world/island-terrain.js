import * as THREE from '../vendor/three.module.js';
import { createTreeRenderer } from './trees.js';

const grassPalette = [0x9cbb76, 0x96b570, 0xa0bd79, 0x91b16b];

function grassColor(x, z) {
  return grassPalette[Math.abs(x * 13 + z * 7) % grassPalette.length];
}

export function buildIslandTerrain(location, index, root, geo, box, solids, cameraObstacles) {
  const createTree = createTreeRenderer(box);
  function renderTree(tree) {
    const parts = createTree(tree);
    cameraObstacles.push(...parts.filter(part => !solids.includes(part)));
    return parts;
  }
  if (index === 0) {
    // Floating voxel island, with a stepped rocky underside.
    box(0,-1.6,0,23,2.5,21,0x987a55);box(0,-3.4,0,20,1.5,18,0x7d8171);box(0,-4.7,0,15,1.2,14,0x8a8e7d);
    for(let x=-11;x<=11;x++)for(let z=-10;z<=10;z++){
      const tile=box(x,-.28,z,1,.55,1,grassColor(x,z));
      if (Math.abs(x)>3 || z < -3 || z > 1) tile.userData.scanSurface = 'grass';
    }
    for(let x=-3;x<=3;x++)for(let z=-3;z<=1;z++)box(x,.015,z,.98,.08,.98,0xded9bb);
    const islandTrunks = location.trees.flatMap(renderTree)
      .filter(mesh => mesh.name === 'island-tree-trunk');
    for (let i = 0; i < 30; i++) {
      const x = Math.sin(i * 43) * 10, z = Math.cos(i * 19) * 9;
      if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;
      const flowering = i % 3 === 0;
      const width = flowering ? .24 : .12;
      if (islandTrunks.some(trunk =>
        Math.abs(x - trunk.position.x) <= (trunk.scale.x + width) / 2 &&
        Math.abs(z - trunk.position.z) <= (trunk.scale.z + width) / 2)) continue;
      box(x,.15,z,.12,.3,.12,0x708d49);
      if (flowering) box(x,.35,z,width,.15,width,i%2 ? 0xf3dda1 : 0xece8cc);
    }
    [[8,-3],[-7,-2],[4,8]].forEach(([x,z])=>{box(x,.35,z,1.2,.7,1,0xa9ada0,true);box(x+.6,.2,z+.6,.7,.4,.8,0xb8b9ab,true)});
  } else if (location.id === 'island.three-arches') {
    box(40,-1.6,0,23,2.5,21,0x8d8266);box(40,-3.4,0,20,1.5,18,0x727e80);box(40,-4.7,0,15,1.2,14,0x8c9690);
    for(let x=-11;x<=11;x++)for(let z=-10;z<=10;z++){
      if(Math.abs(x)>9&&Math.abs(z)>8)continue;
      box(40+x,-.28,z,1,.55,1,[0x8bb59b,0x9cbea2,0x8eb4a0][Math.abs(x*13+z*7)%3]);
    }
    location.trees.forEach(renderTree);
    [[32,0],[48,1]].forEach(([x,z])=>box(x,.35,z,1.2,.7,1,0xa9ada0,true));
  } else {
    const center = location.center;
    box(center,-1.6,0,23,2.5,21,center===80?0x6e7b86:0x9c967b);
    box(center,-3.4,0,20,1.5,18,0x727e80);box(center,-4.7,0,15,1.2,14,0x8c9690);
    const grassFloor = ['island.turtle','island.processor-lab'].includes(location.id);
    const tiles=[];
    for(let x=-11;x<=11;x++)for(let z=-10;z<=10;z++)if(grassFloor || !(Math.abs(x)>9&&Math.abs(z)>8))tiles.push([center+x,z]);
    const ground=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({roughness:1}),tiles.length);
    const dummy=new THREE.Object3D();dummy.scale.set(1,.55,1);
    const palette = center === 80 ? [0x9daeb5,0x91a4af,0xa6b5b9] : [0xb8c58c,0xa9bd80,0xc7cf9a];
    tiles.forEach(([x,z],i)=>{
      dummy.position.set(x,-.28,z);
      dummy.updateMatrix();
      ground.setMatrixAt(i,dummy.matrix);
      const color = grassFloor ? grassColor(x-center,z) : palette[i % palette.length];
      ground.setColorAt(i,new THREE.Color(color));
    });
    ground.receiveShadow=true;root.add(ground);
    location.trees.forEach(renderTree);
    if (location.id === 'island.turtle') {
      for(const [x,z] of [[-8,2],[-7,-6],[3,7],[8,-7],[-3,5],[7,5]]) {
        box(center+x,.13,z,.10,.26,.10,0x71915c);
        box(center+x,.29,z,.27,.13,.23,0xe3b77c);
      }
      for(let j=0;j<5;j++)box(center-.15+(j%2)*.3,.025,2-j*1.65,.78,.09,.48,0xd4c6a1);
    }
    if (location.id === 'island.discovery-garden') {
      for(let i=0;i<10;i++)box(116+i%5*2,.15,-4+Math.floor(i/5)*3,.25,.3,.25,0xead9a1);
    }
  }
}
