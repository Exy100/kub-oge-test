const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

(async () => {
  const repo = path.resolve(__dirname, '..');
  const server = spawn('python3', ['-m','http.server','8091','--bind','127.0.0.1'], {cwd:repo,stdio:'ignore'});
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
    await page.addInitScript(() => {
      localStorage.setItem('kub.navigator.v1','27');
      // Drive one complete game frame after each simulated time interval.
      window.requestAnimationFrame = () => 0;
      const api = new EventTarget();
      api.available = false;
      api.calls = [];
      api.getVoices = () => api.available ? [{name:'Google русский',lang:'ru-RU',voiceURI:'ru'}] : [];
      api.speak = utterance => api.calls.push(utterance);
      api.cancel = () => {};
      Object.defineProperty(window,'speechSynthesis',{value:api});
      Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {constructor(text){this.text=text}}});
    });
    await page.route('**/game.js*', route => route.fulfill({contentType:'text/javascript',
      body:fs.readFileSync(path.join(repo,'game.js'),'utf8') + `
        window.stepGame = () => frame(performance.now());
        window.atGate = forward => {
          if (forward) {
            if (stage.index === 2) forge.state.unlocked = true;
            else stage.unlocked = true;
            player.position.set([0,40,86][stage.index],0,[-1,-2,-4][stage.index]);
          } else player.position.set(stage.center+6,0,6);
        };
      `}));
    const tick = async ms => { await page.clock.fastForward(ms); await page.evaluate(() => stepGame()); };
    const lines = () => page.evaluate(() => speechSynthesis.calls.map(u=>u.text));
    const button = sel => page.locator(sel).evaluate(el=>el.click());
    const gate = async forward => {
      await page.evaluate(direction=>atGate(direction),forward);
      await page.keyboard.press('e');
    };
    const speakersReady = () => page.evaluate(()=>{
      speechSynthesis.available=true;
      speechSynthesis.dispatchEvent(new Event('voiceschanged'));
    });
    await page.goto('http://127.0.0.1:8091');
    await tick(5000);
    assert.deepEqual(await lines(),[]);
    await button('#play');
    await tick(2999);
    assert.deepEqual(await lines(),[]);
    await tick(1000); // voice list arrives after the deadline
    await speakersReady();
    await page.evaluate(()=>{
      document.querySelector('#quest-panel').hidden=true;
      document.querySelector('#count').textContent='91 / 97';
      document.querySelector('#arch-status').textContent='Статистика 88';
      document.querySelector('.tip').textContent='Подробная инструкция';
    });
    await tick(1);
    const first='Собери семь кубов песчаника и построй арку.';
    assert.deepEqual(await lines(),[first]);
    await tick(10000);
    assert.deepEqual(await lines(),[first]);
    const stale=await page.evaluateHandle(()=>speechSynthesis.calls[0]);
    await gate(true);
    await tick(2999);
    assert.deepEqual(await lines(),[first]);
    await tick(1);
    const second='Построй три арки из песчаника, дерева и камня.';
    assert.deepEqual(await lines(),[first,second]);
    await stale.evaluate(u=>u.onend());
    await gate(false);
    await tick(100);
    await gate(true);
    await tick(100);
    await gate(true);
    await button('#guide-button');
    await tick(3100);
    assert.deepEqual(await lines(),[first,second], 'an open window defers the brief');
    await button('.guide-close');
    await tick(16);
    assert.deepEqual(await lines(),[first,second,'Собери биты, создай четыре байта и выложи их у арки.']);
    await gate(true);
    await tick(3000);
    assert.equal((await lines()).at(-1),'Исследуй Сад открытий.');
    await gate(false);
    await tick(3000);
    assert.equal((await lines()).at(-1),'Пройди через открытый портал на следующий остров.');
    await button('#navigator-button');
    await button('#arrival-speech-enabled');
    await button('#navigator-resume');
    const count=(await lines()).length;
    await gate(true);
    await tick(6000);
    assert.equal((await lines()).length,count);
    await page.reload();
    await speakersReady();
    await button('#greeting-enabled');
    await button('#play');
    await tick(6000);
    assert.deepEqual(await lines(),[]);
    await button('#navigator-button');
    assert.equal(await page.locator('#arrival-speech-enabled').isChecked(),false);
    await button('#arrival-speech-enabled');
    await button('#navigator-resume');
    const restartClick = selector => page.locator(selector).evaluate(el =>
      el.dispatchEvent(new MouseEvent('click',{detail:1,button:0,bubbles:true})));
    await restartClick('#reset');
    await restartClick('#restart-confirm');
    await tick(2999);
    assert.deepEqual(await lines(),[]);
    await tick(1);
    assert.deepEqual(await lines(),[first], 'confirmed restart announces one fresh objective');
    await tick(2000);
    assert.deepEqual(await lines(),[first]);
    assert.deepEqual(errors,[]);
    console.log('PASS arrival delay, late voices, exact briefs, once per visit, rapid travel, completed quest, persistent mute');
  } finally { await browser?.close(); server.kill(); }
})().catch(error=>{console.error(error);process.exitCode=1});
