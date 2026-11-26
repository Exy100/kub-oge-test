import * as THREE from './vendor/three.module.js';

// Each side displays the same eight bits, read across alternating cells.
const faceAxes = [
  [[1,0,0],[0,0,-1],[0,1,0]], [[-1,0,0],[0,0,1],[0,1,0]],
  [[0,1,0],[1,0,0],[0,0,-1]], [[0,-1,0],[1,0,0],[0,0,1]],
  [[0,0,1],[1,0,0],[0,1,0]], [[0,0,-1],[-1,0,0],[0,1,0]],
];
const faceSize = .62, gridInset = 16, pitch = 56;
const bitRow = bit => Math.floor(bit / 2);
const bitColumn = bit => (bit % 2) * 2 + bitRow(bit) % 2;

function finish(paint) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  paint(canvas.getContext('2d'));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({map, roughness:.66, metalness:.16});
}

function chassis(ctx) {
  ctx.fillStyle = '#657e83';
  ctx.fillRect(0,0,256,256);
  ctx.fillStyle = '#304953';
  ctx.fillRect(4,4,248,248);
  ctx.strokeStyle = '#8dada9';
  ctx.strokeRect(8.5,8.5,239,239);
  for (let row=0; row<4; row++) for (let col=0; col<4; col++) {
    const x = gridInset + col*pitch, y = gridInset + row*pitch;
    const socket = (row+col)%2 === 0;
    ctx.fillStyle = socket ? '#172e38' : '#49646c';
    ctx.fillRect(x+1,y+1,54,54);
    ctx.strokeStyle = socket ? '#728a8b' : '#59767b';
    ctx.strokeRect(x+4.5,y+4.5,47,47);
    if (socket) continue;
    for (let lane=0; lane<2; lane++) {
      const d = lane*7;
      ctx.strokeStyle = lane ? '#718d8b' : '#8da59c';
      ctx.beginPath();
      ctx.moveTo(x+10,y+35+d); ctx.lineTo(x+23,y+35+d);
      ctx.lineTo(x+37,y+21+d); ctx.lineTo(x+45,y+21+d); ctx.stroke();
      ctx.fillStyle = '#bbc1a6'; ctx.fillRect(x+43,y+20+d,3,3);
    }
  }
  for (const x of [8,248]) for (const y of [8,248]) {
    ctx.fillStyle = '#b3af92'; ctx.fillRect(x-2,y-2,4,4);
  }
}

function keycap(ctx, value) {
  // The left half of the atlas is the enamel face, the right half the exposed sidewall.
  ctx.fillStyle='#344958'; ctx.fillRect(0,0,256,256);
  const enamel=ctx.createLinearGradient(0,0,116,244);
  enamel.addColorStop(0,'#547580'); enamel.addColorStop(1,'#294553');
  ctx.fillStyle=enamel; ctx.fillRect(0,0,128,256);
  ctx.save(); ctx.scale(.5,1);
  ctx.strokeStyle='#91aaa8'; ctx.lineWidth=8; ctx.strokeRect(9,9,238,238);
  ctx.strokeStyle='#203948'; ctx.lineWidth=5; ctx.strokeRect(20,20,216,216);
  ctx.strokeStyle='#d5e6d9'; ctx.lineWidth=18; ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.beginPath();
  if (value) {
    ctx.moveTo(100,102); ctx.lineTo(131,77); ctx.lineTo(131,179);
    ctx.moveTo(100,179); ctx.lineTo(159,179);
  } else ctx.roundRect(94,76,68,105,26);
  ctx.stroke(); ctx.restore();
  ctx.fillStyle='#718987'; ctx.fillRect(134,0,122,15);
  ctx.fillStyle='#263e49'; ctx.fillRect(134,184,122,12);
}

// Pack the six copies of one bit into one mesh. A shared morph target
// raises each cap along its own face normal without allocating per frame.
function bitGeometry(bit) {
  const box = new THREE.BoxGeometry(.119,.119,.078).toNonIndexed();
  const positions=[], normals=[], uvs=[], travel=[];
  const p=new THREE.Vector3(), n=new THREE.Vector3();
  const u=(gridInset+(bitColumn(bit)+.5)*pitch-128)*faceSize/256;
  const v=(128-gridInset-(bitRow(bit)+.5)*pitch)*faceSize/256;
  for (const [out,right,up] of faceAxes) {
    for (let i=0;i<box.attributes.position.count;i++) {
      p.fromBufferAttribute(box.attributes.position,i);
      n.fromBufferAttribute(box.attributes.normal,i);
      for (let axis=0;axis<3;axis++) {
        positions.push(right[axis]*(u+p.x)+up[axis]*(v+p.y)+out[axis]*(faceSize/2-.026+p.z));
        normals.push(right[axis]*n.x+up[axis]*n.y+out[axis]*n.z);
        travel.push(out[axis]*.044);
      }
      const tex=box.attributes.uv;
      uvs.push((n.z>.5 ? .01 : .53)+tex.getX(i)*.46, .01+tex.getY(i)*.98);
    }
  }
  box.dispose();
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.morphTargetsRelative=true;
  geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(travel,3)];
  return geometry;
}

export function createByteFactory() {
  const body = new THREE.BoxGeometry(faceSize,faceSize,faceSize);
  const metal = finish(chassis);
  const digits = [0,1].map(value=>finish(ctx=>keycap(ctx,value)));
  const caps = Array.from({length:8},(_,i)=>bitGeometry(i));
  function animate(root,time,reduced=false) {
    const t=reduced ? 0 : time;
    const shell=root.children[0];
    shell.rotation.y=.14+Math.sin(t*.32)*.13;
    shell.position.y=.018+Math.sin(t*1.25)*.015;
    shell.children.forEach((cap,bit)=>{
      const step=(t/1.6+8-bit)/8;
      const phase=(step-Math.floor(step))*8;
      cap.morphTargetInfluences[0]=phase<1 ? Math.sin(Math.PI*phase)**2 : 0;
      const flips=Math.floor(step)+(phase>=.5 ? 1 : 0);
      cap.material=digits[(flips+(0x59>>bit))&1];
    });
  }
  function create() {
    const root=new THREE.Group();
    root.name='forge-byte'; root.userData.objectId='byte';
    const shell=new THREE.Mesh(body,metal);
    shell.castShadow=true; root.add(shell);
    for (const geometry of caps) shell.add(new THREE.Mesh(geometry,digits[0]));
    animate(root,0);
    return root;
  }
  return {create,animate,resources:[body,...caps,metal,metal.map,...digits,...digits.map(m=>m.map)]};
}
