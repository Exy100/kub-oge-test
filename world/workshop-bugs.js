import {Vector3} from '../vendor/three.module.js';
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
  const {face,block,band}=brush;
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

function greenCartridge({block,face}){
  block(0,.64,-.115,.97,.39,1.12,graphite,.11);
  block(0,.819,-.12,.87,.105,.97,iron,.047);
  block(0,.90,-.115,.42,.105,.68,0x23634e,.044);
  // Cut the crystal shoulders into broad facets around a flat rectangular table.
  const corners=[[.197,.305],[-.197,.305],[-.197,-.305],[.197,-.305]];
  const base=corners.map(([x,z])=>[x,.945,z-.115]);
  const table=corners.map(([x,z])=>[x*.77,.995,z*.83-.115]);
  for(let j=0;j<4;j++){
    const k=(j+1)%4;
    face([base[j],table[j],table[k],base[k]],[0x54cc94,0x299c75,0x278960,0x40ae85][j]);
  }
  face(table.slice().reverse(),emerald);
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
function leg(brush,side,row,green){
  const {block}=brush;
  const spread=green?.34:.28, sweep=(row-1)*.135;
  limb(brush,[[0,0,0,.094],[side*.16,.065,sweep*.6,.105],
    [side*spread,-.055,sweep,.075]],graphite,sideGuide);
  limb(brush,[[side*.105,.05,sweep*.42,.105],[side*.215,.06,sweep*.74,.125],
    [side*(spread+.02),-.08,sweep,.086]],green?leaf:orange,sideGuide);
  limb(brush,[[side*spread,-.063,sweep,.072],[side*(spread+.072),-.205,sweep+.027,.062],
    [side*(spread+.085),-.28,sweep+.095,.029]],graphite,sideGuide);
  // Split armoured greave, ankle collar and a brass pin through the knee bearing.
  const knuckle=side*(spread-.012);
  block(knuckle,-.041,sweep,.157,.155,.157,green?iron:0x80583c,.041);
  block(knuckle,-.041,sweep+.087,.092,.092,.041,brass,.026);
  block(knuckle,-.041,sweep+.109,.044,.026,.012,graphite,.006,side*.45);
  limb(brush,[[side*(spread+.04),-.137,sweep+.009,.074],
    [side*(spread+.065),-.191,sweep+.026,.068]],green?0x849b41:0xa26341,sideGuide);

}

export function createBugBody(root,index,material){
  const green=index===1;
  paintedPart(root,green?'emerald-cartridge':'copper-shield',material,brush=>{
    brush.block(0,.41,-.07,.77,.31,1.06,graphite,.081);
    if(green)greenCartridge(brush);
    else orangeShell(brush);
    helmet(brush,green);
  });
  const legs=[];
  for(const side of [-1,1])for(let row=0;row<3;row++){
    const foot=paintedPart(root,'bug-leg',material,brush=>leg(brush,side,row,green));
    foot.position.set(side*.41,.318,(row-1)*.38);
    legs.push(foot);
  }
  let aerials;
  if(green){
    aerials=paintedPart(root,'signal-antennae',material,brush=>{
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
  return function animate(time,reduced){
    const stride=reduced?0:Math.sin(time*(green?10:8));
    legs.forEach((foot,i)=>{
      const swing=i%2===0?stride:-stride;
      foot.rotation.x=swing*(green?.34:.26);
      foot.position.y=.318+Math.max(0,swing)*.061;
    });
    if(aerials)aerials.rotation.x=reduced?0:.073*Math.sin(time*5);
  };
}
