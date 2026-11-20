import * as THREE from '../vendor/three.module.js';
import { catalog } from '../catalog/index.js';

export function createTreeRenderer(box) {
  const materials = new Map();
  return function renderTree({ objectId, x, z, scale = 1, mirror = false }) {
    const definition = catalog.get(objectId);
    if (definition.type !== 'tree') throw new Error(`Expected tree: ${objectId}`);
    if (!materials.has(objectId)) materials.set(objectId, definition.palette
      .map(color => new THREE.MeshStandardMaterial({ color, roughness: 1 })));
    const palette = materials.get(objectId);
    return definition.parts.map(([dx,y,dz,w,h,d,material,collide,name]) => {
      const mesh = box(x + dx * scale * (mirror ? -1 : 1), y * scale, z + dz * scale,
        w * scale, h * scale, d * scale, palette[material], collide);
      mesh.name = name;
      mesh.userData.objectId = objectId;
      mesh.userData.treeKey = 'tree:' + x + ',' + z;
      return mesh;
    });
  };
}
