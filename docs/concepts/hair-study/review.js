import * as THREE from '../../../vendor/three.module.js';
import {createCharacter} from '../../../character.js';
import {DEFAULT_APPEARANCE,PALETTES} from '../../../appearance.js';
import {followCamera} from '../../../follow-camera.js';

const styleSelect=document.querySelector('#style'), paletteSelect=document.querySelector('#palette');
for (const [i,palette] of PALETTES.entries()) paletteSelect.add(new Option(palette.name,i));
const choices={3:'Три широкие пряди, зачёсанные вперёд',4:'Мягкие завитки разной величины',7:'Низкий хвост с резинкой на затылке'};
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xe1e8df);
scene.add(new THREE.HemisphereLight(0xfff4dd,0x718783,2.8));
const key=new THREE.DirectionalLight(0xffedcf,2.7);
key.position.set(-3,5,-4); scene.add(key);
const rim=new THREE.DirectionalLight(0xb0cbe0,1.6);
rim.position.set(3,2,3); scene.add(rim);

const portrait=new THREE.OrthographicCamera(-.5,.5,.385,-.385,.01,20);
portrait.position.set(0,1.62,-3); portrait.lookAt(0,1.49,0);
const gameCamera=new THREE.PerspectiveCamera(55,1440/900,.1,140);
followCamera(gameCamera,new THREE.Vector3(0,1.5,0),new THREE.Vector3(0,-Math.sin(.23),-Math.cos(.23)),[]);

const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('after'),antialias:true});
const actor=createCharacter(DEFAULT_APPEARANCE);
scene.add(actor.root);

function changeModel(){
  const hair=Number(styleSelect.value), palette=Number(paletteSelect.value);
  actor.setAppearance({...DEFAULT_APPEARANCE,hair,palette});
  document.querySelector('#comparison').src=({3:'tousled',4:'curls',7:'ponytail'})[hair]+'.png';
  document.querySelector('h1').textContent=styleSelect.selectedOptions[0].text;
  document.querySelector('#caption').textContent=choices[hair]+' · '+PALETTES[palette].name;
  draw();
}
function draw(){
  const canvas=renderer.domElement;
  const w=canvas.clientWidth,h=Math.round(w/4.5);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(w,h,false);
  renderer.setScissorTest(true);
  for(const [col,angle] of [0,Math.PI/2,Math.PI,0].entries()){
    const x=Math.round(col*w/4), tile=Math.round((col+1)*w/4)-x-3;
    renderer.setScissor(x,0,tile,h);renderer.setViewport(x,0,tile,h);
    actor.root.rotation.y=angle;
    actor.root.position.x=col===1 ? -.069 : 0;
    portrait.left=-.385*tile/h;portrait.right=-portrait.left;portrait.updateProjectionMatrix();
    // Crop the native 1440×900 follow-camera frame around the player without zooming it.
    const cropH=300, cropW=cropH*tile/h;
    gameCamera.setViewOffset(1440,900,(1440-cropW)/2,390,cropW,cropH);
    renderer.render(scene,col===3?gameCamera:portrait);
  }
}
styleSelect.onchange=paletteSelect.onchange=changeModel;
changeModel();
new ResizeObserver(draw).observe(document.querySelector('article'));
