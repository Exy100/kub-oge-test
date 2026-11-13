export function createForgeState() {
  return { bits: 0, slots: Array(8).fill(false), bytes: 0, crafted: 0, cells: Array(4).fill(false), unlocked: false };
}
export function toggleBit(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= 8 || state.crafted >= 4) return false;
  if (state.slots[index]) { state.slots[index] = false; state.bits++; return true; }
  if (state.bits <= 0) return false;
  state.bits--; state.slots[index] = true; return true;
}
export function craftByte(state) {
  if (state.crafted >= 4 || !state.slots.every(Boolean)) return false;
  state.slots.fill(false); state.bytes++; state.crafted++; return true;
}
export function insertByte(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= 4 || state.cells[index] || state.bytes <= 0) return false;
  state.bytes--; state.cells[index] = true; state.unlocked = state.cells.every(Boolean); return true;
}
export function bitValue(second, seed = 0) { return (Math.floor(second) + seed) % 2; }
