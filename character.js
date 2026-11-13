import * as THREE from './vendor/three.module.js';

// Local forward is -Z. All animation is driven by actual, post-collision motion.
export function createCharacter() {
  const root = new THREE.Group();
  root.name = 'Explorer';
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = new Map();
  function block(parent, name, x, y, z, w, h, d, color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .88 }));
    const mesh = new THREE.Mesh(geometry, materials.get(color));
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function joint(parent, name, x = 0, y = 0, z = 0) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, y, z);
    parent.add(group);
    return group;
  }
  const body = joint(root, 'body');
  block(body, 'jacket', 0, 1.04, 0, .53, .48, .32, 0xe7d6a6);
  block(body, 'jacket-hem', 0, .815, 0, .55, .065, .34, 0xb5a474);
  block(body, 'shirt', 0, 1.12, -.169, .15, .3, .025, 0x728b76);
  block(body, 'zipper', 0, 1.025, -.19, .018, .38, .018, 0x796b4b);
  block(body, 'belt', 0, .79, 0, .51, .07, .32, 0x6c5940);
  block(body, 'buckle', 0, .79, -.18, .085, .065, .025, 0xd6bc77);
  for (const side of [-1, 1]) {
    block(body, 'collar', side * .115, 1.265, -.16, .15, .065, .07, 0xf3e5bc);
    block(body, 'pocket', side * .17, 1.03, -.177, .13, .14, .035, 0xccba88);
    block(body, 'pocket-flap', side * .17, 1.09, -.2, .14, .035, .025, 0xf0dfb1);
    block(body, 'pocket-button', side * .17, 1.075, -.218, .025, .025, .012, 0x7e7154);
    block(body, 'pack-strap', side * .2, 1.08, -.19, .045, .39, .045, 0x886d48);
  }
  const backpack = joint(body, 'backpack', 0, 1.03, .25);
  block(backpack, 'pack', 0, 0, 0, .43, .43, .23, 0xa47b4b);
  block(backpack, 'pack-flap', 0, .16, .035, .46, .13, .25, 0xb9935f);
  block(backpack, 'pack-pocket', 0, -.08, .135, .28, .18, .055, 0x8d6842);
  for (const side of [-1, 1]) {
    block(backpack, 'pack-belt', side * .13, -.01, .15, .04, .3, .025, 0x665439);
    block(backpack, 'pack-buckle', side * .13, .015, .17, .06, .055, .02, 0xd6bc77);
    block(backpack, 'roll-end', side * .25, .3, 0, .08, .16, .18, 0x708475);
  }
  block(backpack, 'bedroll', 0, .3, 0, .46, .16, .18, 0x8fa18a);
  const head = joint(body, 'head', 0, 1.43, 0);
  block(head, 'face', 0, 0, 0, .43, .4, .4, 0xe2b58a);
  block(head, 'hair-top', 0, .205, .015, .46, .1, .44, 0x594734);
  block(head, 'hair-back', 0, .065, .2, .45, .26, .055, 0x594734);
  for (const side of [-1, 1]) {
    block(head, 'ear', side * .23, -.015, 0, .065, .12, .095, 0xcf9c74);
    block(head, 'sideburn', side * .205, .09, -.07, .045, .14, .23, 0x66503a);
    block(head, 'eye-white', side * .095, .015, -.207, .085, .065, .018, 0xfff4d9);
    block(head, 'iris', side * .087, .01, -.22, .035, .05, .012, 0x3e554a);
    block(head, 'eye-glint', side * .087 - .007, .025, -.229, .012, .015, .008, 0xffffff);
    block(head, 'eyebrow', side * .095, .075, -.214, .095, .025, .02, 0x594734);
    block(head, 'cheek', side * .14, -.065, -.205, .06, .035, .012, 0xd69e7e);
  }
  block(head, 'nose', 0, -.04, -.227, .065, .075, .05, 0xcd986e);
  block(head, 'smile', 0, -.135, -.207, .1, .022, .015, 0x966a52);
  for (let i = 0; i < 5; i++) block(head, 'fringe', -.175 + i * .085, .14 - (i % 2) * .025, -.207, .085, .075, .04, i % 2 ? 0x71563d : 0x594734);

  const arms = [-1, 1].map(side => {
    const shoulder = joint(body, 'shoulder', side * .36, 1.23, 0);
    block(shoulder, 'sleeve', 0, -.125, 0, .19, .25, .25, 0xd9c796);
    block(shoulder, 'sleeve-seam', side * .09, -.12, 0, .015, .2, .23, 0xb8a777);
    const elbow = joint(shoulder, 'elbow', 0, -.25, 0);
    block(elbow, 'forearm', 0, -.105, 0, .16, .21, .19, 0xe2b58a);
    block(elbow, 'cuff', 0, -.015, 0, .185, .05, .215, 0xf0dfb1);
    block(elbow, 'glove', 0, -.235, -.005, .18, .1, .21, 0x78694d);
    block(elbow, 'thumb', -side * .09, -.215, -.04, .045, .075, .09, 0x9a8460);
    if (side === -1) block(elbow, 'watch', -.085, -.155, -.01, .025, .07, .09, 0x516b63);
    return { shoulder, elbow };
  });
  const legs = [-1, 1].map(side => {
    const upper = joint(root, 'thigh');
    block(upper, 'trousers', 0, -.175, 0, .225, .35, .26, 0x647a69);
    block(upper, 'trouser-seam', side * .114, -.17, .01, .012, .3, .19, 0x80917a);
    const lower = joint(root, 'shin');
    block(lower, 'trousers-lower', 0, -.15, 0, .205, .3, .23, 0x596d60);
    block(lower, 'knee-patch', 0, -.045, -.12, .15, .1, .025, 0x87927b);
    const foot = joint(root, 'foot');
    block(foot, 'boot', 0, .015, -.045, .24, .15, .36, 0x766042);
    block(foot, 'sole', 0, -.05, -.05, .255, .045, .38, 0x443e32);
    block(foot, 'toe-cap', 0, -.005, -.195, .245, .095, .075, 0x9b8158);
    block(foot, 'boot-collar', 0, .095, .005, .225, .055, .23, 0x8b7554);
    for (let i = 0; i < 3; i++) block(foot, 'lace', 0, .1 - i * .015, -.06 - i * .04, .12, .015, .02, 0xc3ae7d);
    return { side, upper, lower, foot };
  });

  const down = new THREE.Vector3(0, -1, 0);
  const hip = new THREE.Vector3(), ankle = new THREE.Vector3(), knee = new THREE.Vector3();
  const axis = new THREE.Vector3(), bend = new THREE.Vector3(), direction = new THREE.Vector3();
  const thighLength = .36, shinLength = .35;
  let phase = 0, forward = 0, strafe = 0, weight = 0, air = 0, landing = 0, wasGrounded = true;
  function animate(dt, { dx = 0, dz = 0, yaw = 0, grounded = true, velocity = 0, time = 0 } = {}) {
    const distance = Math.hypot(dx, dz);
    const speed = dt > 0 ? distance / dt : 0;
    const blend = 1 - Math.exp(-14 * dt);
    const moving = speed > .02;
    if (moving) {
      forward += ((-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / distance - forward) * blend;
      strafe += ((Math.cos(yaw) * dx - Math.sin(yaw) * dz) / distance - strafe) * blend;
    }
    weight += ((grounded ? Math.min(speed / 4, 1) : 0) - weight) * blend;
    air += ((grounded ? 0 : 1) - air) * blend;
    if (grounded && !wasGrounded) landing = .065;
    landing *= Math.exp(-12 * dt);
    wasGrounded = grounded;
    // Cycle length follows travelled distance, so pushing against walls stops the feet.
    if (grounded) phase = (phase + distance * 7.5) % (Math.PI * 2);
    const bob = Math.cos(phase * 2) * .014 * weight - landing;
    body.position.y = bob + Math.sin(time * 1.8) * .003 * (1 - weight);
    body.rotation.x = -.055 * forward * weight;
    body.rotation.z = -.045 * strafe * weight + Math.sin(phase) * .02 * weight;
    head.rotation.y = -.045 * strafe * weight;
    backpack.rotation.x = Math.sin(phase * 2) * .025 * weight;
    legs.forEach((leg, i) => {
      const step = phase + i * Math.PI;
      const travel = Math.sin(step) * .23 * weight;
      const lift = Math.max(0, Math.cos(step)) * .13 * weight;
      hip.set(leg.side * .145, .77 + bob, 0);
      ankle.set(leg.side * .145 + strafe * travel, .075 + lift + air * (.09 + i * .025), -forward * travel + air * .07);
      axis.subVectors(ankle, hip);
      const length = THREE.MathUtils.clamp(axis.length(), .05, thighLength + shinLength - .001);
      axis.normalize();
      ankle.copy(hip).addScaledVector(axis, length);
      // Analytic two-bone IK: knee bends forwards, feet remain level on the ground.
      const along = (thighLength ** 2 - shinLength ** 2 + length ** 2) / (2 * length);
      bend.set(0, 0, -1).addScaledVector(axis, axis.z).normalize();
      knee.copy(hip).addScaledVector(axis, along).addScaledVector(bend, Math.sqrt(Math.max(0, thighLength ** 2 - along ** 2)));
      leg.upper.position.copy(hip);
      leg.upper.quaternion.setFromUnitVectors(down, direction.subVectors(knee, hip).normalize());
      leg.lower.position.copy(knee);
      leg.lower.quaternion.setFromUnitVectors(down, direction.subVectors(ankle, knee).normalize());
      leg.foot.position.copy(ankle);
      leg.foot.rotation.set(-.13 * Math.max(0, Math.cos(step)) * forward * weight + air * .12, -.12 * strafe * weight, 0);
      const swing = Math.sin(step) * weight;
      arms[i].shoulder.rotation.set(-swing * forward * .43 - air * .28, 0, -swing * strafe * .25 + leg.side * (.045 + air * .16));
      arms[i].elbow.rotation.x = -.12 - Math.max(0, -swing * forward) * .25 - air * .3;
    });
  }
  animate(0);
  return { root, animate };
}
