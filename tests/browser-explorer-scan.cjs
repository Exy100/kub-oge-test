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
      body:source('skills/explorer-scan.js').replace('random = Math.random','random = () => 0')}));
    await page.route('**/game.js*',r=>r.fulfill({contentType:'text/javascript',body:source('game.js')+`
      window.scanTest={
        step(){frame(performance.now())},
        aim(x,z){
          player.position.set(x,0,z+2);yaw=0;pitch=Math.atan(1.5/2);this.step();
        },
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
    assert.deepEqual(errors,[]);
    console.log('PASS grass scan, timing, speech, pickup, tablet, travel, restart, reload and Moscow midnight');
  } finally {await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
