// Axis-aligned solid boxes, with the player's position at the soles of the feet.
export const PLAYER_RADIUS = .3;
export const PLAYER_HEIGHT = 1.7;
// Jump height is proportional to launch speed squared at unchanged gravity.
const JUMP_SPEED = 6 * Math.sqrt(1.1);
const EPSILON = 1e-7;

function bounds(box, axis) {
  return [box.position[axis] - box.scale[axis] / 2, box.position[axis] + box.scale[axis] / 2];
}
function overlaps(position, box, axis) {
  const [min, max] = bounds(box, axis);
  const low = axis === 'y' ? position.y : position[axis] - PLAYER_RADIUS;
  const high = axis === 'y' ? position.y + PLAYER_HEIGHT : position[axis] + PLAYER_RADIUS;
  return low < max - EPSILON && high > min + EPSILON;
}
function supported(position, solids) {
  return position.y <= EPSILON || solids.some(box =>
    overlaps(position, box, 'x') && overlaps(position, box, 'z') &&
    Math.abs(position.y - bounds(box, 'y')[1]) < EPSILON);
}
function sweep(position, axis, delta, solids, limits) {
  if (!delta) return false;
  const otherAxes = ['x', 'y', 'z'].filter(a => a !== axis);
  const lowOffset = axis === 'y' ? 0 : PLAYER_RADIUS;
  const highOffset = axis === 'y' ? PLAYER_HEIGHT : PLAYER_RADIUS;
  const start = position[axis];
  let end = start + delta;
  for (const box of solids) {
    if (!otherAxes.every(a => overlaps(position, box, a))) continue;
    const [min, max] = bounds(box, axis);
    if (delta > 0 && start + highOffset <= min + EPSILON && end + highOffset >= min) {
      end = Math.min(end, min - highOffset);
    } else if (delta < 0 && start - lowOffset >= max - EPSILON && end - lowOffset <= max) {
      end = Math.max(end, max + lowOffset);
    }
  }
  if (axis === 'y') end = Math.max(0, end);
  else end = Math.max(limits[axis][0], Math.min(limits[axis][1], end));
  position[axis] = end;
  return Math.abs(end - (start + delta)) > EPSILON;
}

export function createPhysicsState() {
  return { velocity: 0, grounded: true };
}

export function movePlayer(position, state, { dt, vx = 0, vz = 0, jump = false, limits = { x: [-10,10], z: [-9,9] } }, solids) {
  if (!(dt > 0)) return;
  // Recheck support before jumping: removing a block or walking off it cannot grant an air jump.
  state.grounded = supported(position, solids) && state.velocity <= 0;
  if (jump && state.grounded) {
    state.velocity = JUMP_SPEED;
    state.grounded = false;
  }
  // Small steps also preserve diagonal sliding at corners and reliable ledge support.
  const duration = Math.min(dt, .1);
  const steps = Math.ceil(duration / (1 / 120));
  const step = duration / steps;
  for (let i = 0; i < steps; i++) {
    sweep(position, 'x', vx * step, solids, limits);
    sweep(position, 'z', vz * step, solids, limits);
    state.velocity -= 16 * step;
    if (sweep(position, 'y', state.velocity * step, solids, limits)) state.velocity = 0;
    state.grounded = state.velocity <= 0 && supported(position, solids);
    if (state.grounded) state.velocity = 0;
  }
}
