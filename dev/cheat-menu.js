import { catalog } from '../catalog/index.js';

export function installCheatMenu({locations, currentIsland, getScanner, travel, account, bag, canOpen, pause, reset}) {
  const dialog = document.createElement('dialog');
  dialog.id = 'cheat-menu';
  dialog.className = 'panel-dialog';
  dialog.setAttribute('aria-labelledby','cheat-title');
  dialog.innerHTML = `
    <style>
      #cheat-menu{width:min(420px,calc(100vw - 28px));max-height:90dvh;overflow:auto;color:#304d41}
      #cheat-menu h3{margin:20px 0 8px;font-size:14px}
      #cheat-menu .cheat-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
      #cheat-menu .cheat-actions button,#cheat-reset{padding:10px;border-radius:8px;background:#e1eadb;text-align:left}
      #cheat-menu button:disabled{color:#658063;background:#eef1e9}
      #cheat-menu #cheat-reset{margin-top:18px;background:#f1e1d8;color:#724631}
      #cheat-menu output{display:block;font-size:13px;margin-top:8px}
    </style>
    <div class="paths-heading"><h2 id="cheat-title">Чит-меню</h2><button type="button" aria-label="Закрыть чит-меню">×</button></div>
    <h3>Перейти на остров</h3><div class="cheat-actions" data-islands></div>
    <h3>Награды</h3><div class="cheat-actions"><button data-coins>+100 монет</button><button data-keys>Выдать все ключи</button></div>
    <output data-balance></output>
    <h3>Сканирование</h3><div class="cheat-actions"><button data-scan></button></div>
    <button id="cheat-reset">Сбросить прогресс и монеты</button>
    <output aria-live="polite" data-status></output>`;
  document.body.append(dialog);
  const status = dialog.querySelector('[data-status]');
  const balance = dialog.querySelector('[data-balance]');
  const scanButton = dialog.querySelector('[data-scan]');
  const resetButton = dialog.querySelector('#cheat-reset');
  const normalLabel = resetButton.textContent;
  let resetPending = false;
  function clearConfirmation() {
    resetPending = false;
    resetButton.textContent = normalLabel;
    status.textContent = '';
  }
  const routes = locations.map((location, index) => {
    const button = document.createElement('button');
    button.textContent = location.name;
    button.onclick = () => { dialog.close(); travel(index); };
    dialog.querySelector('[data-islands]').append(button);
    return button;
  });
  function refresh() {
    const scanner = getScanner();
    scanButton.disabled = !scanner;
    scanButton.textContent = !scanner ? 'Сканирование недоступно' :
      scanner.showingPrizes ? 'Скрыть призы' : 'Показать призы';
    balance.textContent = 'Монеты · ' + account.coins.toLocaleString('ru-RU');
    routes.forEach((button,index) => { button.disabled = index === currentIsland(); });
  }
  scanButton.onclick = async () => {
    clearConfirmation();
    const scanner = getScanner();
    if (!scanner) return;
    scanButton.disabled = true;
    try {
      await scanner.setShowingPrizes(!scanner.showingPrizes);
      if (scanner.showingPrizes) status.textContent = 'Чтобы обнаружить отмеченный приз, просканируй клетку или дерево.';
    } finally {
      refresh();
    }
  };
  dialog.querySelector('.paths-heading button').onclick = () => dialog.close();
  dialog.querySelector('[data-coins]').onclick = () => {
    clearConfirmation();
    account.coins += 100;
    refresh();
  };
  dialog.querySelector('[data-keys]').onclick = () => {
    clearConfirmation();
    const owned = new Set(bag.items().map(item => item.id));
    const missing = catalog.list('key').filter(key => !owned.has(key.id));
    const added = missing.filter(key => bag.add({id:key.id, quantity:1})).length;
    status.textContent = added < missing.length ? 'В рюкзаке не хватило места для всех ключей.'
      : added ? 'Ключи добавлены в рюкзак.' : 'Все ключи уже в рюкзаке.';
  };
  resetButton.onclick = async event => {
    if (event.detail > 1) return;
    if (!resetPending) {
      resetPending = true;
      resetButton.textContent = 'Подтвердить сброс';
      status.textContent = 'Прогресс всех островов и монеты будут обнулены. Ключи и снаряжение сохранятся.';
      return;
    }
    clearConfirmation();
    await reset();
    refresh();
    status.textContent = 'Прогресс и монеты обнулены.';
  };

  const held = new Set();
  window.addEventListener('keydown', event => {
    if (!['KeyQ','KeyA'].includes(event.code) || event.repeat || event.isComposing ||
        event.altKey || event.ctrlKey || event.metaKey || !canOpen() ||
        event.target.closest?.('input,select,textarea,[contenteditable]')) return;
    held.add(event.code);
    if (held.size !== 2) return;
    held.clear();
    event.preventDefault();
    event.stopImmediatePropagation();
    pause();
    clearConfirmation();
    refresh();
    dialog.showModal();
  }, true);
  window.addEventListener('keyup', event => held.delete(event.code), true);
  window.addEventListener('blur', () => held.clear());
  return dialog;
}
