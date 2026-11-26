import { buildBitWall } from './processor-bit-wall.js?v=2';
import { buildKeycapArch } from '../world/keycap-arch.js';
import { createRemontik } from '../world/remontik.js?v=4';
import { buildProcessorSocket } from '../world/processor-socket.js';
import { renderWorkOrder } from './work-order.js';

import { STAFF_ID } from '../catalog/pulse-staff.js';

export const LAB_REWARD_COINS = 15;
const repairOrder = {
  heading: 'Наряд на ремонт',
  title: 'Перезапуск ядра',
  letter: [
    'Слышишь, как тихо? Обычно у этого кулера такой гул, что у меня дрожит линза. Контакты я проверил. Для запуска процессор ждёт всего одну букву — Б.',
    'Я приготовил кубы на стенде. Пока ты собираешь код, я побуду у чипа. Как только биты встанут на свои места, услышим, как он оживёт.',
  ],
  task: 'Подойди к стенду справа от процессора. Жезлом расставь кубы по образцу внизу экрана. Когда оба ряда совпадут, ядро запустится.',
  memo: 'В UTF-8 каждая буква русского алфавита, в том числе Б и ё, занимает два байта. В одном байте 8 бит. На стенде один ряд кубов — один байт.',
  reward: `Импульсный посох, ${LAB_REWARD_COINS} золотых монет и проход через северный портал.`,
  action: 'К стенду',
};

export function createProcessorLab({stage, box, player, dialog, pause, changed, canStore, notify}) {
  const x = stage.center;
  const {core,lights,rotors} = buildProcessorSocket(box,x);
  const robot = createRemontik(core.parent,x+.6,2.25);
  const robotCollider = box(robot.root.position.x,1.10,robot.root.position.z,.88,.82,.76,0x426c52,true);
  robotCollider.visible=false;
  const exitArch = {x: x - 7, z: -7};
  const exitSurface = buildKeycapArch(box,exitArch);
  function lightCore() {
    for (const mesh of lights) {
      mesh.material.color.setHex(stage.unlocked ? 0x81f1cd : 0xe89b62);
      mesh.material.emissive.setHex(stage.unlocked ? 0x228f77 : 0x623824);
    }
    core.material.color.setHex(stage.unlocked ? 0x89aca0 : 0xa6aeaa);
  }
  lightCore();
  const prompt = document.querySelector('#field-action');
  const body = dialog.querySelector('.field-body');
  function success() {
    dialog.querySelector('h2').textContent = 'Процессор запущен';
    body.innerHTML = `<p>«Снова читаю команды! Спасибо, что восстановил мой код. За ремонт ты получил импульсный посох и ${LAB_REWARD_COINS} золотых монет».</p><p>В снаряжении выбери «Бой» → «Оружие» и надень импульсный посох.</p><p>Северный портал открыт. За ним — Остров трёх арок.</p><button type="button" class="field-primary">Продолжить</button>`;
    body.querySelector('button').onclick = ()=>dialog.close();
  }
  const wall = buildBitWall({stage,box,player,notify,launch(){
    if(!canStore(STAFF_ID)){
      notify('Освободи место в рюкзаке и нажми E у доски.');
      return;
    }
    wall.showSample(false);
    pause();
    stage.unlocked=true;
    robot.wave();
    lightCore();
    changed();
    success();
    dialog.showModal();
    body.querySelector('button').focus();
  }});
  function nearRobot(){
    return player.position.y<2 && Math.hypot(player.position.x-robot.root.position.x,player.position.z-robot.root.position.z)<2;
  }
  function interact(){
    if(!nearRobot())return false;
    pause();
    robot.wave();
    if(stage.unlocked){
      success();
    }else{
      stage.metRemontik=true;
      wall.reveal();
      changed();
      renderWorkOrder(dialog,{...repairOrder,sender:robot.root.name});
    }
    dialog.showModal();
    return true;
  }
  prompt.onclick=interact;
  return {exitArch,exitSurface,wall,interact,tick(active,dt,reduced){
    if (stage.unlocked && active && !reduced) {
      for (const rotor of rotors) rotor.rotation.z -= dt*4;
    }
    robot.update(dt,active,reduced,player.position);
    prompt.hidden=!active || !nearRobot();
    if(!prompt.hidden)prompt.textContent='E · Ремонтик, модель 1';
  },dispose(){wall.dispose();prompt.hidden=true;prompt.onclick=null;dialog.close()}};
}
