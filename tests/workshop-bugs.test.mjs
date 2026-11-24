import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,BoxGeometry,Group,Raycaster,Vector3} from '../vendor/three.module.js';
import {inWandArc} from '../quests/workshop.js';
import {createBugPatrol} from '../world/bug-patrol.js';
import turtleIsland from '../locations/turtle.js';
import {workshopModels} from '../world/repair-models.js';

test('orange armour has a continuous crown above both shoulders',()=>{
  const {g}=workshopModels(new Group(),new BoxGeometry()).bug(0,0,0);
  const shell=g.getObjectByName('copper-shield');
  g.updateMatrixWorld(true);
  const down=new Vector3(0,-1,0);
  function height(x,z){
    return new Raycaster(new Vector3(x,2,z),down).intersectObject(shell,false)[0]?.point.y;
  }
  for(const z of [-.70,-.55,-.29,-.1,.04]){
    for(const x of [-.12,.12])assert.ok(height(0,z)>=height(x,z));
  }
});

test('beetles plant at least three feet in world space through turns and the route seam',()=>{
  const models=workshopModels(new Group(),new BoxGeometry());
  for(const index of [0,1]){
    const {g,hp,walk,rest}=models.bug(index,0,0);
    const body=g.children.find(child=>child!==hp),route=createBugPatrol(index);
    const feet=body.getObjectsByProperty('name','bug-shin');
    const previous=feet.map(()=>new Vector3()),now=new Vector3();
    const lifted=new Set();
    assert.equal(feet.length,6);
    assert.deepEqual(body.scale.toArray(),[1,1.25,1]);
    for(let frame=0;frame<=1250;frame++){
      const distance=route.length*(frame/1200);
      const yaw=route.sample(distance,0,0,g.position);g.rotation.y=yaw;
      walk(route,distance,yaw,false);
      g.updateMatrixWorld(true);
      let fixed=0;
      feet.forEach((foot,j)=>{
        foot.getWorldPosition(now);
        if(now.distanceTo(previous[j])<.0001 && now.y<.05)fixed++;
        if(now.y>.19)lifted.add(j);
        previous[j].copy(now);
      });
      if(frame)assert.ok(fixed>=3,'a supporting tripod must keep its footholds');
      if(frame%20===0){
        const bounds=new Box3().setFromObject(body,true);
        assert.ok(bounds.min.y>=0 && bounds.max.y<hp.position.y-.12);
      }
    }
    assert.equal(lifted.size,6);
    rest();
    const neutral=feet.map(foot=>foot.position.clone());
    walk(route,4,1,true);
    assert.ok(feet.every((foot,j)=>foot.position.equals(neutral[j])));
  }
});

test('workshop patrols stay on walkable ground clear of props and keep continuous headings',()=>{
  const obstacles=turtleIsland.trees.map(tree=>[tree.x-turtleIsland.center,tree.z]);
  obstacles.push([-1.85,-.3],[1.1,-1],[-1,-6],[1,-6],[4.85,6],[7.15,6]);
  const pos=new Vector3(),bounds=new Box3();
  for(const index of [0,1]){
    const route=createBugPatrol(index);bounds.makeEmpty();
    let lastYaw=route.sample(-.001,0,0,pos);
    for(let j=0;j<=600;j++){
      const yaw=route.sample(route.length*j/600,0,0,pos);
      assert.ok(Math.cos(yaw-lastYaw)>.95);
      lastYaw=yaw;
      assert.ok(Math.abs(pos.x)<10.5 && Math.abs(pos.z)<9.5);
      for(const [x,z] of obstacles)assert.ok(Math.hypot(pos.x-x,pos.z-z)>1.30);
      bounds.expandByPoint(pos);
    }
    assert.ok(bounds.max.z-bounds.min.z>11 && bounds.max.x-bounds.min.x>4.5);
  }
});

test('wand checks occupied tiles and facing at contact',()=>{
  const facing=(a,b)=>-Math.atan2(b.x-a.x,a.z-b.z);
  for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){
    const a={x:160,z:-3},b={x:160+x,z:-3+z};
    assert.equal(inWandArc(a,facing(a,b),b),Math.max(Math.abs(x),Math.abs(z))<=1);
  }
  // Two centers on opposite edges of diagonally adjoining tiles can be >2 apart.
  const a={x:159.51,z:-3.49},diagonal={x:161.49,z:-1.51};
  assert.ok(inWandArc(a,facing(a,diagonal),diagonal));
  // The far tile begins at the half-integer even if the centers are only 1.01 apart.
  const edge={x:160.49,z:-2},beyond={x:161.5,z:-2};
  assert.ok(!inWandArc(edge,facing(edge,beyond),beyond));
  assert.ok(!inWandArc({x:160,z:0},0,{x:160,z:1}),'the swing still faces forward');
});
