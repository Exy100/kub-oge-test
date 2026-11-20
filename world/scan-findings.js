import * as THREE from '../vendor/three.module.js';

export function createScanFindings(parent) {
  const root = new THREE.Group();
  parent.add(root);
  const markers = new Map();
  const coin = new THREE.CylinderGeometry(.23,.23,.09,12);
  const tablet = new THREE.BoxGeometry(.65,.58,.18);
  const detail = new THREE.BoxGeometry(1,1,1);
  const paint = color => new THREE.MeshStandardMaterial({color});
  const gold = paint(0xffbf38), relief = paint(0xffdf78);
  const stone = paint(0x727978), engraving = paint(0xb1bbad);
  const ringGeometry = new THREE.RingGeometry(.42,.48,32);
  const light = new THREE.MeshBasicMaterial({color:0x70f3cf, transparent:true, opacity:.85, depthWrite:false});
  const ring = new THREE.Mesh(ringGeometry, light);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  root.add(ring);

  function addMark(mesh, width, height, x, y, z, material) {
    const mark = new THREE.Mesh(detail, material);
    mark.scale.set(width,height,.025);
    mark.position.set(x,y,z);
    mesh.add(mark);
  }
  function sync(entries) {
    for (const [key,mesh] of markers) {
      if (!entries[key] || entries[key].claimed || entries[key].kind !== mesh.userData.kind) {
        root.remove(mesh);
        markers.delete(key);
      }
    }
    for (const [key,entry] of Object.entries(entries)) {
      if (entry.kind === 'empty' || entry.claimed || markers.has(key)) continue;
      const [x,z] = key.split(',').map(Number);
      const isCoin = entry.kind === 'coin';
      const mesh = new THREE.Mesh(isCoin ? coin : tablet, isCoin ? gold : stone);
      mesh.position.set(x,isCoin ? .42 : .3,z);
      if (isCoin) {
        mesh.rotation.x = Math.PI / 2;
        const stamp = new THREE.Mesh(detail,relief);
        stamp.scale.set(.07,.11,.24);
        mesh.add(stamp);
      } else {
        mesh.rotation.x = -.18;
        for (const y of [.12,0,-.12]) addMark(mesh,.42,.025,0,y,.096,engraving);
        for (const x of [-.07,.09]) addMark(mesh,.025,.25,x,0,.096,engraving);
      }
      mesh.castShadow = true;
      mesh.userData = {kind:entry.kind, scanKey:key};
      root.add(mesh);
      markers.set(key,mesh);
    }
    root.updateMatrixWorld(true);
  }
  return {
    markers, sync,
    pulse(x,z,progress,reduced) {
      ring.visible = true;
      ring.position.set(x,.035,z);
      ring.scale.setScalar(reduced ? 1 : .27 + .73 * ((progress * 3) % 1));
    },
    stop(){ring.visible = false},
    dispose(){
      parent.remove(root);
      for (const resource of [coin,tablet,detail,gold,relief,stone,engraving,ringGeometry,light]) resource.dispose();
    },
  };
}
