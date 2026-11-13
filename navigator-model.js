import * as THREE from './vendor/three.module.js';

export const NAVIGATORS = Object.freeze([
  {id:8,name:'Механик',description:'Мастер с очками и инструментом. Любит собирать сложное из простого.',color:'#a6af82'},
  {id:11,name:'Орбит',description:'Ретро-исследователь с тёплой улыбкой. Откроет дорогу к новым знаниям.',color:'#d79a61'},
  {id:19,name:'Кристалл',description:'Прозрачный робот на колёсах. Данные и двоичный код — его стихия.',color:'#96bfdb'},
  {id:27,name:'Пиксель',description:'Компактный помощник с голубым рюкзаком. Всегда готов подсказать.',color:'#91b2bb'},
]);
export function validNavigator(value){return NAVIGATORS.some(n=>n.id===value)?value:null}
export function loadNavigator(storage){try{return validNavigator(JSON.parse(storage.getItem('kub.navigator.v1')))}catch{return null}}
export function saveNavigator(storage,id){if(validNavigator(id)===null)return false;try{storage.setItem('kub.navigator.v1',JSON.stringify(id));return true}catch{return false}}

// Shared geometry inside each model, with explicit disposal for previews and future world instances.
export function createNavigator(id){
  id=validNavigator(id)??27;
  const root=new THREE.Group();root.name=`navigator-${id}`;
  const geometries=[],materials=[];
  const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.48,...extra});materials.push(m);return m};
  const cream=material(id===27?0xf0f4ee:0xeee0bf),accent=material(({8:0x7e8b5c,11:0xc97832,19:0x96b6de,27:0x759daa})[id]);
  const metal=material(id===27?0x89979d:0xb29259,{metalness:.65,roughness:.33});
  const dark=material(0x29383c),rubber=material(0x39464b,{roughness:.85});
  const light=material(id===19?0x94e8ff:id===11?0xffd390:0xd9f5d9,{emissive:id===19?0x61bdff:0xabc392,emissiveIntensity:.9});
  const glass=material(0xb7d1f5,{transparent:true,opacity:.25,metalness:.1,roughness:.18,depthWrite:false});
  const shape=new THREE.Shape();shape.moveTo(-.35,-.45);shape.lineTo(.35,-.45);shape.quadraticCurveTo(.45,-.45,.45,-.35);shape.lineTo(.45,.35);shape.quadraticCurveTo(.45,.45,.35,.45);shape.lineTo(-.35,.45);shape.quadraticCurveTo(-.45,.45,-.45,.35);shape.lineTo(-.45,-.35);shape.quadraticCurveTo(-.45,-.45,-.35,-.45);
  const box=new THREE.ExtrudeGeometry(shape,{depth:.8,bevelEnabled:true,bevelThickness:.1,bevelSize:.05,bevelSegments:id===8?1:3,curveSegments:5,steps:1});box.translate(0,0,-.4);
  const sphere=new THREE.SphereGeometry(1,24,16),cylinder=new THREE.CylinderGeometry(1,1,1,24),torus=new THREE.TorusGeometry(1,.14,8,32);
  geometries.push(box,sphere,cylinder,torus);
  function part(name,g,m,x,y,z,sx,sy,sz){const mesh=new THREE.Mesh(g,m);mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);root.add(mesh);return mesh}
  const block=(name,m,x,y,z,sx,sy,sz)=>part(name,box,m,x,y,z,sx,sy,sz);
  const orb=(name,m,x,y,z,sx,sy=sx,sz=sx)=>part(name,sphere,m,x,y,z,sx,sy,sz);
  function tube(name,m,points,r=.015){const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),16,r,6,false);geometries.push(g);return part(name,g,m,0,0,0,1,1,1)}
  const wheeled=id===19;
  // Robots face +Z. The UI camera shows the front and their left side.
  if(wheeled){
    orb('glass-body',glass,0,.6,0,.59,.43,.43);
    block('inner-core',dark,0,.63,0,.54,.39,.35);
    for(let i=0;i<4;i++)block('data-bit',light,(i%2-.5)*.17,.55+Math.floor(i/2)*.17,.21,.1,.1,.1);
    for(const side of [-1,1]){
      const wheel=part('wheel',cylinder,rubber,side*.53,.3,0,.29,.2,.29);wheel.rotation.z=Math.PI/2;
      const hub=part('wheel-hub',cylinder,metal,side*.64,.3,0,.23,.025,.23);hub.rotation.z=Math.PI/2;
      const ring=part('wheel-light',torus,light,side*.66,.3,0,.19,.19,.19);ring.rotation.y=Math.PI/2;
    }
  }else{
    block('body',cream,0,.99,0,.65,.64,.42);
    block('chest-panel',accent,0,1.03,.232,.45,.37,.045);
    for(const side of [-1,1]){
      orb('hip-joint',dark,side*.19,.64,0,.12);
      block('shin',cream,side*.2,.42,0,.23,.35,.25);
      orb('knee',metal,side*.2,.57,.15,.08);
      block('boot',accent,side*.2,.15,.075,.32,.2,.43);
      block('sole',rubber,side*.2,.055,.075,.33,.065,.44);
    }
    block('backpack',accent,0,1.05,-.32,.58,.55,.24);
    block('pack-pocket',metal,0,.98,-.46,.3,.22,.05);
    for(const side of [-1,1]){
      orb('shoulder',metal,side*.4,1.2,0,.12);
      const arm=block('arm',cream,side*.49,1.02,.02,.2,.33,.22);arm.rotation.z=side*.28;
      orb('elbow',dark,side*.54,.87,.04,.085);
      block('glove',cream,side*.56,.75,.09,.22,.2,.23);
      for(let f=0;f<3;f++)block('finger',metal,side*.56+(f-1)*.055,.69,.2,.035,.1,.045);
    }
    if(id===8){
      block('tool-belt',dark,0,.77,.05,.68,.09,.47);
      for(const side of [-1,1])block('belt-pocket',metal,side*.24,.76,.3,.14,.16,.09);
      block('wrench-shaft',metal,.63,.96,.2,.065,.48,.06);
      const jaw=part('wrench-head',torus,metal,.63,1.23,.2,.13,.13,.08);
      // Open fork gives a readable tool silhouette at thumbnail size.
      jaw.visible=false;block('wrench-base',metal,.63,1.18,.2,.22,.065,.06);
      for(const x of [.54,.72])block('wrench-jaw',metal,x,1.26,.2,.055,.14,.06);
    }
    if(id===11){
      orb('planet-badge',cream,0,1.04,.28,.13,.13,.035);
      const ring=part('planet-ring',torus,metal,0,1.04,.32,.17,.065,.04);ring.rotation.z=.4;
    }
    if(id===27)block('chest-light',light,0,1.05,.27,.13,.035,.025);
  }
  const hy=wheeled?1.14:1.68;
  if(id===11)orb('head-shell',cream,0,hy,0,.49,.46,.37);
  else if(wheeled)orb('head-shell',glass,0,hy,0,.5,.37,.38);
  else block('head-shell',cream,0,hy,0,.93,.7,.62);
  block('screen-rim',id===19?metal:accent,0,hy,.315,.76,.51,.075);
  block('face-screen',dark,0,hy,.363,.66,.42,.045);
  for(const side of [-1,1]){
    orb('eye',light,side*.16,hy+.025,.395,.035,.075,.014);
    orb('ear-cap',metal,side*.48,hy,0,.07,.15,.16);
  }
  tube('smile',light,[[-.07,hy-.09,.397],[0,hy-.12,.4],[.07,hy-.09,.397]],.012);
  if(id===8){
    block('forehead-plate',accent,0,hy+.32,0,.56,.08,.45);
    for(const side of [-1,1]){part('goggle-rim',torus,metal,side*.18,hy+.39,.15,.125,.125,.09);orb('goggle-lens',dark,side*.18,hy+.39,.15,.095,.095,.035)}
  }
  if(id===11){
    block('antenna',metal,.3,hy+.48,-.04,.028,.3,.028);orb('antenna-tip',accent,.3,hy+.65,-.04,.055);
    block('orange-band',accent,0,hy+.34,-.02,.13,.08,.48);
  }
  if(wheeled){for(const side of [-1,1])tube('glass-seam',metal,[[side*.35,.93,.26],[side*.46,1.17,.12],[side*.25,1.43,0]],.018)}
  root.userData.navigatorId=id;
  return {root,dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}};
}

export function renderNavigatorPortraits(){
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(320,360);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xfffaec,0x647c82,2.6));
  const sun=new THREE.DirectionalLight(0xffedd1,3.2);sun.position.set(-3,5,5);scene.add(sun);
  const rim=new THREE.DirectionalLight(0xb5d8ff,1.7);rim.position.set(3,2,-3);scene.add(rim);
  const camera=new THREE.PerspectiveCamera(32,320/360,.1,30);const images={};
  try{for(const {id} of NAVIGATORS){const model=createNavigator(id);scene.add(model.root);camera.position.set(id===19?1.8:2.45,id===19?1.7:2.5,id===19?3.7:4.9);camera.lookAt(0,id===19?.77:1.1,0);renderer.render(scene,camera);images[id]=renderer.domElement.toDataURL('image/png');scene.remove(model.root);model.dispose()}}finally{renderer.dispose();renderer.forceContextLoss()}
  return images;
}
