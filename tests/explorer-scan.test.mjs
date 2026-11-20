import test from 'node:test';
import assert from 'node:assert/strict';
import {moscowDay, scanCell, claimFinding} from '../skills/explorer-scan.js';

const location = 'island.dreamers', day = 12;
const cells = new Set(Array.from({length:40},(_,i)=>i+',0'));
const fresh = () => ({day,locations:{},coins:0});

test('independent quotas are exhausted without rerolls, including after serialization', () => {
  for (const coins of [1,2,3]) for (const tablets of [1,2,3]) {
    let save = fresh();
    const quotaRolls = [(coins-.5)/3,(tablets-.5)/3];
    const counts = {coin:0,tablet:0,empty:0};
    for (const key of cells) {
      const args = {location,day,cells,key};
      counts[scanCell(save,args,()=>quotaRolls.shift() ?? .67)]++;
      save = JSON.parse(JSON.stringify(save));
      assert.equal(scanCell(save,args),'repeat');
    }
    assert.deepEqual(counts,{coin:coins,tablet:tablets,empty:40-coins-tablets});
  }
});

test('Moscow midnight, stale actions and invalid cells', () => {
  const before = Date.parse('2026-11-20T20:59:59.999Z');
  assert.equal(moscowDay(before+1),moscowDay(before)+1);
  const save = fresh();
  for(const [date,key] of [[day-1,'1,0'],[day,'999,0']]) {
    assert.equal(scanCell(save,{location,day:date,key,cells}),null);
  }
  assert.deepEqual(save,fresh());
});

test('collection and verified solutions pay once, separately from discovery', () => {
  for (const [level,reward] of [[undefined,20],['basic',20],['medium',40],['advanced',70]]) {
    const save = fresh(), ref = {location,day,key:'0,0'};
    save.locations[location] = {cells:{'0,0':{kind:'tablet',level},'1,0':{kind:'coin'}}};
    assert.equal(claimFinding(save,ref,'coin'),0);
    assert.equal(claimFinding(save,ref,'tablet',false),0);
    assert.equal(claimFinding(save,{...ref,day:day-1},'tablet',true),0);
    assert.equal(claimFinding(save,ref,'tablet',true),reward);
    assert.equal(claimFinding(save,ref,'tablet',true),0);
    assert.equal(claimFinding(save,{...ref,key:'1,0'},'coin'),1);
    assert.equal(claimFinding(save,{...ref,key:'1,0'},'coin'),0);
    assert.equal(save.coins,reward+1);
  }
});
