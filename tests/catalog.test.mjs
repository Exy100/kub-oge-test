import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, BUILD_MATERIALS, itemStack } from '../catalog/index.js';
import { createCatalog } from '../catalog/registry.js';
import { LOCATIONS } from '../locations/index.js';
import { validateLocations } from '../locations/validate.js';
import { createPlayerInventory } from '../player-inventory.js';
import { createStage, MATERIAL_NAMES } from '../progression.js';
import { createTreeRenderer } from '../world/trees.js';

const copy = id => structuredClone(catalog.get(id));

test('legacy item IDs and material order survive the catalog migration', () => {
  assert.deepEqual(BUILD_MATERIALS.map(item => item.id), Array.from({length:6}, (_,i) => `material-${i}`));
  assert.deepEqual(MATERIAL_NAMES, BUILD_MATERIALS.map(item => item.name));
  for (const id of ['wand','bit','byte']) assert.equal(itemStack(id, 1).id, id);
  LOCATIONS.forEach((location, i) => {
    const stage = createStage(i);
    assert.equal(stage.locationId, location.id);
    assert.equal(stage.center, location.center);
    assert.equal(stage.inventory.length, BUILD_MATERIALS.length);
  });
});

test('catalog rejects duplicate IDs, missing text, material slot collisions and invalid tree geometry', () => {
  assert.throws(() => createCatalog([copy('wand'), copy('wand')]), /duplicate ID/);
  assert.throws(() => createCatalog([{...copy('wand'), description:''}]), /description/);
  assert.throws(() => createCatalog([copy('material-0'), {...copy('material-0'), id:'other'}]), /material slot/);
  assert.throws(() => createCatalog([copy('material-1')]), /missing material slot 0/);
  for (const [index,value] of [[0,NaN],[3,0],[6,99],[7,'yes']]) {
    const tree = copy('tree.island'); tree.parts[0][index] = value;
    assert.throws(() => createCatalog([tree]), /tree part/);
  }
  assert.throws(() => catalog.get('missing.tree'), /Unknown object ID/);
});

test('definitions are deeply immutable and inventory state cannot overwrite their text', () => {
  assert.throws(() => { catalog.get('wand').name = 'Changed'; }, TypeError);
  assert.throws(() => { catalog.get('tree.island').parts[0][3] = 100; }, TypeError);
  const resource = { id:'bit', quantity:3, name:'Outdated name' };
  const bag = createPlayerInventory(() => [resource]);
  assert.equal(bag.items().find(item => item.id === 'bit').name, catalog.get('bit').name);
  assert.ok(bag.add({id:'wand', quantity:1, name:'Outdated wand', kind:'weapon'}));
  assert.equal(bag.equip('battle', 'weapon', 'wand'), false);
  assert.ok(bag.equip('build', 'tool', 'wand'));
  const item = bag.items().find(item => item.id === 'wand');
  item.quantity = 999; item.name = 'Changed';
  assert.equal(bag.items().find(item => item.id === 'wand').quantity, 2);
  assert.equal(bag.items().find(item => item.id === 'wand').name, catalog.get('wand').name);
  assert.equal(bag.add({id:'tree.island', quantity:1}), false);
  assert.equal(bag.add({id:'wand-typo', name:'Typo', kind:'tool', quantity:1}), false);
  assert.equal(bag.canStore('wand-typo'), false);
  assert.throws(() => itemStack('tree.island', 1), /not an inventory item/);
  assert.throws(() => itemStack('wand', -1), /quantity/);
});

test('locations reject broken object references, duplicate IDs and invalid placements', () => {
  assert.doesNotThrow(() => validateLocations(LOCATIONS, catalog));
  for (const objectId of ['missing.tree', 'wand']) {
    const location = structuredClone(LOCATIONS[0]); location.trees[0].objectId = objectId;
    assert.throws(() => validateLocations([location], catalog), /unknown tree/);
  }
  const location = structuredClone(LOCATIONS[0]); location.trees[0].scale = -1;
  assert.throws(() => validateLocations([location], catalog), /placement/);
  assert.throws(() => validateLocations([LOCATIONS[0],LOCATIONS[0]], catalog), /duplicate ID/);
});

test('tree instances share materials but keep separate meshes and original trunk collision footprint', () => {
  const render = createTreeRenderer((x,y,z,w,h,d,material,collide) => ({x,y,z,w,h,d,material,collide,userData:{}}));
  const placement = LOCATIONS[0].trees[0];
  const first = render(placement), second = render({...placement, x:100, mirror:true});
  assert.notEqual(first[0], second[0]);
  assert.equal(first[0].material, second[0].material);
  for (const location of LOCATIONS) for (const tree of location.trees) {
    const parts = render(tree), colliders = parts.filter(part => part.collide);
    assert.equal(colliders.length, 1);
    const trunk = colliders[0];
    assert.deepEqual([trunk.x,trunk.z,trunk.w,trunk.h,trunk.d], [tree.x,tree.z,.6*tree.scale,2.5*tree.scale,.6*tree.scale]);
    assert.equal(trunk.y - trunk.h / 2, 0);
    assert.ok(parts.every(part => part.userData.objectId === tree.objectId));
  }
});
