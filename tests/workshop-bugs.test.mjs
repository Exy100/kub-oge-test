import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,BoxGeometry,Group,Raycaster,Vector3} from '../vendor/three.module.js';
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

test('taller beetles keep the feet above ground and the health bar clear through a stride',()=>{
  const models=workshopModels(new Group(),new BoxGeometry());
  for(const i of [0,1]){
    const {g,hp,animate}=models.bug(i,0,0);
    const body=g.children.find(child=>child!==hp);
    assert.deepEqual(body.scale.toArray(),[1,1.25,1]);
    for(let j=0;j<40;j++){
      animate(j/30,false);
      const bounds=new Box3().setFromObject(body,true);
      assert.ok(bounds.min.y>=0 && bounds.max.y<hp.position.y-.12);
    }
    animate(1,true);
    assert.ok(body.getObjectsByProperty('name','bug-leg').every(leg=>leg.rotation.x===0));
  }
});
