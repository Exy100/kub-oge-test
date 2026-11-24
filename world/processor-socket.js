import * as THREE from '../vendor/three.module.js';
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

function buildCooler(box, x, z, baseY) {
  // A stepped copper contact block rises out of the lid between the fin stacks.
  box(x,baseY+.10,z,2.15,.20,2.05,0xb0784d,true);
  box(x,baseY+.28,z,1.76,.17,1.70,0xc8a57b,true);
  const finBottom = baseY+.58;
  const fins = new THREE.MeshStandardMaterial({color:0x98afad,metalness:.28,roughness:.42});
  const caps = new THREE.MeshStandardMaterial({color:0x374c53,roughness:.64});
  const copper = new THREE.MeshStandardMaterial({color:0xb67e4e,metalness:.26,roughness:.42});
  for (const side of [-1,1]) {
    const towerZ = z+side*.62;
    box(x,finBottom+1.16,towerZ,2.26,2.38,.82,0x4d6567,true);
    for (let i=0;i<14;i++) box(x,finBottom+i*.18,towerZ,2.56,.08,1.03,fins);
    box(x,finBottom+2.43,towerZ,2.60,.13,1.06,caps);
    for (const dx of [-.84,-.42,.42,.84]) {
      box(x+dx,baseY+.36,towerZ,.12,.52,.13,copper);
      box(x+dx,finBottom+2.53,towerZ,.14,.08,.14,copper);
    }
  }

  // Two outward-facing fans. Each rotor shares its geometry and material across blades.
  const rotors = [];
  const bladeMaterial = new THREE.MeshStandardMaterial({color:0x518c8d,metalness:.14,roughness:.48});
  const blade = new THREE.Shape();
  blade.moveTo(.12,0); blade.quadraticCurveTo(.44,-.21,.88,-.10);
  blade.quadraticCurveTo(.96,.04,.90,.22);
  blade.quadraticCurveTo(.59,.05,.17,.22); blade.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(blade,{depth:.05,bevelEnabled:false,curveSegments:5});
  const rimGeometry = new THREE.TorusGeometry(.99,.065,6,32);
  const hubGeometry = new THREE.CylinderGeometry(.22,.22,.15,12);
  const fanY = finBottom+1.19;
  for (const side of [-1,1]) {
    const fanZ = z+side*1.26;
    const frame = box(x,fanY,fanZ,2.25,2.25,.18,caps,true);
    const mount = new THREE.Group();
    frame.parent.add(mount);
    mount.position.set(x,fanY,fanZ+side*.12);
    mount.rotation.y = side===1 ? 0 : Math.PI;
    mount.add(new THREE.Mesh(rimGeometry,copper));
    const rotor = new THREE.Group();
    mount.add(rotor);
    for (let i=0;i<7;i++) {
      const vane = new THREE.Mesh(bladeGeometry,bladeMaterial);
      vane.rotation.z = i*2*Math.PI/7;
      rotor.add(vane);
    }
    const hub = new THREE.Mesh(hubGeometry,copper);
    hub.rotation.x = Math.PI/2; hub.position.z=.06;
    rotor.add(hub);
    rotors.push(rotor);
  }
  return rotors;
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
  const rotors = buildCooler(box,x,z,foot+1.05);
  for (const side of [-1,1]) {
    box(x+side*(span/2-.08),.49,z,.32,.32,span+.16,0x819091,true);
    box(x,.49,z+side*(span/2-.08),span-.48,.32,.32,0x819091,true);
    box(x+side*(socket/2-.22),.26,z+socket/2-.22,.23,.06,.23,0xbab4a1);
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
