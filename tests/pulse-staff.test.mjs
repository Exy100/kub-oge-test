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

test('the shot is released once and the next shot waits for the last line',()=>{
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

test('three banks of diagonal lines fill in physical order and share state across cameras',()=>{
  const staff=createPulseStaff(), view=staff.root.clone();
  const lines=staff.root.children.find(o=>o.material?.isShaderMaterial);
  const thresholds=lines.geometry.getAttribute('threshold'), coords=lines.geometry.getAttribute('position');
  const ys=[];
  for(let i=0;i<8;i++) {
    const start=i*12;
    assert.equal(thresholds.getX(start),i/8);
    assert.equal(thresholds.getX(start+1),(i+1)/8);
    assert.ok(coords.getY(start+1)>coords.getY(start));
    ys.push(coords.getY(start));
  }
  assert.deepEqual(ys,ys.slice().sort((a,b)=>a-b));
  staff.setFill(.4);
  assert.equal(view.children.find(o=>o.material?.isShaderMaterial).material.uniforms.fill.value,.4);
  assert.ok(new THREE.Box3().setFromObject(staff.root).containsPoint(staff.tip.position));
  staff.dispose();
});
