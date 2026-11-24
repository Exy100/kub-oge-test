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
      body:source('skills/explorer-scan.js').replaceAll('random = Math.random','random = window.scanRandom ?? (() => 0)')}));
    await page.route('**/game.js*',r=>r.fulfill({contentType:'text/javascript',body:source('game.js')+`
      window.scanTest={
        step(){frame(performance.now())},
        aim(x,z){
          const px = Math.max(stage.center-10,Math.min(stage.center+10,x)), pz = z > 7 ? z-2 : z+2;
          player.position.set(px,0,pz);
          yaw=Math.atan2(px-x,pz-z);pitch=Math.atan2(1.5,Math.hypot(px-x,pz-z));this.step();
        },
        markers:()=>island.getObjectsByProperty('isMesh',true)
          .filter(mesh=>mesh.userData.scanKey).map(mesh=>mesh.userData.scanKey).sort(),
        aimTree(x,z){
          player.position.set(x,0,z+2);yaw=pitch=0;this.step();
        },
        marker(key){
          let result;
          island.traverse(m=>{if(m.userData.scanKey===key)result=m.position.toArray()});
          return result;
        },
        treePulse(){
          const rings = island.getObjectByName('tree-scan-rings');
          if (!rings.visible) return null;
          const levels = new Set();
          const matrix = new THREE.Matrix4();
          for (let i=0; i<rings.count; i++) {
            rings.getMatrixAt(i,matrix);
            levels.add(matrix.elements[13]);
          }
          return {color:rings.material.color.getHex(),levels:[...levels],origin:rings.position.toArray()};
        },
        gridVisible:()=>island.getObjectByName('board-scan-grid').visible,
        saved:()=>scanStore.state,
        solve:correct=>scanner.submitVerifiedAnswer(correct),
        travel:index=>goToIsland(index,'Переход'),
      };`}));
    const tick = async ms => {await page.clock.fastForward(ms);await page.evaluate(()=>scanTest.step())};
    const aim = (x,z) => page.evaluate(([x,z])=>scanTest.aim(x,z),[x,z]);
    const press = key => page.keyboard.press(key);
    const click = sel => page.locator(sel).evaluate(el=>el.click());
    const menu = page.locator('#skill-list');
    const slot = page.locator('#skill-slot');
    async function choose(tree=false){
      await press('Shift+Digit0');
      assert(await menu.isVisible());
      await press(tree?'Digit2':'Digit1');
      assert.equal(await menu.isVisible(),false);
    }
    const entries = () => page.evaluate(()=>scanTest.saved().locations['island.dreamers']?.cells ?? {});
    const balance = () => page.evaluate(()=>scanTest.saved().coins);
    async function scan(x,z,key='Digit0'){
      await aim(x,z);await press(key);await tick(3001);
      await page.waitForFunction(k=>scanTest.saved().locations['island.dreamers']?.cells[k],x+','+z,{polling:50});
    }
    const dialog = page.locator('#scan-dialog');
    await page.goto('http://127.0.0.1:8151/game.html');
    await click('#play');
    assert.match(await slot.innerText(),/Скан травы/);
    await press('Digit0');
    assert.equal(await menu.isVisible(),false);
    assert.match(await page.locator('#message').textContent(),/первого лица/);
    await press('KeyV');await press('KeyL');await press('Digit0');
    assert.match(await page.locator('#message').textContent(),/режим сборки/);
    await press('KeyL');await aim(0,3);await press('Digit0');
    await tick(1200);await press('KeyV');await tick(2200);
    assert.deepEqual(await entries(),{});
    assert.equal(await page.locator('#scan-progress').isVisible(),false);
    await press('KeyV');await aim(0,3);await press('Digit0');
    await tick(1450);await press('Numpad0');await tick(1450);
    assert(await page.locator('#scan-progress').isVisible());
    assert.deepEqual(await entries(),{});
    await tick(101);
    await page.waitForFunction(()=>scanTest.saved().locations['island.dreamers'],null,{polling:50});
    assert.equal((await entries())['0,3'].kind,'coin');
    assert.equal(await balance(),0);
    await press('Digit0');
    assert.match(await page.locator('#navigator-greeting').innerText(),/уже просканирована/);
    assert.match(await page.evaluate(()=>speechSynthesis.lines.at(-1)),/уже просканирована/);
    if (!await page.evaluate(()=>!!document.pointerLockElement)) await page.mouse.click(600,350);
    await page.waitForFunction(()=>document.pointerLockElement?.id==='world',null,{polling:50});
    await page.mouse.click(600,350);
    await page.waitForFunction(()=>scanTest.saved().coins===1,null,{polling:50});
    await scan(1,3,'Numpad0');
    await press('KeyE');
    assert(await dialog.isVisible());
    assert.match(await dialog.innerText(),/Скоро здесь будет задание по работе с таблицами/);
    assert.equal(await page.evaluate(()=>scanTest.solve(false)),0);
    await click('#scan-dialog button');
    await page.evaluate(()=>scanTest.travel(3));
    assert.match(await slot.innerText(),/Эхо дерева/);
    await press('Shift+Numpad0');
    assert(await menu.locator('[data-skill="grass"]').isDisabled());
    assert(await menu.locator('[data-skill="tree"]').isEnabled());
    await press('Escape');
    await page.evaluate(()=>scanTest.travel(0));
    assert.match(await slot.innerText(),/Скан травы/);
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
    await aim(0,3);
    await page.evaluate(()=>document.exitPointerLock());
    await page.waitForFunction(()=>!document.pointerLockElement,null,{polling:50});
    await slot.click();
    await page.waitForFunction(()=>[...document.querySelectorAll('#skill-list video')].every(v=>v.readyState>=2 && v.videoWidth>0),null,{polling:50});
    await press('ArrowDown');
    await press('Enter');
    assert.equal(await menu.isVisible(),false);
    assert.match(await slot.innerText(),/Эхо дерева/);
    assert.equal(await page.locator('#scan-progress').isVisible(),false);
    await press('Digit0');
    assert.match(await page.locator('#message').innerText(),/на дерево/);
    const aimTree = (x,z)=>page.evaluate(([x,z])=>scanTest.aimTree(x,z),[x,z]);
    async function treeScan(x,z) {
      await aimTree(x,z);
      await press('Digit0');
      await tick(3001);
      await page.waitForFunction(key=>Object.values(scanTest.saved().locations).some(bucket=>bucket.cells[key]),'tree:'+x+','+z,{polling:50});
    }
    const treeKey='tree:-8,-6';
    await aimTree(-8,-6);
    await choose();await press('Digit0');
    assert.match(await page.locator('#message').innerText(),/клетку травы/);
    const pulse = () => page.evaluate(()=>scanTest.treePulse());
    await page.emulateMedia({reducedMotion:'reduce'});
    await choose(true);
    assert.equal(await page.locator('#scan-progress').isVisible(),false);
    await press('Digit0');await tick(200);
    const still = await pulse();
    assert.equal(still.color,0x168fff);
    await tick(1000);assert.deepEqual(await pulse(),still);
    await press('KeyV');await tick(16);
    assert.equal(await pulse(),null);
    assert.equal(await page.evaluate(()=>scanTest.saved().locations['island.dreamers/trees']),undefined);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await press('KeyV');await aimTree(-8,-6);await press('Digit0');
    await tick(0);
    const start = await pulse();
    assert.equal(start.levels.length,3);
    assert.equal(start.color,0x143ba8);
    for (const color of [0x168fff,0x9eefff,0x168fff]) {
      await tick(750);
      assert.deepEqual(await pulse(),{...start,color});
    }
    await tick(749);assert.equal((await pulse()).color,start.color);
    await tick(2);assert.equal(await pulse(),null);
    await page.waitForFunction(()=>scanTest.marker('tree:-8,-6'),null,{polling:50});
    const marker = await page.evaluate(key=>scanTest.marker(key),treeKey);
    assert.equal(marker[0],-8);
    assert.equal(marker[1],1.5);
    assert.ok(marker[2]>-6);
    await press('Digit0');
    assert.match(await page.locator('#navigator-greeting').innerText(),/дерево уже просканировано/);
    if (!await page.evaluate(()=>!!document.pointerLockElement)) await page.mouse.click(600,350);
    await page.waitForFunction(()=>document.pointerLockElement?.id==='world',null,{polling:50});
    await page.mouse.click(600,350);
    await page.waitForFunction(()=>scanTest.saved().coins===22,null,{polling:50});
    assert.equal(await page.evaluate(key=>scanTest.marker(key),treeKey),undefined);
    await treeScan(9,1);
    assert.match(await page.locator('#navigator-greeting').innerText(),/находок нет/);
    await page.evaluate(()=>{
      scanTest.travel(4);
      const rolls=[.9,0,.8];
      window.scanRandom=()=>rolls.shift() ?? 0;
    });
    await treeScan(72,-7);
    await press('KeyE');
    assert(await dialog.isVisible());
    assert.equal(await page.evaluate(()=>scanTest.solve(false)),0);
    await click('#scan-dialog button');
    await page.reload();
    await click('#play');await press('KeyV');
    assert.match(await slot.innerText(),/Эхо дерева/);
    await page.evaluate(()=>scanTest.travel(4));
    await aimTree(72,-7);await press('KeyE');
    assert(await dialog.isVisible());
    assert.equal(await page.evaluate(()=>scanTest.solve(true)),40);
    assert.equal(await dialog.isVisible(),false);
    await treeScan(88,-7);
    assert.match(await page.locator('#navigator-greeting').innerText(),/находок нет/);
    await tick(86400000);
    await treeScan(88,-7);
    assert.equal(await page.evaluate(()=>scanTest.marker('tree:88,-7')[1]),1.5);
    assert.equal(await balance(),62);
    await page.evaluate(()=>scanTest.travel(0));
    await tick(86400000);
    const cheatMenu = page.locator('#cheat-menu');
    async function openMenu(){
      await page.keyboard.down('KeyQ');await press('KeyA');await page.keyboard.up('KeyQ');
    }
    async function toggle(label){
      const button = cheatMenu.getByRole('button',{name:label,exact:true});
      await button.evaluate(el=>el.click());
      await page.waitForFunction(()=>!document.querySelector('[data-scan]').disabled,null,{polling:50});
    }
    const markers = () => page.evaluate(()=>scanTest.markers());
    await openMenu();
    await toggle('Показать призы');
    const prizes = await page.evaluate(()=>scanTest.saved().locations['island.dreamers'].hiddenPrizes);
    const prizeKeys = Object.keys(prizes).sort();
    assert.equal(prizeKeys.length,2);
    const hiddenTrees = await page.evaluate(()=>Object.keys(scanTest.saved().locations['island.dreamers/trees'].hiddenPrizes));
    assert.equal(hiddenTrees.length,1);
    const [treePrize] = hiddenTrees;
    assert.deepEqual(await markers(),[...prizeKeys,treePrize].sort());
    assert.deepEqual(await entries(),{});
    await toggle('Скрыть призы');
    assert.deepEqual(await markers(),[]);
    await toggle('Показать призы');
    assert.deepEqual(await markers(),[...prizeKeys,treePrize].sort());
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
    assert.equal(await balance(),62);
    await choose();
    await scan(...coinPosition);
    await openMenu();await toggle('Скрыть призы');await press('Escape');
    assert.deepEqual(await markers(),[coinKey]);
    await clickCoin();
    await page.waitForFunction(()=>scanTest.saved().coins===63,null,{polling:50});
    await openMenu();await toggle('Показать призы');
    assert.deepEqual(await markers(),[tabletKey,treePrize].sort());
    await press('Escape');
    await page.evaluate(()=>scanTest.travel(3));
    await openMenu();
    await toggle('Показать призы');
    assert.equal((await markers()).length,1);
    assert.ok((await markers())[0].startsWith('tree:'));
    await press('Escape');
    await page.evaluate(()=>scanTest.travel(0));
    assert.deepEqual(await markers(),[]);
    await openMenu();await toggle('Показать призы');await press('Escape');
    assert.deepEqual(await markers(),[tabletKey,treePrize].sort());
    await openMenu();
    const dayBeforeReset = await page.evaluate(()=>scanTest.saved().day);
    await cheatMenu.getByRole('button',{name:'Сбросить суточный лимит на всех островах'}).evaluate(el=>el.click());
    await page.waitForFunction(()=>document.querySelector('#cheat-menu [data-status]').textContent.includes('заново'),null,{polling:50});
    assert(await cheatMenu.getByRole('button',{name:'Показать призы'}).isVisible());
    assert.deepEqual(await markers(),[]);
    assert.deepEqual(await page.evaluate(()=>scanTest.saved().locations),{});
    assert.equal(await balance(),63);
    await page.reload();await click('#play');await press('KeyV');
    assert.deepEqual(await page.evaluate(()=>scanTest.saved().locations),{});
    assert.equal(await page.evaluate(()=>scanTest.saved().day),dayBeforeReset);
    await scan(...coinPosition);
    assert.deepEqual(await markers(),[coinKey]);
    await page.evaluate(()=>scanTest.travel(3));
    await treeScan(32,-7);
    assert.equal(await page.evaluate(()=>scanTest.marker('tree:32,-7')[1]),1.5);
    assert.equal(await balance(),63);
    await tick(86400000);
    assert.deepEqual(await markers(),[]);
    await page.evaluate(()=>scanTest.travel(2));
    assert.match(await slot.innerText(),/Скан платы/);
    const gridVisible=()=>page.evaluate(()=>scanTest.gridVisible());
    assert.equal(await gridVisible(),false);
    await aim(211,10);await press('Digit0');await tick(1500);
    assert.equal(await gridVisible(),true);
    await press('KeyV');await tick(20);
    assert.equal(await gridVisible(),false);
    await press('KeyV');await aim(211,10);await press('Digit0');await tick(3001);
    assert.equal(await gridVisible(),false);
    await page.waitForFunction(()=>scanTest.saved().locations['island.processor-lab']?.cells['211,10'],null,{polling:50});
    assert.deepEqual(errors,[]);
    console.log('PASS skill menu, videos, grass and tree targets, one prize tree, pickup, Excel, travel, reload and midnight');
  } finally {await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
