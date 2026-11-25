import * as THREE from '../vendor/three.module.js';
import {paintedPart} from './painted-part.js';

const green=0x426c52, ivory=0xe1d6ac, brass=0xd2a452, graphite=0x344447;
const shoulderX=side=>side<0?-.55:.65;
const ease=t=>t*t*(3-2*t);
const clamp=t=>Math.max(0,Math.min(1,t));

function rim(w,h,k){
  return [[-w+k,-h],[w-k,-h],[w,-h+k],[w,h-k],[w-k,h],[-w+k,h],[-w,h-k],[-w,-h+k]];
}

function createLens(seat){
  const w=seat[2][0],h=seat[4][1],rise=.095;
  const positions=[],normals=[],radii=[],indices=[];
  function vertex(x,y,radius){
    radii.push(radius);
    const u=x/w,v=y/h;
    positions.push(x,y,.408+rise*(1-u*u)*(1-v*v));
    const n=new THREE.Vector3(2*rise*u*(1-v*v)/w,2*rise*v*(1-u*u)/h,1).normalize();
    normals.push(n.x,n.y,n.z);
  }
  // Shared rings follow the octagonal gasket. The extra points along each
  // flat side let the glass bow in both axes without rounding off the bezel.
  vertex(0,0,0);
  const segments=seat.length*4;
  for(let ring=1;ring<=5;ring++){
    const radius=ring/5;
    for(let i=0;i<segments;i++){
      const edge=Math.floor(i/4),a=seat[edge],b=seat[(edge+1)%seat.length],t=(i%4)/4;
      vertex(radius*(a[0]+(b[0]-a[0])*t),radius*(a[1]+(b[1]-a[1])*t),radius);
      const j=1+(ring-1)*segments+i,next=1+(ring-1)*segments+(i+1)%segments;
      if(ring===1)indices.push(0,j,next);
      else indices.push(j-segments,j,next,next,next-segments,j-segments);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('radius',new THREE.Float32BufferAttribute(radii,1));
  geometry.setIndex(indices);
  // A sky gradient and a soft strip of light form a small, analytic
  // environment reflection. It needs no scene capture or refraction pass.
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    vertexShader:`
      attribute float radius;
      varying float vRadius;
      varying vec3 vNormal;
      varying vec3 vToEye;
      void main(){
        vec4 world=modelMatrix*vec4(position,1.0);
        vRadius=radius;
        vNormal=mat3(modelMatrix)*normal;
        vToEye=cameraPosition-world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }`,
    fragmentShader:`
      varying float vRadius;
      varying vec3 vNormal;
      varying vec3 vToEye;
      void main(){
        vec3 n=normalize(vNormal),eye=normalize(vToEye);
        vec3 reflected=reflect(-eye,n);
        float grazing=1.0-clamp(dot(n,eye),0.0,1.0);
        float sky=smoothstep(-0.18,0.70,reflected.y);
        float edge=smoothstep(0.78,1.0,vRadius);
        float strip=reflected.y-0.38*reflected.x;
        float glint=(1.0-smoothstep(0.018,0.13,abs(strip-0.38)))*
          (1.0-smoothstep(-0.12,0.70,reflected.x))*
          (0.26+0.74*smoothstep(-0.25,0.85,reflected.z));
        vec3 glass=mix(vec3(0.022,0.09,0.15),vec3(0.28,0.49,0.59),sky);
        glass=mix(glass,vec3(0.10,0.25,0.32),edge*0.65);
        gl_FragColor=vec4(mix(glass,vec3(0.76,0.92,0.95),0.85*glint),
          0.045+0.18*sky+0.16*edge+0.42*grazing*grazing+0.42*glint);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const lens=new THREE.Mesh(geometry,material);
  lens.name='remontik-lens';
  return lens;
}

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
  const seat=rim(.384,.314,.078);
  part(shell,'remontik-bezel',({band,face})=>{
    const outer=rim(.435,.365,.095), lip=rim(.419,.349,.089);
    const gasket=rim(.397,.327,.082);
    const at=(ring,z)=>ring.map(([x,y])=>[x,y,z]);
    band(at(outer,.321),at(lip,.404),0xa98148);
    band(at(lip,.404),at(gasket,.414),brass);
    band(at(gasket,.414),at(seat,.408),graphite);
    band(at(seat,.408),at(seat,.354),0x243b40);
    face(at(seat,.354),0x243d47);
  });
  const lens=createLens(seat);
  shell.add(lens);
  const eyes=part(shell,'remontik-eyes',({block})=>{
    for(const side of [-1,1])block(side*.137,0,.374,.075,.142,.016,0x7fffee,.01);
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
