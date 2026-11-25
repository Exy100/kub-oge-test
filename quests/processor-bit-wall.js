import * as THREE from '../vendor/three.module.js';

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

export function buildBitWall({stage,box,player,launch,notify}) {
  const x=stage.center+6.6, z=-4.8;

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
  let layout, cubes=[], rims=[];
  function reveal(){
    if(layout)return;
    layout=stage.bitWall ??= newLayout();
    const materials=new Map();
    cubes=Array.from(bits,(bit,i)=>{
      const fixed=layout.fixed.includes(i), key=bit+fixed;
      if(!materials.has(key))materials.set(key,numberMaterial(bit,fixed));
      const cube=box(x,0,z,.49,.49,.49,materials.get(key));
      cube.name='repair-bit-'+i;
      cube.rotation.set(-.075,.095,0);
      return cube;
    });
    rims=places.slice(0,16).map(p=>{
      const rim=box(x+p.dx,p.y,z+.21,.65,.65,.10,0x73a89c);
      box(x+p.dx,p.y,z+.28,.59,.59,.09,0x193c40);
      return rim;
    });
    for(const p of places.slice(16))box(x+p.dx,p.y,z+.56,.56,.56,.04,0x26464b);
    cubes.forEach((_,i)=>settle(i));
  }
  function settle(i) {
    const at=layout.places[i], p=places[at];
    cubes[i].position.set(x+p.dx,p.y,z+(at<16?.42:.73));
    cubes[i].rotation.z=at<16?0:((i%5)-2)*.035;
  }
  if(stage.metRemontik || stage.unlocked)reveal();
  const sample=document.querySelector('#wall-sample');
  sample.querySelector('code').textContent=bytes.map(b=>b.slice(0,4)+' '+b.slice(4)).join(' · ');
  const point=new THREE.Vector3();
  const plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
  const beamGeometry=new THREE.BufferGeometry();
  const ends=new THREE.Float32BufferAttribute(new Float32Array(6),3);
  beamGeometry.setAttribute('position',ends);
  const beam=new THREE.Line(beamGeometry,new THREE.LineBasicMaterial({color:0x8cf6ea}));
  beam.visible=false;
  beam.frustumCulled=false;
  plate.parent.add(beam);
  let held=-1, highlighted=-1;
  function ready(){
    const p=player.position;
    return !!layout && !stage.unlocked && p.y<2 && Math.abs(p.x-x)<4.7 && p.z>z+.55 && p.z<z+5.2;
  }
  function highlight(slot){
    if(highlighted===slot)return;
    if(highlighted>=0)rims[highlighted].material.emissive.setHex(0);
    highlighted=slot;
    if(slot>=0)rims[slot].material.emissive.setHex(0x58dbc5);
  }
  function cancel(){
    if(held>=0)settle(held);
    held=-1;
    highlight(-1);
    beam.visible=false;
  }
  function begin(ray){
    if(!ready() || held>=0 || ray.direction.z>=0)return false;
    plate.parent.updateMatrixWorld(true);
    const hits=new THREE.Raycaster(ray.origin,ray.direction).intersectObjects(cubes,false);
    if(!hits.length)return false;
    const i=cubes.indexOf(hits[0].object);
    if(layout.fixed.includes(i))return false;
    held=i;
    return true;
  }
  function target(ray){
    if(ray.direction.z>=-.04)return -1;
    // The wall sockets and the shelf have different depths in the player's view.
    return places.findIndex((p,j)=>{
      plane.constant=-(z+(j<16?.53:.85));
      return ray.intersectPlane(plane,point) &&
        Math.abs(point.x-x-p.dx)<.33 && Math.abs(point.y-p.y)<.34;
    });
  }
  function move(ray,tip){
    if(held<0)return;
    if(!ready()){cancel();return}
    const slot=target(ray);
    highlight(slot>=0 && slot<16 && !layout.places.includes(slot)?slot:-1);
    plane.constant=-(z+1.03);
    if(ray.direction.z>=-.04 || !ray.intersectPlane(plane,point)){
      cancel();return;
    }
    point.x=THREE.MathUtils.clamp(point.x,x-3.65,x+3.65);
    point.y=THREE.MathUtils.clamp(point.y,.55,3.55);
    cubes[held].position.copy(point);
    ends.setXYZ(0,tip.x,tip.y,tip.z);
    ends.setXYZ(1,point.x,point.y,point.z);
    ends.needsUpdate=true;
    beam.visible=true;
  }
  function verify(){
    if(!ready() || layout.places.some(j=>j>=16))return;
    const bad=Array.from(bits).findIndex((bit,j)=>bits[layout.places.indexOf(j)]!==bit);
    if(bad>=0){notify('Сверь байт '+(1+Math.floor(bad/8))+' с образцом.');return}
    launch();
  }
  function drop(ray){
    if(held<0)return;
    const slot=ready()?target(ray):-1;
    if(slot>=0 && !layout.places.includes(slot))layout.places[held]=slot;
    cancel();
    if(slot>=0)verify();
  }
  function facesBoard(ray){
    plane.constant=-z;
    return ray.direction.z<0 && ray.intersectPlane(plane,point) &&
      Math.abs(point.x-x)<4.8 && point.y>-.5 && point.y<4.5;
  }
  function showSample(show){
    if(sample.hidden===show)sample.hidden=!show;
  }
  return {reveal,ready,facesBoard,begin,move,drop,cancel,verify,showSample,get holding(){return held>=0},
    dispose(){cancel();showSample(false)}};
}
