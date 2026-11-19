const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

(async () => {
  const repo = path.resolve(__dirname, '..');
  const server = spawn('python3', ['-m', 'http.server', '8079', '--bind', '127.0.0.1'], {cwd:repo, stdio:'ignore'});
  let browser;
  try {
    browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
    const page = await browser.newPage({viewport:{width:1000,height:640}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/game.js*', route => route.fulfill({
      contentType:'text/javascript',
      body:fs.readFileSync(path.join(repo,'game.js'),'utf8') + `
        window.atGate = forward => {
          if(forward && stage.index===2){
            forge.state.unlocked=true;
            player.position.set(86,0,-4);
          }else if(forward){
            stage.unlocked=true;
            player.position.set(stage.center,0,stage.index===0?-1:-2);
          }else player.position.set(stage.center+6,0,6);
        };
      `,
    }));
    await page.goto('http://127.0.0.1:8079/');
    const banner = page.locator('#location-banner');
    const message = page.locator('#message');
    assert(await message.isHidden());
    assert(await banner.isHidden());
    await page.evaluate(() => {
      const el=document.querySelector('#location-banner');
      window.arrivals=[];
      const message=document.querySelector('#message');
      new MutationObserver(()=>{
        if(message.hidden) window.messageHiddenAt=performance.now();
      }).observe(message,{attributes:true,attributeFilter:['hidden']});
      new MutationObserver(()=>{
        window.arrivals.push({name:el.textContent, hidden:el.hidden, time:performance.now()});
      }).observe(el,{attributes:true,attributeFilter:['hidden']});
      document.querySelector('#play').addEventListener('click',()=>window.entered=performance.now(),{once:true,capture:true});
    });
    if(await page.locator('#play').isDisabled()) await page.locator('#welcome [data-navigator="27"]').click();
    await page.locator('#play').click();
    await banner.waitFor({state:'visible'});
    assert.equal(await banner.innerText(),'Остров мечтателей');
    assert.equal(await message.innerText(),'Маленький остров. Безграничные возможности.');
    assert(await message.isVisible());
    const delay = await page.evaluate(()=>arrivals.find(a=>!a.hidden).time-window.entered);
    assert(delay>=2900 && delay<5500,'first title delay '+delay);
    assert.equal(await banner.evaluate(el=>el.getAnimations()[0].effect.getTiming().duration),8300);
    await banner.waitFor({state:'hidden',timeout:15000});

    assert(await message.isHidden());
    const greetingDuration=await page.evaluate(()=>window.messageHiddenAt-window.entered);
    assert(greetingDuration>=9950 && greetingDuration<12000,'arrival message duration '+greetingDuration);
    await page.keyboard.press('l');
    await message.waitFor({state:'visible'});
    await message.waitFor({state:'hidden',timeout:7000});

    // Change destination twice before the pending title becomes visible.
    for(const forward of [true,false,true]){
      await page.evaluate(direction=>window.atGate(direction),forward);
      await page.keyboard.press('e');
    }
    await banner.waitFor({state:'visible'});
    assert.equal(await banner.innerText(),'Остров трёх арок');
    assert(await message.isVisible());
    assert((await message.innerText()).includes('три арки'));
    assert.deepEqual(await page.evaluate(()=>arrivals.filter(a=>!a.hidden).map(a=>a.name)),['Остров мечтателей','Остров трёх арок']);

    // Freeze only the banner animation while checking its geometry at different widths.
    await banner.evaluate(el=>{const a=el.getAnimations()[0];a.pause();a.currentTime=2500});
    for(const width of [1440,1024,801,768,590,390,320]){
      await page.setViewportSize({width,height:640});
      const fits=await banner.evaluate(el=>{
        const r=el.getBoundingClientRect(), brand=document.querySelector('.brand').getBoundingClientRect(), quest=document.querySelector('.mission').getBoundingClientRect();
        const overlaps=b=>r.left<b.right && r.right>b.left && r.top<b.bottom && r.bottom>b.top;
        return Math.abs((r.left+r.right)/2-innerWidth/2)<1 && r.left>=0 && r.right<=innerWidth && !overlaps(brand) && !overlaps(quest);
      });
      assert(fits,'centered and clear of other controls at '+width);
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await banner.evaluate(el=>getComputedStyle(el).getPropertyValue('--arrival-shift').trim()),'0px');
    await page.evaluate(()=>window.atGate(true));
    await page.keyboard.press('e');
    await banner.waitFor({state:'hidden'});
    await banner.waitFor({state:'visible'});
    assert.equal(await banner.innerText(),'Кузница данных');
    await page.evaluate(()=>window.atGate(true));
    await page.keyboard.press('e');
    await page.waitForFunction(()=>document.querySelector('#location-banner:not([hidden])')?.textContent==='Сад открытий');
    await page.evaluate(()=>document.exitPointerLock());
    await page.waitForFunction(()=>!document.pointerLockElement);
    await page.locator('#reset').click();
    await page.locator('#restart-confirm').click();
    await banner.waitFor({state:'hidden'});
    await banner.waitFor({state:'visible'});
    assert.equal(await banner.innerText(),'Сад открытий');
    assert.equal(await message.innerText(),'Текущий остров начат заново.');
    await message.waitFor({state:'hidden',timeout:10000});
    assert.deepEqual(errors,[]);
    console.log('PASS location title timing, all four islands, rapid travel, restart, reduced motion and seven viewport widths');
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(e=>{console.error(e);process.exitCode=1});
