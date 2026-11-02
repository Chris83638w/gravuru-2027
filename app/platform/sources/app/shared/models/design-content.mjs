import {DOORBELL_SCHEMA,doorbellLayoutIssue} from '../../../../../configurator/variant-m/doorbell-selection.mjs';
import {setTextSize} from './text-paths.mjs';
import {PROCESSING_PROFILES} from './processing-profiles.mjs';
import {contourContainsPoint,contourContainsPolygon,contourObjectCorners,surfaceGeometry,ellipseEdgeDistance} from './contour-geometry.mjs';
import {embeddedMotifFits} from './embedded-motif-fit.mjs';
import {textOutlineFits} from './text-outline-fit.mjs';
import {gunzipSync,strFromU8} from '../vendor/fflate-0.8.3.mjs';
// These limits match the supported customer text/motif draft format.
// maxDesigns: Vorlagen je Produkt (Chris 23.10.2026: 60 → 100, wie MAX_FORM_DESIGNS in der Werkstatt).
export const DESIGN_LIMITS=Object.freeze({maxDesigns:100,maxObjects:20,maxTextLength:180,maxRotation:360,minFontSize:1,maxFontSize:100,maxIdLength:120});
export const SUPPORTED_FONT_IDS=Object.freeze(['Montserrat','Lora','Lora Italic','Dancing Script','Source Code Pro','Ubuntu','Nunito','Open Sans','Raleway','Poppins','Roboto Condensed','Josefin Sans','Playfair Display','Libre Baskerville','Cormorant Garamond','Merriweather','Cinzel','Caveat','Kalam','Patrick Hand','Sacramento','Allura','Great Vibes','Parisienne','Pacifico','Amatic SC','Lobster','Oswald','Cutive Mono','Roboto Mono']);
export const validContentId=id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(id);
const EPSILON=.000001;
function inRoundedRect(x,y,width,height,radius,inset=0){
 const right=width-inset,bottom=height-inset,r=Math.max(0,radius-inset);
 if(x<inset-EPSILON||x>right+EPSILON||y<inset-EPSILON||y>bottom+EPSILON)return false;
 const dx=Math.max(inset+r-x,0,x-(right-r)),dy=Math.max(inset+r-y,0,y-(bottom-r));
 return dx*dx+dy*dy<=r*r+EPSILON;
}
export function validateGeometryHoles(profile){
 const {width,height,shape,cornerRadiusMm=0,holes}=profile.geometry;
 if(!Array.isArray(holes)||holes.length>40)throw Error('Bitte das Bohrbild prüfen.');
 for(const hole of holes){
  if(!hole||![hole.x,hole.y,hole.diameter].every(Number.isFinite)||hole.diameter<=0)throw Error('Bitte das Bohrbild prüfen.');
  const r=hole.diameter/2;
  if(shape==='contour'){
   if(!contourContainsPoint(profile.geometry,hole.x,hole.y,{marginMm:r,holes:false}))throw Error('Bohrloch ragt über die Produktkontur hinaus.');
  }else if(shape==='ellipse'){
   const x=hole.x-width/2,y=hole.y-height/2,a=width/2,b=height/2;
   if((x/a)**2+(y/b)**2>1||ellipseEdgeDistance(x,y,a,b)+EPSILON<r)throw Error('Bohrloch ragt über die ovale Produktkontur hinaus.');
  }else if(!inRoundedRect(hole.x,hole.y,width,height,cornerRadiusMm,r))throw Error('Bohrloch ragt über die Produktkontur hinaus.');
 }
}
export const escapeXml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const categories=designs=>[...new Set(designs.map(d=>d.category||'Ohne Kategorie'))].sort((a,b)=>a.localeCompare(b,'de'));
export const collections=designs=>[...new Set(designs.flatMap(d=>d.collections||[]))].sort((a,b)=>a.localeCompare(b,'de'));
export function filteredDesigns(designs,{search='',category='',collection=''}={}){return designs.filter(d=>(!category||(d.category||'Ohne Kategorie')===category)&&(!collection||(d.collections||[]).includes(collection))&&[d.name,d.category,...(d.collections||[])].join(' ').toLocaleLowerCase('de').includes(search.trim().toLocaleLowerCase('de')));}
// Validate against an already oriented geometry. UI placement and preview use
// this low-level function; they must not mirror from surfaceId a second time.
function artworkMargin(profile){
 const processing=PROCESSING_PROFILES.find(p=>p.id===(profile.processing?.profileId??`${profile.material?.kind}-engraving`));
 return profile.geometry.safeMarginMm??(processing?.method==='engraving'?0:2);
}
export function objectIssue(o,profile){
 if(!o||!['x','y','w','h','rotation'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0||Math.abs(o.rotation)>DESIGN_LIMITS.maxRotation)return 'Ungültige Maße.';
 if(profile.doorbellSchema===DOORBELL_SCHEMA)return doorbellLayoutIssue(o,profile);
 const a=o.rotation*Math.PI/180,w=Math.abs(o.w*Math.cos(a))+Math.abs(o.h*Math.sin(a)),h=Math.abs(o.w*Math.sin(a))+Math.abs(o.h*Math.cos(a)),b=profile.geometry.bell;
 const doorbell=profile.kind==='layered-doorbell',width=doorbell?160:profile.geometry.width,height=doorbell?280:profile.geometry.height,margin=doorbell?10:artworkMargin(profile);
 // A merchant-fixed template canvas drawn exactly in plate size (prepared 1:1
 // import) is clipped by the plate contour itself: transparent corners of an
 // oval or rounded plate are not ink. Only without margin; never customer content.
 if(!doorbell&&profile.geometry.shape!=='contour'&&margin<=0&&o.type==='motif'&&o.acrylicFixed===true&&o.templateOrigin===true&&!o.rotation&&[o.x-width/2,o.y-height/2,o.w-width,o.h-height].every(v=>Math.abs(v)<.01))return '';
 if(o.x-w/2<margin-.001||o.x+w/2>width-margin+.001||o.y-h/2<margin-.001||o.y+h/2>height-margin+.001)return 'Element ragt über die Gestaltungsfläche hinaus.';
 if(b&&Math.min(o.x+w/2,b.x+b.width)-Math.max(o.x-w/2,b.x)>.1&&Math.min(o.y+h/2,b.y+b.height)-Math.max(o.y-h/2,b.y)>.1)return 'Element liegt unter der Klingel.';
 if(!doorbell&&profile.geometry.shape==='contour'){
  const corners=contourObjectCorners(o);
  // Artwork stays complete across drill holes; physical hole validation is separate.
  if(!contourContainsPolygon(profile.geometry,corners,{marginMm:margin,holes:false}))return 'Element ragt über die Kontur-Gestaltungsfläche hinaus.';
 }
 // An ellipse with reduced axes is not a constant-distance inset. Check the
 // actual corner-to-contour distance to preserve the requested margin in mm.
 if(profile.geometry.shape==='ellipse')for(const [x,y] of [[-1,-1],[-1,1],[1,-1],[1,1]]){const px=o.x+x*o.w/2*Math.cos(a)-y*o.h/2*Math.sin(a)-width/2,py=o.y+x*o.w/2*Math.sin(a)+y*o.h/2*Math.cos(a)-height/2;if((px/(width/2))**2+(py/(height/2))**2>1+EPSILON||ellipseEdgeDistance(px,py,width/2,height/2)+EPSILON<margin)return 'Element ragt über die ovale Gestaltungsfläche hinaus.';}
 if(!doorbell&&profile.geometry.shape!=='ellipse'&&profile.geometry.cornerRadiusMm>margin)for(const [x,y] of [[-1,-1],[-1,1],[1,-1],[1,1]]){const px=o.x+x*o.w/2*Math.cos(a)-y*o.h/2*Math.sin(a),py=o.y+x*o.w/2*Math.sin(a)+y*o.h/2*Math.cos(a);if(!inRoundedRect(px,py,width,height,profile.geometry.cornerRadiusMm,margin))return 'Element ragt über die gerundete Gestaltungsfläche hinaus.';}
 // Photos and other artwork may cross a drill hole. A physical second plate
 // blocking screw access is a separate mounting/plate-assembly constraint.
 return '';
}
// Validate an object against the original product profile. Front is unchanged;
// back uses the same physical reflection as preview and production.
export function surfaceObjectIssue(object,profile,{motifs=[],fonts}={}){
 const oriented=object?.surfaceId==='back'?{...profile,geometry:surfaceGeometry(profile.geometry,'back')}:profile;
 const issue=objectIssue(object,oriented);
 // A passing box remains the cheap prefilter. Only a geometric failure of a
 // text or known embedded motif may be replaced by its actual painted paths.
 if(issue&&profile.kind!=='layered-doorbell'&&profile.doorbellSchema!==DOORBELL_SCHEMA&&['Element ragt über die Gestaltungsfläche hinaus.','Element ragt über die ovale Gestaltungsfläche hinaus.','Element ragt über die Kontur-Gestaltungsfläche hinaus.','Element ragt über die gerundete Gestaltungsfläche hinaus.'].includes(issue)){
  const geometry={...oriented.geometry,safeMarginMm:artworkMargin(oriented),holes:[]};
  if(textOutlineFits(object,geometry,fonts)===true)return '';
  const resources=typeof motifs==='function'?motifs():motifs;
  if(embeddedMotifFits(object,{...oriented.geometry,safeMarginMm:artworkMargin(oriented),holes:[]},resources.find(m=>m.key===object?.motif))===true)return '';
 }
 return issue;
}
export function validateDesignContent(d,{universal=false,extraFontIds=[]}={}){
 if(!d||!validContentId(d.id))throw Error('Jedes Design benötigt eine gültige Kennung.');
 if(!Array.isArray(d.objects)||!d.objects.length||d.objects.length>DESIGN_LIMITS.maxObjects)throw Error('Jedes Design braucht 1 bis 20 Elemente.');
 if(d.category!==undefined&&(typeof d.category!=='string'||d.category.length>80))throw Error('Kategorie: höchstens 80 Zeichen.');
 if(d.collections!==undefined&&(!Array.isArray(d.collections)||d.collections.length>12||d.collections.some(c=>typeof c!=='string'||!c.trim()||c.length>80)||new Set(d.collections).size!==d.collections.length))throw Error('Ungültige Designkollektionen.');
 const ids=new Set(),fieldKeys=new Set(),customerFieldIds=new Set();
 for(const o of d.objects){
  if(!o||!validContentId(o.id)||ids.has(o.id))throw Error('Jedes Element benötigt eine gültige, eindeutige Kennung.');
  ids.add(o.id);
  for(const [key,seen] of [['fieldKey',fieldKeys],['customerFieldId',customerFieldIds]])if(o[key]!==undefined){if(!validContentId(o[key])||seen.has(o[key]))throw Error('Jedes Kundenfeld benötigt eine gültige, eindeutige Kennung.');seen.add(o[key]);}
  if(o.fontGroupId!==undefined&&!validContentId(o.fontGroupId))throw Error('Ungültige Schriftgruppenkennung.');
  if(!(universal?['text','motif','motif-raster','photoSlot','image','graphic']:['text','motif','photoSlot']).includes(o.type))throw Error('Nicht unterstütztes Vorlagenelement.');
  const name=o.type==='text'&&typeof o.text==='string'?'Text „'+o.text.slice(0,32)+'“':'Element '+(d.objects.indexOf(o)+1);
  if(!['x','y'].every(k=>Number.isFinite(o[k])))throw Error(name+': Position ist ungültig.');
  if(!Number.isFinite(o.w)||!Number.isFinite(o.h)||o.w<=0||o.h<=0)throw Error(name+': Breite und Höhe müssen größer als 0 mm sein.');
  if(!Number.isFinite(o.rotation)||Math.abs(o.rotation)>DESIGN_LIMITS.maxRotation)throw Error(name+': Drehung muss zwischen −360° und 360° liegen.');
  if(o.type==='text'){
   if(typeof o.text!=='string'||!o.text.trim()||o.text.length>DESIGN_LIMITS.maxTextLength||/[\u0000-\u0009\u000b-\u001f\u007f]/.test(o.text))throw Error('Text: 1 bis 180 Zeichen ohne Steuerzeichen.');
   if(!SUPPORTED_FONT_IDS.includes(o.font)&&!extraFontIds.includes(o.font))throw Error('Bitte eine vorhandene Schriftart auswählen.');
   if(!Number.isFinite(o.size)||o.size<DESIGN_LIMITS.minFontSize||o.size>DESIGN_LIMITS.maxFontSize)throw Error('Schriftgröße: 1 bis 100 mm.');
   if(o.bold!==undefined&&typeof o.bold!=='boolean')throw Error('Ungültiger Schriftschnitt.');
  }
  if(o.letterSpacing!==undefined&&(o.type!=='text'||!Number.isFinite(o.letterSpacing)||o.letterSpacing< -10||o.letterSpacing>10))throw Error('Ungültiger Zeichenabstand.');
  if(o.lineHeight!==undefined&&(o.type!=='text'||!Number.isFinite(o.lineHeight)||o.lineHeight<=0||o.lineHeight>1000))throw Error('Ungültiger Zeilenabstand.');
  if(o.textAnchor!==undefined&&(o.type!=='text'||!['start','middle','end'].includes(o.textAnchor)))throw Error('Ungültige Textausrichtung.');
  if((o.photoMaskAssetId!==undefined&&!/^[a-f0-9]{64}$/.test(o.photoMaskAssetId))||(o.photoShape==='template'&&!o.photoMaskAssetId))throw Error('Ungültige Original-Fotomaske.');
  if(o.photoShape==='arch'&&o.h<o.w/2)throw Error('Bogenfoto braucht mindestens eine halbe Breite als Höhe.');
  if(o.customerEditable!==undefined&&typeof o.customerEditable!=='boolean')throw Error('Ungültige Ebenenfreigabe.');
  if(o.type==='motif'&&(typeof o.motif!=='string'||!/^[\w-]{1,120}$/.test(o.motif)))throw Error('Motivkennung fehlt.');
  if(o.type==='photoSlot'&&(!['rect','circle','ellipse','arch','template'].includes(o.photoShape)||!/^photo-[\w-]+$/.test(o.fieldKey)||typeof o.required!=='boolean'))throw Error('Ungültiger Fotobereich.');
  if(o.type==='photoSlot'&&d.objects.filter(v=>v.fieldKey===o.fieldKey).length!==1)throw Error('Jeder Fotobereich benötigt eine eindeutige Kennung.');
 }
}
let libraryJob;
export function loadMotifLibrary(){
 if(!libraryJob)libraryJob=(async()=>{
  const cdn='https://gravuru-design.myshopify.com/cdn/shop/t/40/assets/';
  const parts=await Promise.all(Array.from({length:21},async(_,i)=>{const r=await fetch(cdn+'gravuru-entwurf-motive-'+String(i).padStart(2,'0')+'.txt');if(!r.ok)throw Error('Motivbibliothek konnte nicht geladen werden.');return r.text();}));
  const entries=JSON.parse(strFromU8(gunzipSync(Uint8Array.from(atob(parts.join('')),c=>c.charCodeAt(0)))));
  if(!Array.isArray(entries)||entries.length!==703)throw Error('Motivbibliothek unvollständig.');
  return entries.map(e=>({...e,svgFragment:safeVector(e.svgFragment)}));
 })().catch(e=>{libraryJob=null;throw e;});
 return libraryJob;
}
export function safeVector(svg){
 const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
 if(doc.querySelector('parsererror'))throw Error('Ungültige Motivdatei.');
 const tags=new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','title','desc']);
 const attrs=new Set(['xmlns','viewBox','width','height','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','d','points','transform','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-rule','clip-rule','opacity','fill-opacity','stroke-opacity','preserveAspectRatio']);
 for(const n of [...doc.querySelectorAll('*')]){if(!tags.has(n.localName)){n.remove();continue;}for(const a of [...n.attributes])if(!attrs.has(a.name)||/url\s*\(|javascript:|data:|https?:/i.test(a.value)&&a.name!=='xmlns')n.removeAttribute(a.name);}
 return new XMLSerializer().serializeToString(doc.documentElement);
}
export function transformedObject(before,gesture,point,fonts,measure){
 const o=structuredClone(before);
 if(gesture.kind==='move'){o.x+=point.x-gesture.start.x;o.y+=point.y-gesture.start.y;}
 else{const angle=-o.rotation*Math.PI/180,x=(point.x-o.x)*Math.cos(angle)-(point.y-o.y)*Math.sin(angle),y=(point.x-o.x)*Math.sin(angle)+(point.y-o.y)*Math.cos(angle);
  // Enlarged hit targets need a relative gesture: grabbing off-centre must not jump.
  const start=gesture.start,dx=start?.x-o.x,dy=start?.y-o.y,sx=dx*Math.cos(angle)-dy*Math.sin(angle),sy=dx*Math.sin(angle)+dy*Math.cos(angle),norm=sx*sx+sy*sy;
  const relative=norm>1e-8?(x*sx+y*sy)/norm:Math.max(Math.abs(x)*2/o.w,Math.abs(y)*2/o.h);
  const factor=Math.max(.05,Math.min(20,relative));o.w*=factor;o.h*=factor;if(o.type==='text'){setTextSize(o,Math.max(1,Math.min(100,o.size*factor)));measure(o,fonts);}}
 for(const k of ['x','y','w','h','size'])if(Number.isFinite(o[k]))o[k]=Math.round(o[k]*1000)/1000;
 return o;
}


