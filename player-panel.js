import { createInventoryWindows } from './inventory-window.js?v=2';
import { createLiveNavigator } from './navigator-live.js?v=11';
import { createNavigatorSpeech } from './navigator-speech.js?v=15';
import { createNavigatorChoice } from './navigator-choice.js?v=11';
import { NAVIGATORS } from './navigator-model.js?v=11';
// Physical codes keep chords identical on Russian and English layouts.
export function createPanelKeys({ switchMode, navigator, camera, inventory, equipment, guide, quest }) {
  const held = new Set(); let chord = false;
  return {
    down(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return false;
      if (e.code === 'KeyL') {
        e.preventDefault?.();
        if (!e.repeat) switchMode();
        return true;
      }
      if (e.code === 'KeyJ') { e.preventDefault?.(); if (!e.repeat) quest(); return true; }
      if (e.code === 'KeyH') { e.preventDefault?.(); if (!e.repeat) guide(); return true; }
      if (e.code === 'KeyB') { e.preventDefault?.(); if (!e.repeat) inventory?.(); return true; }
      if (!['KeyZ','KeyX','KeyC','KeyV'].includes(e.code)) return false;
      e.preventDefault?.(); if (e.repeat || held.has(e.code)) return true;
      held.add(e.code);
      if (!chord && held.has('KeyC') && held.has('KeyV')) { chord = true; switchMode(); }
      if (!chord && held.has('KeyZ') && held.has('KeyX')) { chord = true; navigator(); }
      return true;
    },
    up(e) {
      if (e.code === 'KeyC' && held.has('KeyC') && !chord) equipment?.();
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

export function createPlayerPanel({ onOpen, mission, notify, camera, blocked, bag, playerAccount }) {
  const $ = s => document.querySelector(s);
  let live;
  const choice=createNavigatorChoice({onOpen,onChange(id,portrait){
    for(const target of ['#navigator-button .navigator-portrait','#navigator-dialog .navigator-portrait'])$(target).outerHTML=portrait;
    $('#navigator-button img').hidden=true;live?.select(id);
    $('#navigator-title').textContent='Навигатор · '+NAVIGATORS.find(n=>n.id===id).name;
  }});
  const portrait=choice.portrait();
  const greetingToggle=document.createElement('label');greetingToggle.className='greeting-toggle';greetingToggle.innerHTML='<input id="greeting-enabled" type="checkbox" checked> Озвучить приветствие Навигатора';$('#play').before(greetingToggle);
  const hotbar = $('.hotbar');
  const dock = document.createElement('section'); dock.className='player-dock'; dock.dataset.mode='build'; dock.setAttribute('aria-label','Панель игрока');
  hotbar.before(dock);
  dock.innerHTML=`
    <div class="dock-caption"><span class="dock-dot"></span><span id="dock-mode" aria-live="polite">СБОРКА</span></div>
    <div class="dock-frame">
      <button id="navigator-button" class="dock-end navigator" aria-label="Позвать Навигатора · Z + X / Я + Ч" title="Навигатор · Z + X / Я + Ч">${portrait}<span>Навигатор</span><kbd>Z + X</kbd></button>
      <div class="dock-content"></div>
    </div>
    <div class="dock-tabs" role="group" aria-label="Действия панели игрока">
      <button id="inventory-button" type="button" title="Инвентарь · B / И">${icon('bag')}<span>Инвентарь</span><kbd>B / И</kbd></button>
      <button id="weapons-button" type="button" title="Снаряжение · C / С">${icon('shield')}<span>Снаряжение</span><kbd>C / С</kbd></button>
      <button id="mode-switch" type="button" aria-label="Режим Бой / Сборка" aria-pressed="false" title="Сменить режим · L / Д или C + V / С + М"><b class="dock-glyph" aria-hidden="true">⇄</b><span class="mode-label">Сборка</span><kbd>L / Д</kbd></button>
      <button id="guide-button" type="button" aria-haspopup="dialog" aria-controls="controls-guide" title="Управление · H / Р"><b class="dock-glyph guide-glyph" aria-hidden="true">?</b><span>Справка</span><kbd>H / Р</kbd></button>
      <button id="quest-tab" type="button" aria-controls="quest-panel"><b class="dock-glyph" aria-hidden="true">✦</b><span>Задание</span><kbd>J / О</kbd></button>
    </div>`;
  const quest = $('#quest-panel');
  const questTab = $('#quest-tab');
  function showQuest(visible) {
    quest.hidden = !visible;
    questTab.setAttribute('aria-expanded', String(visible));
    questTab.title = (visible ? 'Свернуть задание' : 'Открыть задание') + ' · J / О';
    questTab.setAttribute('aria-label', questTab.title);
  }
  $('#quest-close').onclick = () => {
    if (blocked()) return;
    showQuest(false);
    questTab.focus({preventScroll:true});
  };
  function toggleQuest() { if (!blocked()) showQuest(quest.hidden); }
  questTab.onclick = toggleQuest;
  showQuest(true);
  dock.querySelector('.dock-content').append(hotbar);
  live=createLiveNavigator($('#navigator-button'),choice.selected()??27);
  const bubble=document.createElement('div');bubble.id='navigator-greeting';bubble.setAttribute('role','status');bubble.hidden=true;bubble.textContent='Привет!';$('#navigator-button').append(bubble);
  const battle=document.createElement('div');battle.className='battle-bar';battle.hidden=true;
  const skills=[['sword','Удар'],['shield','Защита'],['spark','Импульс'],['bow','Выстрел'],['heal','Восстановление'],['wave','Волна']];
  battle.innerHTML=skills.map(([glyph,name],i)=>`<button class="combat-slot" aria-disabled="true" title="${name} · откроется с боевой системой" aria-label="${name}: пока недоступно"><kbd>${i+1}</kbd>${icon(glyph)}<span>${name}</span><small>◇</small></button>`).join('');
  for (const bar of [hotbar, battle]) {
    for (let number = bar.children.length + 1; number <= 9; number++) {
      bar.insertAdjacentHTML('beforeend', `<button type="button" class="empty-slot" disabled aria-label="Ячейка ${number} пуста"><kbd>${number}</kbd></button>`);
    }
  }
  dock.querySelector('.dock-content').append(battle);
  battle.querySelectorAll('.combat-slot').forEach(b=>b.onclick=()=>notify('Боевые навыки откроются вместе с боевой системой.'));
  const dialog=document.createElement('dialog');dialog.id='navigator-dialog';dialog.className='panel-dialog';dialog.setAttribute('aria-labelledby','navigator-title');
  dialog.innerHTML=`<div class="paths-heading"><div><div class="eyebrow">ТВОЙ СПУТНИК</div><h2 id="navigator-title">Навигатор</h2></div><button aria-label="Закрыть Навигатора">×</button></div><div class="navigator-talk">${portrait}<div><h3>Каждый большой путь начинается с куба.</h3><p id="navigator-task"></p></div></div><div id="navigator-progress"></div><p>Я помогу с текущей целью. Собирай материалы, следуй подсказкам площадки и открывай новые острова.</p><div class="navigator-actions"><button id="navigator-resume">Вернуться на остров</button><button id="navigator-change">Сменить помощника</button></div>`;
  document.body.append(dialog);
  if(choice.selected())$('#navigator-title').textContent='Навигатор · '+NAVIGATORS.find(n=>n.id===choice.selected()).name;
  $('#navigator-change').onclick=()=>{dialog.close();choice.open()};
  const speech=createNavigatorSpeech({dialog,getText:()=>mission().text});
  // Keep the bubble in the dock layout so wrapped controls stay above it.
  const portal=document.createElement('div');
  portal.id='travel-prompt';
  portal.hidden=true;
  portal.innerHTML=`<div class="portal-voice"><span class="portal-signal" aria-hidden="true"></span>Навигатор</div>
    <div role="status" aria-atomic="true"><strong class="portal-title"></strong><p class="portal-line"></p></div>
    <button id="portal-go" type="button"><kbd>E / У</kbd><span></span></button>`;
  dock.prepend(portal);
  const portalTitle=portal.querySelector('.portal-title');
  const portalLine=portal.querySelector('.portal-line');
  const portalGo=portal.querySelector('button');
  let currentLine,announced=false,lastSpokenLine,lastSpokenAt=0;
  function updatePortal(route,active,now){
    const line=route && (route.ready?route.label:route.locked);
    const changed=line!==currentLine;
    if(changed){currentLine=line;announced=false}
    if(!active || !route){
      if(!portal.hidden){portal.hidden=true;speech.leavePortal()}
      return;
    }
    if(!portal.hidden && !changed)return;
    const title=route.ready?'Портал открыт':'Портал спит';
    portalTitle.textContent=title;
    portalLine.hidden=route.ready;
    portalLine.textContent=route.ready?'':line;
    portalGo.hidden=!route.ready;
    portalGo.lastElementChild.textContent=route.label;
    portal.dataset.ready=String(route.ready);
    bubble.hidden=true;
    portal.hidden=false;
    if(!announced){
      // A jump or a single step across the boundary needn't repeat the same line.
      if(line!==lastSpokenLine || now-lastSpokenAt>=8000){
        const words=route.ready?'Нажми E, чтобы '+line[0].toLowerCase()+line.slice(1)+'.':line;
        speech.portal(title+'. '+words);
        lastSpokenLine=line;lastSpokenAt=now;
      }
      announced=true;
    }
  }
  let mode='build';
  const open=d=>{if(blocked())return;onOpen();d.showModal()};
  function showNavigator(){if(dialog.open){dialog.close();return}$('#navigator-task').textContent=mission().text;$('#navigator-progress').textContent=mission().progress;open(dialog);if(dialog.open)speech.open()}
  function switchMode(){mode=mode==='build'?'battle':'build';dock.dataset.mode=mode;document.body.classList.toggle('battle-mode',mode==='battle');hotbar.hidden=mode!=='build';battle.hidden=mode!=='battle';$('#dock-mode').textContent=mode==='build'?'СБОРКА':'БОЙ';$('#mode-switch').setAttribute('aria-pressed',String(mode==='battle'));$('#mode-switch .mode-label').textContent=mode==='build'?'Сборка':'Бой';notify(mode==='build'?'Сборка · материалы и постройки':'Сражение · навыки пока недоступны');}
  const guideDialog=$('#controls-guide');
  const guideButton=$('#guide-button');
  const guideTabs=[...guideDialog.querySelectorAll('[role="tab"]')];
  function selectGuideTab(selected){
    for(const tab of guideTabs){
      const active=tab===selected;
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex=active?0:-1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;
    }
    selected.focus();
  }
  for(const tab of guideTabs){
    tab.onclick=()=>selectGuideTab(tab);
    tab.onkeydown=e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();
      const first=e.key==='Home' || (e.key!=='End' && tab===guideTabs[1]);
      selectGuideTab(guideTabs[first?0:1]);
    };
  }
  function toggleGuide(){
    if(guideDialog.open){guideDialog.close();return}
    open(guideDialog);
    if(guideDialog.open){
      input.clear();
      selectGuideTab(guideDialog.querySelector('[aria-selected="true"]'));
    }
  }
  guideButton.onclick=toggleGuide;
  guideDialog.querySelector('.guide-close').onclick=()=>guideDialog.close();
  guideDialog.addEventListener('close',()=>guideButton.focus({preventScroll:true}));
  const storage=createInventoryWindows({bag,playerAccount,open,mode:()=>mode,setMode:next=>{if(next!==mode)switchMode()}});
  const inventory=()=>storage.toggle('bag'), equipment=()=>storage.toggle('gear');
  $('#inventory-button').onclick=inventory;
  function toggleMode(){if(!blocked())switchMode()}
  $('#mode-switch').onclick=toggleMode;
  $('#navigator-button').onclick=showNavigator;$('#weapons-button').onclick=equipment;
  dialog.querySelector('.paths-heading button').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>input.clear());
  $('#navigator-resume').onclick=()=>dialog.close();
  const input=createPanelKeys({switchMode,navigator:showNavigator,camera,inventory,equipment,guide:toggleGuide,quest:toggleQuest});
  let greeted=false;
  function start() {
    if (greeted) return;
    greeted=true;
    live.greet();
    bubble.hidden=false;
    setTimeout(()=>bubble.hidden=true,6500);
    if ($('#greeting-enabled').checked) speech.greet();
  }
  function update(dt,time,active) {
    live.update(dt,time,active);
    if (active && !document.hidden && portal.hidden) speech.updateArrival(time*1000);
  }
  return {
    updatePortal, enterLocation:speech.enterLocation, start, update,
    storageOpen:storage.isOpen, guideOpen:()=>guideDialog.open,
    isOpen:()=>guideDialog.open || dialog.open || storage.isOpen() || choice.isOpen(),
    isBattle:()=>mode==='battle', toggleMode, input,
  };
}
