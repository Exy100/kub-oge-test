import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from '../vendor/three.module.js';import {createGatheringWand,equipGatheringWand} from '../gathering-wand.js';import {createCharacter} from '../character.js';
test('wand has detailed fork, grip and finite geometry',()=>{const w=createGatheringWand();assert(w.root.children.length>25);assert(w.root.getObjectByName('spiral-grip-stitch'));assert(w.root.getObjectByName('amber-terminal'));const b=new THREE.Box3().setFromObject(w.root);assert(b.min.toArray().concat(b.max.toArray()).every(Number.isFinite));assert(b.max.y<.8);for(const power of [0,.5,1])w.animate(2,power);w.dispose()});
test('right hand attachment and one-second resource flight survive camera switch and reset',()=>{const c=createCharacter(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.1,100);scene.add(c.root);const g=equipGatheringWand({character:c,camera,scene,renderer:{}});assert(g.wand.root.parent.parent.position.x>0);const cube=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());cube.position.set(2,.5,-2);g.collect(cube);g.update(.5,.5,{active:true,third:true});assert(cube.position.x<2);assert(cube.scale.x<1);g.update(.3,.8,{active:false,third:false});assert(scene.children.includes(cube),'modal pauses flight');g.update(.5,1,{active:true,third:false});assert(!scene.children.includes(cube),'flight ends at one second');g.collect(cube);g.clear();assert(!scene.children.includes(cube));g.dispose();c.dispose();cube.geometry.dispose();cube.material.dispose()});
test('first-person motion follows actual travel, settles against walls and pauses with menus',async()=>{
 const {createHandMotion}=await import('../gathering-wand.js');const move=createHandMotion(),rest=createHandMotion();let moving,idle;
 for(let i=0;i<60;i++){moving=move({dt:1/60,dz:-4/60});idle=rest({dt:1/60})}
 assert(Math.abs(moving.x-idle.x)>.002,'walking sway is distinct from idle breathing');
 let paused=move({active:false,yaw:1,pitch:.3});assert.deepEqual(move({dt:1,active:false,yaw:2}),paused,'menus freeze motion');
 let stopped;for(let i=0;i<120;i++)stopped=move({dt:1/60});assert(Math.abs(stopped.x)<.00001,'no walking bob without actual movement');
 assert.deepEqual(move({dt:.1,dx:.4,reducedMotion:true}),{x:0,y:0,z:0,roll:0});
 const turn=createHandMotion();turn({dt:.016,yaw:Math.PI-.01});const wrapped=turn({dt:.016,yaw:-Math.PI+.01});assert(Math.abs(wrapped.x)<.01,'yaw wrap does not kick the hand');const right=createHandMotion();right({dt:.016,yaw:0});assert(right({dt:.016,yaw:-.2}).x<0,'hand lags to the left when turning right');
});

test('a wand cut winds up, crosses the body once and recovers in both cameras',()=>{
  const character=createCharacter(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  const tool=equipGatheringWand({character,scene,camera,renderer:{}});
  const tip=new THREE.Vector3();
  let time=0,hits=0;
  function sample(dt,third,active=true,combatWand=true){
    time+=dt;
    character.animate(dt,{time});
    tool.update(dt,time,{active,third,combatWand});
    return [tool.viewWand,tool.wand].map(model=>model.tip.getWorldPosition(tip).clone());
  }
  const ready=sample(0,true);
  tool.strike(()=>hits++);
  const wind=sample(.15,true);
  assert.deepEqual(sample(.2,false,false)[0],wind[0]);
  tool.strike(()=>hits+=100);
  const contact=sample(.16,false);
  assert.equal(hits,1);
  for(let i=0;i<2;i++){
    assert.ok(wind[i].x>ready[i].x);
    assert.ok(contact[i].x<wind[i].x-.15);
  }
  sample(.4,true);
  tool.strike(()=>hits++);sample(.12,false);sample(.05,true,true,false);sample(.6,true);
  assert.equal(hits,1,'switching out of combat cancels a pending hit');
  tool.dispose();character.dispose();
});

test('the staff draws back, extends and recoils on the firing clock in both camera rigs',()=>{
  const character=createCharacter(),scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(55,390/844,.1,100);
  scene.add(character.root);
  const rig=equipGatheringWand({character,scene,camera,renderer:{}});
  const target=new THREE.Vector3(0,1,-5);
  let launches=0,hits=0;
  function fire(){
    return rig.fire(()=>{launches++;return {end:target,hit(){hits++;return target}}});
  }
  function frame(dt,{third=false,active=true,reducedMotion=false,pitch=0}={}){
    character.animate(0,{time:1});
    rig.update(dt,1,{active,third,reducedMotion,pitch,tool:'weapon.pulse-staff'});
    return [rig.viewScene,character.root].map(root=>root.getObjectByName('pulse-tip')
      .getWorldPosition(new THREE.Vector3()));
  }
  function checkOrigin(tip){
    const pos=scene.getObjectByName('staff-double-vein').geometry.attributes.position;
    const centre=new THREE.Vector3().fromBufferAttribute(pos,0)
      .lerp(new THREE.Vector3().fromBufferAttribute(pos,1),.5);
    assert.ok(centre.distanceTo(tip)<1e-5,'both strands start at the moving crystal');
  }
  try{
    const rest=frame(0);
    assert.ok(fire());
    const draw=frame(.09);
    for(let i=0;i<2;i++)assert.ok(draw[i].z>rest[i].z+.05);
    assert.deepEqual(frame(.5,{third:true,active:false}),draw);
    assert.equal(launches,0);
    const release=frame(.09,{third:true});
    checkOrigin(release[1]);
    assert.deepEqual([launches,hits],[1,0]);
    const recoil=frame(.08);
    checkOrigin(recoil[0]);
    assert.equal(fire(),false);
    const contact=frame(.17);
    for(let i=0;i<2;i++){
      assert.ok(release[i].z<rest[i].z-.16);
      assert.ok(recoil[i].y>release[i].y+.014);
      assert.ok(contact[i].z<recoil[i].z);
    }
    assert.deepEqual([launches,hits],[1,1]);
    for(const tip of [rest[0],draw[0],release[0],recoil[0],contact[0]]){
      const screen=tip.clone().project(camera);
      assert.ok(Math.abs(screen.x)<1 && Math.abs(screen.y)<1,'sapphire stays on the portrait screen');
    }
    const recovered=frame(1.4);
    for(let i=0;i<2;i++)assert.ok(recovered[i].distanceTo(rest[i])<.005);
    assert.ok(fire());
    const gentle=frame(.18,{reducedMotion:true});
    for(let i=0;i<2;i++)assert.ok(gentle[i].distanceTo(rest[i])<release[i].distanceTo(rest[i])*.5);
    const up=frame(0,{pitch:-.65}),down=frame(0,{pitch:.65});
    assert.ok(up[1].y>down[1].y+.15,'avatar points higher when aiming up');
  }finally{rig.dispose();character.dispose()}
});
