import { itemStack } from './catalog/index.js';

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

// Resources are read from the islands and forge so spending or resetting them is reflected immediately.
export function createPlayerInventory(readResources, describeItem = itemStack) {
  const capacity = BAG_ROWS * BAG_COLUMNS;
  const possessions = new Map();
  const loadouts = { build: { tool: 'wand' }, battle: {} };
  const describe = item => describeItem(item.id, item.quantity);
  const items = () => [...possessions.values(), ...readResources().filter(item => item.quantity > 0)].map(describe);
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
    const stored = possessions.get(id);
    const item = stored && describe(stored);
    const used = Object.entries(loadouts[mode]).filter(([key,value]) => key !== slot && value === id).length;
    if (!item || item.kind !== spec[2] || used >= item.quantity) return false;
    loadouts[mode][slot] = id;
    return true;
  }
  add({ id: 'wand', quantity: 1 });
  return { capacity, items, canStore, add, loadouts, equip };
}
