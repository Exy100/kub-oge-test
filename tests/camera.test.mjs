import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.js';
import { createFollowState, followCamera } from '../follow-camera.js';
test('follow camera keeps a portal between the camera and background, not over the player',()=>{
  const camera=new THREE.PerspectiveCamera(),eye=new THREE.Vector3(0,1.5,0),look=new THREE.Vector3(0,0,-1);
  const portal=new THREE.Mesh(new THREE.PlaneGeometry(3,4),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));portal.position.set(0,1.5,3);portal.updateMatrixWorld();
  followCamera(camera,eye,look,[portal]);assert.ok(camera.position.z<3);assert.ok(camera.position.z>2.5);
  portal.visible=false;followCamera(camera,eye,look,[portal]);assert.equal(camera.position.z,6);
  followCamera(camera,eye,new THREE.Vector3(0,.8,-.6),[]);assert.ok(camera.position.y>=.15);
});

test('tight spaces use eye view until the avatar fits again', () => {
  const camera = new THREE.PerspectiveCamera(55, 1.6, .1, 100);
  const eye = new THREE.Vector3(0, 1.5, 0);
  const look = new THREE.Vector3(0, 0, -1);
  const state = createFollowState();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 4, .2));
  wall.position.set(0, 1.5, .4);
  const follow = () => followCamera(camera, eye, look, [wall], state, 1 / 60);
  assert.equal(follow(), false);
  assert.deepEqual(camera.position.toArray(), eye.toArray());
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).distanceTo(look) < 1e-9);
  wall.position.z = 1.4;
  assert.equal(follow(), false, 'a small movement at the threshold must not toggle the view');
  wall.position.z = 2;
  assert.equal(follow(), true);
  assert.ok(camera.position.z > .95 && camera.position.z < 1.8);
  wall.visible = false;
  for (let frame = 0; frame < 120; frame++) follow();
  assert.ok(camera.position.z > 5.99);
  wall.visible = true;
  wall.position.z = .05;
  assert.equal(follow(), false, 'handles a camera pivot inside a newly placed obstacle');
});

test('near-plane corners clear off-axis blocks on wide displays', () => {
  const camera = new THREE.PerspectiveCamera(55, 3, .1, 100);
  const box = new THREE.Mesh(new THREE.BoxGeometry(.2, 3, 1));
  box.position.set(.23, 1.5, 3);
  assert.equal(followCamera(camera, new THREE.Vector3(0,1.5,0), new THREE.Vector3(0,0,-1), [box]), true);
  assert.ok(camera.position.z < 2.5 && camera.position.z > 2);
});
