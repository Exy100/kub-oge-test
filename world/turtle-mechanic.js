import * as THREE from '../vendor/three.module.js';
import {paintedPart} from './painted-part.js';

import {createWoodcuttingAxe} from './woodcutting-axe.js';

const shellWidth=.92, shellLength=1.07;
function shellY(x,z){
  return .74+.83*Math.pow(Math.max(0,1-(x/shellWidth)**2-(z/shellLength)**2),.68);
}

function makeShell({block,band,face}){
  const outline=Array.from({length:20},(_,i)=>{
    const angle=i*Math.PI/10;
    return [Math.cos(angle)*shellWidth,Math.sin(angle)*shellLength];
  });
  const ring=(radius,y)=>outline.map(([x,z])=>[x*radius,y,z*radius]);
  band(ring(.93,.52),ring(1,.62),0x655d3c);
  band(ring(1,.62),ring(1,.72),0xb09d68);
  band(ring(1,.72),ring(.99,.80),0x64653c);
  for(let i=0;i<outline.length;i++){
    const [a,b]=outline[i], [c,d]=outline[(i+1)%outline.length];
    face([[a,.73,b],[0,1.48,0],[c,.73,d]],0x64653c);
  }

  // Cut fitted polygonal scutes out of the same oval, leaving narrow seams.
  const seeds=[[0,0],[0,.59],[0,-.59]];
  for(const side of [-1,1]) for(const [x,z] of [[.52,.32],[.52,-.32],[.48,.84],[.48,-.84],[.89,0]])seeds.push([side*x,z]);
  const olive=[0x999d5c,0xa1a665,0x899650,0x89934f,0x949e57];
  seeds.forEach(([x,z],i)=>{
    let cell=outline;
    for(const [u,v] of seeds){
      if(u===x && v===z)continue;
      const clipped=[];
      const dist=([a,b])=>(a-(x+u)/2)*(u-x)+(b-(z+v)/2)*(v-z);
      cell.forEach((p,j)=>{
        const q=cell[(j+1)%cell.length], dp=dist(p),dq=dist(q);
        if(dp<=0)clipped.push(p);
        if((dp<0)!==(dq<0)){
          const t=dp/(dp-dq);clipped.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);
        }
      });
      cell=clipped;
    }
    const cx=cell.reduce((n,p)=>n+p[0],0)/cell.length,cz=cell.reduce((n,p)=>n+p[1],0)/cell.length;
    function contour(f,lift){return cell.map(([a,b])=>{
      const px=cx+(a-cx)*f,pz=cz+(b-cz)*f;
      return [px,shellY(px,pz)+lift,pz];
    })}
    const base=contour(1,-.035);
    base.forEach((p,j)=>face([p,[cx,shellY(cx,cz)-.035,cz],base[(j+1)%base.length]],0x676f44));
    const low=contour(.982,-.025), high=contour(.91,.005);
    band(low,high,0x79834c);
    high.forEach((p,j)=>face([p,[cx,shellY(cx,cz)+.025,cz],high[(j+1)%high.length]],olive[i%olive.length]));
  });

  // Two leather straps follow the dome, then descend behind the saddlebags.
  for(const z of [-.45,.45]){
    const rails=[-.072,.072].map(offset=>{
      const pz=z+offset;
      return Array.from({length:15},(_,j)=>{
        const angle=Math.PI*(j/14);
        const x=shellWidth*Math.sqrt(1-(pz/shellLength)**2)*Math.cos(angle);
        return [x,shellY(x,pz)+.044,pz];
      });
    });
    for(let j=0;j<14;j++){
      face([rails[0][j],rails[0][j+1],rails[1][j+1],rails[1][j]],0x765337);
      for(const rail of rails){
        const edge=rail===rails[0]?[rail[j],rail[j+1]]:[rail[j+1],rail[j]];
        const [a,b]=edge;
        face([b,a,[a[0],a[1]-.048,a[2]],[b[0],b[1]-.048,b[2]]],0x62492f);
      }
    }
    for(const side of [-1,1]){
      const x=side*.51,y=shellY(x,z)+.061, tilt=-side*.65;
      for(const dz of [-.077,.077])block(x,y,z+dz,.15,.031,.028,0xd7ae62,.011,tilt);
      for(const dx of [-.068,.068])block(x+dx*Math.cos(tilt),y+dx*Math.sin(tilt),z,.03,.031,.17,0xdfba73,.01,tilt);
    }
  }
}

function pannierRim(side,y,offset,w,l){
  const x=side*offset,cut=.055;
  return [[w-cut,l],[-w+cut,l],[-w,l-cut],[-w,-l+cut],
    [-w+cut,-l],[w-cut,-l],[w,-l+cut],[w,l-cut]].map(([u,v])=>[x+u,y,v]);
}

function makePannier(body,side,material){
  const rim=(...args)=>pannierRim(side,...args);
  const bag=paintedPart(body,'canvas-pannier',material,({face,band})=>{
    const bottom=rim(-.305,.015,.133,.443),base=rim(-.25,.018,.184,.50);
    const mouth=rim(.065,.022,.189,.50),lining=rim(.065,.022,.165,.473);
    face(bottom,0x937051);band(bottom,base,0x937051);band(base,mouth,0xc19a71);
    band(mouth,lining,0xb69568);
    const floor=rim(-.21,.018,.130,.431);
    band(lining,floor,0x71563e);face(floor.slice().reverse(),0x594637);
  });
  bag.position.set(side*.87,.64,-.04);
  const lid=paintedPart(bag,'pannier-lid',material,({face,band,block})=>{
    const edge=rim(.067,.022,.189,.50),lip=rim(.09,.035,.212,.528);
    const flap=rim(.30,.035,.212,.528),top=rim(.37,.035,.151,.47);
    face(edge,0x846443);band(edge,lip,0x977754);band(lip,flap,0xd0ac80);
    band(flap,top,0xc7a176);face(top.slice().reverse(),0xd0ac80);
    for(const dz of [-.28,.28]){
      block(side*.238,.067,dz,.055,.24,.093,0x895838,.018);
      block(side*.266,.083,dz,.035,.087,.126,0xdab16b,.01);
      block(side*.284,.085,dz,.016,.03,.055,0x795739,.004);
    }
  });
  lid.position.set(0,.067,-.5);
  lid.geometry.translate(0,-.067,.5);
  return {bag,lid};
}

export function createTurtleMechanic(parent,x,z) {
  const root=new THREE.Group();root.name='turtle-mechanic';root.position.set(x,0,z);
  root.rotation.y=.58;parent.add(root);
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.91});
  const body=new THREE.Group();root.add(body);
  paintedPart(body,'field-shell',material,brush=>{
    const {block}=brush;
    block(0,.50,0,1.4,.42,1.6,0xab985f,.13);
    block(0,.52,-.96,.28,.23,.48,0x888750,.085);
    makeShell(brush);
  });
  const bags=[-1,1].map(side=>makePannier(body,side,material));
  const legs=[];
  for(const side of [-1,1])for(const end of [-1,1]){
    const leg=paintedPart(root,'mechanic-foot',material,({block})=>{
      block(0,-.11,0,.34,.34,.39,0x85884c,.08);
      block(side*.028,-.30,.04,.40,.26,.46,0x9a9b59,.065);
      for(const toe of [-.085,.085])block(side*.028+toe,-.375,.244,.125,.11,.103,0xd1b280,.035);
    });
    leg.position.set(side*.57,.43,end*.66);legs.push(leg);
  }
  const neck=new THREE.Group();body.add(neck);neck.position.set(0,.74,.72);
  paintedPart(neck,'mechanic-head',material,({block})=>{
    block(0,.005,.14,.50,.47,.56,0xa49b5b,.09);
    block(0,.12,.52,.82,.63,.71,0x9b9d54,.115);
    block(0,-.055,.63,.69,.27,.58,0xc3ad69,.08);
    block(0,-.006,.916,.36,.021,.025,0x695e3e,.007);
    for(const side of [-1,1])block(side*.213,.008,.908,.083,.025,.027,0x695e3e,.008,side*.29);
    block(0,.066,.84,.64,.17,.21,0xb2aa5c,.059);
    for(const side of [-1,1]){
      block(side*.255,.403,.76,.258,.088,.135,0x5c5b3a,.035,-side*.1);
      block(side*.099,.122,.943,.038,.025,.014,0x797644,.008);
      // Hollow square rims, temples and bridge sit in front of the eyes.
      for(const dy of [-.124,.124])block(side*.221,.252+dy,.905,.344,.039,.052,0xc69a58,.014);
      for(const dx of [-.153,.153])block(side*.221+dx,.252,.905,.040,.236,.052,0xc49551,.014);
      block(side*.399,.267,.656,.033,.042,.50,0xb18c4f,.012);
    }
    block(0,.27,.903,.116,.037,.05,0xd9ad5d,.012);
  });
  const eyes=paintedPart(neck,'mechanic-eyes',material,({block})=>{
    for(const side of [-1,1]){
      block(side*.22,0,.863,.247,.203,.062,0xfff1cf,.043);
    }
  });
  const pupils=paintedPart(eyes,'mechanic-pupils',material,({block})=>{
    for(const side of [-1,1]){
      block(side*.22,-.003,.896,.137,.16,.025,0x302f22,.028);
      block(side*.22-.025,.04,.912,.038,.038,.014,0xfff1c6,.009);
    }
  });
  eyes.position.y=.254;
  let elapsed=0,nodTime=2,deliveryTime=2,gift=0,axe;
  const ease=(t,a,b)=>THREE.MathUtils.smoothstep(t,a,b);
  const {bag:giftBag,lid}=bags[1];
  return {
    root,
    nod(){nodTime=0},
    acknowledge(){deliveryTime=0},
    present(progress,displayAxe=true){
      gift=progress;
      lid.rotation.x=-1.48*ease(gift,.16,.66);
      if(gift>0 && !axe){
        axe=createWoodcuttingAxe();axe.name='offered-leafmoon';giftBag.add(axe);
        axe.rotation.set(.08,.83,-.30);
      }
      if(axe){
        const rise=ease(gift,.49,.95);
        axe.visible=displayAxe && rise>0;
        axe.scale.setScalar(.30+.66*rise);
        axe.position.set(.01+.08*rise,-.18+.49*rise,.06+.13*rise);
      }
    },
    update(dt,reduced,player,working=true){
      elapsed+=dt;nodTime+=dt;deliveryTime+=dt;
      const t=elapsed, breath=reduced?0:Math.sin(t*1.8);
      const phase=(t%8.4)/1.8;
      const step=!reduced && !gift && phase<1 ? Math.sin(phase*Math.PI*2)*Math.sin(phase*Math.PI)**2 : 0;
      body.position.set(.027*step,.009*breath,.045*step);
      body.rotation.z=.025*step;
      legs.forEach((leg,i)=>{
        const swing=(i===0||i===3?step:-step);
        leg.rotation.x=.23*swing;leg.position.y=.43+.065*Math.max(0,swing);
      });
      bags.forEach(({bag},i)=>{bag.rotation.x=(i?1:-1)*.055*step});
      const dx=player.x-x,dz=player.z-z;
      const nearby=Math.hypot(dx,dz)<3.8;
      const relative=Math.atan2(dx,dz)-root.rotation.y;
      const playerYaw=THREE.MathUtils.clamp(Math.atan2(Math.sin(relative),Math.cos(relative)),-.85,.85);
      const inspecting=working && !nearby;
      let look=inspecting?.97:nearby?playerYaw:0;
      let tilt=inspecting?.23+.035*breath:0;
      if(deliveryTime<1.0){
        const turn=ease(deliveryTime,.28,.63);
        look=THREE.MathUtils.lerp(playerYaw,.97,turn);
        tilt=.22*turn+.17*Math.sin(Math.PI*ease(deliveryTime,.53,.98));
      }
      if(gift>0){
        look=THREE.MathUtils.lerp(.92,1.30,ease(gift,.04,.45));
        tilt=.17+.16*ease(gift,.13,.46)-.22*ease(gift,.67,.98);
      }
      neck.rotation.y=reduced?0:THREE.MathUtils.damp(neck.rotation.y,look,7,dt);
      const nod=nodTime<1 && !reduced ? Math.sin(nodTime*Math.PI)**2 : 0;
      neck.rotation.x=reduced?0:THREE.MathUtils.damp(neck.rotation.x,tilt+.014*breath+.045*step+.25*nod,10,dt);
      pupils.position.x=reduced?0:.029*Math.sin(look);
      const blink=Math.abs(t%4.7-3.85);
      eyes.scale.y=reduced?1:Math.min(1,.10+blink*8);
    }
  };
}
