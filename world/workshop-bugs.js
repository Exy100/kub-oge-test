import {Group,Vector3} from '../vendor/three.module.js';
import {paintedPart} from './painted-part.js';

const graphite=0x374349, iron=0x566267, brass=0xd29754;
const orange=0xdf793c, copper=0xb85832, apricot=0xf19b53;
const leaf=0xa2bb47, lime=0xcde071, emerald=0x32bb82;

// Sweep a hexagonal section through each joint. The last section can taper to a toe.
function limb({face}, joints, color, guide) {
  const centers=joints.map(([x,y,z])=>new Vector3(x,y,z));
  const rings=centers.map((center,i)=>{
    const tangent=centers[Math.min(i+1,centers.length-1)].clone()
      .sub(centers[Math.max(i-1,0)]).normalize();
    const u=new Vector3().crossVectors(tangent,guide).normalize();
    const v=new Vector3().crossVectors(tangent,u);
    return Array.from({length:6},(_,j)=>{
      const a=j*Math.PI/3, radius=joints[i][3];
      return center.clone().addScaledVector(u,radius*Math.cos(a))
        .addScaledVector(v,radius*Math.sin(a)).toArray();
    });
  });
  face(rings[0].slice().reverse(),color);
  for(let i=1;i<rings.length;i++)for(let j=0;j<6;j++){
    const k=(j+1)%6;
    face([rings[i-1][j],rings[i-1][k],rings[i][k],rings[i][j]],color);
  }
  face(rings[rings.length-1],color);
}

function orangeShell(brush) {
  const {face,block}=brush;
  // One closed arch over the whole back. Both shoulders meet the same crown.
  const profile=[
    [-1,.34],[-.91,.60],[-.68,.83],[-.38,.96],[0,1],
    [.38,.96],[.68,.83],[.91,.60],[1,.34],[.96,0],[-.96,0],
  ];
  const sections=[
    [-.77,.16,.66],[-.705,.31,.755],[-.60,.424,.85],[-.44,.506,.927],
    [-.23,.538,.974],[0,.54,.98],[.14,.513,.956],[.26,.46,.89],
  ];
  const rings=sections.map(([z,w,h])=>profile.map(([x,y])=>[x*w,.45+(h-.45)*y,z]));
  face(rings[0],copper);
  const colors=[copper,0xce6734,orange,0xe88943,0xe88943,orange,0xce6734,copper,0x975034,graphite,0x975034];
  for(let i=1;i<rings.length;i++)for(let j=0;j<profile.length;j++){
    const k=(j+1)%profile.length;
    face([rings[i-1][k],rings[i-1][j],rings[i][j],rings[i][k]],colors[j]);
  }
  face(rings.at(-1).slice().reverse(),copper);
  for(const side of [-1,1]){
    // Exhaust slots sit between the legs, capped by copper heat shields.
    for(const [z,offset] of [[-.40,.486],[-.19,.523],[.035,.525]]){
      block(side*offset,.518,z,.077,.131,.153,graphite,.024,side*.16);
      block(side*(offset+.036),.558,z,.045,.046,.159,0xc47845,.012,side*.16);
    }
  }
  // Three bands guard the exposed exhaust on the tail.
  for(const x of [-.09,0,.09])block(x,.548,-.773,.045,.11,.032,0x945435,.01);
}

function frontShield({block,face,band}){
  // The forward shield broadens toward the eyes, with a stepped copper lip.
  const shield=[[.42,.78],[-.42,.78],[-.55,.53],[-.48,.22],
    [-.28,.12],[.28,.12],[.48,.22],[.55,.47]];
  const rim=(scale,y)=>shield.map(([x,z])=>[x*scale,y,.36+(z-.36)*scale]);
  const lip=rim(1,.778), crest=rim(.79,.927);
  face(rim(.89,.699),copper);
  band(rim(.89,.699),lip,0x9a492e);
  band(lip,crest,orange);
  for(let j=0;j<crest.length;j++){
    const k=(j+1)%crest.length;
    face([crest[j],[0,.965,.32],crest[k]],j===0||j===7?apricot:orange);
  }
  for(const side of [-1,1]){
    block(side*.34,.912,.38,.061,.042,.064,brass,.013);
    block(side*.50,.755,.48,.076,.079,.091,0xa76339,.019);
  }
}

function crystalFace({face}){
  // Cut the crystal shoulders into broad facets around a flat rectangular table.
  const corners=[[.197,.305],[-.197,.305],[-.197,-.305],[.197,-.305]];
  const base=corners.map(([x,z])=>[x,.945,z-.115]);
  const table=corners.map(([x,z])=>[x*.77,.995,z*.83-.115]);
  for(let j=0;j<4;j++){
    const k=(j+1)%4;
    face([base[j],table[j],table[k],base[k]],[0x54cc94,0x299c75,0x278960,0x40ae85][j]);
  }
  face(table.slice().reverse(),emerald);
}

function greenCartridge({block}){
  block(0,.64,-.115,.97,.39,1.12,graphite,.11);
  block(0,.819,-.12,.87,.105,.97,iron,.047);
  block(0,.90,-.115,.42,.105,.68,0x23634e,.044);
  // Backplate with three recessed cooling channels and contrasting upper louvers.
  block(0,.657,-.678,.69,.205,.049,iron,.036);
  for(const x of [-.22,0,.22]){
    block(x,.657,-.707,.139,.112,.029,0x263539,.026);
    block(x,.697,-.725,.139,.037,.023,iron,.009);
  }
  for(const side of [-1,1]){
    block(side*.338,.916,-.117,.166,.21,.99,0x59636b,.055);
    // Machined catches clamp the crystal at its ends; the rails carry its fasteners.
    for(const z of [-.405,.175]){
      block(side*.194,.961,z,.064,.063,.081,0x899687,.014);
      block(side*.338,1.019,z,.09,.026,.089,0x364448,.01);
      block(side*.338,1.034,z,.046,.013,.046,brass,.004);
    }
    for(const z of [-.53,.28]){
      block(side*.338,.873,z,.188,.11,.15,0x83908b,.035);
      block(side*.49,.70,z,.045,.081,.084,brass,.017);
    }
    block(side*.337,.908,-.612,.144,.066,.043,0x899485,.014);
    block(side*.337,.908,.384,.144,.066,.043,0x899485,.014);
    for(const z of [-.425,.179]){
      block(side*.468,.535,z,.09,.115,.135,iron,.027);
      block(side*.519,.536,z,.024,.047,.088,0x91a18a,.011);
    }
    block(side*.493,.66,-.115,.027,.035,.54,0xa0ba55,.007);
    for(const z of [-.33,-.115,.10]){
      block(side*.511,.66,z,.022,.082,.081,lime,.019);
      block(side*.524,.66,z,.015,.034,.035,graphite,.006);
    }
  }
}

// The helmet, inset screen and raised lenses use fitted front-facing contours.
// Shape the visor in depth so it also reads in three-quarter view.
function helmet(brush,green){
  const {face,block}=brush;
  const contour=green
    ? [[0,1],[-.65,.95],[-.94,.62],[-1,.03],[-.82,-.56],[-.48,-.88],
       [0,-1],[.48,-.88],[.82,-.56],[1,.03],[.94,.62],[.65,.95]]
    : [[0,1],[-.64,1],[-.93,.79],[-1,.36],[-.94,-.35],[-.70,-.73],
       [0,-.91],[.70,-.73],[.94,-.35],[1,.36],[.93,.79],[.64,1]];
  const visorZ=(x,y)=>(green?.811:.784)-.48*x*x+.12*(y-.61);
  const ring=(w,h,cy,dz)=>contour.map(([u,v])=>{
    const x=u*w,y=cy+v*h;
    return [x,y,visorZ(x,y)+dz];
  });
  const rear=ring(.29,.18,.60,-.29);
  const widest=ring(green?.391:.411,.219,.613,-.088);
  const cheek=ring(green?.363:.386,.202,.612,.003);
  const opening=ring(green?.303:.333,green?.144:.119,.61,.016);
  const screen=ring(green?.284:.313,green?.127:.107,.61,-.005);
  function trim(outer,inner,color){
    for(let i=0;i<outer.length;i++){
      const k=(i+1)%outer.length;
      face([outer[i],outer[k],inner[k],inner[i]],color);
    }
  }
  face(rear.slice().reverse(),graphite);
  trim(rear,widest,green?0x899e37:copper);
  trim(widest,cheek,green?leaf:orange);
  trim(cheek,opening,green?0xbad34a:0xe19a54);
  trim(opening,screen,green?0x60732e:0x805239);
  screen.forEach((p,i)=>face([p,screen[(i+1)%screen.length],[0,.61,visorZ(0,.61)-.008]],0x283334));

  // Each lens has a bevel and a coloured optical face. Green gets the swept
  // leaf-shaped eyes of the concept, orange gets round amber lamps under its brow.
  for(const side of [-1,1]){
    const outline=green
      ? [[-.109,-.01],[-.08,-.052],[.019,-.062],[.092,-.012],[.116,.066],[.018,.043]]
      : [[-.087,.018],[-.073,-.045],[-.021,-.064],[.046,-.056],
         [.084,-.022],[.084,.025],[.048,.062],[-.041,.06]];
    const cx=green?.15:.17,cy=.625;
    const lens=(scale,lift)=>outline.map(([dx,dy])=>{
      const x=side*(cx+dx*scale),y=cy+dy*scale;
      return [x,y,visorZ(x,y)+lift];
    });
    const socket=lens(1.15,.005),edge=lens(1,.019),glass=lens(.78,.034);
    if(side<0){socket.reverse();edge.reverse();glass.reverse()}
    trim(socket,edge,green?0x778f31:brass);
    trim(edge,glass,green?0xcbdc4a:0xf4a236);
    face(glass,green?0xe3ef76:0xffc250);
    const highlightX=side*(cx+.03);
    block(highlightX,.647,visorZ(highlightX,.647)+.039,.052,.018,.009,green?0xf4fac0:0xffe698,.004,side*.19);
    block(side*.314,.548,.701,.066,.067,.079,green?0x90a740:copper,.018,side*.32);
  }
}

const sideGuide=new Vector3(0,0,1);
function makeLeg(root,material,side,row,green){
  const spread=green?.34:.30, sweep=(row-1)*.13;
  const hip=new Vector3(side*.37,.35,(row-1)*.38);
  const femur=new Vector3(side*spread,green?.066:.12,sweep);
  const shin=new Vector3(side*.053,-.319-femur.y,.075);
  const knee=paintedPart(root,'bug-leg',material,brush=>{
    limb(brush,[[0,0,0,.084],[side*.15,.09,sweep*.5,.098],
      [femur.x,femur.y,sweep,.074]],graphite,sideGuide);
    limb(brush,[[side*.095,.063,sweep*.38,.095],[side*.22,.099,sweep*.69,.117],
      [femur.x,femur.y,sweep,.085]],green?leaf:orange,sideGuide);
    brush.block(femur.x,femur.y,sweep,.15,.15,.15,green?iron:0x80583c,.038);
    brush.block(femur.x,femur.y,sweep+.082,.089,.089,.033,brass,.02);
  });
  const foot=paintedPart(root,'bug-shin',material,brush=>{
    limb(brush,[[0,0,0,.077],[side*.045,-.16,0,.071],
      [side*.05,-.31,.024,.055],[shin.x,shin.y,shin.z,.022]],graphite,sideGuide);
    limb(brush,[[side*.039,-.125,0,.078],[side*.05,-.213,.008,.064]],
      green?0x849b41:0xa26341,sideGuide);
  });
  // Put the ankle mesh origin at the actual contact tip.
  foot.geometry.translate(-shin.x,-shin.y,-shin.z);
  const home=hip.clone().add(femur).add(shin);
  const upperLength=femur.length(),lowerLength=shin.length();
  const upperAxis=femur.clone().normalize(),lowerAxis=shin.clone().normalize();
  const direction=new Vector3(),bend=new Vector3(),axis=new Vector3();

  function plant(target,bodyOffset){
    // Solve the two links toward the contact point, with the knee pointing up.
    knee.position.copy(hip).add(bodyOffset);
    direction.subVectors(target,knee.position);
    const reach=direction.length();
    direction.multiplyScalar(1/reach);
    const along=(upperLength**2-lowerLength**2+reach**2)/(2*reach);
    bend.set(0,1,0).addScaledVector(direction,-direction.y).normalize();
    foot.position.copy(knee.position).addScaledVector(direction,along)
      .addScaledVector(bend,Math.sqrt(Math.max(0,upperLength**2-along**2)));
    knee.quaternion.setFromUnitVectors(upperAxis,axis.subVectors(foot.position,knee.position).normalize());
    foot.quaternion.setFromUnitVectors(lowerAxis,axis.subVectors(target,foot.position).normalize());
    foot.position.copy(target);
  }
  return {home,plant};
}

export function createBugBody(root,index,material){
  const green=index===1;
  const thorax=new Group();root.add(thorax);
  paintedPart(thorax,green?'emerald-cartridge':'copper-shield',material,brush=>{
    brush.block(0,.41,-.07,.77,.31,1.06,graphite,.081);
    if(green)greenCartridge(brush);
    else orangeShell(brush);
    helmet(brush,green);
  });
  // Only the visor hinge and the crystal need independent transforms or tint.
  let visor,crystal;
  if(green)crystal=paintedPart(thorax,'bug-emerald',material.clone(),crystalFace);
  else{
    visor=paintedPart(thorax,'bug-visor',material,frontShield);
    visor.geometry.translate(0,-.78,-.22);visor.position.set(0,.78,.22);
  }
  const legs=[];
  for(const side of [-1,1])for(let row=0;row<3;row++)legs.push(makeLeg(root,material,side,row,green));
  let aerials;
  if(green){
    aerials=paintedPart(thorax,'signal-antennae',material,brush=>{
      for(const side of [-1,1]){
        limb(brush,[[side*.18,0,0,.049],[side*.22,.23,.065,.043],
          [side*.33,.44,.13,.032]],graphite,sideGuide);
        brush.block(side*.18,.022,.02,.129,.123,.136,0x738440,.032);
        limb(brush,[[side*.222,.231,.066,.052],[side*.243,.275,.084,.047]],iron,sideGuide);
        brush.block(side*.33,.45,.13,.145,.15,.135,leaf,.025,-side*.23);
        brush.block(side*.33,.462,.065,.080,.083,.018,0xd7e878,.012,-side*.23);
        brush.block(side*.33,.466,.195,.079,.08,.027,0xe6f18b,.014,-side*.23);
      }
    });
    aerials.position.set(0,.755,.47);
  }
  const center=new Vector3(),contact=new Vector3(),next=new Vector3();
  const stride=green?.81:.91,stance=.56;
  let resting=false,reacting=false;
  function clearReaction(){
    if(!reacting)return;
    reacting=false;
    if(visor)visor.rotation.x=0;
    if(crystal)crystal.material.color.setScalar(1);
    if(aerials)aerials.rotation.set(0,0,0);
  }
  function pose(amount,bearing,disabled,recoil=0){
    resting=false;reacting=true;
    thorax.position.set(0,-(green?.095:.15)*amount,-.105*recoil);
    thorax.rotation.set((green?-.085:.15)*amount-.14*recoil,0,.09*Math.sin(bearing)*recoil);
    if(visor)visor.rotation.x=.35*amount;
    if(aerials){
      aerials.rotation.set((disabled?.97:.48)*amount-.32*recoil,disabled?0:bearing*amount,disabled?0:-.22*Math.sin(bearing)*amount);
      crystal.material.color.setScalar(1-(disabled?.79:.26)*amount);
    }
    for(const {home,plant} of legs){
      contact.copy(home);
      if(!green && home.z>.35){
        contact.x+=Math.sign(home.x)*.105*amount;
        contact.z+=.09*amount;
      }
      plant(contact,thorax.position);
    }
  }
  function rest(){
    clearReaction();
    if(resting)return;
    resting=true;
    thorax.position.set(0,0,0);thorax.rotation.set(0,0,0);
    for(const leg of legs)leg.plant(leg.home,thorax.position);
    if(aerials)aerials.rotation.x=0;
  }
  function walk(route,distance,yaw,reduced){
    clearReaction();
    if(reduced){rest();return}
    resting=false;
    const phase=distance/stride,beat=phase*Math.PI*2;
    thorax.position.set(.028*Math.cos(beat),.019*Math.sin(beat*2),0);
    thorax.rotation.set(.032*Math.cos(beat*2),0,.044*Math.cos(beat));
    if(aerials)aerials.rotation.x=.095*Math.sin(beat-.4);
    route.sample(distance,0,0,center);
    const c=Math.cos(yaw),s=Math.sin(yaw);
    legs.forEach(({home,plant},i)=>{
      // Alternate tripods. In stance the footprint stays in island coordinates,
      // even while the body turns. Swing to the next footprint with eased lift.
      const cycle=phase+(i%2)*.5,step=cycle-Math.floor(cycle);
      const anchor=distance+(stance*.5-step)*stride;
      route.sample(anchor,home.x,home.z,contact);
      let lift=0;
      if(step>stance){
        const t=(step-stance)/(1-stance);
        route.sample(anchor+stride,home.x,home.z,next);
        contact.lerp(next,t*t*(3-2*t));
        lift=(green?.19:.16)*Math.sin(Math.PI*t)**2;
      }
      const dx=contact.x-center.x,dz=contact.z-center.z;
      contact.set(c*dx-s*dz,home.y+lift,s*dx+c*dz);
      plant(contact,thorax.position);
    });
  }
  rest();
  return {walk,rest,pose};
}
