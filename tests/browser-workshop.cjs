const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

(async()=>{
  const root=path.resolve(__dirname,'..');
  const server=spawn('python3',['-m','http.server','8179','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:880,height:700}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('kub.navigator.v1','27')});
    await page.route('**/game.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'game.js'),'utf8')+`
      window.workTest={
        arrive(){stage.unlocked=true;player.position.set(0,0,-1);travel()},
        at(x,z){player.position.set(x,0,z)},
        near(name){const o=island.getObjectByName(name);player.position.set(o.position.x,0,o.position.z+.7)},
        tick(seconds){workshop?.tick(seconds,true,false);signalStation?.tick(seconds,true,false)},
        workbenchGap(){
          const turtle=island.getObjectByName('turtle-mechanic');
          const bench=new THREE.Box3().setFromObject(island.getObjectByName('turtle-workbench-top'));
          let gap=Infinity;
          for(let i=0;i<252;i++){
            workshop.tick(1/30,true,false);
            gap=Math.min(gap,bench.min.x-new THREE.Box3().setFromObject(turtle,true).max.x);
          }
          return gap;
        },
        state:()=>stage.repair,index:()=>stage.index,
        items:()=>bag.items().filter(p=>p.id.startsWith('pc.')).map(p=>p.id),
      };`}));
    await page.goto('http://127.0.0.1:8179/game.html');
    const click=s=>page.locator(s).click();
    const press=k=>page.keyboard.press(k);
    const near=name=>page.evaluate(n=>workTest.near(n),name);
    const at=(x,z)=>page.evaluate(([x,z])=>workTest.at(x,z),[x,z]);
    const tick=seconds=>page.evaluate(t=>workTest.tick(t),seconds);
    const index=()=>page.evaluate(()=>workTest.index());
    const items=()=>page.evaluate(()=>workTest.items());
    const dialog=page.locator('#workshop-dialog');
    await click('#play');await page.evaluate(()=>workTest.arrive());
    assert.equal(await index(),1);
    const gap=await page.evaluate(()=>workTest.workbenchGap());
    assert.ok(gap>.55,'Animated turtle clears the workbench by '+gap);
    await at(160,-6);await press('KeyE');assert.equal(await index(),1);
    await near('turtle-mechanic');await press('KeyE');
    assert.match(await dialog.innerText(),/пять деталей/);
    await dialog.getByText('Помогу').click();
    await press('KeyL');
    const parts=['pc.cpu','pc.ram','pc.ssd','pc.gpu','pc.psu'];
    for(let bug=0;bug<2;bug++){
      for(let hit=0;hit<3;hit++){
        await tick(.4);await near('repair-bug-'+bug);await press('Digit1');
      }
      assert(await dialog.isVisible());
      await press('Escape');await press('KeyE');
      const fields=dialog.locator('input');
      await fields.nth(0).fill(bug?'range':'input');
      await dialog.getByText('Проверить программу').click();
      assert.match(await dialog.locator('[role=status]').innerText(),/строку 2/);
      await fields.nth(1).fill('print');
      await dialog.getByText('Проверить программу').click();
      assert.equal(await dialog.isVisible(),false);
      assert.equal(await page.evaluate(i=>workTest.state().bugs[i].phase,bug),'leaving');
      await tick(1.5);
      for(const part of bug?parts.slice(2):parts.slice(0,2)){
        await near(part);await press('KeyE');
      }
      assert.equal((await items()).length,bug?5:2);
      if(!bug){
        await at(166,6);await press('KeyE');assert.equal(await index(),0);
        await at(0,-1);await press('KeyE');assert.equal(await index(),1);
        assert.equal((await items()).length,2);
      }
    }
    await press('KeyB');assert.match(await page.locator('#inventory-dialog').innerText(),/Блок питания/);await press('Escape');
    await at(162.24,-1);await press('KeyE');
    await click('[data-part="0"]');await click('[data-socket="4"]');
    assert.equal((await items()).length,5);
    for(let i=0;i<5;i++){
      await click('[data-part="'+i+'"]');await click('[data-socket="'+i+'"]');
    }
    assert.equal((await items()).length,0);
    await at(160,-6);await press('KeyE');assert.equal(await index(),2);
    await at(40,2);await press('KeyE');
    const bits=dialog.locator('.signal-bits button');
    await bits.nth(1).click();assert.match(await dialog.innerText(),/Песчаник/);
    await bits.nth(1).click();await bits.nth(0).click();
    assert.match(await dialog.locator('[role=status]').innerText(),/Дерево · сигнал принят/);
    await press('Escape');await at(40,-2);await press('KeyE');assert.equal(await index(),2);
    await at(46,6);await press('KeyE');assert.equal(await index(),1);
    await click('#reset');await click('#restart-confirm');
    assert.equal(await page.evaluate(()=>workTest.state().met),false);
    await at(160,-6);await press('KeyE');assert.equal(await index(),1);
    assert.deepEqual(errors,[]);
    console.log('PASS turtle, combat, repair retries, transformation, five drops, inventory, assembly, two-bit station, travel and reset');
  } finally {await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
