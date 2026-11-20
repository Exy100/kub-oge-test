const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

(async () => {
  const root = path.resolve(__dirname,'..');
  const server = spawn('python3',['-m','http.server','8147','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:900,height:720}});
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>localStorage.setItem('kub.navigator.v1','27'));
    await page.route('**/game.js*',r=>r.fulfill({contentType:'text/javascript',
      body:readFileSync(path.join(root,'game.js'),'utf8')+`
        window.cheatTest={
          index:()=>stage.index, names:LOCATIONS.map(l=>l.name),
          seed(){stages[0].built.add(0);stages[0].inventory[0]=2;stages[1].unlocked=true;forgeState.bits=5},
          clean(){return stages.every(s=>!s.built.size&&!s.unlocked&&s.inventory.every(n=>n===0)) && forgeState.bits===0 && playerAccount.coins===0},
          moving:()=>!!keys.KeyA
        };`}));
    await page.goto('http://127.0.0.1:8147');
    const menu = page.getByRole('dialog',{name:'Чит-меню'});
    async function chord(a,b) {
      await page.keyboard.down(a);await page.keyboard.press(b);await page.keyboard.up(a);
    }
    await chord('KeyQ','KeyA');assert.equal(await menu.count(),0);
    await page.locator('#play').click();
    await page.keyboard.down('KeyA');
    assert(await page.evaluate(()=>cheatTest.moving()));
    await page.keyboard.press('KeyQ');await page.keyboard.up('KeyA');
    assert(await menu.isVisible());
    assert.equal(await page.evaluate(()=>cheatTest.moving()),false);
    await menu.getByText('+100 монет').click();
    await menu.getByText('Выдать все ключи').click({clickCount:2});
    await menu.getByLabel('Закрыть чит-меню').click();
    await page.keyboard.press('KeyB');
    const bag = page.locator('#inventory-dialog');
    assert.match(await bag.innerText(),/100/);
    assert.equal(await bag.getByText('Ключ «Компьютер в опасности»',{exact:true}).count(),1);
    await chord('KeyQ','KeyA');assert.equal(await menu.count(),0);
    await page.keyboard.press('Escape');
    const names=await page.evaluate(()=>cheatTest.names);
    for(const i of [3,1,0,2]){
      await chord('KeyQ','KeyA');
      await menu.getByRole('button',{name:names[i],exact:true}).click();
      assert.equal(await page.evaluate(()=>cheatTest.index()),i);
    }
    await page.evaluate(()=>cheatTest.seed());
    await chord('KeyA','KeyQ');
    await menu.getByText('Сбросить прогресс и монеты').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>cheatTest.clean()),false);
    await chord('KeyQ','KeyA');
    await menu.getByText('Сбросить прогресс и монеты').click();
    await menu.getByText('Подтвердить сброс').click();
    assert(await page.evaluate(()=>cheatTest.clean()));
    assert.equal(await page.evaluate(()=>cheatTest.index()),0);
    await menu.getByLabel('Закрыть чит-меню').click();
    assert.equal(await page.locator('#count').innerText(),'0 / 7');
    await page.keyboard.press('KeyB');
    assert.equal(await bag.getByText('Ключ «Компьютер в опасности»',{exact:true}).count(),1);
    assert.deepEqual(errors,[]);
    console.log('PASS menu chords, movement, all destinations, inventory rewards, reset, cancellation and close');
  } finally { await browser.close();server.kill(); }
})().catch(e=>{console.error(e);process.exitCode=1});
