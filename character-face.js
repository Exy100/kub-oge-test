import * as THREE from './vendor/three.module.js';
import { PALETTES, ROUND_EYES, SMILING_EYES_INDEX, SMILING_LID, normalizeAppearance } from './appearance.js?v=8';

// Chamfered silhouettes instead of sharp voxel corners; the rest of the world stays cubic.
export function makeSoftBox() {
  const shape = new THREE.Shape();
  shape.moveTo(-.4,-.4);shape.lineTo(.4,-.4);shape.lineTo(.4,.4);shape.lineTo(-.4,.4);shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape,{depth:.8,bevelEnabled:true,bevelThickness:.1,bevelSize:.1,bevelSegments:1,steps:1});
  geometry.translate(0,0,-.4);return geometry;
}
// Project the edges onto a rounded cube while keeping a broad, flat face.
function makeRoundedCube(radius) {
  const geometry = new THREE.BoxGeometry(1, 1, 1, 10, 10, 10);
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const point = new THREE.Vector3(), core = new THREE.Vector3(), outward = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    core.copy(point).clampScalar(radius - .5, .5 - radius);
    outward.subVectors(point, core).normalize();
    point.copy(core).addScaledVector(outward, radius);
    position.setXYZ(i, point.x, point.y, point.z);
    normal.setXYZ(i, outward.x, outward.y, outward.z);
  }
  return geometry;
}

// An asymmetric swept lock with a ridge that catches the light on the fringe.
function makeSweptLock() {
  const outline = [[-.50,.04],[-.31,.38],[.10,.48],[.47,.23],[.51,-.10],[.38,-.46],[-.17,-.26]];
  const positions = [];
  const ridge = [-.08,.08,-.50], back = [0,0,.50];
  for (let i = 0; i < outline.length; i++) {
    const [x,y] = outline[i], [u,v] = outline[(i+1) % outline.length];
    const a = [x,y,-.12], b = [u,v,-.12], c = [x*.86,y*.86,.34], d = [u*.86,v*.86,.34];
    positions.push(...ridge,...a,...b, ...b,...a,...c, ...b,...c,...d, ...back,...d,...c);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
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
function makePartedScalp() {
  const geometry = makeHairScalp();
  const position = geometry.attributes.position;
  // Shape the lower rim over the brow, down the temples and around the nape.
  for (let i = 0; i < 8; i++) {
    const x = position.getX(i), z = position.getZ(i);
    const front = THREE.MathUtils.clamp((.18 - z) / .36, 0, 1);
    const hairline = -.075 + front * .24 - x * .07;
    position.setY(i, hairline);
  }
  geometry.computeVertexNormals();
  return geometry;
}
function makeCapBrim() {
  const shape=new THREE.Shape();shape.moveTo(-.21,-.18);
  shape.bezierCurveTo(-.27,-.30,-.23,-.45,0,-.47);
  shape.bezierCurveTo(.23,-.45,.27,-.30,.21,-.18);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:2,curveSegments:16,steps:1});
  geometry.rotateX(Math.PI/2);geometry.translate(0,.17,0);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)-.035*Math.pow(Math.max(0,(-p.getZ(i)-.18)/.29),2));
  geometry.computeVertexNormals();return geometry;
}
function capFrontZ(y) {
  const rings=[[.167,-.23544],[.2605,-.22356],[.332,-.1728]];
  const pair=y<rings[1][0]?0:1;const [a,b]=[rings[pair],rings[pair+1]];
  return a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0]);
}
function makeCapLabel() {
  const geometry=new THREE.PlaneGeometry(.38,.144,12,8),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i)+.249;p.setY(i,y);p.setZ(i,capFrontZ(y)-.004)}
  // Front of the character is -Z. Flip UVs so text reads normally from that side.
  const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));
  geometry.computeVertexNormals();return geometry;
}
function makeSmilingLid() {
  const shape = new THREE.Shape();
  shape.moveTo(...SMILING_LID.start);
  for (const points of SMILING_LID.curves) shape.bezierCurveTo(...points);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {depth:1, bevelEnabled:false, curveSegments:10});
}
export function createFace(parent, initial) {
  const geometry = {
    smilingLid: makeSmilingLid(), soft: makeSoftBox(), scalp: makeHairScalp(), partedScalp: makePartedScalp(), head: makeRoundedCube(.18), rounded: makeRoundedCube(.2), swept: makeSweptLock(), sphere: new THREE.SphereGeometry(1,12,8),
    facet: new THREE.IcosahedronGeometry(1,0), cone: new THREE.ConeGeometry(1,2,6),
    softEar: new THREE.SphereGeometry(1,16,12), capBrim: makeCapBrim(), capLabel: makeCapLabel(),
  };
  const vertices=geometry.head.attributes.position;
  for(let i=0;i<vertices.count;i++)vertices.setX(i,vertices.getX(i)*(1-.14*Math.max(0,(-vertices.getY(i)-.05)/.45)));
  geometry.head.computeVertexNormals();
  const earVertices=geometry.softEar.attributes.position;
  for(let i=0;i<earVertices.count;i++){
    const y=earVertices.getY(i);earVertices.setX(i,earVertices.getX(i)*(1-.18*Math.max(0,y)));
  }
  geometry.softEar.computeVertexNormals();
  const materials = new Map();
  let capLabelMaterial;
  function getCapLabelMaterial() {
    if(capLabelMaterial)return capLabelMaterial;
    let map=null;
    if(typeof document!=='undefined'){
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=194;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='600 78px Arial, sans-serif';
      ctx.fillText('экзамены,',256,78);ctx.fillText('сдавайтесь.',256,170);
      map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
    }
    capLabelMaterial=new THREE.MeshBasicMaterial({map,color:0xffffff,transparent:true,alphaTest:.08,side:THREE.DoubleSide,depthWrite:false});
    return capLabelMaterial;
  }
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
    group=new THREE.Group();group.name='appearance';group.scale.set(1.10,1.045,1.06);parent.add(group);
    const [base,highlight,shade]=PALETTES[appearance.palette].colors;
    mesh(group,'face','head',0,-.005,0,.43,.445,.4,skin);


    // Eyes share a blink pivot; eyebrow shape and spacing also change with the preset.
    const eyeShapes=[
      [.048,.033,0,.094,0],[.055,.025,.15,.094,-.12],[.044,.044,0,.095,0],
      [.05,.023,0,.098,0],[.052,.023,.22,.092,-.25],[.063,.031,0,.105,.06],
      [.053,.016,.05,.094,-.04],[.045,.029,-.14,.09,.22],[.05,.039,.04,.098,-.06],[.053,.034,-.1,.098,.12],
    ];
    const [ew,eh,tilt,spacing,brow]=eyeShapes[appearance.eyes];
    for(const side of [-1,1]) {
      if (appearance.eyes === SMILING_EYES_INDEX) {
        const x = side * spacing;
        mesh(group,'smiling-lid','smilingLid',x,.013,-.210,.005,.005,.006,0x493b38);
        curve(group,'eyebrow',[[x-.045,.073,-.205],[x,.083,-.207],[x+.045,.073,-.205]],.0065,shade);
        continue;
      }
      const pivot=new THREE.Group();pivot.name='blink-eye';pivot.position.set(side*spacing,.015,-.205);pivot.rotation.z=side*tilt;group.add(pivot);eyes.push(pivot);
      if (appearance.eyes === 0) {
        mesh(pivot,'eye-white','rounded',0,0,0,.107,.086,.020,0xfff0da);
        mesh(pivot,'iris','sphere',-side*.005,0,-.012,.028,.039,.005,0x62402b);
        mesh(pivot,'pupil','sphere',-side*.005,.002,-.016,.017,.029,.003,0x34251e);
        mesh(pivot,'eye-glint','sphere',.005,.016,-.020,.006,.007,.002,0xfffbef);
      } else if (appearance.eyes === ROUND_EYES.index) {
        const irisRadius = ew * ROUND_EYES.iris;
        const pupilRadius = ew * ROUND_EYES.pupil;
        mesh(pivot,'eye-white','sphere',0,0,0,ew,eh,.009,0xfff5e1);
        mesh(pivot,'iris','sphere',0,0,-.010,irisRadius,irisRadius,.004,0x486e62);
        mesh(pivot,'pupil','sphere',0,0,-.015,pupilRadius,pupilRadius,.002,0x283d3e);
        mesh(pivot,'eye-glint','sphere',.009,.009,-.018,.005,.005,.002,0xffffff);
      } else {
        mesh(pivot,'eye-white','sphere',0,0,0,ew,eh,.009,0xfff5e1);
        mesh(pivot,'iris','sphere',-side*.004,-.001,-.010,ew*.43,eh*.76,.004,appearance.eyes===8?0x5e8295:0x486e62);
        mesh(pivot,'pupil','sphere',-side*.004,-.001,-.014,ew*.20,eh*.55,.002,0x283d3e);
        mesh(pivot,'eye-glint','sphere',-.009,.009,-.017,.006,.007,.002,0xffffff);
      }
      if(appearance.eyes===8)mesh(pivot,'second-glint','sphere',.009,-.008,-.017,.0035,.004,.002,0xffffff);
      if (appearance.eyes === 0) {
        const raised = side === -1;
        mesh(group,'eyebrow','rounded',side*spacing,raised ? .100 : .085,-.204,
          .094,.024,.021,shade,raised ? -.18 : .05);
      } else mesh(group,'eyebrow','soft',side*spacing,.077,-.206,ew*1.8,.016,.018,shade,side*brow);
    }
    const nose=appearance.nose;
    if(nose===0)mesh(group,'nose-button','rounded',0,-.050,-.218,.062,.044,.057,0xd79f78);
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
      [[-.055,.008,0],[-.018,-.002,-.003],[.028,-.002,-.003],[.054,.001,0]],
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
    if(appearance.mouth===5){
      mesh(mouth,'calm-upper-lip','sphere',0,.005,0,.037,.006,.0035,0xb67e73);
      mesh(mouth,'calm-lower-lip','sphere',0,-.009,0,.035,.006,.0035,0xc18b7e);
      curve(mouth,'calm-lip-seam',[[-.044,0,-.004],[-.021,.002,-.004],[0,0,-.005],[.021,.002,-.004],[.044,0,-.004]],.0027,lip);
    }
    if(appearance.mouth===7)mesh(mouth,'dimple','sphere',-.065,.022,0,.007,.008,.006,skinShadow);
    if(appearance.mouth===9){mesh(mouth,'open-smile','sphere',0,-.002,0,.052,.029,.012,0x754c4b);mesh(mouth,'teeth','soft',0,.014,-.011,.079,.017,.012,0xfff4de);mesh(mouth,'lower-lip','sphere',0,-.023,-.006,.033,.008,.006,lip)}

    const earShapes=[
      [.032,.055,.036,.225,0],[.047,.05,.036,.23,0],[.035,.078,.038,.228,0],
      [.023,.075,.031,.224,0],[.055,.062,.037,.233,0],[.024,.06,.02,.222,.25],
      [.055,.064,.043,.247,-.2],[.037,.065,.035,.23,0],[.038,.064,.031,.232,-.12],
      [.048,.066,.042,.233,0],
    ];
    const [ex,ey,ez,offset,angle]=earShapes[appearance.ears];
    for(const side of [-1,1]) {
      const ear=mesh(group,'ear',appearance.ears===9?'facet':appearance.ears===8?'softEar':'sphere',side*offset,-.016,0,ex,ey,ez,skin,side*angle);
      mesh(group,'ear-inner',appearance.ears===8?'softEar':'sphere',side*(offset+.006),-.016,-ez*.7,ex*.48,ey*.55,appearance.ears===8?.007:.012,0xc88e79,side*angle);
      if(appearance.ears===8){
        mesh(group,'soft-ear-lobe','sphere',side*.231,-.058,0,.025,.019,.024,skin);
        curve(group,'ear-fold',[[side*.233,-.041,-.032],[side*.245,-.015,-.033],[side*.239,.017,-.029]],.003,skinShadow);
      }
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
    const style=appearance.hair;
    if(style!==9)mesh(hair,'hair-scalp',style===1?'partedScalp':'scalp',0,0,0,1,1,1,base);
    if(style!==1)tuft(0,.092,.187,.413,.22,.055,2,0,'soft');
    if(style===0){for(let i=0;i<5;i++)tuft(-.17+i*.085,.244+(i%2)*.014,-.035,.115,.09,.32,i%3,-.12);tuft(.19,.12,.035,.06,.16,.26,2)}
    if (style === 1) {
      for (const side of [-1,1]) {
        tuft(side*.204,.10,-.116,.055,.155,.132,2,side*.12,'swept');
      }
      tuft(-.125,.211,-.115,.205,.130,.218,0,.17,'swept');
      tuft(-.062,.259,-.050,.280,.132,.270,1,.05,'swept');
      tuft(.100,.214,-.140,.237,.158,.208,0,-.25,'swept');
      tuft(.050,.208,-.215,.339,.157,.145,0,-.32,'swept');
    }
    if(style===2){for(let i=0;i<4;i++){const m=tuft(-.15+i*.1,.25,.035,.095,.12,.38,i%3);m.rotation.x=.25}tuft(0,.205,.22,.37,.1,.1,2)}
    if(style===3){for(let i=0;i<7;i++)tuft(-.19+i*.061,.27+(i%3)*.016,-.04+(i%2)*.07,.052,.085,.068,i%3,(i-3)*.14,'cone')}
    if(style===4){for(let row=0;row<3;row++)for(let i=0;i<5;i++)tuft(-.18+i*.09,.24+(row===1?.035:0),-.14+row*.13,.064,.066,.068,(i+row)%3,0,'sphere');for(const side of [-1,1])for(let i=0;i<3;i++)tuft(side*.21,.17-i*.055,.06,.046,.05,.065,i%3,0,'sphere')}
    if(style===5){tuft(0,-.025,.21,.44,.4,.085,2,0,'soft');for(const side of [-1,1])for(let i=0;i<3;i++)tuft(side*(.205+i*.008),.02,-.08+i*.11,.065,.38,.12,i%3,side*.06);for(let i=0;i<4;i++)tuft(-.15+i*.1,.15,-.204,.095,.12,.06,i%2)}
    if(style===6){for(let i=0;i<5;i++)tuft(-.16+i*.075,.24-i*.03,-.16,.105,.14,.13,i%3,-.42);tuft(.214,.05,-.025,.055,.2,.26,2);tuft(-.2,.15,.03,.05,.1,.26)}
    if(style===7){for(let i=0;i<4;i++)tuft(-.145+i*.095,.245,.03,.095,.12,.36,i%3);for(let i=0;i<4;i++){const m=tuft(0,.13-i*.075,.255+i*.027,.13-i*.015,.12,.12,i%3);m.rotation.x=-.35}tuft(0,.19,.242,.15,.045,.1,2)}
    if(style===8){
      // A cropped, upright brush with rounded, uneven tips instead of triangular cartoon spikes.
      for(let row=0;row<3;row++)for(let i=0;i<5;i++){
        const height=[.145,.175,.185,.165,.15][i]-(row===2?.025:0);
        const strand=tuft(-.16+i*.08,.27,-.13+row*.115,.073,height,.078,(i+row)%3,(i-2)*.035);
        strand.name='upright-hair-strand';strand.rotation.x=(row-1)*.055;
      }
      for(const side of [-1,1])tuft(side*.21,.14,.02,.045,.13,.27,2);
    }
    if(style===9){
      // Neutral fabric stays the same colour; the selected palette colours the visible hair.
      for(const side of [-1,1])for(let i=0;i<2;i++)tuft(side*.208,.10-i*.035,.01,.046,.09,.26,i?1:0);
      const cap=new THREE.Group();cap.name='baseball-cap';hair.add(cap);
      mesh(cap,'cap-crown','scalp',0,.035,0,1.1,1.1,1.08,0x59636b);
      mesh(cap,'cap-brim','capBrim',0,0,0,1,1,1,0x4c565f);
      mesh(cap,'cap-button','sphere',0,.377,0,.018,.009,.018,0x657079);
      for(const side of [-1,1])curve(cap,'cap-panel-seam',[[side*.16,.205,-.21],[side*.14,.285,-.177],[side*.07,.35,-.09],[0,.37,0]],.0018,0x78838b);
      curve(cap,'cap-brim-seam',[[-.20,.157,-.245],[-.16,.141,-.395],[0,.134,-.454],[.16,.141,-.395],[.20,.157,-.245]],.0015,0x75808a);
      const label=new THREE.Mesh(geometry.capLabel,getCapLabelMaterial());label.name='cap-lettering';label.userData.text='экзамены, сдавайтесь.';cap.add(label);
    }
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
    dispose(){parent.remove(group);owned.forEach(g=>g.dispose());Object.values(geometry).forEach(g=>g.dispose());materials.forEach(m=>m.dispose());capLabelMaterial?.map?.dispose();capLabelMaterial?.dispose()},
  };
}
