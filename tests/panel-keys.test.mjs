import test from 'node:test';
import assert from 'node:assert/strict';
import {createPanelKeys} from '../player-panel.js';
for(const codes of [['KeyC','KeyV'],['KeyV','KeyC']])test(`mode chord ${codes}`,()=>{
 let modes=0,cameras=0;const k=createPanelKeys({switchMode:()=>modes++,camera:()=>cameras++,navigator(){}});
 codes.forEach(code=>k.down({code}));k.down({code:codes[1],repeat:true});codes.forEach(code=>k.up({code}));assert.equal(modes,1);assert.equal(cameras,0);
 k.down({code:'KeyV'});k.up({code:'KeyV'});assert.equal(cameras,1);
});
for(const codes of [['KeyZ','KeyX'],['KeyX','KeyZ']])test(`navigator chord ${codes}`,()=>{
 let n=0;const k=createPanelKeys({switchMode(){},camera(){},navigator:()=>n++});
 codes.forEach((code,i)=>k.down({code,key:['я','ч'][i]}));k.down({code:codes[0],repeat:true});assert.equal(n,1);k.clear();k.down({code:codes[1]});assert.equal(n,1);
});
