import * as THREE from '../vendor/three.module.js';
import { buildProcessorCooler } from './processor-cooler.js';
import { PLAYER_HEIGHT } from '../physics.js';

function boardMaterial() {
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
  ctx.strokeStyle = '#8fbaa1';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 992, 992);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map, roughness:.85});
}

export function buildProcessorSocket(box, center) {
  const board = box(center, -.03, 0, 17, .08, 17, boardMaterial());
  board.castShadow = false;
  board.userData.scanSurface = 'board';
  const x = center - .55, z = -2.55;
  const span = 3 * PLAYER_HEIGHT;
  const socket = span + .94;
  const foot = .24;
  box(x,foot/2,z,socket,foot,socket,0x263b38,true);
  // Package substrate, heat spreader and closed retainer, all parallel to the PCB.
  box(x,foot+.15,z,span,.30,span,0x376d5b,true);
  const core = box(x,foot+.675,z,span-.78,.75,span-.78,0xa6aeaa,true);
  const rotors = buildProcessorCooler(box,x,z,foot+1.05,socket);
  for (const side of [-1,1]) {
    box(x+side*(span/2-.08),.49,z,.32,.32,span+.16,0x819091,true);
    box(x,.49,z+side*(span/2-.08),span-.48,.32,.32,0x819091,true);
  }
  // Hinged load plate with a lever latched down the right side.
  box(x,.59,z-span/2,2.7,.32,.34,0x667572,true);
  box(x+span/2+.22,.44,z,.10,.12,span+.38,0xc0b9a3,true);
  box(x+span/2-.08,.44,z+span/2+.14,.69,.12,.14,0xc0b9a3,true);
  box(x+span/2-.35,.44,z+span/2+.14,.32,.20,.22,0x394541,true);
  const lights = [-.38,0,.38].map(dx=>
    box(x+dx,.29,z+socket/2-.19,.23,.08,.14,0xd78a53));
  return {core,lights,rotors};
}
