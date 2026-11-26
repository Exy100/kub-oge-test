// Pure data: importing the catalog never creates a scene or touches the DOM.
export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const color = value => Number.isInteger(value) && value >= 0 && value <= 0xffffff;

export function createCatalog(definitions) {
  const byId = new Map();
  const slots = new Set();
  for (const definition of definitions) {
    const { id, type, name, description } = definition;
    const fail = message => { throw new Error(`Catalog ${id}: ${message}`); };
    if (!nonempty(id) || !/^[a-z][a-z0-9.-]*$/.test(id)) fail('invalid ID');
    if (byId.has(id)) fail('duplicate ID');
    if (!['tree', 'resource', 'tool', 'key', 'reward', 'enemy', 'weapon'].includes(type)) fail('unknown type');
    if (!nonempty(name) || !nonempty(description)) fail('name and description are required');
    if (type === 'tree') {
      const { palette, parts } = definition;
      if (!Array.isArray(palette) || !palette.length || !palette.every(color)) fail('invalid palette');
      if (!Array.isArray(parts) || !parts.length) fail('missing tree parts');
      for (const part of parts) {
        if (!Array.isArray(part) || part.length !== 9 || !part.slice(0,6).every(Number.isFinite)
          || !part.slice(3,6).every(n => n > 0) || !Number.isInteger(part[6])
          || part[6] < 0 || part[6] >= palette.length || typeof part[7] !== 'boolean' || !nonempty(part[8])) fail('invalid tree part');
      }
    } else if (type === 'enemy') {
      if (!Number.isInteger(definition.maxHp) || definition.maxHp <= 0) fail('invalid maximum health');
    } else {
      if (definition.kind !== type || !nonempty(definition.category) || !nonempty(definition.glyph)) fail('invalid item metadata');
    }
    if (definition.materialSlot !== undefined) {
      const slot = definition.materialSlot;
      if (type !== 'resource' || !Number.isInteger(slot) || slot < 0 || slots.has(slot)) fail('invalid or duplicate material slot');
      if (!color(definition.color)) fail('invalid material color');
      slots.add(slot);
    }
    byId.set(id, definition);
  }
  for (let slot = 0; slot < slots.size; slot++) {
    if (!slots.has(slot)) throw new Error(`Catalog: missing material slot ${slot}`);
  }
  const all = deepFreeze([...byId.values()]);
  return Object.freeze({
    get(id) {
      if (!byId.has(id)) throw new Error(`Unknown object ID: ${id}`);
      return byId.get(id);
    },
    has: id => byId.has(id),
    list: type => type === undefined ? all : Object.freeze(all.filter(item => item.type === type)),
  });
}
