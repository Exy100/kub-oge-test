const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

(async () => {
  const repo = path.resolve(__dirname,'..');
  const server = spawn('python3',['-m','http.server','8151','--bind','127.0.0.1'],{cwd:repo,stdio:'ignore'});
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror',err=>errors.push(err.message));
    await page.clock.install({time:new Date('2026-11-20T20:57:00Z')});
    await page.clock.pauseAt(new Date('2026-11-20T20:58:00Z'));
    await page.addInitScript(()=>{
      requestAnimationFrame = () => 0;
      localStorage.setItem('kub.navigator.v1','27');
      localStorage.setItem('kub.navigator.speech.v1',JSON.stringify({enabled:true,arrivals:false}));
      const synth = new EventTarget();
      synth.lines=[];
      synth.getVoices=()=>[{name:'Google русский',lang:'ru-RU',voiceURI:'ru'}];
      synth.speak=u=>synth.lines.push(u.text);
      synth.cancel=()=>{};
      Object.defineProperty(window,'speechSynthesis',{value:synth});
      Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {constructor(text){this.text=text}}});
    });
    const source = file=>fs.readFileSync(path.join(repo,file),'utf8');
    await page.route('**/skills/explorer-scan.js',r=>r.fulfill({contentType:'text/javascript',
      body:source('skills/explorer-scan.js').replaceAll('random = Math.random','random = () => 0')}));
    await page.route('**/game.js*',r=>r.fulfill({contentType:'text/javascript',body:source('game.js')+`
      window.scanTest={
        step(){frame(performance.now())},
        aim(x,z){
          const px = Math.max(-10,Math.min(10,x)), pz = z > 7 ? z-2 : z+2;
          player.position.set(px,0,pz);
          yaw=Math.atan2(px-x,pz-z);pitch=Math.atan2(1.5,Math.hypot(px-x,pz-z));this.step();
        },
        markers:()=>island.getObjectsByProperty('isMesh',true)
          .filter(mesh=>mesh.userData.scanKey).map(mesh=>mesh.userData.scanKey).sort(),
        saved:()=>scanStore.state,
        solve:correct=>scanner.submitVerifiedAnswer(correct),
        travel:index=>goToIsland(index,'Переход'),
      };`}));
    const tick = async ms => {await page.clock.fastForward(ms);await page.evaluate(()=>scanTest.step())};
    const aim = (x,z) => page.evaluate(([x,z])=>scanTest.aim(x,z),[x,z]);
    const press = key => page.keyboard.press(key);
    const click = sel => page.locator(sel).evaluate(el=>el.click());
    const entries = () => page.evaluate(()=>scanTest.saved().locations['island.dreamers']?.cells ?? {});
    const balance = () => page.evaluate(()=>scanTest.saved().coins);
    async function scan(x,z,key='Digit0'){
      await aim(x,z);await press(key);await tick(3001);
      await page.waitForFunction(k=>scanTest.saved().locations['island.dreamers']?.cells[k],x+','+z,{polling:50});
    }
    const dialog = page.locator('#scan-dialog');
    await page.goto('http://127.0.0.1:8151');
    await click('#play');
    await press('Digit0');
    assert.match(await page.locator('#message').textContent(),/первого лица/);
    await press('KeyV');await press('KeyL');await press('Digit0');
    assert.match(await page.locator('#message').textContent(),/режим сборки/);
    await press('KeyL');await aim(0,3);await press('Digit0');
    await tick(1200);await press('KeyV');await tick(2200);
    assert.deepEqual(await entries(),{});
    assert.equal(await page.locator('#scan-progress').isVisible(),false);
    await press('KeyV');await aim(0,3);await press('Digit0');
    await tick(2900);
    assert(await page.locator('#scan-progress').isVisible());
    assert.deepEqual(await entries(),{});
    await tick(101);
    await page.waitForFunction(()=>scanTest.saved().locations['island.dreamers'],null,{polling:50});
    assert.equal((await entries())['0,3'].kind,'coin');
    assert.equal(await balance(),0);
    await press('Digit0');
    assert.match(await page.locator('#navigator-greeting').innerText(),/уже просканирована/);
    assert.match(await page.evaluate(()=>speechSynthesis.lines.at(-1)),/уже просканирована/);
    await page.mouse.click(600,350);
    await page.waitForFunction(()=>scanTest.saved().coins===1,null,{polling:50});
    await scan(1,3,'Numpad0');
    await press('KeyE');
    assert(await dialog.isVisible());
    assert.match(await dialog.innerText(),/Скоро здесь будет задание по работе с таблицами/);
    assert.equal(await page.evaluate(()=>scanTest.solve(false)),0);
    await click('#scan-dialog button');
    await page.evaluate(()=>scanTest.travel(1));
    await press('Digit0');
    assert.match(await page.locator('#message').textContent(),/Острове мечтателей/);
    await page.evaluate(()=>scanTest.travel(0));
    await aim(1,3);await press('KeyE');assert(await dialog.isVisible());
    await press('Escape');
    await page.locator('#reset').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{detail:1,button:0})));
    await page.locator('#restart-confirm').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{detail:1,button:0})));
    await aim(0,3);await press('Digit0');
    assert.match(await page.locator('#navigator-greeting').innerText(),/уже просканирована/);
    await page.reload();
    await click('#play');await press('KeyV');await aim(1,3);
    await press('KeyE');
    assert.equal(await balance(),1);
    assert.equal(await page.evaluate(()=>scanTest.solve(true)),20);
    assert.equal(await dialog.isVisible(),false);
    await press('KeyE');assert.equal(await dialog.isVisible(),false);
    await scan(2,3);
    assert.equal((await entries())['2,3'].kind,'empty');
    await tick(121000);
    assert.deepEqual(await entries(),{});
    assert.equal(await balance(),21);
    await scan(0,3);
    assert.equal((await entries())['0,3'].kind,'coin');
    await scan(1,3);
    await press('KeyE');
    assert(await dialog.isVisible());
    await tick(86400000);
    assert.equal(await dialog.isVisible(),false);
    assert.equal(await page.evaluate(()=>scanTest.solve(true)),0);
    assert.equal(await balance(),21);
    const menu = page.locator('#cheat-menu');
    async function openMenu(){
      await page.keyboard.down('KeyQ');await press('KeyA');await page.keyboard.up('KeyQ');
    }
    async function toggle(label){
      const button = menu.getByRole('button',{name:label,exact:true});
      await button.evaluate(el=>el.click());
      await page.waitForFunction(()=>!document.querySelector('[data-scan]').disabled,null,{polling:50});
    }
    const markers = () => page.evaluate(()=>scanTest.markers());
    await openMenu();
    await toggle('Показать призы');
    const prizes = await page.evaluate(()=>scanTest.saved().locations['island.dreamers'].hiddenPrizes);
    const prizeKeys = Object.keys(prizes).sort();
    assert.equal(prizeKeys.length,2);
    assert.deepEqual(await markers(),prizeKeys);
    assert.deepEqual(await entries(),{});
    await toggle('Скрыть призы');
    assert.deepEqual(await markers(),[]);
    await toggle('Показать призы');
    assert.deepEqual(await markers(),prizeKeys);
    await press('Escape');
    const keyFor = kind => prizeKeys.find(key=>prizes[key].kind===kind);
    const coinKey = keyFor('coin'), tabletKey = keyFor('tablet');
    await aim(...tabletKey.split(',').map(Number));
    await press('KeyE');assert.equal(await dialog.isVisible(),false);
    assert.match(await page.locator('#message').textContent(),/Сначала просканируй/);
    const coinPosition = coinKey.split(',').map(Number);
    async function clickCoin(){
      if (!await page.evaluate(()=>!!document.pointerLockElement)) {
        await page.mouse.click(600,350);
        await page.waitForFunction(()=>!!document.pointerLockElement,null,{polling:50});
      }
      await aim(...coinPosition);
      await page.mouse.click(600,350);
    }
    await clickCoin();
    assert.match(await page.locator('#message').textContent(),/Сначала просканируй/);
    assert.equal(await balance(),21);
    await scan(...coinPosition);
    await openMenu();await toggle('Скрыть призы');await press('Escape');
    assert.deepEqual(await markers(),[coinKey]);
    await clickCoin();
    await page.waitForFunction(()=>scanTest.saved().coins===22,null,{polling:50});
    await openMenu();await toggle('Показать призы');
    assert.deepEqual(await markers(),[tabletKey]);
    await press('Escape');
    await page.evaluate(()=>scanTest.travel(1));
    await openMenu();
    assert(await menu.getByRole('button',{name:'Сканирование недоступно'}).isDisabled());
    await press('Escape');
    await page.evaluate(()=>scanTest.travel(0));
    assert.deepEqual(await markers(),[]);
    await openMenu();await toggle('Показать призы');await press('Escape');
    assert.deepEqual(await markers(),[tabletKey]);
    await tick(86400000);
    assert.deepEqual(await markers(),[]);
    assert.deepEqual(errors,[]);
    console.log('PASS grass scan, timing, speech, pickup, tablet, travel, restart, reload, preview toggles and Moscow midnight');
  } finally {await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
