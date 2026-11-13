import * as THREE from './vendor/three.module.js';

export const PATHS = [
  { id: 'oge', title: 'ОГЭ: Информатика', short: 'ОГЭ', color: 0x69b9d0, x: -5, z: 0,
    description: 'Разбирайся в информации, логике и алгоритмах через задачи внутри блочного мира.',
    topics: ['Кодирование информации', 'Логика и графы', 'Алгоритмы и подготовка к ОГЭ'] },
  { id: 'code', title: 'Основы программирования', short: 'КОД', color: 0xbea0ed, x: 5, z: 0,
    description: 'Учись управлять роботом: от простых команд до собственных программ на Python.',
    topics: ['Последовательности команд', 'Циклы и условия', 'Переменные, функции и Python'] },
];
const STORAGE_KEY = 'kub.learning-path.v1';

export function createLearningHub({ scene, box, onOpen, onChoose }) {
  const dialog = document.querySelector('#paths-dialog');
  const cards = document.querySelector('#path-cards');
  const prompt = document.querySelector('#portal-prompt');
  const badge = document.querySelector('#chosen-path');
  const materials = [];
  let selected = null, nearby = null;
  try { selected = localStorage.getItem(STORAGE_KEY); } catch { /* Storage can be disabled. */ }
  if (!PATHS.some(path => path.id === selected)) selected = null;

  for (const path of PATHS) {
    // Solid jambs and lintel; the glowing opening remains walkable.
    for (const side of [-1, 1]) {
      for (let level = 0; level < 4; level++) {
        box(path.x + side * 1.15, .4 + level * .8, path.z, .65, .8, .7, level % 2 ? 0x8e9b96 : 0xa9b4a7, true);
      }
      box(path.x + side * 1.15, 3.38, path.z, .85, .36, .9, path.color, true);
    }
    box(path.x, 3.15, path.z, 1.65, .5, .7, 0xa9b4a7, true);
    const material = new THREE.MeshBasicMaterial({ color: path.color, transparent: true, opacity: .26, side: THREE.DoubleSide, depthWrite: false });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 2.9), material);
    glow.position.set(path.x, 1.45, path.z);
    scene.add(glow);
    materials.push(material);
    for (let i = 0; i < 3; i++) box(path.x, .008, path.z + 1 + i * .85, 1.4, .035, .55, path.color);

    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#253c36'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#' + path.color.toString(16); ctx.fillRect(0, 0, 12, canvas.height);
    ctx.textAlign = 'center'; ctx.fillStyle = '#f7faef'; ctx.font = 'bold 38px Arial';
    ctx.fillText(path.title, 384, 72);
    ctx.font = '24px Arial'; ctx.fillStyle = '#c8d6cd'; ctx.fillText('ВЫБЕРИ СВОЙ ПУТЬ', 384, 119);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
    sign.position.set(path.x, 4.1, path.z); sign.scale.set(3.8, .79, 1);scene.add(sign);

    const card = document.createElement('article');
    card.className = `path-card path-${path.id}`;
    card.dataset.path = path.id;
    const icon = document.createElement('div'); icon.className = 'path-icon'; icon.textContent = path.short;
    const title = document.createElement('h3');title.textContent = path.title;
    const description = document.createElement('p');description.textContent = path.description;
    const topics = document.createElement('ul');
    path.topics.forEach(topic => { const li = document.createElement('li');li.textContent = topic;topics.append(li); });
    const button = document.createElement('button');button.type = 'button';button.dataset.choose = path.id;
    button.addEventListener('click', () => {
      selected = path.id;
      let saved = true;
      try { localStorage.setItem(STORAGE_KEY, selected); } catch { saved = false; }
      refresh(); dialog.close();onChoose(path, saved);
    });
    card.append(icon, title, description, topics, button);cards.append(card);
  }
  function refresh() {
    const chosen = PATHS.find(path => path.id === selected);
    badge.textContent = chosen ? `Твой путь: ${chosen.title}` : 'Два портала · выбери свой путь';
    for (const path of PATHS) {
      const button = cards.querySelector(`[data-choose="${path.id}"]`);
      button.textContent = selected === path.id ? 'Выбрано · вернуться на остров' : 'Выбрать направление →';
      cards.querySelector(`[data-path="${path.id}"]`).classList.toggle('is-selected', selected === path.id);
    }
  }
  function open(path = null) {
    if (dialog.open) return;
    onOpen();
    cards.querySelectorAll('.path-card').forEach(card => card.classList.toggle('is-nearby', card.dataset.path === path?.id));
    dialog.showModal();
    if (path) cards.querySelector(`[data-choose="${path.id}"]`).focus();
  }
  document.querySelector('#paths-button').onclick = () => open();
  document.querySelector('#paths-close').onclick = () => dialog.close();
  prompt.onclick = () => { if (nearby) open(nearby); };
  dialog.addEventListener('click', event => { if (event.target === dialog && event.clientX !== 0) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  } });
  refresh();
  return {
    isOpen: () => dialog.open,
    openNearby: () => { if (nearby) open(nearby); },
    contains: (x,z) => PATHS.some(path => Math.abs(x-path.x)<1.9 && Math.abs(z-path.z)<1.2),
    update(position, time, active) {
      materials.forEach((material, i) => material.opacity = .25 + Math.sin(time * 1.8 + i) * .06);
      nearby = active && position.y < 2 ? PATHS.find(path => Math.hypot(position.x-path.x,position.z-path.z)<2.6) : null;
      prompt.hidden = !nearby || dialog.open;
      if (nearby) prompt.textContent = `E · ${nearby.title} · узнать больше`;
    },
  };
}
