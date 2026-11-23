import { BUILD_MATERIALS } from './catalog/index.js';
import { LOCATIONS } from './locations/index.js';

export const MATERIAL_NAMES = Object.freeze(BUILD_MATERIALS.map(item => item.name));
const ARCH = [[-1,.55,0],[-1,1.55,0],[-1,2.55,0],[0,2.55,0],[1,2.55,0],[1,1.55,0],[1,.55,0]];
export function createStage(index) {
  const location = LOCATIONS[index];
  if (!location) throw new Error(`Unknown stage: ${index}`);
  const center = location.center;
  const arches = location.id === 'island.dreamers' ? [{x:0,z:-1,material:0}] : location.id === 'island.three-arches' ? [
    {x:36,z:-2,material:0}, {x:40,z:-2,material:2}, {x:44,z:-2,material:3},
  ] : [];
  return { index, locationId: location.id, center, arches,
    targets: arches.flatMap(arch => ARCH.map(([x,y,z]) => ({x:arch.x+x,y,z:arch.z+z,material:arch.material}))),
    ...(location.id === 'island.three-arches' ? {signal:0,sentWood:false} : {}),
    inventory: BUILD_MATERIALS.map(() => 0), built: new Set(), unlocked: false,
  };
}
export function placeTarget(stage, target, material) {
  const slot = stage.targets[target];
  if (!slot || stage.built.has(target) || slot.material !== material || stage.inventory[material] <= 0) return false;
  stage.inventory[material]--; stage.built.add(target);
  if (stage.built.size === stage.targets.length && stage.sentWood !== false) stage.unlocked = true;
  return true;
}
export function removeTarget(stage, target) {
  if (!stage.built.delete(target)) return false;
  stage.inventory[stage.targets[target].material]++;
  return true;
}
export function isLimited(stage, material) {
  return material === 0 || (stage.locationId === 'island.three-arches' && (material === 2 || material === 3));
}
