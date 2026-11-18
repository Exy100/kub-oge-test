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
export function createPlayerInventory(readResources) {
  const capacity = BAG_ROWS * BAG_COLUMNS;
  const possessions = new Map();
  const loadouts = { build: { tool: 'wand' }, battle: {} };
  const items = () => [...possessions.values(), ...readResources().filter(item => item.quantity > 0)];
  const canStore = id => {
    const current = items();
    return current.some(item => item.id === id) || current.length < capacity;
  };
  function add(item) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || !canStore(item.id)) return false;
    const stack = possessions.get(item.id);
    if (stack) stack.quantity += item.quantity;
    else possessions.set(item.id, { ...item });
    return true;
  }
  function equip(mode, slot, id) {
    const spec = equipmentSlots(mode).find(([key]) => key === slot);
    if (!spec || !loadouts[mode]) return false;
    if (id === null) { delete loadouts[mode][slot]; return true; }
    const item = possessions.get(id);
    const used = Object.entries(loadouts[mode]).filter(([key,value]) => key !== slot && value === id).length;
    if (!item || item.kind !== spec[2] || used >= item.quantity) return false;
    loadouts[mode][slot] = id;
    return true;
  }
  add({ id: 'wand', name: 'Жезл сбора', kind: 'tool', category: 'Орудие', glyph: '⚒', quantity: 1 });
  return { capacity, items, canStore, add, loadouts, equip };
}
