const {chromium}=require('playwright');const {spawn}=require('child_process');const fs=require('fs');const path=require('path');
const assert=(v,m)=>{if(!v)throw Error(m)};
(async()=>{const repo=path.resolve(__dirname,'..'),server=spawn('python3',['-m','http.server','8068','--bind','127.0.0.1'],{cwd:repo,stdio:'ignore'});let browser;
try{await new Promise(r=>setTimeout(r,400));browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:800,height:650}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
// Freeze RAF so removing one pickup can be compared at precisely the same animation time.
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('kub.navigator.v1','27')});
await page.route('**/game.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(repo,'game.js'),'utf8')+`
window.pickupTest={
 start(index){stage=stages[index];player.position.set(stage.center,0,3);document.querySelector('#welcome').classList.add('hidden');refreshMission()},
 tick(time){frame(time)},
 snapshot(){return (stage.index===2?forge.pickups:stage.pickups).map(m=>({id:m.uuid,y:m.position.y,angle:m.rotation.y}))},
 collect(index){const m=(stage.index===2?forge.pickups:stage.pickups)[index];player.position.set(m.position.x,0,m.position.z+2);camera.position.set(m.position.x,m.position.y+2,m.position.z);camera.lookAt(m.position);camera.updateMatrixWorld();scene.updateMatrixWorld(true);act(0)},
 stock(){return stage.index===2?forge.state.bits:stage.inventory.reduce((a,b)=>a+b,0)}
};`}));
await page.goto('http://127.0.0.1:8068');await page.waitForFunction(()=>window.pickupTest);
for(const stage of [0,1,2]){
 await page.evaluate(i=>pickupTest.start(i),stage);let time=12345;
 for(const position of ['first','middle','last']){
  await page.evaluate(t=>pickupTest.tick(t),time);const before=await page.evaluate(()=>pickupTest.snapshot()),stock=await page.evaluate(()=>pickupTest.stock());const index=position==='first'?0:position==='middle'?Math.floor(before.length/2):before.length-1;
  await page.evaluate(i=>pickupTest.collect(i),index);await page.evaluate(t=>pickupTest.tick(t),time);const after=await page.evaluate(()=>pickupTest.snapshot());assert(after.length===before.length-1,`actual pickup on island ${stage}`);assert(await page.evaluate(()=>pickupTest.stock())===stock+1,'inventory receives exactly one');
  for(const item of after){const old=before.find(x=>x.id===item.id);assert(Math.abs(item.y-old.y)<1e-10&&Math.abs(item.angle-old.angle)<1e-10,`remaining pickup jumps after ${position} removal on island ${stage}`)}
  time+=16;await page.evaluate(t=>pickupTest.tick(t),time);const continued=await page.evaluate(()=>pickupTest.snapshot());for(const item of continued){const previous=after.find(x=>x.id===item.id);assert(Math.abs(item.angle-previous.angle-(stage===2?.00035:.0008)*16)<1e-10,'rotation continues at original speed');assert(Math.abs(item.y-previous.y)<.004,'bobbing remains continuous')}
 }
}
assert(!errors.length,errors.join(';'));console.log('PASS: first/middle/last collection keeps all remaining pickup transforms continuous on both islands and in forge; inventory and rotation speed intact');
}finally{await browser?.close();server.kill()}})().catch(e=>{console.error(e);process.exitCode=1});
