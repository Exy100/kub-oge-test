// Current Moscow civil time is UTC+03:00, independent of the device time zone.
export const moscowDay = (now = Date.now()) => Math.floor((now + 3 * 3600000) / 86400000);
export const SCAN_KEY = 'kub.explorer.scan.v1';
export const EXCEL_REWARDS = Object.freeze({basic:20, medium:40, advanced:70});
const levels = Object.keys(EXCEL_REWARDS);
const emptySave = () => ({day:null, locations:{}, coins:0});

export function scanCell(save, {location, cells, key, day}, random = Math.random) {
  if (save.day !== day || !cells.has(key)) return null;
  let island = save.locations[location];
  if (!island) {
    const quota = () => 1 + Math.floor(random() * 3);
    island = save.locations[location] = {coinsLeft:quota(), tabletsLeft:quota(), cells:{}};
  }
  if (Object.hasOwn(island.cells, key)) return 'repeat';
  const remaining = cells.size - Object.keys(island.cells).length;
  const draw = Math.floor(random() * remaining);
  let entry = {kind:'empty'};
  if (draw < island.coinsLeft) {
    island.coinsLeft--;
    entry = {kind:'coin'};
  } else if (draw < island.coinsLeft + island.tabletsLeft) {
    island.tabletsLeft--;
    entry = {kind:'tablet', level:levels[Math.floor(random() * levels.length)]};
  }
  island.cells[key] = entry;
  return entry.kind;
}

export function claimFinding(save, {day, location, key}, kind, correct = false) {
  const entry = save.locations[location]?.cells[key];
  if (save.day !== day || !entry || entry.kind !== kind || entry.claimed) return 0;
  let reward = 1;
  if (kind === 'tablet') {
    if (correct !== true) return 0;
    reward = EXCEL_REWARDS[entry.level ?? 'basic'];
    if (!Number.isInteger(reward)) return 0;
  } else if (kind !== 'coin') return 0;
  entry.claimed = true;
  save.coins += reward;
  return reward;
}

// Read, change and save the balance and cell together, including across tabs on HTTPS/localhost.
export function createScanStore(onChange) {
  let state = emptySave(), storage;
  try { storage = window.localStorage; } catch {}
  function read() {
    if (storage) {
      try { state = JSON.parse(storage.getItem(SCAN_KEY)) ?? emptySave(); } catch { /* Keep session progress. */ }
    }
    if (state.day !== moscowDay()) state = {...state, day:moscowDay(), locations:{}};
    return state;
  }
  read();
  function change(action) {
    const write = () => {
      const result = action(read());
      try { storage?.setItem(SCAN_KEY, JSON.stringify(state)); } catch { storage = null; }
      onChange(state);
      return result;
    };
    return navigator.locks ? navigator.locks.request(SCAN_KEY, write) : Promise.resolve(write());
  }
  window.addEventListener('storage', event => {
    if (event.key === SCAN_KEY || event.key === null) onChange(read());
  });
  return {get state(){return state}, change, refresh(){onChange(read())}};
}
