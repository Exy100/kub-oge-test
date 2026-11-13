import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCharacter } from '../character.js';

function walk(x, z, fps = 60, yaw = 0) {
  const rig = createCharacter();
  for (let i = 0; i < fps * .4; i++) rig.animate(1 / fps, { dx: x / fps, dz: z / fps, yaw });
  const feet = [];
  rig.root.traverse(part => { if (part.name === 'foot') feet.push(part); });
  return { rig, feet };
}
test('backwards and sideways movement reverse foot travel', () => {
  const front = walk(0, -4), back = walk(0, 4);
  assert.ok(front.feet[0].position.z * back.feet[0].position.z < 0);
  const left = walk(-4, 0), right = walk(4, 0);
  assert.ok((left.feet[0].position.x + .145) * (right.feet[0].position.x + .145) < 0);
  const diagonal = walk(Math.SQRT2 * 2, -Math.SQRT2 * 2);
  assert.ok(Math.abs(diagonal.feet[0].position.x + .145) > .01);
  assert.ok(Math.abs(diagonal.feet[0].position.z) > .01);
});
test('gait uses local facing and stays consistent across frame rates', () => {
  const forward = walk(0, -4), rotated = walk(-4, 0, 60, Math.PI / 2);
  assert.ok(forward.feet[0].position.distanceTo(rotated.feet[0].position) < 1e-6);
  for (const fps of [30, 120]) {
    assert.ok(forward.feet[0].position.distanceTo(walk(0, -4, fps).feet[0].position) < .002);
  }
});
test('collision stop settles feet; jump lifts them; landing returns to rest', () => {
  const { rig, feet } = walk(0, -4);
  for (let i = 0; i < 120; i++) rig.animate(1 / 60, {});
  assert.ok(Math.abs(feet[0].position.z) < .001);
  for (let i = 0; i < 30; i++) rig.animate(1 / 60, { grounded: false });
  assert.ok(feet[0].position.y > .1);
  for (let i = 0; i < 120; i++) rig.animate(1 / 60, {});
  assert.ok(Math.abs(feet[0].position.y - .075) < .001);
  rig.root.traverse(part => {
    assert.ok(part.position.toArray().every(Number.isFinite));
    assert.ok(part.quaternion.toArray().every(Number.isFinite));
  });
});
