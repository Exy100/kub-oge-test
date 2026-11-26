import { STAFF_ID, STAFF_ATTACK, STAFF_SOUNDS } from './catalog/pulse-staff.js?v=3';
import { timberMaterial } from './world/timber.js';
import { newRepair, repairBrief, hasArchWood, createWorkshop } from './quests/workshop.js?v=19';
import { createProcessorLab, WEAPON_KIT } from './quests/processor-lab.js?v=10';
import { createSignalStation } from './quests/signal.js';
import { pcParts } from './catalog/pc-parts.js';
import { createScanStore, resetDailyFindings } from './skills/explorer-scan.js';
import { createScanInteraction } from './skills/scan-interaction.js';
import { installCheatMenu } from './dev/cheat-menu.js';
import { BUILD_MATERIALS } from './catalog/index.js';
import { LOCATIONS } from './locations/index.js';
import { createSimpleArchEffect } from './world/simple-arch.js';
import { buildIslandTerrain } from './world/island-terrain.js';
import { createForgeState } from './forge-state.js?v=5';
import { drawQuestDiagram } from './quest-diagram.js?v=2';
import { createPlayerInventory } from './player-inventory.js?v=6';
import { equipGatheringWand } from './gathering-wand.js?v=24';
import { createPlayerPanel } from './player-panel.js?v=42';
import * as THREE from './vendor/three.module.js';
import { createCharacter } from './character.js?v=20';
import { createPhysicsState, movePlayer } from './physics.js?v=5';
import { createForge } from './forge.js?v=18';
import { EXPLORER, loadAppearance } from './appearance.js?v=12';
import { createCustomizer } from './customizer.js?v=20';
import { createFollowState, followCamera } from './follow-camera.js?v=2';
import { createStage, placeTarget, removeTarget, isLimited, MATERIAL_NAMES } from './progression.js?v=4';
const $=s=>document.querySelector(s), scene=new THREE.Scene();scene.background=new THREE.Color('#c9dfda');scene.fog=new THREE.Fog('#c9dfda',35,85);
const renderer=new THREE.WebGLRenderer({canvas:$('#world'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,140);scene.add(new THREE.HemisphereLight(0xf6ffe6,0x788974,2.5));const sun=new THREE.DirectionalLight(0xffeed0,3);sun.position.set(-10,25,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22});sun.shadow.normalBias=.03;scene.add(sun);
const colors=BUILD_MATERIALS.map(item=>item.color), mats=colors.map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));const geo=new THREE.BoxGeometry(1,1,1), solids=[];
function createBoxBuilder(parent, colliders) {
  return (x,y,z,w,h,d,color,collide=false) => {
    const material = typeof color === 'number' ? new THREE.MeshStandardMaterial({color,roughness:1}) : color;
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x,y,z);
    mesh.scale.set(w,h,d);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    if (collide) colliders.push(mesh);
    return mesh;
  };
}
const skyBox = createBoxBuilder(scene, []);
// Distant drifting block clouds.
for(let i=0;i<12;i++){const x=Math.sin(i*3)*42,z=Math.cos(i*3)*42;skyBox(x,13+i%3*2,z,7,1.2,3,0xeaf0e5);skyBox(x+1,14+i%3*2,z,4,1,2,0xeaf0e5)}
let stages = LOCATIONS.map((_, i) => createStage(i));
const forgeState = createForgeState();
const island = new THREE.Group();
const box = createBoxBuilder(island, solids);
const cameraObstacles = [];
let workshop, signalStation, processorLab, timber;
let trunks=[],lastChop=-Infinity;
let stage, forge, exitGlow, returnGlow, simpleArchEffect;
scene.add(island);
const character=createCharacter(loadAppearance(EXPLORER), EXPLORER), player=character.root;scene.add(player);
const reducedHandMotion=matchMedia('(prefers-reduced-motion: reduce)');
const gathering=equipGatheringWand({character,camera,scene,renderer});
player.position.set(0,0,6);let yaw=0,pitch=.23,third=true,selected=0;const physics=createPhysicsState();let jumpRequested=false;const keys={},ray=new THREE.Raycaster();let last=performance.now();
const customizer=createCustomizer({character,canEdit:()=>stage.index===0,onOpen(){document.exitPointerLock?.();Object.keys(keys).forEach(k=>keys[k]=false);jumpRequested=false;dragging=false;},notify});
let scanner = null;
const scanDialog = $('#scan-dialog');
const scanStore = createScanStore(save => scanner?.sync(save));
let sessionCoins = 0;
const playerAccount = {
  get coins(){return scanStore.state.coins + sessionCoins},
  set coins(value){sessionCoins = value - scanStore.state.coins},
};
scanDialog.querySelector('button').onclick = () => scanDialog.close();
function pauseForScanMenu(){
  document.exitPointerLock?.();
  Object.keys(keys).forEach(key => {keys[key]=false});
  panel.input.clear();
  dragging = jumpRequested = false;
}
const skillList = $('#skill-list');
const skillChoices = [...skillList.querySelectorAll('[data-skill]')];
const skillStorageKey = 'kub.special-skill.v1.' + character.profile.id;
let preferredSkill, restoreSkillPointer = false;
try { preferredSkill = localStorage.getItem(skillStorageKey); } catch {}
function availableSkill(button) {
  const location = LOCATIONS[stage.index];
  return character.profile.specialSkills?.includes(button.dataset.skill) &&
    (button.dataset.skill === 'grass' ? !!location.scanSurface : location.trees.length > 0);
}
function equippedSkill() {
  const available = skillChoices.filter(availableSkill);
  return available.find(button => button.dataset.skill === preferredSkill) ?? available[0];
}
function refreshSkillSlot() {
  const slot = $('#skill-slot');
  const groundChoice = skillList.querySelector('[data-skill="grass"]');
  const board = LOCATIONS[stage.index].scanSurface === 'board';
  groundChoice.querySelector('strong').textContent = board ? 'Скан платы' : 'Скан травы';
  groundChoice.querySelector('small').textContent = board ? 'Клетка материнской платы' : 'Клетка Острова мечтателей';
  const equipped = equippedSkill();
  slot.hidden = !equipped;
  if (!equipped) return;
  const name = equipped.querySelector('strong').textContent;
  slot.querySelector('span').textContent = name;
  slot.title = name + ' · 0 — применить · Shift + 0 или щелчок — сменить';
  slot.setAttribute('aria-label', 'Сменить особый навык. Сейчас выбран «' + name + '»');
}
function applySkill() {
  const equipped = equippedSkill();
  if (!equipped) notify('На этом острове нет доступного особого навыка.');
  else if (third || panel.isBattle()) notify('Для скана включи вид от первого лица (V) и режим сборки (L).');
  else scanner?.start(equipped.dataset.skill);
}
function openSkillList(){
  const skills = character.profile.specialSkills;
  if (!skills?.length) {notify('У этого героя пока нет особых навыков.');return}
  scanner?.cancel();
  restoreSkillPointer = document.pointerLockElement === renderer.domElement;
  pauseForScanMenu();
  const equipped = equippedSkill();
  for (const button of skillChoices) {
    const skill = button.dataset.skill;
    button.hidden = !skills.includes(skill);
    button.disabled = !availableSkill(button);
    button.setAttribute('aria-pressed', String(button === equipped));
  }
  skillList.showModal();
  const available = skillChoices.filter(b=>!b.hidden && !b.disabled);
  equipped?.focus();
  if (!reducedHandMotion.matches) {
    for (const button of available) button.querySelector('video').play().catch(()=>{});
  }
}
function closeSkillList(){
  skillList.close();
  if (restoreSkillPointer) renderer.domElement.requestPointerLock?.()?.catch(()=>{});
  restoreSkillPointer = false;
}
skillList.querySelector('.paths-heading button').onclick = () => closeSkillList();
skillList.addEventListener('cancel',event=>{event.preventDefault();closeSkillList()});
skillList.addEventListener('close',()=>{
  for (const video of skillList.querySelectorAll('video')) video.pause();
});
for (const button of skillChoices) button.onclick = () => {
  preferredSkill = button.dataset.skill;
  try { localStorage.setItem(skillStorageKey, preferredSkill); } catch {}
  refreshSkillSlot();
  closeSkillList();
};
skillList.addEventListener('keydown',e=>{
  if (!skillList.open || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing) return;
  const shortcuts = {Digit1:0,Numpad1:0,Digit2:1,Numpad2:1};
  if (e.code in shortcuts || ['Digit0','Numpad0','ArrowUp','ArrowDown'].includes(e.code)) {
    e.preventDefault();e.stopPropagation();
    if (e.repeat) return;
    if (e.code in shortcuts) {
      const button = skillChoices[shortcuts[e.code]];
      if (!button.hidden && !button.disabled) button.click();
    } else if (e.code.endsWith('0')) closeSkillList();
    else {
      const available = skillChoices.filter(b=>!b.hidden && !b.disabled);
      const offset = e.code === 'ArrowDown' ? 1 : -1;
      available[(available.indexOf(document.activeElement)+available.length+offset)%available.length]?.focus();
    }
  }
});
const bag=createPlayerInventory(()=>[
  {id:WEAPON_KIT,quantity:stages.some(s=>s.locationId==='island.processor-lab' && s.unlocked)?1:0},
  {id:'wood-axe',quantity:stages.some(s=>s.repair?.axe)?1:0},
  ...pcParts.map((part,i)=>({id:part.id,quantity:stages.some(s=>s.repair?.parts[i]==='bag')?1:0})),
  ...BUILD_MATERIALS.map((item,i)=>({id:item.id,quantity:stages.reduce((sum,island)=>sum+island.inventory[i],0)})),
  {id:'bit',quantity:forgeState.bits},
  {id:'byte',quantity:forgeState.bytes},
]);
function hasBagRoom(id){
  if(bag.canStore(id))return true;
  notify('Инвентарь заполнен.');
  return false;
}
function buildSound(filename) {
  const clip = new Audio(new URL('./assets/audio/' + filename, import.meta.url).href);
  clip.preload = 'auto';
  clip.volume = 0.7;
  return () => {
    clip.currentTime = 0;
    // Audio may be blocked by browser settings. Gameplay can still proceed.
    clip.play().catch(() => {});
  };
}
const playPickup = buildSound('pickup.wav');
const playPlacement = buildSound('place.wav');
const playStaffLaunch = buildSound(STAFF_SOUNDS.launch);
const staffDischarges = STAFF_SOUNDS.impacts.map(buildSound);
let nextStaffDischarge = 0;

function onCollect(mesh){
  playPickup();
  if(bag.loadouts.build.tool==='wand')gathering.collect(mesh);
}
const panel=createPlayerPanel({bag,playerAccount,onEquipmentChange:refreshStrike,onOpen(){document.exitPointerLock?.();Object.keys(keys).forEach(k=>keys[k]=false);jumpRequested=false;dragging=false;},mission:()=>({text:currentQuestBrief(),progress:$('#quest-title').textContent+' · '+$('#count').textContent}),notify,camera:toggle,blocked:()=>modalOpen()||!$('#welcome').classList.contains('hidden')});
$('#skill-slot').onclick = () => {
  if (!modalOpen() && $('#welcome').classList.contains('hidden')) openSkillList();
};
const fieldDialog=$('#workshop-dialog');
fieldDialog.querySelector('.paths-heading button').onclick=()=>fieldDialog.close();
const restartDialog=$('#restart-dialog');
let restartStage=null, extraDialog=null;
function modalOpen(){return fieldDialog.open||skillList.open||scanDialog.open||extraDialog?.open||restartDialog.open||forge?.isOpen()||customizer.isOpen()||panel.isOpen()}

const messageBox=$('#message');
let messageTimer;
function notify(text,duration=4500){
  clearTimeout(messageTimer);
  messageBox.textContent=text;
  messageBox.hidden=false;
  messageTimer=setTimeout(()=>{messageBox.hidden=true},duration);
}
function spawnPickups(state){
  if(!state.arches.length || state.locationId==='island.turtle')return;
  const entries=state.index===0 ? [[-4,3,0],[3,4,0],[-5,-4,0],[5,-3,0],[-7,5,0],[7,4,0],[3,-6,0]] :
    [0,2,3].flatMap((material,group)=>Array.from({length:7},(_,i)=>[33+group*6+(i%2)*1.3, [-6,-4,1,4.5][Math.floor(i/2)], material]));
  entries.forEach(([x,z,material], phase) => {
    if (state.collected.has(phase)) return;
    const pickup = box(x,.55,z,.65,.65,.65,mats[material]);
    pickup.userData.material = material;
    pickup.userData.objectId = BUILD_MATERIALS[material].id;
    pickup.userData.animationPhase = phase;
    state.pickups.push(pickup);
  });
}
function unloadIsland() {
  workshop?.dispose(); signalStation?.dispose(); processorLab?.dispose(); workshop=signalStation=processorLab=null;
  panel.setStrike(null);
  scanner?.dispose();
  scanner = null;
  gathering.clear();
  stage.freeBlocks = stage.placed.filter(m => m.userData.target === undefined)
    .map(m => ({x:m.position.x, y:m.position.y, z:m.position.z, material:m.userData.material}));
  const resources = new Set();
  if (forge) {
    stage.remainingBits = forge.pickups.map(m => m.userData.seed);
    forge.dispose(resources);
    forge = null;
  }
  island.traverse(object => {
    if (object.isInstancedMesh) object.dispose();
    if (object.geometry && object.geometry !== geo) resources.add(object.geometry);
    if (!object.material) return;
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if(material===timber)continue;
      if (!mats.includes(material)) resources.add(material);
      if (material.map) resources.add(material.map);
    }
  });
  for (const resource of resources) resource.dispose();
  island.clear();
  if(timber){timber.map.dispose();timber.dispose();timber=null}
  solids.length = cameraObstacles.length = 0;
  delete stage.placed;
  delete stage.ghosts;
  delete stage.pickups;
}

function addBlock(x, y, z, material, target) {
  const block = box(x,y,z,.98,.98,.98,material===2 && timber ? timber : mats[material],true);
  block.userData.objectId = BUILD_MATERIALS[material].id;
  if (target === undefined) block.userData.material = material;
  else block.userData.target = target;
  stage.placed.push(block);
}

function enterIsland(next) {
  if (stage === next) return;
  if (stage) unloadIsland();
  stage = next;
  island.name = stage.locationId;
  buildIslandTerrain(LOCATIONS[stage.index], stage.index, island, geo, box, solids, cameraObstacles);
  trunks=solids.filter(mesh=>mesh.name==='island-tree-trunk' || mesh.name==='tree-trunk');
  if(stage.locationId==='island.turtle')timber=timberMaterial();
  stage.placed = [];
  stage.pickups = [];
  stage.collected ??= new Set();
  stage.ghosts = stage.targets.map((t, i) => {
    const m = box(t.x,t.y,t.z,.96,.96,.96,new THREE.MeshStandardMaterial({color:colors[t.material],transparent:true,opacity:.28,depthWrite:false}));
    m.userData.objectId = BUILD_MATERIALS[t.material].id;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:colors[t.material]})));
    if (stage.built.has(i)) {
      m.visible = false;
      addBlock(t.x,t.y,t.z,t.material,i);
    }
    return m;
  });
  for (const block of stage.freeBlocks || []) addBlock(block.x,block.y,block.z,block.material);
  delete stage.freeBlocks;
  spawnPickups(stage);
  if (stage.locationId === 'island.three-arches') {
    for (const arch of stage.arches) for(let x=-1;x<=1;x++) for(let z=-1;z<=1;z++) box(arch.x+x,.015,arch.z+z,.98,.08,.98,0xded9bb);
  }
  simpleArchEffect = exitGlow = returnGlow = null;
  const lab = stage.locationId === 'island.processor-lab';
  if (lab) processorLab=createProcessorLab({stage,box,player,dialog:fieldDialog,pause:pauseForScanMenu,changed:update,canStore:hasBagRoom,notify});
  if (lab) {
    exitGlow = processorLab.exitSurface;
  } else if (stage.arches.length) {
    simpleArchEffect = createSimpleArchEffect();
    exitGlow = simpleArchEffect.createSurface(stage.arches[stage.arches.length===1?0:1]);
  }
  if (exitGlow) {
    island.add(exitGlow);
    cameraObstacles.push(exitGlow);
  }
  if (stage.locationId==='island.turtle') {
    stage.repair ??= newRepair();
    workshop=createWorkshop({stage,parent:island,geometry:geo,box,solids,player,camera,canStore:hasBagRoom,
      equipAxe(){
        bag.equip('build','tool','wood-axe');
        if(panel.isBattle())panel.toggleMode();
        select(2);
      },
      notify,pause:pauseForScanMenu,changed:update,collect:playPickup,place:playPlacement,onHit:()=>character.react()});


  }
  if(stage.locationId==='island.three-arches'){
    signalStation=createSignalStation({stage,box,player,pause:pauseForScanMenu,changed:update});
  }
  if (stage.index > 0) {
    const center = stage.center + 6;
    const z = lab ? 8 : 6;
    for(const x of [center-1.15,center+1.15])box(x,1.5,z,.6,3,.6,0x8bada5,true);
    box(center,3.1,z,2.9,.5,.6,0x8bada5,true);
    returnGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.7,2.9),new THREE.MeshBasicMaterial({color:0x74e8d4,transparent:true,opacity:.38,side:THREE.DoubleSide,depthWrite:false}));
    returnGlow.position.set(center,1.45,z);
    island.add(returnGlow);
    cameraObstacles.push(returnGlow);
  }
  if (stage.locationId === 'island.data-forge') {
    forge = createForge({scene:island, box, solids, state:forgeState, remainingBits:stage.remainingBits,
      canStore:hasBagRoom, onCollect, onPlace:playPlacement, notify, onChange:update,
      onOpen(){document.exitPointerLock?.();Object.keys(keys).forEach(k=>keys[k]=false);jumpRequested=false;dragging=false;}});
    cameraObstacles.push(...forge.cameraObstacles);
  }
  refreshStrike();
  if (character.profile.specialSkills?.length) {
    scanStore.refresh();
    scanner = createScanInteraction({
      location:LOCATIONS[stage.index], island, solids, obstacles:cameraObstacles, stage, camera, player,
      store:scanStore, dialog:scanDialog, progress:$('#scan-progress'), say:panel.scanResult, notify,
      pause:pauseForScanMenu, onCoin(){playPickup();character.react();notify('Золото +1')},
    });
  }
}

function refreshStrike(){
  if(bag.loadouts.battle.weapon===STAFF_ID && !bag.equipmentItems().some(item=>item.id===STAFF_ID)){
    bag.equip('battle','weapon',null);
  }
  const weapon=bag.loadouts.battle.weapon;
  panel.setStrike(weapon || workshop?battleStrike:null,weapon);
}
function battleStrike(){
  if(!panel.isBattle() || modalOpen())return;
  if(bag.loadouts.battle.weapon==='wand'){
    gathering.strike(()=>workshop?.attack(true));
  }else if(bag.loadouts.battle.weapon===STAFF_ID){
    gathering.fire(releaseStaffPulse);
  }else workshop?.attack();
}
function releaseStaffPulse(){
  const origin=player.position.clone();
  origin.y+=1.5;
  const direction=camera.getWorldDirection(new THREE.Vector3());
  const caster=new THREE.Raycaster(origin,direction,0,STAFF_ATTACK.range);
  // Lock the firing direction. Recheck moving targets and cover when the arcs meet.
  function trace(applyDamage){
    caster.far=STAFF_ATTACK.range;
    const obstacle=caster.intersectObjects(solids,false)[0];
    if(obstacle)caster.far=obstacle.distance;
    const distance=workshop?.pulseHit(caster,applyDamage)??caster.far;
    return caster.ray.at(distance,new THREE.Vector3());
  }
  playStaffLaunch();
  return {end:trace(false),hit(){
    staffDischarges[nextStaffDischarge]();
    nextStaffDischarge = (nextStaffDischarge + 1) % staffDischarges.length;
    return trace(true);
  }};
}
function currentQuestBrief() {
  const complete = stage.locationId === 'island.data-forge' ? forgeState.unlocked : stage.unlocked;
  if (complete) return 'Пройди через открытый портал на следующий остров.';
  if(processorLab && stage.metRemontik)return 'Собери букву Б из кубов на стенде справа от процессора.';
  if(stage.repair)return repairBrief(stage);
  if(signalStation && stage.sentWood)return 'Построй три арки из песчаника, дерева и камня.';
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
  if(!stage.arches.length)controlStripTimer=setTimeout(()=>{controlStrip.hidden=true},15000);
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
  document.body.classList.toggle('forge-mode',!stage.arches.length);
  document.body.classList.toggle('processor-lab',!!processorLab);
  refreshSkillSlot();
  controlStrip.querySelector('.scan-hint').hidden=!equippedSkill();
  controlStrip.querySelector('.forge-hint').hidden=stage.locationId!=='island.data-forge';
  const interact=controlStrip.querySelector('.interact-hint');
  interact.hidden=stage.arches.length>0 && !workshop;
  interact.lastElementChild.textContent=workshop?'Черепаха / детали / портал':processorLab?'Ремонтик / портал':stage.locationId==='island.data-forge'?'Верстак / портал':'Вернуться через портал';
  select(selected);update();
}
function update(){
  panel.setQuestIntro(!!stage.repair && !stage.repair.met);
  if(stage.repair){
    const building=!!stage.repair.axe;
    document.body.classList.toggle('forge-mode',!building);
    $('.progress-label > span').textContent=building?(hasArchWood(stage)?'Блоки в деревянной арке':'Древесина для арки'):
      'Найдено '+stage.repair.parts.filter(p=>p==='bag' || p==='installed').length+'/'+pcParts.length;
    stage.ghosts.forEach((mesh,i)=>{mesh.visible=building && !stage.built.has(i)});
    if(building)$('.tip').textContent='В режиме сборки ударь ЛКМ по стволу. Клавиша 3 — дерево, ЛКМ по контуру — поставить блок.';
  }
  if(stage.repair && stage.repair.met && !stage.repair.axe)$('.tip').textContent='L — режим боя. 1 или ЛКМ — удар вблизи. E — детали и верстак.';
  if(stage.repair || signalStation || processorLab)$('#quest-action').textContent=currentQuestBrief();
  const repairing=stage.repair && !stage.repair.axe;
  const n=repairing?stage.repair.parts.filter(p=>p==='installed').length:stage.arches.length?stage.built.size:forgeState.cells.filter(Boolean).length;
  const total=repairing?pcParts.length:stage.arches.length?stage.targets.length:4;
  if(processorLab)$('#count').textContent=stage.unlocked?'Работает':'Остановлен';
  else if(repairing)$('#count').textContent=`Установлено ${n}/${total}`;
  else if(stage.repair && !hasArchWood(stage))$('#count').textContent=`${stage.inventory[2]+stage.built.size} / ${total}`;
  else $('#count').textContent=`${n} / ${total}`;
  drawQuestDiagram($('#quest-diagram'),stage,forgeState.cells);
  document.querySelectorAll('.slot b').forEach((el,i)=>el.textContent=isLimited(stage,i)?stage.inventory[i]:'∞');
  if (exitGlow) exitGlow.visible = stage.unlocked;
  $('#arch-status').textContent=stage.locationId==='island.data-forge'?`Биты: ${forgeState.bits} · Байты: ${forgeState.bytes} · Создано: ${forgeState.crafted}/4`:stage.locationId==='island.three-arches'?stage.arches.map((arch,i)=>`${MATERIAL_NAMES[arch.material]}: ${Array.from(stage.built).filter(t=>Math.floor(t/7)===i).length}/7`).join(' · '):stage.index===0&&stage.unlocked?'Портал открыт · подойди к арке и нажми E':stage.locationId==='island.discovery-garden'&&forgeState.unlocked?'Путь к саду открыт · 32 бита · 4 байта':'';
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
  if(returnGlow)routes.push({x:returnGlow.position.x,z:returnGlow.position.z,to:stage.index-1,ready:true,label:'Вернуться в локацию «'+LOCATIONS[stage.index-1].name+'»'});
  if(stage.index===0)routes.push({x:0,z:-1,to:stage.index+1,ready:stage.unlocked,label:'Перейти в мастерскую черепахи',locked:'Дострой арку, чтобы открыть проход.'});
  if(processorLab)routes.push({...processorLab.exitArch,to:stage.index+1,ready:stage.unlocked,label:'Перейти на остров трёх арок',locked:currentQuestBrief()});
  if(workshop)routes.push({x:stage.center,z:-6,to:stage.index+1,ready:stage.unlocked,label:'Перейти в лабораторию процессора',locked:stage.repair.axe?'Заверши деревянную арку.':'Помоги черепахе починить компьютер.'});
  if(stage.locationId==='island.three-arches')routes.push({x:40,z:-2,to:stage.index+1,ready:stage.unlocked,label:'Отправиться в кузницу',locked:stage.sentWood?'Собери все три арки, чтобы открыть кузницу.':'Включи на пульте указатель к дереву.'});
  if(stage.locationId==='island.data-forge')routes.push({x:86,z:-4,to:stage.index+1,ready:forgeState.unlocked,label:'Пройти сквозь врата',locked:'Выложи четыре байта на площадку у арки.'});
  return routes.find(route=>Math.hypot(player.position.x-route.x,player.position.z-route.z)<1.8);
}
function travel(){
  const route=nearbyRoute();if(!route)return false;
  if(!route.ready)return true;
  const labReady=stages[route.to].locationId==='island.processor-lab' && stages[route.to].unlocked;
  goToIsland(route.to, labReady?'Процессор работает. Северный портал открыт.':['Ты вернулся на первый остров.','Черепаха ждёт у разобранного компьютера.','Процессор остановлен. Поговори с Ремонтиком.','Станция кодирования и три арки ждут тебя.','Кузница ждёт! Собери 8 сине-серых битов и подойди к верстаку.','✦ Дверь открыта. Добро пожаловать в Сад открытий!'][route.to]);
  return true;
}
function goToIsland(index, message){
  enterIsland(stages[index]);followState=createFollowState();
  const arrival = LOCATIONS[index].arrival;
  player.position.set(stage.center+(arrival?.x ?? 0),0,arrival?.z ?? (index===0?2:stage.locationId==='island.data-forge'?4:3));
  Object.assign(physics,createPhysicsState());Object.keys(keys).forEach(k=>keys[k]=false);jumpRequested=false;selected=stage.repair?.axe?2:0;yaw=arrival?.yaw ?? 0;
  sun.position.set(stage.center-10,25,10);sun.target.position.set(stage.center,0,0);sun.target.updateMatrixWorld();
  refreshMission();announceLocation(message);
}
$('#portal-go').onclick=()=>{if(!modalOpen())travel()};
document.querySelectorAll('.slot').forEach((s,i)=>{s.setAttribute('role','button');s.tabIndex=0;s.setAttribute('aria-label',MATERIAL_NAMES[i]);s.title=MATERIAL_NAMES[i]+' · '+BUILD_MATERIALS[i].description;s.onclick=()=>select(i);s.onkeydown=e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();e.stopPropagation();select(i)}}});function toggle(){third=!third;followState=createFollowState()}
$('#play').onclick=()=>{ $('#welcome').classList.add('hidden');panel.start();announceLocation('Маленький остров. Безграничные возможности.');renderer.domElement.requestPointerLock?.()};renderer.domElement.onclick=()=>{if(skipWallClick){skipWallClick=false;return}if(!modalOpen()&&!document.pointerLockElement&&$('#welcome').classList.contains('hidden'))renderer.domElement.requestPointerLock?.()};document.addEventListener('pointerlockerror',()=>notify('Захват мыши недоступен: удерживай мышь для обзора.'));

let dragging=false, skipWallClick=false;
const centerAim=new THREE.Vector2(), wallPointer=new THREE.Vector2(), wallCaster=new THREE.Raycaster();
function worldWall(){
  if(!processorLab || !processorLab.wall.ready() || modalOpen() || panel.isBattle() || !$('#welcome').classList.contains('hidden'))return null;
  return processorLab.wall;
}
function wallRay(event){
  if(document.pointerLockElement===renderer.domElement)wallPointer.set(0,0);
  else if(event)wallPointer.set(2*event.clientX/innerWidth-1,1-2*event.clientY/innerHeight);
  camera.updateMatrixWorld();
  wallCaster.setFromCamera(wallPointer,camera);
  return wallCaster.ray;
}
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
document.addEventListener('pointerlockchange',()=>{dragging=false;processorLab?.wall.cancel()});
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
  skipWallClick=false;
  if(e.button===0 && worldWall()?.begin(wallRay(e))){
    skipWallClick=true;
    dragging=false;
    e.preventDefault();
    return;
  }
  dragging=true;
  if(!modalOpen()&&document.pointerLockElement)act(e.button);
});
document.addEventListener('mouseup',e=>{
  if(e.button===0 && processorLab?.wall.holding){
    if(worldWall() && (document.pointerLockElement || e.target===renderer.domElement))processorLab.wall.drop(wallRay(e));
    else processorLab.wall.cancel();
  }
  if(!(e.buttons & 3))dragging=false;
});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('mousemove',e=>{if(processorLab?.wall.holding && !document.pointerLockElement)wallRay(e);if(mouseControlsCamera()){yaw-=e.movementX*.003;pitch=THREE.MathUtils.clamp(pitch+e.movementY*.003,-.7,1.1)}});
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
  if (e.code==='Digit0' || e.code==='Numpad0') {
    if (e.repeat || e.isComposing || e.ctrlKey || e.altKey || e.metaKey ||
        e.target?.closest?.('input,textarea,select,[contenteditable]')) return;
    e.preventDefault();
    if (e.shiftKey) openSkillList();
    else applySkill();
    return;
  }
  if(panel.input.down(e))return;
  if(e.code==='KeyE'&&!e.repeat){
    const wall=worldWall();
    if(wall){
      wallPointer.set(0,0);
      if(wall.holding)wall.drop(wallRay());
      else if(!wall.begin(wallRay()))wall.verify();
      e.preventDefault();return;
    }
    if (workshop?.interact() || signalStation?.interact() || processorLab?.interact()){e.preventDefault();return}
    if (!panel.isBattle() && scanner?.interact('open')) return;
    if(!travel()&&stage.locationId==='island.data-forge')forge.open(player.position);
    return;
  }
  if(['Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();
  if(e.code==='Space'&&!keys.Space)jumpRequested=true;
  keys[e.code]=true;
  if(/^Digit[1-6]$/.test(e.code)){
    if(panel.isBattle() && (workshop || bag.loadouts.battle.weapon) && e.code==='Digit1'){
      e.preventDefault();
      if(!e.repeat)battleStrike();
    }
    else if(panel.isBattle())notify('Боевые навыки пока недоступны.');
    else select(+e.code.slice(-1)-1);
  }
});
addEventListener('keyup',e=>{
  keys[e.code]=false;
  if((!modalOpen()||panel.storageOpen())&&$('#welcome').classList.contains('hidden'))panel.input.up(e);
  else panel.input.clear();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)scanner?.cancel()});
addEventListener('blur',()=>{processorLab?.wall.cancel();scanner?.cancel();resetBackPress();dragging=false;panel.input.clear();Object.keys(keys).forEach(k=>keys[k]=false);jumpRequested=false});
function act(button){
  if(panel.isBattle() && (workshop || bag.loadouts.battle.weapon) && button===0){battleStrike();return}
  if(panel.isBattle()){notify('Для строительства нажми L / Д или C + V.');return}
  if (button===0 && scanner?.interact('collect')) return;
  ray.setFromCamera(new THREE.Vector2(),camera);
  if(button===0 && bag.loadouts.build.tool==='wood-axe'){
    const hit=ray.intersectObjects(trunks,false)[0];
    if(hit && hit.point.distanceTo(player.position)<3.4){
      // A ghost or solid block directly in front of a tree still takes the click.
      const closer=ray.intersectObjects([...stage.ghosts.filter(m=>m.visible),...solids],false)[0];
      if(closer?.object===hit.object){
        if(performance.now()-lastChop<350 || !hasBagRoom(BUILD_MATERIALS[2].id))return;
        lastChop=performance.now();stage.inventory[2]++;gathering.chop();playPickup();character.react();
        if(workshop && !stage.repair.chopped){
          stage.repair.chopped=true;notify('Древесина +1. Можно ударить ещё раз по этому стволу.');
        }else notify('Древесина +1');
        update();return;
      }
    }
  }
  if(workshop && !stage.repair.axe)return;
  if(!stage.arches.length){if(stage.locationId==='island.data-forge'&&button===0&&forge.collect(ray,player.position))character.react();return}
  const {pickups,ghosts,placed,targets}=stage;
  const objects=[...pickups,...ghosts.filter(m=>m.visible),...placed];
  const hits=ray.intersectObjects(objects,false).filter(h=>h.object.position.distanceTo(player.position)<6);
  if(hits.length){
    const m=hits[0].object,pi=pickups.indexOf(m),gi=ghosts.indexOf(m);
    if(pi>=0&&button===0){if(!hasBagRoom(m.userData.objectId))return;stage.collected.add(m.userData.animationPhase);island.remove(m);onCollect(m);pickups.splice(pi,1);stage.inventory[m.userData.material]++;character.react();notify(`${MATERIAL_NAMES[m.userData.material]}: +1`);update();return}
    if(gi>=0&&button===0){
      const t=targets[gi];
      if(selected!==t.material){notify(`Для этой арки нужен материал «${MATERIAL_NAMES[t.material]}» — клавиша ${t.material+1}.`);return}
      if(!stage.inventory[selected]){notify(`Сначала собери материал «${MATERIAL_NAMES[selected]}».`);return}
      if(Math.abs(player.position.x-t.x)<.79&&Math.abs(player.position.z-t.z)<.79&&player.position.y<t.y+.49&&player.position.y+1.7>t.y-.49){notify('Отойди немного, чтобы поставить куб.');return}
      const wasUnlocked=stage.unlocked;
      if(!placeTarget(stage,gi,selected))return;character.react();
      m.visible=false;addBlock(t.x,t.y,t.z,selected,gi);playPlacement();update();
      if(stage.unlocked&&!wasUnlocked)notify(workshop?'Деревянная арка готова! Подойди к ней и нажми E.':stage.index===0?'✦ Портал открыт! Подойди к арке и нажми E.':'✦ Три арки готовы! Средняя арка открыла портал в кузницу — нажми E рядом с ней.');
      return;
    }
    if(button===2&&placed.includes(m)){
      const material=m.userData.target===undefined?m.userData.material:targets[m.userData.target].material;
      if(isLimited(stage,material)&&!hasBagRoom(BUILD_MATERIALS[material].id))return;
      if(m.userData.target!==undefined){removeTarget(stage,m.userData.target);ghosts[m.userData.target].visible=true}
      else if(isLimited(stage,m.userData.material))stage.inventory[m.userData.material]++;
      if(isLimited(stage,material))playPickup();
      island.remove(m);placed.splice(placed.indexOf(m),1);solids.splice(solids.indexOf(m),1);update();return;
    }
  }
  if(button!==0 || workshop)return;
  const point=new THREE.Vector3();
  if(!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),point)||point.distanceTo(player.position)>=6||Math.abs(point.x-stage.center)>=10||Math.abs(point.z)>=9)return;
  const x=Math.round(point.x),z=Math.round(point.z);
  if(stage.locationId==='island.three-arches'&&Math.abs(x-46)<2&&Math.abs(z-6)<2){notify('Оставь проход к порталу свободным.');return}
  if(stage.arches.some(a=>Math.abs(x-a.x)<=2&&Math.abs(z-a.z)<=1)){notify('Эта площадка оставлена для арки.');return}
  if(Math.hypot(x-player.position.x,z-player.position.z)<1)return;
  const column=placed.filter(m=>m.position.x===x&&m.position.z===z);if(column.length>=5)return;
  const y=.5+column.length;
  if(solids.some(m=>Math.abs(x-m.position.x)<.49+m.scale.x/2&&Math.abs(z-m.position.z)<.49+m.scale.z/2&&Math.abs(y-m.position.y)<.49+m.scale.y/2))return;
  if(isLimited(stage,selected)){if(!stage.inventory[selected]){notify('Сначала собери кубы выбранного материала.');return}stage.inventory[selected]--}
  addBlock(x,y,z,selected);playPlacement();update();
}
function restartWarning(){
  if(processorLab)return 'Код вернётся в исходное состояние. Портал закроется, а оружейный набор можно будет получить снова после ремонта.';
  if(workshop)return 'Черепаха снова попросит о помощи. Ремонт компьютера, подарок черепахи и деревянная арка будут сброшены.';
  if(signalStation && stage.sentWood)return 'Сигнал, постройки и собранные на острове материалы будут сброшены.';
  if(stage.locationId==='island.discovery-garden')return 'Вы вернётесь к началу сада. Врата кузницы останутся открыты.';
  if(stage.locationId==='island.data-forge'){
    if(forgeState.crafted || forgeState.bits || forgeState.slots.some(Boolean))
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
  if(workshop || signalStation || processorLab){
    if(workshop && bag.loadouts.build.tool==='wood-axe')bag.equip('build','tool','wand');
    stages[stage.index]=createStage(stage.index);
    goToIsland(stage.index,'Текущий остров начат заново.');return;
  }
  scanner?.cancel();
  gathering.clear();
  if(stage.locationId==='island.data-forge')forge.reset();
  for(const block of stage.placed){
    island.remove(block);
    const index=solids.indexOf(block);
    if(index>=0)solids.splice(index,1);
  }
  stage.placed.length=0;
  stage.pickups.forEach(m=>island.remove(m));stage.pickups.length=0;stage.ghosts.forEach(m=>m.visible=true);
  stage.inventory.fill(0);stage.built.clear();stage.unlocked=false;stage.collected.clear();spawnPickups(stage);
  player.position.set(stage.center,0,stage.index===0?6:3);Object.assign(physics,createPhysicsState());jumpRequested=false;
  yaw=0;pitch=.23;select(0);update();announceLocation('Текущий остров начат заново.');
};
enterIsland(stages[0]);
refreshMission();
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
let followState = createFollowState();
function frame(now){
requestAnimationFrame(frame);
const dt=Math.min((now-last)/1000,.04);last=now;
const active=$('#welcome').classList.contains('hidden')&&!modalOpen();
const previousX=player.position.x,previousZ=player.position.z;
if(active && !workshop?.presenting()){
  const forward=Number(!!keys.KeyW)-Number(!!keys.KeyS),right=Number(!!keys.KeyD)-Number(!!keys.KeyA);
  let vx=-Math.sin(yaw)*forward+Math.cos(yaw)*right;
  let vz=-Math.cos(yaw)*forward-Math.sin(yaw)*right;
  const length=Math.hypot(vx,vz);
  if(length){vx=vx/length*4;vz=vz/length*4}
  const shove=workshop?.shoveVelocity(dt);
  movePlayer(player.position,physics,{dt,vx:shove?.vx??vx,vz:shove?.vz??vz,jump:jumpRequested,limits:{x:[stage.center-10,stage.center+10],z:[-9,9]}},solids);
}
jumpRequested=false;
player.rotation.y=yaw;
character.animate(dt,{dx:player.position.x-previousX,dz:player.position.z-previousZ,yaw,grounded:physics.grounded,velocity:physics.velocity,time:now/1000});
const eye = player.position.clone().add(new THREE.Vector3(0,1.5,0));
const look = new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
player.visible = third && followCamera(camera, eye, look,
  [...solids, ...cameraObstacles], followState, dt);
if (!third) {
  camera.position.copy(eye);
  camera.lookAt(eye.clone().add(look));
}
stage.pickups.forEach(m=>{const phase=m.userData.animationPhase;m.rotation.y=now*.0008+phase;m.position.y=.65+Math.sin(now*.002+phase)*.12});
const showingGift=workshop?.presenting() && !customizer.isOpen();
workshop?.tick(dt,active,reducedHandMotion.matches);
if(showingGift){workshop.frameGift();player.visible=false}
signalStation?.tick(dt,active,reducedHandMotion.matches);
processorLab?.tick(active,dt,reducedHandMotion.matches);
scanner?.update(now,active && !document.hidden && !third && !panel.isBattle(),reducedHandMotion.matches);
panel.updatePortal(nearbyRoute(),active&&!document.hidden,now);
simpleArchEffect?.update(now, reducedHandMotion.matches);
if (returnGlow) returnGlow.material.opacity=.4+Math.sin(now*.002)*.12;
forge?.update(player.position,now/1000,$('#welcome').classList.contains('hidden')&&!skillList.open&&!scanDialog.open&&!extraDialog?.open&&!restartDialog.open&&!customizer.isOpen()&&!panel.isOpen());
panel.update(dt,now/1000,active);
const combatWand=panel.isBattle() && bag.loadouts.battle.weapon==='wand';
const nearbyWall=worldWall();
if(processorLab){
  if(!nearbyWall)processorLab.wall.cancel();
  camera.updateMatrixWorld();
  wallCaster.setFromCamera(centerAim,camera);
  processorLab.wall.showSample(!!nearbyWall && (nearbyWall.holding || nearbyWall.facesBoard(wallCaster.ray)));
}
const heldTool=nearbyWall?'wand':panel.isBattle()?bag.loadouts.battle.weapon:bag.loadouts.build.tool;
gathering.update(dt,now/1000,{active,third:player.visible,combatWand,visible:!showingGift&&!!heldTool,tool:heldTool,dx:player.position.x-previousX,dz:player.position.z-previousZ,yaw,pitch,grounded:physics.grounded,reducedMotion:reducedHandMotion.matches});
if(nearbyWall?.holding)nearbyWall.move(wallRay(),gathering.tipPosition());
if(!customizer.isOpen()){renderer.render(scene,camera);gathering.render()}customizer.render(dt,now/1000)}requestAnimationFrame(frame);

// Temporary cheats: remove this installation and its import to disable the menu.
extraDialog = installCheatMenu({
  locations: LOCATIONS, currentIsland: () => stage.index, getScanner: () => scanner, account: playerAccount, bag,
  canOpen: () => $('#welcome').classList.contains('hidden') && !modalOpen(),
  pause() {
    document.exitPointerLock?.();
    Object.keys(keys).forEach(key => { keys[key] = false; });
    panel.input.clear();
    dragging = jumpRequested = false;
  },
  travel: index => goToIsland(index, LOCATIONS[index].name),
  resetScanLimits: () => scanStore.change(resetDailyFindings),
  async reset() {
    await scanStore.change(save => {save.coins=0});
    if(bag.loadouts.build.tool==='wood-axe')bag.equip('build','tool','wand');
    stages = LOCATIONS.map((_, index) => createStage(index));
    Object.assign(forgeState, createForgeState());
    playerAccount.coins = 0;
    goToIsland(0, 'Прогресс всех островов сброшен.');
  },
});
