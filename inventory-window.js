import { equipmentSlots } from './player-inventory.js?v=2';

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}

export function createInventoryWindows({ bag, playerAccount, open, mode, setMode }) {
  function windowFor(id, title) {
    const dialog = element('dialog', 'panel-dialog kit-window');
    dialog.id = id;
    const heading = element('div', 'paths-heading');
    const name = element('h2', '', title);
    name.id = id + '-title';
    dialog.setAttribute('aria-labelledby', name.id);
    const close = element('button', '', '×');
    close.setAttribute('aria-label', 'Закрыть');
    close.onclick = () => dialog.close();
    heading.append(name, close);
    dialog.append(heading);
    document.body.append(dialog);
    return dialog;
  }
  const inventory = windowFor('inventory-dialog', 'Инвентарь');
  const equipment = windowFor('weapons-dialog', 'Снаряжение');
  const summary = element('div', 'bag-summary');
  const grid = element('div', 'bag-grid');
  grid.setAttribute('role', 'list');
  inventory.append(summary, grid);
  function renderBag() {
    const items = bag.items();
    summary.replaceChildren(element('span', '', 'Занято ' + items.length + ' из ' + bag.capacity),
      element('strong', 'coin-balance', 'Монеты · ' + playerAccount.coins));
    grid.replaceChildren();
    for (let index = 0; index < bag.capacity; index++) {
      const item = items[index];
      const cell = element('div', 'bag-cell');
      cell.setAttribute('role', 'listitem');
      if (item) {
        cell.classList.add('occupied');
        cell.title = item.category + ' · ' + item.name + (item.description ? '\n' + item.description : '');
        cell.append(element('span', 'item-glyph', item.glyph), element('span', 'item-name', item.name),
          element('small', 'item-count', '×' + item.quantity));
      } else cell.setAttribute('aria-label', 'Свободная ячейка');
      grid.append(cell);
    }
  }
  const modes = element('div', 'kit-modes');
  const slots = element('div', 'kit-slots');
  const choices = element('div', 'kit-choices');
  equipment.append(modes, slots, choices);
  const tabs = {};
  for (const [key, title] of [['build','Исследование'], ['battle','Бой']]) {
    const tab = element('button', '', title);
    tab.onclick = () => { setMode(key); renderKit(); };
    modes.append(tab);
    tabs[key] = tab;
  }
  function renderKit(selected = null) {
    const current = mode();
    for (const key of Object.keys(tabs)) tabs[key].setAttribute('aria-pressed', String(key === current));
    slots.replaceChildren();
    choices.replaceChildren();
    choices.hidden = !selected;
    const owned = bag.items();
    for (const [slot, title, kind] of equipmentSlots(current)) {
      const equipped = bag.loadouts[current][slot];
      const item = owned.find(i => i.id === equipped);
      const button = element('button', 'kit-slot');
      button.append(element('small', '', title), element('strong', '', item?.name ?? 'Пусто'));
      button.setAttribute('aria-pressed', String(selected === slot));
      button.onclick = () => { renderKit(selected === slot ? null : slot); slots.querySelector('[data-slot="'+slot+'"]').focus(); };
      button.dataset.slot = slot;
      if (item?.description) button.title = item.description;
      slots.append(button);
      if (slot !== selected) continue;
      const options = owned.filter(i => i.kind === kind);
      choices.append(element('strong', '', title));
      const apply = id => {
        if (bag.equip(current, slot, id)) { renderKit(); slots.querySelector('[data-slot="'+slot+'"]').focus(); }
      };
      for (const option of options) {
        if (option.id === equipped) continue;
        const select = element('button', '', 'Надеть · ' + option.name);
        const used = Object.values(bag.loadouts[current]).filter(id => id === option.id).length;
        select.disabled = used >= option.quantity;
        if (option.description) select.title = option.description;
        select.onclick = () => apply(option.id);
        choices.append(select);
      }
      if (equipped) {
        const remove = element('button', '', 'Снять · ' + item.name);
        remove.onclick = () => apply(null);
        choices.append(remove);
      } else if (!options.length) choices.append(element('span', '', 'В инвентаре нет подходящих предметов.'));
    }
  }
  function toggle(which) {
    const target = which === 'bag' ? inventory : equipment;
    if (target.open) { target.close(); return; }
    const other = target === inventory ? equipment : inventory;
    if (other.open) other.close();
    if (target === inventory) renderBag(); else renderKit();
    open(target);
  }
  return { toggle, isOpen: () => inventory.open || equipment.open };
}
