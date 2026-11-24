import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerInventory } from '../player-inventory.js';
import { itemStack } from '../catalog/index.js';

// Test-only objects exercise capacity and slots without adding unreleased items to the game.
function inventoryWithFixtures(readResources, fixtures) {
  return createPlayerInventory(readResources, (id, quantity) => {
    const definition = fixtures.find(item => item.id === id);
    return definition ? { ...definition, quantity } : itemStack(id, quantity);
  });
}

test('full inventory accepts existing stacks until resource spending frees a cell', () => {
  const resource = { id: 'bit', quantity: 0 };
  const bag = inventoryWithFixtures(() => [resource], [
    ...Array.from({length:18}, (_,i) => ({id:'key-'+(i+2), kind:'key'})), {id:'extra', kind:'key'},
  ]);
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
  const bracelet = { id: 'amber', kind: 'bracelet', quantity: 1 };
  const bag = inventoryWithFixtures(() => [], [bracelet]);
  bag.add(bracelet);
  assert.ok(bag.equip('build', 'leftWrist', 'amber'));
  assert.equal(bag.equip('build', 'rightWrist', 'amber'), false);
  assert.ok(bag.equip('battle', 'rightWrist', 'amber'));
  bag.add(bracelet);
  assert.ok(bag.equip('build', 'rightWrist', 'amber'));
  assert.equal(bag.equip('battle', 'weapon', 'wand'), true);
  assert.ok(bag.equip('build', 'tool', null));
  assert.ok(bag.equip('build', 'tool', 'wand'));
});

test('moving and swapping stacks preserves quantities, equipment and empty slots', () => {
  const materials = [{id:'bit', quantity:8}, {id:'byte', quantity:1}];
  const bag = createPlayerInventory(() => materials);
  assert.ok(bag.move('wand', 19));
  assert.ok(bag.move('bit', 19));
  assert.equal(bag.cells()[1].id, 'wand');
  assert.equal(bag.cells()[19].quantity, 8);
  assert.equal(bag.loadouts.build.tool, 'wand');
  materials[0].quantity = 0;
  assert.equal(bag.cells()[19], null);
  assert.equal(bag.cells()[2].id, 'byte');
  for (const index of [-1, 20, .5]) assert.equal(bag.move('wand', index), false);
  assert.equal(bag.move('missing', 0), false);
  assert.equal(bag.cells()[1].id, 'wand');
});

test('removing and equipping the wand needs no empty slot', () => {
  const resources = Array.from({length:19}, (_,i) => ({id:'key-'+i, kind:'key', quantity:1}));
  const bag = inventoryWithFixtures(() => resources, resources);
  bag.move('wand', 19);
  assert.ok(bag.equip('build','tool',null));
  assert.equal(bag.cells().filter(Boolean).length,20);
  assert.ok(bag.equip('build','tool','wand'));
  assert.equal(bag.cells()[19].id,'wand');
});
