const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');

(async () => {
  const server = spawn('python3', ['-m','http.server','8076','--bind','127.0.0.1'], {cwd:repo,stdio:'ignore'});
  let browser;
  try {
    await new Promise(resolve => setTimeout(resolve, 400));
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // This checks data propagation, not motion. Render-loop tests run separately.
    await page.addInitScript(() => {
      requestAnimationFrame = () => 0;
      localStorage.setItem('kub.navigator.v1', '27');
    });
    async function replaceModule(url, file, transform) {
      await page.route(url, route => route.fulfill({contentType:'text/javascript',body:transform(fs.readFileSync(path.join(repo,file),'utf8'))}));
    }
    await replaceModule('**/catalog/resources.js', 'catalog/resources.js', source => source
      .replace("name: 'Песчаник'", "name: 'Тестовый песчаник'")
      .replace('Золотистый строительный куб для арок и других построек.', 'Описание из каталога ресурсов.')
      .replace('0xd8bb7b', '0xaa00ff'));
    await replaceModule('**/catalog/tools.js', 'catalog/tools.js', source => source
      .replace('Жезл сбора', 'Тестовый жезл'));
    await replaceModule('**/locations/dreamers.js', 'locations/dreamers.js', source => source
      .replace('Остров мечтателей', 'Остров проверки'));
    await replaceModule('**/game.js*', 'game.js', source => source + `
      stages[0].inventory[0]=3;
      document.querySelector('#welcome').classList.add('hidden');
      refreshMission();announceLocation();
      window.catalogTest={color:stages[0].pickups[0].material.color.getHex(),id:stages[0].pickups[0].userData.objectId};
    `);
    await page.goto('http://127.0.0.1:8076');
    await page.waitForFunction(() => window.catalogTest, null, {polling:100});
    assert.deepEqual(await page.evaluate(() => catalogTest), {color:0xaa00ff,id:'material-0'});
    await page.waitForFunction(() => document.querySelector('#location-banner').textContent === 'Остров проверки', null, {polling:100});
    assert.equal(await page.locator('#location-banner').textContent(), 'Остров проверки');
    assert.equal(await page.locator('.slot').first().getAttribute('aria-label'), 'Тестовый песчаник');
    assert.match(await page.locator('.slot').first().getAttribute('title'), /Описание из каталога ресурсов/);
    await page.locator('.slot').nth(1).evaluate(slot => slot.click());
    assert.equal(await page.locator('.slot.selected').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.slot').nth(1).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#material').count(), 0);
    await page.locator('#inventory-button').evaluate(button => button.click());
    const resource = page.locator('.bag-cell').filter({hasText:'Тестовый песчаник'});
    assert.match(await resource.textContent(), /×3/);
    assert.match(await resource.getAttribute('title'), /Описание из каталога ресурсов/);
    assert.equal(await page.locator('.bag-cell').filter({hasText:'Тестовый жезл'}).count(), 1);
    await page.locator('#inventory-dialog').evaluate(dialog => dialog.close());
    await page.locator('#weapons-button').evaluate(button => button.click());
    assert.match(await page.locator('[data-slot="tool"]').textContent(), /Тестовый жезл/);
    await page.locator('#weapons-dialog').evaluate(dialog => dialog.close());
    await page.locator('#reset').evaluate(button => button.dispatchEvent(new MouseEvent('click', {bubbles:true,detail:1,button:0})));
    assert.equal(await page.locator('#restart-dialog').evaluate(dialog => dialog.open), true);
    assert.equal(await page.locator('#restart-island').textContent(), 'Остров проверки');
    assert.deepEqual(errors, []);
    console.log('Catalog changes propagate to world colors, HUD, bag descriptions, equipment and restart dialog. No browser errors.');
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
