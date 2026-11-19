export function validateLocations(locations, catalog) {
  const ids = new Set();
  for (const location of locations) {
    const fail = message => { throw new Error(`Location ${location.id}: ${message}`); };
    if (typeof location.id !== 'string' || !/^island\.[a-z0-9-]+$/.test(location.id) || ids.has(location.id)) fail('invalid or duplicate ID');
    ids.add(location.id);
    if (typeof location.name !== 'string' || !location.name.trim() || !Number.isFinite(location.center)) fail('invalid name or center');
    for (const field of ['title', 'action', 'goal', 'tip']) {
      if (typeof location.quest?.[field] !== 'string' || !location.quest[field].trim()) fail(`missing quest ${field}`);
    }
    if (!Array.isArray(location.trees)) fail('missing tree placements');
    for (const tree of location.trees) {
      if (!catalog.has(tree.objectId) || catalog.get(tree.objectId).type !== 'tree') fail(`unknown tree ${tree.objectId}`);
      if (![tree.x, tree.z, tree.scale].every(Number.isFinite) || tree.scale <= 0
        || (tree.mirror !== undefined && typeof tree.mirror !== 'boolean')) fail('invalid tree placement');
    }
  }
}
