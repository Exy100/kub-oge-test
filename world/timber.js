import * as THREE from '../vendor/three.module.js';

export function timberMaterial(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#c59968';ctx.fillRect(0,0,64,64);
  for(let plank=0;plank<3;plank++){
    const y=plank*22;
    ctx.fillStyle='#996e49';ctx.fillRect(0,y,64,2);
    ctx.strokeStyle='#b28659';
    for(let i=0;i<2;i++){
      ctx.beginPath();ctx.moveTo(0,y+7+7*i);
      ctx.bezierCurveTo(24,y+11+3*i,40,y+2+10*i,64,y+7+7*i);ctx.stroke();
    }
  }
  ctx.strokeStyle='#916a47';ctx.beginPath();ctx.ellipse(39,35,5,2,0,0,Math.PI*2);ctx.stroke();
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map,roughness:.92});
}
