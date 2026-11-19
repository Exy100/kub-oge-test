const {chromium}=require('playwright');
const {spawn}=require('child_process');const fs=require('fs');const path=require('path');const repo=path.resolve(__dirname,'..');
(async()=>{const server=spawn('python3',['-m','http.server','8060','--bind','127.0.0.1'],{cwd:repo,stdio:'ignore'});let browser;
try{await new Promise(r=>setTimeout(r,400));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/game.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(repo,'game.js'),'utf8')+'\nwindow.avatarTest={appearance:()=>character.getAppearance(),position:()=>player.position.toArray(),stage:(i)=>{stage=stages[i];refreshMission()}};'}));
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
await page.goto('http://127.0.0.1:8060');if(await page.locator('#play').isDisabled())await page.locator('#welcome [data-navigator="27"]').click();await page.locator('#play').click();await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!document.pointerLockElement);
const original=await page.evaluate(()=>window.avatarTest.appearance());
assert(await page.locator('#character-button,#sound,.view,#camera,#viewLabel').count()===0,'old header controls and camera panel removed');
await page.evaluate(()=>{
 const field=document.createElement('input');document.body.append(field);field.focus();
 field.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyP',key:'з',bubbles:true}));field.remove();
});
assert(!await page.locator('#character-dialog').evaluate(e=>e.open),'typing does not open appearance');

await page.keyboard.press('KeyP');await page.waitForFunction(()=>document.querySelector('#character-preview canvas')?.width>0);
await page.waitForTimeout(200);await page.screenshot({path:'/tmp/kub-character-editor.png'});
assert(await page.locator('#appearance-options button').count()===10,'ten eye options');
await page.getByLabel('Янтарный',{exact:true}).check();
await page.locator('[data-option="7"]').click();assert(JSON.stringify(await page.evaluate(()=>window.avatarTest.appearance()))===JSON.stringify(original),'draft does not alter live player');
await page.locator('#character-cancel').click();assert(JSON.stringify(await page.evaluate(()=>window.avatarTest.appearance()))===JSON.stringify(original),'cancel preserves appearance');
await page.keyboard.press('KeyP');
const colors=page.locator('#eye-colors input');
assert(await colors.count()===5,'five iris colors');
await page.locator('[data-option="8"]').click();
await page.getByLabel('Серый',{exact:true}).check();
await page.screenshot({path:'/tmp/kub-eye-color-editor.png'});
for(const category of ['eyes','nose','mouth','ears','hair','palette']){
 await page.locator('#tab-'+category).click();assert(await page.locator('#appearance-options button').count()===10,'ten '+category+' options');await page.locator('[data-option="9"]').click();
}
await page.locator('#preview-right').click();await page.locator('#preview-body').click();await page.waitForTimeout(100);await page.screenshot({path:'/tmp/kub-character-full.png'});
await page.locator('#character-save').click();let applied=await page.evaluate(()=>window.avatarTest.appearance());assert(applied.eyeColor===4 && Object.entries(applied).every(([key,v])=>key==='eyeColor'||v===9),'shape and color apply independently');
await page.reload();await page.waitForFunction(()=>window.avatarTest);assert(JSON.stringify(await page.evaluate(()=>window.avatarTest.appearance()))===JSON.stringify(applied),'appearance survives reload');
if(await page.locator('#play').isDisabled())await page.locator('#welcome [data-navigator="27"]').click();await page.locator('#play').click();await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!document.pointerLockElement);await page.keyboard.press('KeyP');
await page.locator('#tab-hair').click();await page.locator('[data-option="5"]').click();await page.locator('#tab-palette').click();await page.locator('[data-option="3"]').click();await page.locator('#preview-face').click();await page.screenshot({path:'/tmp/kub-character-copper.png'});
await page.keyboard.press('Escape');assert(JSON.stringify(await page.evaluate(()=>window.avatarTest.appearance()))===JSON.stringify(applied),'Escape cancels draft');
await page.keyboard.press('KeyP');await page.locator('#appearance-random').click();await page.locator('#appearance-default').click();await page.locator('#character-save').click();assert(JSON.stringify(await page.evaluate(()=>window.avatarTest.appearance()))===JSON.stringify(original),'reset applies defaults');
await page.evaluate(()=>{localStorage.setItem('kub.appearance.v1','broken-json')});await page.reload();await page.waitForFunction(()=>window.avatarTest);assert(JSON.stringify(await page.evaluate(()=>window.avatarTest.appearance()))===JSON.stringify(original),'corrupt storage falls back');
if(await page.locator('#play').isDisabled())await page.locator('#welcome [data-navigator="27"]').click();await page.locator('#play').click();await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!document.pointerLockElement);await page.keyboard.press('KeyP');
await page.setViewportSize({width:600,height:900});await page.waitForTimeout(100);assert(await page.locator('#character-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'narrow layout does not overflow');
await page.locator('#character-close').click();await page.setViewportSize({width:1440,height:1000});await page.keyboard.press('KeyP');await page.locator('#tab-eyes').click();await page.locator('[data-option="4"]').click();
await page.evaluate(()=>Storage.prototype.setItem=function(){throw new DOMException('Blocked','SecurityError')});await page.locator('#character-save').click();assert((await page.evaluate(()=>window.avatarTest.appearance())).eyes===4,'storage denial does not prevent application');
// The physical P key works with Russian text as well, and view-only islands cannot mutate appearance.
const saved=await page.evaluate(()=>avatarTest.appearance());
async function russianP(){await page.evaluate(()=>{
 for(const type of ['keydown','keyup'])dispatchEvent(new KeyboardEvent(type,{code:'KeyP',key:'з'}));
})}
for(const island of [1,2,3]){
 await page.evaluate(i=>avatarTest.stage(i),island);await russianP();
 assert(await page.locator('#character-dialog').evaluate(e=>e.open),'Russian P opens appearance');
 assert((await page.locator('.character-subtitle').innerText()).includes('Только просмотр'),'view-only explanation');
 for(const id of ['character-save','appearance-random','appearance-default'])assert(await page.locator('#'+id).isDisabled(),id+' blocked');
 await page.locator('#tab-hair').click();
 assert(await page.locator('#appearance-options button:disabled').count()===10,'all choices blocked');
 await page.evaluate(()=>{for(const selector of ['[data-option="2"]','#appearance-random','#appearance-default','#character-save'])document.querySelector(selector).dispatchEvent(new MouseEvent('click'))});
 assert(JSON.stringify(await page.evaluate(()=>avatarTest.appearance()))===JSON.stringify(saved),'handlers also protect appearance');
 assert(await page.locator('#character-dialog').evaluate(e=>e.open),'disabled save cannot close viewer');
 await page.locator('#preview-body').click();await page.locator('#preview-right').click();
 assert(await page.locator('#preview-body').getAttribute('aria-pressed')==='true','body view available');
 if(island===1)await page.screenshot({path:'/tmp/kub-character-view-only.png'});
 await page.evaluate(()=>dispatchEvent(new KeyboardEvent('keydown',{code:'KeyP',key:'з',repeat:true})));
 assert(await page.locator('#character-dialog').evaluate(e=>e.open),'held key does not toggle repeatedly');
 await russianP();assert(!await page.locator('#character-dialog').evaluate(e=>e.open),'Russian P closes viewer');
}
await page.evaluate(()=>avatarTest.stage(0));await page.keyboard.press('KeyP');
assert(await page.locator('#character-save').isEnabled(),'return to first island restores editing');
await page.locator('#tab-eyes').click();await page.locator('[data-option="6"]').click();
await page.locator('#character-save').click();assert((await page.evaluate(()=>avatarTest.appearance())).eyes===6,'editing works after return');
await page.screenshot({path:'/tmp/kub-clean-header.png'});
console.log(JSON.stringify({result:'eye colors, preview, save, reload, cancel, Escape, random/reset, corrupt/blocked storage and narrow layout passed',errors}));if(errors.length)throw Error(errors.join(';'));
}finally{if(browser)await browser.close();server.kill()}})().catch(e=>{console.error(e);process.exitCode=1});
