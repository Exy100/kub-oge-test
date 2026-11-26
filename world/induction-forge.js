import * as THREE from '../vendor/three.module.js';

const duration = 1.46;
const clamp = v => Math.min(1,Math.max(0,v));

export function buildInductionForge(scene, box, empty, byteModel) {
  const jade=0x498a80, ivory=0xf0dfb9, slate=0x384d59, brass=0xb68a47;
  const metal=color=>new THREE.MeshStandardMaterial({color,metalness:.36,roughness:.42,flatShading:true});
  const winding=metal(0xb96d48), ceramic=metal(ivory), terminals=metal(brass);
  const sleeves=new THREE.CylinderGeometry(1,1,1,12);
  function cylinder(x,y,z,r,h,material){
    const part=new THREE.Mesh(sleeves,material);
    part.position.set(x,y,z);part.scale.set(r,h,r);part.castShadow=true;part.receiveShadow=true;
    scene.add(part);return part;
  }
  box(80,.13,-3.24,3.95,.26,2.48,slate,true);
  box(80,.58,-3.24,3.76,.80,2.32,jade,true);
  box(80,1.00,-3.24,3.94,.16,2.48,ivory,true);
  for(const side of [-1,1]){
    const x=80+side*1.17,z=-3.74;
    cylinder(x,1.20,z,.51,.24,terminals);
    cylinder(x,1.36,z,.43,.19,ceramic);
    cylinder(x,2.02,z,.29,1.22,ceramic);
    for(let j=0;j<7;j++)cylinder(x,1.55+j*.155,z,.355,.105,winding);
    cylinder(x,2.64,z,.42,.16,ceramic);
    cylinder(x,2.79,z,.35,.18,terminals);
    box(x-side*.21,2.49,z,.54,.12,.16,brass);
    box(x-side*.43,2.46,z,.15,.20,.21,ivory);
  }
  box(80,2.78,-3.76,2.22,.12,.17,slate);
  cylinder(80,1.18,-3.67,.48,.20,terminals);
  cylinder(80,1.31,-3.67,.36,.08,ceramic);
  const slots=[];
  for(let i=0;i<8;i++){
    const front=i>=4, x=79.04+(i%4)*.54, z=front?-2.20:-2.62, y=front?1.10:1.31;
    box(x,y,z,.52,.14,.48,brass).rotation.x=.44;
    const tile=box(x,y+.085,z+.035,.43,.13,.39,empty);
    tile.rotation.x=.44;tile.userData.forgeSlot=i;slots.push(tile);
  }
  box(81.36,1.14,-2.50,.51,.19,.70,slate);
  const indicator=metal(0xb4784b);
  const button=box(81.36,1.28,-2.47,.39,.16,.51,indicator);
  button.name='forge-start';
  const arrows=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.014,3),ceramic);
  arrows.position.set(81.36,1.366,-2.47);
  arrows.rotation.y=Math.PI/2;
  scene.add(arrows);
  arrows.userData.forgeStart=true;
  button.userData.forgeStart=true;
  const arcs=[];
  const core=new THREE.MeshBasicMaterial({color:0xfff2d6});
  const fringe=new THREE.MeshBasicMaterial({color:0xaca5ed});
  // Two converging ribbons per terminal. Their fixed vertices keep the discharge inexpensive.
  for(const side of [-1,1]){
    for(let branch=0;branch<2;branch++){
      const verts=[],indices=[];
      for(let j=0;j<=9;j++){
        const t=j/9, taper=Math.sin(Math.PI*t);
        const x=80+side*.74*(1-t),y=2.46-.57*t+taper*(Math.sin(j*2.54+side)*.10+branch*.13);
        const z=-3.74+.07*t+taper*(Math.cos(j*1.63+side)*.06+branch*.045);
        const w=(branch ? .013 : .027)*(.4+.6*taper);
        verts.push(x,y-w,z,x,y+w,z);
        if(j){const k=j*2;indices.push(k-2,k-1,k,k,k-1,k+1,k,k-1,k-2,k+1,k-1,k)}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);
      const arc=new THREE.Mesh(g,branch?fringe:core);arc.visible=false;scene.add(arc);arcs.push({arc,rest:Float32Array.from(verts)});
    }
  }
  const forming=byteModel.create();forming.visible=false;scene.add(forming);
  const sound=new Audio(new URL('../assets/audio/induction-forge.wav',import.meta.url).href);
  sound.preload='none';sound.volume=.55;
  let started=null;
  function stop(){
    started=null;sound.pause();forming.visible=false;
    winding.emissive.setHex(0);arcs.forEach(({arc})=>arc.visible=false);
  }
  return {slots,button,targets:[...slots,button,arrows],busy:()=>started!==null,
    setReady(ready){indicator.color.setHex(ready?0x69bba3:0xb4784b);indicator.emissive.setHex(ready?0x225240:0)},
    start(){started=performance.now()/1000;sound.currentTime=0;sound.play().catch(()=>{})},
    tick(time,reduced){
      if(started===null)return false;
      const t=clamp((time-started)/duration);
      if(t>=1){stop();return true}
      const pulse=Math.sin(Math.PI*clamp(t/.79));
      winding.emissive.setRGB(.45*pulse,.13*pulse,.035*pulse);
      arcs.forEach(({arc,rest},i)=>{
        arc.visible=t>(i<2 ? .27 : .34) && t<.74 && (!reduced || i%2===0);
        if(!arc.visible)return;
        const pos=arc.geometry.attributes.position;
        for(let j=0;j<=9;j++){
          const bend=reduced?0:.052*Math.sin(Math.PI*j/9)*Math.sin(t*21+j*1.8+i);
          for(const k of [2*j,2*j+1])pos.setY(k,rest[k*3+1]+bend);
        }
        pos.needsUpdate=true;
      });
      const grow=clamp((t-.37)/.36),travel=clamp((t-.74)/.26),ease=travel*travel*(3-2*travel);
      forming.visible=grow>0;
      forming.scale.setScalar(.12+.88*grow);
      forming.position.set(80+2.5*ease,1.89-.46*ease+(reduced?0:.20*Math.sin(Math.PI*ease)),-3.67+1.27*ease);
      forming.rotation.y=reduced?0:(1-ease)*grow*.8;
      return false;
    },stop};
}
