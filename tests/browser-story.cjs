const {chromium}=require('playwright');
const {spawn}=require('child_process');const fs=require('fs');const path=require('path');const repo=path.resolve(__dirname,'..');
(async()=>{const server=spawn('python3',['-m','http.server','8050','--bind','127.0.0.1'],{cwd:repo,stdio:'ignore'});let browser;
try{await new Promise(r=>setTimeout(r,400));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/game.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(repo,'game.js'),'utf8')+`
window.storyTest={
 snapshot(){return {index:stage.index,built:stage.built.size,inventory:stage.inventory.slice(),unlocked:stage.unlocked,pickups:stage.pickups.length}},
 nearGate(){player.position.set(stage.index===0?0:stage.center+6,0,stage.index===0?0:5)},
 nearHub(){player.position.set(-5,0,1)},
 collect(){for(const m of [...stage.pickups]){player.position.set(m.position.x,0,m.position.z+2);camera.position.set(m.position.x,2.5,m.position.z);camera.lookAt(m.position);camera.updateMatrixWorld();scene.updateMatrixWorld(true);act(0)}},
 build(i,material){const t=stage.targets[i];select(material??t.material);player.position.set(t.x,0,t.z+2);camera.position.set(t.x,t.y,t.z+2);camera.lookAt(t.x,t.y,t.z);camera.updateMatrixWorld();scene.updateMatrixWorld(true);act(0)},
 remove(i){const t=stage.targets[i];player.position.set(t.x,0,t.z+2);camera.position.set(t.x,t.y,t.z+2);camera.lookAt(t.x,t.y,t.z);camera.updateMatrixWorld();scene.updateMatrixWorld(true);act(2)},
 getPosition(){return player.position.toArray()},
 forgeSnapshot(){return {bits:forge.state.bits,slots:forge.state.slots.filter(Boolean).length,bytes:forge.state.bytes,pending:forge.state.pendingBytes,crafted:forge.state.crafted,inserted:forge.state.cells.filter(Boolean).length,unlocked:forge.state.unlocked,pickups:forge.pickups.length}},
 nextGate(){player.position.set(stage.index===1?40:86,0,stage.index===1?-1:-3)},
 nearBench(){player.position.set(80,0,-1.3)},
 collectBits(){for(const m of [...forge.pickups]){player.position.set(m.position.x,0,m.position.z+1);camera.position.set(m.position.x,2.5,m.position.z);camera.lookAt(m.position);camera.updateMatrixWorld();scene.updateMatrixWorld(true);act(0)}},
 bitMaterial(){return forge.pickups[0].material.map(m=>m.uuid)},
 collectBytes(){for(const model of [...forge.bytePickups]){player.position.set(model.position.x,0,model.position.z+2);camera.position.set(model.position.x,3,model.position.z);camera.lookAt(model.position);camera.updateMatrixWorld();scene.updateMatrixWorld(true);act(0)}},
 offerByte(i){const pad=forge.cells[i];player.position.set(pad.position.x,0,pad.position.z+1.5);camera.position.set(pad.position.x,3,pad.position.z);camera.lookAt(pad.position);camera.updateMatrixWorld();scene.updateMatrixWorld(true);act(0)},
 byteDetails(){const model=forge.bytePickups[0];const shell=model.getObjectByName('byte-glass');return {bits:model.userData.innerBits.length,transparent:shell.material.transparent,opacity:shell.material.opacity,parts:model.children.length}},
 viewArch(){player.position.set(86,0,1);yaw=0;pitch=.15}
};`}));
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
await page.goto('http://127.0.0.1:8050');if(await page.locator('#play').isDisabled())await page.locator('#welcome [data-navigator="27"]').click();await page.locator('#play').click();
await page.evaluate(()=>{document.exitPointerLock();window.storyTest.nearHub()});await page.waitForFunction(()=>!document.querySelector('#portal-prompt').hidden);await page.keyboard.press('e');
assert(await page.locator('#paths-dialog').evaluate(e=>e.open),'hub opens with E');
await page.locator('[data-choose="code"]').click();assert((await page.locator('#chosen-path').textContent()).includes('программирования'),'path selection');
assert(await page.evaluate(()=>localStorage.getItem('kub.learning-path.v1'))==='code','path persistence');
await page.evaluate(()=>window.storyTest.nearGate());await page.keyboard.press('e');assert((await page.evaluate(()=>window.storyTest.snapshot())).index===0,'portal must be locked');
await page.evaluate(()=>window.storyTest.collect());let s=await page.evaluate(()=>window.storyTest.snapshot());assert(s.inventory[0]===7&&s.pickups===0,'collect first island cubes');
await page.keyboard.press('KeyB');
const sandstone=page.locator('.bag-cell').filter({hasText:'Песчаник'});
assert((await sandstone.innerText()).includes('×7'),'gathered sandstone occupies a stack');
await page.keyboard.press('KeyB');
for(let i=0;i<7;i++)await page.evaluate(i=>window.storyTest.build(i),i);
s=await page.evaluate(()=>window.storyTest.snapshot());assert(s.built===7&&s.unlocked,'first arch opens portal');
await page.keyboard.press('KeyB');
assert(await sandstone.count()===0,'building spends the inventory stack');
await page.keyboard.press('KeyB');
await page.evaluate(()=>window.storyTest.nearGate());await page.keyboard.press('e');s=await page.evaluate(()=>window.storyTest.snapshot());assert(s.index===1&&s.pickups===21,'second island');
await page.screenshot({path:'/tmp/kub-second-island.png'});
await page.evaluate(()=>window.storyTest.collect());s=await page.evaluate(()=>window.storyTest.snapshot());assert([0,2,3].every(m=>s.inventory[m]===7),'collect three distinct materials');
await page.evaluate(()=>window.storyTest.build(7,0));assert((await page.evaluate(()=>window.storyTest.snapshot())).built===0,'reject wrong material');
for(let i=0;i<21;i++)await page.evaluate(i=>window.storyTest.build(i),i);
s=await page.evaluate(()=>window.storyTest.snapshot());assert(s.built===21&&s.unlocked,'three arches complete');
await page.evaluate(()=>window.storyTest.remove(8));s=await page.evaluate(()=>window.storyTest.snapshot());assert(s.built===20&&s.inventory[2]===1,'refund wood on removal');
await page.evaluate(()=>window.storyTest.build(8));
await page.evaluate(()=>window.storyTest.nearGate());await page.keyboard.press('e');s=await page.evaluate(()=>window.storyTest.snapshot());assert(s.index===0&&s.built===7,'return preserves first island');
await page.evaluate(()=>window.storyTest.nearGate());await page.keyboard.press('e');assert((await page.evaluate(()=>window.storyTest.snapshot())).built===21,'return preserves second island');
await page.evaluate(()=>window.storyTest.nextGate());await page.keyboard.press('e');assert((await page.evaluate(()=>window.storyTest.snapshot())).index===2,'three arches open forge');
await page.screenshot({path:'/tmp/kub-forge-world.png'});
let faces=await page.evaluate(()=>window.storyTest.bitMaterial());
await page.waitForFunction(before=>window.storyTest.bitMaterial().every((face,i)=>face!==before[i]),faces,{timeout:10000});
await page.evaluate(()=>window.storyTest.nextGate());await page.keyboard.press('e');assert((await page.evaluate(()=>window.storyTest.snapshot())).index===2,'forge door locked');
for(let batch=0;batch<4;batch++){
 await page.evaluate(()=>window.storyTest.collectBits());let f=await page.evaluate(()=>window.storyTest.forgeSnapshot());assert(f.bits===8&&f.pickups===0,'eight collectible bits per batch');
 await page.evaluate(()=>window.storyTest.nearBench());await page.keyboard.press('e');assert(await page.locator('#forge-dialog').evaluate(el=>el.open),'forge opens');
 assert(await page.locator('#craft-byte').isDisabled(),'cannot craft empty block');
 await page.locator('#fill-bits').click();assert(!(await page.locator('#craft-byte').isDisabled()),'all slots enable crafting');
 if(batch===0){await page.locator('[data-slot="0"]').click();assert(await page.locator('#craft-byte').isDisabled(),'removing bit disables crafting');await page.locator('[data-slot="0"]').click();await page.screenshot({path:'/tmp/kub-forge-ui.png'})}
 await page.locator('#craft-byte').click();f=await page.evaluate(()=>window.storyTest.forgeSnapshot());assert(f.bytes===0&&f.pending===1&&f.crafted===batch+1,'crafted byte waits on tray');
 const details=await page.evaluate(()=>window.storyTest.byteDetails());assert(details.bits===4&&details.transparent&&details.opacity<.5&&details.parts>25,'detailed transparent byte with four inner bits');
 await page.locator('#forge-close').click();
 await page.evaluate(()=>window.storyTest.collectBytes());f=await page.evaluate(()=>window.storyTest.forgeSnapshot());assert(f.bytes===1&&f.pending===0,'byte collected into bag');
 await page.evaluate(i=>window.storyTest.offerByte(i),batch);f=await page.evaluate(()=>window.storyTest.forgeSnapshot());assert(f.inserted===batch+1&&f.bytes===0&&f.unlocked===(batch===3),'four physical offerings unlock arch');
}
assert((await page.evaluate(()=>window.storyTest.forgeSnapshot())).pickups===0,'no extra bits after fourth byte');
await page.evaluate(()=>window.storyTest.viewArch());await page.waitForTimeout(200);await page.screenshot({path:'/tmp/kub-byte-arch.png'});
await page.evaluate(()=>window.storyTest.nextGate());await page.keyboard.press('e');assert((await page.evaluate(()=>window.storyTest.snapshot())).index===3,'door enters next location');
await page.evaluate(()=>window.storyTest.nearGate());await page.keyboard.press('e');assert((await page.evaluate(()=>window.storyTest.snapshot())).index===2,'return to forge');
assert((await page.evaluate(()=>window.storyTest.forgeSnapshot())).unlocked,'forge progress retained');
await page.locator('#reset').click();let reset=await page.evaluate(()=>window.storyTest.forgeSnapshot());assert(reset.bits===0&&reset.pickups===8&&!reset.unlocked&&reset.inserted===0,'forge reset');
await page.reload();assert((await page.locator('#chosen-path').textContent()).includes('программирования'),'selected path restored');
console.log(JSON.stringify({result:'hub, 28 placements, four islands, 32 bits, animated faces, four transparent bytes collected into bag and offered to arch, locked/open gate, return and reset passed',errors}));if(errors.length)throw Error(errors.join(';'));
}finally{if(browser)await browser.close();server.kill()}})().catch(e=>{console.error(e);process.exitCode=1});
