// The drawing is projected from island target coordinates, so each block keeps
// its place when the player builds the arch in a different order.
const materials = {
  sand: ['#ffdf86', '#edb64f', '#c88a39'],
  wood: ['#daa77c', '#b57e50', '#906046'],
  stone: ['#dce8e6', '#a3beba', '#829c9a'],
  byte: ['#bcf6fb', '#76c7d4', '#448d9b'],
  garden: ['#d9f29d', '#91c885', '#68a67d'],
};
const byMaterial = [materials.sand, null, materials.wood, materials.stone];

export function drawQuestDiagram(canvas, stage, byteCells) {
  const ctx = canvas.getContext('2d');
  const width = 320, height = 180;
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.lineJoin = 'round';
  function path(points, stroke, fill, closed = true) {
    ctx.beginPath();
    points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    if (closed) ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  function schematic(originX, originY, size, blocks, gridWidth) {
    const project = (x,y,z) => [originX + size*(x*.88 - z*.53), originY + size*(x*.13 + z*.32 - y)];
    const line = (a,b,color) => path([project(...a),project(...b)],color,null,false);
    const low = -gridWidth/2, high = gridWidth/2;
    ctx.lineWidth = .9;
    for (let x=low;x<=high;x++) line([x,0,-1],[x,0,2],'#e7fff1a6');
    for (let z=-1;z<=2;z++) line([low,0,z],[high,0,z],'#e7fff1a6');
    for (const {x,y,z,color,filled} of blocks.sort((a,b)=>a.y-b.y || a.z-b.z || a.x-b.x)) {
      const point = (dx,dy,dz) => project(x+dx*.47, y+dy*.47, z+dz*.47);
      const a=point(-1,1,-1), b=point(1,1,-1), c=point(1,1,1), d=point(-1,1,1);
      const e=point(-1,-1,1), f=point(1,-1,1), g=point(1,-1,-1);
      ctx.lineWidth=filled?1.65:1.3;
      const edge=filled?'#fff4cd':'#edfff4';
      path([a,b,c,d],edge,filled?color[0]:'#d2faed35');
      path([d,c,f,e],edge,filled?color[1]:'#437f6a26');
      path([c,b,g,f],edge,filled?color[2]:'#45897638');
    }
  }
  if (stage.arches.length) {
    const single = stage.arches.length===1;
    stage.arches.forEach((arch,i)=>{
      const blocks=[];
      stage.targets.forEach((target,index)=>{
        if (target.material===arch.material && Math.abs(target.x-arch.x)<=1) {
          blocks.push({x:target.x-arch.x,y:target.y*1.14,z:0,color:byMaterial[target.material],filled:stage.built.has(index)});
        }
      });
      schematic(single?160:58+i*103,single?137:126,single?36:23,blocks,4);
    });
  } else {
    const garden = stage.index===3;
    const blocks = byteCells.map((filled,i)=>({x:i%2-0.5,y:.65,z:Math.floor(i/2)-.5,
      color:garden?materials.garden:materials.byte,filled}));
    schematic(160,117,52,blocks,4);
  }
}
