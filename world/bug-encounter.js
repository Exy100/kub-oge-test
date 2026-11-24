import {createBugPatrol} from './bug-patrol.js';

const hopSeconds=.24, shoveSeconds=.22;

// Prefer the full two-cell leap directly away. Near scenery try a diagonal
// that still increases separation, then use the longest safe partial leap.
function landing(start,yaw,clear){
  const best=start.clone();
  let furthest=0;
  for(const turn of [0,Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3]){
    const dx=Math.sin(yaw+turn),dz=Math.cos(yaw+turn);
    for(let step=1;step<=40;step++){
      const d=step/20,x=start.x+dx*d,z=start.z+dz*d;
      if(!clear(x,z))break;
      if(d>furthest){best.set(x,0,z);furthest=d}
      if(step===40)return best;
    }
  }
  return best;
}

export function createBugEncounter(index,{g,walk,pose},center,clear=()=>true){
  const green=index===1, patrol=createBugPatrol(index);
  let distance=0,clock=0,ready=true,hold=0,duration=0,bearing=0,impact=false;
  let hop=null,shove=null,bracing=false;
  // Retrace each clear landing segment before joining the patrol. A second
  // jump can interrupt the walk back without snapping to the original trail.
  const returnPath=[];
  const returnSteps={
    dx:0,dz:0,
    sample(d,side,forward,out){return out.set(this.dx*d+side,0,this.dz*d+forward)}
  };
  function position(){
    g.rotation.y=patrol.sample(distance,0,0,g.position);g.position.x+=center;
  }
  position();
  function notice(player,hit){
    const dx=player.x-g.position.x,dz=player.z-g.position.z;
    const localX=dx*Math.cos(g.rotation.y)-dz*Math.sin(g.rotation.y);
    const localZ=dx*Math.sin(g.rotation.y)+dz*Math.cos(g.rotation.y);
    bearing=Math.max(-1.25,Math.min(1.25,Math.atan2(localX,localZ)));
    impact=hit;bracing=false;ready=false;hold=duration=green?(hit?.32:.43):(hit?.48:.38);
  }
  function hit(player,hitNumber){
    notice(player,true);
    if(hitNumber%(green?2:3)!==0)return;
    const dx=g.position.x-player.x,dz=g.position.z-player.z;
    const away=dx||dz?Math.atan2(dx,dz):g.rotation.y;
    if(green){
      const start=g.position.clone(),end=landing(start,away,clear);
      hop={start,end,time:0};
      if(start.distanceToSquared(end)>.000001)returnPath.push(start);
      return end;
    }
    bracing=true;
    const cells=Math.random()<.5?2:3;
    shove={vx:-Math.sin(away)*cells/shoveSeconds,vz:-Math.cos(away)*cells/shoveSeconds,left:shoveSeconds};
  }
  function shoveVelocity(dt){
    if(!shove || dt<=0)return null;
    const slice=Math.min(dt,shove.left),fraction=slice/dt;
    const velocity={vx:shove.vx*fraction,vz:shove.vz*fraction};
    shove.left-=slice;
    if(shove.left<=0)shove=null;
    return velocity;
  }
  function advanceHop(dt,reduced){
    if(!hop)return;
    hop.time=Math.min(hopSeconds,hop.time+dt);
    const t=hop.time/hopSeconds;
    g.position.lerpVectors(hop.start,hop.end,t);
    g.position.y=reduced?0:.48*4*t*(1-t);
    if(t===1)hop=null;
  }
  let returnStride=0;
  function update(dt,player,reduced){
    const range=Math.hypot(player.x-g.position.x,player.z-g.position.z);
    if(range>4.9)ready=true;
    if(ready && range<3.25 && player.y<2.2 && !hold)notice(player,false);
    if(hold>0){
      const pause=Math.min(dt,hold);hold-=pause;dt-=pause;
      advanceHop(pause,reduced);
      const t=1-hold/duration;
      const weight=reduced?.8:Math.min(1,.3+t*4,.30+(1-t)*3);
      const recoil=impact && !reduced ? Math.max(0,1-t*2.5) : 0;
      const thrust=bracing && !reduced?Math.sin(Math.PI*Math.min(1,t*2.2)):0;
      pose(weight,bearing,false,recoil-1.6*thrust,g.position.y);
      if(dt===0)return;
    }
    while(returnPath.length){
      const target=returnPath[returnPath.length-1];
      const dx=target.x-g.position.x,dz=target.z-g.position.z;
      const gap=Math.hypot(dx,dz),step=Math.min(dt*1.8,gap);
      if(gap>0){
        g.position.x+=dx*step/gap;g.position.z+=dz*step/gap;
        // Keep facing the trail while stepping back, including on a sideways landing.
        const c=Math.cos(g.rotation.y),s=Math.sin(g.rotation.y);
        returnSteps.dx=(dx*c-dz*s)/gap;returnSteps.dz=(dx*s+dz*c)/gap;
        returnStride+=step;walk(returnSteps,returnStride,0,reduced);
      }
      if(step<gap)return;
      returnPath.pop();dt-=step/1.8;
    }
    distance+=patrol.distanceAt(clock+dt)-patrol.distanceAt(clock);clock+=dt;
    position();walk(patrol,distance,g.rotation.y,reduced);
  }
  return {update,hit,advanceHop,shoveVelocity};
}
