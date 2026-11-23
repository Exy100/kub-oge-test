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
  // Each mirrored wing cover has a raised inner ridge, a skirt and a narrow centre seam.
  const sections=[
    [-.77,.16,.66],[-.63,.41,.83],[-.32,.53,.95],
    [.06,.54,.98],[.26,.46,.89],
  ];
  for(const side of [-1,1]){
    const rings=sections.map(([z,w,top])=>
      [[.014,.46],[.014,top-.06],[w*.38,top],[w*.79,top-.075],
       [w,top-.22],[w*.94,.45]].map(([x,y])=>[side*x,y,z]));
    function panel(vertices,color){face(side>0?vertices.slice().reverse():vertices,color)}
    panel(rings[0].slice().reverse(),copper);
    const coat=[copper,apricot,orange,0xce6937,0x93472e,graphite];
    for(let i=1;i<rings.length;i++)for(let j=0;j<coat.length;j++){
      const k=(j+1)%coat.length;
      panel([rings[i-1][j],rings[i-1][k],rings[i][k],rings[i][j]],coat[j]);
    }
    panel(rings[rings.length-1],copper);
    for(const z of [-.39,-.14,.10]){
      block(side*.513,.495,z,.084,.13,.117,graphite,.023,side*.16);
    }
  }
  // The forward shield broadens toward the eyes, with a stepped copper lip.
  const shield=[[.42,.59],[-.42,.59],[-.55,.47],[-.48,.22],
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
    limb(brush,[[side*.294,.49,.57,.075],[side*.35,.475,.69,.075],
      [side*.308,.46,.776,.049],[side*.255,.487,.79,.020]],0x875539,sideGuide);
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
  for(const x of [-.22,0,.22]){
    block(x,.657,-.682,.113,.11,.029,0x263539,.026);
  }
  for(const side of [-1,1]){
    block(side*.338,.916,-.117,.166,.21,.99,0x59636b,.055);
    for(const z of [-.53,.28]){
      block(side*.338,.873,z,.188,.11,.15,0x83908b,.035);
      block(side*.49,.70,z,.045,.081,.084,brass,.017);
    }
    block(side*.493,.66,-.115,.027,.035,.54,0xa0ba55,.007);
    for(const z of [-.33,-.115,.10]){
      block(side*.511,.66,z,.022,.082,.081,lime,.019);
      block(side*.524,.66,z,.015,.034,.035,graphite,.006);
    }
  }
}

function faceplate({block},green){
  const z=green?.45:.475;
  block(0,.592,z,.76,.39,.46,green?leaf:copper,.10);
  block(0,.582,z+.21,.636,.217,.105,graphite,.042);
  for(const side of [-1,1]){
    block(side*.161,.607,z+.27,.18,.077,.035,green?0xe7ef87:0xffbc50,.02,side*.20);
    block(side*.19,.625,z+.289,.052,.034,.012,green?0xf0f9b3:0xffe4a0,.006);
  }
  block(0,.466,z+.18,.45,.085,.155,green?leaf:0x98603e,.031);
}

const sideGuide=new Vector3(0,0,1);
function leg(brush,side,row,green){
  const spread=green?.34:.28, sweep=(row-1)*.135;
  limb(brush,[[0,0,0,.094],[side*.16,.065,sweep*.6,.105],
    [side*spread,-.055,sweep,.075]],graphite,sideGuide);
  limb(brush,[[side*.105,.05,sweep*.42,.105],[side*.215,.06,sweep*.74,.125],
    [side*(spread+.02),-.08,sweep,.086]],green?leaf:orange,sideGuide);
  limb(brush,[[side*spread,-.063,sweep,.072],[side*(spread+.072),-.205,sweep+.027,.062],
    [side*(spread+.085),-.28,sweep+.095,.029]],graphite,sideGuide);
}

export function createBugBody(root,index,material){
  const green=index===1;
  paintedPart(root,green?'emerald-cartridge':'copper-shield',material,brush=>{
    brush.block(0,.41,-.07,.77,.31,1.06,graphite,.081);
    if(green)greenCartridge(brush);
    else orangeShell(brush);
    faceplate(brush,green);
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
        brush.block(side*.33,.45,.13,.145,.15,.135,leaf,.025,-side*.23);
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
