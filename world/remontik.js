import * as THREE from '../vendor/three.module.js';
import {paintedPart} from './painted-part.js';

const green=0x426c52, ivory=0xe1d6ac, brass=0xd2a452, graphite=0x344447;
const shoulderX=side=>side<0?-.55:.65;
const ease=t=>t*t*(3-2*t);
const clamp=t=>Math.max(0,Math.min(1,t));

export function createRemontik(parent,x,z) {
  const root=new THREE.Group();
  root.name='Ремонтик, модель 1';
  root.position.set(x,0,z);
  parent.add(root);
  root.rotation.y=.32;
  const body=new THREE.Group();
  root.add(body);
  const finish=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.58,metalness:.15,side:THREE.DoubleSide});
  const glow=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
  const part=(parent,name,paint,material=finish)=>paintedPart(parent,name,material,paint);
  const shell=part(body,'remontik-shell',({block})=>{
    block(0,0,0,.88,.74,.66,green,.10);
    block(0,.402,-.07,.42,.09,.33,graphite);
    block(0,.464,-.07,.24,.09,.21,brass);
    block(.46,.01,0,.14,.28,.31,ivory);
    block(.54,.01,0,.04,.18,.21,graphite);
    block(.565,.01,0,.02,.10,.13,0x71dacf);
    for(const side of [-1,1]){
      // Fixed bearing seats the moving shoulder beyond the side casing.
      const outer=shoulderX(side);
      block((side*.41+outer)/2,-.14,.13,Math.abs(outer)-.41,.15,.16,graphite,.025);
      block(outer,-.14,.13,.075,.17,.17,brass,.034);
      block(side*.30,-.36,0,.19,.11,.33,graphite);
      block(side*.30,-.425,0,.14,.032,.24,0x75e6de);
      for(let i=0;i<4;i++)block(side*.445,.15-i*.079,-.14,.018,.033,.15,graphite);
    }
    block(0,-.04,-.33,.55,.49,.055,0x668573);
    for(let i=0;i<5;i++)block(0,.11-i*.075,-.366,.39,.028,.018,graphite);
  });
  function rim(w,h,k,z) {
    return [[-w+k,-h],[w-k,-h],[w,-h+k],[w,h-k],[w-k,h],[-w+k,h],[-w,h-k],[-w,-h+k]].map(([x,y])=>[x,y,z]);
  }
  part(shell,'remontik-lens',({band,face})=>{
    const outer=rim(.435,.365,.095,.332), lip=rim(.410,.341,.089,.399);
    const bezel=rim(.357,.294,.075,.406), glass=rim(.334,.273,.065,.427);
    band(outer,lip,0xb78b48);band(lip,bezel,brass);band(bezel,glass,graphite);
    const pane=rim(.30,.241,.055,.451);
    band(glass,pane,0x456d73);face(pane,0x274c56);
    face([[-.29,.16,.452],[-.16,.23,.452],[-.095,.23,.452],[-.27,.13,.452]],0x669293);
  });
  const eyes=part(shell,'remontik-eyes',({block})=>{
    for(const side of [-1,1])block(side*.137,0,.456,.075,.142,.016,0x7fffee,.01);
  },glow);

  function joint(parent,x,y,z){
    const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;
  }
  function link(parent,dx,dy,dz,name) {
    const direction=new THREE.Vector3(dx,dy,dz),length=direction.length();
    const sleeve=part(parent,name,({block})=>{
      block(0,length/2,0,.116,length,.12,graphite,.035);
      block(0,length*.49,0,.157,length*.67,.152,ivory,.045);
      block(0,length*.28,0,.164,.033,.158,brass);
    });
    sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    return joint(parent,dx,dy,dz);
  }
  function arm(side){
    const shoulder=joint(shell,shoulderX(side),-.14,.13);
    const elbow=link(shoulder,side*.23,-.21,.11,'remontik-upper-arm');
    part(elbow,'remontik-elbow',({block})=>{
      block(0,0,0,.18,.18,.18,graphite,.055);
      block(0,0,.096,.10,.10,.025,brass);
    });
    const wrist=link(elbow,side*.14,.26,.19,'remontik-forearm');
    return {shoulder,elbow,wrist};
  }
  const grip=arm(-1), hand=arm(1);
  part(grip.wrist,'remontik-chip-grip',({block})=>{
    block(0,0,0,.19,.13,.17,brass);
    for(const side of [-1,1]){
      block(side*.095,.069,.032,.054,.14,.10,brass);
      block(side*.081,.138,.047,.066,.043,.10,graphite);
    }
    block(0,.224,.056,.30,.245,.067,0x537258);
    block(0,.224,.103,.225,.18,.035,brass);
    for(const side of [-1,1])for(let i=0;i<4;i++)block((i-1.5)*.066,.224+side*.135,.055,.031,.038,.047,brass);
  });
  part(hand.wrist,'remontik-open-hand',({block})=>{
    block(0,.04,0,.21,.16,.095,brass);
    block(0,.034,.053,.12,.084,.015,0xb78138);
    for(let i=0;i<3;i++){
      const tilt=(1-i)*.16, x=(i-1)*.070, h=i===1?.144:.119;
      block(x,.127,0,.045,.046,.055,graphite,.009,tilt);
      block(x-Math.sin(tilt)*.054,.15+h/2,0,.049,h,.064,brass,.012,tilt);
    }
    block(-.123,.072,.015,.055,.113,.065,brass,.014,.73);
  });

  let time=0, waveAge=Infinity, near=false;
  function wave(){waveAge=0}
  function update(dt,active,reduced,player){
    const dx=player.x-x, dz=player.z-z;
    const distance=Math.hypot(dx,dz);
    if(active){
      if(!near && distance<5.4){near=true;wave()}
      if(distance>7)near=false;
      time+=dt;waveAge+=dt;
    }
    const waveAmount=reduced?0:ease(clamp(waveAge/.40))*ease(clamp((2.7-waveAge)/.60));
    const idle=reduced?0:Math.sin(time*1.6);
    body.position.y=1.10+idle*.047;
    const yaw=near?Math.atan2(dx,dz):.32;
    if(active)root.rotation.y+=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y))*Math.min(1,dt*4);
    shell.rotation.z=(1-waveAmount)*(-.085+idle*.025);
    const inspect = reduced ? 0 : (1-waveAmount)*(.5+.5*Math.sin(time*.95));
    shell.rotation.x=.13*inspect;
    grip.shoulder.rotation.x=-.22+idle*.11;
    grip.elbow.rotation.z=-.26*inspect;
    grip.elbow.rotation.x=.23*inspect;
    grip.wrist.rotation.y=.28*inspect;
    grip.wrist.rotation.z=-.18+idle*.12;
    hand.shoulder.rotation.z=-.33+waveAmount*.81;
    hand.elbow.rotation.z=.06+waveAmount*(.03+.09*Math.sin(time*9-.42));
    hand.wrist.rotation.z=.20+waveAmount*.33*Math.sin(waveAge<2.7?waveAge*9:0);
    eyes.scale.y=reduced?1:1-.93*Math.pow(Math.max(0,Math.cos(time*1.35+2)),140);
  }
  update(0,false,true,{x,z});
  return {root,update,wave};
}
