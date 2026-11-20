import { BUILD_MATERIALS } from './catalog/index.js';
import { LOCATIONS } from './locations/index.js';
import { createTreeRenderer } from './world/trees.js';
import { drawQuestDiagram } from './quest-diagram.js';
import { createPlayerInventory } from './player-inventory.js?v=2';
import { equipGatheringWand } from './gathering-wand.js?v=15';
import { createPlayerPanel } from './player-panel.js?v=32';
import * as THREE from './vendor/three.module.js';
import { createCharacter } from './character.js?v=14';
import { createPhysicsState, movePlayer } from './physics.js?v=5';
import { createForge } from './forge.js?v=16';
import { loadAppearance } from './appearance.js?v=9';
import { createCustomizer } from './customizer.js?v=12';
import { followCamera } from './follow-camera.js';
import { createStage, placeTarget, removeTarget, isLimited, MATERIAL_NAMES } from './progression.js?v=2';
const $=s=>document.querySelector(s), scene=new THREE.Scene();scene.background=new THREE.Color('#c9dfda');scene.fog=new THREE.Fog('#c9dfda',35,85);
const renderer=new THREE.WebGLRenderer({canvas:$('#world'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,140);scene.add(new THREE.HemisphereLight(0xf6ffe6,0x788974,2.5));const sun=new THREE.DirectionalLight(0xffeed0,3);sun.position.set(-10,25,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22});sun.shadow.normalBias=.03;scene.add(sun);
const colors=BUILD_MATERIALS.map(item=>item.color), mats=colors.map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));const geo=new THREE.BoxGeometry(1,1,1), solids=[];
function box(x,y,z,w,h,d,color,collide=false){const m=new THREE.Mesh(geo,typeof color==='number'?new THREE.MeshStandardMaterial({color,roughness:1}):color);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;scene.add(m);if(collide)solids.push(m);return m}
// Floating voxel island, with a stepped rocky underside.
box(0,-1.6,0,23,2.5,21,0x987a55);box(0,-3.4,0,20,1.5,18,0x7d8171);box(0,-4.7,0,15,1.2,14,0x8a8e7d);
for(let x=-11;x<=11;x++)for(let z=-10;z<=10;z++){const edge=Math.abs(x)>9&&Math.abs(z)>8;if(edge)continue;box(x,-.28,z,1,.55,1,[0x9cbb76,0x96b570,0xa0bd79,0x91b16b][Math.abs(x*13+z*7)%4]);}
for(let x=-3;x<=3;x++)for(let z=-3;z<=1;z++)box(x,.015,z,.98,.08,.98,0xded9bb);
const renderTree=createTreeRenderer(box);
const islandTrunks = LOCATIONS[0].trees.flatMap(renderTree)
  .filter(mesh => mesh.name === 'island-tree-trunk');
for (let i = 0; i < 30; i++) {
  const x = Math.sin(i * 43) * 10, z = Math.cos(i * 19) * 9;
  if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;
  const flowering = i % 3 === 0;
  const width = flowering ? .24 : .12;
  if (islandTrunks.some(trunk =>
    Math.abs(x - trunk.position.x) <= (trunk.scale.x + width) / 2 &&
    Math.abs(z - trunk.position.z) <= (trunk.scale.z + width) / 2)) continue;
  box(x,.15,z,.12,.3,.12,0x708d49);
  if (flowering) box(x,.35,z,width,.15,width,i%2 ? 0xf3dda1 : 0xece8cc);
}
[[8,-3],[-7,-2],[4,8]].forEach(([x,z])=>{box(x,.35,z,1.2,.7,1,0xa9ada0,true);box(x+.6,.2,z+.6,.7,.4,.8,0xb8b9ab,true)});
// Distant drifting block clouds.
for(let i=0;i<12;i++){const x=Math.sin(i*3)*42,z=Math.cos(i*3)*42;box(x,13+i%3*2,z,7,1.2,3,0xeaf0e5);box(x+1,14+i%3*2,z,4,1,2,0xeaf0e5)}
// A second, separate island. Each island keeps its own construction and inventory.
box(40,-1.6,0,23,2.5,21,0x8d8266);box(40,-3.4,0,20,1.5,18,0x727e80);box(40,-4.7,0,15,1.2,14,0x8c9690);
for(let x=-11;x<=11;x++)for(let z=-10;z<=10;z++){
  if(Math.abs(x)>9&&Math.abs(z)>8)continue;
  box(40+x,-.28,z,1,.55,1,[0x8bb59b,0x9cbea2,0x8eb4a0][Math.abs(x*13+z*7)%3]);
}
LOCATIONS[1].trees.forEach(renderTree);
[[32,0],[48,1]].forEach(([x,z])=>box(x,.35,z,1.2,.7,1,0xa9ada0,true));
for(const center of [80,120]){
  box(center,-1.6,0,23,2.5,21,center===80?0x6e7b86:0x9c967b);
  box(center,-3.4,0,20,1.5,18,0x727e80);box(center,-4.7,0,15,1.2,14,0x8c9690);
  const tiles=[];
  for(let x=-11;x<=11;x++)for(let z=-10;z<=10;z++)if(!(Math.abs(x)>9&&Math.abs(z)>8))tiles.push([center+x,z]);
  const ground=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({roughness:1}),tiles.length);
  const dummy=new THREE.Object3D();dummy.scale.set(1,.55,1);
  tiles.forEach(([x,z],i)=>{dummy.position.set(x,-.28,z);dummy.updateMatrix();ground.setMatrixAt(i,dummy.matrix);ground.setColorAt(i,new THREE.Color(center===80?[0x9daeb5,0x91a4af,0xa6b5b9][i%3]:[0xb8c58c,0xa9bd80,0xc7cf9a][i%3]))});
  ground.receiveShadow=true;scene.add(ground);
}
LOCATIONS.slice(2).forEach(location=>location.trees.forEach(renderTree));
for(let i=0;i<10;i++)box(116+i%5*2,.15,-4+Math.floor(i/5)*3,.25,.3,.25,0xead9a1);
const stages=LOCATIONS.map((_,i)=>createStage(i));
for(const state of stages){
  state.pickups=[];state.placed=[];
  state.ghosts=state.targets.map(t=>{
    const m=box(t.x,t.y,t.z,.96,.96,.96,new THREE.MeshStandardMaterial({color:colors[t.material],transparent:true,opacity:.28,depthWrite:false}));
    m.userData.objectId=BUILD_MATERIALS[t.material].id;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:colors[t.material]})));
    return m;
  });
  if(state.index===1)for(const arch of state.arches)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)box(arch.x+x,.015,arch.z+z,.98,.08,.98,0xded9bb);
}
let stage=stages[0];
function glow(x,y,z,w,h,color){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.38,side:THREE.DoubleSide,depthWrite:false}));m.position.set(x,y,z);scene.add(m);return m}
const exitGlow=glow(0,1.05,-1,.98,2,0x74e8d4);exitGlow.visible=false;
const secondGlow=glow(40,1.05,-2,.98,2,0x91b9ef);secondGlow.visible=false;
const returnGlows=[];
for(const center of [46,86,126]){
  for(const x of [center-1.15,center+1.15])box(x,1.5,6,.6,3,.6,0x8bada5,true);
  box(center,3.1,6,2.9,.5,.6,0x8bada5,true);
  returnGlows.push(glow(center,1.45,6,1.7,2.9,0x74e8d4));
}
const character=createCharacter(loadAppearance()), player=character.root;scene.add(player);
const reducedHandMotion=matchMedia('(prefers-reduced-motion: reduce)');
const gathering=equipGatheringWand({character,camera,scene,renderer});
player.position.set(0,0,6);let yaw=0,pitch=.23,third=true,selected=0;const physics=createPhysicsState();let jumpRequested=false;const keys={},ray=new THREE.Raycaster();let last=performance.now();
const forge=createForge({scene,box,solids,canStore:hasBagRoom,onCollect:animateCollection,onOpen(){document.exitPointerLock?.();Object.keys(keys).forEach(k=>keys[k]=false);jumpRequested=false;dragging=false;},onChange(){if(stage.index===2)update()},notify});
const customizer=createCustomizer({character,canEdit:()=>stage.index===0,onOpen(){document.exitPointerLock?.();Object.keys(keys).forEach(k=>keys[k]=false);jumpRequested=false;dragging=false;},notify});
const playerAccount={coins:0};
const bag=createPlayerInventory(()=>[
  ...BUILD_MATERIALS.map((item,i)=>({id:item.id,quantity:stages.reduce((sum,island)=>sum+island.inventory[i],0)})),
  {id:'bit',quantity:forge.state.bits},
  {id:'byte',quantity:forge.state.bytes},
]);
function hasBagRoom(id){
  if(bag.canStore(id))return true;
  notify('Инвентарь заполнен.');
  return false;
}
function animateCollection(mesh){
  if(bag.loadouts.build.tool==='wand')gathering.collect(mesh);
}
const panel=createPlayerPanel({bag,playerAccount,onOpen(){document.exitPointerLock?.();Object.keys(keys).forEach(k=>keys[k]=false);jumpRequested=false;dragging=false;},mission:()=>({text:currentQuestBrief(),progress:$('#quest-title').textContent+' · '+$('#count').textContent}),notify,camera:toggle,blocked:()=>modalOpen()||!$('#welcome').classList.contains('hidden')});
const restartDialog=$('#restart-dialog');
let restartStage=null;
function modalOpen(){return restartDialog.open||forge.isOpen()||customizer.isOpen()||panel.isOpen()}

const messageBox=$('#message');
let messageTimer;
function notify(text,duration=4500){
  clearTimeout(messageTimer);
  messageBox.textContent=text;
  messageBox.hidden=false;
  messageTimer=setTimeout(()=>{messageBox.hidden=true},duration);
}
function spawnPickups(state){
  if(state.index>1)return;
  const entries=state.index===0 ? [[-4,3,0],[3,4,0],[-5,-4,0],[5,-3,0],[-7,5,0],[7,4,0],[3,-6,0]] :
    [0,2,3].flatMap((material,group)=>Array.from({length:7},(_,i)=>[33+group*6+(i%2)*1.3, [-6,-4,1,4.5][Math.floor(i/2)], material]));
  entries.forEach(([x,z,material],phase)=>{const m=box(x,.55,z,.65,.65,.65,mats[material]);m.userData.material=material;m.userData.objectId=BUILD_MATERIALS[material].id;m.userData.animationPhase=phase;state.pickups.push(m)});
}
stages.forEach(spawnPickups);
function currentQuestBrief() {
  const complete = stage.index === 2 ? forge.state.unlocked : stage.unlocked;
  if (complete) return 'Пройди через открытый портал на следующий остров.';
  return LOCATIONS[stage.index].quest.brief;
}
const locationBanner=$('#location-banner');
const controlStrip=$('.bottom .controls');
let controlStripTimer;
let locationTimer;
function announceLocation(message){
  panel.enterLocation();
  notify(message,10000);
  clearTimeout(controlStripTimer);
  controlStrip.hidden=false;
  if(stage.index>=2)controlStripTimer=setTimeout(()=>{controlStrip.hidden=true},15000);
  clearTimeout(locationTimer);
  locationBanner.hidden=true;
  const name=LOCATIONS[stage.index].name;
  locationTimer=setTimeout(()=>{
    locationBanner.firstElementChild.textContent=name;
    locationBanner.hidden=false;
  },3000);
}
locationBanner.addEventListener('animationend',()=>{locationBanner.hidden=true});
function refreshMission(){
  const location=LOCATIONS[stage.index], quest=location.quest;
  $('.mission .eyebrow').textContent='Остров 0'+(stage.index+1);
  $('#quest-title').textContent=quest.title;
  $('#quest-action').textContent=quest.action;
  $('.progress-label > span').textContent=quest.goal;
  $('.tip').textContent=quest.tip;
  document.body.classList.toggle('forge-mode',stage.index>=2);
  controlStrip.querySelector('.forge-hint').hidden=stage.index!==2;
  const interact=controlStrip.querySelector('.interact-hint');
  interact.hidden=stage.index<2;
  interact.lastElementChild.textContent=stage.index===2?'Верстак / портал':'Вернуться через портал';
  select(selected);update();
}
function update(){
  const n=stage.index<2?stage.built.size:stage.index===2?forge.state.cells.filter(Boolean).length:4;
  const total=stage.index<2?stage.targets.length:4;
  $('#count').textContent=`${n} / ${total}`;
  drawQuestDiagram($('#quest-diagram'),stage,forge.state.cells);
  document.querySelectorAll('.slot b').forEach((el,i)=>el.textContent=isLimited(stage,i)?stage.inventory[i]:'∞');
  exitGlow.visible=stages[0].unlocked;secondGlow.visible=stages[1].unlocked;
  $('#arch-status').textContent=stage.index===2?`Биты: ${forge.state.bits} · Байты: ${forge.state.bytes} · Создано: ${forge.state.crafted}/4`:stage.index===1?stage.arches.map((arch,i)=>`${MATERIAL_NAMES[arch.material]}: ${Array.from(stage.built).filter(t=>Math.floor(t/7)===i).length}/7`).join(' · '):stage.index===0&&stage.unlocked?'Портал открыт · подойди к арке и нажми E':stage.index===3?'Путь к саду открыт · 32 бита · 4 байта':'';
}
function select(i){
  selected=i;
  document.querySelectorAll('.slot').forEach((slot,index)=>{
    slot.classList.toggle('selected',index===i);
    slot.setAttribute('aria-pressed',String(index===i));
  });
}
function nearbyRoute(){
  if(player.position.y>=1)return null;
  const routes=[];
  if(stage.index>0)routes.push({x:stage.center+6,z:6,to:stage.index-1,ready:true,label:'Вернуться в локацию «'+LOCATIONS[stage.index-1].name+'»'});
  if(stage.index===0)routes.push({x:0,z:-1,to:1,ready:stage.unlocked,label:'Перейти на остров трёх арок',locked:'Дострой арку, чтобы открыть проход.'});
  if(stage.index===1)routes.push({x:40,z:-2,to:2,ready:stage.unlocked,label:'Отправиться в кузницу',locked:'Собери все три арки, чтобы открыть кузницу.'});
  if(stage.index===2)routes.push({x:86,z:-4,to:3,ready:forge.state.unlocked,label:'Пройти сквозь врата',locked:'Выложи четыре байта на площадку у арки.'});
  return routes.find(route=>Math.hypot(player.position.x-route.x,player.position.z-route.z)<1.8);
}
function travel(){
  const route=nearbyRoute();if(!route)return false;
  if(!route.ready)return true;
  gathering.clear();stage=stages[route.to];player.position.set(stage.center,0,stage.index===0?2:stage.index===2?4:3);
  Object.assign(physics,createPhysicsState());Object.keys(keys).forEach(k=>keys[k]=false);jumpRequested=false;selected=0;yaw=0;
  sun.position.set(stage.center-10,25,10);sun.target.position.set(stage.center,0,0);sun.target.updateMatrixWorld();
  refreshMission();announceLocation(['Ты вернулся на первый остров.','Собери три арки из трёх материалов.','Кузница ждёт! Собери 8 сине-серых битов и подойди к верстаку.','✦ Дверь открыта. Добро пожаловать в Сад открытий!'][stage.index]);return true;
}
$('#portal-go').onclick=()=>{if(!modalOpen())travel()};
document.querySelectorAll('.slot').forEach((s,i)=>{s.setAttribute('role','button');s.tabIndex=0;s.setAttribute('aria-label',MATERIAL_NAMES[i]);s.title=MATERIAL_NAMES[i]+' · '+BUILD_MATERIALS[i].description;s.onclick=()=>select(i);s.onkeydown=e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();e.stopPropagation();select(i)}}});function toggle(){third=!third;player.visible=third}
$('#play').onclick=()=>{ $('#welcome').classList.add('hidden');panel.start();announceLocation('Маленький остров. Безграничные возможности.');renderer.domElement.requestPointerLock?.()};renderer.domElement.onclick=()=>{if(!modalOpen()&&!document.pointerLockElement&&$('#welcome').classList.contains('hidden'))renderer.domElement.requestPointerLock?.()};document.addEventListener('pointerlockerror',()=>notify('Захват мыши недоступен: удерживай мышь для обзора.'));

let dragging=false;
function mouseControlsCamera(){
  return (document.pointerLockElement===renderer.domElement || dragging)
    && $('#welcome').classList.contains('hidden') && !modalOpen();
}
// Pointer and compatibility mouse events can describe the same Back press.
// During a multi-button camera drag, only mousedown reports the extra press.
let backHeld=false;
let consumeBackPress=false;
function backDown(e){
  if(e.button!==3 || (e.pointerType && e.pointerType!=='mouse'))return;
  if(!backHeld){
    backHeld=true;
    consumeBackPress=mouseControlsCamera();
    if(consumeBackPress)panel.toggleMode();
  }
  if(consumeBackPress)e.preventDefault();
}
function backUp(e){
  if(e.button!==3)return;
  backHeld=false;
  // Keep the original decision for mouseup and auxclick, even if capture ended.
  if(consumeBackPress)e.preventDefault();
}
function resetBackPress(){backHeld=false;consumeBackPress=false}
document.addEventListener('pointerlockchange',()=>{dragging=false});
document.addEventListener('pointerdown',backDown,true);
document.addEventListener('mousedown',backDown,true);
document.addEventListener('pointerup',backUp,true);
document.addEventListener('mouseup',backUp,true);
document.addEventListener('pointercancel',resetBackPress,true);
document.addEventListener('auxclick',e=>{
  if(e.button===3 && consumeBackPress)e.preventDefault();
},true);
renderer.domElement.addEventListener('mousedown',e=>{
  if(e.button!==0 && e.button!==2)return;
  dragging=true;
  if(!modalOpen()&&document.pointerLockElement)act(e.button);
});
document.addEventListener('mouseup',e=>{if(!(e.buttons & 3))dragging=false});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('mousemove',e=>{if(mouseControlsCamera()){yaw-=e.movementX*.003;pitch=THREE.MathUtils.clamp(pitch+e.movementY*.003,-.7,1.1)}});
addEventListener('keydown',e=>{
  if(!$('#welcome').classList.contains('hidden'))return;
  if(e.code==='KeyP'){
    if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.isComposing||e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
    if(customizer.isOpen()){e.preventDefault();customizer.close()}
    else if(!modalOpen()){e.preventDefault();panel.input.clear();customizer.open()}
    return;
  }
  if(modalOpen()){
    if((panel.guideOpen()&&e.code==='KeyH') || (panel.storageOpen()&&['KeyB','KeyC'].includes(e.code)))panel.input.down(e);
    return;
  }
  if(e.code==='Space'&&!document.pointerLockElement&&e.target instanceof HTMLButtonElement)return;
  if(e.code==='KeyN'){
    if(e.repeat || e.defaultPrevented || e.isComposing || e.ctrlKey || e.altKey || e.metaKey ||
        e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
    e.preventDefault();
    act(2);
    return;
  }
  if(panel.input.down(e))return;
  if(e.code==='KeyE'&&!e.repeat){
    if(!travel()&&stage.index===2)forge.open(player.position);
    return;
  }
  if(['Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();
  if(e.code==='Space'&&!keys.Space)jumpRequested=true;
  keys[e.code]=true;
  if(/^Digit[1-6]$/.test(e.code)){
    if(panel.isBattle())notify('Боевые навыки пока недоступны.');
    else select(+e.code.slice(-1)-1);
  }
});
addEventListener('keyup',e=>{
  keys[e.code]=false;
  if((!modalOpen()||panel.storageOpen())&&$('#welcome').classList.contains('hidden'))panel.input.up(e);
  else panel.input.clear();
});
addEventListener('blur',()=>{resetBackPress();dragging=false;panel.input.clear();Object.keys(keys).forEach(k=>keys[k]=false);jumpRequested=false});
function act(button){
  if(panel.isBattle()){notify('Для строительства нажми L / Д или C + V.');return}
  ray.setFromCamera(new THREE.Vector2(),camera);
  if(stage.index>=2){if(stage.index===2&&button===0&&forge.collect(ray,player.position))character.react();return}
  const {pickups,ghosts,placed,targets}=stage;
  const objects=[...pickups,...ghosts.filter(m=>m.visible),...placed];
  const hits=ray.intersectObjects(objects,false).filter(h=>h.object.position.distanceTo(player.position)<6);
  if(hits.length){
    const m=hits[0].object,pi=pickups.indexOf(m),gi=ghosts.indexOf(m);
    if(pi>=0&&button===0){if(!hasBagRoom(m.userData.objectId))return;scene.remove(m);animateCollection(m);pickups.splice(pi,1);stage.inventory[m.userData.material]++;character.react();notify(`${MATERIAL_NAMES[m.userData.material]}: +1`);update();return}
    if(gi>=0&&button===0){
      const t=targets[gi];
      if(selected!==t.material){notify(`Для этой арки нужен материал «${MATERIAL_NAMES[t.material]}» — клавиша ${t.material+1}.`);return}
      if(!stage.inventory[selected]){notify(`Сначала собери материал «${MATERIAL_NAMES[selected]}».`);return}
      if(Math.abs(player.position.x-t.x)<.79&&Math.abs(player.position.z-t.z)<.79&&player.position.y<t.y+.49&&player.position.y+1.7>t.y-.49){notify('Отойди немного, чтобы поставить куб.');return}
      const wasUnlocked=stage.unlocked;
      if(!placeTarget(stage,gi,selected))return;character.react();
      m.visible=false;const block=box(t.x,t.y,t.z,.98,.98,.98,mats[selected],true);block.userData.target=gi;block.userData.objectId=BUILD_MATERIALS[selected].id;placed.push(block);update();
      if(stage.unlocked&&!wasUnlocked)notify(stage.index===0?'✦ Портал открыт! Подойди к арке и нажми E.':'✦ Три арки готовы! Средняя арка открыла портал в кузницу — нажми E рядом с ней.');
      return;
    }
    if(button===2&&placed.includes(m)){
      const material=m.userData.target===undefined?m.userData.material:targets[m.userData.target].material;
      if(isLimited(stage,material)&&!hasBagRoom(BUILD_MATERIALS[material].id))return;
      if(m.userData.target!==undefined){removeTarget(stage,m.userData.target);ghosts[m.userData.target].visible=true}
      else if(isLimited(stage,m.userData.material))stage.inventory[m.userData.material]++;
      scene.remove(m);placed.splice(placed.indexOf(m),1);solids.splice(solids.indexOf(m),1);update();return;
    }
  }
  if(button!==0)return;
  const point=new THREE.Vector3();
  if(!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),point)||point.distanceTo(player.position)>=6||Math.abs(point.x-stage.center)>=10||Math.abs(point.z)>=9)return;
  const x=Math.round(point.x),z=Math.round(point.z);
  if(stage.index===1&&Math.abs(x-46)<2&&Math.abs(z-6)<2){notify('Оставь проход к порталу свободным.');return}
  if(stage.arches.some(a=>Math.abs(x-a.x)<=2&&Math.abs(z-a.z)<=1)){notify('Эта площадка оставлена для арки.');return}
  if(Math.hypot(x-player.position.x,z-player.position.z)<1)return;
  const column=placed.filter(m=>m.position.x===x&&m.position.z===z);if(column.length>=5)return;
  const y=.5+column.length;
  if(solids.some(m=>Math.abs(x-m.position.x)<.49+m.scale.x/2&&Math.abs(z-m.position.z)<.49+m.scale.z/2&&Math.abs(y-m.position.y)<.49+m.scale.y/2))return;
  if(isLimited(stage,selected)){if(!stage.inventory[selected]){notify('Сначала собери кубы выбранного материала.');return}stage.inventory[selected]--}
  const block=box(x,y,z,.98,.98,.98,mats[selected],true);block.userData.material=selected;block.userData.objectId=BUILD_MATERIALS[selected].id;placed.push(block);update();
}
function restartWarning(){
  if(stage.index===3)return 'Вы вернётесь к началу сада. Врата кузницы останутся открыты.';
  if(stage.index===2){
    if(forge.state.crafted || forge.state.bits || forge.state.slots.some(Boolean))
      return 'Биты и байты в сумке, на верстаке и площадке будут сброшены. Врата придётся открыть заново.';
  }else if(stage.placed.length || stage.inventory.some(Boolean) || stage.unlocked){
    return 'Постройки и собранные на этом острове материалы будут сброшены. Чтобы открыть портал, нужно будет заново выполнить задание острова.';
  }
  return 'На этом острове пока нет прогресса для сброса. Вы вернётесь на стартовую позицию.';
}
$('#reset').onclick=e=>{
  if(e.detail!==1 || e.button!==0 || modalOpen() || !$('#welcome').classList.contains('hidden'))return;
  restartStage=stage;
  $('#restart-island').textContent=LOCATIONS[stage.index].name;
  $('#restart-loss').textContent=restartWarning();
  document.exitPointerLock?.();
  Object.keys(keys).forEach(k=>keys[k]=false);
  dragging=false;jumpRequested=false;panel.input.clear();
  restartDialog.showModal();
  $('#restart-cancel').focus();
};
$('#restart-cancel').onclick=()=>restartDialog.close();
addEventListener('pagehide',()=>{if(restartDialog.open)restartDialog.close()});
$('#restart-confirm').onclick=e=>{
  // Keyboard-generated clicks have detail 0. A second click in a double-click
  // must never confirm a prompt that appeared under the pointer.
  if(e.detail!==1 || e.button!==0 || !restartDialog.open)return;
  const target=restartStage;
  restartStage=null;
  restartDialog.close();
  if(target!==stage)return;
  gathering.clear();
  if(stage.index===2)forge.reset();
  for(const block of stage.placed){
    scene.remove(block);
    const index=solids.indexOf(block);
    if(index>=0)solids.splice(index,1);
  }
  stage.placed.length=0;
  stage.pickups.forEach(m=>scene.remove(m));stage.pickups.length=0;stage.ghosts.forEach(m=>m.visible=true);
  stage.inventory.fill(0);stage.built.clear();stage.unlocked=false;spawnPickups(stage);
  player.position.set(stage.center,0,stage.index===0?6:3);Object.assign(physics,createPhysicsState());jumpRequested=false;
  yaw=0;pitch=.23;select(0);update();announceLocation('Текущий остров начат заново.');
};
refreshMission();
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
function frame(now){
requestAnimationFrame(frame);
const dt=Math.min((now-last)/1000,.04);last=now;
const active=$('#welcome').classList.contains('hidden')&&!modalOpen();
const previousX=player.position.x,previousZ=player.position.z;
if(active){
  const forward=Number(!!keys.KeyW)-Number(!!keys.KeyS),right=Number(!!keys.KeyD)-Number(!!keys.KeyA);
  let vx=-Math.sin(yaw)*forward+Math.cos(yaw)*right;
  let vz=-Math.cos(yaw)*forward-Math.sin(yaw)*right;
  const length=Math.hypot(vx,vz);
  if(length){vx=vx/length*4;vz=vz/length*4}
  movePlayer(player.position,physics,{dt,vx,vz,jump:jumpRequested,limits:{x:[stage.center-10,stage.center+10],z:[-9,9]}},solids);
}
jumpRequested=false;
player.rotation.y=yaw;
character.animate(dt,{dx:player.position.x-previousX,dz:player.position.z-previousZ,yaw,grounded:physics.grounded,velocity:physics.velocity,time:now/1000});
const eye=player.position.clone().add(new THREE.Vector3(0,1.5,0));const look=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));if(third){followCamera(camera,eye,look,[...solids,exitGlow,secondGlow,...returnGlows,...forge.cameraObstacles])}else{camera.position.copy(eye);camera.lookAt(eye.clone().add(look))}stage.pickups.forEach(m=>{const phase=m.userData.animationPhase;m.rotation.y=now*.0008+phase;m.position.y=.65+Math.sin(now*.002+phase)*.12});
panel.updatePortal(nearbyRoute(),active&&!document.hidden,now);
for(const portal of [exitGlow,secondGlow,...returnGlows])portal.material.opacity=.4+Math.sin(now*.002)*.12;
forge.update(player.position,now/1000,stage.index===2&&$('#welcome').classList.contains('hidden')&&!restartDialog.open&&!customizer.isOpen()&&!panel.isOpen());
panel.update(dt,now/1000,active);
gathering.update(dt,now/1000,{active,third,visible:!panel.isBattle()&&bag.loadouts.build.tool==='wand',dx:player.position.x-previousX,dz:player.position.z-previousZ,yaw,pitch,grounded:physics.grounded,reducedMotion:reducedHandMotion.matches});
if(!customizer.isOpen()){renderer.render(scene,camera);gathering.render()}customizer.render(dt,now/1000)}requestAnimationFrame(frame);
