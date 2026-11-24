import * as THREE from '../vendor/three.module.js';

function createFloorGrid(cells) {
  const points = [];
  const edge = (x1,z1,x2,z2) => points.push(x1,.024,z1,x2,.024,z2);
  for (const key of cells) {
    const [x,z] = key.split(',').map(Number);
    edge(x-.5,z-.5,x+.5,z-.5);
    edge(x-.5,z-.5,x-.5,z+.5);
    if (!cells.has(x+','+(z+1))) edge(x-.5,z+.5,x+.5,z+.5);
    if (!cells.has((x+1)+','+z)) edge(x+.5,z-.5,x+.5,z+.5);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const grid = new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({
    color:0x86e9ff, transparent:true, opacity:.70, depthWrite:false,
  }));
  grid.name = 'board-scan-grid';
  grid.visible = false;
  return grid;
}

export function createScanFindings(parent, trunks, boardCells) {
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
  // Four bars per square, all three hoops share one draw call and one pulse color.
  const deepBlue = new THREE.Color(0x143ba8), azure = new THREE.Color(0x168fff), ice = new THREE.Color(0x9eefff);
  const bandMaterial = new THREE.MeshBasicMaterial({color:deepBlue});
  const treeRings = new THREE.InstancedMesh(detail,bandMaterial,12);
  treeRings.name = 'tree-scan-rings';
  const transform = new THREE.Matrix4();
  const outerWidth = 1.92, barWidth = .08, barHeight = .022;
  const edgeOffset = (outerWidth - barWidth) / 2;
  let bar = 0;
  for (const y of [-.30,-.06,.18]) {
    for (const side of [-1,1]) {
      transform.makeScale(outerWidth,barHeight,barWidth).setPosition(0,y,side*edgeOffset);
      treeRings.setMatrixAt(bar++,transform);
      transform.makeScale(barWidth,barHeight,outerWidth - 2*barWidth).setPosition(side*edgeOffset,y,0);
      treeRings.setMatrixAt(bar++,transform);
    }
  }
  treeRings.visible = false;
  root.add(ring,treeRings);
  const grid = boardCells ? createFloorGrid(boardCells) : null;
  if (grid) root.add(grid);

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
    startFloorScan(){if (grid) grid.visible=true},
    pulse(x,z,progress,reduced) {
      ring.visible = true;
      ring.position.set(x,.035,z);
      ring.scale.setScalar(reduced ? 1 : .27 + .73 * ((progress * 3) % 1));
    },
    pulseTree(trunk, progress, reduced) {
      treeRings.visible = true;
      treeRings.position.copy(trunk.position);
      treeRings.scale.copy(trunk.scale);
      const phase = reduced ? .5 : .5 - .5 * Math.cos(2 * Math.PI * progress);
      if (phase <= .5) bandMaterial.color.lerpColors(deepBlue,azure,phase * 2);
      else bandMaterial.color.lerpColors(azure,ice,phase * 2 - 1);
    },
    stop(){ring.visible = treeRings.visible = false;if (grid) grid.visible=false},
    dispose(){
      parent.remove(root);
      if (grid) {grid.geometry.dispose();grid.material.dispose()}
      for (const resource of [coin,tablet,detail,gold,relief,stone,engraving,ringGeometry,light,treeRings,bandMaterial]) resource.dispose();
    },
  };
}
