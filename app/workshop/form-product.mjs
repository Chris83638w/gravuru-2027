import {createHash} from 'node:crypto';
import {contourSvg} from './contours.mjs';
import {validateFormDesigns} from './form-designs.mjs';
export const FORM_PRODUCT_SCHEMA='gravuru-form-product/v1';
// Reference inventory, not a supplier or production approval. Never infer thickness from filenames.
export const FORM_MATERIALS=[
 {id:'steel',name:'Edelstahl · gebürstet',reference:'edelstahl-gewaehlte-originalfassung-v4.png',note:'Gewählte Referenz v4; dort 1,5 mm dokumentiert. Tatsächliche Stärke unten festlegen.'},
 {id:'leather-brown',name:'Leder · braun',reference:'leder-2mm-muster.png',note:'Gestaltetes Muster; die frühere 2-mm-Angabe war vorläufig.'},
 {id:'oak',name:'Holz · Eiche',reference:'eiche-5mm-muster.png',note:'Gestaltetes Muster; die frühere 5-mm-Angabe war vorläufig.'},
 {id:'beech',name:'Holz · Buche',reference:'buche-5mm-muster.png',note:'Gestaltetes Muster; die frühere 5-mm-Angabe war vorläufig.'},
 {id:'cherry',name:'Holz · Kirsche',reference:'kirsche-5mm-muster.png',note:'Gestaltetes Muster; die frühere 5-mm-Angabe war vorläufig.'},
 {id:'acrylic-clear',name:'Acrylglas · klar',reference:null,note:'Stärke und Fertigung dieses freien Formprodukts separat festlegen.'},
 {id:'acrylic-anthracite',name:'Acrylglas · anthrazit',reference:'acryl-anthrazit-3mm.png',note:'Bildreferenz mit Rückseitengravur; keine automatische Fertigungsfreigabe.'},
 {id:'acrylic-black',name:'Acrylglas · schwarz',reference:'acryl-schwarz-3mm.png',note:'Bildreferenz mit Rückseitengravur; keine automatische Fertigungsfreigabe.'},
 {id:'acrylic-satin',name:'Acrylglas · satiniert',reference:'acryl-satiniert-weisse-gravur-v2.png',note:'3 mm war eine Musterannahme; nicht der 5-mm-Sockel.'},
 {id:'slate',name:'Schiefer',reference:null,note:'Reine Rohlingreferenz noch nicht eindeutig zugeordnet.'}
];
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'invalid_form_product'});};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,k)=>{if(!object(v)||Object.keys(v).length!==k.length||k.some(n=>!Object.hasOwn(v,n)))fail('Formprodukt: Felder fehlen oder sind unbekannt.');};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const isFormProduct=d=>d?.schema===FORM_PRODUCT_SCHEMA;
export function validateFormProduct(input){
 keys(input,['schema','name','kind','masterId','categoryIds','seo','form','material','processingMethod','basePriceCents',...(Object.hasOwn(input||{},'designs')||Object.hasOwn(input||{},'defaultDesignId')?['designs','defaultDesignId']:[])]);
 const d=structuredClone(input);
 if(!isFormProduct(d)||typeof d.name!=='string'||!d.name.trim()||d.name.length>200||!['product','master'].includes(d.kind)||!(d.masterId===null||/^cfg_[a-f0-9-]+$/.test(d.masterId)))fail('Ungültiger Formproduktname oder Vorlagenbezug.');
 d.name=d.name.trim();
 if(!Array.isArray(d.categoryIds)||d.categoryIds.length>100||d.categoryIds.some(id=>typeof id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id))||new Set(d.categoryIds).size!==d.categoryIds.length)fail('Ungültige Kategorien.');
 keys(d.seo,['title','description']);if(typeof d.seo.title!=='string'||d.seo.title.length>70||typeof d.seo.description!=='string'||d.seo.description.length>160)fail('Ungültige Produktseitenangaben.');
 keys(d.form,['contourId','sourceSha256','geometrySha256','geometry']);
 if(!['contourId','sourceSha256','geometrySha256'].every(k=>/^[a-f0-9]{64}$/.test(d.form[k]))||hash(d.form.geometry)!==d.form.geometrySha256)fail('Konturbezug oder Geometrieprüfsumme stimmt nicht.');
 contourSvg(d.form.geometry); // Shared, validated mm geometry; no alternate width/height or hole list.
 keys(d.material,['id','thicknessMm','surfaceNotes']);
 if(d.material.id!==null&&!FORM_MATERIALS.some(m=>m.id===d.material.id))fail('Unbekannte Materialreferenz.');
 if(d.material.thicknessMm!==null&&(!Number.isFinite(d.material.thicknessMm)||d.material.thicknessMm<=0||d.material.thicknessMm>100))fail('Stärke muss zwischen 0 und 100 mm liegen oder offen bleiben.');
 if(typeof d.material.surfaceNotes!=='string'||d.material.surfaceNotes.length>1000)fail('Oberflächenhinweis ist zu lang.');
 if(![null,'print','engraving'].includes(d.processingMethod))fail('Verfahren ist unbekannt.');
 if(d.basePriceCents!==null&&(!Number.isSafeInteger(d.basePriceCents)||d.basePriceCents<0||d.basePriceCents>100000000))fail('Preis benötigt ganze Cent oder bleibt offen.');
 validateFormDesigns(d);return d;
}
export function makeFormProduct(contour,name){
 return validateFormProduct({schema:FORM_PRODUCT_SCHEMA,name,kind:'product',masterId:null,categoryIds:[],seo:{title:name.slice(0,70),description:''},
  form:{contourId:contour.id,sourceSha256:contour.sourceSha256,geometrySha256:contour.geometrySha256,geometry:structuredClone(contour.geometry)},
  material:{id:null,thicknessMm:null,surfaceNotes:''},processingMethod:null,basePriceCents:null});
}
export function verifyFormSource(document,contours){
 const d=validateFormProduct(document),source=contours.get(d.form.contourId);
 if(source.sourceSha256!==d.form.sourceSha256||source.geometrySha256!==d.form.geometrySha256||JSON.stringify(source.geometry)!==JSON.stringify(d.form.geometry))fail('Die gespeicherte Originalkontur passt nicht zum Produktstand.');
 return d;
}
export function formReadiness(d){
 return [...(d.material.id?[]:['Material auswählen']),...(d.material.thicknessMm===null?['Materialstärke festlegen']:[]),...(d.processingMethod?[]:['Druck oder Gravur festlegen']),...(d.basePriceCents===null?['Preis festlegen']:[]),d.designs?.length?'Kundenkonfigurator anbinden':'Design und Kundenfelder zuordnen','Fertigungsprofil prüfen und freigeben'];
}
export function formOverview(d){
 const g=d.form.geometry;
 return {sizes:[{widthMm:g.widthMm,heightMm:g.heightMm}],widthMm:g.widthMm,heightMm:g.heightMm,method:d.processingMethod,material:d.material.id,
  designCount:d.designs?.length||0,defaultDesignName:d.designs?.find(a=>a.id===d.defaultDesignId)?.name||'Formkontur',previewLabel:'Technische Formprüfung',formProduct:true};
}
