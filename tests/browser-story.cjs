const {chromium}=require('playwright');
const {spawn}=require('child_process');const fs=require('fs');const path=require('path');const repo=path.resolve(__dirname,'..');
(async()=>{const server=spawn('python3',['-m','http.server','8050','--bind','127.0.0.1'],{cwd:repo,stdio:'ignore'});let browser;
try{await new Promise(r=>setTimeout(r,400));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/game.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(repo,'game.js'),'utf8')+`
window.storyTest={
 visitArches(){goToIsland(stages.find(s=>s.locationId==='island.three-arches').index)},
 at(x,z){player.position.set(x,0,z)},
 poweredLab(){stage.unlocked=true;update();player.position.set(exitGlow.position.x,0,exitGlow.position.z)},
 repairedWorkshop(){stage.repair.parts.fill('installed');stage.repair.axe=true;stage.inventory[2]=7;stage.targets.forEach((_,i)=>placeTarget(stage,i,2));update();player.position.set(stage.center,0,-6)},
 currentIslandOnly(){
   const unloaded=stages.filter(s=>s!==stage);
   island.updateMatrixWorld(true);
   let local=true;
   island.traverseVisible(m=>{
     if(m.isInstancedMesh){
       m.computeBoundingBox();
       const bounds=m.boundingBox.clone().applyMatrix4(m.matrixWorld);
       local &&= bounds.min.x>stage.center-13 && bounds.max.x<stage.center+13;
     }else if(m.isMesh){
       local &&= Math.abs(m.getWorldPosition(new THREE.Vector3()).x-stage.center)<13;
     }
   });
   return local && island.name===stage.locationId && unloaded.every(s=>!s.placed&&!s.pickups&&!s.ghosts)
     && solids.every(m=>m.parent===island);
 },
 snapshot(){return {index:stage.index,built:stage.built.size,inventory:stage.inventory.slice(),unlocked:stage.unlocked,pickups:stage.pickups.length}},
 nearGate(){player.position.set(returnGlow?.position.x ?? 0,0,returnGlow?.position.z ?? 0)},
 formerPortal(x){player.position.set(x,0,1)},
 portalSolids(){return solids.filter(b=>Math.abs(Math.abs(b.position.x)-5)<1.6&&Math.abs(b.position.z)<.4&&b.position.y>.1).length},
 collect(){for(const m of [...stage.pickups]){player.position.set(m.position.x,0,m.position.z+2);camera.position.set(m.position.x,2.5,m.position.z);camera.lookAt(m.position);camera.updateMatrixWorld();scene.updateMatrixWorld(true);act(0)}},
 build(i,material){const t=stage.targets[i];select(material??t.material);player.position.set(t.x,0,t.z+2);camera.position.set(t.x,t.y,t.z+2);camera.lookAt(t.x,t.y,t.z);camera.updateMatrixWorld();scene.updateMatrixWorld(true);act(0)},
 aimAtBlock(i){const t=stage.targets[i];player.position.set(t.x,0,t.z+2);camera.position.set(t.x,t.y,t.z+2);camera.lookAt(t.x,t.y,t.z);camera.updateMatrixWorld();scene.updateMatrixWorld(true)},
 remove(i){this.aimAtBlock(i);act(2)},
 getPosition(){return player.position.toArray()},
 worldCounts(){return {colliders:solids.length,blocks:stage.placed.length,tray:forge?.bytePickups.length??0,platform:forge?.deposited.length??0}},
 playerState(){return {coins:playerAccount.coins,kits:bag.loadouts,mode:panel.isBattle(),third}},
 forgeSnapshot(){return {bits:forgeState.bits,slots:forgeState.slots.filter(Boolean).length,bytes:forgeState.bytes,pending:forgeState.pendingBytes,crafted:forgeState.crafted,inserted:forgeState.cells.filter(Boolean).length,unlocked:forgeState.unlocked,pickups:forge?.pickups.length??stages.find(s=>s.locationId==='island.data-forge').remainingBits?.length??8}},
 nextGate(){player.position.set(stage.index===4?40:86,0,stage.index===4?-1:-3)},
 operate(slot,mouse=0){
   const target=slot===8?island.getObjectByName('forge-start'):island.children.find(m=>m.userData.forgeSlot===slot);
   player.position.set(80,0,-.35);camera.position.set(80,1.5,-.35);camera.lookAt(target.position);
   scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);act(mouse);
 },
 collectBits(){for(const m of [...forge.pickups]){player.position.set(m.position.x,0,m.position.z+1);camera.position.set(m.position.x,2.5,m.position.z);camera.lookAt(m.position);camera.updateMatrixWorld();scene.updateMatrixWorld(true);act(0)}},
 bitMaterial(){return forge.pickups[0].material.map(m=>m.uuid)},
 collectBytes(){for(const model of [...forge.bytePickups]){player.position.set(model.position.x,0,model.position.z+2);camera.position.set(model.position.x,3,model.position.z);camera.lookAt(model.position);camera.updateMatrixWorld();scene.updateMatrixWorld(true);act(0)}},
 offerByte(i){const pad=forge.cells[i];player.position.set(pad.position.x,0,pad.position.z+1.5);camera.position.set(pad.position.x,3,pad.position.z);camera.lookAt(pad.position);camera.updateMatrixWorld();scene.updateMatrixWorld(true);act(0)},
 byteDetails(time,reduced=false){
   forge.update(player.position,time,true,true,reduced);
   const shell=forge.bytePickups[0].children[0];
   return {
     cubes:shell.children.map(bit=>bit.geometry.attributes.position.count/36),
     target:forge.bytePickups[0].children[1].material.visible,
     lift:shell.children.map(bit=>bit.morphTargetInfluences[0]),
     digits:shell.children.map(bit=>bit.material.uuid),
     height:shell.position.y, angle:shell.rotation.y,
   };
 },
 viewArch(){player.position.set(86,0,1);yaw=0;pitch=.15}
};`}));
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
await page.goto('http://127.0.0.1:8050/game.html');if(await page.locator('#play').isDisabled())await page.locator('#welcome [data-navigator="27"]').click();await page.locator('#play').click();
await page.evaluate(()=>document.exitPointerLock());
await page.waitForFunction(()=>!document.pointerLockElement);
assert(await page.locator('#paths-button,#paths-dialog,#chosen-path,#portal-prompt,#navigator-paths').count()===0,'learning path UI removed');
assert(await page.evaluate(()=>storyTest.portalSolids())===0,'former learning portals have no solid frames');
for(const x of [-5,5]){
  await page.evaluate(x=>storyTest.formerPortal(x),x);await page.keyboard.press('e');
  assert(await page.locator('dialog[open]').count()===0,'E at former portal does not open a dialog');
}
await page.screenshot({path:'/tmp/kub-no-learning-portals.png'});
await page.evaluate(()=>window.storyTest.nearGate());await page.keyboard.press('e');assert((await page.evaluate(()=>window.storyTest.snapshot())).index===0,'portal must be locked');
await page.evaluate(()=>window.storyTest.collect());let s=await page.evaluate(()=>window.storyTest.snapshot());assert(s.inventory[0]===7&&s.pickups===0,'collect first island cubes');
await page.keyboard.press('KeyB');
const sandstone=page.locator('.bag-cell').filter({hasText:'Песчаник'});
assert((await sandstone.innerText()).includes('×7'),'gathered sandstone occupies a stack');
await page.keyboard.press('KeyB');
const restart=page.locator('#reset'), confirmation=page.locator('#restart-dialog');
const confirm=page.locator('#restart-confirm'), cancel=page.locator('#restart-cancel');
assert(await restart.evaluate(el=>!!el.closest('#quest-panel')) && await page.locator('.hotbar #reset').count()===0,'restart belongs to quest only');
await restart.focus();
await page.keyboard.press('Enter');await page.keyboard.press('Space');
assert(!await confirmation.isVisible(),'keyboard cannot request a restart');
await page.locator('#quest-tab').click();
assert(!await restart.isVisible(),'collapsed quest hides restart');
await page.locator('#quest-tab').click();
await page.evaluate(()=>storyTest.build(0));
// Aim and send the native keyboard event within the same frame.
async function reclaim(key, init={}){
  await page.evaluate(([key,init])=>{
    storyTest.aimAtBlock(0);
    document.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,cancelable:true,code:'KeyN',key,...init}));
  },[key,init]);
}
await reclaim('n',{repeat:true});
await reclaim('n',{ctrlKey:true});
assert((await page.evaluate(()=>storyTest.snapshot())).built===1,'repeat and browser shortcuts preserve the block');
for(const key of ['n','т']){
  await reclaim(key);
  const refund=await page.evaluate(()=>storyTest.snapshot());
  assert(refund.built===0 && refund.inventory[0]===7,'reclaim once on layout '+key);
  await page.evaluate(()=>storyTest.build(0));
}
assert(await page.evaluate(()=>storyTest.currentIslandOnly()),'only the first island is mounted');
const beforeCancel=await page.evaluate(()=>storyTest.snapshot());
await restart.dblclick();
assert(await confirmation.isVisible(),'double-click only opens confirmation');
await reclaim('т');
await page.keyboard.press('e');await page.keyboard.press('KeyB');
assert(await page.locator('dialog[open]').count()===1,'game input suspended');
await confirm.focus();await page.keyboard.press('Enter');await page.keyboard.press('Space');
assert(await confirmation.isVisible(),'keyboard cannot confirm');
await page.keyboard.press('Escape');
assert(!await confirmation.isVisible() && JSON.stringify(beforeCancel)===JSON.stringify(await page.evaluate(()=>storyTest.snapshot())),'Escape preserves state');
await restart.click();
assert(await cancel.evaluate(el=>el===document.activeElement),'cancel receives initial focus');
await cancel.click();
assert(JSON.stringify(beforeCancel)===JSON.stringify(await page.evaluate(()=>storyTest.snapshot())),'explicit cancellation preserves state');
await restart.click();await confirm.click();
let fresh=await page.evaluate(()=>storyTest.snapshot());
assert(fresh.index===0 && fresh.pickups===7 && fresh.built===0 && fresh.inventory.every(n=>n===0),'partial arch reset restores its seven resources');
const firstCounts=await page.evaluate(()=>storyTest.worldCounts());
await restart.click();assert((await confirmation.innerText()).includes('пока нет прогресса'),'empty island warning');
await confirm.click();
assert(JSON.stringify(firstCounts)===JSON.stringify(await page.evaluate(()=>storyTest.worldCounts())),'repeat restart preserves collider count');
await page.evaluate(()=>storyTest.collect());
assert((await page.evaluate(()=>storyTest.snapshot())).inventory[0]===7,'all seven new cubes can be collected after two resets');
const diagram=page.locator('#quest-diagram');
const drawing=()=>diagram.evaluate(canvas=>canvas.toDataURL());
const emptyArch=await drawing();
await page.evaluate(()=>storyTest.build(6));
const rightPillar=await drawing();
assert(rightPillar!==emptyArch,'placed block appears in the diagram');
await page.evaluate(()=>storyTest.remove(6));
assert(await drawing()===emptyArch,'removing that block restores its outline');
await page.evaluate(()=>storyTest.build(0));
assert(await drawing()!==rightPillar,'same count at a different coordinate changes the diagram');
for(let i=1;i<7;i++)await page.evaluate(i=>window.storyTest.build(i),i);
s=await page.evaluate(()=>window.storyTest.snapshot());assert(s.built===7&&s.unlocked,'first arch opens portal');
await page.keyboard.press('KeyB');
assert(await sandstone.count()===0,'building spends the inventory stack');
await page.keyboard.press('KeyB');
await page.evaluate(()=>window.storyTest.nearGate());await page.keyboard.press('e');s=await page.evaluate(()=>window.storyTest.snapshot());assert(s.index===1,'second island is the workshop');
await page.evaluate(()=>storyTest.repairedWorkshop());await page.keyboard.press('e');
// The workshop and processor puzzles are exercised by browser-workshop.
await page.evaluate(()=>storyTest.poweredLab());await page.keyboard.press('e');
for(let i=0;i<3;i++){await page.evaluate(()=>storyTest.nearGate());await page.keyboard.press('e')}
assert((await page.evaluate(()=>storyTest.snapshot())).built===7,'return preserves first island');
for(const [x,z] of [[0,-1],[160,-6],[193,-7]]){
  await page.evaluate(([x,z])=>storyTest.at(x,z),[x,z]);await page.keyboard.press('e');
}
assert(await page.evaluate(()=>storyTest.currentIslandOnly()),'only forge scenery is mounted');
await page.screenshot({path:'/tmp/kub-forge-world.png'});
let faces=await page.evaluate(()=>window.storyTest.bitMaterial());
await page.waitForFunction(before=>window.storyTest.bitMaterial().every((face,i)=>face!==before[i]),faces,{timeout:10000});
await page.evaluate(()=>window.storyTest.nextGate());await page.keyboard.press('e');assert((await page.evaluate(()=>window.storyTest.snapshot())).index===3,'forge door locked');
for(let batch=0;batch<4;batch++){
 await page.evaluate(()=>window.storyTest.collectBits());let f=await page.evaluate(()=>window.storyTest.forgeSnapshot());assert(f.bits===8&&f.pickups===0,'eight collectible bits per batch');
 await page.evaluate(()=>storyTest.operate(8));
 assert((await page.evaluate(()=>storyTest.forgeSnapshot())).pending===0,'empty machine cannot forge');
 await page.evaluate(()=>{for(let i=0;i<8;i++)storyTest.operate(i)});
 if(batch===0){
   await page.evaluate(()=>storyTest.operate(0,2));
   assert((await page.evaluate(()=>storyTest.forgeSnapshot())).slots===7,'right click withdraws one bit');
   await page.evaluate(()=>storyTest.operate(0));
 }
 await page.evaluate(()=>{storyTest.operate(8);storyTest.operate(8)});
 await page.waitForFunction(n=>storyTest.forgeSnapshot().crafted===n,batch+1);
 f=await page.evaluate(()=>storyTest.forgeSnapshot());assert(f.bytes===0&&f.pending===1&&f.crafted===batch+1,'one crafted byte waits on tray');
 if(batch===0){
   const [rest,peak,back,still,stillLater]=await page.evaluate(()=>[
     storyTest.byteDetails(0),storyTest.byteDetails(4.8),storyTest.byteDetails(9.6),
     storyTest.byteDetails(22,true),storyTest.byteDetails(48,true),
   ]);
   assert(rest.cubes.length===8 && rest.cubes.every(n=>n===4),'32 floating cubes repeat the eight bits');
   assert(rest.target===false,'the core is only an invisible pickup target');
   assert(rest.lift.every(v=>v===0) && peak.lift.every(v=>v>.32 && v<=.42),'a compact resting cube opens slightly at the peak');
   const settled=await page.evaluate(()=>Array.from({length:96},(_,i)=>storyTest.byteDetails(i/10).lift).filter(bits=>bits.every(v=>v===0)).length);
   assert(settled>=69,'all eight groups stay at home together for at least 6.9 seconds per cycle');
   assert(back.lift.every((v,i)=>Math.abs(v-rest.lift[i])<1e-6) && back.digits.every((v,i)=>v!==rest.digits[i]),'cubes return to the lattice and change digits');
   assert(peak.height!==rest.height && peak.angle!==rest.angle,'crafted byte hovers and turns');
   assert(JSON.stringify(still)===JSON.stringify(stillLater),'byte remains still with reduced motion');
 }
 await page.evaluate(()=>window.storyTest.collectBytes());f=await page.evaluate(()=>window.storyTest.forgeSnapshot());assert(f.bytes===1&&f.pending===0,'byte collected into bag');
 await page.evaluate(i=>window.storyTest.offerByte(i),batch);f=await page.evaluate(()=>window.storyTest.forgeSnapshot());assert(f.inserted===batch+1&&f.bytes===0&&f.unlocked===(batch===3),'four physical offerings unlock arch');
}
assert((await page.evaluate(()=>window.storyTest.forgeSnapshot())).pickups===0,'no extra bits after fourth byte');
await page.evaluate(()=>window.storyTest.viewArch());await page.waitForTimeout(200);await page.screenshot({path:'/tmp/kub-byte-arch.png'});
await page.evaluate(()=>storyTest.nextGate());await page.keyboard.press('e');
assert((await page.evaluate(()=>storyTest.snapshot())).pickups===21,'three arches have three sets of materials');
await page.evaluate(()=>storyTest.at(40,2));await page.keyboard.press('e');
const switches=page.locator('.signal-bits button');
await switches.nth(1).click();assert((await page.locator('#workshop-dialog').innerText()).includes('Песчаник'),'01 selects sandstone');
await switches.nth(1).click();await switches.nth(0).click();
assert((await page.locator('#workshop-dialog [role=status]').innerText()).includes('Дерево · сигнал принят'),'10 selects wood');
await page.keyboard.press('Escape');
assert(await page.evaluate(()=>storyTest.currentIslandOnly()),'leaving destroys the first island meshes and colliders');
await page.screenshot({path:'/tmp/kub-second-island.png'});
await page.evaluate(()=>window.storyTest.collect());s=await page.evaluate(()=>window.storyTest.snapshot());assert([0,2,3].every(m=>s.inventory[m]===7),'collect three distinct materials');
await page.evaluate(()=>window.storyTest.build(7,0));assert((await page.evaluate(()=>window.storyTest.snapshot())).built===0,'reject wrong material');
for(let i=0;i<21;i++)await page.evaluate(i=>window.storyTest.build(i),i);
s=await page.evaluate(()=>window.storyTest.snapshot());assert(s.built===21&&s.unlocked,'three arches complete');
await page.evaluate(()=>window.storyTest.remove(8));s=await page.evaluate(()=>window.storyTest.snapshot());assert(s.built===20&&s.inventory[2]===1,'refund wood on removal');
await page.evaluate(()=>window.storyTest.build(8));
await page.evaluate(()=>window.storyTest.nextGate());await page.keyboard.press('e');assert((await page.evaluate(()=>window.storyTest.snapshot())).index===5,'door enters next location');
assert(await page.evaluate(()=>storyTest.currentIslandOnly()),'garden contains no forge objects');
await restart.click();
assert((await confirmation.innerText()).includes('Прогресс других островов сохранится'),'garden warning matches scope');
await confirm.click();
assert((await page.evaluate(()=>storyTest.forgeSnapshot())).unlocked,'garden restart preserves adjacent gate');
await page.evaluate(()=>storyTest.nearGate());await page.keyboard.press('e');
assert((await page.evaluate(()=>storyTest.snapshot())).built===21,'return preserves three arches');
await page.evaluate(()=>storyTest.nearGate());await page.keyboard.press('e');
assert((await page.evaluate(()=>storyTest.snapshot())).index===3,'return to forge');
assert((await page.evaluate(()=>window.storyTest.forgeSnapshot())).unlocked,'forge progress retained');
await page.keyboard.press('c+v');
const beforeForgeReset=await page.evaluate(()=>storyTest.playerState());
await restart.click();await cancel.click();
assert((await page.evaluate(()=>storyTest.forgeSnapshot())).unlocked,'cancelling keeps forge gate open');
await restart.click();await confirm.click();
const cleanForge={bits:0,slots:0,bytes:0,pending:0,crafted:0,inserted:0,unlocked:false,pickups:8};
assert(JSON.stringify(await page.evaluate(()=>storyTest.forgeSnapshot()))===JSON.stringify(cleanForge),'forge reset clears all four offerings and restores one batch');
assert((await page.evaluate(()=>storyTest.worldCounts())).platform===0,'physical offerings removed');
assert(JSON.stringify(beforeForgeReset)===JSON.stringify(await page.evaluate(()=>storyTest.playerState())),'player gear, coins, camera and battle mode retained');
await page.evaluate(()=>storyTest.nextGate());await page.keyboard.press('e');
assert((await page.evaluate(()=>storyTest.snapshot())).index===3,'forge gate relocked');
await page.keyboard.press('c+v');
await page.evaluate(()=>{storyTest.collectBits();for(let i=0;i<8;i++)storyTest.operate(i);storyTest.operate(8)});
await page.waitForFunction(()=>storyTest.forgeSnapshot().crafted===1);
await page.evaluate(()=>{storyTest.collectBits();storyTest.operate(0)});
const partialForge=await page.evaluate(()=>storyTest.forgeSnapshot());
assert(partialForge.slots===1 && partialForge.bits===7 && partialForge.pending===1,'partly loaded forge and uncollected byte');
await page.evaluate(()=>storyTest.nearGate());await page.keyboard.press('e');
assert((await page.evaluate(()=>storyTest.snapshot())).index===2,'return to laboratory');
// Visit the later island independently while the forge gate is closed, as in the travel menu.
await page.evaluate(()=>storyTest.visitArches());
assert((await page.evaluate(()=>storyTest.snapshot())).built===21,'forge reset preserves three arches');
await restart.click();await confirm.click();
const resetArches=await page.evaluate(()=>storyTest.snapshot());
assert(resetArches.pickups===21 && !resetArches.unlocked,'reset restores arch materials and closes portal');
await page.evaluate(()=>storyTest.nearGate());await page.keyboard.press('e');
assert(JSON.stringify(await page.evaluate(()=>storyTest.forgeSnapshot()))===JSON.stringify(partialForge),'forge progress restored on entry');
assert(await page.evaluate(()=>storyTest.worldCounts().tray===1), 'physical byte restored to tray');
await restart.click();await confirm.click();
assert(JSON.stringify(await page.evaluate(()=>storyTest.forgeSnapshot()))===JSON.stringify(cleanForge) && (await page.evaluate(()=>storyTest.worldCounts())).tray===0,'reset clears occupied bench slots and physical byte tray');
await page.reload();assert(await page.locator('#paths-button,#paths-dialog,#chosen-path,#portal-prompt').count()===0,'learning path UI stays absent after reload');
console.log(JSON.stringify({result:'no learning portals, 28 placements, five islands, 32 bits, animated faces, four tiled bytes collected into bag and offered to arch, locked/open gate, return and reset passed',errors}));if(errors.length)throw Error(errors.join(';'));
}finally{if(browser)await browser.close();server.kill()}})().catch(e=>{console.error(e);process.exitCode=1});
