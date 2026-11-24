import * as THREE from '../vendor/three.module.js';

export function boardMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#215843';
  ctx.fillRect(0, 0, 1024, 1024);
  // Fan each group of traces out from the socket to plated vias.
  for (let side = 0; side < 4; side++) {
    ctx.save();
    ctx.translate(480, 400);
    ctx.rotate(side * Math.PI / 2);
    for (let i = 0; i < 16; i++) {
      const start = (i - 7.5) * 17;
      const bend = 205 + (i % 8) * 8;
      const end = start + (i < 8 ? -58 : 58);
      const length = bend + 95 + (i % 4) * 24;
      ctx.beginPath();
      ctx.moveTo(start, 128);
      ctx.lineTo(start, bend);
      ctx.lineTo(end, bend + 58);
      ctx.lineTo(end, length);
      ctx.strokeStyle = i % 4 === 0 ? '#b59b58' : '#589370';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(end, length, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#beab72';
      ctx.fill();
      ctx.fillStyle = '#294b3e';
      ctx.fillRect(end-2, length-2, 4, 4);
    }
    ctx.restore();
  }
  // Corner connector pads route diagonally into the outer lanes of the board.
  for (let corner=0; corner<4; corner++) {
    ctx.save();
    ctx.translate(512,512);
    ctx.rotate(corner*Math.PI/2);
    for (let pin=0; pin<8; pin++) {
      const x=40+pin*14;
      ctx.fillStyle='#c2ab71';
      ctx.fillRect(x-3,-480,7,20);
      ctx.strokeStyle='#68916a';
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(x,-460);
      ctx.lineTo(x,-437+pin*5);
      ctx.lineTo(x+110,-327+pin*5);
      ctx.lineTo(389+pin*10,-327+pin*5);
      ctx.lineTo(420+pin*10,-358+pin*5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(420+pin*10,-358+pin*5,4,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.strokeStyle = '#8fbaa1';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 992, 992);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map, roughness:.85});
}
