// N39: only catalog-bound formats. Free merchant steelFormats keep their stricter rules.
import {transferTexts} from './workflow-model.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {surfaceObjectIssue,validateDesignContent,validateGeometryHoles} from '../../platform/sources/app/shared/models/design-content.mjs';
import {validateUniversalElements,validateOptionGroups} from '../../platform/sources/app/shared/models/universal-elements.mjs';
import {quantityTiersIssue} from './quantity-tiers.mjs';
import {validateContourGeometry} from '../../platform/sources/app/shared/models/contour-geometry.mjs';

export const FAMILY_FORMATS_SCHEMA='gravuru-family-formats/v1';
export const FAMILY_FORMS=Object.freeze([
 ['RE','Rechteck'],['AB','Rechteck abgerundet'],['QU','Quadrat'],['OV','Oval'],['R','Rund'],['RT1','Retro 1'],['RT2','Retro 2']
]);
const clone=v=>structuredClone(v),fail=m=>{throw Error(m);};
export const isFamilyFormats=c=>c?.familyFormats?.schema===FAMILY_FORMATS_SCHEMA;
export const customerForm=key=>key==='EL'?'OV':key;
export const designNumber=d=>/-D(\d+)$/.exec(d?.katalog?.designId||'')?.[1]??null;
const cents=v=>Number.isSafeInteger(v)&&v>=0;

export function familyFormatSelection(c,values={}){
 if(c.familyFormats.fixedSize&&values.size!==undefined&&values.size!==c.familyFormats.fixedSize)fail('Die Größe dieses Shop-Produkts ist fest.');
 const f=c.familyFormats,format=f.formats.find(s=>s.key===(values.size??f.defaultSize));
 if(!format)fail('Unbekannte Familiengröße.');
 const color=values.color??f.defaultColor,variant=format.variants.find(v=>v.color===color);
 if(!variant)fail('Diese Farbe gibt es in der Größe nicht.');
 if(!variant.designIds.length)fail('Für diese Form und Größe gibt es noch kein freigegebenes Design.');
 const mounting=variant.mounting.find(m=>m.id===(values.mounting??'K00'));
 if(!mounting)fail('Diese Befestigung ist für die gewählte Größe nicht erlaubt.');
 return {format,variant,mounting,color};
}
export function familyDesignReviewNote(c,options,id){
 if(!isFamilyFormats(c)||!c.reviewOnly||!c.familyFormats.source?.reviewUnreleased)return '';
 return familyFormatSelection(c,options).variant.unapprovedDesignIds?.includes(id)?'nicht freigegeben':'';
}
export function familyFormatOptions(c,values={}){
 if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).some(k=>!['size','color','mounting'].includes(k)))fail('Unbekannte Familienoption.');
 const s=familyFormatSelection(c,values);
 return {...(c.familyFormats.fixedSize?{}:{size:s.format.key}),...(c.familyFormats.colors.length>1?{color:s.color}:{}),mounting:s.mounting.id};
}
export function familyFormatCombinations(c){
 return c.familyFormats.formats.flatMap(f=>f.variants.filter(v=>v.designIds.length).flatMap(v=>v.mounting.map(m=>({...(!c.familyFormats.fixedSize?{size:f.key}:{}),...(c.familyFormats.colors.length>1?{color:v.color}:{}),mounting:m.id}))));
}
export function familyFormatPrice(c,o={}){const s=familyFormatSelection(c,o);return s.variant.basePriceCents+s.mounting.priceCents;}
export function familyFormatChoices(c,o={}){
 const color=o.color??c.familyFormats.defaultColor;
 return FAMILY_FORMS.map(([id,label])=>({id,label,sizes:c.familyFormats.formats.filter(f=>customerForm(f.form)===id).map(f=>{
  const v=f.variants.find(v=>v.color===color);return {...f,priceCents:v?.basePriceCents,available:!!v?.designIds.length};
 }).sort((a,b)=>{
  const ar=a.geometry.width/a.geometry.height,br=b.geometry.width/b.geometry.height;
  return Math.abs(ar/br-1)>.01?ar-br:a.geometry.width*a.geometry.height-b.geometry.width*b.geometry.height;
 })}));
}
export function scaleFamilyObjects(objects,from,to){
 const scale=Math.min(to.width/from.width,to.height/from.height),dx=(to.width-from.width*scale)/2,dy=(to.height-from.height*scale)/2;
 return objects.map(o=>{const n={...clone(o),x:o.x*scale+dx,y:o.y*scale+dy,w:o.w*scale,h:o.h*scale};
  for(const key of ['size','letterSpacing','lineHeight','strokeWidth'])if(Number.isFinite(o[key]))n[key]=o[key]*scale;
  return n;
 });
}
export function projectFamilyDesign(c,id,format){
 const d=c.familyFormats.designs.find(d=>d.id===id);if(!d)fail('Familienvorlage fehlt.');
 const [width,height]=d.katalog.plateMm;
 return {...clone(d),objects:scaleFamilyObjects(d.objects,{width,height},format.geometry),katalog:{...clone(d.katalog),targetMm:[format.geometry.width,format.geometry.height]}};
}
export function selectedFamilyProfile(c,values={}){
 const s=familyFormatSelection(c,values),p={...clone(c.profile),geometry:{...clone(s.format.geometry),holes:clone(s.mounting.holes)},material:clone(s.variant.material)};
 p.designs=s.variant.designIds.map(id=>projectFamilyDesign(c,id,s.format));
 p.defaultDesignId=p.designs.some(d=>d.id===c.profile.defaultDesignId)?c.profile.defaultDesignId:p.designs[0].id;
 p.familySelection={familyId:s.variant.familyId,sizeKey:s.variant.sizeKey,form:s.format.form,color:s.color};
 delete p.mountingPreview;
 if(s.mounting.mountingRule){const r=s.mounting.mountingRule;p.mountingPreview={spacers:r.accessory==='standoffs',screws:r.accessory==='screws',diameter:12,finish:s.mounting.spacerFinish||'silver',keepoutMm:r.keepoutMm};}
 return p;
}
// Fit altered text on the real contour; never silently discard customer content.
function fitTransferred(o,p,fonts,motifs){
 const geometry={...p.geometry,holes:[]},profile={...p,geometry};
 if(o.type==='text'&&fonts?.[o.font])measureText(o,fonts);
 const issue=n=>surfaceObjectIssue(n,profile,{fonts,motifs});
 if(!issue(o))return o;
 const positions=[{x:o.x,y:o.y},{x:geometry.width/2,y:geometry.height/2}];
 const minimum=o.type==='text'?Math.min(1,3/o.size):1;
 for(let scale=1;;scale=Math.max(minimum,scale*.95)){
  for(const pos of positions){const n=scaleFamilyObjects([o],{width:1,height:1},{width:scale,height:scale})[0];Object.assign(n,pos);if(!issue(n))return n;}
  if(scale<=minimum+1e-9)break;
 }
 fail('Der eigene Text oder das Bild passt noch nicht in diese Form. Bitte die Gestaltung zuerst verkleinern.');
}
export function familyFormatState(c,state,requested,{fonts={},motifs=[]}={}){
 const old=familyFormatSelection(c,state.mOptions),raw={...state.mOptions,...requested};
 // An explicit format/color choice can invalidate the old fastening. Choose the
 // approved no-fastening default; requests to the server itself remain strict.
 const f=c.familyFormats.formats.find(s=>s.key===(raw.size??c.familyFormats.defaultSize)),v=f?.variants.find(v=>v.color===(raw.color??c.familyFormats.defaultColor));
 if(v&&!v.mounting.some(m=>m.id===raw.mounting))raw.mounting='K00';
 const options=familyFormatOptions(c,raw),next=familyFormatSelection(c,options),before=selectedFamilyProfile(c,state.mOptions),after=selectedFamilyProfile(c,options);
 if(old.format.key===next.format.key&&old.color===next.color)return {...state,mOptions:options};
 const source=before.designs.find(d=>d.id===state.designId);if(!source)fail('Bisherige Vorlage fehlt.');
 const sameForm=customerForm(old.format.form)===customerForm(next.format.form);
 const exact=after.designs.find(d=>d.id===state.designId),number=designNumber(source);
 const target=exact||after.designs.find(d=>number!==null&&designNumber(d)===number)||after.designs[0];
 let objects;
 if(sameForm&&exact){objects=scaleFamilyObjects(state.objects,before.geometry,after.geometry);}
 else{
  objects=clone(target.objects);
  const edited=state.objects.filter(o=>o.type==='text'&&!o.uxHidden&&o.customerEditable!==false&&o.text!==source.objects.find(s=>s.id===o.id)?.text);
  const remaining=transferTexts(edited,objects);
  const extras=[...remaining,...state.objects.filter(o=>o.type==='photoSlot'&&o.uxUploadId||o.uxUploadKind==='logo')];
  for(const original of extras){const moved=scaleFamilyObjects([original],before.geometry,after.geometry)[0];if(objects.some(o=>o.id===moved.id))moved.id='carry-'+moved.id;objects.push(moved);}
 }
 objects=objects.map(o=>fitTransferred(o,after,fonts,motifs));
 return {...state,designId:target.id,objects,mOptions:options,selected:null,width:after.geometry.width,height:after.geometry.height};
}
export function validateFamilyFormats(c){
 if(!isFamilyFormats(c)||c.steelFormats||c.acrylic||c.doorbell)fail('Ungültige Familienform-Auswahl.');
 if(c.reviewOnly!==true||c.profile?.binding?.kind!=='local-review'||c.profile?.features?.orderEnabled!==false)fail('Familienformate benötigen zuerst einen lokalen Prüfstand.');
 const f=c.familyFormats;
 if(!Array.isArray(f.formats)||!f.formats.length||!Array.isArray(f.designs)||!f.designs.length||new Set(f.formats.map(s=>s.key)).size!==f.formats.length||new Set(f.designs.map(d=>d.id)).size!==f.designs.length)fail('Eindeutige Familiengrößen und Vorlagen fehlen.');
 if(!Array.isArray(f.colors)||!f.colors.length||!f.colors.some(v=>v.id===f.defaultColor))fail('Familienfarben fehlen.');
 for(const d of f.designs){if(!d.katalog?.designId||!Array.isArray(d.katalog.plateMm)||d.katalog.plateMm.length!==2||!d.katalog.plateMm.every(n=>Number.isFinite(n)&&n>0)||d.marks?.length)fail('Native Familienvorlage ohne gültige Quelle.');validateDesignContent(d,{universal:true,extraFontIds:Object.keys(c.localResources?.fonts||{})});validateUniversalElements(d);}
 for(const s of f.formats){
  const g=s.geometry;if(!FAMILY_FORMS.some(([id])=>id===customerForm(s.form))||!g||!['rect','ellipse','contour'].includes(g.shape)||![g.width,g.height].every(n=>Number.isFinite(n)&&n>=10&&n<=2000))fail('Ungültige Familiengeometrie.');
  if(g.shape==='contour')validateContourGeometry(g);
  if(!Array.isArray(s.variants)||!s.variants.length||new Set(s.variants.map(v=>v.color)).size!==s.variants.length)fail('Familienvarianten fehlen.');
  for(const v of s.variants){
   if(!['steel-door-signs','acryl-3mm-tuerschilder-schwarz','acryl-3mm-tuerschilder-anthrazit'].includes(v.familyId)||!v.sizeKey||!cents(v.basePriceCents)||!f.colors.some(a=>a.id===v.color))fail('Familienquelle oder Preis fehlt.');
   if(!Array.isArray(v.designIds)||v.designIds.some(id=>!f.designs.some(d=>d.id===id)))fail('Unbekanntes Designziel.');
   if(v.unapprovedDesignIds!==undefined&&(!Array.isArray(v.unapprovedDesignIds)||v.unapprovedDesignIds.some(id=>!v.designIds.includes(id))))fail('Ungültige Prüffreigaben.');
   if(!Array.isArray(v.mounting)||new Set(v.mounting.map(m=>m.id)).size!==v.mounting.length||!v.mounting.some(m=>m.id==='K00'&&m.priceCents===0&&m.holes?.length===0)||v.mounting.some(m=>!cents(m.priceCents)||!Array.isArray(m.holes)))fail('Familienbefestigung fehlt.');
   validateOptionGroups([{id:'mounting',name:'Befestigung',required:true,defaultValueId:'K00',values:v.mounting}]);
   for(const m of v.mounting)validateGeometryHoles({...c.profile,geometry:{...g,holes:m.holes}});
   if(v.quantityTiers!==undefined&&quantityTiersIssue(v.quantityTiers))fail('Ungültige Mengenstaffel der Familiengröße.');
   if(v.material?.kind!==c.profile.material.kind||!/^#[0-9a-f]{6}$/i.test(v.material.color)||v.material.thicknessMm!==c.profile.material.thicknessMm||v.material.kind==='acrylic'&&(!['schwarz','anthrazit'].includes(v.material.variant)||v.material.engravingSide!=='back'))fail('Widersprüchliches Familienmaterial.');
  }
 }
 if(f.fixedSize!==undefined){
  const cut=f.source?.shopProduct,starter=f.designs.find(d=>d.id===c.profile.defaultDesignId);
  if(f.formats.length!==1||f.fixedSize!==f.defaultSize||f.formats[0].key!==f.fixedSize||f.source?.reviewUnreleased||f.formats.some(s=>s.variants.some(v=>v.unapprovedDesignIds?.length))||!cut||cut.themeId!==c.profile.themeId||starter?.katalog.designId!==cut.defaultDesignId||!starter?.themes?.includes(cut.themeId)||!f.formats[0].variants.some(v=>v.sizeKey===cut.sizeKey)||f.formats[0].variants.some(v=>!v.designIds.includes(starter.id))||c.profile.optionGroups.some(g=>g.id==='size'))fail('Ungültiger fester Shop-Produktschnitt.');
 }
 const start=familyFormatSelection(c);if(!f.fixedSize&&(start.format.form!=='AB'||start.format.geometry.width!==120||start.format.geometry.height!==80))fail('Startgröße muss AB 12 × 8 cm sein.');
 if(f.formats.reduce((sum,s)=>sum+s.variants.reduce((n,v)=>n+v.mounting.length,0),0)>2048)fail('Mehr als 2.048 Familienvarianten.');
}
