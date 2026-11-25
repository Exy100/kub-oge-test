import { buildKeycapArch } from '../world/keycap-arch.js';
import { createRemontik } from '../world/remontik.js?v=3';
import { buildProcessorSocket } from '../world/processor-socket.js';

const reference = Array.from(new TextEncoder().encode('Б'), byte => byte.toString(2).padStart(8,'0'));
const expected = reference.join('');
export const WEAPON_KIT = 'reward.weapon-kit';

export function createProcessorLab({stage, box, player, dialog, pause, changed, canStore}) {
  const x = stage.center;
  const {core,lights,rotors} = buildProcessorSocket(box,x);
  const robot = createRemontik(core.parent,x+.6,2.25);
  const robotCollider = box(robot.root.position.x,1.10,robot.root.position.z,.88,.82,.76,0x426c52,true);
  robotCollider.visible=false;
  const deskX = x+3.45, deskZ = 1;
  box(deskX,.54,deskZ,1.36,1.08,.85,0x45665f,true);
  box(deskX,1.09,deskZ,1.6,.12,1,0x68817b);
  const display = box(deskX,1.37,deskZ-.24,1.14,.48,.12,0x386376);
  for(let i=0;i<4;i++)box(deskX+(i-1.5)*.29,1.17,deskZ+.16,.2,.07,.18,0xd3b277);
  const exitArch = {x: x - 7, z: -7};
  const exitSurface = buildKeycapArch(box,exitArch);
  function lightCore() {
    for (const mesh of [...lights,display]) {
      mesh.material.color.setHex(stage.unlocked ? 0x81f1cd : 0xe89b62);
      mesh.material.emissive.setHex(stage.unlocked ? 0x228f77 : 0x623824);
    }
    core.material.color.setHex(stage.unlocked ? 0x89aca0 : 0xa6aeaa);
  }
  lightCore();
  stage.codeBits ??= Array.from('1110000010010010');
  const prompt = document.querySelector('#field-action');
  const body = dialog.querySelector('.field-body');
  function near() {
    return player.position.y < 2 && Math.hypot(player.position.x-deskX,player.position.z-deskZ)<2.35;
  }
  function success() {
    dialog.querySelector('h2').textContent = 'Процессор запущен';
    body.innerHTML = '<p>«Снова читаю команды! Спасибо, что восстановил мой код. Оружейный набор теперь у тебя в рюкзаке».</p><p>Северный портал открыт. За ним — Остров трёх арок.</p><button type="button" class="field-primary">Продолжить</button>';
    body.querySelector('button').onclick = ()=>dialog.close();
  }
  function puzzle() {
    dialog.querySelector('h2').textContent = 'Ремонт кода процессора';
    body.innerHTML = '<p>Для запуска ядро ждёт букву <b>Б</b>. В UTF-8 каждая буква русского алфавита, включая Ё и ё, занимает два байта по восемь бит. У других кириллических символов длина может отличаться.</p><p>Перетащи бит на другой, чтобы поменять их местами. Можно также выбрать два бита по очереди.</p><div class="processor-bytes"></div><p role="status"></p><button type="button" class="field-primary">Запустить процессор</button>';
    const rows = body.querySelector('.processor-bytes');
    const status = body.querySelector('[role=status]');
    const buttons = [];
    let selected = null;
    function render() {
      buttons.forEach((button,i)=>{
        button.textContent = stage.codeBits[i];
        button.setAttribute('aria-pressed',String(i===selected));
        button.setAttribute('aria-label',`Байт ${1+Math.floor(i/8)}, бит ${1+i%8}, значение ${stage.codeBits[i]}`);
      });
    }
    function exchange(from,to) {
      const bits = stage.codeBits;
      [bits[from],bits[to]] = [bits[to],bits[from]];
      selected = null;
      status.textContent = '';
      render();
    }
    reference.forEach((byte,row)=>{
      const group = document.createElement('fieldset');
      group.innerHTML = `<legend>Байт ${row+1} · образец <code>${byte}</code></legend><div></div>`;
      rows.append(group);
      for(let col=0;col<8;col++){
        const i = 8*row+col;
        const button = document.createElement('button');
        button.type = 'button';
        button.draggable = true;
        button.onclick = ()=>{
          if(selected!==null)exchange(selected,i);
          else {selected=i;render()}
        };
        button.ondragstart = e=>{
          selected=i;render();
          e.dataTransfer.setData('text/plain',String(i));
          e.dataTransfer.effectAllowed='move';
        };
        button.ondragover = e=>e.preventDefault();
        button.ondrop = e=>{e.preventDefault();if(selected!==null)exchange(selected,i)};
        button.ondragend = ()=>{selected=null;render()};
        group.lastElementChild.append(button);
        buttons.push(button);
      }
    });
    render();
    body.querySelector('.field-primary').onclick = ()=>{
      if(stage.codeBits.join('')!==expected) {
        const index = stage.codeBits.findIndex((bit,i)=>bit!==expected[i]);
        status.textContent = `Ядро ждёт букву Б. Сверь байт ${1+Math.floor(index/8)} с образцом слева направо.`;
        buttons[index].focus();
        return;
      }
      if(!canStore(WEAPON_KIT)){status.textContent='Освободи место в рюкзаке для оружейного набора и повтори запуск.';return}
      stage.unlocked=true;robot.wave();
      lightCore();changed();success();
      body.querySelector('button').focus();
    };
  }
  function nearRobot(){
    return player.position.y<2 && Math.hypot(player.position.x-robot.root.position.x,player.position.z-robot.root.position.z)<2;
  }
  function interact(){
    if(!near()){
      if(!nearRobot())return false;
      pause();robot.wave();
      dialog.querySelector('h2').textContent=robot.root.name;
      body.innerHTML=stage.unlocked
        ? '<p>Спасибо! Слышишь, как заработал кулер? Через северный портал можно идти дальше.</p>'
        : '<p>Привет! Я Ремонтик, модель 1. Чип я проверил. Теперь поможешь с кодом? На пульте рядом со мной восстанови два байта буквы Б.</p>';
      dialog.showModal();
      return true;
    }
    pause();
    if(stage.unlocked)success();else puzzle();
    dialog.showModal();
    return true;
  }
  prompt.onclick=interact;
  return {exitArch,exitSurface,interact,tick(active,dt,reduced){
    if (stage.unlocked && active && !reduced) {
      for (const rotor of rotors) rotor.rotation.z -= dt*4;
    }
    robot.update(dt,active,reduced,player.position);
    prompt.hidden=!active || !(near() || nearRobot());
    if(!prompt.hidden)prompt.textContent=near()?'E · Пульт процессора':'E · Ремонтик, модель 1';
  },dispose(){prompt.hidden=true;prompt.onclick=null;dialog.close()}};
}
