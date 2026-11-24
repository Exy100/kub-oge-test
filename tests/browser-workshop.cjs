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
        presentation(){
          return {playing:workshop.presenting(),lit:island.getObjectByName('workbench-power-led').material.emissive.g>0,
            axe:island.getObjectByName('offered-leafmoon')?.visible??false,state:stage.repair};
        },
        finishEarlierRepair(){
          stage.repair.parts.fill('installed');stage.repair.met=true;
        },
        tickReduced(dt){workshop.tick(dt,true,true)},
        giftInFrame(){
          frame(performance.now());camera.updateMatrixWorld();
          const axe=island.getObjectByName('offered-leafmoon');
          const tip=axe.localToWorld(new THREE.Vector3(.22,.6,0)).project(camera);
          return !player.visible && Math.abs(tip.x)<.95 && Math.abs(tip.y)<.95 && Math.abs(tip.z)<1;
        },
        pauseTick(){workshop.tick(4,false,false)},
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
        useAt(mesh){
          player.position.set(mesh.position.x,0,mesh.position.z+1.8);
          camera.position.set(mesh.position.x,mesh.position.y,mesh.position.z+2.5);
          camera.lookAt(mesh.position);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
          act(0);
        },
        axeView(third){
          gathering.update(1/60,1,{active:true,third,tool:bag.loadouts.build.tool});
          const rig=third?player:gathering.viewScene;
          return rig.getObjectByName('woodcutting-axe')?.visible;
        },
        chop(){this.useAt(trunks[0]);return stage.inventory[2]},
        build(index){this.useAt(stage.ghosts[index]);return stage.built.size},
        tool:()=>bag.loadouts.build.tool,
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
      assert.equal(await dialog.isVisible(),false);
      assert.equal(await page.evaluate(i=>workTest.state().bugs[i].phase,bug),'stopped');
      await press('KeyE');await tick(.18);
      assert.equal(await dialog.isVisible(),false);
      await page.evaluate(()=>workTest.pauseTick());
      assert.equal(await dialog.isVisible(),false);
      await tick(.4);
      assert(await dialog.isVisible());
      const fields=dialog.locator('input');
      assert.equal(await fields.first().inputValue(),bug?'fro':'inpt');
      await press('Escape');await tick(1);assert.equal(await dialog.isVisible(),false);await press('KeyE');
      if(bug){
        assert.equal(await fields.count(),3);
        assert.equal(await fields.nth(0).inputValue(),'fro');
        await fields.nth(1).fill('range');
        await dialog.getByText('Проверить программу').click();
        assert.match(await dialog.locator('[role=status]').innerText(),/строку 1.*цикл/);
        assert.equal(await fields.nth(0).evaluate(el=>el===document.activeElement),true);
      }
      await fields.nth(0).fill(bug?'for':'input');
      await dialog.getByText('Проверить программу').click();
      assert.match(await dialog.locator('[role=status]').innerText(),/строку 2/);
      await fields.last().fill('print');
      await dialog.getByText('Проверить программу').click();
      assert.equal(await dialog.isVisible(),false);
      assert.equal(await page.evaluate(i=>workTest.state().bugs[i].phase,bug),'leaving');
      await tick(1.5);
      for(const part of bug?parts.slice(2):parts.slice(0,2)){
        await near(part);await press('KeyE');
      }
      assert.equal((await items()).length,bug?5:2);
      if(!bug){
        await near('turtle-mechanic');await press('KeyE');await tick(1.1);
        assert.equal(await dialog.locator('[data-part]:enabled').count(),2);
        assert.equal(await dialog.locator('[data-part]:disabled').count(),3);
        await press('Escape');
        await at(166,6);await press('KeyE');assert.equal(await index(),0);
        await at(0,-1);await press('KeyE');assert.equal(await index(),1);
        assert.equal((await items()).length,2);
      }
    }
    await press('KeyB');assert.match(await page.locator('#inventory-dialog').innerText(),/Блок питания/);await press('Escape');
    await at(162.24,-1);await press('KeyE');
    assert.equal(await dialog.isVisible(),false);
    await tick(1.1);
    assert.equal(await page.evaluate(()=>workTest.state().acknowledgedParts),5);
    assert.equal(await dialog.locator('.pc-target').getAttribute('aria-label'),'Сокет процессора');
    assert.equal(await dialog.locator('.pc-board [data-socket]').count(),4);
    assert.equal(await dialog.locator('.pc-board .pc-psu').count(),0);
    for(const width of [360,880]){
      await page.setViewportSize({width,height:700});
      assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth));
      for(const img of await dialog.locator('img').all())await img.evaluate(el=>el.decode());
    }
    await click('[data-part="0"]');await click('[data-socket="4"]');
    assert.match(await dialog.locator('[role=status]').innerText(),/другой разъём/);
    assert.equal((await items()).length,5);
    for(let i=0;i<5;i++){
      const choice=dialog.locator('[data-part="'+i+'"]');
      await choice.focus();await press('Enter');
      assert.equal(await dialog.locator(':focus').getAttribute('data-socket'),String(i));
      await press('Enter');
      if(i===0){
        await press('Escape');await press('KeyE');
        assert.ok(await dialog.locator('[data-part="0"]').isDisabled());
        assert.ok(await dialog.locator('[data-socket="0"]').isDisabled());
        assert.equal(await dialog.locator('.pc-target').getAttribute('data-socket'),'1');
      }
    }
    assert.equal((await items()).length,0);
    const presentation=()=>page.evaluate(()=>workTest.presentation());
    assert.ok((await presentation()).playing && (await presentation()).lit);
    await press('KeyE');await page.evaluate(()=>workTest.pauseTick());
    assert.equal(await dialog.isVisible(),false);
    await tick(1.25);
    assert.equal((await presentation()).axe,true);
    assert.equal(await page.evaluate(()=>workTest.giftInFrame()),true);
    assert.equal(await dialog.isVisible(),false);
    await tick(.5);
    assert.equal(await dialog.getByText('Принять топор').isVisible(),true);
    await press('Escape');await tick(.25);
    assert.equal(await dialog.isVisible(),false);
    await at(160,-6);await press('KeyE');assert.equal(await index(),1);
    await at(166,6);await press('KeyE');assert.equal(await index(),0);
    await at(0,-1);await press('KeyE');assert.equal(await index(),1);
    assert.equal((await presentation()).axe,true);
    await near('turtle-mechanic');await press('KeyE');
    await dialog.getByText('Принять топор').click();
    assert.equal(await page.evaluate(()=>workTest.tool()),'wood-axe');
    assert.equal((await presentation()).axe,false);
    for(const third of [true,false])assert.equal(await page.evaluate(v=>workTest.axeView(v),third),true);
    await press('KeyB');
    assert.equal(await page.locator('[data-item="wood-axe"]').count(),1);
    await press('Escape');
    for(let j=1;j<=7;j++){
      assert.equal(await page.evaluate(()=>workTest.chop()),j);
      if(j<7)await page.waitForTimeout(360);
    }
    for(let j=0;j<6;j++)assert.equal(await page.evaluate(i=>workTest.build(i),j),j+1);
    await at(160,-6);await press('KeyE');assert.equal(await index(),1);
    await at(166,6);await press('KeyE');
    await at(0,-1);await press('KeyE');
    assert.equal(await page.evaluate(()=>workTest.build(6)),7);
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
    assert.equal(await page.evaluate(()=>workTest.tool()),'wand');
    await at(160,-6);await press('KeyE');assert.equal(await index(),1);
    await page.evaluate(()=>workTest.finishEarlierRepair());
    await near('turtle-mechanic');await press('KeyE');
    await page.evaluate(()=>workTest.tickReduced(.36));
    assert.equal(await dialog.getByText('Принять топор').isVisible(),true);
    assert.deepEqual(errors,[]);
    console.log('PASS turtle, combat, repair retries, transformation, five drops, inventory, delivery nod, assembly, pannier gift reveal and axe reward, woodcutting, wooden arch, two-bit station, travel and reset');
  } finally {await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
