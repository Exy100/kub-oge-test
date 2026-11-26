const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

(async()=>{
  const repo=path.resolve(__dirname,'..');
  const server=spawn('python3',['-m','http.server','8197','--bind','127.0.0.1'],{cwd:repo,stdio:'ignore'});
  let browser;
  try{
    browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:800,height:600}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(/shader error|validate_status false/i.test(m.text()))errors.push(m.text())});
    await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('kub.navigator.v1','27')});
    await page.route('**/game.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(repo,'game.js'),'utf8')+`
      window.staffTest={
        arrive(){
          stages.find(s=>s.locationId==='island.processor-lab').unlocked=true;
          goToIsland(1,'');
          const bug=island.getObjectByName('repair-bug-1');
          bug.position.set(stage.center,0,5);
          player.position.set(stage.center,0,9);
          camera.position.copy(player.position);camera.position.y+=1.5;
          camera.lookAt(bug.position.x,.8,bug.position.z);
        },
        sample(dt,third){
          character.animate(dt,{time:1});
          player.visible=third;
          gathering.update(dt,1,{active:true,third,tool:bag.loadouts.battle.weapon});
          renderer.render(scene,camera);gathering.render();
          const model=(third?player:gathering.viewScene).getObjectByName(STAFF_ID);
          return {hp:stage.repair.bugs[1].hp,visible:model.visible,
            fill:model.children.find(o=>o.material?.isShaderMaterial).material.uniforms.fill.value};
        },
        obstruct(){box(stage.center,1,7,1,2,.5,0x666666,true);scene.updateMatrixWorld(true)},
        resetLab(){goToIsland(2,'')}
      };`}));
    await page.goto('http://127.0.0.1:8197/game.html');
    await page.click('#play');
    await page.evaluate(()=>staffTest.arrive());
    await page.keyboard.press('c');
    const menu=page.locator('#weapons-dialog');
    await menu.getByRole('button',{name:'Бой',exact:true}).click();
    await menu.locator('[data-slot="weapon"]').click();
    await menu.getByRole('button',{name:'Надеть · Импульсный посох'}).click();
    await page.keyboard.press('Escape');
    const sample=(dt,third=false)=>page.evaluate(([dt,third])=>staffTest.sample(dt,third),[dt,third]);
    assert.deepEqual(await sample(0),{hp:10,visible:true,fill:1});
    await page.keyboard.press('1');
    assert.equal((await sample(.12)).hp,10);
    const fired=await sample(.07);
    assert.equal(fired.hp,8);assert.ok(fired.fill<.02);
    await page.keyboard.press('1');
    const recovering=await sample(.3,true);
    assert.ok(recovering.visible && recovering.fill>.45 && recovering.fill<.55);
    assert.equal(recovering.hp,8);
    assert.equal((await sample(.4)).fill,1);
    await page.evaluate(()=>staffTest.obstruct());
    await page.keyboard.press('1');
    assert.equal((await sample(.2)).hp,8,'solid cover stops a shot');
    await page.evaluate(()=>staffTest.resetLab());
    await page.click('#reset');await page.click('#restart-confirm');
    assert.equal(await page.locator('.combat-slot').first().locator('span').textContent(),'Удар');
    assert.deepEqual(errors,[]);
    console.log('PASS staff selection, both cameras, shot, recovery, cover and lab reset');
  }finally{await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
