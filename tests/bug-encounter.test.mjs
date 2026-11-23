import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Group,Vector3} from '../vendor/three.module.js';
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
    encounter.hit(player);encounter.update(.12,player,false);
    assert.deepEqual(g.position,here);
    assert.ok(visor.rotation.x>.3);
    encounter.update(.45,player,false);
    assert.equal(visor.rotation.x,0);
  }
  bug.pose(1,0,true);assert.ok(visor.rotation.x>.3);
});

test('green tracks the approaching side, freezes, dodges away and darkens only its gem on defeat',()=>{
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
    patrol.sample(.24*4.8,-side*.45,0,expected);
    assert.ok(bug.g.position.distanceTo(expected)<.01);
    encounter.hit(player);const hitPos=bug.g.position.clone();encounter.update(.14,player,true);
    assert.deepEqual(hitPos,bug.g.position);
    bug.pose(1,0,true);
    assert.ok(antenna.rotation.x>.9 && gem.material.color.r<.25);
    assert.ok(orange.g.getObjectByName('copper-shield').material.color.equals(baseline));
  }
});
