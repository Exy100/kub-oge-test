import * as THREE from '../vendor/three.module.js';

const clamp=v=>Math.min(1,Math.max(0,v));
const steps=12;
const widths=[.051,.017,.012];

function glowTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,1,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.18,'rgba(255,255,255,.82)');
  g.addColorStop(.52,'rgba(255,255,255,.26)');g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(canvas);
}

export function createForgeDischarge(scene){
  const group=new THREE.Group();group.visible=false;scene.add(group);
  const map=glowTexture();
  function halo(x,y,z,color){
    const m=new THREE.Sprite(new THREE.SpriteMaterial({map,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
    group.add(m);m.position.set(x,y,z);return m;
  }
  const sparks=[],terminals=[],bolts=[];
  const light=halo(80,1.92,-3.60,0xffd2a5);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.025,5,32),
    new THREE.MeshBasicMaterial({color:0xb9f9ff,transparent:true,depthWrite:false}));
  ring.rotation.x=Math.PI*.41;ring.position.set(80,1.89,-3.67);group.add(ring);
  const sparkShape=new THREE.OctahedronGeometry(1,0);
  const sparkMat=new THREE.MeshBasicMaterial({color:0xffdb91});
  for(let i=0;i<8;i++){
    const m=new THREE.Mesh(sparkShape,sparkMat);sparks.push(m);group.add(m);
  }
  for(const side of [-1,1]){
    terminals.push(halo(80+side*.71,2.46,-3.70,side<0?0x7fe0ff:0xc3b1ff));
    // Each terminal has a white filament inside a wider coloured ribbon plus an offshoot.
    for(let layer=0;layer<3;layer++){
      const g=new THREE.BufferGeometry();
      const pos=new THREE.Float32BufferAttribute(new Float32Array((steps+1)*6),3);
      pos.setUsage(THREE.DynamicDrawUsage);g.setAttribute('position',pos);
      const indices=[];
      for(let j=0;j<steps;j++){const a=j*2;indices.push(a,a+1,a+2,a+2,a+1,a+3)}
      g.setIndex(indices);
      const colors=side<0?[0x51bcec,0xf1ffff,0xb2efff]:[0x9a85ee,0xfff8eb,0xe1c7ff];
      const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:colors[layer],side:THREE.DoubleSide,transparent:true,depthWrite:false}));
      m.frustumCulled=false;m.renderOrder=3+layer;group.add(m);bolts.push({m,pos,side,layer});
    }
  }
  return {hide(){group.visible=false},update(t,reduced){
    group.visible=true;
    const discharge=clamp((t-.26)/.12)*(1-clamp((t-.69)/.09));
    terminals.forEach((m,i)=>{
      const q=Math.sin(Math.PI*clamp((t-i*.035)/.77));
      m.scale.setScalar(.12+.45*q);m.material.opacity=q*(reduced ? .45 : .9);
    });
    for(const {m,pos,side,layer} of bolts){
      const start=side<0 ? .26 : .32,head=clamp((t-start)/.16),branch=layer===2;
      m.visible=head>0 && discharge>0 && (!reduced || layer!==2);
      if(!m.visible)continue;
      m.material.opacity=discharge*(layer===0 ? .60 : 1);
      for(let j=0;j<=steps;j++){
        let u=j/steps*head;
        if(branch)u=.24+.46*u;
        const taper=Math.sin(Math.PI*u),noise=reduced ? .05 : .115;
        const bend=taper*noise*(Math.sin(j*2.1+side+t*18)+.35*Math.sin(j*4.1-t*24));
        const x=80+side*.74*(1-u),y=2.46-.57*u+bend+(branch ? .15*Math.sin(Math.PI*j/steps):0);
        const z=-3.74+.07*u+.06*taper*Math.cos(j*1.83+side)+layer*.003;
        const w=widths[layer]*(.40+.60*taper)*discharge;
        pos.setXYZ(2*j,x,y-w,z);pos.setXYZ(2*j+1,x,y+w,z);
      }
      pos.needsUpdate=true;
    }
    const strike=Math.sin(Math.PI*clamp((t-.60)/.21));
    light.scale.setScalar(.16+.43*discharge+(reduced ? .18 : .77)*strike);
    light.material.opacity=clamp(.34*discharge+.82*strike);
    const impact=clamp((t-.68)/.21);
    ring.visible=!reduced && impact>0 && impact<1;
    ring.scale.setScalar(.08+.66*impact);ring.material.opacity=1-impact;
    sparks.forEach((m,i)=>{
      const q=clamp((t-.68-(i%3)*.009)/.24),a=i*Math.PI/4+.19;
      m.visible=!reduced && q>0 && q<1;
      if(!m.visible)return;
      const r=q*(.52+.13*(i%3));m.position.set(80+Math.cos(a)*r,1.89+Math.sin(a)*r-.18*q*q,-3.59+.18*q);
      m.scale.set(.035*(1-q),.094*(1-q),.025*(1-q));m.rotation.z=a-Math.PI/2;
    });
  }};
}
