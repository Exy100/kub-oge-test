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
  const player=new Vector3(161,0,1);
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
      assert.equal(new Raycaster(origin,direction).intersectObject(bag,true).length,1);
    }
  }
});

test('mechanic looks up from the board and acknowledges a delivery with one nod',()=>{
  const turtle=createTurtleMechanic(new Group(),0,0);
  const head=turtle.root.getObjectByName('mechanic-head').parent;
  turtle.update(1,false,new Vector3(0,0,6));
  assert.ok(head.rotation.y>.85 && head.rotation.x>.16);
  const player=new Vector3(0,0,2.5);
  turtle.update(1,false,player);
  assert.ok(head.rotation.y<-.5 && Math.abs(head.rotation.x)<.03);
  turtle.acknowledge();
  turtle.update(.2,false,player);
  assert.ok(head.rotation.y<-.5);
  turtle.update(.57,false,player);
  assert.ok(head.rotation.y>.8 && head.rotation.x>.33);
  turtle.update(.65,false,player);
  assert.ok(head.rotation.x<.04);
});

test('gift lid clears the mouth before the axe emerges and closes empty',()=>{
  const turtle=createTurtleMechanic(new Group(),0,0);
  const bags=turtle.root.getObjectsByProperty('name','canvas-pannier');
  assert.equal(bags.length,2);
  const lid=bags[1].getObjectByName('pannier-lid');
  turtle.present(.45);
  const axe=bags[1].getObjectByName('offered-leafmoon');
  assert.ok(!axe.visible && lid.rotation.x<-.65);
  turtle.present(.75);
  const halfway=axe.position.y;
  assert.ok(axe.visible && lid.rotation.x<-1.4);
  turtle.present(1);
  assert.ok(axe.position.y>halfway && axe.scale.x>.9);
  assert.equal(bags[0].getObjectByName('pannier-lid').rotation.x,0);
  turtle.present(1,false);assert.equal(axe.visible,false);
  turtle.present(0,false);assert.ok(Math.abs(lid.rotation.x)<.001);
});
