import assert from 'node:assert/strict';
import test from 'node:test';
import {Group,Matrix4,Vector3} from '../vendor/three.module.js';
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


test('both moving arms, fingers and the held chip clear the casing throughout inspection and greetings',()=>{
  const robot=createRemontik(new Group(),200,2);
  const shell=robot.root.getObjectByName('remontik-shell');
  // Side planes include the vents on the left and the raised indicator on the right.
  // Only the fixed shoulder bearings may extend through these planes.
  const moving=[];
  for(const [name,side,wall] of [['remontik-chip-grip',-1,.454],['remontik-open-hand',1,.575]]){
    const wrist=robot.root.getObjectByName(name).parent;
    wrist.parent.parent.traverse(mesh=>{
      if(mesh.isMesh)moving.push({mesh,side,wall});
    });
  }
  assert.equal(moving.length,8);
  const inverse=new Matrix4(),relative=new Matrix4(),point=new Vector3();
  for(let frame=0;frame<1080;frame++){
    const away=frame<450 || frame>850;
    if(frame===527)robot.wave(); // greet again partway through a wave
    robot.update(1/60,frame%61!==0,frame>990,{x:away?213:199,z:5});
    robot.root.updateMatrixWorld(true);
    inverse.copy(shell.matrixWorld).invert();
    for(const {mesh,side,wall} of moving){
      relative.multiplyMatrices(inverse,mesh.matrixWorld);
      const vertices=mesh.geometry.attributes.position;
      let nearest=Infinity;
      for(let i=0;i<vertices.count;i++){
        point.fromBufferAttribute(vertices,i).applyMatrix4(relative);
        nearest=Math.min(nearest,point.x*side);
      }
      assert.ok(nearest>wall+.01,mesh.name+' reaches the casing at frame '+frame);
    }
  }
});
