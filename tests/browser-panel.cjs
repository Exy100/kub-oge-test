const {chromium}=require('playwright');const {spawn}=require('child_process');const fs=require('fs');const path=require('path');
const assert=(x,msg)=>{if(!x)throw Error(msg)};
(async()=>{const repo=path.resolve(__dirname,'..');const server=spawn('python3',['-m','http.server','8064','--bind','127.0.0.1'],{cwd:repo,stdio:'ignore'});let browser;
try{await new Promise(r=>setTimeout(r,500));browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/game.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(repo,'game.js'),'utf8')+'\nwindow.panelTest={cameraThird:()=>third,playerAccount,position:()=>player.position.toArray(),stage:(i)=>{enterIsland(stages[i]);refreshMission()},act:()=>act(0)};'}));
await page.goto('http://127.0.0.1:8064/game.html');if(await page.locator('#play').isDisabled())await page.locator('#welcome [data-navigator="27"]').click();await page.locator('#play').click();
await page.waitForFunction(()=>document.pointerLockElement===document.querySelector('#world'));
const mode=()=>page.locator('.player-dock').getAttribute('data-mode');
await page.keyboard.down('l');
await page.keyboard.down('l');
assert(await mode()==='battle','holding L switches only once');
await page.keyboard.up('l');
await physical('KeyL','д');
assert(await mode()==='build','same physical key on Russian layout returns to build');
const cdp=await page.context().newCDPSession(page);
async function pressBack(x,y,heldButtons=0){
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'back',buttons:heldButtons|8,clickCount:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'back',buttons:heldButtons,clickCount:1});
}
async function checkBrowserBack(x,y,expectedMode){
  await page.evaluate(()=>history.pushState(null,'','#free'));
  await pressBack(x,y);
  await page.waitForFunction(()=>location.hash==='#game');
  assert(await mode()===expectedMode,'browser Back preserves the panel mode');
}
await page.evaluate(()=>history.pushState(null,'','#game'));
await pressBack(740,370);
assert(await mode()==='battle','Back enters battle under pointer lock');
// Input layers can consume the compatibility mousedown after pointerdown.
await page.evaluate(()=>window.addEventListener('mousedown',e=>e.stopImmediatePropagation(),{capture:true,once:true}));
await pressBack(740,370);
assert(await mode()==='build','pointer press alone returns to build');
await pressBack(740,370);
assert(await mode()==='battle','next Back press toggles exactly once');
await page.mouse.click(740,370,{button:'middle'});
await page.mouse.wheel(0,120);
assert(await mode()==='battle','wheel click and scroll keep mode');
assert(new URL(page.url()).hash==='#game','camera shortcut preserves browser history position');
await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!document.pointerLockElement);
await checkBrowserBack(740,370,'battle');
const quest=page.locator('#quest-panel'), questTab=page.locator('#quest-tab');
await page.locator('#quest-title').click({button:'middle'});
assert(await mode()==='battle','free cursor over quest keeps mode');
await page.locator('#inventory-button').click({button:'middle'});
assert(await mode()==='battle','free cursor over dock keeps mode');
const modeTab=page.locator('#mode-switch');
assert(await modeTab.isVisible() && await modeTab.getAttribute('aria-pressed')==='true','attached tab shows battle');
assert(await modeTab.locator('.mode-label').innerText()==='Бой','tab names current battle mode');
await modeTab.locator('.mode-label').click();
assert(await modeTab.locator('.mode-label').innerText()==='Сборка','label click updates current mode');
// The empty edge of the tab is clickable too.
await modeTab.click({position:{x:8,y:12}});
assert(await mode()==='battle','tab edge toggles mode');
await modeTab.click();
assert(await mode()==='build' && await modeTab.getAttribute('aria-pressed')==='false','tab selects build');
await modeTab.press('Enter');
assert(await mode()==='battle','keyboard activates mode tab');
await page.mouse.move(740,370);
await page.mouse.down({button:'right'});
await page.mouse.move(750,375);
await pressBack(750,375,2);
assert(await mode()==='build','Back switches during camera drag');
assert(new URL(page.url()).hash==='#game','drag shortcut preserves browser history position');
await page.mouse.up({button:'right'});
await checkBrowserBack(750,375,'build');
assert(await quest.isVisible(),'quest starts on the left');
const closeQuest=quest.getByRole('button',{name:'Закрыть задание'});
await closeQuest.click();
assert(!await quest.isVisible() && await questTab.getAttribute('aria-expanded')==='false','corner closes quest');
assert(await questTab.evaluate(el=>el===document.activeElement),'focus returns to the quest tab');
await questTab.press('Enter');
await closeQuest.focus();await page.keyboard.press('Space');
assert(!await quest.isVisible(),'keyboard closes quest');
await questTab.click();
const guideButton=page.locator('#guide-button'), guide=page.locator('#controls-guide');
await physical('KeyJ','о');
assert(!await quest.isVisible(),'Russian J closes quest');
await page.keyboard.press('j');
assert(await quest.isVisible(),'J opens quest');
await guideButton.click();
assert(await guide.getByRole('tab',{name:'Клавиатура'}).getAttribute('aria-selected')==='true','keyboard guide selected initially');
await page.keyboard.press('ArrowRight');
assert(await guide.getByRole('tabpanel',{name:'Мышь'}).isVisible(),'arrow switches to mouse guide');
assert(await guide.getByText('Боковая кнопка «Назад»').isVisible(),'mouse guide explains Back');
await page.keyboard.press('c+v');
assert(await mode()==='build','help blocks game input');
await guide.getByRole('button',{name:'Закрыть управление'}).click();
assert(!await guide.isVisible() && await quest.isVisible(),'guide close keeps quest open');
await page.locator('#world').click({position:{x:740,y:370}});
await page.waitForFunction(()=>!!document.pointerLockElement);
await physical('KeyH','р');
await page.waitForFunction(()=>!document.pointerLockElement);
assert(await guide.isVisible(),'Russian H opens guide and releases camera');
await physical('KeyH','р');
assert(!await guide.isVisible(),'Russian H closes guide');
await questTab.click();
assert(!await quest.isVisible()&&await questTab.getAttribute('aria-expanded')==='false','quest collapses');
await page.evaluate(()=>panelTest.stage(3));
await questTab.press('Enter');
assert(await quest.isVisible()&&(await quest.innerText()).includes('Кузница байтов'),'quest reopens with current island');
await page.evaluate(()=>panelTest.stage(0));
const bagWindow=page.locator('#inventory-dialog'), gearWindow=page.locator('#weapons-dialog');
await page.evaluate(()=>panelTest.playerAccount.coins=17);
await page.locator('#inventory-button').click();
assert(await bagWindow.isVisible(),'bag opens by mouse');
await physical('KeyL','д');
assert(await mode()==='build' && await bagWindow.isVisible(),'L leaves an open inventory alone');
const heading=await bagWindow.locator('h2').boundingBox();
await checkBrowserBack(heading.x+5,heading.y+5,'build');
assert(await mode()==='build' && await bagWindow.isVisible(),'inventory blocks gameplay shortcut');
assert(await bagWindow.locator('.bag-cell').count()===20,'twenty cells');
assert(await bagWindow.locator('.occupied').count()===1,'coins do not consume a cell');
assert(await bagWindow.locator('.balance-amount').innerText()==='17','player balance');
const coin=bagWindow.locator('.balance-coin');
await coin.evaluate(img=>img.decode());
const icon=await coin.boundingBox(), firstCell=await bagWindow.locator('.bag-cell').first().boundingBox();
assert(icon.x < firstCell.x+10 && icon.y+icon.height <= firstCell.y,'coin sits above the first inventory column');
assert(icon.height >= firstCell.height*.65 && icon.height <= firstCell.height,'coin is almost one cell tall');
async function physical(code,key){
  await page.evaluate(([code,key])=>{
    for(const type of ['keydown','keyup'])dispatchEvent(new KeyboardEvent(type,{code,key}));
  },[code,key]);
}
await physical('KeyC','с');
assert(await gearWindow.isVisible()&&!await bagWindow.isVisible(),'Russian C selects gear from bag');
const tool=gearWindow.locator('[data-slot=tool]');
await tool.click();
await gearWindow.getByRole('button',{name:'Снять · Жезл сбора'}).click();
assert((await tool.innerText()).includes('Пусто'),'unequip wand');
await gearWindow.getByRole('button',{name:'Бой',exact:true}).click();
assert(await gearWindow.locator('[data-slot=weapon]').isVisible(),'weapon in battle mode');
await gearWindow.getByRole('button',{name:'Исследование',exact:true}).click();
await tool.click();
await gearWindow.getByRole('button',{name:'Надеть · Жезл сбора'}).click();
await physical('KeyC','с');
assert(!await gearWindow.isVisible(),'gear toggles closed');
await page.evaluate(()=>panelTest.playerAccount.coins=1234567);
await physical('KeyB','и');assert(await bagWindow.isVisible(),'Russian B opens bag');
assert((await bagWindow.locator('.balance-amount').innerText()).replace(/\s/g,'')==='1234567','reopening reads the current account balance');
await physical('KeyB','и');assert(!await bagWindow.isVisible(),'Russian B closes bag');
await page.screenshot({path:'/tmp/kub-panel-build.png'});
await page.locator('#navigator-button').click();assert(await page.locator('#navigator-dialog').evaluate(e=>e.open),'navigator click');assert((await page.locator('#navigator-task').innerText()).includes('семь кубов'),'contextual mission');
const pos=await page.evaluate(()=>panelTest.position());await page.keyboard.down('KeyW');await page.waitForTimeout(100);await page.keyboard.up('KeyW');assert(JSON.stringify(pos)===JSON.stringify(await page.evaluate(()=>panelTest.position())),'dialog pauses movement');await page.keyboard.press('Escape');
for(const order of [['KeyC','KeyV'],['KeyV','KeyC']]){const camera=await page.evaluate(()=>panelTest.cameraThird());await page.keyboard.down(order[0]);await page.keyboard.down(order[1]);await page.keyboard.up(order[1]);await page.keyboard.up(order[0]);assert(await page.evaluate(()=>panelTest.cameraThird())===camera,'mode chord keeps camera');}
const camera=await page.evaluate(()=>panelTest.cameraThird());await page.keyboard.press('KeyV');assert(await page.evaluate(()=>panelTest.cameraThird())!==camera,'single V changes camera');
await page.evaluate(()=>{for(const [code,key] of [['KeyX','ч'],['KeyZ','я']])dispatchEvent(new KeyboardEvent('keydown',{code,key}));for(const code of ['KeyX','KeyZ'])dispatchEvent(new KeyboardEvent('keyup',{code}));});assert(await page.locator('#navigator-dialog').evaluate(e=>e.open),'Russian physical chord');await page.keyboard.press('Escape');
await page.keyboard.press('c+v');assert(await page.locator('.battle-bar').isVisible(),'battle visible');assert(!await page.locator('.hotbar').isVisible(),'build hidden');
const rim=()=>page.locator('.dock-frame').evaluate(e=>{
  const style=getComputedStyle(e,'::before');
  return {name:style.animationName,angle:style.getPropertyValue('--battle-rim-angle')};
});
const initialRim=await rim();
assert(initialRim.name==='battle-rim-turn','battle rim animates');
await page.waitForFunction(angle=>getComputedStyle(document.querySelector('.dock-frame'),'::before').getPropertyValue('--battle-rim-angle')!==angle,initialRim.angle);
await page.emulateMedia({reducedMotion:'reduce'});
assert((await rim()).name==='none','reduced motion keeps rim still');
await page.emulateMedia({reducedMotion:'no-preference'});
await page.screenshot({path:'/tmp/kub-panel-battle.png'});await page.locator('#weapons-button').click();assert(await page.locator('#weapons-dialog').evaluate(e=>e.open),'gear opens in battle mode');await page.keyboard.press('Escape');await page.keyboard.press('c+v');
assert((await rim()).name==='none','exploration rim stays still');
await page.locator('.slot').nth(2).click();assert(await page.locator('.slot').nth(2).evaluate(e=>e.classList.contains('selected')),'build selection works');
await page.evaluate(()=>panelTest.stage(3));await page.locator('#navigator-button').click();assert((await page.locator('#navigator-task').innerText()).includes('биты'),'forge context');await page.keyboard.press('Escape');await page.evaluate(()=>panelTest.stage(0));
for(const width of [320,390,640,768,1440]){
  await page.setViewportSize({width,height:844});
  for(let i=0;i<2;i++){
    const build = await mode()==='build';
    const skillSlot = page.locator('#skill-slot');
    assert(await skillSlot.isVisible()===build,'skill slot follows the current mode at '+width);
    if (build) {
      assert(await skillSlot.evaluate(slot=>{
        const bounds=slot.getBoundingClientRect();
        const bar=document.querySelector('.hotbar').getBoundingClientRect();
        return bounds.left>=0 && bounds.right<=innerWidth && bounds.bottom<=bar.top+1
          && slot.scrollWidth<=slot.clientWidth+1;
      }),'skill name fits above materials at '+width);
    }
    const cells=page.locator(build ? '.hotbar > *' : '.battle-bar > *');
    assert(await cells.count()===9,'nine visible cells in either mode');
    assert(await cells.evaluateAll(items=>items.every((cell,i)=>{
      const box=cell.getBoundingClientRect();
      return cell.querySelector('kbd').textContent===String(i+1)
        && box.width>0 && box.right<=innerWidth && box.top===items[0].getBoundingClientRect().top
        && (i<6 || cell.disabled);
    })),'numbered cells fit in one row and empty cells are disabled at '+width);
    const fits=await page.locator('.dock-tabs').evaluate(row=>{
      const frame=document.querySelector('.dock-frame').getBoundingClientRect();
      return row.children.length===5 && [...row.children].every(button=>{
        const tab=button.getBoundingClientRect();
        const key=button.querySelector('kbd').getBoundingClientRect();
        const glyph=button.firstElementChild.getBoundingClientRect();
        return tab.top>=frame.bottom-1 && tab.bottom<=innerHeight && tab.left>=0 && tab.right<=innerWidth
          && button.scrollWidth<=button.clientWidth+1 && key.left>=glyph.right && key.right<=tab.right-1;
      });
    });
    assert(fits,'attached buttons and right-hand key caps fit at '+width+' in '+await mode());
    await modeTab.click();
  }
}
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:'/tmp/kub-panel-mobile.png'});
await guideButton.click();
await guide.getByRole('tab',{name:'Клавиатура'}).click();
assert(await guide.evaluate(d=>d.scrollWidth===d.clientWidth),'guide fits narrow display');
await page.screenshot({path:'/tmp/kub-guide-mobile.png'});
await page.keyboard.press('Escape');
assert(!await guide.isVisible(),'Escape closes guide');
await page.locator('#inventory-button').click();
assert(await bagWindow.evaluate(d=>d.scrollWidth===d.clientWidth),'bag fits mobile');
const rows=await bagWindow.locator('.bag-cell').evaluateAll(cells=>new Set(cells.map(c=>c.offsetTop)).size);
assert(rows===4,'four inventory rows on mobile');
await page.screenshot({path:'/tmp/kub-inventory-mobile.png'});
await page.keyboard.press('KeyC');
assert(await gearWindow.evaluate(d=>d.scrollWidth===d.clientWidth),'equipment fits mobile');
await page.screenshot({path:'/tmp/kub-equipment-mobile.png'});
assert(!errors.length,errors.join(';'));console.log('PASS: navigator, modal pause, both chord orders, Russian layout, standalone camera, modes, inventory, equipment, selection, forge and responsive widths');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
