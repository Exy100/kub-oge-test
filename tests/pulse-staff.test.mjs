import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createPlayerInventory} from '../player-inventory.js';
import {createPulseStaff,createStaffCycle} from '../world/pulse-staff.js';
import {STAFF_ID,WEAPON_KIT} from '../catalog/pulse-staff.js';

test('the kit unlocks a battle-only staff without using another bag cell',()=>{
  let quantity=0;
  const bag=createPlayerInventory(()=>[{id:WEAPON_KIT,quantity}]);
  assert.equal(bag.equip('battle','weapon',STAFF_ID),false);
  quantity=1;
  assert.equal(bag.cells().filter(Boolean).length,2);
  assert.equal(bag.equip('build','tool',STAFF_ID),false);
  assert.equal(bag.equip('battle','weapon',STAFF_ID),true);
});

test('the shot is released once and the next shot waits for a full charge',()=>{
  const cycle=createStaffCycle();
  let shots=0, contacts=0;
  const fire=()=>shots++;
  assert.ok(cycle.start(fire,()=>contacts++));
  assert.equal(cycle.update(.17,true),1);
  assert.equal(cycle.update(0,true),1);
  assert.equal(shots,0);
  assert.equal(cycle.start(fire),false);
  assert.ok(cycle.update(.01,true)<.001);
  assert.equal(shots,1);
  assert.equal(contacts,0);
  cycle.update(.23,false);
  assert.equal(contacts,0);
  assert.ok(Math.abs(cycle.update(.58,false)-.5)<.001);
  assert.equal(contacts,1);
  assert.equal(cycle.start(fire),false);
  assert.equal(cycle.update(.82,true),1);
  assert.ok(cycle.start(fire,()=>contacts++));
  cycle.update(.1,false);
  cycle.update(1,true);
  assert.equal(shots,1,'holstering before release cancels the shot');
  cycle.start(fire,()=>contacts++);
  assert.equal(cycle.update(2,true),1);
  assert.equal(contacts,2);
  assert.equal(shots,2,'one long frame never duplicates a shot');
});

test('the sapphire charges bottom to top, shares its glint across both rigs and emits from its centre',()=>{
  const staff=createPulseStaff(), clone=staff.root.clone();
  const gem=staff.root.getObjectByName('staff-sapphire');
  const pos=gem.geometry.getAttribute('position'),level=gem.geometry.getAttribute('chargeLevel');
  gem.updateMatrixWorld(true);
  const heights=Array.from({length:pos.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(pos,i)
    .applyMatrix4(gem.matrixWorld).y);
  const min=Math.min(...heights),span=Math.max(...heights)-min;
  assert.ok(span>.30);
  for(let i=0;i<pos.count;i++)assert.ok(Math.abs((heights[i]-min)/span-level.getX(i))<1e-5);
  assert.deepEqual(staff.tip.position.toArray(),gem.position.toArray());
  staff.setFill(.4,1.2);
  const other=clone.getObjectByName(gem.name);
  assert.equal(other.material,gem.material);
  assert.equal(other.material.uniforms.fill.value,.4);
  assert.equal(other.material.uniforms.time.value,1.2);
  staff.dispose();
});
