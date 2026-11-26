import * as THREE from '../vendor/three.module.js';

import { createForgeDischarge } from './forge-discharge.js';
import { brushedFinish, ignitionCap, ventCover } from './forge-finishes.js';

const duration = 1.46;
const clamp = v => Math.min(1,Math.max(0,v));

// Normalized bevelled casting shared by the housing, top and foot; their box colliders stay intact.
function casingGeometry(){
  const outline=[[-.43,-.5],[-.5,-.43],[-.5,.43],[-.43,.5],[.43,.5],[.5,.43],[.5,-.43],[.43,-.5]];
  const pos=[],ix=[];
  for(const [y,r] of [[-.5,.96],[-.36,1],[.31,1],[.5,.96]]){
    for(const [x,z] of outline)pos.push(x*r,y,z*r);
  }
  for(let row=0;row<3;row++)for(let i=0;i<8;i++){
    const a=row*8+i,b=row*8+(i+1)%8;
    ix.push(a,b,b+8,a,b+8,a+8);
  }
  for(let i=1;i<7;i++)ix.push(24,24+i,25+i,0,i+1,i);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ix);
  const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return flat;
}

export function buildInductionForge(scene, box, empty, byteModel) {
  const ivory=0xf0dfb9, slate=0x384d59, brass=0xb68a47;
  const metal=color=>new THREE.MeshStandardMaterial({color,metalness:.36,roughness:.42,flatShading:true});
  const winding=brushedFinish(0xde8650,.42), ceramic=brushedFinish(0xffebca,.12), terminals=brushedFinish(0xe3ad64,.46);
  const enamel=brushedFinish(0x599a89,.18), dark=brushedFinish(0x344a51);
  const socketTrim=brushedFinish(0xd0a061), charged=new THREE.MeshBasicMaterial({color:0xffcc79});
  function mesh(shape,material,x,y,z){
    const m=new THREE.Mesh(shape,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;
  }
  const travellingTurns=[];
  function windingPath(turns,rise,radius){
    const pts=[];
    for(let i=0;i<=turns*18;i++){
      const t=i/(turns*18),a=t*turns*Math.PI*2;
      pts.push(new THREE.Vector3(Math.cos(a)*radius,t*rise,Math.sin(a)*radius));
    }
    return new THREE.CatmullRomCurve3(pts);
  }
  const helix=new THREE.TubeGeometry(windingPath(6,1.00,.328),108,.070,8,false);
  const hotTurn=new THREE.TubeGeometry(windingPath(1,1/6,.328),18,.073,8,false);
  const sleeves=new THREE.CylinderGeometry(1,1,1,12);
  function cylinder(x,y,z,r,h,material){
    const part=new THREE.Mesh(sleeves,material);
    part.position.set(x,y,z);part.scale.set(r,h,r);part.castShadow=true;part.receiveShadow=true;
    scene.add(part);return part;
  }
  const casting=casingGeometry();
  box(80,.13,-3.24,3.95,.26,2.48,slate,true).geometry=casting;
  box(80,.58,-3.24,3.76,.80,2.32,enamel,true).geometry=casting;
  box(80,1.00,-3.24,3.94,.16,2.48,ceramic,true).geometry=casting;
  for(const side of [-1,1]){
    const x=80+side*1.17,z=-3.74;
    cylinder(x,1.20,z,.51,.24,terminals);
    cylinder(x,1.36,z,.43,.19,ceramic);
    cylinder(x,2.02,z,.29,1.22,ceramic);
    mesh(helix,winding,x,1.51,z);
    const runner=mesh(hotTurn,charged,x,1.51,z);runner.visible=false;travellingTurns.push(runner);
    cylinder(x,1.46,z,.382,.06,dark);cylinder(x,2.57,z,.373,.06,dark);
    for(const dx of [-.31,.31]){
      const stud=cylinder(x+dx,1.331,z+.17,.052,.06,terminals);stud.rotation.y=.36;
    }
    cylinder(x,2.64,z,.42,.16,ceramic);
    cylinder(x,2.79,z,.35,.18,terminals);
    box(x-side*.27,2.49,z,.6,.16,.21,terminals);
    box(x-side*.43,2.46,z,.15,.20,.21,ivory);
  }
  box(80,2.78,-3.76,2.22,.12,.17,slate);
  box(80,2.78,-3.76,.46,.24,.34,brass);
  cylinder(80,2.57,-3.76,.12,.19,ceramic);
  // Feet, access panel and inset vents give the bench a readable front at eye level.
  for(const dx of [-1.65,1.65]){
    for(const dz of [-.91,.91])box(80+dx,.12,-3.24+dz,.49,.24,.50,slate);
  }
  box(79.74,.61,-2.058,2.42,.56,.06,slate);
  const face=mesh(new THREE.PlaneGeometry(2.38,.53),new THREE.MeshStandardMaterial({map:ventCover(),roughness:.66}),79.74,.61,-2.022);
  face.castShadow=false;
  // Riveted corner bands and a recessed control deck frame the controls.
  for(const side of [-1,1]){
    box(80+side*1.77,.63,-2.06,.15,.69,.10,socketTrim);
    box(80+side*1.77,.28,-2.04,.21,.12,.16,dark);
  }
  box(79.85,1.13,-2.43,2.35,.16,1.04,dark).rotation.x=.44;
  box(81.43,.58,-2.052,.43,.48,.07,brass);
  box(81.43,.58,-2.005,.23,.28,.04,ivory);
  cylinder(80,1.18,-3.67,.48,.20,terminals);
  cylinder(80,1.31,-3.67,.36,.08,ceramic);
  const slots=[];
  for(let i=0;i<8;i++){
    const front=i>=4, x=79.04+(i%4)*.54, z=front?-2.20:-2.62, y=front?1.10:1.31;
    box(x,y,z,.52,.14,.48,socketTrim).rotation.x=.44;
    const tile=box(x,y+.085,z+.035,.43,.13,.39,empty);
    tile.rotation.x=.44;tile.userData.forgeSlot=i;slots.push(tile);
  }
  // Angled, guarded push-button. The engraved cap and its moving plunger share a hit target.
  const bx=81.38,bz=-2.46,tilt=.62;
  const cradle=box(bx,1.21,bz,.80,.26,.86,dark);cradle.rotation.x=tilt;
  for(const side of [-1,1]){
    const guard=box(bx+side*.358,1.35,bz,.072,.21,.76,terminals);guard.rotation.x=tilt;
  }
  function buttonDisc(radius,height,offset,material){
    const m=cylinder(bx,1.32+Math.cos(tilt)*offset,bz+Math.sin(tilt)*offset,radius,height,material);
    m.rotation.x=tilt;return m;
  }
  buttonDisc(.327,.085,0,terminals);
  const indicator=metal(0x657d70);
  buttonDisc(.287,.056,.055,indicator);
  buttonDisc(.249,.06,.084,dark);
  const button=buttonDisc(.224,.096,.139,brushedFinish(0xe07341,.15));
  button.name='forge-start';button.userData.forgeStart=true;
  const cap=mesh(new THREE.CircleGeometry(.215,32),new THREE.MeshStandardMaterial({map:ignitionCap(),roughness:.36}),0,0,0);
  cap.rotation.x=tilt-Math.PI/2;cap.userData.forgeStart=true;
  const home=button.position.clone();
  function press(depth){
    button.position.copy(home);
    button.translateY(-depth);
    cap.position.copy(button.position);
    cap.translateZ(.05);
  }
  press(0);
  const discharge=createForgeDischarge(scene);
  const forming=byteModel.create();forming.visible=false;scene.add(forming);
  const sound=new Audio(new URL('../assets/audio/induction-forge.wav',import.meta.url).href);
  sound.preload='auto';sound.volume=.55;
  let started=null;
  function stop(){
    started=null;sound.pause();forming.visible=false;
    press(0);travellingTurns.forEach(turn=>turn.visible=false);winding.emissive.setHex(0);discharge.hide();
  }
  return {slots,button,targets:[...slots,button,cap],busy:()=>started!==null,
    setReady(ready){indicator.color.setHex(ready?0x80e9bc:0x718678);indicator.emissive.setHex(ready?0x438b60:0)},
    start(){started=performance.now()/1000;sound.currentTime=0;sound.play().catch(()=>{})},
    tick(time,reduced,waitingBytes){
      if(started===null)return false;
      const t=clamp((time-started)/duration);
      if(t>=1){stop();return true}
      press(.065*Math.sin(Math.PI*clamp(t/.23)));
      travellingTurns.forEach((turn,i)=>{
        const q=clamp((t-i*.045)/.45);
        turn.visible=q>0 && q<1 && !reduced;
        turn.position.y=1.51+q*5/6;
        turn.rotation.y=-q*Math.PI*10;
      });
      const pulse=Math.sin(Math.PI*clamp(t/.79));
      winding.emissive.setRGB(.45*pulse,.13*pulse,.035*pulse);
      discharge.update(t,reduced);
      const grow=clamp((t-.41)/.27),travel=clamp((t-.74)/.26),ease=travel*travel*(3-2*travel);
      forming.visible=grow>0;
      if(forming.visible)byteModel.animate(forming,time,reduced);
      forming.scale.setScalar(.10+.90*grow+(reduced?0:.13*Math.sin(Math.PI*clamp((t-.67)/.13))));
      forming.position.set(80+2.5*ease,1.89+(-.46+Math.floor(waitingBytes/2)*.72)*ease+(reduced?0:.20*Math.sin(Math.PI*ease)),-3.67+(1.27+(waitingBytes%2)*.8)*ease);
      forming.rotation.y=reduced?0:Math.PI*.72*(1-grow)+(1-ease)*grow*.23;
      return false;
    },stop};
}
