import {test} from 'node:test';import assert from 'node:assert/strict';
import {NAVIGATORS,createNavigator,loadNavigator,saveNavigator} from '../navigator-model.js';
import {Box3} from '../vendor/three.module.js';
test('four selected reference designs have distinct finite 3D geometry',()=>{
 assert.deepEqual(NAVIGATORS.map(n=>n.id),[8,11,19,27]);
 for(const {id} of NAVIGATORS){const model=createNavigator(id);const bounds=new Box3().setFromObject(model.root);assert(bounds.min.toArray().concat(bounds.max.toArray()).every(Number.isFinite));assert(bounds.max.y<2.6);assert(bounds.min.y>=-.02);assert(model.root.getObjectByName('face-screen'));if(id===19){assert(model.root.getObjectByName('head-shell').material.transparent);assert(model.root.getObjectByName('wheel'))}if(id===8)assert(model.root.getObjectByName('wrench-shaft'));if(id===11)assert(model.root.getObjectByName('antenna'));if(id===27)assert(model.root.getObjectByName('backpack'));model.dispose()}
});
test('navigator persistence rejects stale ids and survives blocked storage',()=>{
 let value=null;const storage={getItem:()=>value,setItem:(_,v)=>value=v};assert.equal(loadNavigator(storage),null);
 for(const {id} of NAVIGATORS){assert(saveNavigator(storage,id));assert.equal(loadNavigator(storage),id)}
 for(const v of ['null','99','"8"','{','{}']){value=v;assert.equal(loadNavigator(storage),null)}
 assert.equal(saveNavigator(storage,12),false);assert.equal(loadNavigator(undefined),null);assert.equal(saveNavigator(undefined,8),false);
});
test('every robot has a connected waving arm, blinking eyes and a settled idle pose',()=>{
 for(const {id} of NAVIGATORS){const model=createNavigator(id);const arm=model.root.getObjectByName('wave-arm');assert(arm);assert(arm.children.length>=3);model.greet();model.animate(.4,.4);assert(arm.rotation.z<-.5);model.animate(4,4.4);assert(Math.abs(arm.rotation.z)<1e-9);assert(model.root.getObjectByName('eye').scale.y<.075);model.animate(.1,5,{reducedMotion:true});assert.equal(model.root.position.y,0);assert.equal(model.root.getObjectByName('eye').scale.y,.075);model.dispose()}
});
