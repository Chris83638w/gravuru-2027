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
// Designwechsel (Chris 21.10.2026): mit wandern nur Name und Lebensdaten – und nur, wenn der Kunde sie
// geändert hat. Sprüche gehören zum Design und bleiben dort. Selbst angelegte Texte bleiben erhalten.
// Vor-/Nachname getrennt ↔ ein Namensfeld und „*Datum“/„†Datum“ ↔ „Datum - Datum“ werden zugeordnet.
const family=key=>String(key||'').replace(/-\d+$/,'');
const partNo=key=>Number(/-(\d+)$/.exec(key||'')?.[1]||1);
const DESIGN_BOUND=new Set(['spruch','slogan']);
const FOLLOW_FAMILY=new Set(['name','daten']);
const sameText=(a,b)=>String(a??'').trim()===String(b??'').trim();
const DATE_TOKEN=/\d{1,2}\.\s?(?:\d{1,2}\.|[A-Za-zÄÖÜäöüß]{3,}\.?)\s?\d{2,4}/g;
export function changedCustomerTexts(objects,template){
 const tpl=template?.objects||[],list=(objects||[]).filter(o=>o.type==='text'&&!o.uxHidden&&String(o.text??'').trim());
 const rawOf=o=>tpl.find(t=>t.id===o.id)||(o.fieldKey?tpl.find(t=>t.type==='text'&&t.fieldKey===o.fieldKey):undefined);
 const changed=new Set(list.filter(o=>{const raw=rawOf(o);if(!raw)return true;if(!o.fieldKey||DESIGN_BOUND.has(family(o.fieldKey)))return false;return !sameText(o.text,raw.text);}));
 // Wurde ein Teil des Namens bzw. der Daten geändert, zählt das ganze Feld (auch der unveränderte Nachname).
 for(const fam of FOLLOW_FAMILY)if([...changed].some(o=>family(o.fieldKey)===fam))for(const o of list)if(family(o.fieldKey)===fam)changed.add(o);
 return list.filter(o=>changed.has(o));
}
function splitName(full,count){
 if(count===1)return [full];
 const words=full.split(/\s+/).filter(Boolean);
 if(words.length<count)return null;
 return [...words.slice(0,count-1),words.slice(count-1).join(' ')];
}
function mapDates(fromTexts,to){
 const tokens=fromTexts.flatMap(t=>String(t).match(DATE_TOKEN)||[]);
 const slots=to.map(o=>(String(o.text).match(DATE_TOKEN)||[]).length);
 if(tokens.length&&slots.reduce((a,b)=>a+b,0)===tokens.length){let i=0;return to.map(o=>String(o.text).replace(DATE_TOKEN,()=>tokens[i++]));}
 if(to.length===1)return [fromTexts.map(t=>String(t).trim()).join(' - ')];
 return null;
}
export function transferTexts(source,target){
 const remaining=source.filter(o=>o.type==='text'&&o.text?.trim()).map(o=>({...o})),used=new Set();
 const editable=target.filter(o=>o.type==='text'&&!o.technicalLocked&&o.customerEditable!==false),done=new Set();
 const parts=(list,fam)=>list.filter(o=>family(o.fieldKey)===fam).sort((a,b)=>partNo(a.fieldKey)-partNo(b.fieldKey));
 for(const fam of FOLLOW_FAMILY){
  const from=parts(remaining,fam),to=parts(editable,fam);
  if(!from.length||!to.length||from.length===to.length&&fam==='name')continue;
  if(new Set(from.map(o=>o.fieldKey)).size!==from.length||new Set(to.map(o=>o.fieldKey)).size!==to.length)continue; // mehrdeutig: wie bisher melden
  const texts=fam==='name'?splitName(from.map(o=>o.text.trim()).join(' '),to.length):mapDates(from.map(o=>o.text),to);
  if(!texts)continue;
  to.forEach((o,i)=>{o.text=texts[i];o.uxCustomerText=true;done.add(o);});
  for(const o of from)used.add(o.id);
 }
 for(const o of editable){
  if(done.has(o))continue;
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
