import * as THREE from '../vendor/three.module.js';

function surface(width,height,paint){
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  paint(canvas.getContext('2d'),width,height);
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=4;
  return map;
}

function grain(ctx,w,h,count,alpha){
  let seed=7307;
  const sample=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<count;i++){
    ctx.fillStyle=i%3?'rgba(255,251,223,'+alpha+')':'rgba(16,40,44,'+alpha+')';
    ctx.fillRect(sample()*w,sample()*h,1+sample()*w*.085,.6+sample());
  }
}

// The open roof, shadowed beams and pale worktop reflected in the machine's bare metals.
export function forgeReflection(){
  const texture=surface(256,128,(ctx,w,h)=>{
    const sky=ctx.createLinearGradient(0,0,0,h);
    for(const [at,color] of [[0,'#c5dfed'],[.27,'#e0efed'],[.44,'#50656b'],[.53,'#273638'],[.77,'#a49b7e'],[1,'#686958']]){
      sky.addColorStop(at,color);
    }
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#fcfaf0';ctx.fillRect(18,13,59,49);ctx.fillRect(151,16,33,40);
    ctx.fillStyle='#33454b';ctx.fillRect(44,13,5,49);ctx.fillRect(0,39,w,4);
  });
  texture.mapping=THREE.EquirectangularReflectionMapping;
  return texture;
}

export function brushedFinish(color,metalness=.32,roughness=.48,envMap=null){
  const map=surface(256,128,(ctx,w,h)=>{
    const g=ctx.createLinearGradient(0,0,w*.3,h);
    g.addColorStop(0,'#efede4');g.addColorStop(.28,'#fffef7');g.addColorStop(.63,'#e1e3dc');g.addColorStop(1,'#f6f2e6');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);grain(ctx,w,h,1300,.12);
  });
  return new THREE.MeshStandardMaterial({color,map,metalness,roughness,envMap});
}

export function ventCover(){
  return surface(640,148,(c,w,h)=>{
    c.fillStyle='#254443';c.fillRect(0,0,w,h);
    c.fillStyle='#afbaa0';c.fillRect(5,5,w-10,h-10);
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#53847a');g.addColorStop(1,'#345752');
    c.fillStyle=g;c.fillRect(9,9,w-18,h-18);grain(c,w,h,1700,.13);
    c.fillStyle='#dad1ae';c.font='bold 27px monospace';c.fillText('КУЗНИЦА',28,52);
    c.fillStyle='#e1b86a';c.font='bold 44px monospace';c.fillText('08 / 01',26,103);
    for(let i=0;i<8;i++){
      const x=254+44*i;
      c.fillStyle='#a2ae94';c.fillRect(x,30,22,91);
      c.fillStyle='#193434';c.fillRect(x,28,21,89);
      c.fillStyle='#384d47';c.fillRect(x+4,32,6,79);
    }
    for(const x of [17,w-17])for(const y of [17,h-17]){
      c.fillStyle='#ddc18d';c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();
      c.fillStyle='#554e3f';c.fillRect(x-3,y-1,6,2);
    }
  });
}

export function socketFace(){
  return surface(128,128,(c,w,h)=>{
    c.fillStyle='#263536';c.fillRect(0,0,w,h);
    c.strokeStyle='#648079';c.lineWidth=4;c.strokeRect(7,7,114,114);
    c.strokeStyle='#455755';c.lineWidth=2;c.strokeRect(19,19,90,90);
    for(const x of [25,43,61,79,97]){
      c.fillStyle='#b59b62';c.fillRect(x,10,6,10);c.fillRect(x,108,6,10);
    }
    c.strokeStyle='#749188';c.lineWidth=4;c.beginPath();c.moveTo(47,64);c.lineTo(81,64);c.moveTo(64,47);c.lineTo(64,81);c.stroke();
    grain(c,w,h,180,.065);
  });
}

export function ignitionCap(){
  return surface(256,256,(c,w,h)=>{
    const g=c.createRadialGradient(100,70,6,128,128,132);
    g.addColorStop(0,'#ffab63');g.addColorStop(.62,'#ec7145');g.addColorStop(.85,'#c34b30');g.addColorStop(1,'#813925');
    c.fillStyle=g;c.fillRect(0,0,w,h);grain(c,w,h,420,.07);
    c.strokeStyle='#ffdf9d';c.lineWidth=5;c.beginPath();c.arc(128,128,110,0,Math.PI*2);c.stroke();
    c.fillStyle='#fff1cc';c.beginPath();c.moveTo(142,37);c.lineTo(94,108);c.lineTo(124,108);c.lineTo(112,146);c.lineTo(164,83);c.lineTo(132,83);c.closePath();c.fill();
    c.font='bold 39px sans-serif';c.textAlign='center';c.fillText('ПУСК',128,190);
  });
}
