// Thumbnail framing only: never change motif paths, the catalogue or placed objects.
const TILE='[data-motif]',ART='path,rect,circle,ellipse,line,polyline,polygon,text,use,image';
const finite=n=>Number.isFinite(n);
export function motifTileViewBox(bounds,{padding=.08}={}){
 if(!bounds||![bounds.x,bounds.y,bounds.width,bounds.height,padding].every(finite)||bounds.width<0||bounds.height<0||padding<0)return null;
 const size=Math.max(bounds.width,bounds.height);if(size<=0)return null;
 const edge=Math.max(size*padding,.001),width=bounds.width+edge*2,height=bounds.height+edge*2;
 return [bounds.x-edge,bounds.y-edge,width,height];
}
export function transformedInkBounds(box,matrix,strokeWidth=0){
 if(!box||!matrix||![box.x,box.y,box.width,box.height,matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f,strokeWidth].every(finite)||box.width<0||box.height<0||strokeWidth<0)return null;
 const pad=strokeWidth/2,x=box.x-pad,y=box.y-pad,w=box.width+2*pad,h=box.height+2*pad;
 const points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([u,v])=>({x:matrix.a*u+matrix.c*v+matrix.e,y:matrix.b*u+matrix.d*v+matrix.f}));
 const left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y));
 return {x:left,y:top,width:Math.max(...points.map(p=>p.x))-left,height:Math.max(...points.map(p=>p.y))-top};
}
export function motifInkBounds(svg,{style=node=>svg.ownerDocument.defaultView.getComputedStyle(node)}={}){
 // Each descendant is measured in its own units and transformed back into the
 // outer thumbnail. Screen matrices share one coordinate system even across
 // nested SVG viewports; getCTM() would mix different viewport coordinate systems.
 let inverse;try{inverse=svg.getScreenCTM()?.inverse();}catch{return null;}if(!inverse)return null;
 const boxes=[];
 for(const node of svg.querySelectorAll(ART)){
  if(node.closest('defs,clipPath,mask,marker,pattern,symbol'))continue;
  const paint=style(node);
  if(paint.display==='none'||paint.visibility==='hidden'||Number(paint.opacity)===0)continue;
  const stroke=paint.stroke&&paint.stroke!=='none'&&Number(paint.strokeOpacity)!==0?parseFloat(paint.strokeWidth)||0:0;
  const fill=paint.fill!=='none'&&Number(paint.fillOpacity)!==0;
  if(!fill&&!stroke&&!['image','use'].includes(node.localName))continue;
  try{
   const transform=node.getScreenCTM();if(!transform)continue;
   const box=transformedInkBounds(node.getBBox(),inverse.multiply(transform),stroke);
   if(box&&(box.width>0||box.height>0))boxes.push(box);
  }catch{/* Hidden or not yet rendered nodes are retried when the panel opens. */}
 }
 if(!boxes.length)return null;
 const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
 return {x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};
}
export function fitMotifTile(tile,{measure=motifInkBounds}={}){
 const svg=tile.querySelector('svg');if(!svg)return false;
 const viewBox=motifTileViewBox(measure(svg));if(!viewBox)return false;
 svg.setAttribute('viewBox',viewBox.join(' '));svg.setAttribute('preserveAspectRatio','xMidYMid meet');
 tile.setAttribute('data-motif-fitted','');return true;
}
export function setMotifTilePending(tile,pending){
 if(pending){
  if(!tile.hasAttribute('data-motif-pending'))tile.setAttribute('data-motif-was-disabled',String(tile.disabled));
  tile.setAttribute('data-motif-pending','');tile.setAttribute('aria-busy','true');tile.disabled=true;
 }else if(tile.hasAttribute('data-motif-pending')){
  tile.disabled=tile.getAttribute('data-motif-was-disabled')==='true';
  for(const key of ['data-motif-pending','data-motif-was-disabled','aria-busy'])tile.removeAttribute(key);
 }
}
export async function installMotifTileFit(el){
 const root=el.shadowRoot;if(!root)return;
 const sheet=el.ownerDocument.createElement('style');sheet.textContent=await(await fetch('/configurator/variant-m/motif-tile-fit.css')).text();root.append(sheet);
 let scheduled=false;
 const refresh=()=>{scheduled=false;for(const tile of root.querySelectorAll(TILE)){
  // Empty lazy cards already reserve the same image area as their loaded peers.
  const pending=!tile.querySelector('svg')?.querySelector(ART);
  setMotifTilePending(tile,pending);if(!pending)fitMotifTile(tile);
 }};
 const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(refresh);}};
 const observer=new MutationObserver(records=>{
  if(records.some(r=>r.target.closest?.(TILE)||[...r.addedNodes].some(n=>n.matches?.(TILE)||n.querySelector?.(TILE))))schedule();
 });observer.observe(root,{childList:true,subtree:true});
 const resized=new ResizeObserver(schedule);for(const grid of root.querySelectorAll('[data-library-grid],[data-bestseller-grid]'))resized.observe(grid);
 el.addEventListener('gravuru-motif-library',schedule);root.addEventListener('click',schedule,true);refresh();
 return ()=>{observer.disconnect();resized.disconnect();el.removeEventListener('gravuru-motif-library',schedule);root.removeEventListener('click',schedule,true);sheet.remove();};
}
