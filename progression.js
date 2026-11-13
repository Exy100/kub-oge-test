export const MATERIAL_NAMES = ['Песчаник', 'Трава', 'Дерево', 'Камень', 'Розовый куб', 'Голубой куб'];
const ARCH = [[-1,.55,0],[-1,1.55,0],[-1,2.55,0],[0,2.55,0],[1,2.55,0],[1,1.55,0],[1,.55,0]];
export function createStage(index) {
  const center = index * 40;
  const arches = index > 1 ? [] : index === 0 ? [{x:0,z:-1,material:0}] : [
    {x:36,z:-2,material:0}, {x:40,z:-2,material:2}, {x:44,z:-2,material:3},
  ];
  return { index, center, arches,
    targets: arches.flatMap(arch => ARCH.map(([x,y,z]) => ({x:arch.x+x,y,z:arch.z+z,material:arch.material}))),
    inventory: [0,0,0,0,0,0], built: new Set(), unlocked: false,
  };
}
export function placeTarget(stage, target, material) {
  const slot = stage.targets[target];
  if (!slot || stage.built.has(target) || slot.material !== material || stage.inventory[material] <= 0) return false;
  stage.inventory[material]--; stage.built.add(target);
  if (stage.built.size === stage.targets.length) stage.unlocked = true;
  return true;
}
export function removeTarget(stage, target) {
  if (!stage.built.delete(target)) return false;
  stage.inventory[stage.targets[target].material]++;
  return true;
}
export function isLimited(stage, material) {
  return material === 0 || (stage.index === 1 && (material === 2 || material === 3));
}
