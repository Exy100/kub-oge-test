const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

(async()=>{
  const repo=path.resolve(__dirname,'..');
  const server=spawn('python3',['-m','http.server','8078','--bind','127.0.0.1'],{cwd:repo,stdio:'ignore'});
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1150,height:760}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      localStorage.setItem('kub.navigator.v1','27');
      const synth=new EventTarget();
      window.lines=[];
      synth.getVoices=()=>[{name:'Google русский',voiceURI:'ru',lang:'ru-RU'}];
      synth.speak=u=>window.lines.push(u.text);
      synth.cancel=()=>{};
      Object.defineProperty(window,'speechSynthesis',{value:synth});
      Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text}}});
    });
    await page.route('**/game.js*',route=>route.fulfill({contentType:'text/javascript',
      body:fs.readFileSync(path.join(repo,'game.js'),'utf8')+`
        window.portalTest={
          move(x,z){player.position.set(x,0,z);panel.updatePortal(nearbyRoute(),true,performance.now())},
          unlock(){stage.unlocked=true;update()},
          island(){return stage.index}
        };
      `}));
    await page.goto('http://127.0.0.1:8078/game.html');
    const cloud=page.locator('#travel-prompt'), go=page.locator('#portal-go');
    const move=(x,z)=>page.evaluate(([x,z])=>portalTest.move(x,z),[x,z]);
    const lines=()=>page.evaluate(()=>window.lines.filter(t=>t.startsWith('Портал')));
    await page.locator('#play').click();
    await page.evaluate(()=>document.exitPointerLock());
    await page.waitForFunction(()=>!document.pointerLockElement);
    assert(await cloud.isHidden());
    // Cross the boundary twice in one input burst, independent of the test runner's frame rate.
    await page.evaluate(()=>{
      portalTest.move(0,-1);portalTest.move(0,4);portalTest.move(0,-1);
    });
    await cloud.waitFor();
    assert.equal(await cloud.locator('.portal-title').innerText(),'Портал спит');
    assert(await go.isHidden());
    assert.deepEqual(await lines(),['Портал спит. Дострой арку, чтобы открыть проход.']);
    await page.keyboard.press('e');
    assert.equal(await page.evaluate(()=>portalTest.island()),0);
    assert(!(await page.locator('#message').innerText()).includes('Портал спит'));
    assert.equal((await lines()).length,1,'quick re-entry does not repeat speech');
    await page.evaluate(()=>portalTest.unlock());
    await go.waitFor();
    assert((await lines()).at(-1).includes('Нажми клавишу Е, чтобы перейти в мастерскую черепахи'));
    for(const width of [1150,390,320]){
      await page.setViewportSize({width,height:760});
      const fits=await cloud.evaluate(el=>{
        const b=el.getBoundingClientRect(),n=document.querySelector('#navigator-button').getBoundingClientRect();
        const hints=document.querySelector('.controls').getBoundingClientRect();
        const tip=b.left+parseFloat(getComputedStyle(el,'::after').left)+6;
        return b.left>=0&&b.right<=innerWidth&&b.bottom<n.top&&tip>n.left&&tip<n.right&&hints.bottom<=b.top;
      });
      assert(fits,'bubble points to Navigator without covering controls at '+width);
      if(width!==390)await page.screenshot({path:'/tmp/kub-portal-bubble-'+width+'.png'});
    }
    await go.click();
    assert.equal(await page.evaluate(()=>portalTest.island()),1);
    await cloud.waitFor({state:'hidden'});
    await move(166,6);await go.waitFor();
    assert((await go.innerText()).includes('Остров мечтателей'));
    await page.keyboard.press('e');
    assert.equal(await page.evaluate(()=>portalTest.island()),0);
    await page.locator('#navigator-button').click();
    await page.locator('#portal-speech-enabled').uncheck();
    await page.keyboard.press('Escape');
    const count=(await lines()).length;
    await move(0,-1);await go.waitFor();
    assert.equal((await lines()).length,count,'muted voice keeps visual cue and interaction');
    assert.deepEqual(errors,[]);
    console.log('PASS locked and open portals, speech, re-entry, mute, mouse and E travel, desktop and mobile anchoring');
  }finally{await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
