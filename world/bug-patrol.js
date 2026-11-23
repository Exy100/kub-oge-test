import {CatmullRomCurve3,Vector3} from '../vendor/three.module.js';

// Two trails around the workshop. Leave room beside the furniture, portals and tree trunks.
const trails=[
  [[-5,-2],[-5.2,-4.6],[-3.6,-6.7],[-4.9,-8],[-6.3,-6.9],[-6.7,-3.7],
    [-8.5,-1.2],[-9.1,1],[-7.4,3.5],[-5.2,4.8],[-3.8,3.7],[-4.7,1.5]],
  [[4.8,-2.5],[5.2,-4.6],[3.5,-6.9],[4.8,-8],[6.4,-6.6],[6.7,-3.8],
    [8.1,-1.7],[7.6,.5],[5.2,2.2],[4.1,4.7],[2.3,5.5],[1.3,3.7],[3.1,1.8]],
];

export function createBugPatrol(index){
  const curve=new CatmullRomCurve3(trails[index].map(([x,z])=>new Vector3(x,0,z)),true);
  curve.arcLengthDivisions=512;
  const length=curve.getLength(), count=Math.ceil(length/.08);
  const points=curve.getSpacedPoints(count);
  const tangents=points.slice(0,count).map((_,i)=>
    points[(i+1)%count].clone().sub(points[(i+count-1)%count]).normalize());
  const heading=new Vector3();
  // The same arc-length table drives both the body's heading and each footprint.
  function sample(distance,side,forward,out){
    const wrap=((distance%length)+length)%length;
    const frame=wrap*count/length,i=Math.min(count-1,Math.floor(frame)),t=frame-i;
    heading.lerpVectors(tangents[i],tangents[(i+1)%count],t).normalize();
    out.lerpVectors(points[i],points[i+1],t);
    out.x+=side*heading.z+forward*heading.x;
    out.z+=forward*heading.z-side*heading.x;
    return Math.atan2(heading.x,heading.z);
  }
  // The orange beetle plods; the green alternates short dashes with slower steps.
  function distanceAt(time){
    return index ? 1.78*time+.52*Math.sin(time*1.23) : 1.27*time+.32*Math.sin(time*.93);
  }
  return {sample,distanceAt,length};
}
