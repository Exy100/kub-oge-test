import * as THREE from '../vendor/three.module.js';

// A printed IC footprint with a pin-one marker, fan-out traces and a row of passives.
function drawFootprint(ctx, x, y, rotation, pins, label) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const halfWidth = pins * 6;
  ctx.fillStyle = '#194a3d';
  ctx.fillRect(-halfWidth - 9, -27, halfWidth * 2 + 18, 54);
  ctx.strokeStyle = '#9bb5a1';
  ctx.lineWidth = 2;
  ctx.strokeRect(-halfWidth - 3, -18, halfWidth * 2 + 6, 36);
  ctx.fillStyle = '#d3bb79';
  ctx.fillRect(-halfWidth + 3, -12, 5, 5);
  ctx.fillStyle = '#b1c3a9';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, 5);
  for (const side of [-1, 1]) {
    for (let pin = 0; pin < pins; pin++) {
      const pad = -halfWidth + 6 + pin * 12;
      const bend = 38 + pin * 3;
      const end = pad + side * 18;
      ctx.strokeStyle = '#6a9c79';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pad, side * 23);
      ctx.lineTo(pad, side * bend);
      ctx.lineTo(end, side * (bend + 18));
      ctx.lineTo(end, side * (bend + 30));
      ctx.stroke();
      ctx.fillStyle = '#bda56a';
      ctx.fillRect(end - 3, side * (bend + 30) - 3, 6, 6);
      ctx.fillStyle = '#d2ba80';
      ctx.fillRect(pad - 3, side * 22 - 5, 6, 10);
    }
  }
  for (let row = 0; row < 3; row++) {
    const top = row * 13 - 17;
    ctx.fillStyle = '#bdc3ac';
    ctx.fillRect(halfWidth + 17, top, 20, 8);
    ctx.fillStyle = '#4a5550';
    ctx.fillRect(halfWidth + 21, top, 12, 8);
  }
  ctx.restore();
}

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
  // Route wider power rails along the perimeter, with chamfered corners and test pads.
  for (let side = 0; side < 4; side++) {
    ctx.save();
    ctx.translate(512, 512);
    ctx.rotate(side * Math.PI / 2);
    for (let lane = 0; lane < 4; lane++) {
      const y = -477 + lane * 9;
      const start = -395 + lane * 9;
      const end = -72 - lane * 12;
      ctx.strokeStyle = lane === 0 ? '#ae9960' : '#538c70';
      ctx.lineWidth = lane === 0 ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(-447, y + start + 447);
      ctx.lineTo(start, y);
      ctx.lineTo(end, y);
      ctx.lineTo(end + 24, y + 24);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(end + 24, y + 24, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#c6ad73';
      ctx.fill();
    }
    ctx.restore();
  }
  // Place components in the open areas between the socket buses and edge connectors.
  for (const [x, y, quarterTurns, pins, label] of [
    [206, 177, 0, 8, 'U2'], [778, 163, 0, 6, 'CLK'],
    [183, 334, 1, 5, 'U3'], [852, 455, 1, 8, 'I/O'],
    [160, 645, 0, 7, 'ADC'], [736, 639, 1, 6, 'U6'],
    [301, 822, 0, 9, 'DRAM'], [537, 873, 1, 5, 'U8'],
    [814, 835, 0, 8, 'PWR'],
  ]) {
    drawFootprint(ctx, x, y, quarterTurns * Math.PI / 2, pins, label);
  }
  // Two-row headers fill the wider gaps between trace bundles.
  for (const [x, y, turns, contacts] of [
    [465, 700, 1, 5], [154, 854, 0, 4], [662, 864, 1, 3],
    [864, 307, 1, 4], [272, 61, 0, 5],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turns * Math.PI / 2);
    const width = contacts * 12;
    ctx.fillStyle = '#244d42';
    ctx.fillRect(-width / 2 - 4, -16, width + 8, 32);
    ctx.strokeStyle = '#99ad92';
    ctx.lineWidth = 2;
    ctx.strokeRect(-width / 2 - 4, -16, width + 8, 32);
    for (let pin = 0; pin < contacts; pin++) {
      const cx = (pin + .5) * 12 - width / 2;
      for (const cy of [-6, 6]) {
        ctx.fillStyle = '#c4ab72';
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b382f';
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
      }
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
