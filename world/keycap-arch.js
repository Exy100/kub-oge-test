import * as THREE from '../vendor/three.module.js';

// A keycap flares at the skirt and rounds off into a smaller, flat legend face.
function keycapGeometry() {
  const outline = [[-.42,-.5],[.42,-.5],[.5,-.42],[.5,.42],
    [.42,.5],[-.42,.5],[-.5,.42],[-.5,-.42]];
  const rings = [[0,.96],[.08,1],[.85,.82],[1,.74]];
  const vertices = [], indices = [];
  for (const [height, width] of rings) {
    for (const [x, y] of outline) vertices.push(x * width, y * width, height);
  }
  const n = outline.length;
  for (let ring = 1; ring < rings.length; ring++) {
    for (let i = 0; i < n; i++) {
      const a = (ring - 1) * n + i, b = (ring - 1) * n + (i + 1) % n;
      indices.push(a,b,b+n, a,b+n,a+n);
    }
  }
  const top = (rings.length - 1) * n;
  for (let i = 1; i < n - 1; i++) indices.push(top,top+i,top+i+1, 0,i+1,i);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function drawLegends() {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.lineJoin = ctx.lineCap = 'round';
  const navy = '#204554', gold = '#dda437';
  function shape(points, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  shape([[30,27],[64,18],[98,27],[95,69],[83,88],[64,105],[45,88],[33,69]],navy,navy);
  shape([[43,38],[64,32],[85,38],[82,66],[74,79],[64,88],[54,79],[46,66]],'#93cec6',navy);
  ctx.translate(128,0);
  shape([[65,12],[94,12],[72,48],[94,48],[42,104],[54,66],[35,66]],gold,navy);
  ctx.fillStyle = navy;
  for (let i=0; i<3; i++) ctx.fillRect(61+i*9,94-i*7,6,7+i*7);
  ctx.translate(128,0);
  ctx.strokeStyle = navy;
  ctx.lineWidth = 5;
  ctx.setLineDash([4,9]);
  ctx.beginPath();
  ctx.moveTo(13,93);
  ctx.quadraticCurveTo(35,16,70,32);
  ctx.stroke();
  ctx.setLineDash([]);
  shape([[61,32],[82,21],[103,32],[82,44]],'#fae0a0',navy);
  shape([[61,32],[82,44],[82,66],[61,54]],gold,navy);
  shape([[82,44],[103,32],[103,54],[82,66]],'#70aeac',navy);
  ctx.fillStyle = navy;
  for (let row=0; row<3; row++) {
    for (let col=0; col<3; col++) ctx.fillRect(58+col*15,76+row*10,12,7);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildKeycapArch(box, {x,z}) {
  const geometry = keycapGeometry();
  const material = color => new THREE.MeshStandardMaterial({color,flatShading:true,roughness:.65});
  const jade = material(0x398e87), mint = material(0x66b1a5);
  const skirt = material(0x245b59), ivory = material(0xffe9b6);
  // The structural spines and header carry the collisions inside the keycap shell.
  const beam = box(x,2.59,z,3.12,.56,.60,skirt,true);
  function addCap(cx,cy,cz,w,h,d,rotation,finish) {
    const cap = new THREE.Mesh(geometry,finish);
    cap.position.set(cx,cy,cz);
    cap.rotation.x = rotation;
    cap.scale.set(w,h,d);
    cap.castShadow = cap.receiveShadow = true;
    beam.parent.add(cap);
    return cap;
  }
  for (const side of [-1,1]) {
    for (let level=0; level<4; level++) {
      const cx = x + side*(1.23-.045*level), bottom = .04+.57*level;
      box(cx,bottom+.28,z,.62,.57,.54,skirt,true);
      addCap(cx,bottom,z,.87,.86,.54,-Math.PI/2,level%2 ? mint : jade);
    }
  }
  const ink = new THREE.MeshBasicMaterial({map:drawLegends(),transparent:true,depthWrite:false});
  for (let key=0; key<3; key++) {
    const cx = x + (key-1)*1.03, cy = key===1 ? 2.91 : 2.75;
    addCap(cx,cy,z-.32,1.09,1.04,.59,-.12,jade);
    const cap = addCap(cx,cy+.02,z+.02,.99,.93,.43,-.12,ivory);
    const face = new THREE.PlaneGeometry(.73,.70);
    const uv = face.attributes.uv;
    for (let i=0; i<uv.count; i++) uv.setX(i,(key+uv.getX(i))/3);
    const legend = new THREE.Mesh(face,ink);
    legend.position.copy(cap.position);
    legend.rotation.copy(cap.rotation);
    legend.translateZ(.432);
    beam.parent.add(legend);
  }
  const veil = document.createElement('canvas');
  veil.width = 128;
  veil.height = 192;
  const ctx = veil.getContext('2d');
  const gradient = ctx.createLinearGradient(0,0,0,veil.height);
  gradient.addColorStop(0,'rgba(83,201,225,.65)');
  gradient.addColorStop(.55,'rgba(145,237,240,.27)');
  gradient.addColorStop(1,'rgba(70,201,224,.72)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,veil.width,veil.height);
  ctx.fillStyle = 'rgba(211,255,251,.7)';
  for (const [sx,sy] of [[21,31],[78,44],[42,82],[99,113],[60,146],[25,163]]) {
    ctx.fillRect(sx,sy,2,3);
  }
  const veilMap = new THREE.CanvasTexture(veil);
  veilMap.colorSpace = THREE.SRGBColorSpace;
  const field = new THREE.Mesh(new THREE.PlaneGeometry(1.77,2.35),
    new THREE.MeshBasicMaterial({map:veilMap,transparent:true,
      side:THREE.DoubleSide,depthWrite:false}));
  field.position.set(x,1.175,z);
  field.visible = false;
  return field;
}
