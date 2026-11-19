import * as THREE from './vendor/three.module.js';

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
  const halo=mesh('capture-halo',new THREE.TorusGeometry(.07,.003,6,40),gold,0,.65,0);halo.rotation.x=Math.PI/2;halo.visible=false;
  function animate(time,power=0){
    gold.emissiveIntensity=.35+power*2;energyMaterial.opacity=.22+power*.78;
    for(let i=0;i<25;i++){const t=i/24;vertices[i*3]=-.145+t*.29;vertices[i*3+1]=.659+Math.sin(t*Math.PI)*(.012+power*.018)*Math.sin(time*24+t*10);vertices[i*3+2]=-.023}
    energyGeometry.attributes.position.needsUpdate=true;energyGeometry.computeBoundingSphere();halo.visible=power>.03;halo.scale.setScalar(.6+power*1.8);halo.rotation.z=time*4;
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
  function poseArm(motion,power){
    const narrow=Math.min(1,camera.aspect/1.42),size=.42*Math.max(.6,Math.min(1,camera.aspect/1.1));
    viewRig.scale.setScalar(size);viewRig.position.set(.28*narrow+motion.x,-.1+motion.y+power*.025,-.83+motion.z-power*.055);
    viewRig.rotation.set(-.2-power*.13,.12,.16+motion.roll-power*.035);
    viewRig.updateMatrixWorld(true);wrist.set(.05,-.065,.09);viewRig.localToWorld(wrist);
    origin.set(.72*Math.max(.5,narrow),-.38,-.04);bend.set(.58*Math.max(.5,narrow),-.25,-.34);
    seam.copy(bend).lerp(wrist,.64);cuffEnd.copy(bend).lerp(wrist,.73);
    link(upper,origin,bend,.075);link(lower,bend,seam,.05);link(cuff,seam,cuffEnd,.048);link(forearm,cuffEnd,wrist,.033);
    elbowCap.position.copy(bend);
  }
  poseArm({x:0,y:0,z:0,roll:0},0);
  for(let i=0;i<3;i++){const finger=new THREE.Mesh(handGeometry,glove);finger.scale.set(.025,.025,.055);finger.position.set(-.035,-.065+i*.035,-.014);viewRig.add(finger)}
  const flights=[];const endpoint=new THREE.Vector3();let elapsed=1,enabled=true,firstPerson=false;
  function destination(){if(firstPerson){viewScene.updateMatrixWorld(true);viewWand.tip.getWorldPosition(endpoint);camera.updateMatrixWorld(true);camera.localToWorld(endpoint)}else{character.root.updateMatrixWorld(true);wand.tip.getWorldPosition(endpoint)}return endpoint}
  function clear(){for(const f of flights)scene.remove(f.mesh);flights.length=0;elapsed=1}
  return {wand,viewWand,viewScene,
    collect(mesh){elapsed=0;const start=mesh.position.clone(),scale=mesh.scale.clone();scene.add(mesh);flights.push({mesh,start,scale,age:0});if(flights.length>24)scene.remove(flights.shift().mesh)},
    update(dt,time,{active,third,visible=true,dx=0,dz=0,yaw=0,pitch=0,grounded=true,reducedMotion=false}){
      firstPerson=!third;enabled=visible;wand.root.visible=visible;
      if(active)elapsed=Math.min(1,elapsed+Math.max(0,dt));const power=Math.sin(Math.PI*elapsed);
      if(visible){shoulder.rotation.x=THREE.MathUtils.lerp(shoulder.rotation.x,.25+power*.6,.85);elbow.rotation.x=.4+power*.2;wand.root.rotation.x=-.85-power*.7}
      if(active)armClock+=Math.max(0,dt);
      poseArm(handMotion({dt,dx,dz,yaw,pitch,grounded,active,reducedMotion}),power);
      wand.animate(time,power);viewWand.animate(armClock,power);
      const target=destination();
      for(let i=flights.length-1;i>=0;i--){const f=flights[i];if(active)f.age+=Math.max(0,dt);const t=Math.min(1,f.age),travel=t*t*(3-2*t);f.mesh.position.lerpVectors(f.start,target,travel);f.mesh.position.y+=Math.sin(t*Math.PI)*.22;f.mesh.scale.copy(f.scale).multiplyScalar(1-.98*travel);f.mesh.rotation.y+=active?dt*3:0;if(t===1){scene.remove(f.mesh);flights.splice(i,1)}}
    },
    render(){if(!firstPerson||!enabled)return;viewCamera.aspect=camera.aspect;viewCamera.updateProjectionMatrix();const auto=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(viewScene,viewCamera);renderer.autoClear=auto},
    clear,
    dispose(){clear();elbow.remove(wand.root);wand.dispose();viewWand.dispose();handGeometry.dispose();armGeometry.dispose();skin.dispose();cuffMaterial.dispose();glove.dispose();jacket.dispose()},
  };
}
