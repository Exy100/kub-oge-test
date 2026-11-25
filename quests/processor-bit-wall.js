import * as THREE from '../vendor/three.module.js';
import {createGatheringWand} from '../gathering-wand.js?v=18';

const bytes = Array.from(new TextEncoder().encode('Б'), n => n.toString(2).padStart(8,'0'));
const bits = bytes.join('');

function shuffled(values) {
  for (let i=values.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [values[i],values[j]] = [values[j],values[i]];
  }
  return values;
}

function newLayout() {
  const fixed = bytes.flatMap((byte,row) => {
    const order = shuffled(Array.from(byte,(_,i)=>i));
    const zero = order.find(i=>byte[i]==='0');
    const one = order.find(i=>byte[i]==='1');
    const third = order.find(i=>i!==zero && i!==one);
    return [zero,one,third].map(i=>row*8+i);
  });
  const loose = shuffled(Array.from(bits,(_,i)=>i).filter(i=>!fixed.includes(i)));
  return {fixed, places:Array.from(bits,(_,i)=>fixed.includes(i) ? i : 16+loose.indexOf(i))};
}

function numberMaterial(bit, fixed) {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=fixed?'#8eb8ad':'#ffebbb';
  ctx.fillRect(0,0,128,128);
  ctx.strokeStyle=fixed?'#567c74':'#c39e61';
  ctx.lineWidth=5;
  ctx.strokeRect(4,4,120,120);
  ctx.fillStyle='#213e41';
  ctx.font='bold 89px monospace';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(bit,64,68);
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map,roughness:.6});
}

export function buildBitWall({stage,box,dialog,launch}) {
  const x=stage.center+6.6, z=-4.8;
  const layout=stage.bitWall ??= newLayout();
  const plate=box(x,2.12,z,7.35,3.24,.36,0x24484a,true);
  for(const dx of [-3.38,3.38]) {
    box(x+dx,.65,z,.42,1.3,.65,0x345959,true);
    box(x+dx,.10,z,.74,.20,.89,0x294b4a,true);
    for(const y of [.61,3.63]){
      box(x+dx,y,z+.25,.51,.35,.18,0xc5ae80);
      box(x+dx,y,z+.36,.105,.105,.048,0x566664);
    }
    box(x+dx,2.12,z+.16,.14,3.15,.14,0x82a69a);
  }
  box(x,3.68,z+.2,7.22,.10,.15,0xc2a473);
  box(x,2.36,z+.22,6.38,.035,.05,0x76978a);
  box(x,1.0,z+.36,6.75,.84,.38,0x396365);
  box(x,.61,z+.42,6.82,.09,.66,0xb59461);
  for(const dx of [-3.36,3.36])box(x+dx,.86,z+.62,.10,.55,.76,0x739689);
  box(x,.62,z+.79,6.78,.15,.21,0x9bb2a0);
  const places=Array.from({length:26},(_,i)=>{
    if(i<16) {
      const col=i%8;
      return {dx:(col-3.5)*.73+(col<4?-.09:.09),y:2.94-Math.floor(i/8)*.97};
    }
    return {dx:(i-20.5)*.64,y:1.03+((i%2)*2-1)*.09};
  });
  const materials = new Map();
  const cubes=Array.from(bits,(bit,i)=>{
    const fixed=layout.fixed.includes(i), key=bit+fixed;
    if(!materials.has(key))materials.set(key,numberMaterial(bit,fixed));
    const cube=box(x,0,z,.49,.49,.49,materials.get(key));
    cube.rotation.set(-.075,.095,0);
    return cube;
  });
  const rims=places.slice(0,16).map(p=>{
    const rim=box(x+p.dx,p.y,z+.21,.65,.65,.10,0x73a89c);
    box(x+p.dx,p.y,z+.28,.59,.59,.09,0x193c40);
    return rim;
  });
  function settle(i) {
    const at=layout.places[i], p=places[at];
    cubes[i].position.set(x+p.dx,p.y,z+(at<16?.42:.73));
    cubes[i].rotation.z=at<16?0:((i%5)-2)*.035;
  }
  cubes.forEach((_,i)=>settle(i));
  const camera=new THREE.OrthographicCamera(-4,4,3,-3,2,60);
  camera.position.set(x,3.12,z+5.6);
  camera.lookAt(x,2.10,z+.4);
  camera.updateMatrixWorld();
  const point=new THREE.Vector3();
  const pointerRay=new THREE.Raycaster();
  const dragPlane=new THREE.Plane(new THREE.Vector3(0,0,1),-(z+.99));
  const wand=createGatheringWand();
  plate.parent.add(wand.root);
  wand.root.visible=false;
  wand.root.rotation.z=.55;
  wand.root.scale.setScalar(1.45);
  const beamShape=new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,.65,0),new THREE.Vector3(-.17,.99,-.16)
  ]);
  const beam=new THREE.Line(beamShape,new THREE.LineBasicMaterial({color:0x8cf6ea}));
  beam.visible=false;
  wand.root.add(beam);
  let buttons=[], unit=1, selected=-1, pointer=null, status, layer, active=false;
  let highlighted=-1;
  function highlight(slot){
    if(highlighted>=0)rims[highlighted].material.emissive.setHex(0);
    highlighted=slot>=0 && slot<16 && !layout.places.includes(slot) ? slot : -1;
    if(highlighted>=0)rims[highlighted].material.emissive.setHex(0x58dbc5);
  }
  function resize(){
    unit=Math.min(innerWidth/8.4,innerHeight/5.9);
    camera.left=-innerWidth/(2*unit); camera.right=-camera.left;
    camera.top=innerHeight/(2*unit); camera.bottom=-camera.top;
    camera.updateProjectionMatrix();
    buttons.forEach((btn,j)=>{
      const p=places[j];
      point.set(x+p.dx,p.y,z+(j<16?.60:.93)).project(camera);
      btn.style.left=((point.x+1)*50)+'%';
      btn.style.top=((1-point.y)*50)+'%';
      btn.style.width=btn.style.height=(unit*.61)+'px';
    });
  }
  function labels(){
    buttons.forEach((btn,j)=>{
      const i=layout.places.indexOf(j);
      const name=j<16?'Байт '+(1+Math.floor(j/8))+', ячейка '+(1+j%8):'Лоток '+(1+j-16);
      btn.setAttribute('aria-label',name+(i<0?' пусто':' · '+bits[i]));
      btn.disabled=layout.fixed.includes(i);
    });
  }
  function aim(dx,y){
    wand.root.position.set(x+dx+.94,y-1.09,z+1.38);
    if(selected>=0)cubes[selected].position.set(x+dx,y,z+.99);
  }
  function cancel(){
    highlight(-1);
    if(selected>=0)settle(selected);
    selected=-1;
    pointer=null;
    beam.visible=false;
    wand.animate(0,0);
  }
  function take(slot){
    const i=layout.places.indexOf(slot);
    if(i<0 || layout.fixed.includes(i))return false;
    cancel();
    selected=i;
    aim(places[slot].dx,places[slot].y);
    beam.visible=true;
    wand.animate(0,1);
    status.textContent='';
    return true;
  }
  function drop(slot){
    if(selected<0)return;
    if(slot>=0 && !layout.places.includes(slot))layout.places[selected]=slot;
    cancel();
    labels();
  }
  function slotAt(event){
    const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-wall-slot]');
    return target ? Number(target.dataset.wallSlot) : -1;
  }
  function close(){
    cancel();
    active=false;
    wand.root.visible=false;
    dialog.classList.remove('bit-wall-mode');
    window.removeEventListener('resize',resize);
    window.removeEventListener('blur',cancel);
    buttons=[];
  }
  function afterClose(){if(!dialog.open)close()}
  dialog.addEventListener('close',afterClose);
  function open(){
    cancel();
    active=true;
    dialog.classList.add('bit-wall-mode');
    dialog.querySelector('h2').textContent='Ремонт ядра';
    const body=dialog.querySelector('.field-body');
    body.innerHTML='<div class="wall-controls"></div><div class="wall-reference"><div><small>Образец · Б · UTF-8</small><code></code></div><button type="button" class="field-primary">Пуск</button><span role="status"></span></div>';
    body.querySelector('code').textContent=bytes.map(b=>b.slice(0,4)+' '+b.slice(4)).join('  ·  ');
    status=body.querySelector('[role=status]');
    status.textContent='Перетащи кубы жезлом в гнёзда.';
    layer=body.querySelector('.wall-controls');
    buttons=places.map((_,i)=>{
      const btn=document.createElement('button');
      btn.type='button';btn.dataset.wallSlot=i;
      btn.onclick=e=>{
        if(e.detail!==0)return;
        if(selected<0)take(i);else drop(i);
      };
      layer.append(btn);
      return btn;
    });
    labels();
    resize();
    wand.root.visible=true;
    aim(3.1,.8);
    layer.onpointerdown=e=>{
      if(e.button!==0 || pointer!==null)return;
      const slot=slotAt(e);
      if(!take(slot))return;
      pointer=e.pointerId;
      layer.setPointerCapture(pointer);
      e.preventDefault();
    };
    layer.onpointermove=e=>{
      if(pointer!==null && pointer!==e.pointerId)return;
      pointerRay.setFromCamera({x:2*e.clientX/innerWidth-1,y:1-2*e.clientY/innerHeight},camera);
      pointerRay.ray.intersectPlane(dragPlane,point);
      aim(point.x-x,point.y);
      if(selected>=0)highlight(slotAt(e));
    };
    layer.onpointerup=e=>{if(pointer===e.pointerId)drop(slotAt(e))};
    layer.onlostpointercapture=layer.onpointercancel=cancel;
    body.querySelector('.field-primary').onclick=()=>{
      cancel();
      const bad=Array.from(bits).findIndex((bit,slot)=>bits[layout.places.indexOf(slot)]!==bit);
      if(bad>=0){status.textContent='Сверь байт '+(1+Math.floor(bad/8))+' с образцом.';return}
      launch(status,close);
    };
    window.addEventListener('resize',resize);
    window.addEventListener('blur',cancel);
    dialog.showModal();
  }
  function inReach(position){
    return position.y<2 && Math.abs(position.x-x)<3.65 && position.z>z && position.z<z+2.6;
  }
  return {open,inReach,get camera(){return active?camera:null},dispose(){
    close();
    dialog.removeEventListener('close',afterClose);
    beamShape.dispose();beam.material.dispose();
    wand.root.removeFromParent();wand.dispose();
  }};
}
