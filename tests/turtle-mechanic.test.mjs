import test from 'node:test';
import assert from 'node:assert/strict';
import {Group, Vector3} from '../vendor/three.module.js';
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
