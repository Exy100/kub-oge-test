import assert from 'node:assert/strict';
import test from 'node:test';
import {Group} from '../vendor/three.module.js';
import {createRemontik} from '../world/remontik.js';

test('Remontik waves with the open hand, keeps his chip, then settles; reduced motion holds still',()=>{
  const robot=createRemontik(new Group(),0,0);
  const hand=robot.root.getObjectByName('remontik-open-hand').parent;
  const chip=robot.root.getObjectByName('remontik-chip-grip');
  const player={x:0,z:3};
  const advance=(frames,reduced=false)=>{
    for(let i=0;i<frames;i++)robot.update(1/60,true,reduced,player);
  };
  advance(50);
  const greetingAngle=hand.rotation.z;
  advance(12);
  assert.ok(Math.abs(hand.rotation.z-greetingAngle)>.1);
  assert.equal(chip.visible,true);
  advance(140);
  assert.equal(hand.rotation.z,.2);
  robot.wave();
  advance(60,true);
  const shell=robot.root.getObjectByName('remontik-shell');
  const restHeight=shell.parent.position.y;
  advance(60,true);
  assert.equal(shell.parent.position.y,restHeight);
  assert.equal(hand.rotation.z,.2);
});
