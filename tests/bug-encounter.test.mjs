import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Group,Vector3} from '../vendor/three.module.js';
import {createPhysicsState,movePlayer,PLAYER_RADIUS} from '../physics.js';
import {workshopModels} from '../world/repair-models.js';
import {createBugEncounter} from '../world/bug-encounter.js';
import {createBugPatrol} from '../world/bug-patrol.js';

test('orange braces on contact and on either hit, then resumes from the same spot',()=>{
  const bug=workshopModels(new Group(),new BoxGeometry()).bug(0,0,0);
  const encounter=createBugEncounter(0,bug,0),g=bug.g;
  const visor=g.getObjectByName('bug-visor');
  const feet=g.getObjectsByProperty('name','bug-shin');
  const normal=feet.map(f=>f.position.clone()),start=g.position.clone();
  const player=start.clone();
  encounter.update(.12,player,false);
  assert.ok(visor.rotation.x>.3);
  assert.ok(feet[2].position.x<normal[2].x && feet[5].position.x>normal[5].x);
  assert.deepEqual(g.position,start);
  encounter.update(.5,player,false);
  assert.ok(g.position.distanceTo(start)>.1);
  for(let hit=0;hit<2;hit++){
    const here=g.position.clone();
    encounter.hit(player,hit+1);encounter.update(.12,player,false);
    assert.deepEqual(g.position,here);
    assert.ok(visor.rotation.x>.3);
    encounter.update(.45,player,false);
    assert.equal(visor.rotation.x,0);
  }
  bug.pose(1,0,true);assert.ok(visor.rotation.x>.3);
});

test('green notices either side, keeps patrolling and only leaps on even hits',()=>{
  const patrol=createBugPatrol(1);
  const models=workshopModels(new Group(),new BoxGeometry());
  const orange=models.bug(0,0,0);
  const baseline=orange.g.getObjectByName('copper-shield').material.color.clone();
  for(const side of [-1,1]){
    const bug=models.bug(1,0,0),encounter=createBugEncounter(1,bug,0);
    const origin=bug.g.position.clone(),player=new Vector3(),expected=new Vector3();
    patrol.sample(0,side*2,.3,player);
    const antenna=bug.g.getObjectByName('signal-antennae'),gem=bug.g.getObjectByName('bug-emerald');
    encounter.update(.2,player,false);
    assert.deepEqual(bug.g.position,origin);
    assert.equal(Math.sign(antenna.rotation.y),side);
    encounter.update(.23,player,false);
    encounter.update(.24,player,false);
    patrol.sample(patrol.distanceAt(.24),0,0,expected);
    assert.ok(bug.g.position.distanceTo(expected)<.01);
    encounter.hit(player,1);const hitPos=bug.g.position.clone();encounter.update(.14,player,true);
    assert.deepEqual(hitPos,bug.g.position);
    const landing=encounter.hit(player,2);
    const away=hitPos.clone().sub(player).normalize();
    assert.ok(landing.distanceTo(hitPos.clone().addScaledVector(away,2))<1e-8);
    encounter.update(.12,player,false);
    assert.ok(bug.g.position.y>.4);
    encounter.update(.12,player,false);
    assert.ok(bug.g.position.distanceTo(landing)<1e-8);
    encounter.update(.08,player,false);
    const returned=bug.g.position.clone();
    encounter.update(.02,player,false);
    assert.ok(bug.g.position.distanceTo(returned)<.04,'resume walking without snapping back');
    bug.pose(1,0,true);
    assert.ok(antenna.rotation.x>.9 && gem.material.color.r<.25);
    assert.ok(orange.g.getObjectByName('copper-shield').material.color.equals(baseline));
  }
});

test('orange pushes away on every third confirmed hit and chooses either whole distance',t=>{
  const bug=workshopModels(new Group(),new BoxGeometry()).bug(0,0,0);
  const encounter=createBugEncounter(0,bug,0);
  const away=new Vector3(.6,0,-.8),player=bug.g.position.clone().add(away);
  const roll=t.mock.method(Math,'random',()=>0);
  for(let hit=1;hit<=20;hit++){
    roll.mock.mockImplementation(()=>hit%2?0:.99);
    encounter.hit(player,hit);
    const moved=new Vector3();
    for(let frame=0;frame<8;frame++){
      const v=encounter.shoveVelocity(.031);
      if(v){moved.x+=v.vx*.031;moved.z+=v.vz*.031}
    }
    const cells=hit%3?0:hit%2?2:3;
    assert.ok(moved.distanceTo(away.clone().multiplyScalar(cells))<1e-8);
  }
  assert.equal(roll.mock.callCount(),6);
});

test('green keeps the full distance along a clear diagonal or shortens a blocked leap',()=>{
  for(const diagonal of [true,false]){
    const bug=workshopModels(new Group(),new BoxGeometry()).bug(1,0,0);
    const start=new Vector3(4.8,0,-2.5);
    const clear=(x,z)=>z<=start.z+.5 || (diagonal && x>start.x+.2);
    const encounter=createBugEncounter(1,bug,0,clear);
    const player=start.clone();player.z--;
    const end=encounter.hit(player,10);
    assert.ok(end.z>start.z && clear(end.x,end.z));
    assert.ok(Math.abs(start.distanceTo(end)-(diagonal?2:1))<1e-7);
    encounter.advanceHop(.12,true);
    assert.equal(bug.g.position.y,0);
    encounter.advanceHop(.12,true);
    assert.ok(bug.g.position.distanceTo(end)<1e-8);
  }
});

test('an orange shove stops at a solid or at the island boundary',()=>{
  const bug=workshopModels(new Group(),new BoxGeometry()).bug(0,0,0);
  const encounter=createBugEncounter(0,bug,0);
  const wall={position:new Vector3(0,1,1.5),scale:new Vector3(2,2,1)};
  for(const solids of [[wall],[]]){
    const player=new Vector3(0,0,0),state=createPhysicsState();
    bug.g.position.set(0,0,-1);
    encounter.hit(player,3);
    for(let i=0;i<12;i++){
      const dt=1/50,velocity=encounter.shoveVelocity(dt);
      movePlayer(player,state,{dt,...velocity,limits:{x:[-10,10],z:[-9,1]}},solids);
    }
    assert.ok(Math.abs(player.z-(solids.length?1-PLAYER_RADIUS:1))<1e-7);
  }
});
