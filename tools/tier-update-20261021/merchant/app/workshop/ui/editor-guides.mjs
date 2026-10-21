const bounds=o=>{const a=(o.rotation||0)*Math.PI/180,w=Math.abs(o.w*Math.cos(a))+Math.abs(o.h*Math.sin(a)),h=Math.abs(o.w*Math.sin(a))+Math.abs(o.h*Math.cos(a));return {x:[o.x-w/2,o.x,o.x+w/2],y:[o.y-h/2,o.y,o.y+h/2]};};
export function alignedPosition(object,geometry,others,{threshold=1,snap=true}={}){
 const result={...object},lines=[],b=bounds(object);
 for(const [axis,extent] of [['x',geometry.width],['y',geometry.height]]){
  const m=geometry.safeMarginMm??2,targets=[{value:extent/2,kind:'center'},{value:m,kind:'margin'},{value:extent-m,kind:'margin'},...others.filter(o=>o.id!==object.id&&!o.uxHidden).flatMap(o=>bounds(o)[axis].map(value=>({value,kind:'element'})))];
  let best=null;
  for(const from of b[axis])for(const target of targets){const delta=target.value-from;if(Math.abs(delta)<=threshold&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={...target,delta};}
  if(best){if(snap)result[axis]+=best.delta;lines.push({axis,value:best.value,kind:best.kind});}
 }
 return {object:result,lines};
}
export function clearGuides(stage){stage.querySelector('[data-editor-guides]')?.remove();}
export function drawGuides(stage,parent,geometry,lines){
 clearGuides(stage);const ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g');group.dataset.editorGuides='true';group.setAttribute('pointer-events','none');
 // Both the geometry and parent transform are those used by the artwork.
 const unique=new Map([['x:center',{axis:'x',value:geometry.width/2,kind:'center'}],['y:center',{axis:'y',value:geometry.height/2,kind:'center'}]]);
 for(const line of lines)unique.set(line.axis+':'+line.value,line);
 for(const {axis,value,kind} of unique.values()){
  const line=document.createElementNS(ns,'line');
  for(const [key,v] of Object.entries(axis==='x'?{x1:value,x2:value,y1:0,y2:geometry.height}:{y1:value,y2:value,x1:0,x2:geometry.width}))line.setAttribute(key,v);
  line.setAttribute('stroke',kind==='center'?'#187361':'#bc3985');line.setAttribute('stroke-width','1');line.setAttribute('stroke-dasharray','5 4');line.setAttribute('vector-effect','non-scaling-stroke');group.append(line);
 }
 parent.append(group);
}
