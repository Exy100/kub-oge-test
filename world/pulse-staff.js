import * as THREE from '../vendor/three.module.js';
import { paintedPart } from './painted-part.js';
import { STAFF_ID, STAFF_ATTACK } from '../catalog/pulse-staff.js?v=2';

import { createStaffCrystal } from './staff-crystal.js';

// Both camera rigs share the same two meshes' resources.
export function createPulseStaff() {
  const root = new THREE.Group();
  root.name = STAFF_ID;
  const ceramic = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .52, metalness: .17 });
  const ivory=0xece2c9, brass=0xb28a53, paleGold=0xd8b57a, jade=0x34584f;
  const neckExtension=.155;
  const shell=paintedPart(root,'ceramic-housing',ceramic,({face})=>{
    function join(lower,upper,color){
      for(let i=0;i<lower.length;i++){
        const j=(i+1)%lower.length;
        face([lower[i],lower[j],upper[j],upper[i]],color);
      }
    }
    // Cross-sections run along the open C. A chamfer on each rail leaves a fine
    // highlight from either camera without closing the space around the stone.
    const rail=[
      [[.244,.856],[.235,.822]], [[.204,.849],[.199,.817]],
      [[.154,.839],[.150,.807]], [[-.071,.809],[-.050,.772]],
      [[-.108,.769],[-.073,.748]], [[-.154,.474],[-.116,.491]],
      [[-.099,.408],[-.080,.443]], [[-.014,.358],[-.008,.399]],
      [[.139,.403],[.125,.436]], [[.168,.411],[.157,.445]],
      [[.219,.425],[.209,.458]],
    ];
    const rings=rail.map(([outer,inner])=>{
      const edge=(u,z)=>[outer[0]+(inner[0]-outer[0])*u,outer[1]+(inner[1]-outer[1])*u,z];
      return [edge(.17,.031),edge(.83,.031),edge(1,.021),edge(1,-.021),
        edge(.83,-.031),edge(.17,-.031),edge(0,-.021),edge(0,.021)];
    });
    // In this sweep the outside faces of the section point toward the first cap.
    face(rings[0],paleGold);
    for(let i=1;i<rings.length;i++){
      const gold=i<=2 || i>=9;
      for(let j=0;j<8;j++){
        const k=(j+1)%8;
        const tint=gold?(j%2?paleGold:brass):(j===2?0xbcb4a5:ivory);
        face([rings[i-1][k],rings[i-1][j],rings[i][j],rings[i][k]],tint);
      }
    }
    face(rings.at(-1).slice().reverse(),brass);
    // Two green enamel keys cross the back of the fork, as on the reference.
    for(const y of [.582,.620]){
      const x=-.154+(y-.474)*(.046/.295);
      const badge=[[x+.006,y],[x+.034,y-.005],[x+.036,y+.008],[x+.008,y+.013]];
      face(badge.map(([a,b])=>[a,b,.032]),jade);
      face(badge.map(([a,b])=>[a,b,-.032]).reverse(),jade);
    }

    // The grip swells under the palm. Brass ferrules and shallow fluting catch side light.
    function gripRing(y,rx,rz){
      return Array.from({length:12},(_,i)=>{
        const a=i*Math.PI/6;
        return [rx*Math.cos(a),y,-rz*Math.sin(a)];
      });
    }
    function turn(rows){
      const rings=rows.map(([y,rx,rz])=>gripRing(y,rx,rz));
      face(rings[0].slice().reverse(),rows[0][3]);
      for(let i=1;i<rows.length;i++)join(rings[i-1],rings[i],rows[i][3]);
      face(rings.at(-1),rows.at(-1)[3]);
    }
    const grip=[[-.360,.023,.021,brass],[-.350,.041,.037,paleGold],
      [-.333,.044,.039,brass],[-.324,.037,.033,0x2b443e],[-.311,.033,.030,jade],
      [-.244,.036,.032,jade],[-.239,.038,.034,brass],[-.232,.038,.034,paleGold],
      [-.225,.034,.031,jade]];
    for(let i=0;i<6;i++){
      const y=-.201+i*.052;
      const r=.035+.006*Math.sin((i+.5)*Math.PI/6);
      grip.push([y,r,.91*r,0x59746a],[y+.029,r+.001,.91*r,jade],
        [y+.035,r-.003,.86*r,0x293e39]);
    }
    grip.push([.118,.034,.031,jade],[.128,.046,.040,paleGold],[.142,.045,.039,brass],
      [.148,.034,.030,0x394e49],[.157,.030,.028,brass],
      [.164,.029,.027,ivory],[.278,.032,.029,ivory],
      [.284,.034,.031,brass],[.291,.034,.031,paleGold],[.297,.032,.029,jade],
      [.174+neckExtension,.035,.030,jade],[.184+neckExtension,.049,.039,paleGold],
      [.202+neckExtension,.054,.041,brass],[.212+neckExtension,.045,.035,ivory]);
    turn(grip);
  });
  const crystal=createStaffCrystal();
  root.add(crystal);
  const tip=new THREE.Object3D();
  tip.name='pulse-tip';tip.position.copy(crystal.position);root.add(tip);
  return {root,tip,setFill(value,time=0){
    crystal.material.uniforms.fill.value=value;
    crystal.material.uniforms.time.value=time;
  },dispose(){
    shell.geometry.dispose();ceramic.dispose();crystal.geometry.dispose();crystal.material.dispose();
  }};
}

export function createStaffCycle(){
  const {windup,impact,interval}=STAFF_ATTACK;
  let elapsed=interval,release=null,contact=null;
  return {
    get elapsed(){return elapsed},
    start(onRelease,onImpact){
      if(elapsed<interval)return false;
      release=onRelease;contact=onImpact;elapsed=0;return true;
    },
    update(dt,held){
      if(!held && release){release=contact=null;elapsed=interval}
      elapsed=Math.min(interval,elapsed+Math.max(0,dt));
      if(release && elapsed>=windup){
        const fire=release;release=null;fire();
      }
      if(contact && elapsed>=impact){
        const hit=contact;contact=null;hit();
      }
      return elapsed<windup?1:(elapsed-windup)/(interval-windup);
    },
    clear(){elapsed=interval;release=contact=null},
  };
}
