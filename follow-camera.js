import * as THREE from './vendor/three.module.js';

const FOLLOW_DISTANCE = 6;
const ENTER_EYE_VIEW = .95;
const LEAVE_EYE_VIEW = 1.35;
const ray = new THREE.Ray();
const bounds = new THREE.Box3();
const hit = new THREE.Vector3();

export function createFollowState() {
  return { distance: FOLLOW_DISTANCE, obstructed: false };
}

// Returns whether there is room to render the avatar in third person.
export function followCamera(camera, eye, look, obstacles, state = createFollowState(), dt = Infinity) {
  ray.origin.copy(eye);
  ray.direction.copy(look).normalize().negate();
  const halfHeight = camera.near * Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2);
  const clearance = Math.hypot(camera.near, halfHeight, halfHeight * camera.aspect) + .02;
  let available = FOLLOW_DISTANCE;
  if (ray.direction.y < 0) {
    available = Math.min(available, Math.max(0, eye.y - Math.max(.15, clearance)) / -ray.direction.y);
  }
  for (const object of obstacles) {
    if (!object.visible) continue;
    // World obstacles are boxes and planar portals. Expand their bounds to leave
    // room for the near plane, including when it grazes a corner of a block.
    object.updateWorldMatrix(true, false);
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    bounds.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld).expandByScalar(clearance);
    if (bounds.containsPoint(eye)) {
      available = 0;
      break;
    }
    if (ray.intersectBox(bounds, hit)) available = Math.min(available, eye.distanceTo(hit));
  }
  state.obstructed = available < (state.obstructed ? LEAVE_EYE_VIEW : ENTER_EYE_VIEW);
  if (state.obstructed) {
    state.distance = 0;
  } else {
    // Retract immediately. On release start outside the avatar and ease back.
    const previous = Math.max(ENTER_EYE_VIEW, state.distance);
    state.distance = Math.min(available, THREE.MathUtils.lerp(previous, available, 1 - Math.exp(-8 * dt)));
  }
  camera.position.copy(eye).addScaledVector(ray.direction, state.distance);
  camera.position.y = Math.max(.15, camera.position.y);
  camera.lookAt(hit.copy(camera.position).add(look));
  return !state.obstructed;
}
