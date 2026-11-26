import { itemStack } from './catalog/index.js?v=3';

import { STAFF_ID, WEAPON_KIT } from './catalog/pulse-staff.js';

export const BAG_COLUMNS = 5;
export const BAG_ROWS = 4;

const commonSlots = [
  ['head', 'Головной убор', 'head'], ['jacket', 'Куртка', 'jacket'],
  ['leftWrist', 'Левый браслет', 'bracelet'], ['rightWrist', 'Правый браслет', 'bracelet'],
  ['boots', 'Ботинки', 'boots'], ['talisman', 'Талисман', 'talisman'],
];

export function equipmentSlots(mode) {
  return [...commonSlots, mode === 'battle' ? ['weapon', 'Оружие', 'weapon'] : ['tool', 'Орудие', 'tool']];
}

export function fitsEquipment(item,kind) {
  return item.kind===kind || (item.id==='wand' && kind==='weapon');
}

// Resources are read from the islands and forge so spending or resetting them is reflected immediately.
export function createPlayerInventory(readResources, describeItem = itemStack) {
  const capacity = BAG_ROWS * BAG_COLUMNS;
  const possessions = new Map();
  const loadouts = { build: { tool: 'wand' }, battle: {} };
  const describe = item => describeItem(item.id, item.quantity);
  const items = () => [...possessions.values(), ...readResources().filter(item => item.quantity > 0)].map(describe);
  function equipmentItems() {
    const owned = items();
    if (owned.some(item => item.id === WEAPON_KIT)) owned.push(describeItem(STAFF_ID, 1));
    return owned;
  }
  const layoutKey = 'kub.bag-layout.v1';
  const layout = Array(capacity).fill(null);
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(layoutKey) ?? 'null');
    if (Array.isArray(saved)) saved.slice(0, capacity).forEach((id, index) => {
      if (typeof id === 'string' && !layout.includes(id)) layout[index] = id;
    });
  } catch { /* A blocked store or an old save still allows play. */ }

  function saveLayout() {
    try { globalThis.localStorage?.setItem(layoutKey, JSON.stringify(layout)); }
    catch { /* The current session keeps its layout. */ }
  }
  function cells() {
    const owned = new Map(items().map(item => [item.id, item]));
    let changed = false;
    for (const id of owned.keys()) {
      if (layout.includes(id)) continue;
      let free = layout.indexOf(null);
      if (free === -1) free = layout.findIndex(previous => !owned.has(previous));
      if (free === -1) break;
      layout[free] = id;
      changed = true;
    }
    if (changed) saveLayout();
    return layout.map(id => owned.get(id) ?? null);
  }
  function move(id, target) {
    if (!Number.isInteger(target) || target < 0 || target >= capacity) return false;
    const from = cells().findIndex(item => item?.id === id);
    if (from < 0) return false;
    [layout[from], layout[target]] = [layout[target], layout[from]];
    saveLayout();
    return true;
  }
  const canStore = id => {
    try { describeItem(id, 0); } catch { return false; }
    const current = items();
    return current.some(item => item.id === id) || current.length < capacity;
  };
  function add(item) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || !canStore(item.id)) return false;
    const stack = possessions.get(item.id);
    if (stack) stack.quantity += item.quantity;
    else possessions.set(item.id, { id: item.id, quantity: item.quantity });
    return true;
  }
  function equip(mode, slot, id) {
    const spec = equipmentSlots(mode).find(([key]) => key === slot);
    if (!spec || !loadouts[mode]) return false;
    if (id === null) { delete loadouts[mode][slot]; return true; }
    const item = equipmentItems().find(entry=>entry.id===id);
    const used = Object.entries(loadouts[mode]).filter(([key,value]) => key !== slot && value === id).length;
    if (!item || !fitsEquipment(item,spec[2]) || used >= item.quantity) return false;
    loadouts[mode][slot] = id;
    return true;
  }
  add({ id: 'wand', quantity: 1 });
  return { capacity, items, equipmentItems, cells, move, canStore, add, loadouts, equip };
}
