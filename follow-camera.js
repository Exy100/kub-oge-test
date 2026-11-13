import * as THREE from './vendor/three.module.js';
const ray = new THREE.Raycaster();
const direction = new THREE.Vector3();
// Keep walls and portal surfaces out of the space between the player and camera.
export function followCamera(camera, eye, look, obstacles) {
  direction.copy(look).negate().normalize();ray.set(eye,direction);ray.near=.05;ray.far=6;
  const hit=ray.intersectObjects(obstacles.filter(object=>object.visible),false)[0];
  const distance=hit?Math.max(.12,hit.distance-.2):6;
  camera.position.copy(eye).addScaledVector(direction,distance);
  camera.position.y=Math.max(.15,camera.position.y);camera.lookAt(eye);
}
