import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerInventory } from '../player-inventory.js';

test('full inventory accepts existing stacks until resource spending frees a cell', () => {
  const resource = { id: 'bit', quantity: 0 };
  const bag = createPlayerInventory(() => [resource]);
  assert.equal(bag.items().length, 1);
  resource.quantity = 8;
  for (let i = 2; i < bag.capacity; i++) assert.ok(bag.add({ id: 'key-' + i, kind: 'key', quantity: 1 }));
  assert.equal(bag.items().length, 20);
  assert.ok(bag.canStore('bit'));
  assert.ok(bag.add({ id: 'key-2', quantity: 1 }));
  assert.equal(bag.add({ id: 'extra', quantity: 1 }), false);
  resource.quantity = 0;
  assert.ok(bag.canStore('extra'));
});

test('both wrist slots respect owned quantity within each loadout', () => {
  const bag = createPlayerInventory(() => []);
  const bracelet = { id: 'amber', kind: 'bracelet', quantity: 1 };
  bag.add(bracelet);
  assert.ok(bag.equip('build', 'leftWrist', 'amber'));
  assert.equal(bag.equip('build', 'rightWrist', 'amber'), false);
  assert.ok(bag.equip('battle', 'rightWrist', 'amber'));
  bag.add(bracelet);
  assert.ok(bag.equip('build', 'rightWrist', 'amber'));
  assert.equal(bag.equip('battle', 'weapon', 'wand'), false);
  assert.ok(bag.equip('build', 'tool', null));
  assert.ok(bag.equip('build', 'tool', 'wand'));
});
