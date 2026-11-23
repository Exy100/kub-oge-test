import * as THREE from '../vendor/three.module.js';

// Bake the painted facets of each moving part into a single mesh.
export function paintedPart(parent, name, material, paint) {
  const positions=[], colors=[];
  function face(points, hex) {
    const color=new THREE.Color(hex);
    for(let j=1;j<points.length-1;j++) for(const vertex of [points[0],points[j],points[j+1]]) {
      positions.push(...vertex);colors.push(color.r,color.g,color.b);
    }
  }
  function band(lower,upper,color) {
    for(let i=0;i<lower.length;i++){
      const next=(i+1)%lower.length;
      face([lower[i],upper[i],upper[next],lower[next]],color);
    }
  }
  function block(x,y,z,w,h,d,color,bevel=.04,tilt=0) {
    const b=Math.min(bevel,w*.22,h*.22,d*.22), c=Math.cos(tilt),s=Math.sin(tilt);
    function rim(a,level,e){
      const k=Math.min(a,e,b);
      return [[a-k,e],[-a+k,e],[-a,e-k],[-a,-e+k],[-a+k,-e],[a-k,-e],[a,-e+k],[a,e-k]]
        .map(([u,v])=>[x+c*u-s*level,y+s*u+c*level,z+v]);
    }
    const base=rim(w/2-b,-h/2,d/2-b),bottom=rim(w/2,-h/2+b,d/2);
    const top=rim(w/2,h/2-b,d/2),cap=rim(w/2-b,h/2,d/2-b);
    band(base,bottom,color);band(bottom,top,color);band(top,cap,color);
    face(cap.slice().reverse(),color);face(base,color);
  }
  paint({block,face,band});
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,material);
  mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
  return mesh;
}
