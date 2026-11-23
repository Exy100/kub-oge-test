import test from 'node:test';
import assert from 'node:assert/strict';
import {Group, Raycaster, Vector3} from '../vendor/three.module.js';
import {createTurtleMechanic} from '../world/turtle-mechanic.js';

test('workshop turtle animates on its fixed interaction anchor and rests with reduced motion',()=>{
  const turtle=createTurtleMechanic(new Group(),159,-.6);
  const {root}=turtle;
  const head=root.getObjectByName('mechanic-head').parent;
  const foot=root.getObjectByName('mechanic-foot');
  const eye=root.getObjectByName('mechanic-eyes');
  const player=new Vector3(160,0,1);
  turtle.update(.45,false,player);
  assert.ok(Math.abs(foot.rotation.x)>.01);
  assert.ok(head.rotation.y>0);
  turtle.nod();
  turtle.update(.5,false,player);
  assert.ok(head.rotation.x>.16);
  turtle.update(2.9,false,player);
  assert.ok(eye.scale.y<.2);
  turtle.update(.016,true,player);
  assert.equal(foot.rotation.x,0);
  assert.equal(head.rotation.y,0);
  assert.equal(head.rotation.x,0);
  assert.equal(eye.scale.y,1);
  assert.deepEqual(root.position.toArray(),[159,0,-.6]);
});

test('both ends of each pannier have a single exposed surface across the flap',()=>{
  const {root}=createTurtleMechanic(new Group(),0,0);
  root.updateMatrixWorld(true);
  for(const bag of root.getObjectsByProperty('name','canvas-pannier')){
    const side=Math.sign(bag.position.x);
    for(const end of [-1,1])for(const height of [.16,.21,.24]){
      const origin=bag.localToWorld(new Vector3(side*.067,height,end));
      const direction=new Vector3(0,0,-end).transformDirection(bag.matrixWorld);
      assert.equal(new Raycaster(origin,direction).intersectObject(bag,false).length,1);
    }
  }
});
