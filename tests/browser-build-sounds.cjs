const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

(async () => {
  const repo = path.resolve(__dirname, '..');
  const server = spawn('python3', ['-m','http.server','8129','--bind','127.0.0.1'], {cwd:repo, stdio:'ignore'});
  let browser;
  try {
    browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('kub.navigator.v1', '27');
      window.requestAnimationFrame = () => 0;
      window.sounds = [];
      window.finished = new Set();
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        const name = new URL(this.src).pathname.split('/').pop();
        sounds.push(name);
        this.addEventListener('ended', () => finished.add(name), {once:true});
        return play.call(this);
      };
    });
    await page.route('**/game.js*', route => route.fulfill({
      contentType:'text/javascript',
      body:fs.readFileSync(path.join(repo,'game.js'),'utf8') + `
        window.soundTest = {
          at(point, button = 0) {
            const {x,y,z} = point;
            player.position.set(x,0,z+2);
            camera.position.set(x,y+2,z);
            camera.lookAt(x,y,z);
            camera.updateMatrixWorld();
            scene.updateMatrixWorld(true);
            act(button);
          },
          collect(){this.at(stage.pickups[0].position)},
          arch(material){select(material);this.at(stage.targets[0])},
          floor(button){select(0);this.at({x:3,y:.5,z:2},button)},
          switchMode(){panel.toggleMode()},
          revisit(){enterIsland(stages[1]);enterIsland(stages[0]);refreshMission()},
          forge(){forgeState.pendingBytes=1;enterIsland(stages[3]);refreshMission()},
          bit(){this.at(forge.pickups[0].position);return forgeState.bits},
          byte(){this.at(forge.bytePickups[0].position)},
          deposit(){this.at(forge.cells[0].position)},
          miss(){this.at({x:15,y:0,z:0})}
        };`
    }));
    await page.goto('http://127.0.0.1:8129/game.html');
    await page.locator('#play').click();
    async function expectSounds(action, expected) {
      await page.evaluate(action);
      assert.deepEqual(await page.evaluate(() => sounds.splice(0)), expected);
    }
    await expectSounds(() => soundTest.miss(), []);
    await expectSounds(() => soundTest.arch(0), []);
    await expectSounds(() => {soundTest.switchMode(); soundTest.collect(); soundTest.switchMode()}, []);
    await expectSounds(() => soundTest.collect(), ['pickup.wav']);
    await page.waitForFunction(() => finished.has('pickup.wav'), null, {polling:50, timeout:5000});
    await expectSounds(() => soundTest.arch(1), []);
    await expectSounds(() => soundTest.arch(0), ['place.wav']);
    await page.waitForFunction(() => finished.has('place.wav'), null, {polling:50, timeout:5000});
    await expectSounds(() => {soundTest.collect();soundTest.floor(0)}, ['pickup.wav','place.wav']);
    await expectSounds(() => soundTest.revisit(), []);
    await expectSounds(() => soundTest.floor(2), ['pickup.wav']);
    await expectSounds(() => soundTest.forge(), []);
    await expectSounds(() => soundTest.deposit(), []);
    await expectSounds(() => {soundTest.bit();soundTest.byte();soundTest.deposit();soundTest.deposit()},
      ['pickup.wav','pickup.wav','place.wav']);
    const stock = await page.evaluate(() => {
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
      return soundTest.bit();
    });
    assert.equal(stock, 2, 'audio restrictions do not interrupt collection');
    assert.deepEqual(errors, []);
    console.log('PASS both WAVs played to completion, correct cues per world action, silent re-entry and rejected actions');
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
