import * as THREE from '../vendor/three.module.js';
import { STAFF_ATTACK } from '../catalog/pulse-staff.js?v=2';

const steps=32, sparks=8;
const {windup,impact,effectEnd}=STAFF_ATTACK;

// Camera-facing ribbons keep their width on WebGL implementations limited to one-pixel lines.
export function createTwinVein(scene){
  const positions=[],edges=[],indices=[],bands=[];
  function ribbon(count,channel){
    const first=positions.length/3;
    for(let i=0;i<count;i++){
      for(const side of [-1,1]){
        positions.push(0,0,0);edges.push(side);bands.push(channel);
      }
      if(i){
        const a=first+(i-1)*2;
        indices.push(a,a+1,a+2,a+1,a+3,a+2);
      }
    }
  }
  ribbon(steps+1,0);ribbon(steps+1,1);
  for(let i=0;i<sparks;i++)ribbon(2,2);
  const geometry=new THREE.BufferGeometry();
  const coords=new THREE.Float32BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position',coords);
  geometry.setAttribute('edge',new THREE.Float32BufferAttribute(edges,1));
  geometry.setAttribute('band',new THREE.Float32BufferAttribute(bands,1));
  geometry.setIndex(indices);
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,
    uniforms:{arcLight:{value:0},sparkLight:{value:0}},
    vertexShader:`attribute float edge,band; varying float vEdge,vBand;
      void main(){vEdge=edge;vBand=band;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying float vEdge,vBand; uniform float arcLight,sparkLight;
      void main(){
        float r=abs(vEdge),core=1.-smoothstep(.09,.38,r);
        vec3 blue=mix(vec3(.11,.28,.9),vec3(.35,.22,.94),step(.5,vBand));
        vec3 col=mix(blue,vec3(.82,.94,1.),core);
        float alpha=(1.-smoothstep(.35,1.,r))*mix(arcLight,sparkLight,step(1.5,vBand));
        gl_FragColor=vec4(col,alpha);
        #include <colorspace_fragment>
      }`,
  });
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='staff-double-vein';mesh.visible=false;mesh.frustumCulled=false;scene.add(mesh);
  const origin=new THREE.Vector3(),end=new THREE.Vector3(),axis=new THREE.Vector3();
  const side=new THREE.Vector3(),across=new THREE.Vector3(),p=new THREE.Vector3();
  const eye=new THREE.Vector3(),view=new THREE.Vector3(),tangent=new THREE.Vector3(),width=new THREE.Vector3();
  const path=Array.from({length:steps+1},()=>new THREE.Vector3());
  const sparkStart=new THREE.Vector3(),sparkEnd=new THREE.Vector3();
  const up=new THREE.Vector3(0,1,0),right=new THREE.Vector3(1,0,0);
  let phase=0;
  function pair(index,point,direction,radius){
    view.subVectors(eye,point);
    width.crossVectors(direction,view);
    if(width.lengthSq()<1e-10)width.copy(side);
    width.normalize().multiplyScalar(radius);
    coords.setXYZ(index,point.x-width.x,point.y-width.y,point.z-width.z);
    coords.setXYZ(index+1,point.x+width.x,point.y+width.y,point.z+width.z);
  }
  function update(time,camera,reduced,muzzle){
    mesh.visible=time>=windup && time<effectEnd;
    if(!mesh.visible)return;
    if(muzzle)origin.copy(muzzle);
    camera.getWorldPosition(eye);
    axis.subVectors(end,origin);
    const length=axis.length();
    if(length<.001){mesh.visible=false;return}
    axis.divideScalar(length);
    side.crossVectors(axis,Math.abs(axis.y)>.94?right:up).normalize();
    across.crossVectors(axis,side);
    const travel=THREE.MathUtils.smoothstep(time,windup,impact);
    const arc=1-THREE.MathUtils.smoothstep(time,impact,.97);
    const age=Math.max(0,time-impact);
    const tail=(time>=impact?1:0)*(1-THREE.MathUtils.smoothstep(time,impact,effectEnd));
    material.uniforms.arcLight.value=arc;
    material.uniforms.sparkLight.value=tail*(reduced?.55:1);
    const amplitude=Math.min(.24,length*.059)*(reduced?.55:1);
    let index=0;
    for(let strand=0;strand<2;strand++){
      for(let k=0;k<=steps;k++){
        const u=Math.min(k/steps,travel), taper=Math.sin(Math.PI*u);
        const twist=u*Math.PI*3.2+strand*Math.PI+phase+(reduced?0:time*2);
        // Sample offsets in space so the growing tip follows the same creases as the core.
        const kink=Math.sin(77*u+strand+phase)*.21+Math.sin(111*u+phase)*.16;
        path[k].lerpVectors(origin,end,u)
          .addScaledVector(side,(Math.cos(twist)+kink)*amplitude*taper)
          .addScaledVector(across,(Math.sin(twist)+.7*kink)*amplitude*taper);
      }
      for(let k=0;k<=steps;k++){
        tangent.subVectors(path[Math.min(steps,k+1)],path[Math.max(0,k-1)]);
        pair(index,path[k],tangent,(.012+.025*arc)*Math.min(1,length*2));index+=2;
      }
    }
    for(let k=0;k<sparks;k++){
      const angle=k*2.39996+phase;
      p.copy(side).multiplyScalar(Math.cos(angle)).addScaledVector(across,Math.sin(angle))
        .addScaledVector(axis,-.25-.09*(k%4));
      const reach=(.13+age*(.52+.12*(k%3)))*(reduced?.5:1);
      sparkEnd.copy(end).addScaledVector(p,reach);sparkEnd.y-=.46*age*age;
      sparkStart.copy(sparkEnd).addScaledVector(p,-(.016+.09*tail));
      pair(index,sparkStart,p,.003+.009*tail);
      pair(index+2,sparkEnd,p,.002);index+=4;
    }
    coords.needsUpdate=true;
  }
  return {
    launch(start,target){origin.copy(start);end.copy(target);phase=(phase+1.81)%(Math.PI*2)},
    impact(target){end.copy(target)},
    update,clear(){mesh.visible=false},
    dispose(){mesh.removeFromParent();geometry.dispose();material.dispose()},
  };
}
