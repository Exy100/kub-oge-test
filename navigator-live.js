import * as THREE from './vendor/three.module.js';
import {createNavigator} from './navigator-model.js?v=10';

export function createLiveNavigator(button,initialId){
  const fallback=button.querySelector('img');
  const host=document.createElement('span');host.className='navigator-live';host.setAttribute('aria-hidden','true');button.prepend(host);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(renderer.domElement);fallback.hidden=true;
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xfffaed,0x677c80,2.5));
  const key=new THREE.DirectionalLight(0xffedcc,2.7);key.position.set(-3,5,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0xbadfff,1.4);rim.position.set(3,2,-3);scene.add(rim);
  const camera=new THREE.PerspectiveCamera(33,1,.1,20);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let model,lastRender=-1;
  function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}
  const observer=new ResizeObserver(resize);observer.observe(host);
  function select(id){if(model){scene.remove(model.root);model.dispose()}model=createNavigator(id);scene.add(model.root);camera.position.set(.6,id===19?1.25:1.7,id===19?3.3:4.25);camera.lookAt(0,id===19?.8:1.13,0);resize();renderer.render(scene,camera)}
  select(initialId);
  return {select,greet(){model.greet()},update(dt,time,active){
    if(!active||document.hidden)return;
    model.animate(dt,time,{reducedMotion:reduced.matches});
    if(time-lastRender<1/30)return;lastRender=time;renderer.render(scene,camera);
  },dispose(){observer.disconnect();model.dispose();renderer.dispose();renderer.forceContextLoss();host.remove();fallback.hidden=false}};
}
