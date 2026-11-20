import * as THREE from '../vendor/three.module.js';

export function createScanFindings(parent, trunks) {
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
  const barkBand = new THREE.Mesh(new THREE.RingGeometry(.72,.90,4,1,Math.PI/4),
    new THREE.MeshBasicMaterial({color:0xffc96a, side:THREE.DoubleSide}));
  const sleeveGeometry = new THREE.CylinderGeometry(.8,.8,.16,4,1,true,Math.PI/4);
  const sleeve = new THREE.Mesh(sleeveGeometry,barkBand.material);
  sleeve.rotation.x = Math.PI / 2;
  barkBand.add(sleeve);
  barkBand.rotation.x = -Math.PI / 2;
  barkBand.visible = false;
  root.add(ring,barkBand);

  function addMark(mesh, width, height, x, y, z, material) {
    const mark = new THREE.Mesh(detail, material);
    mark.scale.set(width,height,.025);
    mark.position.set(x,y,z);
    mesh.add(mark);
  }
  function sync(entries) {
    for (const [key,mesh] of markers) {
      if (!entries[key] || entries[key].claimed || entries[key].kind !== mesh.userData.kind || entries[key].face !== mesh.userData.face) {
        root.remove(mesh);
        markers.delete(key);
      }
    }
    for (const [key,entry] of Object.entries(entries)) {
      if (entry.kind === 'empty' || entry.claimed || markers.has(key)) continue;
      const trunk = trunks.get(key);
      const isCoin = entry.kind === 'coin';
      const mesh = new THREE.Mesh(isCoin ? coin : tablet, isCoin ? gold : stone);
      if (trunk) {
        const yaw = (entry.face ?? 0) * Math.PI / 2;
        mesh.rotation.order = 'YXZ';
        mesh.rotation.y = yaw;
        const gap = trunk.scale.x / 2 + .12;
        mesh.position.set(trunk.position.x + Math.sin(yaw)*gap, 1.5, trunk.position.z + Math.cos(yaw)*gap);
      } else {
        const [x,z] = key.split(',').map(Number);
        mesh.position.set(x,isCoin ? .42 : .3,z);
      }
      if (isCoin) {
        mesh.rotation.x = Math.PI / 2;
        const stamp = new THREE.Mesh(detail,relief);
        stamp.scale.set(.07,.11,.24);
        mesh.add(stamp);
      } else {
        mesh.rotation.x = trunk ? 0 : -.18;
        for (const y of [.12,0,-.12]) addMark(mesh,.42,.025,0,y,.096,engraving);
        for (const x of [-.07,.09]) addMark(mesh,.025,.25,x,0,.096,engraving);
      }
      mesh.castShadow = true;
      mesh.userData = {kind:entry.kind, scanKey:key, face:entry.face};
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
    pulseTree(trunk, progress, reduced) {
      barkBand.visible = true;
      barkBand.scale.setScalar(trunk.scale.x);
      const top = Math.min(1.8, trunk.position.y + trunk.scale.y / 2);
      const y = reduced ? 1.5 : .3 + (top - .3) * (.5 - .5 * Math.cos(progress * 3 * Math.PI));
      barkBand.position.set(trunk.position.x,y,trunk.position.z);
    },
    stop(){ring.visible = barkBand.visible = false},
    dispose(){
      parent.remove(root);
      for (const resource of [coin,tablet,detail,gold,relief,stone,engraving,ringGeometry,light,barkBand.geometry,barkBand.material,sleeveGeometry]) resource.dispose();
    },
  };
}
