import {gunzipSync,strFromU8} from '../vendor/fflate-0.8.3.mjs';
// These limits match the supported customer text/motif draft format.
export const DESIGN_LIMITS=Object.freeze({maxObjects:20,maxTextLength:180,maxRotation:360,minFontSize:1,maxFontSize:100,maxIdLength:120});
export const SUPPORTED_FONT_IDS=Object.freeze(['Montserrat','Lora','Lora Italic','Dancing Script','Source Code Pro','Ubuntu','Nunito','Open Sans','Raleway','Poppins','Roboto Condensed','Josefin Sans','Playfair Display','Libre Baskerville','Cormorant Garamond','Merriweather','Cinzel','Caveat','Kalam','Patrick Hand','Sacramento','Allura','Great Vibes','Parisienne','Pacifico','Amatic SC','Lobster','Oswald','Cutive Mono','Roboto Mono']);
export const validContentId=id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(id);
const EPSILON=.000001;
function inRoundedRect(x,y,width,height,radius,inset=0){
 const right=width-inset,bottom=height-inset,r=Math.max(0,radius-inset);
 if(x<inset-EPSILON||x>right+EPSILON||y<inset-EPSILON||y>bottom+EPSILON)return false;
 const dx=Math.max(inset+r-x,0,x-(right-r)),dy=Math.max(inset+r-y,0,y-(bottom-r));
 return dx*dx+dy*dy<=r*r+EPSILON;
}
// Exact closest distance to an ellipse for a point inside it. Bisection solves
// the normal on the closest quadrant; the axis case avoids the singularity.
function ellipseEdgeDistance(x,y,a,b){
 x=Math.abs(x);y=Math.abs(y);
 if(a<b){[a,b]=[b,a];[x,y]=[y,x];}
 if(Math.abs(a-b)<EPSILON)return a-Math.hypot(x,y);
 if(y<EPSILON){const z=a*x/(a*a-b*b);return z<1?Math.hypot(a*z-x,b*Math.sqrt(1-z*z)):a-x;}
 let low=-b*b,high=0;
 for(let i=0;i<90;i++){const t=(low+high)/2,v=(a*x/(t+a*a))**2+(b*y/(t+b*b))**2;if(v>1)low=t;else high=t;}
 const t=(low+high)/2;
 return Math.hypot(a*a*x/(t+a*a)-x,b*b*y/(t+b*b)-y);
}
export function validateGeometryHoles(profile){
 const {width,height,shape,cornerRadiusMm=0,holes}=profile.geometry;
 if(!Array.isArray(holes)||holes.length>40)throw Error('Bitte das Bohrbild prüfen.');
 for(const hole of holes){
  if(!hole||![hole.x,hole.y,hole.diameter].every(Number.isFinite)||hole.diameter<=0)throw Error('Bitte das Bohrbild prüfen.');
  const r=hole.diameter/2;
  if(shape==='ellipse'){
   const x=hole.x-width/2,y=hole.y-height/2,a=width/2,b=height/2;
   if((x/a)**2+(y/b)**2>1||ellipseEdgeDistance(x,y,a,b)+EPSILON<r)throw Error('Bohrloch ragt über die ovale Produktkontur hinaus.');
  }else if(!inRoundedRect(hole.x,hole.y,width,height,cornerRadiusMm,r))throw Error('Bohrloch ragt über die Produktkontur hinaus.');
 }
}
export const escapeXml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const categories=designs=>[...new Set(designs.map(d=>d.category||'Ohne Kategorie'))].sort((a,b)=>a.localeCompare(b,'de'));
export const collections=designs=>[...new Set(designs.flatMap(d=>d.collections||[]))].sort((a,b)=>a.localeCompare(b,'de'));
export function filteredDesigns(designs,{search='',category='',collection=''}={}){return designs.filter(d=>(!category||(d.category||'Ohne Kategorie')===category)&&(!collection||(d.collections||[]).includes(collection))&&[d.name,d.category,...(d.collections||[])].join(' ').toLocaleLowerCase('de').includes(search.trim().toLocaleLowerCase('de')));}
export function objectIssue(o,profile){
 if(!o||!['x','y','w','h','rotation'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0||Math.abs(o.rotation)>DESIGN_LIMITS.maxRotation)return 'Ungültige Maße.';
 const a=o.rotation*Math.PI/180,w=Math.abs(o.w*Math.cos(a))+Math.abs(o.h*Math.sin(a)),h=Math.abs(o.w*Math.sin(a))+Math.abs(o.h*Math.cos(a)),b=profile.geometry.bell;
 const doorbell=profile.kind==='layered-doorbell',width=doorbell?160:profile.geometry.width,height=doorbell?280:profile.geometry.height,margin=doorbell?10:profile.geometry.safeMarginMm??2;
 if(o.x-w/2<margin-.001||o.x+w/2>width-margin+.001||o.y-h/2<margin-.001||o.y+h/2>height-margin+.001)return 'Element ragt über die Gestaltungsfläche hinaus.';
 if(b&&Math.min(o.x+w/2,b.x+b.width)-Math.max(o.x-w/2,b.x)>.1&&Math.min(o.y+h/2,b.y+b.height)-Math.max(o.y-h/2,b.y)>.1)return 'Element liegt unter der Klingel.';
 // An ellipse with reduced axes is not a constant-distance inset. Check the
 // actual corner-to-contour distance to preserve the requested margin in mm.
 if(profile.geometry.shape==='ellipse')for(const [x,y] of [[-1,-1],[-1,1],[1,-1],[1,1]]){const px=o.x+x*o.w/2*Math.cos(a)-y*o.h/2*Math.sin(a)-width/2,py=o.y+x*o.w/2*Math.sin(a)+y*o.h/2*Math.cos(a)-height/2;if((px/(width/2))**2+(py/(height/2))**2>1+EPSILON||ellipseEdgeDistance(px,py,width/2,height/2)+EPSILON<margin)return 'Element ragt über die ovale Gestaltungsfläche hinaus.';}
 if(!doorbell&&profile.geometry.shape!=='ellipse'&&profile.geometry.cornerRadiusMm>margin)for(const [x,y] of [[-1,-1],[-1,1],[1,-1],[1,1]]){const px=o.x+x*o.w/2*Math.cos(a)-y*o.h/2*Math.sin(a),py=o.y+x*o.w/2*Math.sin(a)+y*o.h/2*Math.cos(a);if(!inRoundedRect(px,py,width,height,profile.geometry.cornerRadiusMm,margin))return 'Element ragt über die gerundete Gestaltungsfläche hinaus.';}
 // Photos and other artwork may cross a drill hole. A physical second plate
 // blocking screw access is a separate mounting/plate-assembly constraint.
 return '';
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
  if(!['x','y','w','h','rotation'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0||Math.abs(o.rotation)>DESIGN_LIMITS.maxRotation)throw Error('Ungültige Elementmaße oder Drehung.');
  if(o.type==='text'){
   if(typeof o.text!=='string'||!o.text.trim()||o.text.length>DESIGN_LIMITS.maxTextLength||/[\u0000-\u0009\u000b-\u001f\u007f]/.test(o.text))throw Error('Text: 1 bis 180 Zeichen ohne Steuerzeichen.');
   if(!SUPPORTED_FONT_IDS.includes(o.font)&&!extraFontIds.includes(o.font))throw Error('Bitte eine vorhandene Schriftart auswählen.');
   if(!Number.isFinite(o.size)||o.size<DESIGN_LIMITS.minFontSize||o.size>DESIGN_LIMITS.maxFontSize)throw Error('Schriftgröße: 1 bis 100 mm.');
   if(o.bold!==undefined&&typeof o.bold!=='boolean')throw Error('Ungültiger Schriftschnitt.');
  }
  if(o.letterSpacing!==undefined&&(o.type!=='text'||!Number.isFinite(o.letterSpacing)||o.letterSpacing<0||o.letterSpacing>10))throw Error('Ungültiger Zeichenabstand.');
  if((o.photoMaskAssetId!==undefined&&!/^[a-f0-9]{64}$/.test(o.photoMaskAssetId))||(o.photoShape==='template'&&!o.photoMaskAssetId))throw Error('Ungültige Original-Fotomaske.');
  if(o.photoShape==='arch'&&o.h<o.w/2)throw Error('Bogenfoto braucht mindestens eine halbe Breite als Höhe.');
  if(o.customerEditable!==undefined&&typeof o.customerEditable!=='boolean')throw Error('Ungültige Ebenenfreigabe.');
  if(o.type==='motif'&&(typeof o.motif!=='string'||!/^[\w-]{1,120}$/.test(o.motif)))throw Error('Motivkennung fehlt.');
  if(o.type==='photoSlot'&&(!['rect','circle','arch','template'].includes(o.photoShape)||!/^photo-[\w-]+$/.test(o.fieldKey)||typeof o.required!=='boolean'))throw Error('Ungültiger Fotobereich.');
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
  const factor=Math.max(.05,Math.min(20,relative));o.w*=factor;o.h*=factor;if(o.type==='text'){o.size=Math.max(1,Math.min(100,o.size*factor));measure(o,fonts);}}
 for(const k of ['x','y','w','h','size'])if(Number.isFinite(o[k]))o[k]=Math.round(o[k]*1000)/1000;
 return o;
}

