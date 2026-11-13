const STORAGE_KEY='kub.navigator.speech.v1';
const DEFAULTS={enabled:false,voiceURI:'',rate:1};
export function normalizeSpeechSettings(value){
  return {enabled:value?.enabled===true,voiceURI:typeof value?.voiceURI==='string'&&value.voiceURI!=='@male'?value.voiceURI:'',rate:typeof value?.rate==='number'&&Number.isFinite(value.rate)?Math.max(.75,Math.min(1.25,value.rate)):1};
}
export function splitSpeech(text){
  // Short phrases avoid the long-utterance limit of some browser engines.
  const words=String(text).replaceAll('ЛКМ','левой кнопкой мыши').replaceAll('ПКМ','правой кнопкой мыши').replace(/\bE\b/g,'клавишу Е').trim().split(/\s+/u);const chunks=[];let chunk='';
  for(const word of words){if(chunk.length+word.length>200&&chunk){chunks.push(chunk);chunk=''}chunk+=(chunk?' ':'')+word}
  if(chunk)chunks.push(chunk);return chunks;
}
export function createSpeechController({synth,Utterance,storage,onState=()=>{},onVoices=()=>{}}){
  let settings={...DEFAULTS};try{settings=normalizeSpeechSettings(JSON.parse(storage.getItem(STORAGE_KEY)))}catch{}
  const supported=!!synth&&typeof synth.speak==='function'&&typeof synth.cancel==='function'&&typeof synth.getVoices==='function'&&typeof Utterance==='function';
  let voices=[],generation=0,current=null,disposed=false;
  function refresh(){if(disposed)return;try{voices=supported?synth.getVoices().filter(v=>/^ru(?:[-_]|$)/i.test(v.lang)&&/^Google\b/i.test(v.name||'')).slice(0,1):[]}catch{voices=[]}onVoices(voices.slice());}
  function stop(){generation++;current=null;if(supported)synth.cancel();onState('idle');}
  function configure(patch){stop();settings=normalizeSpeechSettings({...settings,...patch});try{storage.setItem(STORAGE_KEY,JSON.stringify(settings));return true}catch{return false}}
  function speak(text){
    stop();if(!supported){onState('unsupported');return false}
    refresh();const voice=voices.find(v=>v.voiceURI===settings.voiceURI)||voices[0];
    if(!voice){onState('no-voice');return false}
    const chunks=splitSpeech(text);if(!chunks.length)return false;
    const token=generation;
    function next(){
      if(disposed||token!==generation)return;
      const phrase=chunks.shift();if(!phrase){current=null;onState('idle');return}
      const utterance=new Utterance(phrase);current=utterance;utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=settings.rate;utterance.pitch=1;utterance.volume=1;
      utterance.onend=()=>{if(current===utterance)next()};
      utterance.onerror=event=>{if(token!==generation||current!==utterance)return;generation++;current=null;onState(event.error==='not-allowed'?'not-allowed':'error')};
      try{onState('speaking');synth.speak(utterance)}catch{if(token===generation){current=null;onState('error')}}
    }
    next();return true;
  }
  if(supported)synth.addEventListener?.('voiceschanged',refresh);
  refresh();
  return {supported,get settings(){return {...settings}},get voices(){return voices.slice()},configure,speak,stop,refresh,
    autoSpeak(text){if(settings.enabled)return speak(text);return false},
    dispose(){disposed=true;stop();if(supported)synth.removeEventListener?.('voiceschanged',refresh)},
  };
}

export function createNavigatorSpeech({dialog,getText}){
  const section=document.createElement('section');section.className='navigator-speech';section.setAttribute('aria-label','Голос Навигатора');
  section.innerHTML=`<div class="speech-heading"><span>ГОЛОС НАВИГАТОРА</span><label class="speech-enable"><input id="speech-enabled" type="checkbox"> Читать ответы вслух</label></div><div class="speech-settings"><label for="speech-voice">Русский голос<select id="speech-voice"></select></label><label for="speech-rate">Скорость <output id="speech-rate-value" for="speech-rate">1×</output><input id="speech-rate" type="range" min="0.75" max="1.25" step="0.05" value="1"></label></div><div class="speech-actions"><button id="speech-preview" type="button">Прослушать голос</button><button id="speech-repeat" type="button">▶ Повторить ответ</button><button id="speech-stop" type="button" disabled>■ Остановить</button></div><p id="speech-status" role="status"></p><p id="speech-storage" hidden>Настройки действуют до перезагрузки: браузер не разрешил их сохранить.</p>`;
  dialog.querySelector('.navigator-actions').before(section);
  const $=s=>section.querySelector(s);let controller,storage;try{storage=localStorage}catch{}
  const messages={idle:'Озвучивание — по вашему выбору. Текст ответа всегда остаётся на экране.',speaking:'Навигатор говорит…',unsupported:'Этот браузер не поддерживает озвучивание. Ответ можно прочитать выше.','no-voice':'Google русский пока недоступен в этом браузере. Текст ответа остаётся доступным.','not-allowed':'Браузер не разрешил воспроизведение. Нажмите «Повторить ответ».',error:'Не удалось озвучить ответ. Попробуйте повторить или выберите другой голос.'};
  function state(value){$('#speech-status').textContent=messages[value];$('#speech-stop').disabled=value!=='speaking';section.classList.toggle('is-speaking',value==='speaking')}
  function renderVoices(voices){
    const select=$('#speech-voice'),preferred=controller?.settings.voiceURI;
    select.replaceChildren();const automatic=document.createElement('option');automatic.value='';automatic.textContent='Автоматически · русский голос';select.append(automatic);
    if(!voices.length){const missing=document.createElement('option');missing.value='';missing.textContent='Google русский · недоступен';missing.disabled=true;select.append(missing)}
    for(const voice of voices){const option=document.createElement('option');option.value=voice.voiceURI;option.textContent=voice.name+(voice.localService?' · на устройстве':' · онлайн');select.append(option)}
    select.value=voices.some(v=>v.voiceURI===preferred)?preferred:'';
    select.disabled=!voices.length;$('#speech-preview').disabled=!voices.length;$('#speech-repeat').disabled=!voices.length;
  }
  controller=createSpeechController({synth:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,storage,onState:state,onVoices:renderVoices});
  $('#speech-enabled').checked=controller.settings.enabled;$('#speech-enabled').disabled=!controller.supported;$('#speech-rate').value=controller.settings.rate;$('#speech-rate').disabled=!controller.supported;
  const rateLabel=()=>$('#speech-rate-value').textContent=Number($('#speech-rate').value).toLocaleString('ru-RU')+'×';rateLabel();renderVoices(controller.voices);
  function save(patch){$('#speech-storage').hidden=controller.configure(patch)}
  $('#speech-enabled').onchange=()=>{save({enabled:$('#speech-enabled').checked});if(controller.settings.enabled)controller.speak(getText())};
  $('#speech-voice').onchange=()=>save({voiceURI:$('#speech-voice').value});
  $('#speech-rate').oninput=()=>{rateLabel();save({rate:Number($('#speech-rate').value)})};

  $('#speech-preview').onclick=()=>controller.speak('Привет! Я твой Навигатор. Давай собирать кубы, исследовать острова и учиться вместе.');
  $('#speech-repeat').onclick=()=>controller.speak(getText());$('#speech-stop').onclick=()=>controller.stop();
  dialog.addEventListener('close',()=>controller.stop());dialog.addEventListener('cancel',()=>controller.stop());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)controller.stop()});window.addEventListener('pagehide',()=>controller.stop());
  const initializeStatus=()=>state(!controller.supported?'unsupported':!controller.voices.length?'no-voice':'idle');initializeStatus();
  // Voice lists may arrive after the dialog is already open; do not auto-start then.
  window.speechSynthesis?.addEventListener?.('voiceschanged',()=>{if(!section.classList.contains('is-speaking'))initializeStatus()});
  return {greet(){controller.speak('Привет!')},open(){controller.refresh();initializeStatus();controller.autoSpeak(getText())},stop:()=>controller.stop()};
}
