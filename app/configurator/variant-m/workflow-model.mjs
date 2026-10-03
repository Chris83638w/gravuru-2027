import {fitsSurface,transformedCorners} from './usability-model.mjs';
import {overlaps} from './customer-tools-model.mjs';

export function fitText(object,bounds,surface,min=4){
 if(fitsSurface(object,bounds,surface))return object.size;
 const scaled=size=>Object.fromEntries(Object.entries(bounds).map(([k,v])=>[k,v*size/object.size]));
 if(!fitsSurface(object,scaled(min),surface))return null;
 let low=min,high=object.size;for(let n=0;n<40;n++){const mid=(low+high)/2;if(fitsSurface(object,scaled(mid),surface))low=mid;else high=mid;}
 return Math.floor(low*100)/100;
}
export function freePosition(object,surface,objects,obstacles=[]){
 const bounds={x:-object.w/2,y:-object.h/2,width:object.w,height:object.h};
 const candidates=[];const occupied=objects.filter(o=>o.id!==object.id&&!o.uxHidden);
 // Prefer text rows beneath existing text and then quiet areas from top to bottom.
 for(const other of occupied.filter(o=>o.type==='text'))candidates.push({x:other.x,y:other.y+other.h/2+object.h/2+3});
 for(let y=surface.y+object.h/2;y<=surface.y+surface.height-object.h/2;y+=Math.max(2,Math.min(6,object.h/2)))for(const x of [surface.x+surface.width/2,surface.x+object.w/2,surface.x+surface.width-object.w/2])candidates.push({x,y});
 for(const p of candidates){const next={...object,...p};if(!fitsSurface(next,bounds,surface))continue;if([...occupied,...obstacles].some(o=>overlaps({...next,w:next.w+2,h:next.h+2},o)))continue;return p;}return null;
}
export function transferTexts(source,target){
 const remaining=source.filter(o=>o.type==='text'&&o.text?.trim()).map(o=>({...o})),used=new Set();
 for(const o of target.filter(o=>o.type==='text'&&!o.technicalLocked&&o.customerEditable!==false)){
  const candidates=remaining.filter(s=>!used.has(s.id)&&s.fieldKey&&s.fieldKey===o.fieldKey);
  if(candidates.length===1){o.text=candidates[0].text;o.uxCustomerText=true;used.add(candidates[0].id);}
 }
 return remaining.filter(o=>!used.has(o.id));
}
export function alignGroup(objects,ids,mode,surface){
 const chosen=objects.filter(o=>ids.includes(o.id)&&o.type==='text'&&!o.uxLocked&&!o.uxHidden);
 if(!chosen.length)return;
 const ext=o=>transformedCorners(o,{x:-o.w/2,y:-o.h/2,width:o.w,height:o.h}).map(p=>p.x);
 const anchor=mode==='center'?surface.x+surface.width/2:chosen.length>1?(mode==='left'?Math.min(...chosen.flatMap(ext)):Math.max(...chosen.flatMap(ext))):(mode==='left'?surface.x:surface.x+surface.width);
 for(const o of chosen){const xs=ext(o);o.x+=anchor-(mode==='left'?Math.min(...xs):mode==='right'?Math.max(...xs):o.x);}
}
