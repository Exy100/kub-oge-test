import {test} from 'node:test';import assert from 'node:assert/strict';
import {createSpeechController,normalizeSpeechSettings,splitSpeech} from '../navigator-speech.js';
function fixture(extra={}){const spoken=[],states=[],events={};let saved=null;const synth={getVoices:()=>[{voiceURI:'en',lang:'en-US'},{voiceURI:'ru1',name:'Google русский',lang:'ru-RU'},{voiceURI:'ru2',name:'Милена',lang:'ru_RU'}],cancel(){this.cancels=(this.cancels||0)+1},speak(u){spoken.push(u)},addEventListener(k,f){events[k]=f},removeEventListener(k){delete events[k]}};class Utterance{constructor(text){this.text=text}}
 const c=createSpeechController({synth,Utterance,storage:{getItem:()=>saved,setItem:(_,v)=>saved=v},onState:s=>states.push(s),...extra});return {c,synth,spoken,states,events}}
test('opt-in, Russian voice, speed and neutral pitch',()=>{const {c,spoken}=fixture();c.autoSpeak('Ответ');assert.equal(spoken.length,0);c.configure({enabled:true,voiceURI:'ru1',rate:1.2});c.autoSpeak('Ответ');assert.equal(spoken[0].voice.voiceURI,'ru1');assert.equal(spoken[0].rate,1.2);assert.equal(spoken[0].pitch,1);assert.equal(spoken[0].lang,'ru-RU')});
test('new answer replaces queue; late cancellation callbacks cannot restart old answer',()=>{const {c,spoken}=fixture();c.speak('предыдущий '.repeat(70));const old=spoken[0];c.speak('Новый ответ');old.onend();old.onerror({error:'canceled'});assert.equal(spoken.length,2);assert.equal(spoken[1].text,'Новый ответ');c.stop();spoken[1].onend();assert.equal(spoken.length,2)});
test('long responses play sequentially, errors stop remaining chunks',()=>{const {c,spoken,states}=fixture();c.speak('слово '.repeat(100));assert.equal(spoken.length,1);spoken[0].onend();assert.equal(spoken.length,2);spoken[1].onerror({error:'not-allowed'});spoken[1].onend();assert.equal(spoken.length,2);assert.equal(states.at(-1),'not-allowed')});
test('voices can load asynchronously; no unsolicited playback',()=>{const {c,synth,spoken,events,states}=fixture();synth.getVoices=()=>[];events.voiceschanged();assert.equal(c.speak('Тест'),false);assert.equal(states.at(-1),'no-voice');synth.getVoices=()=>[{voiceURI:'loaded',name:'Google русский',lang:'ru-RU'}];events.voiceschanged();assert.equal(spoken.length,0);c.speak('Тест');assert.equal(spoken[0].voice.voiceURI,'loaded');c.dispose();assert.equal(events.voiceschanged,undefined)});
test('corrupt, blocked storage and unsupported browsers do not break text game',()=>{const {c,spoken}=fixture({storage:{getItem(){throw Error()},setItem(){throw Error()}}});assert.equal(c.configure({rate:9}),false);c.speak('Тест');assert.equal(spoken[0].rate,1.25);const unsupported=createSpeechController({});assert.equal(unsupported.supported,false);assert.equal(unsupported.speak('Тест'),false);assert.deepEqual(normalizeSpeechSettings({enabled:'yes',rate:NaN,voiceURI:8}),{enabled:false,arrivals:true,portals:true,rate:1,voiceURI:''});assert.equal(splitSpeech('').length,0);assert(splitSpeech('ЛКМ по кубу')[0].includes('левой кнопкой мыши'))});
test('only Google Russian remains; previous male preference migrates to automatic',()=>{
 const {c,synth,spoken,states}=fixture();assert.equal(c.voices.length,1);c.speak('Привет');assert.equal(spoken[0].voice.name,'Google русский');synth.getVoices=()=>[{voiceURI:'milena',name:'Милена',lang:'ru-RU'}];assert.equal(c.speak('Привет'),false);assert.equal(states.at(-1),'no-voice');assert.equal(normalizeSpeechSettings({voiceURI:'@male'}).voiceURI,'');
});

test('portal mute persists independently and leaving a portal only stops its own line',()=>{
  assert.equal(normalizeSpeechSettings({enabled:false}).portals,false);
  assert.equal(normalizeSpeechSettings({enabled:true,portals:false}).portals,false);
  const {c,synth}=fixture();
  c.speak('Портал открыт.','portal');
  const before=synth.cancels;
  c.stop('portal');
  assert.equal(synth.cancels,before+1);
  c.speak('Задание острова.');
  const duringQuest=synth.cancels;
  c.stop('portal');
  assert.equal(synth.cancels,duringQuest);
});

test('arrival narration defaults on for new players and respects saved mute preferences', () => {
  assert.equal(normalizeSpeechSettings(null).arrivals, true);
  assert.equal(normalizeSpeechSettings({enabled:false}).arrivals, false);
  assert.equal(normalizeSpeechSettings({enabled:true, arrivals:false}).arrivals, false);
  assert.equal(normalizeSpeechSettings({enabled:false, arrivals:true}).arrivals, true);
});
