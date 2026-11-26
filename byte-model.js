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
  return map;
}

function crystalFace(ctx) {
  const tint=ctx.createLinearGradient(18,0,218,256);
  tint.addColorStop(0,'rgba(235,185,255,.52)');
  tint.addColorStop(.48,'rgba(166,123,247,.46)');
  tint.addColorStop(1,'rgba(120,112,232,.59)');
  ctx.fillStyle=tint;ctx.fillRect(0,0,256,256);

  // Broad translucent faces and polished edges stay legible at the scale of the tray.
  const edge=ctx.createLinearGradient(0,0,256,240);
  edge.addColorStop(0,'#fff0ff');edge.addColorStop(.45,'#e3cbff');edge.addColorStop(1,'#b0b9ff');
  ctx.strokeStyle=edge;ctx.lineWidth=10;ctx.strokeRect(3,3,250,250);
  ctx.strokeStyle='rgba(246,226,255,.50)';ctx.lineWidth=2;ctx.strokeRect(10,10,236,236);
  const glint=ctx.createRadialGradient(32,30,0,32,30,102);
  glint.addColorStop(0,'rgba(255,233,255,.25)');glint.addColorStop(1,'rgba(255,233,255,0)');
  ctx.fillStyle=glint;ctx.fillRect(0,0,256,256);
}

function bitMark(ctx,value) {
  ctx.strokeStyle='#eed7ff';ctx.lineWidth=14;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();
  if(value){
    ctx.moveTo(100,103);ctx.lineTo(131,76);ctx.lineTo(131,178);
    ctx.moveTo(105,178);ctx.lineTo(156,178);
  }else ctx.roundRect(93,77,70,101,26);
  ctx.stroke();
}

// Pack the six copies of one bit into one mesh. A shared morph target
// moves each inscription towards its glass face without allocating per frame.
function bitGeometry(bit) {
  const plane = new THREE.PlaneGeometry(.065,.065).toNonIndexed();
  const positions=[], normals=[], uvs=[], travel=[];
  const p=new THREE.Vector3(), n=new THREE.Vector3();
  const u=(gridInset+(bitColumn(bit)+.5)*pitch-128)*faceSize/256;
  const v=(128-gridInset-(bitRow(bit)+.5)*pitch)*faceSize/256;
  for (const [out,right,up] of faceAxes) {
    for (let i=0;i<plane.attributes.position.count;i++) {
      p.fromBufferAttribute(plane.attributes.position,i);
      n.fromBufferAttribute(plane.attributes.normal,i);
      for (let axis=0;axis<3;axis++) {
        positions.push(right[axis]*(u+p.x)+up[axis]*(v+p.y)+out[axis]*(faceSize/2-.055+p.z));
        normals.push(right[axis]*n.x+up[axis]*n.y+out[axis]*n.z);
        travel.push(out[axis]*.024);
      }
      const tex=plane.attributes.uv;
      uvs.push(tex.getX(i),tex.getY(i));
    }
  }
  plane.dispose();
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
  const glass=new THREE.MeshStandardMaterial({
    map:finish(crystalFace),transparent:true,depthWrite:false,side:THREE.DoubleSide,
    roughness:.27,metalness:.04,emissive:0x9271c8,emissiveIntensity:.45,
  });
  const digits=[0,1].map(value=>new THREE.MeshBasicMaterial({
    map:finish(ctx=>bitMark(ctx,value)),transparent:true,opacity:.34,depthWrite:false,
  }));
  const marks = Array.from({length:8},(_,i)=>bitGeometry(i));
  function animate(root,time,reduced=false) {
    const t=reduced ? 0 : time;
    const shell=root.children[0];
    shell.rotation.y=.14+Math.sin(t*.32)*.13;
    shell.position.y=.018+Math.sin(t*1.25)*.015;
    shell.children.forEach((mark,bit)=>{
      const step=(t/1.6+8-bit)/8;
      const phase=(step-Math.floor(step))*8;
      mark.morphTargetInfluences[0]=phase<1 ? Math.sin(Math.PI*phase)**2 : 0;
      const flips=Math.floor(step)+(phase>=.5 ? 1 : 0);
      mark.material=digits[(flips+(0x59>>bit))&1];
    });
  }
  function create() {
    const root=new THREE.Group();
    root.name='forge-byte'; root.userData.objectId='byte';
    const shell=new THREE.Mesh(body,glass);
    shell.renderOrder=2;
    root.add(shell);
    for (const geometry of marks) shell.add(new THREE.Mesh(geometry,digits[0]));
    animate(root,0);
    return root;
  }
  return {create,animate,resources:[body,...marks,glass,glass.map,...digits,...digits.map(m=>m.map)]};
}
