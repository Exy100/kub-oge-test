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

// One high-contrast maker's mark: a brass byte cube above a dark anvil.
function drawForgeMark() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  function silhouette(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
    ctx.fill();
  }
  silhouette([[8,62],[119,62],[105,77],[87,80],[78,89],[79,96],
    [96,102],[96,110],[40,110],[40,103],[56,96],[58,85],[51,80],[31,77]], '#234c52');
  silhouette([[43,25],[64,14],[86,25],[86,46],[64,58],[43,46]], '#234c52');
  silhouette([[48,26],[64,18],[81,26],[64,35]], '#f0c879');
  silhouette([[47,30],[62,38],[62,52],[47,44]], '#b48139');
  silhouette([[66,38],[82,30],[82,44],[66,52]], '#b099cc');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildKeycapArch(box, {x,z}) {
  const geometry = keycapGeometry();
  const material = color => new THREE.MeshStandardMaterial({color,flatShading:true,roughness:.65});
  const jade = material(0x398e87), mint = material(0x66b1a5);
  const skirt = material(0x245b59), ivory = material(0xfff6e4);
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
  for (const dx of [-1.03, 0, 1.03]) {
    addCap(x+dx,dx===0?2.91:2.75,z-.19,1.09,1.04,.59,-.12,jade);
  }
  const cap = addCap(x,2.93,z+.02,1.03,.98,.43,-.12,ivory);
  cap.name = 'forge-sign-keycap';
  const ink = new THREE.MeshBasicMaterial({map:drawForgeMark(),transparent:true,depthWrite:false});
  const legend = new THREE.Mesh(new THREE.PlaneGeometry(.75,.72),ink);
  legend.position.copy(cap.position);
  legend.rotation.copy(cap.rotation);
  legend.translateZ(.432);
  beam.parent.add(legend);
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
