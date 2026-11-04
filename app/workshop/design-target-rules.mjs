// Paket M: target checks read original artwork, before material rendering changes its ink.
import {parseDesignSvg,pathBounds,templateFit} from './katalog-convert.mjs';
import {familyProcess,geometryOf,holeless,ruleComplete} from './product-families.mjs';
import {flattenClosedSvgPath} from '../platform/sources/app/shared/models/contour-geometry.mjs';
import {holesFor} from '../platform/sources/app/shared/models/mounting-rules.mjs';
import {textsNearHoles,holeHintText} from '../platform/sources/app/shared/models/hole-proximity.mjs';
import {avoidMounting,touchesMounting,SIGN_PLACEMENT_FAMILIES} from '../configurator/variant-m/mounting-placement.mjs';
export const TARGET_MIN_TEXT_MM=3;
// Feine Linien bis ca. 0,3 mm sind gravierbar (Chris 01.11.2026, DESIGN-MASTER §8; ersetzt 0,5 mm vom 24.10.).
export const V2A_MIN_STROKE_MM=.3;
const rank={'passt':0,'prüfen':1,'passt nicht':2};
const n=v=>Number(v.toFixed(4));
// Neutraltöne sind keine Farbe: Corel exportiert „Schwarz“ als #1b1918 bzw. #231f20 (aus CMYK). Ein Ton gilt erst
// als farbig, wenn die RGB-Kanäle um mehr als NEUTRAL_TOLERANCE auseinanderliegen (Claude 25.10.: sonst sperrten
// 68 Edelstahl-Texte/Motive, darunter drei Startdesigns).
const NEUTRAL_TOLERANCE=16;
const NEUTRAL_NAMES=['none','currentcolor','transparent','black','white','gray','grey','silver','dimgray','dimgrey','darkgray','darkgrey','lightgray','lightgrey','gainsboro','whitesmoke'];
function chromatic(value){
 if(!value||NEUTRAL_NAMES.includes(String(value).toLowerCase()))return false;
 let raw=String(value).trim().toLowerCase(),rgb;
 if(/^#[a-f0-9]{3}$/.test(raw))rgb=raw.slice(1).split('').map(c=>parseInt(c+c,16));
 else if(/^#[a-f0-9]{6}$/.test(raw))rgb=[1,3,5].map(i=>parseInt(raw.slice(i,i+2),16));
 else if(/^rgba?\(/.test(raw)){const m=raw.match(/[\d.]+%?/g);if(m?.length>=3)rgb=m.slice(0,3).map(t=>t.endsWith('%')?Number.parseFloat(t)*2.55:Number(t));} // Prozentkanäle (0–100 %) auf 0–255 umrechnen (Issue #22)
 return rgb?Math.max(...rgb)-Math.min(...rgb)>NEUTRAL_TOLERANCE:true;
}
// A convex hull's minimum width is an upper bound for a filled contour's local
// thickness. Only a width below the limit proves a thin component; it never
// certifies that larger components have no finer internal details.
function narrowComponent(d){
 let points;try{points=flattenClosedSvgPath(d,{toleranceMm:.01});}catch{return null;}
 const unique=[...new Map(points.map(p=>[p.join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(unique.length<3)return null;
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const half=list=>{const h=[];for(const p of list){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};
 const hull=half(unique).slice(0,-1).concat(half([...unique].reverse()).slice(0,-1));
 if(hull.length>2000)return Math.min(...[0,1].map(axis=>Math.max(...hull.map(p=>p[axis]))-Math.min(...hull.map(p=>p[axis]))));
 let width=Infinity;
 for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)continue;let low=Infinity,high=-Infinity;for(const p of hull){const projection=(-dy*p[0]+dx*p[1])/len;low=Math.min(low,projection);high=Math.max(high,projection);}width=Math.min(width,high-low);}
 return Number.isFinite(width)?width:null;
}
export function designTargetRules(master,family,{scale=1,template=null}={}){
 const process=familyProcess(family),details=[];if(!process)return {status:'passt nicht',issues:['Verfahren der Familie ist offen.'],details:[{code:'process_missing',severity:'passt nicht'}]};
 const svg=typeof master.svg==='function'?master.svg():master.svgText;
 let parsed;try{parsed=parseDesignSvg(svg);}catch(error){return {status:'passt nicht',issues:['Designquelle: '+error.message],details:[{code:'source_invalid',severity:'passt nicht'}]};}
 const add=(code,severity,element,message,extra={})=>details.push({code,severity,element,message,...extra});
 const objects=new Map((template?.objects||[]).map(o=>[o.id,o]));
 for(const layer of parsed.layers){
  if(layer.kind==='guide')continue;
  const object=objects.get(layer.id),location=object?{xMm:object.x,yMm:object.y}:layer.bounds?{xMm:n((layer.bounds[0]+layer.bounds[2]/2)*scale),yMm:n((layer.bounds[1]+layer.bounds[3]/2)*scale)}:{xMm:n(layer.x*scale),yMm:n(layer.y*scale)};
  if(layer.kind==='text'){
   const size=object?.size??layer.size*scale;if(size<TARGET_MIN_TEXT_MM-.005)add('text_below_minimum','prüfen',layer.id,layer.id+': Schrift '+n(size)+' mm unter der Mindestgröße 3 mm.',{sizeMm:n(size),location});
  }
  // Ob ein Produkt Fotos hat, hängt am Produkt (Chris 24.10.): Ohne Fotoangabe der Familie (inklusive Fotos,
  // Aufpreis) ist ein Fotofeld zu prüfen, aber kein Ausschluss.
  if(layer.kind==='foto'&&process.tools?.photo===true&&family.photo===undefined)add('photo_family_open','prüfen',layer.id,layer.id+': Fotofeld – die Familie nennt keine Fotoangabe (inklusive Fotos, Aufpreis); bitte prüfen.',{location});
  if(process.method==='engraving'){
   // Fotogravur gehört zum Produktwissen (Chris 24.10.: Gravur auf Schiefer, Edelstahl, Acryl, Holz) und zum
   // Verfahrensprofil (tools.photo). Gesperrt ist ein Fotofeld nur, wenn das Verfahren kein Foto vorsieht –
   // dieselbe Regel wie katalogDesignToTemplate. Farbige Vektoren bleiben unten gesperrt.
   if(layer.kind==='foto'&&process.tools?.photo!==true)add('photo_on_engraving','passt nicht',layer.id,layer.id+': Fotofeld, aber das Verfahren „'+process.id+'“ sieht kein Foto vor.',{location});
   const paints=layer.pathAttributes?.flatMap(a=>[a.fill,a.stroke])??[layer.fill];if(paints.some(chromatic))add('color_on_engraving','passt nicht',layer.id,layer.id+': Farbige Elemente sind für dieses Gravurziel nicht passend.',{location});
  }
  if(process.id!=='steel-engraving'||!['motiv','deko'].includes(layer.kind))continue;
  for(let i=0;i<(layer.paths?.length||0);i++){
   const attrs=layer.pathAttributes?.[i]||{},path=layer.paths[i],bounds=pathBounds(path),factor=object&&layer.bounds?.[2]>0?object.w/layer.bounds[2]:scale;
   if(attrs.stroke&&attrs.stroke!=='none'&&attrs.strokeMm>0&&attrs.strokeMm*factor<V2A_MIN_STROKE_MM-.00001)add('v2a_thin_stroke','prüfen',layer.id,layer.id+' · Pfad '+(i+1)+': V2A-Linie '+n(attrs.strokeMm*factor)+' mm unter 0,3 mm – prüfen.',{pathIndex:i,widthMm:n(attrs.strokeMm*factor),location});
   if(attrs.fill==='none')continue;
   const parts=path.match(/[Mm][^Mm]*/g)||[];
   for(let j=0;j<parts.length;j++){if(!/[zZ]\s*$/.test(parts[j]))continue;const width=narrowComponent(parts[j]);if(width!==null&&width>0&&(width+.02)*factor<V2A_MIN_STROKE_MM)add('v2a_thin_contour','prüfen',layer.id,layer.id+' · Pfad '+(i+1)+'/'+(j+1)+': Motivkontur höchstens '+n((width+.02)*factor)+' mm breit, unter 0,3 mm – prüfen.',{pathIndex:i,componentIndex:j,widthUpperBoundMm:n((width+.02)*factor),location,boundsMm:bounds.map(v=>n(v*factor))});}
  }
 }
 const issues=details.map(d=>d.message),status=details.reduce((s,d)=>rank[d.severity]>rank[s]?d.severity:s,'passt');return {status,issues,details};
}
export function assessDesignTarget({master,template,family,size,fonts={},motifs=[]}){
 const fit=templateFit(template,family,size,fonts,{motifs}),rules=designTargetRules(master,family,{scale:template.katalog?.scale??1,template});
 const geometry=geometryOf(family,size),holeDetails=[];
 for(const id of size.mounting||[]){const rule=family.mountingRules.find(r=>r.id===id);if(!rule||holeless(rule)||geometry.shape!=='contour'&&!ruleComplete(rule))continue;
  const holes=geometry.shape==='contour'?geometry.holesMm.map(h=>({x:h.x,y:h.y,diameter:h.diameterMm})):holesFor(geometry,rule);
  let near=textsNearHoles(template,{geometry:{...geometry,holes}},fonts,family.designArea.keepoutMm??0);
  // Chris, 04.11.2026: Wo der Konfi beim Wechsel auf Bohrung/Schrauben selbst ausweicht (kleiner machen
  // und einrücken, ENTSCHEIDUNGEN 3.40), kein Hinweis mehr – nur noch, wenn auch das Ausweichen nicht reicht.
  if(near.length&&SIGN_PLACEMENT_FAMILIES.includes(family.id)){
   // Hinweis bleibt für alles, was nach dem Ausweichen noch am Loch liegt (nicht lösbar oder gesperrt).
   let still=null;
   try{const profile={geometry:{...geometry,holes},mountingPreview:{keepoutMm:family.designArea.keepoutMm??0}},resources={fonts,motifs},placed=avoidMounting(template.objects||[],profile,resources);
    still=new Set([...placed.unresolved,...placed.objects.filter(o=>touchesMounting(o,profile,resources)).map(o=>o.id)]);}catch{}
   if(still)near=near.filter(item=>still.has(item.id));
  }
  for(const item of near)holeDetails.push({code:'text_near_hole',severity:'prüfen',element:item.id,mounting:id,location:{xMm:item.hole.x,yMm:item.hole.y},message:rule.label+': '+holeHintText([item])});
 }
 const details=[...rules.details,...holeDetails],status=[fit.status,rules.status,...holeDetails.map(d=>d.severity)].reduce((a,b)=>rank[a]>=rank[b]?a:b,'passt');
 return {status,issues:[...new Set([...fit.issues,...rules.issues,...holeDetails.map(d=>d.message)])],details};
}
