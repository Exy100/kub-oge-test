import { orangeBug, greenBug } from './bugs.js';
import { pcParts } from './pc-parts.js';
import { keys } from './keys.js';
import { resources } from './resources.js';
import { tools } from './tools.js?v=2';
import { trees } from './trees.js';
import { createCatalog } from './registry.js?v=2';

export const catalog = createCatalog([...resources, ...pcParts, ...tools, ...keys, ...trees, orangeBug, greenBug, {
  id:'reward.weapon-kit', type:'reward', kind:'reward', category:'Награда', glyph:'▣',
  name:'Оружейный набор', description:'Закрытый оружейный набор из лаборатории процессора.',
}]);
export const BUILD_MATERIALS = Object.freeze(catalog.list('resource')
  .filter(item => item.materialSlot !== undefined).sort((a,b) => a.materialSlot - b.materialSlot));

// A bag stack is an instance, not a mutable copy of the object definition.
export function itemStack(id, quantity) {
  const definition = catalog.get(id);
  if (!definition.kind) throw new Error(`Object is not an inventory item: ${id}`);
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`Invalid quantity for ${id}`);
  const { name, description, kind, category, glyph } = definition;
  return { id, name, description, kind, category, glyph, quantity };
}
