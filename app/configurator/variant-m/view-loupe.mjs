// A display-only copy of the actual material/artwork. No model/render/export calls.
export const LOUPE_SIZE=110,LOUPE_SCALE=3;
export function loupePosition(point,viewport){
 const half=LOUPE_SIZE/2,pad=6;let x=point.x,y=point.y-half-50;
 if(y<half+pad){y=point.y;x=point.x+half+50<viewport.width-half-pad?point.x+half+50:point.x-half-50;}
 return {x:Math.max(half+pad,Math.min(viewport.width-half-pad,x)),y:Math.max(half+pad,Math.min(viewport.height-half-pad,y))};
}
let serial=0;
export function cloneLoupeLayers(stage){
 const rect=stage.getBoundingClientRect(),copy=document.createElement('div'),suffix='-loupe-'+(++serial);copy.className='ux-loupe-art';copy.setAttribute('aria-hidden','true');copy.inert=true;
 for(const source of stage.children){
  if(!source.matches('.acryl-backdrop,.plate-holder,.acryl-base')||source.hidden)continue;
  const node=source.cloneNode(true),b=source.getBoundingClientRect(),css=source.ownerDocument.defaultView.getComputedStyle(source);
  node.className='ux-loupe-layer';
  node.querySelectorAll('.object-controls,.resize-handle,.rotate-object,.dimension-x,.dimension-y,[data-resize],rect[stroke="#16845d"],[data-multi-outlines],.ux-alignment-guides,.guided-alignment,.center-guides,[data-workflow-guides],[data-ux-photo-hint]').forEach(n=>n.remove());
  for(const n of node.querySelectorAll('[data-direct-active]'))n.style.visibility='';
  const ids=new Map();for(const n of node.querySelectorAll('[id]')){ids.set(n.id,n.id+suffix);n.id+=suffix;}
  for(const n of [node,...node.querySelectorAll('*')]){for(const a of [...n.attributes]){let value=a.value;for(const [id,next]of ids){value=value.replaceAll('url(#'+id+')','url(#'+next+')');if(value==='#'+id)value='#'+next;}if(value!==a.value)n.setAttribute(a.name,value);}for(const a of ['data-object','data-direct-active','data-ux-namespace','tabindex','role'])n.removeAttribute(a);}
  const svg=node.querySelector('svg.scene');if(svg){svg.classList.remove('scene');svg.style.cssText='display:block;width:100%!important;height:100%!important;max-height:none!important;background:transparent;overflow:visible';}
  node.style.cssText='position:absolute!important;left:'+(b.left-rect.left)+'px!important;top:'+(b.top-rect.top)+'px!important;width:'+b.width+'px!important;height:'+b.height+'px!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;transform:none!important;z-index:'+css.zIndex+';pointer-events:none';copy.append(node);
 }
 copy.style.cssText='position:absolute;width:'+rect.width+'px;height:'+rect.height+'px;transform-origin:0 0;pointer-events:none';return copy;
}
export function installDragLoupe({el,r,stage}){
 const lens=document.createElement('div');lens.className='ux-drag-loupe';lens.hidden=true;lens.setAttribute('aria-hidden','true');stage.append(lens);
 el.uxDragLens=point=>{
  if(!point||!['move','scale'].includes(point.kind)){lens.hidden=true;lens.replaceChildren();return;}
  const b=stage.getBoundingClientRect(),p={x:point.clientX-b.left,y:point.clientY-b.top},center=loupePosition(p,b),copy=cloneLoupeLayers(stage);
  copy.style.left=((LOUPE_SIZE/2-3)-p.x*LOUPE_SCALE)+'px';copy.style.top=((LOUPE_SIZE/2-3)-p.y*LOUPE_SCALE)+'px';copy.style.transform='scale('+LOUPE_SCALE+')';
  lens.style.left=(center.x-LOUPE_SIZE/2)+'px';lens.style.top=(center.y-LOUPE_SIZE/2)+'px';lens.replaceChildren(copy);lens.hidden=false;
 };
 window.addEventListener('pagehide',()=>el.uxDragLens(null),{once:true});return lens;
}
