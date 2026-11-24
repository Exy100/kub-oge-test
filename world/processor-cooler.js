import * as THREE from '../vendor/three.module.js';

const TAU = Math.PI*2;
const metal = (color,metalness,roughness) => new THREE.MeshStandardMaterial({color,metalness,roughness});

function polygon(points) {
  return new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));
}

function plate(shape,depth,bevel) {
  return new THREE.ExtrudeGeometry(shape,{
    depth,bevelEnabled:true,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:12,
  });
}

// Paint repeated hardware in one draw call per part.
function copies(parent,geometry,material,poses) {
  const mesh=new THREE.InstancedMesh(geometry,material,poses.length);
  const transform=new THREE.Object3D();
  poses.forEach(([x,y,z,rx=0,ry=0,rz=0,scale=1],i)=>{
    transform.position.set(x,y,z);transform.rotation.set(rx,ry,rz);
    transform.scale.setScalar(scale);transform.updateMatrix();
    mesh.setMatrixAt(i,transform.matrix);
  });
  mesh.castShadow=mesh.receiveShadow=true;
  parent.add(mesh);
  return mesh;
}

function screwHeads(parent,poses) {
  // A blind cross recess has visible side walls and a dark floor inside the head.
  const radius=.131, head=new THREE.Shape();
  head.absarc(0,0,radius,0,TAU,false);
  const t=.018, l=.080;
  const drive=polygon([[-t,l],[t,l],[t,t],[l,t],[l,-t],[t,-t],[t,-l],[-t,-l],[-t,-t],[-l,-t],[-l,t],[-t,t]]);
  head.holes.push(drive);
  const headGeometry=plate(head,.042,.0035);
  const washer=new THREE.CylinderGeometry(.163,.154,.032,24);
  washer.rotateX(Math.PI/2);washer.translate(0,0,-.020);
  copies(parent,washer,metal(0x374448,.32,.58),poses);
  copies(parent,headGeometry,metal(0xcbd0c6,.53,.29),poses);
}

function sweptBlade() {
  // Sample the pressure face from hub to tip. Its pitch and chord vary along the span.
  const vertices=[],colors=[],indices=[], rows=10,cols=5;
  const jade=new THREE.Color(0x467a7d),edge=new THREE.Color(0x89b9b1);
  for(let i=0;i<=rows;i++){
    const u=i/rows;
    for(let j=0;j<=cols;j++){
      const v=j/cols;
      const radius=.225+.747*u-.036*u**5*(2*v-1)**2;
      const theta=.62*u*u-.23*u+(v-.5)*(.65-.22*u);
      const lift=(.12-.05*u)*(v-.5)+.045*Math.sin(Math.PI*v)+.03*u;
      vertices.push(radius*Math.cos(theta),radius*Math.sin(theta),lift);
      const c=jade.clone().lerp(edge,.15*u+(j===cols?.66:0));
      colors.push(c.r,c.g,c.b);
      if(i<rows && j<cols){
        const a=i*(cols+1)+j,b=a+cols+1;
        indices.push(a,b,b+1,a,b+1,a+1);
      }
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.setIndex(indices);g.computeVertexNormals();
  return g;
}

export function buildProcessorCooler(box,x,z,baseY,socket) {
  const contact=box(x,baseY+.10,z,2.15,.20,2.05,0xb47c51,true);
  box(x,baseY+.28,z,1.76,.17,1.70,0xc8a57b,true);
  const model=new THREE.Group();
  model.name='processor-cooler';model.position.set(x,baseY,z);contact.parent.add(model);
  const nickel=metal(0xb6c2bc,.41,.43), copper=metal(0xca9364,.43,.30);
  const graphite=metal(0x35494f,.24,.48), rubber=metal(0x253a3b,.02,.82);
  const plateOutline=polygon([[-1.16,-.52],[-.86,-.52],[-.78,-.45],[.78,-.45],[.86,-.52],[1.16,-.52],
    [1.30,-.37],[1.30,.37],[1.16,.52],[.86,.52],[.78,.45],[-.78,.45],[-.86,.52],[-1.16,.52],[-1.30,.37],[-1.30,-.37]]);
  const fins=[],covers=[],pipeTips=[],screws=[];
  const finBottom=.65, top=3.04,fanY=1.84;
  for(const side of [-1,1]){
    const towerZ=side*.62;
    box(x,baseY+(top+finBottom)/2,z+towerZ,2.60,top-finBottom,1.04,graphite,true).visible=false;
    for(let i=0;i<18;i++)fins.push([0,finBottom+.135*i,towerZ,-Math.PI/2]);
    covers.push([0,top-.09,towerZ,-Math.PI/2]);
    for(const dx of [-.92,-.48,.48,.92])pipeTips.push([dx,top+.028,towerZ]);
    for(const dx of [-1,1]){
      screws.push([dx*(socket/2-.22),.24-baseY+.030,side*(socket/2-.22),-Math.PI/2,0,dx*.36,1.18]);
    }
  }
  copies(model,plate(plateOutline,.042,.009),nickel,fins);
  copies(model,plate(plateOutline,.082,.018),graphite,covers);
  copies(model,new THREE.SphereGeometry(.078,12,8),copper,pipeTips);
  // Each continuous copper U rises through both fin banks.
  const pipe=new THREE.CurvePath();
  const V=(y,z)=>new THREE.Vector3(0,y,z);
  pipe.add(new THREE.LineCurve3(V(top,.62),V(.58,.62)));
  pipe.add(new THREE.QuadraticBezierCurve3(V(.58,.62),V(.20,.62),V(.20,.27)));
  pipe.add(new THREE.LineCurve3(V(.20,.27),V(.20,-.27)));
  pipe.add(new THREE.QuadraticBezierCurve3(V(.20,-.27),V(.20,-.62),V(.58,-.62)));
  pipe.add(new THREE.LineCurve3(V(.58,-.62),V(top,-.62)));
  copies(model,new THREE.TubeGeometry(pipe,56,.073,10,false),copper,[-.92,-.48,.48,.92].map(dx=>[dx,0,0]));

  // A crossbar and two spring-loaded screws clamp the contact block onto the lid.
  box(x,baseY+.24,z,3.24,.12,.38,nickel);
  const springPoints=[];
  for(let i=0;i<=64;i++){
    const turn=TAU*4*i/64;
    springPoints.push(new THREE.Vector3(.112*Math.cos(turn),.30+.28*i/64,.112*Math.sin(turn)));
  }
  const spring=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPoints),64,.021,6,false);
  copies(model,spring,nickel,[[-1.47,0,0],[1.47,0,0]]);
  copies(model,new THREE.CylinderGeometry(.067,.067,.51,14),graphite,[[-1.47,.347,0],[1.47,.347,0]]);
  for(const side of [-1,1])screws.push([side*1.47,.60,0,-Math.PI/2,0,side*.43,1.15]);

  const shell=polygon([[-.91,-1.15],[.91,-1.15],[1.15,-.91],[1.15,.91],[.91,1.15],[-.91,1.15],[-1.15,.91],[-1.15,-.91]]);
  const opening=new THREE.Path();opening.absarc(0,0,1.005,0,TAU,true);shell.holes.push(opening);
  const frame=plate(shell,.15,.018);
  const pad=plate(polygon([[-.17,-.17],[.09,-.17],[.17,-.09],[.17,.17],[-.17,.17]]),.05,.015);
  const pads=[],frames=[],rims=[],struts=[],rotors=[];
  const blade=sweptBlade();
  const enamel=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.16,roughness:.36,side:THREE.DoubleSide});
  const hub=new THREE.LatheGeometry([[.001,-.10],[.252,-.10],[.266,-.043],[.266,.054],[.231,.092],[.17,.105],[.001,.105]]
    .map(([r,h])=>new THREE.Vector2(r,h)),32);
  hub.rotateX(Math.PI/2);
  const trim=new THREE.TorusGeometry(.18,.013,6,32);
  for(const side of [-1,1]){
    const facing=side===1?0:Math.PI;
    const fanZ=side*1.30;
    box(x,baseY+fanY,z+fanZ,2.30,2.30,.25,graphite,true).visible=false;
    // Four rear spokes tie the motor to the frame while leaving the air channel open.
    for(let i=0;i<4;i++){
      const angle=TAU*i/4+Math.PI/4;
      struts.push([.60*Math.cos(angle),fanY+.60*Math.sin(angle),fanZ-side*.09,0,0,angle]);
    }
    frames.push([0,fanY,fanZ-side*.12,0,facing]);
    rims.push([0,fanY,fanZ+side*.047,0,facing]);
    for(const dx of [-.91,.91]) for(const dy of [-.91,.91]){
      pads.push([dx,fanY+dy,fanZ+side*.052,0,facing,Math.atan2(dy,dx)-Math.PI/4]);
      screws.push([dx,fanY+dy,fanZ+side*.136,0,facing,dx+dy*.4,.85]);
    }
    const rotor=new THREE.Group();
    const mount=new THREE.Group();model.add(mount);mount.add(rotor);
    mount.position.set(0,fanY,fanZ);mount.rotation.y=facing;
    copies(rotor,blade,enamel,Array.from({length:9},(_,i)=>[0,0,0,0,0,TAU*i/9]));
    copies(rotor,hub,graphite,[[0,0,0]]);
    copies(rotor,trim,copper,[[0,0,.102]]);
    rotors.push(rotor);
  }
  copies(model,new THREE.BoxGeometry(.89,.072,.055),graphite,struts);
  copies(model,frame,graphite,frames);
  copies(model,new THREE.TorusGeometry(1.028,.019,8,48),copper,rims);
  copies(model,pad,rubber,pads);
  screwHeads(model,screws);
  return rotors;
}
