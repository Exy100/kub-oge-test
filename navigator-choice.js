import { NAVIGATORS, loadNavigator, saveNavigator, renderNavigatorPortraits } from './navigator-model.js?v=11';

export function createNavigatorChoice({onChange,onOpen}){
  let storage;try{storage=localStorage}catch{}
  let selected=loadNavigator(storage);
  const images=renderNavigatorPortraits();
  const welcome=document.querySelector('#welcome .modal');
  welcome.classList.add('navigator-welcome');
  welcome.querySelector('.eyebrow').textContent='ВЫБЕРИ СВОЕГО СПУТНИКА';
  welcome.querySelector('h2').textContent='Вместе интереснее.';
  const paragraphs=welcome.querySelectorAll(':scope > p');
  paragraphs[0].textContent='Кто отправится с тобой на остров? Все четыре Навигатора помогут с заданиями — выбирай того, кто нравится. Позже выбор можно изменить.';
  const controls=document.createElement('details');controls.className='start-controls';controls.innerHTML='<summary>Управление и маршрут</summary>';
  paragraphs[1].before(controls);controls.append(paragraphs[1]);
  const choices=document.createElement('div');choices.className='navigator-choices';choices.setAttribute('role','group');choices.setAttribute('aria-label','Выбор Навигатора');controls.before(choices);
  const status=document.createElement('p');status.className='navigator-choice-status';status.setAttribute('aria-live','polite');controls.before(status);
  const dialog=document.createElement('dialog');dialog.id='navigator-choice-dialog';dialog.className='panel-dialog';dialog.setAttribute('aria-labelledby','navigator-choice-title');
  dialog.innerHTML='<div class="paths-heading"><div><div class="eyebrow">ТВОЯ КОМАНДА</div><h2 id="navigator-choice-title">Выбери Навигатора</h2></div><button aria-label="Закрыть выбор Навигатора">×</button></div><p>Меняется только помощник. Прогресс островов останется с тобой.</p><div class="navigator-choices" role="group" aria-label="Выбор Навигатора"></div><p class="navigator-choice-status" aria-live="polite"></p>';
  document.body.append(dialog);dialog.querySelector('.paths-heading button').onclick=()=>dialog.close();
  const grids=[choices,dialog.querySelector('.navigator-choices')];
  function portrait(id,cls='navigator-portrait'){return `<img class="${cls}" src="${images[id]}" alt="" draggable="false">`}
  function render(){
    for(const grid of grids){
      grid.innerHTML=NAVIGATORS.map(n=>`<button type="button" class="navigator-choice" data-navigator="${n.id}" aria-pressed="${n.id===selected}" style="--robot-accent:${n.color}"><span class="robot-number">№${n.id}</span>${portrait(n.id,'robot-preview')}<strong>${n.name}</strong><span class="robot-description">${n.description}</span><span class="robot-choice-mark">${n.id===selected?'✓ Выбран':'Выбрать'}</span></button>`).join('');
      grid.querySelectorAll('button').forEach(button=>button.onclick=()=>{
        selected=Number(button.dataset.navigator);const saved=saveNavigator(storage,selected);render();
        document.querySelectorAll('.navigator-choice-status').forEach(el=>el.textContent=saved?'Выбор сохранён. Можно отправляться!':'Выбор действует в этой игре. Браузер не разрешил сохранить его.');
        onChange(selected,portrait(selected));
        // Re-rendered buttons retain keyboard focus at the chosen card.
        grid.querySelector(`[data-navigator="${selected}"]`).focus({preventScroll:true});
      });
    }
    document.querySelector('#play').disabled=selected===null;
    document.querySelectorAll('.navigator-choice-status').forEach(el=>el.textContent=selected===null?'Выбери одного из четырёх помощников.':`Твой Навигатор — ${NAVIGATORS.find(n=>n.id===selected).name}.`);
  }
  render();
  return {portrait:()=>portrait(selected??27),selected:()=>selected,open(){onOpen();dialog.showModal()},isOpen:()=>dialog.open};
}
