import { equipmentSlots } from './player-inventory.js?v=4';

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
  const wallet = element('div', 'coin-balance');
  const coin = element('img', 'balance-coin');
  coin.alt = '';
  coin.src = new URL('./assets/inventory-coin.webp', import.meta.url).href;
  const amount = element('strong', 'balance-amount');
  const balanceText = element('div', 'balance-text');
  balanceText.append(element('span', '', 'Монеты'), amount);
  wallet.append(coin, balanceText);
  const occupancy = element('span', 'bag-occupancy');
  summary.append(wallet, occupancy);
  const grid = element('div', 'bag-grid');
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', 'Ячейки инвентаря');
  const details = element('section', 'bag-details');
  inventory.append(summary, grid, details);
  let selected = null, choosingCell = false;
  function renderBag() {
    const cells = bag.cells();
    const item = cells.find(entry => entry && entry.id === selected);
    if (!item) { selected = null; choosingCell = false; }
    const equippedTool = bag.loadouts.build.tool;
    const exploring = mode() === 'build';
    amount.textContent = playerAccount.coins.toLocaleString('ru-RU');
    occupancy.textContent = 'Занято ' + cells.filter(Boolean).length + ' из ' + bag.capacity;
    grid.replaceChildren();
    cells.forEach((entry, index) => {
      const cell = element('button', 'bag-cell');
      cell.type = 'button';
      cell.dataset.index = index;
      if (entry) {
        cell.dataset.item = entry.id;
        cell.classList.add('occupied');
        cell.setAttribute('aria-pressed', String(entry.id === selected));
        if (entry.id === 'wand' || entry.id === 'wood-axe') {
          const icon = element('img', 'wand-icon');
          icon.src = entry.id === 'wood-axe' ? './assets/inventory-axe.webp' : './assets/inventory-wand.webp';
          icon.alt = '';
          icon.draggable = false;
          cell.append(icon);
        } else cell.append(element('span', 'item-glyph', entry.glyph));
        cell.append(element('span', 'item-name', entry.name), element('small', 'item-count', '×' + entry.quantity));
        if (entry.kind === 'tool' && equippedTool === entry.id) {
          cell.append(element('small', 'bag-equipped', exploring ? 'В руке' : 'Исследование'));
        }
      } else {
        cell.tabIndex = choosingCell ? 0 : -1;
        cell.setAttribute('aria-label', 'Свободная ячейка ' + (index+1));
      }
      grid.append(cell);
    });
    details.replaceChildren();
    details.hidden = !item;
    if (!item) return;
    details.append(element('strong', '', item.name), element('p', '', item.description || item.category));
    const actions = element('div', 'bag-actions');
    if (item.kind === 'tool' && !choosingCell) {
      const equipped = equippedTool === item.id;
      const equip = element('button', '', equipped ? 'Снять' : exploring ? 'Взять в руку' : 'Назначить для исследования');
      equip.onclick = () => {
        bag.equip('build', 'tool', equipped ? null : item.id);
        renderBag();
        details.querySelector('button').focus();
      };
      actions.append(equip);
    }
    const move = element('button', '', choosingCell ? 'Отменить перенос' : 'Переместить');
    move.onclick = () => {
      choosingCell = !choosingCell;
      renderBag();
      grid.querySelector('[aria-pressed="true"]').focus();
    };
    if (choosingCell) details.append(element('p', '', 'Выбери ячейку для предмета.'));
    actions.append(move);
    details.append(actions);
  }
  function selectCell(index) {
    const cell = grid.children[index];
    if (choosingCell) bag.move(selected, index);
    else selected = cell.dataset.item ?? null;
    choosingCell = false;
    renderBag();
    grid.children[index].focus({preventScroll:true});
  }
  let drag = null, suppressClick = false;
  function clearDrag() {
    if (!drag) return;
    drag.target?.classList.remove('bag-drop-target');
    drag.source.classList.remove('bag-dragging');
    drag.ghost?.remove();
    drag = null;
  }
  grid.onclick = event => {
    const cell = event.target.closest('.bag-cell');
    if (cell && !(event.detail && suppressClick)) selectCell(Number(cell.dataset.index));
  };
  grid.onpointerdown = event => {
    const source = event.target.closest('.bag-cell');
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    if (!source?.dataset.item || choosingCell) return;
    drag = {source, pointer:event.pointerId, x:event.clientX, y:event.clientY};
    source.setPointerCapture(event.pointerId);
  };
  function dropTarget(event) {
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('.bag-cell');
    return cell?.parentElement === grid ? cell : null;
  }
  grid.onpointermove = event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    if (!drag.ghost) {
      if (Math.hypot(event.clientX-drag.x, event.clientY-drag.y) < 6) return;
      suppressClick = true;
      drag.ghost = element('div', 'bag-drag-ghost', drag.source.querySelector('.item-name').textContent);
      drag.ghost.setAttribute('aria-hidden', 'true');
      inventory.append(drag.ghost);
      drag.source.classList.add('bag-dragging');
    }
    drag.ghost.style.left = event.clientX + 'px';
    drag.ghost.style.top = event.clientY + 'px';
    drag.target?.classList.remove('bag-drop-target');
    drag.target = dropTarget(event);
    drag.target?.classList.add('bag-drop-target');
  };
  grid.onpointerup = event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    const target = drag.ghost && dropTarget(event);
    const id = drag.source.dataset.item;
    clearDrag();
    if (target && bag.move(id, Number(target.dataset.index))) {
      selected = id;
      renderBag();
      grid.querySelector('[aria-pressed="true"]').focus({preventScroll:true});
    }
  };
  grid.onlostpointercapture = grid.onpointercancel = event => {
    if (drag?.pointer === event.pointerId) clearDrag();
  };
  inventory.addEventListener('cancel', event => {
    if (!drag && !choosingCell) return;
    event.preventDefault();
    clearDrag();
    choosingCell = false;
    renderBag();
    grid.querySelector('[aria-pressed="true"]')?.focus();
  });
  inventory.addEventListener('close', () => { clearDrag(); choosingCell = false; selected = null; });
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
