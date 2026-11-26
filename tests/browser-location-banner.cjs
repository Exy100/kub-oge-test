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
          if(forward && forge){
            forge.state.unlocked=true;
            player.position.set(86,0,-4);
          }else if(forward){
            stage.unlocked=true;
            player.position.set(exitGlow.position.x,0,exitGlow.position.z);
          }else player.position.set(returnGlow.position.x,0,returnGlow.position.z);
        };
      `,
    }));
    await page.goto('http://127.0.0.1:8079/game.html');
    const banner = page.locator('#location-banner');
    const message = page.locator('#message');
    const strip = page.getByRole('group',{name:'Подсказки управления', includeHidden:true});
    const helpHint = strip.getByText('Справка по управлению');
    const buildHint = strip.locator('.build-hint').first();
    const forgeHint = strip.locator('.forge-hint');
    assert(await message.isHidden());
    assert(await banner.isHidden());
    await page.evaluate(() => {
      const el=document.querySelector('#location-banner');
      window.arrivals=[];
      const controls=document.querySelector('.controls');
      new MutationObserver(()=>{
        if(controls.hidden)window.stripDuration=performance.now()-window.stripShownAt;
        else window.stripShownAt=performance.now();
      }).observe(controls,{attributes:true,attributeFilter:['hidden']});
      const message=document.querySelector('#message');
      new MutationObserver(()=>{
        if(message.hidden) window.messageHiddenAt=performance.now();
      }).observe(message,{attributes:true,attributeFilter:['hidden']});
      new MutationObserver(()=>{
        if (!el.hidden && el.textContent==='Мастерская черепахи') {
          const animation=el.getAnimations()[0];
          animation.pause();
          animation.currentTime=2500;
        }
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
    assert(await buildHint.isVisible());
    assert((await helpHint.innerText()).includes('H / Р'));
    await page.keyboard.press('h');
    await page.locator('#controls-guide').waitFor({state:'visible'});
    await page.keyboard.press('Escape');
    await page.keyboard.press('l');
    await message.waitFor({state:'visible'});
    await message.waitFor({state:'hidden',timeout:7000});

    assert(await helpHint.isVisible() && !await buildHint.isVisible(),'first island keeps help after 15s in battle');
    // Change destination twice before the pending title becomes visible.
    for(const forward of [true,false,true]){
      await page.evaluate(direction=>window.atGate(direction),forward);
      await page.keyboard.press('e');
    }
    await banner.waitFor({state:'visible'});
    assert.equal(await banner.innerText(),'Мастерская черепахи');
    assert(await message.isVisible());
    assert((await message.innerText()).includes('Черепаха'));
    assert.deepEqual(await page.evaluate(()=>arrivals.filter(a=>!a.hidden).map(a=>a.name)),['Остров мечтателей','Мастерская черепахи']);

    await page.keyboard.press('l');
    assert(await helpHint.isVisible());
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
    await page.evaluate(()=>window.atGate(true));
    await page.keyboard.press('e');
    assert.equal(await banner.evaluate(el=>getComputedStyle(el).getPropertyValue('--arrival-shift').trim()),'0px');
    await page.evaluate(()=>window.atGate(true));
    await page.keyboard.press('e');
    await banner.waitFor({state:'hidden'});
    await banner.waitFor({state:'visible'});
    assert.equal(await banner.innerText(),'Кузница байтов');
    assert(await forgeHint.isVisible() && !await buildHint.isVisible() && await helpHint.isVisible());
    assert(await strip.evaluate(el=>{
      const r=el.getBoundingClientRect(),last=el.lastElementChild.getBoundingClientRect();
      return document.querySelector('#message').getBoundingClientRect().bottom<=r.top && last.left>=0 && last.right<=innerWidth;
    }),'forge message clears help strip at mobile width');
    await strip.waitFor({state:'hidden',timeout:16000});
    await page.evaluate(()=>window.atGate(false));
    await page.keyboard.press('e');
    assert(await helpHint.isVisible() && !await forgeHint.isVisible(),'return restores laboratory controls');
    await page.evaluate(()=>window.atGate(true));
    await page.keyboard.press('e');
    assert(await forgeHint.isVisible(),'re-entering forge shows strip again');
    await page.evaluate(()=>window.atGate(true));
    await page.keyboard.press('e');
    await page.evaluate(()=>window.atGate(true));
    await page.keyboard.press('e');
    await page.waitForFunction(()=>document.querySelector('#location-banner:not([hidden])')?.textContent==='Сад открытий');
    assert(await helpHint.isVisible() && !await forgeHint.isVisible() && !await buildHint.isVisible());
    await strip.waitFor({state:'hidden',timeout:16000});
    await page.evaluate(()=>document.exitPointerLock());
    await page.waitForFunction(()=>!document.pointerLockElement);
    await page.locator('#reset').click();
    await page.locator('#restart-confirm').click();
    await banner.waitFor({state:'hidden'});
    await banner.waitFor({state:'visible'});
    assert.equal(await banner.innerText(),'Сад открытий');
    assert.equal(await message.innerText(),'Текущий остров начат заново.');
    assert(await helpHint.isVisible(),'restart shows help again');
    await message.waitFor({state:'hidden',timeout:10000});
    assert(await helpHint.isVisible(),'strip outlasts 10-second arrival notice');
    await strip.waitFor({state:'hidden',timeout:6000});
    const duration=await page.evaluate(()=>window.stripDuration);
    assert(duration>=14950 && duration<17000,'control strip duration '+duration);
    // Returning to the three arches restores the persistent building controls.
    await page.evaluate(()=>window.atGate(false));
    await page.keyboard.press('e');
    await page.waitForTimeout(15300);
    assert(await buildHint.isVisible() && await helpHint.isVisible(),'three-arches controls remain visible past the previous timer');
    assert.deepEqual(errors,[]);
    console.log('PASS location title timing, all four islands, rapid travel, restart, reduced motion and seven viewport widths');
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(e=>{console.error(e);process.exitCode=1});
