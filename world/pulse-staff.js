import * as THREE from '../vendor/three.module.js';
import { paintedPart } from './painted-part.js';
import { STAFF_ID, STAFF_ATTACK } from '../catalog/pulse-staff.js?v=2';

// Concept 01, light pattern 09. Both camera rigs share these two meshes' resources.
export function createPulseStaff() {
  const root = new THREE.Group();
  root.name = STAFF_ID;
  const ceramic = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .52, metalness: .17 });
  const ivory=0xece2c9, brass=0xb28a53, paleGold=0xd8b57a, jade=0x34584f;
  const neckExtension=.155;
  const windows = [
    {x:.001,y:.268,w:.099,h:.061,rows:2},
    {x:.021,y:.365,w:.123,h:.081,rows:2},
    {x:.062,y:.538,w:.154,h:.196,rows:4},
  ];
  function contour(x,y,w,h) {
    const k=Math.min(.020,h*.21);
    return [[0,k],[k,0],[w-k,0],[w,k],[w,h-k],[w-k,h],[k,h],[0,h-k]]
      .map(([u,v])=>[x+u-w/2+(v-h/2)*.23,y+v-h/2]);
  }
  const shell=paintedPart(root,'ceramic-housing',ceramic,({face})=>{
    // Build across the thickness: a dark spine between two ivory cheeks.
    // All outlines run counterclockwise as seen from the front.
    function loop(points,z){return points.map(([x,y])=>[x,y+neckExtension,z])}
    function join(lower,upper,color){
      for(let i=0;i<lower.length;i++){
        const j=(i+1)%lower.length;
        face([lower[i],lower[j],upper[j],upper[i]],color);
      }
    }
    function bothFaces(points,z,color){
      face(loop(points,z),color);
      face(loop(points,-z).reverse(),color);
    }
    const outline=[
      [-.055,.187],[.045,.187],[.083,.233],[.127,.416],
      [.184,.630],[.184,.655],[.158,.682],[.033,.677],
      [-.045,.650],[-.071,.607],[-.105,.406],[-.099,.357],[-.077,.230],
    ];
    function housingRing(scaleX,scaleY,z){
      return outline.map(([x,y])=>[.036+(x-.036)*scaleX,.436+(y-.436)*scaleY+neckExtension,z]);
    }
    const profile=[
      [.91,.974,-.041,ivory],[1,1,-.027,0xd1c2a3],[1,1,-.018,ivory],
      [.965,.980,-.013,brass],[.965,.980,.013,jade],
      [1,1,.018,brass],[1,1,.027,ivory],[.91,.974,.041,0xf2e7ce],
    ];
    const rings=profile.map(([sx,sy,z])=>housingRing(sx,sy,z));
    for(let i=1;i<rings.length;i++)join(rings[i-1],rings[i],profile[i][3]);
    face(rings[0].slice().reverse(),ivory);face(rings.at(-1),ivory);

    // An enamel rail follows the rear edge of the head into the thumb rest.
    bothFaces([[-.088,.383],[-.068,.403],[-.028,.624],[-.045,.610]],.042,jade);
    bothFaces([[-.071,.387],[-.063,.397],[-.031,.571],[-.038,.563]],.043,paleGold);
    for(const {x,y,w,h} of windows){
      const frame=contour(x,y,w+.023,h+.022);
      const lip=contour(x,y,w+.014,h+.013);
      const glass=contour(x,y,w,h);
      for(const side of [-1,1]){
        // Winding reverses on the back. The lens sits below the raised metal lip.
        const rim=(outline,z)=>side>0?loop(outline,z):loop(outline,-z).reverse();
        join(rim(frame,.0412),rim(lip,.048),brass);
        join(rim(lip,.048),rim(glass,.048),paleGold);
        join(rim(glass,.048),rim(glass,.044),0x304757);
        const pane=rim(glass,.044),center=[x,y+neckExtension,side*.0455];
        const sapphire=[0x183357,0x21446c,0x173862,0x122c4c,0x102940,0x143451,0x204269,0x224a73];
        for(let i=0;i<pane.length;i++)face([pane[i],pane[(i+1)%pane.length],center],sapphire[i]);
      }
    }

    // The grip swells under the palm. Brass ferrules and shallow fluting catch side light.
    function gripRing(y,rx,rz){
      return Array.from({length:12},(_,i)=>{
        const a=i*Math.PI/6;
        return [rx*Math.cos(a),y,-rz*Math.sin(a)];
      });
    }
    function turn(rows){
      const rings=rows.map(([y,rx,rz])=>gripRing(y,rx,rz));
      face(rings[0].slice().reverse(),rows[0][3]);
      for(let i=1;i<rows.length;i++)join(rings[i-1],rings[i],rows[i][3]);
      face(rings.at(-1),rows.at(-1)[3]);
    }
    const grip=[[-.360,.023,.021,brass],[-.350,.041,.037,paleGold],
      [-.333,.044,.039,brass],[-.324,.037,.033,0x2b443e],[-.311,.033,.030,jade],
      [-.244,.036,.032,jade],[-.239,.038,.034,brass],[-.232,.038,.034,paleGold],
      [-.225,.034,.031,jade]];
    for(let i=0;i<6;i++){
      const y=-.201+i*.052;
      const r=.035+.006*Math.sin((i+.5)*Math.PI/6);
      grip.push([y,r,.91*r,0x59746a],[y+.029,r+.001,.91*r,jade],
        [y+.035,r-.003,.86*r,0x293e39]);
    }
    grip.push([.118,.034,.031,jade],[.128,.046,.040,paleGold],[.142,.045,.039,brass],
      [.148,.034,.030,0x394e49],[.157,.030,.028,brass],
      [.164,.029,.027,ivory],[.278,.032,.029,ivory],
      [.284,.034,.031,brass],[.291,.034,.031,paleGold],[.297,.032,.029,jade],
      [.174+neckExtension,.035,.030,jade],[.184+neckExtension,.049,.039,paleGold],
      [.202+neckExtension,.054,.041,brass],[.212+neckExtension,.045,.035,ivory]);
    turn(grip);
    // The brass crown connects the physical emitter to the lightning origin.
    bothFaces([[.031,.655],[.094,.657],[.109,.670],[.042,.668]],.0425,brass);
    bothFaces([[.049,.658],[.085,.659],[.092,.665],[.055,.665]],.0435,0x448db0);
  });
  const vertices=[],charge=[],across=[];
  let row=0;
  const rows=windows.reduce((sum,w)=>sum+w.rows,0);
  for(const {x,y,w,h,rows:count} of windows){
    for(let i=0;i<count;i++,row++){
      const offset=h*((i+.5)/count-.5);
      const cx=x+offset*.23, cy=y+neckExtension+offset;
      const dx=w*(i%2?.285:.34), dy=Math.min(.016,h/count*.28);
      for(const sign of [-1,1]){
        const z=sign*.0466, thickness=.0046;
        for(const [end,edge] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){
          vertices.push(cx+end*dx,cy+end*dy+edge*thickness,z);
          across.push(edge);
          charge.push((row+(end+1)/2)/rows);
        }
      }
    }
  }
  const strips=new THREE.BufferGeometry();
  strips.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  strips.setAttribute('threshold',new THREE.Float32BufferAttribute(charge,1));
  strips.setAttribute('across',new THREE.Float32BufferAttribute(across,1));
  const light=new THREE.ShaderMaterial({
    side:THREE.DoubleSide, uniforms:{fill:{value:1}},
    vertexShader:'attribute float threshold,across; varying float level,edge; void main(){level=threshold;edge=across;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float fill; varying float level,edge;
      void main(){
        float on=smoothstep(-.01,.01,(fill*1.024-.012)-level);
        float core=1.-smoothstep(.0,.065,abs(fill-level));
        vec3 filament=mix(vec3(.06,.38,.94),vec3(.49,.85,1.),1.-smoothstep(.1,.88,abs(edge)));
        gl_FragColor=vec4(mix(vec3(.019,.069,.15),filament+core*.18,on),1.);
        #include <colorspace_fragment>
      }`,
  });
  root.add(new THREE.Mesh(strips,light));
  const tip=new THREE.Object3D();
  tip.name='pulse-tip';tip.position.set(.073,.675+neckExtension,0);root.add(tip);
  return {root, tip, setFill(value){light.uniforms.fill.value=value},
    dispose(){shell.geometry.dispose();ceramic.dispose();strips.dispose();light.dispose()}};
}

export function createStaffCycle(){
  const {windup,impact,interval}=STAFF_ATTACK;
  let elapsed=interval,release=null,contact=null;
  return {
    get elapsed(){return elapsed},
    start(onRelease,onImpact){
      if(elapsed<interval)return false;
      release=onRelease;contact=onImpact;elapsed=0;return true;
    },
    update(dt,held){
      if(!held && release){release=contact=null;elapsed=interval}
      elapsed=Math.min(interval,elapsed+Math.max(0,dt));
      if(release && elapsed>=windup){
        const fire=release;release=null;fire();
      }
      if(contact && elapsed>=impact){
        const hit=contact;contact=null;hit();
      }
      return elapsed<windup?1:(elapsed-windup)/(interval-windup);
    },
    clear(){elapsed=interval;release=contact=null},
  };
}
