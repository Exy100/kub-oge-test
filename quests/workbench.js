import {pcParts} from '../catalog/pc-parts.js';

const artDirectory='./assets/workbench/';
const boardParts=pcParts.filter(part=>part.id!=='pc.psu');
const powerSupply=pcParts.find(part=>part.id==='pc.psu');
const prompts={
  'pc.cpu':'Найди квадратный сокет процессора на материнской плате.',
  'pc.ram':'Планка ОЗУ длинная и узкая. Найди длинный слот рядом с процессором.',
  'pc.ssd':'У SSD M.2 маленький разъём. Ищи на плате место для узкой карты с креплением на конце.',
  'pc.gpu':'Видеокарте нужен длинный слот расширения ниже процессора.',
  'pc.psu':'Найди отдельный отсек в корпусе для блока, который питает весь компьютер.',
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
      <img src="${artDirectory}${part.id.slice(3)}.webp" alt="" draggable="false">
      <span>${part.name}${part.id==='pc.ssd'?' M.2':''}${detail?`<small>${detail}</small>`:''}</span></button>`;
  }).join('');
  return `<div class="pc-workbench">
    <p class="pc-instruction"></p><button type="button" class="field-primary" data-reveal>Показать разъём</button>
    <div class="pc-layout">
      <section class="pc-inventory"><h3>В рюкзаке</h3>${choices}</section>
      <section class="pc-chassis" aria-label="Корпус компьютера">
        <h3>Материнская плата</h3>
        <div class="pc-board">${boardParts.map(socket).join('')}</div>
        ${socket(powerSupply)}
      </section>
    </div><p class="pc-status" role="status"></p></div>`;
}

export function bindWorkbench(body,parts,install) {
  const choices=[...body.querySelectorAll('[data-part]')];
  const sockets=[...body.querySelectorAll('[data-socket]')];
  const status=body.querySelector('.pc-status');
  const instruction=body.querySelector('.pc-instruction');
  const reveal=body.querySelector('[data-reveal]');
  const guided=!parts.includes('installed');
  let selected=-1;
  function highlight(){
    sockets.forEach(btn=>btn.classList.toggle('pc-target',Number(btn.dataset.socket)===selected));
  }
  reveal.onclick=()=>{highlight();sockets[selected]?.focus()};
  function select(i) {
    selected=i;
    choices.forEach((btn,j)=>btn.setAttribute('aria-pressed',String(j===i)));
    sockets.forEach(btn=>btn.classList.remove('pc-target'));
    if(guided)highlight();
    reveal.hidden=guided || i<0;
    instruction.textContent=i<0?'Подбери остальные детали на острове':
      prompts[pcParts[i].id];
    status.textContent=i<0?'Установленные детали останутся в корпусе.':pcParts[i].description;
  }
  function trySocket(btn) {
    const i=Number(btn.dataset.socket);
    if(selected!==i || parts[i]!=='bag'){
      status.textContent=selected<0?'Сначала найди деталь и принеси её к верстаку.':'Этой детали нужен другой разъём.';
      return;
    }
    install(i);
  }
  const bench=body.querySelector('.pc-workbench');
  let drag=null;
  function clearDrag() {
    drag?.preview?.remove();
    drag=null;
  }
  choices.forEach((btn,i)=>{
    btn.onclick=event=>{
      if(event.detail===0 || selected!==i)select(i);
      if(event.detail===0 && guided)sockets.find(s=>Number(s.dataset.socket)===i)?.focus();
    };
    btn.onpointerdown=event=>{
      if(!event.isPrimary || event.button!==0 || drag || btn.disabled)return;
      btn.setPointerCapture(event.pointerId);
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,preview:null};
    };
    btn.onpointermove=event=>{
      if(drag?.id!==event.pointerId)return;
      if(!drag.preview){
        if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<5)return;
        select(i);
        drag.preview=btn.querySelector('img').cloneNode();
        drag.preview.className='pc-drag-preview';
        bench.append(drag.preview);
      }
      drag.preview.style.left=event.clientX+'px';
      drag.preview.style.top=event.clientY+'px';
    };
    btn.onpointerup=event=>{
      if(drag?.id!==event.pointerId)return;
      const target=drag.preview && document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-socket]');
      clearDrag();
      if(sockets.includes(target) && !target.disabled)trySocket(target);
    };
    btn.onlostpointercapture=btn.onpointercancel=event=>{
      if(drag?.id===event.pointerId)clearDrag();
    };
  });
  sockets.forEach(btn=>btn.onclick=()=>trySocket(btn));
  select(parts.indexOf('bag'));
}
