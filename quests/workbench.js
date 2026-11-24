import {pcParts} from '../catalog/pc-parts.js';

const artDirectory='./assets/workbench/';
const boardParts=pcParts.filter(part=>part.id!=='pc.psu');
const powerSupply=pcParts.find(part=>part.id==='pc.psu');
const prompts={
  'pc.cpu':'Выбери сокет для процессора',
  'pc.ram':'Выбери слот для оперативной памяти',
  'pc.ssd':'Выбери разъём для SSD',
  'pc.gpu':'Выбери слот для видеокарты',
  'pc.psu':'Выбери отсек для блока питания',
};

export function workbenchView(parts) {
  function socket(part) {
    const i=pcParts.indexOf(part);
    const installed=parts[i]==='installed';
    return `<button type="button" data-socket="${i}" class="pc-socket ${part.id.replace('.','-')}"
      aria-label="${part.socket}${installed?' · установлено':''}" title="${part.socket}" ${installed?'disabled':''}>
      ${part===powerSupply?'<span>Отсек блока питания</span>':''}</button>`;
  }
  const choices=pcParts.map((part,i)=>{
    const installed=parts[i]==='installed';
    const unavailable=parts[i]!=='bag';
    const detail=installed?'Установлено':unavailable?'Нужно найти':'';
    return `<button type="button" data-part="${i}" aria-pressed="false" ${unavailable?'disabled':''}>
      <img src="${artDirectory}${part.id.slice(3)}.webp" alt="">
      <span>${part.name}${part.id==='pc.ssd'?' M.2':''}${detail?`<small>${detail}</small>`:''}</span></button>`;
  }).join('');
  return `<div class="pc-workbench">
    <p class="pc-instruction"></p>
    <div class="pc-layout">
      <section class="pc-chassis" aria-label="Корпус компьютера">
        <h3>Материнская плата</h3>
        <div class="pc-board">${boardParts.map(socket).join('')}</div>
        ${socket(powerSupply)}
      </section>
      <section class="pc-inventory"><h3>В рюкзаке</h3>${choices}</section>
    </div><p class="pc-status" role="status"></p></div>`;
}

export function bindWorkbench(body,parts,install) {
  const choices=[...body.querySelectorAll('[data-part]')];
  const sockets=[...body.querySelectorAll('[data-socket]')];
  const status=body.querySelector('.pc-status');
  const instruction=body.querySelector('.pc-instruction');
  let selected=-1;
  function select(i) {
    selected=i;
    choices.forEach((btn,j)=>btn.setAttribute('aria-pressed',String(j===i)));
    sockets.forEach(btn=>btn.classList.toggle('pc-target',Number(btn.dataset.socket)===i));
    instruction.textContent=i<0?'Подбери остальные детали на острове':
      prompts[pcParts[i].id];
    status.textContent=i<0?'Установленные детали останутся в корпусе.':pcParts[i].description;
  }
  choices.forEach((btn,i)=>btn.onclick=event=>{
    select(i);
    if(event.detail===0)sockets.find(s=>Number(s.dataset.socket)===i)?.focus();
  });
  sockets.forEach(btn=>btn.onclick=()=>{
    const i=Number(btn.dataset.socket);
    if(selected!==i || parts[i]!=='bag'){
      status.textContent=selected<0?'Сначала найди деталь и принеси её к верстаку.':'Этой детали нужен другой разъём.';
      return;
    }
    install(i);
  });
  select(parts.indexOf('bag'));
}
