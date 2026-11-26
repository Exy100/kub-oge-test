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
    const page=await browser.newPage({viewport:{width:880,height:700},hasTouch:true});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('kub.navigator.v1','27')});
    await page.route('**/game.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'game.js'),'utf8')+`
      window.addTestCoins=n=>{playerAccount.coins+=n};
      window.rewardForTest=()=>({
        weapons:bag.items().filter(item=>item.kind==='weapon').map(item=>[item.id,item.quantity]),
        coins:playerAccount.coins,
      });
      const canStoreItem=bag.canStore;
      window.blockStaffSlot=blocked=>{bag.canStore=id=>!(blocked && id===STAFF_ID) && canStoreItem(id)};
      window.workTest={
        wallState(){return {
          cubes:island.children.filter(m=>m.name.startsWith('repair-bit-')).length,
          layout:stage.bitWall, holding:processorLab.wall.holding,
          hand:gathering.viewWand.root.visible,
        }},
        aimWall(slot){
          const col=slot%8, tray=slot>=16;
          const x=stage.center+6.6+(tray?(slot-20.5)*.64:(col-3.5)*.73+(col<4?-.09:.09));
          const y=tray?1.03+((slot%2)*2-1)*.09:2.94-Math.floor(slot/8)*.97;
          const z=-4.8+(tray?.85:.53);
          third=false;
          player.position.set(x,0,-.9);
          yaw=0; pitch=-Math.atan2(y-1.5,player.position.z-z);
          frame(last+25);
        },
        actor(i){return (i===-1?player:island.getObjectByName('repair-bug-'+i)).position.toArray()},
        runFrames(n){for(let i=0;i<n;i++)frame(last+25)},
        pickupMarkers:()=>island.children.filter(o=>o.name.startsWith('pickup-label-') && o.visible).map(o=>o.name),
        archMarked:()=>island.getObjectByName('north-arch-label').visible,
        marked:()=>island.getObjectByName('turtle-quest-mark').visible,
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
    const objective=()=>page.locator('#quest-action').textContent();
    const progress=()=>page.locator('.mission .progress-label').innerText();
    const archMarked=()=>page.evaluate(()=>workTest.archMarked());
    const items=()=>page.evaluate(()=>workTest.items());
    const dialog=page.locator('#workshop-dialog');
    await click('#play');await page.evaluate(()=>workTest.arrive());
    assert.equal(await index(),1);
    const questTab=page.locator('#quest-tab');
    const questDiagram=page.locator('#quest-diagram');
    assert.equal(await questTab.getAttribute('aria-expanded'),'false');
    assert.equal(await questDiagram.isVisible(),false);
    assert.equal(await page.locator('#quest-panel').innerText(),'Поговори с черепахой у верстака.');
    await press('KeyJ');
    assert.equal(await questDiagram.isVisible(),true);
    await press('KeyJ');
    assert.equal(await questDiagram.isVisible(),false);
    assert.equal(await page.evaluate(()=>workTest.marked()),true);
    const gap=await page.evaluate(()=>workTest.workbenchGap());
    assert.ok(gap>.55,'Animated turtle clears the workbench by '+gap);
    await at(160,-6);await press('KeyE');assert.equal(await index(),1);
    await near('turtle-mechanic');await press('KeyE');
    assert.match(await dialog.innerText(),/пять деталей/);
    assert.equal(await page.evaluate(()=>workTest.marked()),false);
    await dialog.getByText('Помогу').click();
    assert.equal(await questDiagram.isVisible(),true);
    await press('KeyL');
    const parts=['pc.cpu','pc.ram','pc.ssd','pc.gpu','pc.psu'];
    const hitsByBug=[20,10];
    for(const [bug,hitsNeeded] of hitsByBug.entries()){
      for(let hit=0;hit<hitsNeeded;hit++){
        await tick(.4);await near('repair-bug-'+bug);
        if(bug===0 && hit===0){
          const gear=page.locator('#weapons-dialog'), weapon=gear.locator('[data-slot=weapon]');
          await press('KeyC');await weapon.click();
          await gear.getByRole('button',{name:'Надеть · Жезл сбора'}).click();
          await press('Escape');
          const bar=page.locator('.combat-slot').first();
          assert.match(await bar.innerText(),/Жезл/);
          await bar.click();
          await page.evaluate(()=>workTest.runFrames(6));
          assert.equal(await page.evaluate(()=>workTest.state().bugs[0].hp),20,'no damage during windup');
          await press('KeyV');await press('Digit1');
          await page.evaluate(()=>workTest.runFrames(8));
          assert.equal(await page.evaluate(()=>workTest.state().bugs[0].hp),19,'contact survives camera switch and repeated input');
          await press('KeyV');await press('KeyC');await weapon.click();
          await gear.getByRole('button',{name:'Снять · Жезл сбора'}).click();
          await press('Escape');assert.match(await bar.innerText(),/Кулак/);
        }else await press('Digit1');
        if(bug===0 && hit===2){
          const before=await page.evaluate(()=>workTest.actor(-1));
          await press('Digit1'); // duplicate during the strike cooldown
          await page.evaluate(()=>workTest.runFrames(10));
          const after=await page.evaluate(()=>workTest.actor(-1));
          const dz=after[2]-before[2];
          assert.ok(Math.abs(dz-2)<.001 || Math.abs(dz-3)<.001,'shove reaches a whole 2 or 3 tiles');
          assert.ok(Math.abs(after[0]-before[0])<.001);
        }
        if(bug===1 && hit===1){
          const before=await page.evaluate(()=>workTest.actor(1));
          await tick(.12);
          assert.ok((await page.evaluate(()=>workTest.actor(1)))[1]>.4);
          await tick(.12);
          const after=await page.evaluate(()=>workTest.actor(1));
          assert.ok(after[2]<before[2] && Math.abs(Math.hypot(after[2]-before[2],after[0]-before[0])-2)<.001);
          assert.equal(after[1],0);
        }
        const {hp,phase}=await page.evaluate(i=>workTest.state().bugs[i],bug);
        assert.equal(hp,hitsNeeded-hit-1);
        assert.equal(phase,hp?'running':'stopped');
        assert.equal(await dialog.isVisible(),false);
      }
      assert.equal(await dialog.isVisible(),false);
      assert.equal(await page.evaluate(i=>workTest.state().bugs[i].phase,bug),'stopped');
      await press('KeyE');await tick(.18);
      if(bug===1)assert.ok((await page.evaluate(()=>workTest.actor(1)))[1]>0,'last hit still produces a leap');
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
      await at(167,7);await tick(.05);
      assert.equal((await page.evaluate(()=>workTest.pickupMarkers())).length,1);
      assert.match(await page.locator('#message').textContent(),/Вот детали/);
      assert.match(await objective(),bug?/зелёного жука · 0\/3/:/оранжевого жука · 0\/2/);
      for(const part of bug?parts.slice(2):parts.slice(0,2)){
        await near(part);await press('KeyE');
      }
      assert.equal((await items()).length,bug?5:2);
      if(!bug){
        assert.match(await objective(),/зелёного жука/);
        assert.match(await progress(),/Найдено 2\/5/);
        assert.match(await progress(),/Установлено 0\/5/);
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
    const board=await dialog.locator('.pc-board').boundingBox();
    const backpack=await dialog.locator('.pc-inventory').boundingBox();
    assert.ok(board.x>backpack.x+backpack.width && board.width>=400);
    await dialog.locator('[data-part="0"]').dragTo(dialog.locator('[data-socket="4"]'));
    assert.match(await dialog.locator('[role=status]').innerText(),/другой разъём/);
    assert.equal((await items()).length,5);
    for(let i=0;i<5;i++){
      const choice=dialog.locator('[data-part="'+i+'"]');
      const socket=dialog.locator('[data-socket="'+i+'"]');
      if(i===0){
        await choice.dragTo(socket);
      }else if(i===1){
        await page.setViewportSize({width:390,height:800});
        const center=async locator=>{
          const {x,y,width,height}=await locator.boundingBox();
          return {x:x+width/2,y:y+height/2};
        };
        const touch=await page.context().newCDPSession(page);
        const start=await center(choice),end=await center(socket);
        await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
        await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[end]});
        await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
        await dialog.locator('.pc-drag-preview').waitFor({state:'detached'});
        assert.equal((await items()).length,4);
        await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
        await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[end]});
        await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await touch.detach();
        await page.setViewportSize({width:880,height:700});
      }else{
        await choice.focus();await press('Enter');
        assert.equal(await dialog.locator('.pc-target').count(),0);
        await dialog.getByRole('button',{name:'Показать разъём'}).click();
        assert.equal(await dialog.locator(':focus').getAttribute('data-socket'),String(i));
        await press('Enter');
      }
      assert.equal((await items()).length,4-i);
      if(i===0){
        await press('Escape');await press('KeyE');
        assert.ok(await dialog.locator('[data-part="0"]').isDisabled());
        assert.ok(await dialog.locator('[data-socket="0"]').isDisabled());
        assert.match(await progress(),/Найдено 5\/5/);
        assert.match(await progress(),/Установлено 1\/5/);
        assert.equal(await dialog.locator('.pc-target').count(),0);
        assert.match(await dialog.locator('.pc-instruction').innerText(),/длинная и узкая/);
        await dialog.getByRole('button',{name:'Показать разъём'}).click();
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
    assert.match(await objective(),/Добудь древесину/);
    assert.equal(await page.locator('#count').textContent(),'0 / 7');
    for(let j=1;j<=7;j++){
      assert.equal(await page.evaluate(()=>workTest.chop()),j);
      if(j===1)assert.match(await page.locator('#message').textContent(),/ещё раз по этому стволу/);
      await tick(.01);
      assert.equal(await archMarked(),j===7);
      if(j<7)await page.waitForTimeout(360);
    }
    for(let j=0;j<6;j++)assert.equal(await page.evaluate(i=>workTest.build(i),j),j+1);
    await at(160,-6);await press('KeyE');assert.equal(await index(),1);
    await at(166,6);await press('KeyE');
    await at(0,-1);await press('KeyE');
    assert.equal(await page.evaluate(()=>workTest.build(6)),7);
    await at(160,-6);await press('KeyE');assert.equal(await index(),2);
    await at(193,-7);await press('KeyE');assert.equal(await index(),2);
    const wallState=()=>page.evaluate(()=>workTest.wallState());
    const aim=slot=>page.evaluate(i=>workTest.aimWall(i),slot);
    const sample=page.locator('#wall-sample');
    await aim(17);
    assert.equal((await wallState()).cubes,0);
    await press('KeyE');assert(await dialog.isHidden());
    assert(await sample.isHidden());
    await at(200.6,3.45);await press('KeyE');
    assert.equal(await dialog.locator('h2').textContent(),'Наряд на ремонт');
    assert.match(await dialog.locator('.work-order-identity').innerText(),/Ремонтик, модель 1/);
    assert.match(await dialog.locator('.work-order-task + .work-order-memo').innerText(),/UTF-8.*два байта.*8 бит/s);
    assert.match(await dialog.locator('footer p').innerText(),/Импульсный посох, 15 золотых монет/);
    await page.evaluate(()=>{addTestCoins(7);blockStaffSlot(true)});
    const reward=()=>page.evaluate(()=>rewardForTest());
    const before=await reward();
    assert.deepEqual(before.weapons,[]);
    const earned={weapons:[['weapon.pulse-staff',1]],coins:before.coins+15};
    await dialog.getByRole('button',{name:'К стенду'}).click();
    await aim(17);
    assert(await sample.isVisible());
    assert.match(await sample.textContent(),/1101 0000 · 1001 0001/);
    const {layout,cubes,hand}=await wallState();
    assert.equal(cubes,16);
    assert.equal(layout.fixed.length,6);
    assert(hand,'the gathering wand is shown at the board');
    await aim(layout.fixed[0]);await press('KeyE');
    assert.equal((await wallState()).holding,false);
    const loose=layout.places.map((home,i)=>({home,i})).filter(({home})=>home>=16);
    for(const [n,{home,i}] of loose.entries()){
      await aim(home);
      if(n===0){
        const center=await page.evaluate(()=>({x:innerWidth/2,y:innerHeight/2}));
        await page.mouse.move(center.x,center.y);await page.mouse.down();
        assert((await wallState()).holding,'actual canvas pick');
        await aim(i);await page.mouse.up();
        assert.equal((await wallState()).layout.places[i],i);
        await aim(i);await press('KeyE');await aim(home);await press('KeyE');
        assert.equal((await wallState()).layout.places[i],home);
        await aim(home);
      }
      await press('KeyE');assert((await wallState()).holding);
      await aim(i);await press('KeyE');
      assert.equal((await wallState()).layout.places[i],i);
      if(n===0){
        assert(await dialog.isHidden(),'normal game view while assembling');
        await at(206,8);await press('KeyE');assert.equal(await index(),1);
        await at(160,-6);await press('KeyE');assert.equal(await index(),2);
        assert.equal((await wallState()).layout.places[i],i);
      }
    }
    assert(await dialog.isHidden());
    assert.match(await page.locator('#message').textContent(),/Освободи место/);
    assert.deepEqual(await reward(),before);
    await page.evaluate(()=>blockStaffSlot(false));
    await aim(16);await press('KeyE');
    assert.match(await dialog.innerText(),/импульсный посох и 15 золотых монет/);
    await dialog.getByText('Продолжить').click();
    assert.deepEqual(await reward(),earned);
    await press('KeyB');
    assert.equal(await page.locator('[data-item="weapon.pulse-staff"]').count(),1);
    assert.equal(await page.locator('.balance-amount').textContent(),String(earned.coins));
    await press('Escape');
    await at(200.6,3.45);await press('KeyE');assert.match(await dialog.innerText(),/Процессор запущен/);
    await press('Escape');assert.deepEqual(await reward(),earned);
    await at(200,-6);await press('KeyE');assert.equal(await index(),2);
    await at(193,-7);await press('KeyE');assert.equal(await index(),3);
    await at(40,2);await press('KeyE');
    const bits=dialog.locator('.signal-bits button');
    await bits.nth(1).click();assert.match(await dialog.innerText(),/Песчаник/);
    await bits.nth(1).click();await bits.nth(0).click();
    assert.match(await dialog.locator('[role=status]').innerText(),/Дерево · сигнал принят/);
    await press('Escape');await at(40,-2);await press('KeyE');assert.equal(await index(),3);
    await at(46,6);await press('KeyE');assert.equal(await index(),2);
    assert.deepEqual(await reward(),earned);
    await click('#reset');await click('#restart-confirm');
    assert.deepEqual(await reward(),before);
    assert.equal((await wallState()).cubes,0,'reset returns the stand to blank');
    await at(193,-7);await press('KeyE');assert.equal(await index(),2);
    await at(206,6);await press('KeyE');assert.equal(await index(),2);
    await at(206,8);await press('KeyE');assert.equal(await index(),1);
    await click('#reset');await click('#restart-confirm');
    assert.equal(await page.evaluate(()=>workTest.state().met),false);
    assert.equal(await page.evaluate(()=>workTest.tool()),'wand');
    await at(160,-6);await press('KeyE');assert.equal(await index(),1);
    assert.equal(await page.evaluate(()=>workTest.marked()),true);
    await press('KeyL');
    for(const [bug,hitsNeeded] of hitsByBug.entries()){
      for(let hit=0;hit<hitsNeeded;hit++){
        await tick(.4);await near('repair-bug-'+bug);await press('Digit1');
      }
      await tick(.6);
      await press('Escape');await press('KeyE');
      const fields=dialog.locator('input');
      const answers=bug?['for','range','print']:['input','print'];
      for(let i=0;i<answers.length;i++)await fields.nth(i).fill(answers[i]);
      await dialog.getByText('Проверить программу').click();await tick(1.5);
      for(const part of bug?parts.slice(2):parts.slice(0,2)){await near(part);await press('KeyE')}
    }
    assert.equal((await items()).length,5);
    assert.equal(await page.evaluate(()=>workTest.state().met),false);
    assert.match(await page.locator('#quest-action').textContent(),/Поговори с черепахой/);
    await near('turtle-mechanic');await tick(.2);await press('KeyE');
    assert.equal(await page.evaluate(()=>workTest.marked()),false);
    await dialog.getByText('К верстаку').click();
    assert.equal(await dialog.locator('[data-part]:enabled').count(),5);
    await press('Escape');
    await page.evaluate(()=>workTest.finishEarlierRepair());
    await near('turtle-mechanic');await press('KeyE');
    await page.evaluate(()=>workTest.tickReduced(.36));
    assert.equal(await dialog.getByText('Принять топор').isVisible(),true);
    assert.deepEqual(errors,[]);
    console.log('PASS turtle, combat, repair retries, transformation, five drops, inventory, delivery nod, assembly, pannier gift reveal and axe reward, woodcutting, wooden arch, two-bit station, travel and reset');
  } finally {await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
