import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStage, placeTarget, removeTarget, isLimited } from '../progression.js';
import { createPhysicsState, movePlayer } from '../physics.js';
test('first portal requires seven real placements and cannot consume a cube twice',()=>{
  const stage=createStage(0);assert.equal(placeTarget(stage,0,0),false);stage.inventory[0]=7;
  for(let i=0;i<6;i++)assert.equal(placeTarget(stage,i,0),true);
  assert.equal(stage.unlocked,false);assert.equal(placeTarget(stage,0,0),false);assert.equal(stage.inventory[0],1);
  assert.equal(placeTarget(stage,6,0),true);assert.equal(stage.unlocked,true);assert.equal(stage.inventory[0],0);
});
test('third island requires the wood signal and seven cubes of each of three materials',()=>{
  const stage=createStage(2);for(const m of [0,2,3])stage.inventory[m]=7;
  assert.equal(placeTarget(stage,7,0),false);assert.equal(stage.inventory[0],7);
  stage.targets.forEach((t,i)=>assert.equal(placeTarget(stage,i,t.material),true));
  assert.equal(stage.built.size,21);assert.equal(stage.unlocked,false);stage.sentWood=true;assert.deepEqual(stage.inventory,[0,0,0,0,0,0]);
  assert.equal(removeTarget(stage,8),true);assert.equal(stage.inventory[2],1);assert.equal(removeTarget(stage,8),false);
  assert.equal(placeTarget(stage,8,2),true);assert.equal(stage.unlocked,true);assert.equal(stage.inventory[2],0);
});
test('island progress is independent and an unlocked return route stays available',()=>{
  const a=createStage(0),b=createStage(2);a.inventory[0]=7;a.targets.forEach((t,i)=>placeTarget(a,i,0));
  removeTarget(a,0);assert.equal(a.unlocked,true);assert.equal(b.built.size,0);assert.equal(b.inventory[0],0);
  assert.equal(isLimited(a,2),false);assert.equal(isLimited(b,2),true);assert.equal(isLimited(b,3),true);
});
test('physics supports the new island coordinates without snapping to the first island',()=>{
  const p={x:40,y:0,z:3},state=createPhysicsState();movePlayer(p,state,{dt:.04,vx:4,limits:{x:[30,50],z:[-9,9]}},[]);
  assert.ok(p.x>40&&p.x<41);assert.equal(p.y,0);
});

test('workshop arch needs the turtle gift and seven harvested wood blocks',()=>{
  const stage=createStage(1);
  stage.inventory[2]=7;
  assert.equal(placeTarget(stage,0,2),false);
  stage.repair={axe:true};
  for(let i=0;i<7;i++){
    assert.equal(stage.unlocked,false);
    assert.equal(placeTarget(stage,i,2),true);
  }
  assert.equal(stage.unlocked,true);
  assert.equal(stage.inventory[2],0);
  assert.equal(removeTarget(stage,6),true);
  assert.equal(stage.unlocked,false);
});
