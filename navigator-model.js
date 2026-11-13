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
  const cream=material(id===19?0xe0ebf4:id===27?0xf0f4ee:0xeee0bf),accent=material(({8:0x7e8b5c,11:0xc97832,19:0x96b6de,27:0x759daa})[id]);
  const metal=material(id===19?0x9eafc5:id===27?0x89979d:0xb29259,{metalness:.65,roughness:.33});
  const dark=material(0x29383c),rubber=material(0x39464b,{roughness:.85});
  const light=material(id===19?0x94e8ff:id===11?0xffd390:0xd9f5d9,{emissive:id===19?0x61bdff:0xabc392,emissiveIntensity:.9});
  const glass=material(0xb7d1f5,{transparent:true,opacity:.43,metalness:.1,roughness:.18,depthWrite:false});
  const shape=new THREE.Shape();shape.moveTo(-.35,-.45);shape.lineTo(.35,-.45);shape.quadraticCurveTo(.45,-.45,.45,-.35);shape.lineTo(.45,.35);shape.quadraticCurveTo(.45,.45,.35,.45);shape.lineTo(-.35,.45);shape.quadraticCurveTo(-.45,.45,-.45,.35);shape.lineTo(-.45,-.35);shape.quadraticCurveTo(-.45,-.45,-.35,-.45);
  const box=new THREE.ExtrudeGeometry(shape,{depth:.8,bevelEnabled:true,bevelThickness:.1,bevelSize:.05,bevelSegments:4,curveSegments:5,steps:1});box.translate(0,0,-.4);
  const sphere=new THREE.SphereGeometry(1,24,16),cylinder=new THREE.CylinderGeometry(1,1,1,id===19?48:24),torus=new THREE.TorusGeometry(1,.14,8,32);
  geometries.push(box,sphere,cylinder,torus);
  function part(name,g,m,x,y,z,sx,sy,sz){const mesh=new THREE.Mesh(g,m);mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);root.add(mesh);return mesh}
  const block=(name,m,x,y,z,sx,sy,sz)=>part(name,box,m,x,y,z,sx,sy,sz);
  const orb=(name,m,x,y,z,sx,sy=sx,sz=sx)=>part(name,sphere,m,x,y,z,sx,sy,sz);
  function tube(name,m,points,r=.015){const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),16,r,6,false);geometries.push(g);return part(name,g,m,0,0,0,1,1,1)}
  const wheeled=id===19;
  // Robots face +Z. The UI camera shows the front and their left side.
  if(wheeled){
    // One compact pod; cool materials replace the separated box head and exposed core.
    orb('pod-chassis',cream,0,.57,0,.52,.29,.39);
    orb('glass-body',glass,0,.73,0,.51,.29,.39);
    block('data-display-frame',metal,0,.69,.378,.51,.22,.045);
    block('inner-core',dark,0,.69,.401,.46,.175,.018);
    const indicator=material(0x8ae2ef,{emissive:0x4bafca,emissiveIntensity:.35});
    for(let i=0;i<6;i++){
      const x=(i-2.5)*.072;
      if(i%2)block('binary-one',indicator,x,.69,.42,.014,.066,.012);
      else part('binary-zero',torus,indicator,x,.69,.42,.019,.031,.012);
    }
    const ringGeometry=new THREE.TorusGeometry(.252,.013,10,48);geometries.push(ringGeometry);
    const lamp=material(0x94e6fa,{emissive:0x4cacc9,emissiveIntensity:.45,roughness:.25});
    for(const side of [-1,1]){
      const wheel=part('wheel',cylinder,rubber,side*.55,.35,0,.34,.24,.34);wheel.rotation.z=Math.PI/2;
      const hub=part('wheel-hub',cylinder,metal,side*.676,.35,0,.291,.018,.291);hub.rotation.z=Math.PI/2;
      const recess=part('wheel-recess',cylinder,dark,side*.688,.35,0,.267,.012,.267);recess.rotation.z=Math.PI/2;
      const ring=part('wheel-light',ringGeometry,lamp,side*.699,.35,0,1,1,1);ring.rotation.y=side*Math.PI/2;
      const cap=part('wheel-cap',cylinder,accent,side*.7,.35,0,.222,.014,.222);cap.rotation.z=Math.PI/2;
      const axle=part('axle-cap',cylinder,metal,side*.713,.35,0,.065,.015,.065);axle.rotation.z=Math.PI/2;
      orb('headlight-housing',dark,side*.32,.55,.326,.065,.036,.025);
      orb('headlight',lamp,side*.32,.55,.35,.042,.017,.009);
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
    if(id===8){
      block('tool-belt',dark,0,.77,.05,.68,.09,.47);
      for(const side of [-1,1])block('belt-pocket',accent,side*.24,.76,.27,.14,.16,.09);
      // A stowed tool sits flush against the backpack instead of floating beside a hand.
      block('wrench-shaft',metal,.34,1.08,-.27,.055,.23,.04);
      block('tool-holder',accent,.34,1.03,-.25,.09,.09,.07);
    }
    if(id===11){
      orb('planet-badge',cream,0,1.04,.28,.13,.13,.035);
      const ring=part('planet-ring',torus,metal,0,1.04,.32,.17,.065,.04);ring.rotation.z=.4;
    }
    if(id===27)block('chest-light',light,0,1.05,.27,.13,.035,.025);
  }
  // Articulated arms: both walking and wheeled companions can greet the player.
  const arms=[];
  function adopt(group,parts){root.updateMatrixWorld(true);for(const part of parts)group.attach(part)}
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.name=side<0?'wave-arm':'rest-arm';arm.position.set(side*(wheeled?.49:.4),wheeled?.97:1.22,0);root.add(arm);
    let start=root.children.length;
    orb('shoulder',metal,arm.position.x,arm.position.y,0,.1);
    block('upper-arm',cream,arm.position.x+side*.05,arm.position.y-.14,0,.18,.23,.21);
    adopt(arm,root.children.slice(start));
    const elbow=new THREE.Group();elbow.position.set(side*.07,-.28,.01);arm.add(elbow);
    start=root.children.length;
    const x=arm.position.x+side*.07,y=arm.position.y-.28;
    orb('elbow',dark,x,y,.01,.075);
    block('forearm',accent,x,y-.085,.02,.15,.15,.18);
    block('glove',cream,x,y-.2,.045,.19,.17,.19);
    for(let f=0;f<3;f++)block('finger',cream,x+(f-1)*.052,y-.26,.065,.042,.08,.13);
    orb('thumb',cream,x-side*.11,y-.19,.09,.045,.065,.05);
    adopt(elbow,root.children.slice(start));if(wheeled){arm.scale.setScalar(.68);arm.position.z=.15}arms.push({arm,elbow,side});
  }
  if(wheeled){
    const bumper=part('lower-bumper',torus,metal,0,.45,0,.47,.32,.18);bumper.rotation.x=Math.PI/2;
  }else{
    block('collar',metal,0,1.34,0,.32,.09,.25);
    for(const side of [-1,1]){
      block('shoulder-shell',accent,side*.36,1.25,.02,.17,.17,.26);
      for(let i=0;i<3;i++)block('chest-vent',dark,side*.18,.92+i*.04,.263,.065,.012,.012);
      orb('chest-fastener',metal,side*.27,1.19,.216,.019,.019,.01);
    }
  }
  const headStart=root.children.length;
  const hy=wheeled?1.04:1.68;
  if(id===11)orb('head-shell',cream,0,hy,-.045,.47,.41,.34);
  else if(wheeled)orb('head-shell',glass,0,hy,-.025,.49,.35,.36);
  else block('head-shell',cream,0,hy,0,.93,.7,.62);
  if(wheeled){
    orb('screen-rim',metal,0,hy,.275,.454,.254,.11);
    orb('face-screen',dark,0,hy,.31,.43,.229,.105);
  }else{
    block('screen-rim',accent,0,hy,.315,.76,.51,.075);
    block('face-screen',dark,0,hy,.363,.66,.42,.045);
  }
  for(const side of [-1,1]){
    orb('eye',light,side*.16,hy+.025,wheeled?.42:.395,.035,.075,.014);
    if(!wheeled)orb('ear-cap',metal,side*.45,hy,0,.055,.11,.12);
  }
  const smileZ=wheeled?.414:.397;
  tube('smile',light,[[-.07,hy-.09,smileZ],[0,hy-.12,smileZ],[.07,hy-.09,smileZ]],.012);
  if(id===8){
    block('forehead-plate',accent,0,hy+.32,0,.56,.08,.45);
    for(const side of [-1,1]){part('goggle-rim',torus,metal,side*.18,hy+.32,.15,.125,.125,.09);orb('goggle-lens',dark,side*.18,hy+.32,.15,.095,.095,.035)}
  }
  if(id===11){
    orb('antenna-base',accent,.28,hy+.33,-.04,.065);block('antenna',metal,.28,hy+.42,-.04,.026,.13,.026);orb('antenna-tip',accent,.28,hy+.5,-.04,.045);
    block('orange-band',accent,0,hy+.34,-.02,.13,.08,.48);
  }
  if(id===8)block('goggle-bridge',metal,0,hy+.32,.15,.13,.04,.05);
  const headParts=root.children.slice(headStart),head=new THREE.Group();head.name='head-rig';head.position.y=hy;root.add(head);adopt(head,headParts);
  const eyes=headParts.filter(p=>p.name==='eye');
  root.userData.navigatorId=id;
  let greeting=-1;
  return {root,greet(){greeting=0},animate(dt,time,{reducedMotion=false}={}){
    if(greeting>=0)greeting+=dt;
    const fade=greeting<0?0:Math.min(1,greeting/.45)*Math.max(0,Math.min(1,(3.8-greeting)/.65));
    const wave=fade*(reducedMotion?0:1);
    arms[0].arm.rotation.z=-wave*(2.05+Math.sin(greeting*9)*.19);
    arms[0].elbow.rotation.z=-wave*.4;
    arms[1].arm.rotation.z=reducedMotion?0:.035*Math.sin(time*1.4);
    head.rotation.y=reducedMotion?0:Math.sin(time*.65)*.1;
    head.rotation.z=-wave*.06;
    root.position.y=reducedMotion?0:Math.sin(time*1.7)*.009;
    const blink=reducedMotion?1:Math.abs(time%4.7-4.4)<.09?.12:1;
    eyes.forEach(eye=>eye.scale.y=.075*blink);
    light.emissiveIntensity=.8+(reducedMotion?0:.1*Math.sin(time*2));
  },dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}};
}

export function renderNavigatorPortraits(){
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(320,360);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xfffaec,0x647c82,2.6));
  const sun=new THREE.DirectionalLight(0xffedd1,3.2);sun.position.set(-3,5,5);scene.add(sun);
  const rim=new THREE.DirectionalLight(0xb5d8ff,1.7);rim.position.set(3,2,-3);scene.add(rim);
  const camera=new THREE.PerspectiveCamera(32,320/360,.1,30);const images={};
  try{for(const {id} of NAVIGATORS){const model=createNavigator(id);scene.add(model.root);camera.position.set(id===19?1.6:1.8,id===19?1.45:2.05,id===19?3.7:4.7);camera.lookAt(0,id===19?.77:1.1,0);renderer.render(scene,camera);images[id]=renderer.domElement.toDataURL('image/png');scene.remove(model.root);model.dispose()}}finally{renderer.dispose();renderer.forceContextLoss()}
  return images;
}
