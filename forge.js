import * as THREE from './vendor/three.module.js';
import { createForgeState, toggleBit, craftByte, collectByte, insertByte, bitValue } from './forge-state.js?v=5';
import { createByteFactory } from './byte-model.js';

export function createForge({ scene, box, solids, onOpen, onChange, notify }) {
  const state=createForgeState(),pickups=[],bytePickups=[],cells=[],deposited=[],slotMeshes=[];
  const dialog=document.querySelector('#forge-dialog'),prompt=document.querySelector('#forge-prompt');
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
  const digits=[textureMaterial('0'),textureMaterial('1')],bytes=createByteFactory(digits);
  const emptyMaterial=new THREE.MeshStandardMaterial({color:0x384d59,roughness:.9});
  const padMaterial=new THREE.MeshStandardMaterial({color:0xa99ab5,emissive:0x604970,emissiveIntensity:.15,roughness:.65});
  // The forge stays a workshop; the destination is now a separate ceremonial arch.
  box(76,2,-3,.6,4,6.5,0x819092,true);box(84,2,-3,.6,4,6.5,0x819092,true);
  box(80,2,-6,8.6,4,.6,0x819092,true);box(80,4.1,-3,8.7,.45,6.8,0x526671,true);
  box(77.2,.65,-4.6,1.2,1.3,1.2,0x455461,true);
  box(77.2,.55,-3.98,.75,.55,.04,new THREE.MeshBasicMaterial({color:0xf4b77c}));
  box(77.2,2,-4.6,.65,1.4,.65,0x455461,true);
  box(80,.45,-3.2,2.6,.9,1.3,0x6b7471,true);box(80,1,-3.2,2.9,.22,1.55,0x3e505e,true);
  for(let i=0;i<8;i++)slotMeshes.push(box(79.1+(i%4)*.6,1.2,-3.5+Math.floor(i/4)*.6,.48,.18,.48,emptyMaterial));
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
  function spawnBits(){
    if(state.crafted>=4)return;
    [[76,2],[78,2],[80,2],[82,2],[84,2],[76,4],[80,4],[84,4]].forEach(([x,z],i)=>{
      const m=new THREE.Mesh(geometry,Array(6).fill(digits[i%2]));m.position.set(x,.7,z);m.userData.seed=i;m.castShadow=true;scene.add(m);pickups.push(m);
    });
  }
  function layoutBytes(){bytePickups.forEach((model,index)=>model.position.set(82.5,1.43+Math.floor(index/2)*.72,-2.4+(index%2)*.8))}
  function spawnByte(){
    const model=bytes.create();const index=bytePickups.length;
    model.position.set(82.5,1.43+Math.floor(index/2)*.72,-2.4+(index%2)*.8);model.userData.bytePickup=true;
    scene.add(model);bytePickups.push(model);layoutBytes();
  }
  const slotsContainer=document.querySelector('#bit-slots'),cellsContainer=document.querySelector('#byte-cells');
  for(let i=0;i<8;i++){
    const button=document.createElement('button');button.type='button';button.className='bit-slot';button.dataset.slot=i;
    button.onclick=()=>{if(toggleBit(state,i))refresh()};slotsContainer.append(button);
  }
  for(let i=0;i<4;i++){
    const cell=document.createElement('div');cell.className='byte-cell';cell.dataset.cell=i;cellsContainer.append(cell);
  }
  function refresh(){
    document.querySelector('#bit-stock').textContent=state.bits;document.querySelector('#byte-stock').textContent=state.bytes;
    document.querySelector('#bag-bits').textContent=state.bits;document.querySelector('#bag-bytes').textContent=state.bytes;
    document.querySelector('#forge-count').textContent=`${state.cells.filter(Boolean).length} / 4`;
    document.querySelectorAll('.bit-slot').forEach((button,i)=>{
      button.classList.toggle('filled',state.slots[i]);button.textContent=state.slots[i]?String(bitValue(performance.now()/1000,i)):'+';
      button.setAttribute('aria-label',`Слот ${i+1}: ${state.slots[i]?'убрать бит':'установить бит'}`);
      button.disabled=state.crafted>=4||(!state.slots[i]&&!state.bits);slotMeshes[i].material=state.slots[i]?digits[i%2]:emptyMaterial;
    });
    document.querySelectorAll('.byte-cell').forEach((cell,i)=>{
      cell.classList.toggle('filled',state.cells[i]);cell.textContent=state.cells[i]?'БАЙТ':`Место ${i+1}`;
      cell.setAttribute('aria-label',`Место ${i+1} на площадке: ${state.cells[i]?'заполнено':'свободно'}`);
    });
    document.querySelector('#craft-byte').disabled=!state.slots.every(Boolean)||state.crafted>=4;
    document.querySelector('#fill-bits').disabled=state.bits===0||state.crafted>=4;
    document.querySelector('#forge-status').textContent=state.unlocked?'Врата в арке открыты. Подойди к ним и нажми E.':state.pendingBytes>0?`На подставке у верстака: ${state.pendingBytes}. Закрой кузницу и забери байты в сумку — ЛКМ.`:state.bytes>0?`В сумке ${state.bytes} байт. Выложи их на свободные места площадки справа от арки — ЛКМ.`:`Создано байтов: ${state.crafted} из 4. После сборки появится новая партия битов.`;
    door.visible=!state.unlocked;gateway.visible=state.unlocked;
    const index=solids.indexOf(door);if(state.unlocked&&index>=0)solids.splice(index,1);if(!state.unlocked&&index<0)solids.push(door);
    padMaterial.emissiveIntensity=state.bytes>0?.42:.12;onChange();
  }
  document.querySelector('#fill-bits').onclick=()=>{for(let i=0;i<8;i++)if(!state.slots[i])toggleBit(state,i);refresh()};
  document.querySelector('#craft-byte').onclick=()=>{
    if(!craftByte(state))return;spawnByte();spawnBits();refresh();notify('Байт готов! Закрой кузницу и забери прозрачный куб с подставки — ЛКМ.');
  };
  document.querySelector('#forge-close').onclick=()=>dialog.close();
  const near=position=>Math.hypot(position.x-80,position.z+3.2)<2.8&&position.y<2;
  function open(position){if(!near(position))return false;onOpen();refresh();dialog.showModal();return true}
  prompt.onclick=()=>{onOpen();refresh();dialog.showModal()};
  spawnBits();
  return {state,pickups,bytePickups,cells,deposited,cameraObstacles:[gateway],open,isOpen:()=>dialog.open,
    collect(ray,position){
      const hits=ray.intersectObjects([...pickups,...bytePickups,...cells],true).filter(hit=>hit.point.distanceTo(position)<5);
      if(!hits.length)return false;
      const hit=hits[0];
      const obstruction=ray.intersectObjects(solids,false)[0];if(obstruction&&obstruction.distance<hit.distance-.02)return false;
      let root=hit.object;while(root.parent&&!root.userData.bytePickup&&root.userData.cell===undefined&&!pickups.includes(root))root=root.parent;
      if(pickups.includes(root)){
        scene.remove(root);pickups.splice(pickups.indexOf(root),1);state.bits++;refresh();notify(`Бит в сумке · всего ${state.bits}`);return true;
      }
      if(root.userData.bytePickup){
        if(!collectByte(state))return false;
        scene.remove(root);bytePickups.splice(bytePickups.indexOf(root),1);layoutBytes();refresh();notify(`Байт в сумке · всего ${state.bytes}. Площадка ждёт у арки справа.`);return true;
      }
      if(root.userData.cell!==undefined){
        const i=root.userData.cell;if(state.cells[i])return false;
        if(!insertByte(state,i)){notify('Сначала забери готовый байт с подставки у верстака.');return false}
        const model=bytes.create();model.position.copy(cells[i].position);model.position.y=.83;scene.add(model);deposited.push(model);refresh();
        notify(state.unlocked?'✦ Четыре байта на площадке! Врата в арке открылись — нажми E рядом с ними.':`Байт установлен · ${state.cells.filter(Boolean).length} из 4`);return true;
      }
      return false;
    },
    update(position,time,active){
      prompt.hidden=!active||!near(position)||dialog.open;bag.hidden=!active;
      if(!active)return;
      const second=Math.floor(time);
      if(second!==lastSecond){
        lastSecond=second;pickups.forEach(m=>m.material=Array(6).fill(digits[bitValue(second,m.userData.seed)]));
        document.querySelectorAll('.bit-slot').forEach((button,i)=>{if(state.slots[i])button.textContent=String(bitValue(second,i))});
        slotMeshes.forEach((m,i)=>{if(state.slots[i])m.material=digits[bitValue(second,i)]});
      }
      pickups.forEach(m=>{const phase=m.userData.seed;m.rotation.y=time*.35+phase;m.position.y=.7+Math.sin(time*2+phase)*.08});
      bytePickups.forEach(m=>{m.rotation.y=Math.sin(time*.5)*.25;bytes.animate(m,time)});deposited.forEach(m=>bytes.animate(m,time));
      crown.rotation.y=time*.45;gateway.material.opacity=.38+Math.sin(time*2)*.1;
    },
    reset(){
      [...pickups,...bytePickups,...deposited].forEach(m=>scene.remove(m));pickups.length=bytePickups.length=deposited.length=0;
      Object.assign(state,createForgeState());spawnBits();refresh();
    },
  };
}
