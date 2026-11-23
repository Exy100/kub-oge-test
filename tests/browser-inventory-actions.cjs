const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const repo = path.resolve(__dirname, '..');
  const server = spawn('python3', ['-m','http.server','8176','--bind','127.0.0.1'], {cwd:repo, stdio:'ignore'});
  let browser;
  try {
    browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('kub.navigator.v1', '27');
      requestAnimationFrame = () => 0;
    });
    await page.route('**/game.js*', route => route.fulfill({
      contentType:'text/javascript',
      body:fs.readFileSync(path.join(repo,'game.js'),'utf8') + '\nstages[0].inventory[0]=2;',
    }));
    const enter = async () => {
      await page.goto('http://127.0.0.1:8176/game.html');
      await page.locator('#play').click();
      await page.keyboard.press('b');
    };
    await enter();
    const bag = page.locator('#inventory-dialog');
    const slot = i => bag.locator('.bag-cell').nth(i);
    const wand = bag.locator('[data-item="wand"]');
    const material = bag.locator('[data-item="material-0"]');
    const action = name => bag.getByRole('button', {name,exact:true});
    await wand.locator('img').evaluate(img => img.decode());
    await wand.focus();
    await page.keyboard.press('Enter');
    await action('Снять').click();
    assert.equal(await wand.locator('.bag-equipped').count(),0);
    await action('Взять в руку').click();
    assert.equal(await wand.locator('.bag-equipped').innerText(),'В руке');
    await wand.dragTo(slot(19));
    assert.equal(await slot(19).getAttribute('data-item'),'wand');
    await wand.dragTo(material);
    assert.equal(await slot(19).getAttribute('data-item'),'material-0');
    assert.equal(await slot(1).getAttribute('data-item'),'wand');
    await wand.dragTo(bag.locator('h2'));
    assert.equal(await slot(1).getAttribute('data-item'),'wand');
    await material.click();
    assert.equal(await bag.locator('.bag-details button').count(),1);
    await action('Переместить').click();
    await slot(8).focus();
    await page.keyboard.press('Enter');
    assert.equal(await slot(8).getAttribute('data-item'),'material-0');
    await enter();
    assert.equal(await slot(1).getAttribute('data-item'),'wand');
    assert.equal(await slot(8).getAttribute('data-item'),'material-0');
    await page.keyboard.press('b');
    await page.keyboard.press('l');
    await page.keyboard.press('b');
    await wand.click();
    await action('Снять').click();
    await action('Назначить для исследования').click();
    assert.equal(await wand.locator('.bag-equipped').innerText(),'Исследование');
    assert.equal(await page.locator('.player-dock').getAttribute('data-mode'),'battle');
    await page.keyboard.press('c');
    const gear = page.locator('#weapons-dialog');
    await gear.getByRole('button',{name:'Исследование',exact:true}).click();
    await gear.locator('[data-slot="tool"]').click();
    await gear.getByRole('button',{name:'Снять · Жезл сбора'}).click();
    await page.keyboard.press('b');
    await wand.click();
    await action('Взять в руку').click();
    await page.setViewportSize({width:320,height:700});
    assert.ok(await bag.evaluate(d => d.scrollWidth <= d.clientWidth + 1));
    assert.equal(await bag.locator('.bag-cell').count(),20);
    await action('Переместить').click();
    await page.keyboard.press('Escape');
    assert.ok(await bag.isVisible());
    assert.equal(await wand.getAttribute('data-index'),'1');
    await page.evaluate(() => localStorage.setItem('kub.bag-layout.v1', '{'));
    await enter();
    assert.equal(await wand.getAttribute('data-index'),'0');
    await page.evaluate(() => {
      Storage.prototype.setItem = () => { throw new DOMException('Blocked','SecurityError'); };
    });
    await wand.dragTo(slot(9));
    assert.equal(await wand.getAttribute('data-index'),'9', 'drag still works when storage is blocked');
    assert.deepEqual(errors,[]);
    console.log('PASS: inventory item actions, drag, swap, cancelled drop, saved layout and loadouts');
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(e => {console.error(e);process.exitCode=1;});
