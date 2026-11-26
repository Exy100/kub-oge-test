import * as THREE from './vendor/three.module.js';

import {createWoodcuttingAxe} from './world/woodcutting-axe.js';

import { createPulseStaff, createStaffCycle } from './world/pulse-staff.js?v=4';
import { createTwinVein } from './world/twin-vein.js?v=2';
import { STAFF_ID, STAFF_ATTACK } from './catalog/pulse-staff.js?v=2';

// Original concept 8: ceramic tuning fork, sage grip, brass terminals.
export function createGatheringWand(){
  const root=new THREE.Group();root.name='gathering-wand-8';root.userData.objectId='wand';const geometries=[],materials=[];
  const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.45,...extra});materials.push(m);return m};
  const ivory=mat(0xf0e6cd),bronze=mat(0xb29560,{metalness:.7,roughness:.3}),leather=mat(0x667957,{roughness:.9}),dark=mat(0x37473d),gold=mat(0xffd27a,{emissive:0xffad35,emissiveIntensity:.4});
  function mesh(name,g,m,x=0,y=0,z=0){geometries.push(g);const o=new THREE.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=true;root.add(o);return o}
  function cylinder(name,y,r,h,m,r2=r){return mesh(name,new THREE.CylinderGeometry(r,r2,h,24),m,0,y)}
  cylinder('sage-grip',-.045,.037,.31,leather,.039);
  cylinder('ceramic-spine',.19,.029,.18,ivory);
  cylinder('pommel',-.215,.044,.045,bronze,.036);
  cylinder('pommel-inlay',-.222,.036,.009,dark);
  for(const y of [-.185,.11,.14,.265]){cylinder('machined-collar',y,.043,.018,bronze);cylinder('collar-edge',y+.012,.044,.006,ivory)}
  const wrap=[];for(let i=0;i<=180;i++){const t=i/180;wrap.push(new THREE.Vector3(Math.cos(t*Math.PI*14)*.038,-.18+t*.27,Math.sin(t*Math.PI*14)*.038))}
  mesh('spiral-grip-stitch',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wrap),180,.0025,5,false),bronze);
  cylinder('fork-neck',.295,.045,.055,ivory,.032);
  mesh('fork-junction',new THREE.SphereGeometry(.047,24,16),ivory,0,.305,0);
  for(const side of [-1,1]){
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.29,0),new THREE.Vector3(side*.11,.37,0),new THREE.Vector3(side*.185,.49,0),new THREE.Vector3(side*.145,.65,0)]);
    mesh('ceramic-fork',new THREE.TubeGeometry(curve,28,.035,12,false),ivory);
    const trim=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.025,.315,.028),new THREE.Vector3(side*.12,.385,.028),new THREE.Vector3(side*.18,.49,.028),new THREE.Vector3(side*.146,.62,.028)]);
    mesh('fork-brass-seam',new THREE.TubeGeometry(trim,28,.004,6,false),bronze);
    mesh('terminal-cup',new THREE.SphereGeometry(.042,24,16),bronze,side*.145,.65,0);
    mesh('amber-terminal',new THREE.SphereGeometry(.028,20,12),gold,side*.145,.659,-.023);
    for(const y of [.36,.39])mesh('fork-fastener',new THREE.SphereGeometry(.009,10,8),bronze,side*(y===.36?.075:.12),y,-.032);
  }
  const bezel=mesh('power-bezel',new THREE.CylinderGeometry(.057,.057,.027,32),bronze,0,.245,-.026);bezel.rotation.x=Math.PI/2;
  const inset=mesh('power-recess',new THREE.CylinderGeometry(.044,.044,.009,32),dark,0,.245,-.044);inset.rotation.x=Math.PI/2;
  mesh('amber-status-lens',new THREE.SphereGeometry(1,24,16),gold,0,.245,-.052).scale.set(.029,.029,.009);
  for(let i=0;i<3;i++){const notch=mesh('shaft-engraving',new THREE.BoxGeometry(.012,.002,.004),bronze,0,.17+i*.018,-.03);notch.rotation.z=.35}
  const energyGeometry=new THREE.BufferGeometry();const vertices=new Float32Array(25*3);energyGeometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));geometries.push(energyGeometry);
  const energyMaterial=new THREE.LineBasicMaterial({color:0xffd98e,transparent:true,opacity:.35});materials.push(energyMaterial);const energy=new THREE.Line(energyGeometry,energyMaterial);energy.name='capture-arc';root.add(energy);
  const tip=new THREE.Object3D();tip.name='capture-tip';tip.position.set(0,.65,0);root.add(tip);
  const idleArcColor = energyMaterial.color.clone();
  const chargedArcColor = new THREE.Color(0x90b8e5);
  const haloGeometry = new THREE.TorusGeometry(.07, .0038, 6, 40);
  const haloBase = new THREE.Color(0x426da7);
  const haloHighlight = new THREE.Color(0x99c3e9);
  const shade = new THREE.Color();
  const uv = haloGeometry.getAttribute('uv');
  const shades = new Float32Array(uv.count * 3);
  // Bake a single soft glint around the loop; its motion only rotates the mesh.
  for (let i = 0; i < uv.count; i++) {
    const angle = uv.getX(i) * Math.PI * 2;
    const glint = Math.max(0, Math.cos(angle - Math.PI / 4)) ** 2;
    shade.lerpColors(haloBase, haloHighlight, glint).toArray(shades, i * 3);
  }
  haloGeometry.setAttribute('color', new THREE.BufferAttribute(shades, 3));
  const haloMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  materials.push(haloMaterial);
  const halo = mesh('capture-halo', haloGeometry, haloMaterial, 0, .65, 0);
  halo.rotation.x = Math.PI / 2;
  halo.castShadow = false;
  halo.visible = false;
  function animate(time,power=0){
    gold.emissiveIntensity=.35+power*2;energyMaterial.opacity=.22+power*.78;
    energyMaterial.color.lerpColors(idleArcColor, chargedArcColor, power);
    for(let i=0;i<25;i++){const t=i/24;vertices[i*3]=-.145+t*.29;vertices[i*3+1]=.659+Math.sin(t*Math.PI)*(.012+power*.018)*Math.sin(time*24+t*10);vertices[i*3+2]=-.023}
    energyGeometry.attributes.position.needsUpdate=true;energyGeometry.computeBoundingSphere();halo.visible=power>.03;halo.scale.setScalar(.6+power*1.8);halo.rotation.z=power*.85;
  }
  animate(0);
  return {root,tip,animate,dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}};
}

// Motion follows travelled distance, so pushing into a wall settles the hand.
export function createHandMotion(){
  let phase=0,weight=0,clock=0,lagX=0,lagY=0,lastYaw,lastPitch;
  return ({dt=0,dx=0,dz=0,yaw=0,pitch=0,grounded=true,active=true,reducedMotion=false}={})=>{
    const yawDelta=lastYaw===undefined?0:Math.atan2(Math.sin(yaw-lastYaw),Math.cos(yaw-lastYaw));
    const pitchDelta=lastPitch===undefined?0:pitch-lastPitch;lastYaw=yaw;lastPitch=pitch;
    if(active){const step=Math.max(0,dt),distance=Math.hypot(dx,dz),blend=1-Math.exp(-12*step);clock+=step;
      phase+=grounded?distance*7.5:0;weight+=(Math.min(distance/Math.max(step,.001)/4,1)*(grounded?1:0)-weight)*blend;
      lagX+=(THREE.MathUtils.clamp(yawDelta/Math.max(step,.001)*.003,-.025,.025)-lagX)*blend;
      lagY+=(THREE.MathUtils.clamp(pitchDelta/Math.max(step,.001)*.003,-.02,.02)-lagY)*blend;
    }
    return reducedMotion?{x:0,y:0,z:0,roll:0}:{x:Math.sin(phase)*.009*weight+lagX,y:Math.cos(phase*2)*.006*weight+Math.sin(clock*1.6)*.0025+lagY,z:Math.sin(phase)*.004*weight,roll:Math.sin(phase)*.022*weight};
  };
}

export function equipGatheringWand({character,camera,scene,renderer}){
  const body=character.root.getObjectByName('body');
  const shoulder=body.children.find(p=>p.name==='shoulder'&&p.position.x>0),elbow=shoulder.getObjectByName('elbow');
  const wand=createGatheringWand();wand.root.position.set(0,-.235,-.075);wand.root.rotation.x=-.85;wand.root.rotation.z=-.15;elbow.add(wand.root);
  const viewScene=new THREE.Scene(),viewCamera=new THREE.PerspectiveCamera(55,camera.aspect,.01,5),viewRig=new THREE.Group();viewScene.add(viewRig);
  viewScene.add(new THREE.HemisphereLight(0xfff7e4,0x657b72,2.4));const light=new THREE.DirectionalLight(0xffe9c3,2.5);light.position.set(-1,3,2);viewScene.add(light);
  const viewWand=createGatheringWand();viewRig.add(viewWand.root);viewWand.root.rotation.y=Math.PI;viewRig.position.set(.28,-.1,-.83);viewRig.scale.setScalar(.42);viewRig.rotation.set(-.2,.12,.16);
  const staffCycle=createStaffCycle();
  let staff,staffGrip,viewStaff,viewTip,bolt;
  const cast={draw:0,extend:0,recoil:0};
  const muzzle=new THREE.Vector3();
  function equipStaff(){
    staff=createPulseStaff();
    viewStaff=staff.root.clone();
    viewTip=viewStaff.getObjectByName('pulse-tip');
    viewRig.add(viewStaff);
    // Hold the longer grip below its midpoint, with the pommel clear of the dock.
    const gripOffset=.080;
    viewStaff.translateY(gripOffset);
    staffGrip=new THREE.Group();
    staffGrip.position.copy(wand.root.position);
    staffGrip.rotation.copy(wand.root.rotation);
    staff.root.position.y=gripOffset;
    staffGrip.add(staff.root);
    elbow.add(staffGrip);
    bolt=createTwinVein(scene);
  }
  function muzzlePosition(){
    if(firstPerson){
      viewTip.getWorldPosition(muzzle);
      camera.localToWorld(muzzle);
    }else staff.tip.getWorldPosition(muzzle);
    return muzzle;
  }
  let axe,viewAxe;
  function equipAxe(){
    axe=createWoodcuttingAxe();axe.position.copy(wand.root.position);axe.rotation.copy(wand.root.rotation);elbow.add(axe);
    viewAxe=axe.clone();viewAxe.position.set(0,0,0);viewAxe.rotation.set(0,Math.PI,0);viewRig.add(viewAxe);
  }
  const handGeometry=new THREE.SphereGeometry(1,16,12),armGeometry=new THREE.CylinderGeometry(.82,1,1,20),skin=new THREE.MeshStandardMaterial({color:0xe2b58a,roughness:.85}),cuffMaterial=new THREE.MeshStandardMaterial({color:0xdbdfcb,roughness:.85}),glove=new THREE.MeshStandardMaterial({color:0x78694d,roughness:.9}),jacket=new THREE.MeshStandardMaterial({color:0x78a09a,roughness:.85});
  const palm=new THREE.Mesh(handGeometry,glove);palm.scale.set(.09,.065,.07);palm.position.set(.025,-.025,.015);viewRig.add(palm);
  // Shoulder and elbow stay outside the right edge. The forearm bridges to the wrist,
  // instead of ending as a floating sleeve directly above the HUD.
  const armRoot=new THREE.Group();armRoot.name='first-person-arm';viewScene.add(armRoot);
  function armPart(name,material){const part=new THREE.Mesh(armGeometry,material);part.name=name;armRoot.add(part);return part}
  const upper=armPart('upper-sleeve',jacket),lower=armPart('forearm-sleeve',jacket),cuff=armPart('wrist-cuff',cuffMaterial),forearm=armPart('forearm-skin',skin);
  const elbowCap=new THREE.Mesh(handGeometry,jacket);elbowCap.scale.setScalar(.054);armRoot.add(elbowCap);
  const origin=new THREE.Vector3(),bend=new THREE.Vector3(),wrist=new THREE.Vector3(),seam=new THREE.Vector3(),cuffEnd=new THREE.Vector3(),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  function link(mesh,a,b,radius){mesh.position.copy(a).lerp(b,.5);direction.subVectors(b,a);mesh.scale.set(radius,direction.length(),radius);mesh.quaternion.setFromUnitVectors(up,direction.normalize())}
  const handMotion=createHandMotion();let armClock=0;
  // Times in seconds. The forearm leads the diagonal cut, the wrist follows
  // through a little later. Both cameras sample the same clock.
  const contactTime=.27, strikeDuration=.64;
  let strikeTime=strikeDuration,contact=null;
  const smooth=THREE.MathUtils.smoothstep;
  function poseArm(motion,power,wind=0,cut=0,wristCut=0){
    const narrow=Math.min(1,camera.aspect/1.42),size=.42*Math.max(.6,Math.min(1,camera.aspect/1.1));
    viewRig.scale.setScalar(size);viewRig.position.set(.28*narrow+motion.x,-.1+motion.y+power*.025,-.83+motion.z-power*.055);
    viewRig.rotation.set(-.2-power*.13,.12,.16+motion.roll-power*.035);
    viewRig.position.x+=narrow*(.075*wind-.25*cut);
    viewRig.position.y+=.075*wind-.045*cut;
    viewRig.position.z+=.065*wind-.13*cut;
    viewRig.rotation.x+=.36*wind-.76*wristCut;
    viewRig.rotation.z+=-.48*wind+.96*wristCut;
    viewRig.rotation.y+=.34*wind-.3*cut;
    // Rotate the glove and the staff together around the wrist. Solve the sleeve
    // links after moving the wrist so they stay connected through the recoil.
    viewRig.position.x+=narrow*(.034*cast.draw-.040*cast.extend+.013*cast.recoil);
    viewRig.position.y+=.026*cast.draw+.046*cast.extend+.018*cast.recoil;
    viewRig.position.z+=.055*cast.draw-.135*cast.extend+.055*cast.recoil;
    viewRig.rotation.x+=.20*cast.draw-.77*cast.extend+.21*cast.recoil;
    viewRig.rotation.z+=-.19*cast.draw+.16*cast.extend-.08*cast.recoil;
    viewRig.updateMatrixWorld(true);wrist.set(.05,-.065,.09);viewRig.localToWorld(wrist);
    origin.set(.72*Math.max(.5,narrow),-.38,-.04);bend.set(.58*Math.max(.5,narrow),-.25,-.34);
    bend.x+=narrow*(.035*wind-.15*cut);bend.y+=.055*wind-.015*cut;
    bend.x+=narrow*(.023*cast.draw-.07*cast.extend);
    bend.z+=.025*cast.draw-.074*cast.extend+.023*cast.recoil;
    seam.copy(bend).lerp(wrist,.64);cuffEnd.copy(bend).lerp(wrist,.73);
    link(upper,origin,bend,.075);link(lower,bend,seam,.05);link(cuff,seam,cuffEnd,.048);link(forearm,cuffEnd,wrist,.033);
    elbowCap.position.copy(bend);
  }
  poseArm({x:0,y:0,z:0,roll:0},0);
  for(let i=0;i<3;i++){const finger=new THREE.Mesh(handGeometry,glove);finger.scale.set(.025,.025,.055);finger.position.set(-.035,-.065+i*.035,-.014);viewRig.add(finger)}
  const flights=[];const endpoint=new THREE.Vector3();let elapsed=1,enabled=true,firstPerson=false;
  function destination(){if(firstPerson){viewScene.updateMatrixWorld(true);viewWand.tip.getWorldPosition(endpoint);camera.updateMatrixWorld(true);camera.localToWorld(endpoint)}else{character.root.updateMatrixWorld(true);wand.tip.getWorldPosition(endpoint)}return endpoint}
  function clear(){staffCycle.clear();bolt?.clear();strikeTime=strikeDuration;contact=null;for(const f of flights)scene.remove(f.mesh);flights.length=0;elapsed=1}
  return {wand,viewWand,viewScene,tipPosition:destination,
    fire(aim){
      let shot;
      return staffCycle.start(()=>{
        shot=aim();
        bolt.launch(muzzlePosition(),shot.end);
      },()=>bolt.impact(shot.hit()));
    },
    strike(onContact){
      if(strikeTime<strikeDuration)return;
      strikeTime=0;contact=onContact;
    },
    chop(){elapsed=0},
    collect(mesh){elapsed=0;const start=mesh.position.clone(),scale=mesh.scale.clone();scene.add(mesh);flights.push({mesh,start,scale,age:0});if(flights.length>24)scene.remove(flights.shift().mesh)},
    update(dt,time,{active,third,visible=true,combatWand=false,tool='wand',dx=0,dz=0,yaw=0,pitch=0,grounded=true,reducedMotion=false}){
      firstPerson=!third;enabled=visible;
      const chopping=visible && tool==='wood-axe';
      const ranged=visible && tool===STAFF_ID;
      if(ranged && !staff)equipStaff();
      const fill=staffCycle.update(active?dt:0,ranged);
      if(staff)staff.root.visible=viewStaff.visible=ranged;
      // The hand draws back, drives through release, then settles on the target.
      // Both rigs sample the attack clock, including across pauses and camera switches.
      const t=staffCycle.elapsed,release=STAFF_ATTACK.windup,hit=STAFF_ATTACK.impact;
      const amplitude=ranged?(reducedMotion?.28:1):0;
      cast.draw=amplitude*(smooth(t,0,release*.54)-smooth(t,release*.54,release));
      cast.extend=amplitude*(smooth(t,release*.54,release+.025)-smooth(t,hit+.04,hit+.56));
      cast.recoil=amplitude*(smooth(t,release+.015,release+.09)-smooth(t,release+.09,hit));
      if(chopping && !axe)equipAxe();
      wand.root.visible=viewWand.root.visible=visible && !chopping && !ranged;
      if(axe)axe.visible=viewAxe.visible=chopping;
      if(active)elapsed=Math.min(1,elapsed+Math.max(0,dt));const power=combatWand || ranged?0:Math.sin(Math.PI*elapsed);
      if(!combatWand || !visible){strikeTime=strikeDuration;contact=null}
      if(active && strikeTime<strikeDuration){
        strikeTime=Math.min(strikeDuration,strikeTime+Math.max(0,dt));
        if(contact && strikeTime>=contactTime){const apply=contact;contact=null;apply()}
      }
      let wind=0,cut=0,wristCut=0;
      if(strikeTime<strikeDuration){
        const t=strikeTime,amplitude=reducedMotion?.32:1;
        wind=(smooth(t,0,.15)-smooth(t,.15,contactTime))*amplitude;
        cut=(smooth(t,.15,.31)-smooth(t,.36,strikeDuration))*amplitude;
        wristCut=(smooth(t,.18,.34)-smooth(t,.39,strikeDuration))*amplitude;
      }
      if(visible){shoulder.rotation.x=THREE.MathUtils.lerp(shoulder.rotation.x,.25+power*.6,.85);elbow.rotation.x=.4+power*.2;wand.root.rotation.x=-.85-power*.7}
      wand.root.rotation.z=-.15;
      if(combatWand && visible){
        body.rotation.y+=.22*wind-.34*cut;
        shoulder.rotation.x+=-.09*wind+1.03*cut;
        shoulder.rotation.y+=-.8*wind+.24*cut;
        shoulder.rotation.z+=.76*wind-.76*cut;
        elbow.rotation.x+=.62*wind-.54*cut;
        wand.root.rotation.x-=.20*wind+1.83*wristCut;
        wand.root.rotation.z+=-.73*wind+.24*wristCut;
      }
      if(ranged){
        // The view rig already follows camera pitch. Aim the world rig from the shoulder.
        const aimPitch=THREE.MathUtils.clamp(pitch,-1.1,1.1)*cast.extend;
        body.rotation.y+=-.13*cast.draw+.21*cast.extend-.055*cast.recoil;
        shoulder.rotation.x+=-.31*cast.draw+1.02*cast.extend-.17*cast.recoil-.32*aimPitch;
        shoulder.rotation.z+=.17*cast.draw-.12*cast.extend;
        elbow.rotation.x+=.64*cast.draw-.27*cast.extend+.25*cast.recoil;
        staffGrip.rotation.x=-.85-.16*cast.draw-1.63*cast.extend+.22*cast.recoil-.64*aimPitch;
        staffGrip.rotation.z=-.15-.16*cast.draw+.13*cast.extend;
      }
      if(chopping){
        const swing=reducedMotion?0:Math.sin(Math.PI*Math.min(1,elapsed*2.6));
        axe.rotation.x=-.85-swing*.9;viewAxe.rotation.x=-swing*.82;
      }
      if(active)armClock+=Math.max(0,dt);
      poseArm(handMotion({dt,dx,dz,yaw,pitch,grounded,active,reducedMotion}),power,wind,cut,wristCut);
      if(staff){
        if(ranged)staff.setFill(fill,reducedMotion?0:armClock);
        if(staffCycle.elapsed<STAFF_ATTACK.effectEnd){
          bolt.update(staffCycle.elapsed,camera,reducedMotion,ranged?muzzlePosition():null);
        }else bolt.clear();
      }
      wand.animate(time,power);viewWand.animate(armClock,power);
      const target=destination();
      for(let i=flights.length-1;i>=0;i--){const f=flights[i];if(active)f.age+=Math.max(0,dt);const t=Math.min(1,f.age),travel=t*t*(3-2*t);f.mesh.position.lerpVectors(f.start,target,travel);f.mesh.position.y+=Math.sin(t*Math.PI)*.22;f.mesh.scale.copy(f.scale).multiplyScalar(1-.98*travel);f.mesh.rotation.y+=active?dt*3:0;if(t===1){scene.remove(f.mesh);flights.splice(i,1)}}
    },
    render(){if(!firstPerson||!enabled)return;viewCamera.aspect=camera.aspect;viewCamera.updateProjectionMatrix();const auto=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(viewScene,viewCamera);renderer.autoClear=auto},
    clear,
    dispose(){clear();if(staff){
      staffGrip.removeFromParent();viewStaff.removeFromParent();staff.dispose();
      bolt.dispose();
    }if(axe){axe.removeFromParent();viewAxe.removeFromParent();axe.geometry.dispose();axe.material.dispose()}elbow.remove(wand.root);wand.dispose();viewWand.dispose();handGeometry.dispose();armGeometry.dispose();skin.dispose();cuffMaterial.dispose();glove.dispose();jacket.dispose()},
  };
}
