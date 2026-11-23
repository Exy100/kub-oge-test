import {createBugPatrol} from './bug-patrol.js';

// Distance, rather than elapsed wall time, keeps the feet on their trail across
// a pause, a dash and a resumed patrol. Each beetle has its own encounter clock.
export function createBugEncounter(index,{g,walk,pose},center){
  const green=index===1, patrol=createBugPatrol(index);
  let distance=0,clock=0,ready=true,hold=0,duration=0,bearing=0;
  let dodgeStart=-Infinity,dodgeSide=1,impact=false;
  const dodgeLength=2.3;
  const route={
    sample(d,side,forward,out){
      const t=(d-dodgeStart)/dodgeLength;
      const offset=t>0 && t<1 ? dodgeSide*.45*Math.sin(Math.PI*t)**2 : 0;
      return patrol.sample(d,side+offset,forward,out);
    },
  };
  function position(){
    g.rotation.y=route.sample(distance,0,0,g.position);g.position.x+=center;
  }
  position();
  function notice(player,hit){
    const dx=player.x-g.position.x,dz=player.z-g.position.z;
    const localX=dx*Math.cos(g.rotation.y)-dz*Math.sin(g.rotation.y);
    const localZ=dx*Math.sin(g.rotation.y)+dz*Math.cos(g.rotation.y);
    bearing=Math.max(-1.25,Math.min(1.25,Math.atan2(localX,localZ)));
    if(green && distance>=dodgeStart+dodgeLength){
      dodgeSide=localX>=0?-1:1;
      dodgeStart=distance;
    }
    impact=hit;ready=false;hold=duration=green?(hit?.32:.43):(hit?.48:.38);
  }
  function update(dt,player,reduced){
    const range=Math.hypot(player.x-g.position.x,player.z-g.position.z);
    if(range>4.9)ready=true;
    if(ready && range<3.25 && player.y<2.2 && !hold)notice(player,false);
    if(hold>0){
      const pause=Math.min(dt,hold);hold-=pause;dt-=pause;
      const t=1-hold/duration;
      const weight=reduced?.8:Math.min(1,.3+t*4,.30+(1-t)*3);
      const recoil=impact && !reduced ? Math.max(0,1-t*2.5) : 0;
      pose(weight,bearing,false,recoil);
      if(dt===0)return;
    }
    const advance=patrol.distanceAt(clock+dt)-patrol.distanceAt(clock);
    if(green && distance<dodgeStart+dodgeLength){
      const burstTime=Math.min(dt,(dodgeStart+dodgeLength-distance)/4.8);
      distance+=4.8*burstTime+patrol.distanceAt(clock+dt)-patrol.distanceAt(clock+burstTime);
    }else distance+=advance;
    clock+=dt;
    position();walk(route,distance,g.rotation.y,reduced);
  }
  return {update,hit(player){notice(player,true)}};
}
