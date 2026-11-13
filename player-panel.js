// Physical codes keep chords identical on Russian and English layouts.
export function createPanelKeys({ switchMode, navigator, camera }) {
  const held = new Set(); let chord = false;
  return {
    down(e) {
      if (!['KeyZ','KeyX','KeyC','KeyV'].includes(e.code)) return false;
      e.preventDefault?.(); if (e.repeat || held.has(e.code)) return true;
      held.add(e.code);
      if (!chord && held.has('KeyC') && held.has('KeyV')) { chord = true; switchMode(); }
      if (!chord && held.has('KeyZ') && held.has('KeyX')) { chord = true; navigator(); }
      return true;
    },
    up(e) {
      if (e.code === 'KeyV' && held.has('KeyV') && !chord) camera();
      held.delete(e.code); if (!held.size) chord = false;
    },
    clear() { held.clear(); chord = false; },
  };
}
const paths = {
  sword:'M8 34 32 10 38 8 36 14 12 38M8 26l14 14M7 35l6 6',
  shield:'M24 5 39 11v12c0 10-15 18-15 18S9 33 9 23V11ZM24 12v21',
  spark:'m27 5-16 23h12l-2 15 16-24H25Z',
  bow:'M12 7q33 17 0 34l8-17ZM7 24h33m-6-6 6 6-6 6',
  heal:'M19 9h10v10h10v10H29v10H19V29H9V19h10Z',
  wave:'M6 30q9-18 18 0t18 0M10 18q7-12 14 0t14 0',
  bag:'M13 17h22l4 23H9ZM18 17v-5a6 6 0 0 1 12 0v5M18 25h12',
};
const icon = name => `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
const portrait = `<svg class="navigator-portrait" viewBox="0 0 80 90" aria-hidden="true"><path fill="#476e65" d="M6 89q0-26 22-30h24q22 4 22 30"/><path fill="#c5b58c" d="m18 89 7-29 12 9-9 20m34 0-7-29-12 9 9 20"/><path fill="#edc89e" d="M31 53h18v15q-9 9-18 0"/><path fill="#efd1aa" d="M20 30q0-21 20-21t20 21v17q-3 19-20 19T20 47"/><path fill="#655445" d="M18 36Q9 7 37 5q29-4 27 30l-7-12-9-3-10 8-11-3-5 11"/><path fill="#405c54" d="M27 41h7v5h-7m19-5h7v5h-7"/><path stroke="#ae795f" stroke-width="2" fill="none" stroke-linecap="round" d="m36 54 4 2 5-2M39 43l-2 6h4"/><path fill="#d3af71" d="m40 73 5 5-5 5-5-5"/></svg>`;
export function createPlayerPanel({ onOpen, mission, notify, camera, blocked }) {
  const $ = s => document.querySelector(s);
  const hotbar = $('.hotbar');
  const dock = document.createElement('section'); dock.className='player-dock'; dock.dataset.mode='build'; dock.setAttribute('aria-label','Панель игрока');
  hotbar.before(dock);
  dock.innerHTML=`<div class="dock-caption"><span class="dock-dot"></span><span id="dock-mode" aria-live="polite">СБОРКА</span><button id="mode-switch" title="Сменить панель · C + V / С + М">Сборка / Сражение <kbd>C + V</kbd></button></div><div class="dock-frame"><button id="navigator-button" class="dock-end navigator" aria-label="Позвать Навигатора · Z + X / Я + Ч" title="Навигатор · Z + X / Я + Ч">${portrait}<span>Навигатор</span><kbd>Z + X</kbd></button><div class="dock-content"></div><button id="weapons-button" class="dock-end" hidden aria-label="Оружейный инвентарь">${icon('bag')}<span>Арсенал</span></button><div class="dock-ornament" aria-hidden="true">✧</div></div>`;
  dock.querySelector('.dock-content').append(hotbar);
  const battle=document.createElement('div');battle.className='battle-bar';battle.hidden=true;
  const skills=[['sword','Удар'],['shield','Защита'],['spark','Импульс'],['bow','Выстрел'],['heal','Восстановление'],['wave','Волна']];
  battle.innerHTML=skills.map(([glyph,name],i)=>`<button class="combat-slot" aria-disabled="true" title="${name} · откроется с боевой системой" aria-label="${name}: пока недоступно"><kbd>${i+1}</kbd>${icon(glyph)}<span>${name}</span><small>◇</small></button>`).join('');
  dock.querySelector('.dock-content').append(battle);
  battle.querySelectorAll('button').forEach(b=>b.onclick=()=>notify('Боевые навыки откроются вместе с боевой системой.'));
  const dialog=document.createElement('dialog');dialog.id='navigator-dialog';dialog.className='panel-dialog';dialog.setAttribute('aria-labelledby','navigator-title');
  dialog.innerHTML=`<div class="paths-heading"><div><div class="eyebrow">ТВОЙ СПУТНИК</div><h2 id="navigator-title">Навигатор</h2></div><button aria-label="Закрыть Навигатора">×</button></div><div class="navigator-talk">${portrait}<div><h3>Каждый большой путь начинается с куба.</h3><p id="navigator-task"></p></div></div><div id="navigator-progress"></div><p>Я помогу с текущей целью. Собирай материалы, следуй подсказкам площадки и открывай новые острова.</p><div class="navigator-actions"><button id="navigator-paths">Выбрать направление →</button><button id="navigator-resume">Вернуться на остров</button></div>`;
  const arsenal=document.createElement('dialog');arsenal.id='weapons-dialog';arsenal.className='panel-dialog';arsenal.setAttribute('aria-labelledby','weapons-title');
  arsenal.innerHTML=`<div class="paths-heading"><div><div class="eyebrow">СНАРЯЖЕНИЕ</div><h2 id="weapons-title">Оружейный инвентарь</h2></div><button aria-label="Закрыть инвентарь">×</button></div><div class="weapon-empty">${icon('sword')}<h3>Арсенал пока пуст</h3><p>Оружие и боевые навыки появятся вместе со сражениями. Сейчас доступно строительство и исследование островов.</p></div>`;
  document.body.append(dialog,arsenal);
  let mode='build';
  const open=d=>{if(blocked())return;onOpen();d.showModal()};
  function showNavigator(){if(dialog.open){dialog.close();return}$('#navigator-task').textContent=mission().text;$('#navigator-progress').textContent=mission().progress;open(dialog)}
  function switchMode(){mode=mode==='build'?'battle':'build';dock.dataset.mode=mode;document.body.classList.toggle('battle-mode',mode==='battle');hotbar.hidden=mode!=='build';battle.hidden=mode!=='battle';$('#weapons-button').hidden=mode!=='battle';dock.querySelector('.dock-ornament').hidden=mode!=='build';$('#dock-mode').textContent=mode==='build'?'СБОРКА':'СРАЖЕНИЕ';$('#material').hidden=mode!=='build';notify(mode==='build'?'Сборка · материалы и постройки':'Сражение · навыки пока недоступны');}
  $('#navigator-button').onclick=showNavigator;$('#mode-switch').onclick=()=>{if(!blocked())switchMode()};$('#weapons-button').onclick=()=>open(arsenal);
  for(const d of [dialog,arsenal]){d.querySelector('.paths-heading button').onclick=()=>d.close();d.addEventListener('close',()=>input.clear());}
  $('#navigator-resume').onclick=()=>dialog.close();$('#navigator-paths').onclick=()=>{dialog.close();$('#paths-button').click()};
  const input=createPanelKeys({switchMode,navigator:showNavigator,camera});
  return {isOpen:()=>dialog.open||arsenal.open,isBattle:()=>mode==='battle',input};
}
