import {objectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';
import {fitsSurface,transformedCorners} from './usability-model.mjs';
import {overlaps} from './customer-tools-model.mjs';

export function fitText(object,bounds,surface,min=4){
 if(fitsSurface(object,bounds,surface))return object.size;
 const scaled=size=>Object.fromEntries(Object.entries(bounds).map(([k,v])=>[k,v*size/object.size]));
 if(!fitsSurface(object,scaled(min),surface))return null;
 let low=min,high=object.size;for(let n=0;n<40;n++){const mid=(low+high)/2;if(fitsSurface(object,scaled(mid),surface))low=mid;else high=mid;}
 return Math.floor(low*100)/100;
}
// Chris 22./23.10.2026: Ein neues Element bekommt immer einen freien Platz. Bestehende Elemente werden nie
// verschoben. Suche in Stufen: (1) wie bisher Textzeilen unter vorhandenen Texten und drei Spalten von oben
// nach unten, (2) feines Raster über die ganze Gestaltungsfläche innerhalb des Randes, von der Mitte nach
// außen (freePosition), (3) schrittweise kleiner um PLACEMENT_STEP bis zur Mindestgröße (freePlacement).
// Erst wenn selbst bei Mindestgröße nichts frei ist, setzt der Aufrufer das Element mittig und meldet es.
export const PLACEMENT_STEP=0.9;
export const PLACEMENT_GAP_MM=2; // Abstand zu Nachbarn: Außenbox des neuen Elements um 2 mm vergrößert (wie bisher)
export const NO_FREE_SPACE_MESSAGE='Kein freier Platz – Element liegt über anderen.';
// Rasterschritt: ein Drittel der kleineren Elementseite, mindestens 2 mm, höchstens 5 mm.
export const placementGridStep=object=>Math.max(2,Math.min(5,Math.min(object.w,object.h)/3));
// Außenbox eines (gedrehten) Elements – schneller Vorfilter vor der genauen Überlagerungsprüfung (overlaps).
function outerBox(o){const a=(o.rotation||0)*Math.PI/180,w=Math.abs(o.w*Math.cos(a))+Math.abs(o.h*Math.sin(a)),h=Math.abs(o.w*Math.sin(a))+Math.abs(o.h*Math.cos(a));return {left:o.x-w/2,right:o.x+w/2,top:o.y-h/2,bottom:o.y+h/2};}
export function freePosition(object,surface,objects,obstacles=[]){
 const bounds={x:-object.w/2,y:-object.h/2,width:object.w,height:object.h};
 const candidates=[];const occupied=objects.filter(o=>o.id!==object.id&&!o.uxHidden);
 const blockers=[...occupied,...obstacles].map(o=>({o,box:outerBox(o)}));
 // Außenboxen zuerst; sind beide Elemente ungedreht, ist das bereits die genaue Antwort, sonst entscheidet overlaps (SAT).
 const blocked=next=>{const b=outerBox(next);return blockers.some(({o,box})=>b.left<box.right-1e-6&&b.right>box.left+1e-6&&b.top<box.bottom-1e-6&&b.bottom>box.top+1e-6&&(!(next.rotation||0)&&!(o.rotation||0)||overlaps(next,o)));};
 // Prefer text rows beneath existing text and then quiet areas from top to bottom.
 for(const other of occupied.filter(o=>o.type==='text'))candidates.push({x:other.x,y:other.y+other.h/2+object.h/2+3});
 for(let y=surface.y+object.h/2;y<=surface.y+surface.height-object.h/2;y+=Math.max(2,Math.min(6,object.h/2)))for(const x of [surface.x+surface.width/2,surface.x+object.w/2,surface.x+surface.width-object.w/2])candidates.push({x,y});
 // Stufe 2: feines Raster über die ganze Fläche (beide Ränder eingeschlossen), Kandidaten nahe der Mitte zuerst.
 const step=placementGridStep(object),cx=surface.x+surface.width/2,cy=surface.y+surface.height/2,grid=[];
 const axis=(from,to)=>{if(to<from-1e-6)return [];const list=[];for(let v=from;v<=to+1e-6;v+=step)list.push(v);if(to-list[list.length-1]>1e-6)list.push(to);return list;};
 const ys=axis(surface.y+object.h/2,surface.y+surface.height-object.h/2),xs=axis(surface.x+object.w/2,surface.x+surface.width-object.w/2);
 for(const y of ys)for(const x of xs)grid.push({x,y,d:(x-cx)**2+(y-cy)**2});
 grid.sort((a,b)=>a.d-b.d);
 // Rasterpunkte liegen bei rechteckiger Fläche und ungedrehtem Element konstruktionsbedingt innerhalb (keine Konturprüfung nötig).
 const gridFits=!surface.accepts&&!surface.geometry&&surface.shape!=='ellipse'&&surface.shape!=='contour'&&!(object.rotation||0);
 for(const {x,y} of grid)candidates.push({x,y,grid:gridFits});
 for(const p of candidates){const next={...object,x:p.x,y:p.y};if(!p.grid&&(!fitsSurface(next,bounds,surface)||surface.accepts&&!surface.accepts(next)||surface.geometry&&objectIssue(next,{geometry:surface.geometry})))continue;if(blocked({...next,w:next.w+PLACEMENT_GAP_MM,h:next.h+PLACEMENT_GAP_MM}))continue;return {x:p.x,y:p.y};}return null;
}
// Platz mit schrittweiser Verkleinerung: Rückgabe {x,y,scale} (scale 1 = Originalgröße) oder null, wenn
// selbst bei minScale (Mindestgröße / Originalgröße) kein Platz frei ist. minScale 1 = nicht verkleinern.
export function freePlacement(object,surface,objects,obstacles=[],{minScale=1,step=PLACEMENT_STEP}={}){
 const floor=Number.isFinite(minScale)?Math.min(1,Math.max(0.01,minScale)):1;
 const shrink=Number.isFinite(step)&&step>0&&step<1?step:PLACEMENT_STEP;
 for(let scale=1;;scale=Math.max(floor,scale*shrink)){
  const p=freePosition({...object,w:object.w*scale,h:object.h*scale},surface,objects,obstacles);
  if(p)return {...p,scale};
  if(scale<=floor+1e-9)return null;
 }
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
