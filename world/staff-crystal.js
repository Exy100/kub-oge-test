import * as THREE from '../vendor/three.module.js';

// Six broad facets, twelve polished bevels and eight clipped points.
// Keep the faces flat so the refraction direction changes at each cut.
function cutCube(orientation){
  const positions=[];
  const facet=points=>{
    const normal=new THREE.Vector3().subVectors(points[1],points[0])
      .cross(new THREE.Vector3().subVectors(points[2],points[0]));
    if(normal.dot(points[0])<0)points.reverse();
    for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]])positions.push(p.x,p.y,p.z);
  };
  const cut=.82;
  const vertex=(axis,a,b,c)=>{
    const p=new THREE.Vector3();p.setComponent(axis,a);
    p.setComponent((axis+1)%3,b);p.setComponent((axis+2)%3,c);return p;
  };
  for(let axis=0;axis<3;axis++)for(const side of [-1,1]){
    facet([[-cut,-cut],[cut,-cut],[cut,cut],[-cut,cut]].map(([b,c])=>vertex(axis,side,b,c)));
    for(const next of [-1,1]){
      facet([vertex(axis,side,next*cut,-cut),vertex(axis,side,next*cut,cut),
        vertex(axis,side*cut,next,cut),vertex(axis,side*cut,next,-cut)]);
    }
  }
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
    facet([new THREE.Vector3(x,y*cut,z*cut),new THREE.Vector3(x*cut,y,z*cut),new THREE.Vector3(x*cut,y*cut,z)]);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  // Map real height after the mounting rotation to the bottom-to-top charge front.
  const height=[],point=new THREE.Vector3();
  for(let i=0;i<positions.length;i+=3)height.push(point.fromArray(positions,i).applyQuaternion(orientation).y);
  const low=Math.min(...height),span=Math.max(...height)-low;
  geometry.setAttribute('chargeLevel',new THREE.Float32BufferAttribute(height.map(y=>(y-low)/span),1));
  geometry.computeVertexNormals();
  return geometry;
}

export function createStaffCrystal(){
  const material=new THREE.ShaderMaterial({
    uniforms:{fill:{value:1},time:{value:0}},
    vertexShader:`
      attribute float chargeLevel;
      varying vec3 stone,facet,eye;
      varying float level;
      void main(){
        level=chargeLevel;
        stone=position;
        facet=normal;
        vec4 view=modelViewMatrix*vec4(position,1.);
        // Convert the eye ray to the gem's local axes, including the held pose.
        eye=(-view.xyz)*mat3(modelViewMatrix);
        gl_Position=projectionMatrix*view;
      }`,
    fragmentShader:`
      uniform float fill,time;
      varying vec3 stone,facet,eye;
      varying float level;

      // Intersect the refracted ray with an embedded seed crystal. One slab
      // intersection gives both its silhouette and its three visible cleavage faces.
      vec3 seed(vec3 base,vec3 p,vec3 dir,float t){
        const mat3 cut=mat3(.940,0.,.342, .060,.985,-.163, -.337,.174,.925);
        vec3 r=cut*p+vec3(.06,-.08,.025);
        vec3 d=cut*dir;
        vec3 inv=sign(d+0.000001)/max(abs(d),vec3(.00001));
        vec3 radius=vec3(.48,.57,.41);
        vec3 a=(-radius-r)*inv,b=(radius-r)*inv;
        vec3 near=min(a,b),far=max(a,b);
        float entry=max(max(near.x,near.y),near.z);
        float exitAt=min(min(far.x,far.y),far.z);
        if(exitAt<=max(entry,0.))return base;
        vec3 q=(r+d*entry)/radius;
        vec3 n=step(vec3(entry-.0001),near)*sign(q);
        vec3 inner=vec3(.009,.12,.58)+abs(n)*vec3(.07,.20,.35);
        vec3 margin=1.-abs(q)+abs(n);
        float edge=min(min(margin.x,margin.y),margin.z);
        float seam=1.-smoothstep(.015,.075,edge);
        // Natural growth zones follow slanted planes inside the seed.
        float strata=dot(q,vec3(.35,.78,-.56));
        float growth=1.-smoothstep(.018,.056,abs(abs(strata+.08)-.38));
        inner+=growth*vec3(.018,.10,.16);
        float caustic=pow(clamp(.48-.46*q.y+.18*q.z,0.,1.),3.);
        inner+=caustic*vec3(.015,.34,.39);
        float sweep=pow(.5+.5*cos(dot(q,vec3(1.8,2.4,-1.4))-t*1.25),9.);
        return mix(base,inner+vec3(.07,.34,.48)*sweep+vec3(.16,.54,.70)*seam,
                   .83*smoothstep(0.,.07,exitAt-entry));
      }
      void main(){
        vec3 n=normalize(facet),v=normalize(eye);
        vec3 ray=refract(-v,n,.83);
        float faceLight=dot(n,normalize(vec3(-.38,.65,.68)));
        vec3 blue=mix(vec3(.004,.012,.135),vec3(.018,.104,.76),.5+.5*faceLight);
        vec3 depth=stone+ray*.53;
        float plane=dot(depth,vec3(.49,-.71,.53));
        float lamina=1.-smoothstep(.008,.035,abs(abs(plane+.15)-.22));
        blue+=vec3(.018,.068,.15)*lamina;
        blue=seed(blue,stone,ray,time);
        float grazing=pow(1.-max(0.,dot(v,n)),3.);
        float glint=pow(.5+.5*cos(dot(stone,vec3(2.2,-3.1,1.2))+.9*time+faceLight*2.),16.);
        blue+=vec3(.16,.23,.37)*grazing+vec3(.08,.20,.31)*glint;
        float charged=smoothstep(level-.035,level+.035,fill*1.07-.035);
        gl_FragColor=vec4(mix(blue*.18+vec3(.004,.009,.025),blue,charged),1.);
        #include <colorspace_fragment>
      }`,
  });
  const orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.80,-1.02,-.03));
  const crystal=new THREE.Mesh(cutCube(orientation),material);
  crystal.name='staff-sapphire';crystal.castShadow=true;
  crystal.scale.setScalar(.115);
  crystal.quaternion.copy(orientation);
  crystal.position.set(.093,.610,0);
  return crystal;
}
