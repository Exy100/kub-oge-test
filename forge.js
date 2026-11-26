import * as THREE from './vendor/three.module.js';
import { createForgeState, toggleBit, craftByte, collectByte, insertByte, bitValue } from './forge-state.js?v=5';
import { createByteFactory } from './byte-model.js?v=4';

import { socketFace } from './world/forge-finishes.js?v=2';
import { buildInductionForge } from './world/induction-forge.js?v=3';

export function createForge({ scene, box, solids, state=createForgeState(), remainingBits, onChange, notify, canStore=()=>true, onCollect=()=>{}, onPlace=()=>{} }) {
  const pickups=[],bytePickups=[],cells=[],deposited=[];
  const prompt=document.querySelector('#forge-prompt');
  const bag=document.querySelector('#forge-bag');
  const geometry=new THREE.BoxGeometry(.6,.6,.6);
  let lastSecond=-1;
  function textureMaterial(text,size=110,color='#95b3c6') {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#4c6172';ctx.fillRect(0,0,256,256);ctx.fillStyle=color;ctx.fillRect(12,12,232,232);
    ctx.strokeStyle='#d6e9f2';ctx.lineWidth=5;ctx.strokeRect(23,23,210,210);
    ctx.fillStyle='#273e52';ctx.font=`bold ${size}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,135);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({map:texture,roughness:.65});
  }
  const digits=[textureMaterial('0'),textureMaterial('1')],bytes=createByteFactory();
  const emptyMaterial=new THREE.MeshStandardMaterial({map:socketFace(),roughness:.82});
  const padMaterial=new THREE.MeshStandardMaterial({color:0xa99ab5,emissive:0x604970,emissiveIntensity:.15,roughness:.65});
  // The forge stays a workshop; the destination is now a separate ceremonial arch.
  box(76,2,-3,.6,4,6.5,0x819092,true);box(84,2,-3,.6,4,6.5,0x819092,true);
  box(80,2,-6,8.6,4,.6,0x819092,true);
  // A roof opening lets the island's daylight reach the coils and their control deck.
  box(80,4.1,-5.63,8.7,.45,1.54,0x526671,true);
  box(80,4.1,.11,8.7,.32,.58,0x526671,true);
  for(const x of [76.19,83.81])box(x,4.1,-2.51,1.08,.38,4.7,0x526671,true);
  const machine=buildInductionForge(scene,box,emptyMaterial,bytes);
  box(82.5,.45,-2,1.25,.9,1.6,0x7e6d82,true);box(82.5,.96,-2,1.35,.12,1.7,0xc9b88e,true);
  // Faceted pillars, warm inlays, a crown crystal and a translucent locked gate.
  for(const side of [-1,1]){
    const x=86+side*1.3;
    box(x,.16,-4,.9,.32,1,0x8a7994,true);
    for(let level=0;level<5;level++)box(x,.58+level*.46,-4,.61,.45,.67,level%2?0xc7bfae:0xb3a8b7,true);
    box(x,2.87,-4,.85,.3,.86,0xd1b879,true);
    for(let i=0;i<4;i++)box(x, .8+i*.48,-3.65,.13,.13,.025,0xd9bf86);
  }
  box(86,3.12,-4,3.35,.4,.75,0x8b769e,true);
  box(86,3.35,-4,2.5,.13,.55,0xd8bd80);
  const crown=new THREE.Mesh(new THREE.OctahedronGeometry(.25),new THREE.MeshStandardMaterial({color:0xbea1da,emissive:0x6a437b,emissiveIntensity:.3,metalness:.25,roughness:.3}));crown.position.set(86,3.75,-4);scene.add(crown);
  const door=box(86,1.5,-4,1.95,2.9,.13,new THREE.MeshStandardMaterial({color:0x8b729e,transparent:true,opacity:.46,roughness:.5}),true);
  const gateway=new THREE.Mesh(new THREE.PlaneGeometry(1.95,2.9),new THREE.MeshBasicMaterial({color:0xe6c4fd,side:THREE.DoubleSide,transparent:true,opacity:.4,depthWrite:false}));gateway.position.set(86,1.5,-4);gateway.visible=false;scene.add(gateway);
  // Raised 2x2 offering platform beside the arch, with four individually targetable sockets.
  box(88,.12,-1.5,2.05,.24,2.05,0x89798d,true);
  box(88,.3,-1.5,1.9,.14,1.9,0xd0bf96,true);
  for(let i=0;i<4;i++){
    const x=88+(i%2? .43:-.43),z=-1.5+(i<2?-.43:.43);
    const pad=box(x,.42,z,.74,.12,.74,padMaterial);pad.userData.cell=i;cells.push(pad);
    const rim=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.76,.13,.76)),new THREE.LineBasicMaterial({color:0xf2ddb2}));rim.position.copy(pad.position);scene.add(rim);
  }
  const bitPositions = [[76,2],[78,2],[80,2],[82,2],[84,2],[76,4],[80,4],[84,4]];
  function spawnBits(seeds = state.crafted < 4 ? bitPositions.keys() : []) {
    for (const i of seeds) {
      const [x,z] = bitPositions[i];
      const m=new THREE.Mesh(geometry,Array(6).fill(digits[i%2]));m.position.set(x,.7,z);m.userData.seed=i;m.userData.objectId='bit';m.castShadow=true;scene.add(m);pickups.push(m);
    }
  }
  function layoutBytes(){bytePickups.forEach((model,index)=>model.position.set(82.5,1.43+Math.floor(index/2)*.72,-2.4+(index%2)*.8))}
  function spawnByte(){
    const model=bytes.create();const index=bytePickups.length;
    model.position.set(82.5,1.43+Math.floor(index/2)*.72,-2.4+(index%2)*.8);model.userData.bytePickup=true;
    scene.add(model);bytePickups.push(model);layoutBytes();
  }
  function refresh(){
    document.querySelector('#bag-bits').textContent=state.bits;
    document.querySelector('#bag-bytes').textContent=state.bytes;
    machine.slots.forEach((m,i)=>{
      m.material=state.slots[i]?digits[i%2]:emptyMaterial;
      m.scale.y=state.slots[i] ? .26 : .13;
    });
    machine.setReady(state.slots.every(Boolean) && !machine.busy());
    door.visible=!state.unlocked;gateway.visible=state.unlocked;
    const index=solids.indexOf(door);if(state.unlocked&&index>=0)solids.splice(index,1);if(!state.unlocked&&index<0)solids.push(door);
    padMaterial.emissiveIntensity=state.bytes>0?.42:.12;onChange();
  }
  const near=position=>Math.hypot(position.x-80,position.z+3.2)<3.6 && position.y<2;
  function operate(target,position,remove){
    if(!near(position) || machine.busy())return false;
    if(target.userData.forgeStart){
      if(remove)return false;
      if(!state.slots.every(Boolean)){notify('Для запуска вставь все восемь битов.');return false}
      machine.start();machine.setReady(false);return true;
    }
    const i=target.userData.forgeSlot;
    if (i===undefined || state.slots[i]!==remove) return false;
    if(remove && !canStore('bit'))return false;
    if(!toggleBit(state,i)){if(!state.bits)notify('Подбери куб-бит на острове.');return false}
    onPlace();refresh();return true;
  }
  function showDeposit(i) {
    const model = bytes.create();
    model.position.copy(cells[i].position);
    model.position.y = .83;
    scene.add(model);
    deposited.push(model);
  }
  spawnBits(remainingBits);
  for (let i = 0; i < state.pendingBytes; i++) spawnByte();
  state.cells.forEach((filled,i) => { if (filled) showDeposit(i); });
  refresh();
  return {state,pickups,bytePickups,cells,deposited,cameraObstacles:[gateway],
    collect(ray,position,remove=false){
      const hits=ray.intersectObjects([...pickups,...bytePickups,...cells,...machine.targets],true).filter(hit=>hit.point.distanceTo(position)<5);
      if(!hits.length)return false;
      const hit=hits[0];
      const obstruction=ray.intersectObjects(solids,false)[0];if(obstruction&&obstruction.distance<hit.distance-.02)return false;
      if(machine.targets.includes(hit.object))return operate(hit.object,position,remove);
      if(remove)return false;
      let root=hit.object;while(root.parent&&!root.userData.bytePickup&&root.userData.cell===undefined&&!pickups.includes(root))root=root.parent;
      if(pickups.includes(root)){
        if(!canStore('bit'))return false;
        scene.remove(root);pickups.splice(pickups.indexOf(root),1);onCollect(root);state.bits++;refresh();notify(`Бит в сумке · всего ${state.bits}`);return true;
      }
      if(root.userData.bytePickup){
        if(!canStore('byte')||!collectByte(state))return false;
        scene.remove(root);bytePickups.splice(bytePickups.indexOf(root),1);onCollect(root);layoutBytes();refresh();notify(`Байт в сумке · всего ${state.bytes}. Площадка ждёт у арки справа.`);return true;
      }
      if(root.userData.cell!==undefined){
        const i=root.userData.cell;if(state.cells[i])return false;
        if(!insertByte(state,i)){notify('Сначала забери готовый байт с подставки у верстака.');return false}
        showDeposit(i);onPlace();refresh();
        notify(state.unlocked?'✦ Четыре байта на площадке! Врата в арке открылись — нажми E рядом с ними.':`Байт установлен · ${state.cells.filter(Boolean).length} из 4`);return true;
      }
      return false;
    },
    update(position,time,active,building=true,reduced=false){
      prompt.hidden=!active||!building||!near(position);bag.hidden=!active;
      if(!prompt.hidden){
        const filled=state.slots.filter(Boolean).length;
        const hint=machine.busy()?'Идёт сборка байта':filled===8?'ЛКМ по зелёной кнопке · запустить катушки':state.crafted===4?'Четыре байта готовы':`ЛКМ по гнезду · вставить бит (${filled}/8) · ПКМ — забрать`;
        if(prompt.textContent!==hint)prompt.textContent=hint;
      }
      if(!active)return;
      if(machine.tick(time,reduced,bytePickups.length) && craftByte(state)){
        spawnByte();spawnBits();refresh();notify('Байт готов! Забери куб с подставки справа.');
      }
      const second=Math.floor(time);
      if(second!==lastSecond){
        lastSecond=second;pickups.forEach(m=>m.material=Array(6).fill(digits[bitValue(second,m.userData.seed)]));
        machine.slots.forEach((m,i)=>{if(state.slots[i])m.material=digits[bitValue(second,i)]});
      }
      pickups.forEach(m=>{const phase=m.userData.seed;m.rotation.y=time*.35+phase;m.position.y=.7+Math.sin(time*2+phase)*.08});
      for(const model of bytePickups)bytes.animate(model,time,reduced);
      for(const model of deposited)bytes.animate(model,time,reduced);
      crown.rotation.y=time*.45;gateway.material.opacity=.38+Math.sin(time*2)*.1;
    },
    dispose(resources) {
      // Some pickups may already have flown out of the scene.
      for (const item of [geometry, emptyMaterial, emptyMaterial.map, ...digits, ...bytes.resources]) resources.add(item);
      for (const digit of digits) resources.add(digit.map);
      prompt.hidden = bag.hidden = true;
      machine.dispose();
    },
    reset(){
      machine.stop();
      [...pickups,...bytePickups,...deposited].forEach(m=>scene.remove(m));pickups.length=bytePickups.length=deposited.length=0;
      Object.assign(state,createForgeState());spawnBits();refresh();
    },
  };
}
