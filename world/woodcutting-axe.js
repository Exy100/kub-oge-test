import * as THREE from '../vendor/three.module.js';
import {paintedPart} from './painted-part.js';

// Both hand views use the same faceted crescent and leaf-shaped crystal inlay.
export function createWoodcuttingAxe(){
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.49,metalness:.16});
  const group=new THREE.Group();
  const mesh=paintedPart(group,'woodcutting-axe',material,({face,block})=>{
    block(0,.156,0,.059,.85,.066,0x926643,.019,-.05);
    for(const y of [-.225,-.165,-.105,-.045,.015]){
      block((y-.156)*.05,y,0,.074,.048,.079,0x446657,.014,-.14);
    }
    block(.017,.499,0,.103,.157,.12,0xc79d55,.027);
    // A crescent with a ridged spine, inset jade cheeks and a pale cutting edge.
    const blade=[[-.018,.596],[.126,.61],[.246,.664],[.325,.735],
      [.338,.611],[.307,.478],[.224,.367],[.116,.316],[.133,.419],[-.018,.456]];
    const ridge=[.145,.508];
    for(let j=0;j<blade.length;j++){
      const k=(j+1)%blade.length;
      const border=j>=3&&j<=6;
      for(const side of [-1,1]){
        const vertex=(p,d)=>[p[0],p[1],side*d];
        const a=blade[j],b=blade[k];
        const inset=p=>p.map((v,i)=>v*.74+ridge[i]*.26);
        const skin=[vertex(a,.012),vertex(b,.012),vertex(inset(b),.054),vertex(inset(a),.054)];
        face(side>0?skin.reverse():skin,border?0xafdfcd:0x498c81);
        const facet=[vertex(inset(a),.054),vertex(inset(b),.054),vertex(ridge,.074)];
        face(side>0?facet.reverse():facet,j%2?0x449588:0x54a99a);
      }
      face([[...blade[j],.012],[...blade[k],.012],[...blade[k],-.012],[...blade[j],-.012]],border?0xdaf5df:0x577e70);
    }
    for(const side of [-1,1]){
      const gem=[[.068,.492],[.109,.52],[.145,.583],[.09,.55]];
      const points=gem.map(([x,y])=>[x,y,side*.078]);
      face(side<0?points.reverse():points,0xe7d58b);
    }
    block(-.062,.54,0,.11,.103,.089,0xb38b53,.018);
  });
  return mesh;
}
