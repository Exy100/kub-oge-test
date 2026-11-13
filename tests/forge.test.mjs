import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createForgeState, toggleBit, craftByte, insertByte, bitValue } from '../forge-state.js';
test('byte crafting requires exactly eight filled slots, including eight actual bits',()=>{
  const s=createForgeState();assert.equal(toggleBit(s,0),false);assert.equal(craftByte(s),false);
  s.bits=8;for(let i=0;i<7;i++)toggleBit(s,i);assert.equal(craftByte(s),false);
  toggleBit(s,7);assert.equal(s.bits,0);assert.equal(craftByte(s),true);assert.equal(s.bytes,1);
  assert.equal(s.slots.filter(Boolean).length,0);assert.equal(craftByte(s),false);
});
test('slots return bits without duplication and reject invalid indices',()=>{
  const s=createForgeState();s.bits=1;toggleBit(s,2);assert.equal(s.bits,0);toggleBit(s,2);assert.equal(s.bits,1);
  assert.equal(toggleBit(s,-1),false);assert.equal(toggleBit(s,8),false);assert.equal(s.bits,1);
});
test('four batches consume 32 bits and only the fourth byte unlocks the door',()=>{
  const s=createForgeState();assert.equal(insertByte(s,0),false);
  for(let batch=0;batch<4;batch++){
    s.bits+=8;for(let i=0;i<8;i++)toggleBit(s,i);assert.equal(craftByte(s),true);
    assert.equal(insertByte(s,batch),true);assert.equal(insertByte(s,batch),false);
    assert.equal(s.unlocked,batch===3);
  }
  assert.equal(s.crafted,4);assert.equal(s.bits,0);assert.equal(s.bytes,0);assert.equal(craftByte(s),false);
});
test('bit faces switch between zero and one each second',()=>{
  for(let seed=0;seed<8;seed++)for(let second=0;second<10;second++){
    assert.ok([0,1].includes(bitValue(second,seed)));
    assert.equal(bitValue(second+.9,seed),bitValue(second,seed));
    assert.notEqual(bitValue(second+1,seed),bitValue(second,seed));
  }
});
