import * as THREE from './vendor/three.module.js';
import { makeSoftBox } from './character-face.js';
import { bitValue } from './forge-state.js';

// Four visible miniature bits are a decorative window into the block.
// The crafting recipe and its label still represent the full eight-bit byte.
export function createByteFactory(bitMaterials) {
  const soft=makeSoftBox(), bitGeometry=new THREE.BoxGeometry(.15,.15,.15);
  const cornerGeometry=new THREE.IcosahedronGeometry(.048,0);
  const glass=new THREE.MeshPhysicalMaterial({color:0xc2a6e1,transparent:true,opacity:.2,roughness:.16,metalness:.03,clearcoat:1,depthWrite:false,side:THREE.DoubleSide});
  const gold=new THREE.MeshStandardMaterial({color:0xd3b479,roughness:.34,metalness:.48});
  const plum=new THREE.MeshStandardMaterial({color:0x796286,roughness:.45,metalness:.2});
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#554562';ctx.fillRect(0,0,256,96);ctx.strokeStyle='#d3b479';ctx.lineWidth=6;ctx.strokeRect(4,4,248,88);
  ctx.fillStyle='#f6dfae';ctx.textAlign='center';ctx.font='bold 33px monospace';ctx.fillText('BYTE · 8 BIT',128,59);
  const labelTexture=new THREE.CanvasTexture(canvas);labelTexture.colorSpace=THREE.SRGBColorSpace;
  const labelMaterial=new THREE.MeshBasicMaterial({map:labelTexture});const labelGeometry=new THREE.PlaneGeometry(.48,.18);
  function create() {
    const root=new THREE.Group();root.name='byte-crystal';root.userData.innerBits=[];
    const piece=(x,y,z,w,h,d,material)=>{const m=new THREE.Mesh(soft,material);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;root.add(m);return m};
    // Fine metal edges, faceted corner rivets and inset circuit rails.
    for(const a of [-1,1])for(const b of [-1,1]){
      piece(0,a*.32,b*.32,.64,.026,.026,gold);
      piece(a*.32,0,b*.32,.026,.64,.026,gold);
      piece(a*.32,b*.32,0,.026,.026,.64,gold);
      for(const c of [-1,1]){const corner=new THREE.Mesh(cornerGeometry,gold);corner.position.set(a*.32,b*.32,c*.32);root.add(corner)}
    }
    for(const side of [-1,1]){
      piece(side*.326,-.04,0,.013,.36,.018,plum);
      piece(side*.326,.13,.09,.013,.018,.19,gold);
      piece(side*.326,-.2,-.09,.013,.018,.19,gold);
      const label=new THREE.Mesh(labelGeometry,labelMaterial);label.position.set(0,-.22,side*.334);if(side<0)label.rotation.y=Math.PI;root.add(label);
    }
    for(let i=0;i<4;i++){
      const bit=new THREE.Mesh(bitGeometry,Array(6).fill(bitMaterials[i%2]));
      bit.position.set((i%2?1:-1)*.13,(i<2?1:-1)*.12,.015);bit.rotation.set(.12,i*.4,.08);bit.name='byte-inner-bit';root.add(bit);root.userData.innerBits.push(bit);
    }
    const shell=piece(0,0,0,.62,.62,.62,glass);shell.name='byte-glass';shell.castShadow=false;shell.renderOrder=2;
    return root;
  }
  return {create,animate(root,time){root.userData.innerBits.forEach((bit,i)=>{bit.material=Array(6).fill(bitMaterials[bitValue(time,i)]);bit.rotation.y=time*.25+i*.4})}};
}
