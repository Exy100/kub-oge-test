import * as THREE from './vendor/three.module.js';
import { createForgeState, toggleBit, craftByte, insertByte, bitValue } from './forge-state.js';

export function createForge({ scene, box, solids, onOpen, onChange, notify }) {
  const state = createForgeState(), pickups = [], cells = [], slotMeshes = [];
  const dialog = document.querySelector('#forge-dialog');
  const prompt = document.querySelector('#forge-prompt');
  const geometry = new THREE.BoxGeometry(.6,.6,.6);
  let lastSecond = -1;
  function textureMaterial(text, size=110, color='#95b3c6') {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#4c6172';ctx.fillRect(0,0,256,256);
    ctx.fillStyle=color;ctx.fillRect(12,12,232,232);
    ctx.strokeStyle='#d6e9f2';ctx.lineWidth=5;ctx.strokeRect(23,23,210,210);
    ctx.fillStyle='#273e52';ctx.font=`bold ${size}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,135);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({map:texture,roughness:.65});
  }
  const digits=[textureMaterial('0'),textureMaterial('1')];
  const byteMaterial=textureMaterial('BYTE',62,'#b2d4d9');
  const emptyMaterial=new THREE.MeshStandardMaterial({color:0x384d59,roughness:.9});
  // Open-front workshop with a doorway in its back wall.
  box(76,2,-3,.6,4,6.5,0x819092,true);box(84,2,-3,.6,4,6.5,0x819092,true);
  box(77.3,2,-6,2,4,.6,0x819092,true);box(82.7,2,-6,2,4,.6,0x819092,true);
  box(80,4.1,-3,8.7,.45,6.8,0x526671,true);
  box(80,3.7,-6,3.4,.6,.6,0x647e86,true);
  const door=box(80,1.65,-6,3.4,3.3,.35,0x536b78,true);
  // Furnace and anvil provide a visible place to assemble the byte block.
  box(77.2,.65,-4.6,1.2,1.3,1.2,0x455461,true);
  box(77.2,.55,-3.98,.75,.55,.04,new THREE.MeshBasicMaterial({color:0xf4b77c}));
  box(77.2,2,-4.6,.65,1.4,.65,0x455461,true);
  box(80,.45,-3.2,2.6,.9,1.3,0x6b7471,true);
  box(80,1,-3.2,2.9,.22,1.55,0x3e505e,true);
  for(let i=0;i<8;i++){
    const m=box(79.1+(i%4)*.6,1.2,-3.5+Math.floor(i/4)*.6,.48,.18,.48,emptyMaterial);slotMeshes.push(m);
  }
  const output=new THREE.Mesh(geometry,byteMaterial);output.position.set(81.7,1.45,-3.2);scene.add(output);output.visible=false;
  for(let i=0;i<4;i++){
    const m=box(78.65+i*.9,3.65,-5.62,.65,.55,.25,emptyMaterial);cells.push(m);
  }
  function spawnBits(){
    if(state.crafted>=4)return;
    [[76,2],[78,2],[80,2],[82,2],[84,2],[76,4],[80,4],[84,4]].forEach(([x,z],i)=>{
      const m=new THREE.Mesh(geometry,Array(6).fill(digits[i%2]));m.position.set(x,.7,z);m.userData.seed=i;m.castShadow=true;scene.add(m);pickups.push(m);
    });
  }
  const slotsContainer=document.querySelector('#bit-slots'), cellsContainer=document.querySelector('#byte-cells');
  for(let i=0;i<8;i++){
    const b=document.createElement('button');b.type='button';b.className='bit-slot';b.dataset.slot=i;
    b.onclick=()=>{if(toggleBit(state,i))refresh()};slotsContainer.append(b);
  }
  for(let i=0;i<4;i++){
    const b=document.createElement('button');b.type='button';b.className='byte-cell';b.dataset.cell=i;
    b.onclick=()=>{if(insertByte(state,i)){refresh();if(state.unlocked)notify('✦ Четыре байта установлены! Дверь открыта — пройди к ней и нажми E.')}};cellsContainer.append(b);
  }
  function refresh(){
    document.querySelector('#bit-stock').textContent=state.bits;
    document.querySelector('#byte-stock').textContent=state.bytes;
    document.querySelector('#forge-count').textContent=`${state.cells.filter(Boolean).length} / 4`;
    document.querySelectorAll('.bit-slot').forEach((b,i)=>{
      b.classList.toggle('filled',state.slots[i]);b.textContent=state.slots[i]?String(bitValue(Math.floor(performance.now()/1000),i)):'+';
      b.setAttribute('aria-label',`Слот ${i+1}: ${state.slots[i]?'убрать бит':'установить бит'}`);
      b.disabled=state.crafted>=4||(!state.slots[i]&&!state.bits);
      slotMeshes[i].material=state.slots[i]?digits[i%2]:emptyMaterial;
    });
    document.querySelectorAll('.byte-cell').forEach((b,i)=>{
      b.classList.toggle('filled',state.cells[i]);b.textContent=state.cells[i]?'БАЙТ':`Ячейка ${i+1}`;
      b.disabled=state.cells[i]||state.bytes===0;b.setAttribute('aria-label',state.cells[i]?`Ячейка ${i+1} заполнена`:`Установить байт в ячейку ${i+1}`);
      cells[i].material=state.cells[i]?byteMaterial:emptyMaterial;
    });
    document.querySelector('#craft-byte').disabled=!state.slots.every(Boolean)||state.crafted>=4;
    document.querySelector('#fill-bits').disabled=state.bits===0||state.crafted>=4;
    document.querySelector('#forge-status').textContent=state.unlocked?'Дверь открыта. За ней — следующая локация.':state.crafted>=4?'Все 4 байта созданы. Установи их в свободные ячейки двери.':`Собрано байтов: ${state.crafted} из 4. После сборки появится новая партия битов.`;
    output.visible=state.bytes>0;
    door.visible=!state.unlocked;
    const index=solids.indexOf(door);
    if(state.unlocked&&index>=0)solids.splice(index,1);
    if(!state.unlocked&&index<0)solids.push(door);
    onChange();
  }
  document.querySelector('#fill-bits').onclick=()=>{for(let i=0;i<8;i++)if(!state.slots[i])toggleBit(state,i);refresh()};
  document.querySelector('#craft-byte').onclick=()=>{
    if(!craftByte(state))return;
    spawnBits();refresh();notify('8 бит = 1 байт. Установи новый блок в ячейку двери.');
  };
  document.querySelector('#forge-close').onclick=()=>dialog.close();
  const near=position=>Math.hypot(position.x-80,position.z+3.2)<2.8&&position.y<2;
  function open(position){if(!near(position))return false;onOpen();refresh();dialog.showModal();return true}
  prompt.onclick=()=>{onOpen();refresh();dialog.showModal()};
  spawnBits();
  return {state,pickups,open,isOpen:()=>dialog.open,
    collect(ray,position){
      const hits=ray.intersectObjects(pickups,false).filter(hit=>hit.object.position.distanceTo(position)<5);
      if(!hits.length)return false;
      const m=hits[0].object;scene.remove(m);pickups.splice(pickups.indexOf(m),1);state.bits++;refresh();notify(`Бит собран · в запасе ${state.bits}`);return true;
    },
    update(position,time,active){
      prompt.hidden=!active||!near(position)||dialog.open;
      if(!active)return;
      const second=Math.floor(time);
      if(second!==lastSecond){
        lastSecond=second;
        pickups.forEach(m=>m.material=Array(6).fill(digits[bitValue(second,m.userData.seed)]));
        document.querySelectorAll('.bit-slot').forEach((b,i)=>{if(state.slots[i])b.textContent=String(bitValue(second,i))});
        slotMeshes.forEach((m,i)=>{if(state.slots[i])m.material=digits[bitValue(second,i)]});
      }
      pickups.forEach((m,i)=>{m.rotation.y=time*.35+i;m.position.y=.7+Math.sin(time*2+i)*.08});
      output.rotation.y=time*.4;
    },
    reset(){pickups.forEach(m=>scene.remove(m));pickups.length=0;Object.assign(state,createForgeState());spawnBits();refresh()},
  };
}
