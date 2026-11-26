import * as THREE from './vendor/three.module.js';

function bitFinish(value) {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  const enamel=ctx.createLinearGradient(6,0,118,128);
  enamel.addColorStop(0,value?'#24345b':'#8691b5');
  enamel.addColorStop(.55,value?'#131e39':'#5f688e');
  enamel.addColorStop(1,value?'#0d172e':'#465476');
  ctx.fillStyle=enamel; ctx.fillRect(0,0,128,128);
  ctx.strokeStyle=value?'#4b7195':'#b3bed2';
  ctx.lineWidth=4; ctx.strokeRect(4,4,120,120);
  ctx.strokeStyle=value?'#15192c':'#515d7b';
  ctx.lineWidth=2; ctx.strokeRect(9,9,110,110);
  ctx.strokeStyle=value?'#68d9ff':'#f0f5ff';
  ctx.lineWidth=11; ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.beginPath();
  if (value) {
    ctx.moveTo(47,50); ctx.lineTo(65,35); ctx.lineTo(65,93);
    ctx.moveTo(46,93); ctx.lineTo(82,93);
  } else ctx.roundRect(44,34,40,60,14);
  ctx.stroke();
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace; map.anisotropy=4;
  return new THREE.MeshStandardMaterial({map,roughness:.58,metalness:.10});
}

// A checkerboard in three dimensions leaves eight occupied cells per outer face.
// Batch the four cubes displaying each logical bit so the whole field takes eight draws.
function bitGeometries() {
  const box=new THREE.BoxGeometry(.111,.111,.111).toNonIndexed();
  const groups=Array.from({length:8},()=>({positions:[],normals:[],uv:[],drift:[]}));
  const vertex=new THREE.Vector3(), loose=new THREE.Vector3();
  let index=0;
  for(let y=0;y<4;y++) for(let z=0;z<4;z++) for(let x=0;x<4;x++) {
    if((x+y+z)%2)continue;
    const bit=(index*5+Math.floor(index/8)*3)%8;
    const group=groups[bit];
    const home=new THREE.Vector3(x-1.5,y-1.5,z-1.5).multiplyScalar(.123);
    const phase=++index*2.39996;
    const drift=new THREE.Vector3(
      home.x*(.28+.22*Math.cos(phase))+.043*Math.sin(phase),
      home.y*.38+.087*Math.sin(phase*1.7),
      home.z*(.28+.22*Math.sin(phase))+.042*Math.cos(phase)
    );
    const tilt=new THREE.Euler(.11*Math.sin(phase),.24*Math.cos(phase),.13*Math.sin(phase*2));
    for(let i=0;i<box.attributes.position.count;i++) {
      vertex.fromBufferAttribute(box.attributes.position,i);
      group.positions.push(vertex.x+home.x,vertex.y+home.y,vertex.z+home.z);
      loose.copy(vertex).applyEuler(tilt).sub(vertex).add(drift);
      group.drift.push(loose.x,loose.y,loose.z);
    }
    group.normals.push(...box.attributes.normal.array);
    group.uv.push(...box.attributes.uv.array);
  }
  box.dispose();
  return groups.map(group=>{
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(group.positions,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(group.normals,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(group.uv,2));
    geo.morphTargetsRelative=true;
    geo.morphAttributes.position=[new THREE.Float32BufferAttribute(group.drift,3)];
    return geo;
  });
}

export function createByteFactory() {
  const geometry=bitGeometries();
  const digits=[bitFinish(0),bitFinish(1)];
  // Catch a click through the gaps at the centre of the floating cubes.
  const target=new THREE.BoxGeometry(.43,.43,.43);
  const invisible=new THREE.MeshBasicMaterial({visible:false});
  function animate(root,time,reduced=false) {
    const t=reduced?0:time, cluster=root.children[0];
    cluster.rotation.y=.32+.20*Math.sin(t*.39);
    cluster.position.y=.025+.014*Math.sin(t*1.15);
    cluster.children.forEach((bit,i)=>{
      const phase=t*Math.PI/4.8+i*.12;
      bit.morphTargetInfluences[0]=(.5+.5*Math.cos(phase))**1.3;
      const flips=Math.floor((t+i*1.2)/9.6);
      bit.material=digits[((0x59>>i)+flips)&1];
    });
  }
  function create() {
    const root=new THREE.Group(), cluster=new THREE.Group();
    root.name='forge-byte'; root.userData.objectId='byte';
    root.add(cluster,new THREE.Mesh(target,invisible));
    for(const geo of geometry) {
      const bit=new THREE.Mesh(geo,digits[0]);
      bit.castShadow=true;
      cluster.add(bit);
    }
    animate(root,0);
    return root;
  }
  return {create,animate,resources:[...geometry,target,invisible,...digits,...digits.map(m=>m.map)]};
}
