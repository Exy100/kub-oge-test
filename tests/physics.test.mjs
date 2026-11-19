import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPhysicsState, movePlayer, PLAYER_RADIUS, PLAYER_HEIGHT } from '../physics.js';
const rock = (x=0,z=0,w=1.2,h=.7,d=1) => ({position:{x,y:h/2,z},scale:{x:w,y:h,z:d}});
const large=rock(), small=rock(.6,.6,.7,.4,.8), rocks=[large,small];
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function advance(p,s,input,solids=rocks,seconds=1,fps=60){for(let i=0;i<seconds*fps;i++)movePlayer(p,s,{dt:1/fps,...input},solids)}

test('rocks stop approaches from all four sides',()=>{
  for(const [x,z,vx,vz,axis,expected] of [[-2,0,4,0,'x',-.9],[2,0,-4,0,'x',.9],[0,-2,0,4,'z',-.8],[0,2,0,-4,'z',.8]]){
    const p={x,y:0,z},s=createPhysicsState();advance(p,s,{vx,vz},[large]);near(p[axis],expected);near(p.y,0);
  }
});
test('diagonal motion slides along a rock instead of freezing',()=>{
  const p={x:-1.5,y:0,z:-.4},s=createPhysicsState();advance(p,s,{vx:4,vz:1},[large],.35);
  near(p.x,-.6-PLAYER_RADIUS);assert.ok(p.z>-.1);
});
test('falling onto either rock lands on its highest overlapping surface at 30/60/120 FPS',()=>{
  for(const fps of [30,60,120])for(const [x,z,height] of [[0,0,.7],[.8,.8,.4],[.45,.45,.7]]){
    const p={x,y:2,z},s={velocity:-2,grounded:false};advance(p,s,{},rocks,2,fps);
    near(p.y,height);assert.equal(s.grounded,true);near(s.velocity,0);
  }
});
test('player can jump onto a rock and jump again from its top',()=>{
  const p={x:0,y:0,z:1.5},s=createPhysicsState();movePlayer(p,s,{dt:1/60,jump:true},[large]);
  advance(p,s,{},[large],.2);advance(p,s,{vz:-4},[large],.3);advance(p,s,{},[large],1);
  near(p.y,.7);assert.equal(s.grounded,true);
  movePlayer(p,s,{dt:1/60,jump:true},[large]);assert.ok(p.y>.7);assert.ok(s.velocity>0);
});
test('walking off a stone or removing support starts falling and prevents air jumps',()=>{
  const p={x:0,y:.7,z:0},s=createPhysicsState();advance(p,s,{vx:4},[large],.35);
  assert.equal(s.grounded,false);assert.ok(p.y<.7);
  const before=s.velocity;movePlayer(p,s,{dt:1/60,jump:true},[large]);assert.ok(s.velocity<before);
  const q={x:0,y:.7,z:0},t=createPhysicsState();movePlayer(q,t,{dt:1/60,jump:true},[]);assert.ok(t.velocity<0);assert.equal(t.grounded,false);
});
test('head collision cancels ascent beneath a solid block',()=>{
  const ceiling={position:{x:0,y:2.25,z:0},scale:{x:2,y:.5,z:2}};
  const p={x:0,y:0,z:0},s=createPhysicsState();movePlayer(p,s,{dt:1/60,jump:true},[ceiling]);
  for(let i=0;i<20;i++){movePlayer(p,s,{dt:1/60},[ceiling]);assert.ok(p.y+PLAYER_HEIGHT<=2+1e-7)}
  assert.ok(s.velocity<=0);
});
test('a fast descent cannot tunnel through stone',()=>{
  const p={x:0,y:5,z:0},s={velocity:-100,grounded:false};movePlayer(p,s,{dt:.1},[large]);near(p.y,.7);assert.equal(s.grounded,true);
});

// The previous jump peaked at about 1.10 units with the 120 Hz physics step.
test('jump reaches about 1.21 units and lands safely at 30/60/120 FPS',()=>{
  for(const fps of [30,60,120]){
    const p={x:0,y:0,z:0},s=createPhysicsState();let peak=0;
    for(let frame=0;frame<fps*2;frame++){
      movePlayer(p,s,{dt:1/fps,jump:frame===0},[]);
      peak=Math.max(peak,p.y);
    }
    assert.ok(Math.abs(peak-1.21)<.005,`peak at ${fps} FPS: ${peak}`);
    near(p.y,0);assert.equal(s.grounded,true);near(s.velocity,0);
  }
});
