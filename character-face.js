import * as THREE from './vendor/three.module.js';
import { PALETTES, normalizeAppearance } from './appearance.js';

// Chamfered silhouettes instead of sharp voxel corners; the rest of the world stays cubic.
export function makeSoftBox() {
  const shape = new THREE.Shape();
  shape.moveTo(-.4,-.4);shape.lineTo(.4,-.4);shape.lineTo(.4,.4);shape.lineTo(-.4,.4);shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape,{depth:.8,bevelEnabled:true,bevelThickness:.1,bevelSize:.1,bevelSegments:1,steps:1});
  geometry.translate(0,0,-.4);return geometry;
}
function makeHairScalp() {
  const positions=[],indices=[];
  const rings=[[.12,.226,.218,.035],[.205,.224,.207,.045],[.27,.177,.16,.055],[.292,.09,.08,.028]];
  for(const [y,x,z,c] of rings){for(const [px,pz] of [[-x+c,-z],[x-c,-z],[x,-z+c],[x,z-c],[x-c,z],[-x+c,z],[-x,z-c],[-x,-z+c]])positions.push(px,y,pz)}
  for(let row=0;row<rings.length-1;row++)for(let i=0;i<8;i++){
    const a=row*8+i,b=row*8+(i+1)%8,c=b+8,d=a+8;indices.push(a,d,c,a,c,b);
  }
  const center=positions.length/3;positions.push(0,.303,0);
  for(let i=0;i<8;i++)indices.push(center,24+(i+1)%8,24+i);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
export function createFace(parent, initial) {
  const geometry = {
    soft: makeSoftBox(), scalp: makeHairScalp(), head: makeSoftBox(), sphere: new THREE.SphereGeometry(1,12,8),
    facet: new THREE.IcosahedronGeometry(1,0), cone: new THREE.ConeGeometry(1,2,6),
    ring: new THREE.TorusGeometry(1,.22,5,14),
  };
  const vertices=geometry.head.attributes.position;
  for(let i=0;i<vertices.count;i++)vertices.setX(i,vertices.getX(i)*(1-.14*Math.max(0,(-vertices.getY(i)-.05)/.45)));
  geometry.head.computeVertexNormals();
  const materials = new Map();
  let group, eyes = [], owned = [], appearance;
  const skin=0xe1b18a, skinShadow=0xc58c70, lip=0x9b615b;
  function mesh(parent,name,kind,x,y,z,w,h,d,color,rotation=0) {
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.82}));
    const m=new THREE.Mesh(geometry[kind],materials.get(color));m.name=name;
    m.position.set(x,y,z);m.scale.set(w,h,d);m.rotation.z=rotation;m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function curve(parent,name,points,radius,color) {
    const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,radius,5,false);owned.push(geo);
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));
    const m=new THREE.Mesh(geo,materials.get(color));m.name=name;parent.add(m);return m;
  }
  function rebuild(value) {
    appearance=normalizeAppearance(value);
    if(group)parent.remove(group);owned.forEach(g=>g.dispose());owned=[];eyes=[];
    group=new THREE.Group();group.name='appearance';parent.add(group);
    const [base,highlight,shade]=PALETTES[appearance.palette].colors;
    mesh(group,'face','head',0,-.005,0,.43,.445,.4,skin);
    mesh(group,'chin','sphere',0,-.185,-.022,.14,.047,.155,skin);
    for(const side of [-1,1])mesh(group,'cheek','sphere',side*.14,-.065,-.2,.035,.013,.003,0xd69d80);

    // Eyes share a blink pivot; eyebrow shape and spacing also change with the preset.
    const eyeShapes=[
      [.048,.033,0,.094,0],[.055,.025,.15,.094,-.12],[.044,.044,0,.095,.04],
      [.05,.023,0,.098,0],[.052,.023,.22,.092,-.25],[.063,.031,0,.105,.06],
      [.053,.016,.05,.094,-.04],[.045,.029,-.14,.09,.22],[.05,.039,.04,.098,-.06],[.053,.034,-.1,.098,.12],
    ];
    const [ew,eh,tilt,spacing,brow]=eyeShapes[appearance.eyes];
    for(const side of [-1,1]) {
      const pivot=new THREE.Group();pivot.name='blink-eye';pivot.position.set(side*spacing,.015,-.205);pivot.rotation.z=side*tilt;group.add(pivot);eyes.push(pivot);
      mesh(pivot,'eye-white','sphere',0,0,0,ew,eh,.009,0xfff5e1);
      mesh(pivot,'iris','sphere',-side*.004,-.001,-.010,ew*.43,eh*.76,.004,appearance.eyes===8?0x5e8295:0x486e62);
      mesh(pivot,'pupil','sphere',-side*.004,-.001,-.014,ew*.20,eh*.55,.002,0x283d3e);
      mesh(pivot,'eye-glint','sphere',-.009,.009,-.017,.006,.007,.002,0xffffff);
      if(appearance.eyes===8)mesh(pivot,'second-glint','sphere',.009,-.008,-.017,.0035,.004,.002,0xffffff);
      mesh(group,'eyebrow','soft',side*spacing,.077,-.206,ew*1.8,.016,.018,shade,side*brow);
    }
    const nose=appearance.nose;
    if(nose===0)mesh(group,'nose-button','sphere',0,-.047,-.222,.033,.028,.036,skinShadow);
    if(nose===1){mesh(group,'nose-bridge','soft',0,-.02,-.216,.042,.085,.05,skin);mesh(group,'nose-tip','soft',0,-.061,-.242,.052,.034,.045,skinShadow)}
    if(nose===2){mesh(group,'nose-upturned','sphere',0,-.045,-.236,.038,.022,.038,skin);mesh(group,'nose-shadow','soft',0,-.065,-.238,.038,.009,.018,skinShadow)}
    if(nose===3){mesh(group,'nose-wide','sphere',0,-.05,-.229,.052,.028,.029,skin);for(const side of [-1,1])mesh(group,'nostril','sphere',side*.03,-.066,-.247,.009,.006,.005,skinShadow)}
    if(nose===4)mesh(group,'nose-slender','soft',0,-.028,-.231,.028,.091,.055,skinShadow);
    if(nose===5){mesh(group,'nose-bridge','soft',0,-.013,-.229,.039,.064,.058,skin);mesh(group,'nose-hook','sphere',0,-.053,-.25,.027,.031,.028,skinShadow)}
    if(nose===6)mesh(group,'nose-flat','soft',0,-.048,-.21,.071,.038,.025,skinShadow);
    if(nose===7){mesh(group,'nose-bridge','sphere',0,-.025,-.22,.018,.04,.021,skin);mesh(group,'nose-drop','sphere',0,-.063,-.236,.031,.032,.034,skinShadow)}
    if(nose===8)mesh(group,'nose-faceted','facet',0,-.046,-.234,.041,.041,.045,skinShadow);
    if(nose===9){mesh(group,'nose-soft','sphere',0,-.04,-.22,.034,.042,.028,skin);mesh(group,'nose-tip','sphere',0,-.061,-.239,.027,.019,.025,skinShadow)}

    const mouth=new THREE.Group();mouth.name='mouth';mouth.position.set(0,-.126,-.207);group.add(mouth);
    const mouthShapes=[
      [[-.044,0,0],[0,0,-.002],[.044,0,0]],
      [[-.054,.012,0],[0,-.011,-.003],[.054,.012,0]],
      [[-.068,.012,0],[0,-.014,-.003],[.068,.012,0]],
      [[-.048,-.007,0],[0,-.008,-.003],[.06,.018,0]],
      [[-.046,0,0],[0,.005,-.004],[.046,0,0]],
      null,
      [[-.052,.002,0],[0,-.002,-.003],[.052,.002,0]],
      [[-.061,.018,0],[0,-.003,-.003],[.039,-.008,0]],
      [[-.031,.005,0],[0,-.006,-.003],[.031,.005,0]],
      null,
    ];
    if(mouthShapes[appearance.mouth])curve(mouth,'mouth-line',mouthShapes[appearance.mouth],appearance.mouth===6?.008:.005,lip);
    if(appearance.mouth===2){mesh(mouth,'smile-shadow','sphere',0,-.001,.002,.06,.018,.008,0x754c4b);mesh(mouth,'teeth','soft',0,.006,-.008,.096,.016,.01,0xfff4de)}
    if(appearance.mouth===4)curve(mouth,'lower-lip',[[-.035,-.012,0],[0,-.016,-.003],[.035,-.012,0]],.004,0xb67a70);
    if(appearance.mouth===5)mesh(mouth,'round-mouth','ring',0,0,0,.022,.026,.025,lip);
    if(appearance.mouth===7)mesh(mouth,'dimple','sphere',-.065,.022,0,.007,.008,.006,skinShadow);
    if(appearance.mouth===9){mesh(mouth,'open-smile','sphere',0,-.002,0,.052,.029,.012,0x754c4b);mesh(mouth,'teeth','soft',0,.014,-.011,.079,.017,.012,0xfff4de);mesh(mouth,'lower-lip','sphere',0,-.023,-.006,.033,.008,.006,lip)}

    const earShapes=[
      [.032,.055,.036,.225,0],[.047,.05,.036,.23,0],[.035,.078,.038,.228,0],
      [.023,.075,.031,.224,0],[.055,.062,.037,.233,0],[.024,.06,.02,.222,.25],
      [.055,.064,.043,.247,-.2],[.037,.065,.035,.23,0],[.035,.087,.033,.23,-.35],
      [.048,.066,.042,.233,0],
    ];
    const [ex,ey,ez,offset,angle]=earShapes[appearance.ears];
    for(const side of [-1,1]) {
      const ear=mesh(group,'ear',appearance.ears===9?'facet':appearance.ears===8?'cone':'sphere',side*offset,-.016,0,ex,ey,ez,skin,side*angle);
      mesh(group,'ear-inner','sphere',side*(offset+.006),-.016,-ez*.7,ex*.48,ey*.55,.012,0xc88e79,side*angle);
      if(appearance.ears===7)mesh(group,'ear-lobe','sphere',side*offset,-.082,-.005,.028,.029,.025,skin);
      ear.userData.variant=appearance.ears;
    }
    const hair=new THREE.Group();hair.name='hair';group.add(hair);
    const tuft=(x,y,z,w,h,d,tone=0,angle=0,kind='lock')=>{
      const lock=kind==='lock';
      const m=mesh(hair,'hair-lock',lock?'sphere':kind,x,y,z,lock?w/2:w,lock?h/2:h,lock?d/2:d,lock?base:[base,highlight,shade][tone],angle);
      if(lock&&tone===1)mesh(hair,'hair-highlight','sphere',x-w*.12,y+h*.28,z-d*.14,w*.12,h*.12,d*.32,highlight,angle);
      return m;
    };
    // A shallow scalp foundation is broken up by locks, never a cap or headwear.
    mesh(hair,'hair-scalp','scalp',0,0,0,1,1,1,base);
    tuft(0,.092,.187,.413,.22,.055,2,0,'soft');
    const style=appearance.hair;
    if(style===0){for(let i=0;i<5;i++)tuft(-.17+i*.085,.244+(i%2)*.014,-.035,.115,.09,.32,i%3,-.12);tuft(.19,.12,.035,.06,.16,.26,2)}
    if(style===1){for(let i=0;i<5;i++)tuft(-.16+i*.078,.22-i*.014,-.15,.11,.13,.16,i%3,-.28);tuft(.19,.15,.06,.055,.16,.26,2);tuft(-.18,.16,.07,.06,.12,.25)}
    if(style===2){for(let i=0;i<4;i++){const m=tuft(-.15+i*.1,.25,.035,.095,.12,.38,i%3);m.rotation.x=.25}tuft(0,.205,.22,.37,.1,.1,2)}
    if(style===3){for(let i=0;i<7;i++)tuft(-.19+i*.061,.27+(i%3)*.016,-.04+(i%2)*.07,.052,.085,.068,i%3,(i-3)*.14,'cone')}
    if(style===4){for(let row=0;row<3;row++)for(let i=0;i<5;i++)tuft(-.18+i*.09,.24+(row===1?.035:0),-.14+row*.13,.064,.066,.068,(i+row)%3,0,'sphere');for(const side of [-1,1])for(let i=0;i<3;i++)tuft(side*.21,.17-i*.055,.06,.046,.05,.065,i%3,0,'sphere')}
    if(style===5){tuft(0,-.025,.21,.44,.4,.085,2,0,'soft');for(const side of [-1,1])for(let i=0;i<3;i++)tuft(side*(.205+i*.008),.02,-.08+i*.11,.065,.38,.12,i%3,side*.06);for(let i=0;i<4;i++)tuft(-.15+i*.1,.15,-.204,.095,.12,.06,i%2)}
    if(style===6){for(let i=0;i<5;i++)tuft(-.16+i*.075,.24-i*.03,-.16,.105,.14,.13,i%3,-.42);tuft(.214,.05,-.025,.055,.2,.26,2);tuft(-.2,.15,.03,.05,.1,.26)}
    if(style===7){for(let i=0;i<4;i++)tuft(-.145+i*.095,.245,.03,.095,.12,.36,i%3);for(let i=0;i<4;i++){const m=tuft(0,.13-i*.075,.255+i*.027,.13-i*.015,.12,.12,i%3);m.rotation.x=-.35}tuft(0,.19,.242,.15,.045,.1,2)}
    if(style===8){tuft(0,.04,.211,.4,.25,.065,2,0,'soft');for(let i=0;i<7;i++)tuft((i%2?1:-1)*.025,.115-i*.055,.265,.084,.078,.085,i%3,(i%2?1:-1)*.4);tuft(0,-.275,.265,.055,.07,.06,1);for(let i=0;i<4;i++)tuft(-.15+i*.1,.22,-.13,.1,.11,.21,i%3)}
    if(style===9){for(const side of [-1,1]){tuft(side*.2,.27,.06,.095,.095,.095,0,0,'sphere');tuft(side*.2,.29,.065,.08,.06,.088,1,side*.35,'facet');tuft(side*.16,.135,-.14,.055,.16,.08,2,side*.15)}tuft(0,.23,-.09,.3,.09,.24)}
  }
  rebuild(initial);
  return {
    setAppearance: rebuild,
    getAppearance: ()=>({...appearance}),
    animate(time){
      // Short, infrequent blink; no wall-clock/random timers to leak across scene changes.
      const phase=time%4.7;
      const closed=phase>4.48?Math.sin((phase-4.48)/.22*Math.PI):0;
      eyes.forEach(eye=>eye.scale.y=1-Math.max(0,closed)*.92);
    },
    dispose(){parent.remove(group);owned.forEach(g=>g.dispose());Object.values(geometry).forEach(g=>g.dispose());materials.forEach(m=>m.dispose())},
  };
}
