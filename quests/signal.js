
export function createSignalStation({stage,box,player,pause,changed}) {
  const x=40,z=2;
  const names=['Указатели выключены','Песчаник','Дерево','Камень'];
  const prompt=document.querySelector('#field-action'), dialog=document.querySelector('#workshop-dialog');
  box(x,.50,z,1.4,1,.76,0x836d50,true);
  box(x,1.03,z,1.54,.13,.86,0x436758);
  const switches=[-.32,.32].map(dx=>box(x+dx,1.14,z,.43,.13,.38,0xb0bb98));
  const lamps=[33,39,45].map(end=>[.3,.65,1].map(t=>box(x+(end-x)*t,.055,z+2.5*t,.37,.10,.28,0x748174)));
  let elapsed=0;
  function renderLights() {
    switches.forEach((m,i)=>m.material.color.setHex(stage.signal & (2>>i) ? 0xffdf8a:0x879c8a));
    lamps.forEach((row,i)=>row.forEach((m,j)=>m.material.color.setHex(stage.signal===i+1 && elapsed>=j*.14 ? 0xffd878:0x748174)));
  }
  function near(){return player.position.y<2 && Math.hypot(player.position.x-x,player.position.z-z)<2.25}
  function interact(){
    if(!near())return false;
    pause();dialog.querySelector('h2').textContent='Станция кодирования';
    const body=dialog.querySelector('.field-body');
    body.innerHTML='<p>Включи указатель к дереву. Каждая клавиша меняет один бит.</p><div class="signal-key"><span>01 · Песчаник</span><span>10 · Дерево</span><span>11 · Камень</span></div><div class="signal-bits"><button></button><button></button></div><p role="status"></p>';
    const buttons=[...body.querySelectorAll('.signal-bits button')];
    function display(){
      buttons.forEach((b,i)=>{const value=(stage.signal>>(1-i))&1;b.textContent=value;b.setAttribute('aria-label',(i?'Правый':'Левый')+' бит · '+value);b.setAttribute('aria-pressed',String(!!value))});
      body.querySelector('[role=status]').textContent=names[stage.signal]+(stage.signal===2?' · сигнал принят!':'');
    }
    buttons.forEach((b,i)=>b.onclick=()=>{
      stage.signal^=2>>i;elapsed=0;
      if(stage.signal===2)stage.sentWood=true;
      if(stage.sentWood && stage.built.size===stage.targets.length)stage.unlocked=true;
      display();renderLights();changed();
    });
    display();dialog.showModal();return true;
  }
  prompt.onclick=interact;
  renderLights();
  return {interact,tick(dt,active,reduced){
    if(elapsed<1){elapsed+=reduced?1:dt;renderLights()}
    prompt.hidden=!active||!near();
    if(!prompt.hidden && prompt.textContent!=='E · Станция кодирования')prompt.textContent='E · Станция кодирования';
  },dispose(){prompt.hidden=true;prompt.onclick=null;dialog.close()}};
}
