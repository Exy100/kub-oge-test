import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FEATURES, PALETTES, DEFAULT_APPEARANCE, normalizeAppearance, randomAppearance } from '../appearance.js';
import { createCharacter } from '../character.js';

test('catalog has ten distinct options per feature and ten three-tone palettes',()=>{
  for(const feature of Object.values(FEATURES)){assert.equal(feature.options.length,10);assert.equal(new Set(feature.options).size,10)}
  assert.equal(PALETTES.length,10);assert.equal(new Set(PALETTES.map(p=>p.colors.join(','))).size,10);
  for(const palette of PALETTES)assert.equal(new Set(palette.colors).size,3);
});
test('corrupt or outdated saved appearance falls back safely',()=>{
  assert.deepEqual(normalizeAppearance(null),DEFAULT_APPEARANCE);
  assert.deepEqual(normalizeAppearance('invalid'),DEFAULT_APPEARANCE);
  assert.deepEqual(normalizeAppearance({eyes:-1,nose:10,mouth:NaN,ears:'3',hair:1.5,palette:999}),DEFAULT_APPEARANCE);
  const normalized=normalizeAppearance({eyes:9,extra:'ignored'});assert.equal(normalized.eyes,9);assert.equal('extra' in normalized,false);
});
test('all 100 hairstyle/palette combinations produce finite, bounded geometry and apply all palette tones',()=>{
  const character=createCharacter();
  for(let hair=0;hair<10;hair++)for(let palette=0;palette<10;palette++){
    character.setAppearance({...DEFAULT_APPEARANCE,hair,palette});
    assert.equal(character.getAppearance().hair,hair);assert.equal(character.getAppearance().palette,palette);
    const hairRoot=character.root.getObjectByName('hair'),colors=new Set();let count=0;
    hairRoot.traverse(part=>{if(part.isMesh){count++;colors.add(part.material.color.getHex());assert.ok(part.position.toArray().every(Number.isFinite));assert.ok(part.scale.toArray().every(v=>Number.isFinite(v)&&v>0))}});
    assert.ok(count>=5&&count<35);PALETTES[palette].colors.forEach(color=>assert.ok(colors.has(color),`style ${hair} uses tone ${color}`));
  }
  character.dispose();
});
test('each facial feature can change independently without replacing the body or locomotion rig',()=>{
  const character=createCharacter();const body=character.root.getObjectByName('body'),foot=character.root.getObjectByName('foot');
  for(const key of Object.keys(FEATURES))for(let option=0;option<10;option++){
    const look={...DEFAULT_APPEARANCE,[key]:option};character.setAppearance(look);character.animate(1/60,{dx:.04,time:1});
    assert.deepEqual(character.getAppearance(),look);assert.equal(character.root.getObjectByName('body'),body);assert.equal(character.root.getObjectByName('foot'),foot);
    assert.equal(character.root.getObjectByName('head').children.filter(c=>c.name==='appearance').length,1);
  }
  character.dispose();
});
test('blink and interaction gesture are brief and return to neutral',()=>{
  const c=createCharacter();const eye=c.root.getObjectByName('blink-eye');
  c.animate(0,{time:4.59});assert.ok(eye.scale.y<.2);c.animate(0,{time:4.8});assert.equal(eye.scale.y,1);
  const arms=[];c.root.traverse(o=>{if(o.name==='elbow')arms.push(o)});c.react();c.animate(.225,{time:0});assert.ok(arms[1].rotation.x<-.7);
  c.animate(.3,{time:0});assert.ok(Math.abs(arms[1].rotation.x+.12)<1e-7);c.dispose();
});
test('random appearance covers independent feature choices and remains valid',()=>{
  assert.deepEqual(randomAppearance(()=>0),{eyes:0,nose:0,mouth:0,ears:0,hair:0,palette:0});
  assert.deepEqual(randomAppearance(()=>.999),{eyes:9,nose:9,mouth:9,ears:9,hair:9,palette:9});
});
