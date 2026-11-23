import {Vector3} from '../vendor/three.module.js';
import {createTurtleMechanic} from '../world/turtle-mechanic.js?v=4';
import {pcParts} from '../catalog/pc-parts.js';
import {workshopModels} from '../world/repair-models.js?v=6';

import {createBugEncounter} from '../world/bug-encounter.js';

const puzzles = [
  {name:'Оранжевый Баг', parts:[0,1], lines:[
    ['name = ', {typo:'inpt', answer:'input'}, '("Как тебя зовут?")'],
    [{typo:'pritn', answer:'print'}, '("Привет,", name)'],
  ]},
  {name:'Зелёный Баг', parts:[2,3,4], lines:[
    [{typo:'fro', answer:'for'}, ' i in ', {typo:'rnage', answer:'range'}, '(3):'],
    ['    ', {typo:'prnit', answer:'print'}, '(i)'],
  ]},
];
const repairHints = {
  input:'Здесь нужна функция ввода.',
  print:'Здесь нужна функция вывода.',
  for:'Здесь нужно ключевое слово, с которого начинается цикл перебора.',
  range:'Здесь нужна последовательность чисел.',
};
export function newRepair() {
  return {met:false,axe:false,bugs:puzzles.map(()=>({hp:3,phase:'running',x:0,z:0})),parts:pcParts.map(()=>'stolen')};
}
export function repairBrief(state) {
  if (!state.met) return 'Поговори с черепахой у верстака.';
  if (state.bugs.some(b=>b.phase==='running'||b.phase==='stopped')) return 'В режиме боя поймай двух багов и исправь их программы.';
  if (state.axe) return 'Добудь древесину топором и собери деревянную арку на севере.';
  if (state.parts.every(p=>p==='installed')) return 'Вернись к черепахе за волшебным топором.';
  if (state.parts.includes('ground') || state.parts.includes('stolen')) return 'Подбери оставленные на траве детали клавишей E.';
  return 'Вернись к черепахе и установи детали компьютера.';
}
export function createWorkshop({stage,parent,geometry,box,player,camera,canStore,equipAxe,notify,pause,changed,collect,place,onHit}) {
  const state=stage.repair, center=stage.center;
  const models=workshopModels(parent,geometry);
  const turtle=createTurtleMechanic(parent,center-1.85,-.3);
  const worktop=box(center+1.1,.85,-1,1.9,.22,1.2,0xae895d,true);
  worktop.name='turtle-workbench-top';
  for (const dx of [-.7,.7]) box(center+1.1+dx,.4,-1,.17,.8,.96,0x746b54,true);
  box(center+1.1,1.01,-1,1.35,.12,.8,0x527b69);
  box(center+.85,1.085,-1.07,.32,.05,.32,0xc8ba94);
  for(const dx of [.27,.39])box(center+1.1+dx,1.09,-1.08,.07,.07,.42,0x374e49);
  box(center+1.04,1.09,-.77,.56,.06,.07,0xd0c59f);
  const powerLed=box(center+.54,1.086,-.68,.105,.04,.085,0x51665a);
  powerLed.name='workbench-power-led';
  const bugs=puzzles.map((_,i)=>models.bug(i,center+(i?5:-5),-2));
  const encounters=bugs.map((bug,i)=>createBugEncounter(i,bug,center));
  const settleSeconds=.55, settling=bugs.map(()=>0);
  const helpers=bugs.map(({g})=>models.helper(g.position.x,g.position.z));
  const drops=pcParts.map((p,i)=>models.part(p,i,center,0));
  const prompt=document.querySelector('#field-action'), dialog=document.querySelector('#workshop-dialog');
  const title=dialog.querySelector('h2'), body=dialog.querySelector('.field-body');
  let time=0, fade=[0,0], lastHit=-1;
  let giftTime=null,closingLid=0,deliveryLeft=0,openAfterNod=false;
  const giftDuration=1.65;
  const giftCamera=turtle.root.localToWorld(new Vector3(2.65,1.76,2.9));
  const giftFocus=turtle.root.localToWorld(new Vector3(.38,.89,.10));
  const repaired=()=>state.parts.every(p=>p==='installed');
  const byBench=()=>near(turtle.root,3.2) || (state.met && near(worktop,2.2));
  if(repaired() && state.giftShown && !state.axe)turtle.present(1);
  function sync() {
    powerLed.material.color.setHex(repaired()?0x95eead:0x51665a);
    powerLed.material.emissive.setHex(repaired()?0x388958:0);
    state.bugs.forEach((b,i)=>{
      const {g,hp,fill}=bugs[i];
      g.visible=b.phase==='running'||b.phase==='stopped';
      hp.visible=b.phase==='running';fill.scale.x=.93*b.hp/3;fill.position.x=(fill.scale.x-.93)/2;
      if(b.phase!=='running'){
        g.position.set(b.x,0,b.z);g.rotation.y=b.yaw??0;
        if(b.phase==='stopped' && !settling[i])bugs[i].pose(1,0,true);
      }
      helpers[i].visible=b.phase==='leaving';
      helpers[i].position.set(b.x,0,b.z);
      puzzles[i].parts.forEach((part,j)=>{
        const obj=drops[part];
        obj.visible=state.parts[part]==='ground';
        obj.position.set(b.x+(j-(puzzles[i].parts.length-1)/2)*1.0,0,b.z+.35);
      });
    });
  }
  function near(obj,radius) {
    return Math.hypot(player.position.x-obj.position.x,player.position.z-obj.position.z)<radius && player.position.y<2.2;
  }
  function closest(objects,allowed,radius) {
    let best=-1, dist=radius;
    objects.forEach((obj,i)=>{
      const d=Math.hypot(obj.position.x-player.position.x,obj.position.z-player.position.z);
      if(allowed(i)&&d<dist&&near(obj,radius)){best=i;dist=d}
    });
    return best;
  }
  function show(heading,html) {
    title.textContent=heading;body.innerHTML=html;
    if(!dialog.open){pause();dialog.showModal()}
  }
  function edit(i) {
    const p=puzzles[i], b=state.bugs[i];
    const blanks=[];
    const code=p.lines.map((line,row)=>line.map(token=>{
      if(typeof token==='string')return token;
      blanks.push({answer:token.answer,row:row+1});
      return `<input aria-label="Строка ${row+1}, поле ${blanks.length}" spellcheck="false" autocapitalize="off" value="${token.typo}">`;
    }).join('')).join('\n');
    show(p.name+' · Отладка',`<p>Исправь выделенные слова Python, сохранив смысл программы.</p><form>
      <pre class="repair-code">${code}</pre>
      <button class="field-primary">Проверить программу</button><p role="status"></p></form>`);
    const form=body.querySelector('form'), inputs=[...form.querySelectorAll('input')];
    inputs[0].focus();inputs[0].select();
    form.onsubmit=e=>{
      e.preventDefault();
      if(b.phase!=='stopped')return;
      const wrong=inputs.findIndex((el,j)=>el.value.trim()!==blanks[j].answer);
      if(wrong>=0){
        const {answer,row}=blanks[wrong];
        form.querySelector('[role=status]').textContent='Проверь строку '+row+'. '+repairHints[answer];
        inputs[wrong].focus();inputs[wrong].select();return;
      }
      b.phase='leaving';fade[i]=0;sync();helpers[i].rotation.y=Math.atan2(player.position.x-b.x,player.position.z-b.z);dialog.close();
      notify('Программа: «Спасибо! Теперь я снова работаю. Возвращаю детали!»');changed();
    };
  }
  function assembly() {
    if(stage.unlocked){
      show('Компьютер работает','<p>Черепаха: «Мои программы снова запускаются! Портал к трём аркам открыт».</p>');
      return;
    }
    if(repaired()){
      if(!state.axe && !state.giftShown){
        if(giftTime===null){dialog.close();pause();giftTime=0}
        return;
      }
      if(state.axe){show('Компьютер работает','<p>«Топором можно добыть древесину из любого ствола. Собери из семи блоков арку на северной стороне острова».</p>');return}
      show('Подарок черепахи','<img src="./assets/inventory-axe.webp" width="96" height="96" alt="Листолун с нефритовым лезвием"><p>«Компьютер ожил! Спасибо. Держи Листолун — его лезвие снимает древесину, и дерево остаётся целым. Из семи блоков ты построишь арку».</p><button class="field-primary">Принять топор</button>');
      body.querySelector('button').onclick=()=>{
        if(state.axe || !canStore('wood-axe'))return;
        state.axe=true;closingLid=1;turtle.present(1,false);dialog.close();equipAxe();collect();changed();
        notify('Листолун в руке. Подойди к дереву и ударь по стволу левой кнопкой мыши.',7000);
      };
      return;
    }
    function socket(p,i){
      const installed=state.parts[i]==='installed';
      return `<button data-socket="${i}" ${installed?'disabled':''}>${installed?'✓ '+p.name:p.socket}</button>`;
    }
    show('Верстак черепахи',`<p>Выбери деталь из рюкзака и укажи её место в корпусе.</p>
    <div class="repair-case"><div class="repair-board"><strong>Материнская плата</strong>
    ${pcParts.slice(0,4).map(socket).join('')}</div>${socket(pcParts[4],4)}</div>
    <div class="repair-parts">${pcParts.map((p,i)=>state.parts[i]==='bag'?'<button data-part="'+i+'" aria-pressed="false">'+p.name+'</button>':'').join('')}</div><p role="status">Блок питания крепится в отдельном отсеке корпуса.</p>`);
    let selected=-1;
    const status=body.querySelector('[role=status]');
    body.querySelectorAll('[data-part]').forEach(btn=>btn.onclick=()=>{
      selected=Number(btn.dataset.part);
      body.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
      status.textContent=pcParts[selected].description;
    });
    body.querySelectorAll('[data-socket]').forEach(btn=>btn.onclick=()=>{
      if(selected!==Number(btn.dataset.socket)||state.parts[selected]!=='bag'){
        status.textContent=selected<0?'Сначала выбери деталь из рюкзака.':'Этой детали нужен другой разъём.';return;
      }
      state.parts[selected]='installed';place();changed();
      if(repaired()){turtle.nod();sync()}
      assembly();
    });
  }
  function acknowledgeDelivery(){
    if(!state.parts.includes('bag'))return;
    const returned=state.parts.filter(p=>p==='bag' || p==='installed').length;
    if(returned<=(state.acknowledgedParts??0))return;
    state.acknowledgedParts=returned;
    turtle.acknowledge();deliveryLeft=1.05;
  }
  function talk() {
    if(giftTime!==null)return;
    acknowledgeDelivery();
    if(deliveryLeft>0){openAfterNod=true;return}
    turtle.nod();
    if(!state.met){
      state.met=true;changed();
      show('Черепаха-механик','<p>«Я разобрала компьютер, чтобы найти баг. А их оказалось двое! Пока я проверяла плату, они унесли пять деталей. Поможешь мне их вернуть?»</p><p>Нажми L для боя. Подойди к жуку и нажимай 1 или ЛКМ. Когда жук остановится, исправь слова в его программе.</p><button class="field-primary">Помогу</button>');
      body.querySelector('button').onclick=()=>dialog.close();
    } else if(state.parts.includes('bag') || state.parts.every(p=>p==='installed')) assembly();
    else notify(repairBrief(state));
  }
  function target() {
    if(state.met){
      const i=closest(drops,j=>state.parts[j]==='ground',2);
      if(i>=0)return {label:'Подобрать · '+pcParts[i].name,act(){
        if(!canStore(pcParts[i].id))return;
        state.parts[i]='bag';collect();sync();changed();notify(pcParts[i].name+' в рюкзаке.');
      }};
      const j=closest(bugs.map(b=>b.g),k=>state.bugs[k].phase==='stopped' && !settling[k],3);
      if(j>=0)return {label:'Исправить программу',act:()=>edit(j)};
    }
    if(byBench())return {label:state.met?'Верстак черепахи':'Поговорить с черепахой',act:talk};
  }
  function interact(){const t=target();if(t)t.act();return !!t}
  function attack(){
    if(!state.met){notify('Сначала поговори с черепахой у верстака.');return}
    const i=closest(bugs.map(b=>b.g),j=>state.bugs[j].phase==='running',3.2);
    if(i<0){notify('Подойди ближе к бегущему багу.');return}
    if(time-lastHit<.25)return;
    lastHit=time;onHit();
    const b=state.bugs[i], g=bugs[i].g;
    b.hp--;
    if(b.hp)encounters[i].hit(player.position);
    else{
      b.phase='stopped';b.x=g.position.x;b.z=g.position.z;b.yaw=g.rotation.y;
      settling[i]=settleSeconds;
    }
    sync();
  }
  function tick(dt,active,reduced){
    if(!active){prompt.hidden=true;return}
    if(giftTime!==null){
      giftTime=Math.min(giftDuration,giftTime+dt);
      const progress=reduced?1:giftTime/giftDuration;
      turtle.present(progress);
      turtle.update(dt,reduced,player.position,false);
      prompt.hidden=true;
      if(giftTime>=(reduced?.35:giftDuration)){
        giftTime=null;state.giftShown=true;turtle.present(1);assembly();
      }
      return;
    }
    if(closingLid>0){
      closingLid=reduced?0:Math.max(0,closingLid-dt*1.7);
      turtle.present(closingLid,false);
    }
    if(byBench())acknowledgeDelivery();
    if(deliveryLeft>0){
      deliveryLeft=reduced?0:Math.max(0,deliveryLeft-dt);
      if(!deliveryLeft && openAfterNod){
        openAfterNod=false;
        if(byBench())assembly();
      }
    }
    turtle.update(dt,reduced,player.position,!repaired());
    time+=dt;
    state.bugs.forEach((b,i)=>{
      const {g,hp,pose}=bugs[i];
      if(b.phase==='running'){
        encounters[i].update(dt,player.position,reduced);
        hp.quaternion.copy(g.quaternion).invert().multiply(camera.quaternion);
      }else if(settling[i]>0){
        settling[i]=Math.max(0,settling[i]-dt);
        const t=1-settling[i]/settleSeconds;
        pose(reduced?1:.3+.7*(1-(1-t)**3),0,true);
        if(!settling[i] && !dialog.open)edit(i);
      }else if(b.phase==='leaving'){
        fade[i]+=dt;const fraction=Math.min(1,fade[i]/1.35),h=helpers[i];
        h.position.y=reduced?0:fraction*.95;h.scale.setScalar(1-fraction*.94);
        if(fraction===1){b.phase='gone';puzzles[i].parts.forEach(j=>state.parts[j]='ground');sync();changed()}
      }
    });
    const t=target();
    prompt.hidden=!t;
    if(t && prompt.textContent!=='E · '+t.label)prompt.textContent='E · '+t.label;
  }
  prompt.onclick=interact;
  sync();
  return {tick,attack,interact,
    presenting:()=>giftTime!==null,
    frameGift(){
      camera.position.copy(giftCamera);camera.lookAt(giftFocus);
    },
    dispose(){prompt.hidden=true;prompt.onclick=null;dialog.close()}};
}
