import * as THREE from './vendor/three.module.js';

const TAU = 2 * Math.PI;
const {sin, cos, abs, pow} = Math;
const V = (x,y,z) => new THREE.Vector3(x,y,z);
const {lerp, clamp} = THREE.MathUtils;

// A ring loft keeps every section attached to the next, including the underside.
function loft(rows, sides, sample) {
  const points = [], indices = [];
  for (let row = 0; row <= rows; row++) {
    for (let side = 0; side < sides; side++) {
      points.push(...sample(row, side / sides * TAU).toArray());
      if (row === rows) continue;
      const a = row*sides+side, b = row*sides+(side+1)%sides;
      indices.push(a,a+sides,b, b,a+sides,b+sides);
    }
  }
  // Cap the two small end rings.
  for (let i=1; i<sides-1; i++) {
    indices.push(0,i,i+1, rows*sides,rows*sides+i+1,rows*sides+i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Ring widths follow the rounded-square head at the temples, then taper at the crown.
const crownProfile = [.90,.99,1.015,1.025,1.025,1.018,1.005,.982,.938,.857,.718,.525,.285,.025];
function crownPoint(style,row,a) {
  const t = Math.max(0,row-1)/(crownProfile.length-2);
  const front = clamp((cos(a)-.12)/.74,0,1);
  const ear = pow(abs(sin(a)),8);
  let edge = -.088 + .219*front + .114*ear;
  const lower = Math.floor(row), fraction = row-lower;
  let radius = lerp(crownProfile[lower],crownProfile[Math.min(lower+1,crownProfile.length-1)],fraction), top=.306;
  const taper = sin(Math.PI*(.12+.88*t));
  if (style===4) {
    // Scalloped hairline and interlocking waves across the whole surface.
    const wave = cos(8*a+2*sin(3*a+.7)+7*t) + .53*cos(13*a-8*t+.4);
    edge += .024*cos(8*a+1.1*sin(3*a)) - .013;
    radius *= 1.07 + (.022+.018*t)*wave;
    top = .31 + .05*t*t + .012*wave*taper;
  } else if (style===3) {
    edge += .016*sin(3*a+.8) + .009*sin(7*a);
    radius *= 1+.026*taper*cos(5*a-3*t);
    top += .018*sin(2*a)*taper;
  } else {
    // Wide, swept channels converge behind the ears.
    const ridges = cos(8*a+4.5*t*sin(a));
    radius *= 1+.023*taper*ridges;
    top -= .012;
  }
  const squared = pow(pow(abs(sin(a)),5)+pow(abs(cos(a)),5),-.2);
  // Keep the back wall outside the head until the height of the temples.
  const y = t<.43 ? lerp(edge,.192,t/.43)
    : lerp(.192,top,Math.sin((t-.43)/.57*Math.PI/2));
  const lip = Math.max(0,1-row)*.012;
  return V(.231*radius*squared*sin(a),y+lip,-.227*radius*squared*cos(a));
}

// Sculpt curls into a single shell. A staggered field of soft mounds and
// curved grooves keeps the roots joined even at the temples and nape.
function curlyCrown() {
  const patches=[];
  for (const [tier,count,level] of [[0,9,3.1],[1,8,7.1],[2,6,10.3]]) {
    for(let i=0;i<count;i++){
      const angle=(i+.46*tier+.13*sin(3*i+tier))*TAU/count;
      patches.push({angle,level:level+.72*sin(i*2+tier),width:TAU/count*(.55+.06*cos(i)),
        height:2.8+.3*cos(2*i),twist:.8*sin(4*i+tier),hand:i%3===0?-1:1});
    }
  }
  const shades=[];
  const geometry=loft(60,128,(ring,angle)=>{
    const layer=ring*13/60;
    const p=crownPoint(4,layer,angle);
    const n=V(sin(angle), Math.pow(layer/10,4), -cos(angle)).normalize();
    let relief=0, groove=0;
    for(const patch of patches){
      const delta=angle-patch.angle;
      const u=Math.atan2(sin(delta),cos(delta))/patch.width;
      const v=(layer-patch.level)/patch.height;
      const r=Math.hypot(u,v);
      if(r>=1.35)continue;
      const dome=pow(Math.max(0,1-(r/1.35)**2),2);
      const spiral=cos(patch.hand*Math.atan2(v,u)-8.2*r+patch.twist);
      relief+=dome*(.032+.028*Math.min(1,4*r)*pow((1+spiral)/2,1.3));
      groove+=dome*Math.min(1,4*r)*pow((1-spiral)/2,3);

    }
    const tone=1-.26*Math.min(1,groove);
    shades.push(tone,tone,tone);
    return p.addScaledVector(n,relief);
  });
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(shades,3));
  return geometry;
}

// A lock follows a continuous centreline. Each station has a half-width and depth.
function lock(stations, widthAxis, flute=0) {
  const path = new THREE.CatmullRomCurve3(stations.map(s=>V(...s.slice(0,3))));
  const sizes = new THREE.CatmullRomCurve3(stations.map((s,i)=>V(s[3],s[4],i)));
  const rings=(stations.length-1)*4;
  return loft(rings,12,(row,a)=>{
    const t=row/rings, p=path.getPoint(t), tangent=path.getTangent(t);
    const across=widthAxis.clone().addScaledVector(tangent,-widthAxis.dot(tangent)).normalize();
    const normal=across.clone().cross(tangent).normalize();
    const size=sizes.getPoint(t).multiplyScalar(1+flute*cos(5*a+.7*t));
    return p.addScaledVector(across,Math.max(.001,size.x)*cos(a))
      .addScaledVector(normal,Math.max(.001,size.y)*sin(a));
  });
}

export function createSculptedHair(style, colors) {
  const hair=new THREE.Group();
  hair.name='hair';
  const [base,light,dark]=colors.map(c=>new THREE.Color(c));
  const tones=[base,base.clone().lerp(light,.22),base.clone().lerp(dark,.26)];
  function part(name, geometry, color=base) {
    const material=new THREE.MeshStandardMaterial({color,vertexColors:!!geometry.attributes.color,roughness:.86,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=name; mesh.castShadow=mesh.receiveShadow=true;
    hair.add(mesh);
    return mesh;
  }
  part('crown',style===4 ? curlyCrown() : loft(crownProfile.length-1,72,(row,a)=>crownPoint(style,row,a)));
  // Low-relief sweeps are laid directly onto the crown surface, with tapered edges.
  function sweep(name, coordinates, breadth, relief, tone) {
    const path = new THREE.CatmullRomCurve3(coordinates.map(([angle,row])=>V(angle,row,0)));
    const rings=coordinates.length*5;
    const surface=loft(rings,12,(row,a)=>{
      const t=row/rings, pos=path.getPoint(t), dir=path.getTangent(t);
      const width=Math.max(.018,Math.pow(sin(Math.PI*t),.72));
      const tangent=V(dir.x*.22,dir.y*.025,0).normalize();
      const across=breadth*width*cos(a);
      const angle=pos.x-tangent.y*across/.22;
      const layer=clamp(pos.y+tangent.x*across/.025,1,12.7);
      const point=crownPoint(style,layer,angle);
      const alongRing=crownPoint(style,layer,angle+.001).sub(point);
      const up=crownPoint(style,layer+.001,angle).sub(point);
      const normal=up.cross(alongRing).normalize();
      return point.addScaledVector(normal,relief*width*(sin(a)+.16));
    });
    part(name,surface,tone);
  }
  const xAxis=V(1,0,0);
  if (style===3) {
    // Broad roots cross the crown; only the tips separate from the main mass.
    const bangs=[
      [[-.14,.237,.15,.014,.010],[-.147,.287,.04,.061,.026],[-.15,.267,-.094,.074,.051],[-.16,.216,-.185,.064,.044],[-.179,.133,-.221,.009,.006]],
      [[-.065,.253,.14,.015,.016],[-.04,.315,.02,.083,.041],[.004,.312,-.12,.090,.050],[.039,.252,-.201,.073,.042],[.078,.128,-.233,.005,.004]],
      [[.05,.271,.13,.018,.008],[.08,.309,.026,.078,.032],[.127,.288,-.113,.072,.048],[.158,.241,-.184,.053,.040],[.196,.185,-.216,.005,.005]]
    ];
    for (const side of [-1,1]) {
      sweep('temple-sweep',[[side*.95,7],[side*1.5,6.5],[side*2.15,5],[side*2.8,2]],.046,.013,tones[0]);
      sweep('nape-sweep',[[side*1.65,10],[side*2.0,8],[side*2.65,6],[side*3.05,3]],.047,.015,tones[1]);
    }
    bangs.forEach((s,i)=>part('swept-lock',lock(s,xAxis),tones[[0,1,0][i]]));
  } else if (style===7) {
    // Gather at the nape, then sweep away from the collar in one tapering volume.
    for (const side of [-1,1]) {
      sweep('gathered-lock',[[side*.1,2.4],[side*.55,5],[side*1.4,6.2],[side*2.24,5.6],[side*3.02,4.2]],.032,.012,tones[1]);
      sweep('gathered-lock',[[side*1.03,1.7],[side*1.65,3.2],[side*2.4,3.8],[side*3.03,4]],.023,.009,tones[0]);
      sweep('gathered-lock',[[side*.15,8],[side*.9,10.5],[side*2.25,9.7],[side*2.8,7],[side*3.1,4.3]],.044,.014,tones[0]);
    }
    const band=new THREE.CylinderGeometry(.052,.051,.029,18);
    band.rotateX(Math.PI*.5); band.translate(0,.102,.251);
    part('hair-tie',band,new THREE.Color(0x49675d));
    part('low-ponytail',lock([
      [0,.102,.205,.032,.032],[0,.102,.249,.043,.040],
      [.004,.11,.298,.062,.049],[.014,.099,.352,.070,.047],
      [.016,.059,.392,.068,.041],[.013,-.009,.418,.060,.038],
      [.004,-.086,.435,.047,.034],[-.009,-.15,.447,.031,.024],
      [-.026,-.195,.454,.003,.003]
    ],xAxis,.065),tones[0]);
  }
  return hair;
}
