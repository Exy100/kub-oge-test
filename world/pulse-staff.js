import * as THREE from '../vendor/three.module.js';
import { paintedPart } from './painted-part.js';
import { STAFF_ID, STAFF_ATTACK } from '../catalog/pulse-staff.js';

// Concept 01, light pattern 09. Both camera rigs share these two meshes' resources.
export function createPulseStaff() {
  const root = new THREE.Group();
  root.name = STAFF_ID;
  const ceramic = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .52, metalness: .17 });
  const ivory = 0xe8d5ad, brass = 0xb58c52, jade = 0x3b584c;
  const windows = [
    { x: .002, y: .27, w: .103, h: .064, rows: 2 },
    { x: .021, y: .365, w: .119, h: .082, rows: 2 },
    { x: .056, y: .532, w: .147, h: .197, rows: 4 },
  ];
  function contour(x,y,w,h) {
    const k = Math.min(.018,h*.18);
    return [[0,k],[k,0],[w-k,0],[w,k],[w,h-k],[w-k,h],[k,h],[0,h-k]]
      .map(([u,v]) => [x+u-w/2+(v-h/2)*.23, y+v-h/2]);
  }
  const shell = paintedPart(root,'ceramic-housing',ceramic,({block,face})=>{
    function plate(outline, depth, color) {
      const front = outline.map(([x,y])=>[x,y,depth]);
      const back = outline.map(([x,y])=>[x,y,-depth]);
      face(front,color); face([...back].reverse(),color);
      for(let i=0;i<front.length;i++){
        const j=(i+1)%front.length;
        face([back[i],back[j],front[j],front[i]],color);
      }
    }
    block(0,-.04,0,.066,.38,.064,jade,.012);
    for(let i=0;i<7;i++) block(0,-.182+i*.044,0,.069,.01,.067,0x597064,.004);
    for(const y of [-.24,.134,.184]) block(0,y,0,.085,.026,.078,brass,.008);
    block(0,.16,0,.056,.04,.058,ivory);
    plate([[-.054,.186],[.048,.186],[.102,.375],[.176,.645],[.16,.672],
      [-.038,.656],[-.063,.627],[-.095,.398],[-.088,.369],[-.081,.223]],.034,ivory);
    plate([[-.079,.381],[-.058,.404],[-.022,.636],[-.034,.632]],.035,jade);
    for(const {x,y,w,h} of windows){
      plate(contour(x,y,w+.009,h+.009),.036,brass);
      plate(contour(x,y,w,h),.038,0x142953);
    }
  });
  const vertices=[],charge=[];
  let row=0;
  const rows=windows.reduce((sum,w)=>sum+w.rows,0);
  for(const {x,y,w,h,rows:count} of windows){
    for(let i=0;i<count;i++,row++){
      const offset=h*((i+.5)/count-.5);
      const cx=x+offset*.23, cy=y+offset;
      const dx=w*(i%2?.285:.34), dy=Math.min(.016,h/count*.28);
      for(const sign of [-1,1]){
        const z=sign*.039, thickness=.004;
        for(const [end,edge] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){
          vertices.push(cx+end*dx,cy+end*dy+edge*thickness,z);
          charge.push((row+(end+1)/2)/rows);
        }
      }
    }
  }
  const strips=new THREE.BufferGeometry();
  strips.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  strips.setAttribute('threshold',new THREE.Float32BufferAttribute(charge,1));
  const light=new THREE.ShaderMaterial({
    side:THREE.DoubleSide, uniforms:{fill:{value:1}},
    vertexShader:'attribute float threshold; varying float level; void main(){level=threshold;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float fill; varying float level;
      void main(){
        float on=smoothstep(-.01,.01,(fill*1.024-.012)-level);
        float core=1.-smoothstep(.0,.065,abs(fill-level));
        gl_FragColor=vec4(mix(vec3(.016,.055,.18),vec3(.09,.50,1.)+core*.28,on),1.);
        #include <colorspace_fragment>
      }`,
  });
  root.add(new THREE.Mesh(strips,light));
  const tip=new THREE.Object3D();
  tip.name='pulse-tip';tip.position.set(.073,.66,0);root.add(tip);
  return {root, tip, setFill(value){light.uniforms.fill.value=value},
    dispose(){shell.geometry.dispose();ceramic.dispose();strips.dispose();light.dispose()}};
}

export function createStaffCycle(){
  const {windup,interval}=STAFF_ATTACK;
  let elapsed=interval,release=null;
  return {
    start(onRelease){
      if(elapsed<interval)return false;
      release=onRelease;elapsed=0;return true;
    },
    update(dt,held){
      if(!held && release){release=null;elapsed=interval}
      elapsed=Math.min(interval,elapsed+Math.max(0,dt));
      if(release && elapsed>=windup){
        const fire=release;release=null;fire();
      }
      return elapsed<windup?1:(elapsed-windup)/(interval-windup);
    },
    clear(){elapsed=interval;release=null},
  };
}
