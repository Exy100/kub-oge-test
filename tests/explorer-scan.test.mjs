import test from 'node:test';
import assert from 'node:assert/strict';
import {moscowDay, scanCell, prepareFindingPreview, claimFinding} from '../skills/explorer-scan.js';

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

test('preview pins remaining daily prizes across reloads without discovering or awarding them', () => {
  const save = fresh();
  const args = {day, location, cells};
  const visited = {'0,0':{kind:'coin',claimed:true},'1,0':{kind:'empty'}};
  save.locations[location] = {cells:structuredClone(visited), coinsLeft:2, tabletsLeft:1};
  prepareFindingPreview(save, {...args, day:day-1});
  assert.equal(save.locations[location].hiddenPrizes, undefined);
  prepareFindingPreview(save, args, () => .25);
  const prizes = save.locations[location].hiddenPrizes;
  assert.deepEqual(Object.values(prizes).map(entry=>entry.kind).sort(), ['coin','coin','tablet']);
  assert.deepEqual(save.locations[location].cells, visited);
  const restored = JSON.parse(JSON.stringify(save));
  prepareFindingPreview(restored, args, () => assert.fail('re-rolled preview'));
  for (const key of cells) {
    if (key in visited) { assert.equal(prizes[key], undefined); continue; }
    const kind = prizes[key]?.kind ?? 'empty';
    assert.equal(claimFinding(restored, {...args,key}, kind, true), 0);
    assert.equal(scanCell(restored, {...args,key}), kind);
    if (prizes[key]) assert.deepEqual(restored.locations[location].cells[key], prizes[key]);
  }
  const island = restored.locations[location];
  assert.deepEqual(island.hiddenPrizes, {});
  assert.deepEqual([island.coinsLeft, island.tabletsLeft, restored.coins], [0,0,0]);
});

test('one prize-bearing tree per island per day, for small and large forests', () => {
  for (const size of [1,2,6,75]) for (const roll of [0,.6,.99]) {
    const trees = new Set(Array.from({length:size},(_,i)=>'tree:'+i+',0'));
    let save = fresh();
    scanCell(save,{location,day,key:'0,0',cells},()=>0);
    for (const island of ['garden/trees','forge/trees']) {
      const results = [];
      for (const key of trees) {
        const args = {location:island,skill:'tree',face:-1,day,cells:trees,key};
        const kind = scanCell(save,args,()=>roll);
        save = JSON.parse(JSON.stringify(save));
        assert.equal(scanCell(save,args,()=>0),'repeat');
        if (kind==='empty') continue;
        const entry = save.locations[island].cells[key];
        assert.equal(entry.face,-1);
        if (kind==='tablet') assert.ok(['basic','medium'].includes(entry.level));
        const amount = claimFinding(save,args,kind,true);
        assert.ok([1,20,40].includes(amount));
        assert.equal(claimFinding(save,args,kind,true),0);
        results.push(kind);
      }
      assert.deepEqual(results,[roll<.5?'coin':'tablet']);
    }
    assert.equal(save.locations[location].cells['0,0'].kind,'coin');
  }
});
