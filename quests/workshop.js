import {STAFF_ATTACK} from '../catalog/pulse-staff.js';
import {orangeBug,greenBug,UNARMED_DAMAGE} from '../catalog/bugs.js';
import {workbenchView,bindWorkbench} from './workbench.js?v=3';
import {CanvasTexture, Sprite, SpriteMaterial, SRGBColorSpace, Vector3} from '../vendor/three.module.js';
import {createTurtleMechanic} from '../world/turtle-mechanic.js?v=4';
import {pcParts} from '../catalog/pc-parts.js';
import {workshopModels} from '../world/repair-models.js?v=8';

import {createBugEncounter} from '../world/bug-encounter.js?v=2';

const puzzles = [
  {enemy:orangeBug, color:'оранжевого', parts:[0,1], lines:[
    ['name = ', {typo:'inpt', answer:'input'}, '("Как тебя зовут?")'],
    [{typo:'pritn', answer:'print'}, '("Привет,", name)'],
  ]},
  {enemy:greenBug, color:'зелёного', parts:[2,3,4], lines:[
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
export function inWandArc(origin,yaw,target){
  const cellX=Math.round(target.x)-Math.round(origin.x);
  const cellZ=Math.round(target.z)-Math.round(origin.z);
  if(Math.abs(cellX)>1 || Math.abs(cellZ)>1)return false;
  const dx=target.x-origin.x,dz=target.z-origin.z;
  return -Math.sin(yaw)*dx-Math.cos(yaw)*dz>=.35*Math.hypot(dx,dz);
}

export function newRepair() {
  return {met:false,axe:false,bugs:puzzles.map(({enemy})=>({hp:enemy.maxHp,phase:'running',x:0,z:0})),parts:pcParts.map(()=>'stolen')};
}
export function hasArchWood(stage) {
  return stage.inventory[2]+stage.built.size>=stage.targets.length;
}
export function repairBrief(stage) {
  const state=stage.repair;
  if (!state.met) return 'Поговори с черепахой у верстака.';
  if (state.axe) return hasArchWood(stage)?'Построй деревянную арку на севере.':'Добудь древесину Листолуном.';
  const dropped=puzzles.find(p=>p.parts.some(i=>state.parts[i]==='ground'));
  if(dropped){
    const found=dropped.parts.filter(i=>state.parts[i]==='bag' || state.parts[i]==='installed').length;
    return `Подбери детали ${dropped.color} жука · ${found}/${dropped.parts.length}`;
  }
  const active=puzzles.filter((_,i)=>['running','stopped'].includes(state.bugs[i].phase));
  if(active.length===2)return 'В режиме боя поймай двух багов и исправь их программы.';
  if(active.length===1 && state.bugs[puzzles.indexOf(active[0])].phase==='stopped')return `Исправь программу ${active[0].color} жука.`;
  if(active.length===1)return `Поймай ${active[0].color} жука и исправь его программу.`;
  if(state.bugs.some(b=>b.phase==='leaving'))return 'Забери детали у исправленного жука.';
  if (state.parts.every(p=>p==='installed')) return 'Вернись к черепахе за волшебным топором.';
  return 'Вернись к черепахе и установи детали компьютера.';
}
function fieldLabel(text) {
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  const font='bold 28px sans-serif';
  ctx.font=font;
  canvas.width=Math.ceil(ctx.measureText(text).width)+28;
  canvas.height=44;
  ctx.fillStyle='#25483c';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.font=font;ctx.fillStyle='#fff6ce';ctx.textAlign='center';
  ctx.fillText(text,canvas.width/2,32);
  const map=new CanvasTexture(canvas);
  map.colorSpace=SRGBColorSpace;
  const label=new Sprite(new SpriteMaterial({map,depthWrite:false}));
  label.scale.set(canvas.width/104,canvas.height/104,1);
  label.visible=false;
  return label;
}
function createQuestMark() {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.font='bold 92px sans-serif';
  ctx.textAlign='center';
  ctx.lineJoin='round';
  ctx.lineWidth=6;
  ctx.strokeStyle='#5b3815';
  ctx.shadowColor='#ffd45b';
  ctx.shadowBlur=10;
  ctx.strokeText('!',64,96);
  ctx.fillStyle='#fff397';
  ctx.fillText('!',64,96);
  const map=new CanvasTexture(canvas);
  map.colorSpace=SRGBColorSpace;
  const mark=new Sprite(new SpriteMaterial({map,depthWrite:false}));
  mark.name='turtle-quest-mark';
  mark.position.y=2.45;
  mark.scale.setScalar(.95);
  return mark;
}
export function createWorkshop({stage,parent,geometry,box,solids,player,camera,canStore,equipAxe,notify,pause,changed,collect,place,onHit}) {
  const state=stage.repair, center=stage.center;
  const models=workshopModels(parent,geometry);
  const turtle=createTurtleMechanic(parent,center-1.85,-.3);
  const questMark=createQuestMark();
  turtle.root.add(questMark);
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
  function clearForHop(x,z){
    if(Math.abs(x-center)>10 || Math.abs(z)>9)return false;
    if(Math.hypot(x-turtle.root.position.x,z-turtle.root.position.z)<1.65)return false;
    return !solids.some(({position:p,scale:s})=>p.y+s.y/2>.05 && p.y-s.y/2<1.6 &&
      Math.abs(x-p.x)<s.x/2+.68 && Math.abs(z-p.z)<s.z/2+.68);
  }
  const encounters=bugs.map((bug,i)=>createBugEncounter(i,bug,center,clearForHop));
  const settleSeconds=.55, settling=bugs.map(()=>0);
  const helpers=bugs.map(({g})=>models.helper(g.position.x,g.position.z));
  const drops=pcParts.map((p,i)=>models.part(p,i,center,0));
  const pickupNames=['процессор','оперативную память','SSD','видеокарту','блок питания'];
  const dropLabels=pickupNames.map((name,i)=>{
    const label=fieldLabel('E · Подобрать '+name);
    label.name='pickup-label-'+pcParts[i].id;
    return label;
  });
  const archLabel=fieldLabel('Северная арка');
  archLabel.name='north-arch-label';
  archLabel.position.set(stage.arches[0].x,3.55,stage.arches[0].z);
  parent.add(...dropLabels,archLabel);
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
    questMark.visible=!state.met;
    powerLed.material.color.setHex(repaired()?0x95eead:0x51665a);
    powerLed.material.emissive.setHex(repaired()?0x388958:0);
    state.bugs.forEach((b,i)=>{
      const {g,hp,fill}=bugs[i];
      g.visible=b.phase==='running'||b.phase==='stopped';
      hp.visible=b.phase==='running';fill.scale.x=.93*b.hp/puzzles[i].enemy.maxHp;fill.position.x=(fill.scale.x-.93)/2;
      if(b.phase!=='running' && !settling[i]){
        g.position.set(b.x,0,b.z);g.rotation.y=b.yaw??0;
        if(b.phase==='stopped')bugs[i].pose(1,0,true);
      }
      helpers[i].visible=b.phase==='leaving';
      helpers[i].position.set(b.x,0,b.z);
      puzzles[i].parts.forEach((part,j)=>{
        const obj=drops[part];
        obj.visible=state.parts[part]==='ground';
        if(!obj.visible)dropLabels[part].visible=false;
        obj.position.set(b.x+(j-(puzzles[i].parts.length-1)/2)*1.0,0,b.z+.35);
        dropLabels[part].position.copy(obj.position);dropLabels[part].position.y=.96;
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
    show(p.enemy.name+' · Отладка',`<p>Исправь выделенные слова Python, сохранив смысл программы.</p><form>
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
      changed();
    };
  }
  function assembly() {
    if(stage.unlocked){
      show('Компьютер работает','<p>Черепаха: «Мои программы снова запускаются! Портал в лабораторию открыт».</p>');
      return;
    }
    if(repaired()){
      if(!state.axe && !state.giftShown){
        if(giftTime===null){dialog.close();pause();giftTime=0}
        return;
      }
      if(state.axe){show('Компьютер работает','<p>«Топором можно добыть древесину из любого ствола. Собери из семи блоков арку на северной стороне острова».</p>');return}
      show('Подарок черепахи','<img src="./assets/inventory-axe.webp" width="96" height="96" alt="Листолун с нефритовым лезвием"><p>«Компьютер работает! Держи Листолун. Этот топор пригодится тебе на протяжении всего приключения. Когда для задания понадобится древесина, ударь им по стволу. Дерево останется целым. Сейчас добудь семь блоков древесины и дострой северную арку. Через неё лежит путь в лабораторию, где ты поможешь починить процессор».</p><button class="field-primary">Принять топор</button>');
      body.querySelector('button').onclick=()=>{
        if(state.axe || !canStore('wood-axe'))return;
        state.axe=true;closingLid=1;turtle.present(1,false);dialog.close();equipAxe();collect();changed();
        notify('Листолун в руке. Подойди к дереву и ударь по стволу левой кнопкой мыши.',7000);
      };
      return;
    }
    show('Верстак черепахи',workbenchView(state.parts));
    bindWorkbench(body,state.parts,i=>{
      state.parts[i]='installed';place();changed();
      if(repaired()){turtle.nod();sync()}
      assembly();
      body.querySelector('[data-part][aria-pressed="true"]')?.focus({preventScroll:true});
    });
  }
  function acknowledgeDelivery(){
    if(!state.met || !state.parts.includes('bag'))return;
    const returned=state.parts.filter(p=>p==='bag' || p==='installed').length;
    if(returned<=(state.acknowledgedParts??0))return;
    state.acknowledgedParts=returned;
    turtle.acknowledge();deliveryLeft=1.05;
  }
  function talk() {
    if(giftTime!==null)return;
    if(!state.met){
      state.met=true;questMark.visible=false;turtle.nod();changed();
      const hasParts=state.parts.includes('bag');
      const started=state.bugs.some((b,i)=>b.hp<puzzles[i].enemy.maxHp);
      const greeting=hasParts?'Это детали моего компьютера! Спасибо, давай установим то, что ты принёс.':
        started?'Эти жуки унесли детали моего компьютера. Спасибо, что помогаешь их вернуть!':
        'Я разобрала компьютер, чтобы найти баг. А их оказалось двое! Пока я проверяла плату, они унесли пять деталей. Поможешь мне их вернуть?';
      const hint=hasParts?'Выбери деталь из рюкзака и установи её в подходящий разъём.':started?repairBrief(stage):'Нажми L для боя. Подойди к жуку и нажимай 1 или ЛКМ. Когда жук остановится, исправь слова в его программе.';
      show('Черепаха-механик',`<p>«${greeting}»</p><p>${hint}</p><button class="field-primary">${hasParts?'К верстаку':'Помогу'}</button>`);
      body.querySelector('button').onclick=hasParts?assembly:()=>dialog.close();
      return;
    }
    acknowledgeDelivery();
    if(deliveryLeft>0){openAfterNod=true;return}
    turtle.nod();
    if(state.parts.includes('bag') || state.parts.includes('installed')) assembly();
    else notify(repairBrief(stage));
  }
  function target() {
    const i=closest(drops,j=>state.parts[j]==='ground',2);
    if(i>=0)return {label:'Подобрать '+pickupNames[i],act(){
      if(!canStore(pcParts[i].id))return;
      state.parts[i]='bag';collect();sync();changed();notify(pcParts[i].name+' в рюкзаке.');
    }};
    const j=closest(bugs.map(b=>b.g),k=>state.bugs[k].phase==='stopped' && !settling[k],3);
    if(j>=0)return {label:'Исправить программу',act:()=>edit(j)};
    if(byBench())return {label:state.met?'Верстак черепахи':'Поговорить с черепахой',act:talk};
  }
  function interact(){const t=target();if(t)t.act();return !!t}
  function attack(withWand=false){
    const i=closest(bugs.map(b=>b.g),j=>{
      if(state.bugs[j].phase!=='running')return false;
      return !withWand || inWandArc(player.position,player.rotation.y,bugs[j].g.position);
    },withWand?Infinity:3.2);
    if(i<0){if(!withWand)notify('Подойди ближе к бегущему багу.');return}
    if(time-lastHit<.25)return;
    lastHit=time;if(!withWand)onHit();
    damageBug(i,UNARMED_DAMAGE);
  }
  function pulseHit(caster,applyDamage){
    let nearest=caster.far, target=-1;
    bugs.forEach(({body},i)=>{
      if(state.bugs[i].phase!=='running')return;
      body.updateWorldMatrix(true,true);
      const hit=caster.intersectObject(body,true)[0];
      if(hit && hit.distance<nearest){nearest=hit.distance;target=i}
    });
    if(applyDamage && target>=0)damageBug(target,STAFF_ATTACK.damage);
    return nearest;
  }
  function damageBug(i,damage){
    const b=state.bugs[i], g=bugs[i].g;
    const hits=(b.hits??(puzzles[i].enemy.maxHp-b.hp)/UNARMED_DAMAGE)+1;
    b.hits=hits;
    b.hp=Math.max(0,b.hp-damage);
    const landing=encounters[i].hit(player.position,hits);
    if(!b.hp){
      const end=landing??g.position;
      b.phase='stopped';b.x=end.x;b.z=end.z;b.yaw=g.rotation.y;
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
        encounters[i].advanceHop(dt,reduced);
        settling[i]=Math.max(0,settling[i]-dt);
        const t=1-settling[i]/settleSeconds;
        pose(reduced?1:.3+.7*(1-(1-t)**3),0,true,0,g.position.y);
        if(!settling[i] && !dialog.open)edit(i);
      }else if(b.phase==='leaving'){
        fade[i]+=dt;const fraction=Math.min(1,fade[i]/1.35),h=helpers[i];
        h.position.y=reduced?0:fraction*.95;h.scale.setScalar(1-fraction*.94);
        if(fraction===1){
          b.phase='gone';puzzles[i].parts.forEach(j=>state.parts[j]='ground');
          sync();notify(puzzles[i].enemy.name+' говорит: «Вот детали!»');changed();
        }
      }
    });
    for(const puzzle of puzzles){
      let nearest=-1,distance=Infinity;
      for(const i of puzzle.parts){
        dropLabels[i].visible=false;
        if(!drops[i].visible)continue;
        const d=drops[i].position.distanceToSquared(player.position);
        if(d<distance){nearest=i;distance=d}
      }
      if(nearest>=0)dropLabels[nearest].visible=true;
    }
    archLabel.visible=state.axe && hasArchWood(stage) && !stage.unlocked;
    const t=target();
    prompt.hidden=!t;
    if(t && prompt.textContent!=='E · '+t.label)prompt.textContent='E · '+t.label;
  }
  prompt.onclick=interact;
  sync();
  return {tick,attack,pulseHit,interact,shoveVelocity:encounters[0].shoveVelocity,
    presenting:()=>giftTime!==null,
    frameGift(){
      camera.position.copy(giftCamera);camera.lookAt(giftFocus);
    },
    dispose(){prompt.hidden=true;prompt.onclick=null;dialog.close()}};
}
