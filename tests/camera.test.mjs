import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.js';
import { followCamera } from '../follow-camera.js';
test('follow camera keeps a portal between the camera and background, not over the player',()=>{
  const camera=new THREE.PerspectiveCamera(),eye=new THREE.Vector3(0,1.5,0),look=new THREE.Vector3(0,0,-1);
  const portal=new THREE.Mesh(new THREE.PlaneGeometry(3,4),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));portal.position.set(0,1.5,3);portal.updateMatrixWorld();
  followCamera(camera,eye,look,[portal]);assert.ok(camera.position.z<3);assert.ok(camera.position.z>2.5);
  portal.visible=false;followCamera(camera,eye,look,[portal]);assert.equal(camera.position.z,6);
  followCamera(camera,eye,new THREE.Vector3(0,.8,-.6),[]);assert.ok(camera.position.y>=.15);
});
