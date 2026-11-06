// Katalogseite (/werkstatt/katalog/) aus dem Katalog-Repo: Linien, Unterkategorien und Hauptprodukte kommen aus
// `linien/*.json` (Schema gravuru-line/v2), nicht mehr aus der eingebauten catalog-structure.json. Chris 23.10.2026:
// „es kommt vom Katalog in das Dashboard … es muss jederzeit im Dashboard / Katalog bearbeitbar sein“. Änderungen an
// Hauptprodukten (Name, Startdesign, Größen, Notiz, Unterkategorie, neu anlegen) gehen zurück in die Liniendatei:
// vorher validateLine gegen Familien/Themen/Schrift-Sets, atomar geschrieben, Protokoll `linien/_aenderungen.jsonl`.
// Es wird nichts gelöscht und nichts zu Shopify geschickt (das macht shop-sync nach Freigabe).
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {validateLine,openKatalog} from './katalog-source.mjs';
import {katalogFor,forgetKatalog} from './design-dashboard.mjs';
import {familyGaps} from './product-families.mjs';
import {offeredFamilyIds,subcategoryMaterialOffering,familyOfferingIssue} from './subcategory-materials.mjs';
import {FAMILY_FORMAT_SOURCES} from '../configurator/variant-m/family-formats.mjs';
import {safeKatalogPath,withKatalogWriteLock,writeKatalogTransaction} from './katalog-transaction.mjs';

const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const ID=/^[a-z0-9][a-z0-9_.-]{0,79}$/i,MAIN_ID=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/,DESIGN_ID=/^[A-Za-z0-9][A-Za-z0-9_.,:-]{0,119}$/;
const line1=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\x00-\x1f]/.test(v);
const writeAtomic=(file,text)=>{const tmp=file+'.'+process.pid+'.'+Date.now()+'.tmp';fs.writeFileSync(tmp,text);fs.renameSync(tmp,file);};
export const SHOPIFY_ADMIN='https://admin.shopify.com/store/gravuru-design/products/';

const lineFile=(katalog,lineId)=>katalog.files.get('linie:'+lineId)||null;
const lineDigest=katalog=>{const h=createHash('sha256');for(const id of [...katalog.lines.keys()].sort())h.update(id+'\n'+fs.readFileSync(lineFile(katalog,id),'utf8')+'\n');return h.digest('hex');};
const gid=v=>typeof v==='string'&&/^[1-9][0-9]*$/.test(v)?'gid://shopify/Product/'+v:null;

// Struktur für die Katalogseite. `statics` (eingebaute catalog-structure.json) liefert weiterhin Reihenfolge, Serien-
// Kennzahlen, Abgleichspunkte und ältere Parallelprodukte (Shopify-Bestand, der nicht im Katalog liegt).
export function readKatalogStructure(root,{statics=null}={}){
 const katalog=katalogFor(root);
 const order=new Map((statics?.lines||[]).map((l,i)=>[l.id,i]));
 const masters=new Map(katalog.designs.masters.map(d=>[d.id,d]));
 const lines=[],mainProducts=[];
 for(const line of [...katalog.lines.values()].sort((a,b)=>(order.get(a.id)??99)-(order.get(b.id)??99)||a.id.localeCompare(b.id))){
  const deferred=line.structureStatus==='zurueckgestellt'||/zurückgestellt/i.test(line.name);
  lines.push({id:line.id,name:line.name,enabled:!deferred,order:lines.length+1,status:line.status??'',structureStatus:line.structureStatus??null,note:line.note??null,sourcePath:'linien/'+line.id+'.json',familyIds:[...line.families],seriesRefs:Array.isArray(line.seriesRefs)?[...line.seriesRefs]:[],
   subcategories:line.subcategories.map(s=>({id:s.id,name:s.name,themeId:s.themeId??null,fontSet:s.fontSet??null,status:s.status??null,mainProductCount:Array.isArray(s.mainProducts)?s.mainProducts.length:0,...subcategoryMaterialOffering(line,s,{families:katalog.families,supportedFamilyIds:FAMILY_FORMAT_SOURCES})})),editable:true});
  for(const sub of line.subcategories)for(const m of (Array.isArray(sub.mainProducts)?sub.mainProducts:[])){
   const ext=record(m.externalIds)?m.externalIds:{},design=masters.get(m.startDesign)||null,shopifyId=gid(ext.shopifyProductId);
   mainProducts.push({key:'katalog:'+line.id+'/'+sub.id+'/'+m.id,katalogId:m.id,id:shopifyId,title:m.name||m.startDesign,handle:null,status:null,variantCount:Array.isArray(m.sizesOffered)?m.sizesOffered.length:null,
    lineId:line.id,subcategoryId:sub.id,subcategoryIds:[sub.id],startDesignId:m.startDesign,sizesOffered:Array.isArray(m.sizesOffered)?[...m.sizesOffered]:null,externalIds:{...ext},note:m.status??null,role:'hauptprodukt',source:'katalog',
    design:design?{reihe:design.seriesFolder,name:design.name,released:design.released===true,freigabe:design.freigabe??null,hidden:design.hidden===true}:null,
    adminUrl:shopifyId?SHOPIFY_ADMIN+ext.shopifyProductId:null,workshopUrl:design?'/werkstatt/designs/?linie='+encodeURIComponent(line.id)+'&reihe='+encodeURIComponent(design.seriesFolder):null,editable:true});
  }
 }
 const known=new Set(lines.map(l=>l.id));
 // Shopify-Parallelbestand aus der eingebauten Datei bleibt sichtbar; Hauptprodukte kommen nur aus dem Katalog.
 for(const p of (statics?.mainProducts||[]))if(p.role!=='hauptprodukt'&&known.has(p.lineId))mainProducts.push({...structuredClone(p),subcategoryIds:p.subcategoryId?[p.subcategoryId]:[],source:'shopify-bestand',editable:false});
 const families=[...katalog.families.values()].map(f=>{let gaps=[];try{gaps=familyGaps(f);}catch(e){gaps=['Familie prüfen: '+e.message];}return {id:f.id,name:f.name,material:f.material?.name??f.material?.kind??null,materialKind:f.material?.kind??null,materialVariant:f.material?.variant??null,thicknessMm:f.material?.thicknessMm??null,familyFormatsSupported:FAMILY_FORMAT_SOURCES.includes(f.id),sizeCount:Array.isArray(f.sizes)?f.sizes.length:0,sourcePath:path.relative(katalog.root,katalog.files.get('familie:'+f.id)||'').split(path.sep).join('/'),gaps};});
 const sizes={};for(const f of katalog.families.values())sizes[f.id]=(f.sizes||[]).map(s=>({key:s.key,label:s.label??s.key,widthMm:s.widthMm??null,heightMm:s.heightMm??null}));
 const designs={};for(const d of katalog.designs.masters)(designs[d.seriesFolder]??=[]).push({id:d.id,name:d.name,released:d.released===true,hidden:d.hidden===true,themes:Array.isArray(d.themes)?d.themes:[]});
 return {schema:'gravuru-workshop-structure/v2',source:{repository:'gravuru-katalog',root:katalog.root,files:lines.map(l=>l.sourcePath)},updatedAt:new Date().toISOString(),lines,mainProducts,families,sizes,designs,
  series:(statics?.series||[]).filter(s=>known.has(s.lineId)),checks:statics?.checks||[],customerBinding:statics?.customerBinding??null,automaticPublication:false,sourceSha256:lineDigest(katalog)};
}

// Explicit offer change only. The complete catalog-source digest is mandatory:
// concurrent changes must be re-read before a new material choice is saved.
export function patchSubcategoryMaterials(root,input,{actor='werkstatt',now=new Date()}={}){
 if(!record(input)||Object.keys(input).some(k=>!['action','lineId','subcategoryId','familyIdsOffered','sourceSha256','expectedRevision'].includes(k))||!Object.hasOwn(input,'familyIdsOffered'))fail(422,'katalog_materials','Materialauswahl und Unterkategorie angeben.');
 return withKatalogWriteLock(root,()=>{
 const katalog=openKatalog(root);
 if(typeof input.sourceSha256!=='string'||input.sourceSha256!==lineDigest(katalog))fail(409,'katalog_changed','Der Katalog wurde inzwischen geändert. Bitte neu laden.');
 const line=katalog.lines.get(input.lineId),file=line&&lineFile(katalog,line.id);
 if(!file)fail(422,'katalog_materials','Produktlinie unbekannt.');
 const next=JSON.parse(fs.readFileSync(file,'utf8').replace(/^﻿/,'')),sub=next.subcategories.find(s=>s.id===input.subcategoryId);
 if(!sub)fail(422,'katalog_materials','Unterkategorie unbekannt.');
 const issue=familyOfferingIssue(input.familyIdsOffered,{families:katalog.families});if(issue)fail(422,'katalog_materials',issue);
 if(input.familyIdsOffered===undefined)fail(422,'katalog_materials','Materialauswahl fehlt.');
 const from=sub.familyIdsOffered??null,to=input.familyIdsOffered===null?null:[...input.familyIdsOffered];
 if(JSON.stringify(from)===JSON.stringify(to))return {changed:false,line:line.id,subcategoryId:sub.id,action:'materials',changes:{},files:[],warning:null,uncommitted:false};
 sub.familyIdsOffered=to;
 try{validateLine(next,{families:katalog.families,themes:katalog.themes,fontSets:katalog.fonts.sets,file:path.basename(file)});}catch(e){fail(422,'katalog_materials','Linie bleibt ungültig: '+e.message);}
 const changes={familyIdsOffered:{from,to}},auditRelative='linien/_aenderungen.jsonl',auditFile=safeKatalogPath(root,auditRelative,{missing:true});
 const audit=(fs.existsSync(auditFile)?fs.readFileSync(auditFile,'utf8'):'')+JSON.stringify({at:now.toISOString(),actor:String(actor).slice(0,160),line:line.id,subcategoryId:sub.id,action:'materials',changes})+'\n';
 const files=writeKatalogTransaction(root,[{relative:'linien/'+path.basename(file),text:JSON.stringify(next,null,2)+'\n'},{relative:auditRelative,text:audit}]);forgetKatalog();
 return {changed:true,line:line.id,subcategoryId:sub.id,action:'materials',changes,files,warning:null,uncommitted:true};
 });
}

// Änderung eines Hauptprodukts im Katalog. input: {action:'edit'|'assign'|'add', lineId, productKey|katalogId, …}.
export function patchMainProduct(root,input,{actor='werkstatt',now=new Date()}={}){
 if(!record(input))fail(422,'katalog_patch','Änderung als Objekt senden.');
 const katalog=katalogFor(root);
 if(typeof input.sourceSha256==='string'&&input.sourceSha256!==lineDigest(katalog))fail(409,'katalog_changed','Der Katalog wurde inzwischen geändert. Bitte neu laden.');
 const line=katalog.lines.get(input.lineId);if(!line)fail(422,'katalog_patch','Produktlinie unbekannt.');
 const file=lineFile(katalog,line.id);
 const raw=fs.readFileSync(file,'utf8'),next=JSON.parse(raw.replace(/^﻿/,''));
 const subs=next.subcategories;
 const locate=(katalogId,subId=null)=>{for(const s of subs){if(subId&&s.id!==subId)continue;const i=(s.mainProducts||[]).findIndex(m=>m.id===katalogId);if(i>=0)return {sub:s,index:i,entry:s.mainProducts[i]};}return null;};
 const clean=v=>typeof v==='string'?(v.trim()===''?null:v.trim()):v;
 const checkFields=(m,{partial=false,subcategory=null}={})=>{
  if(m.name!==undefined&&m.name!==null&&!line1(m.name,160))fail(422,'katalog_patch','Name: 1 bis 160 Zeichen, eine Zeile.');
  if((!partial||m.startDesign!==undefined)&&!(typeof m.startDesign==='string'&&DESIGN_ID.test(m.startDesign)))fail(422,'katalog_patch','Startdesign (Design-Kennung) prüfen.');
  if(m.startDesign!==undefined&&!katalog.designs.masters.some(d=>d.id===m.startDesign))fail(422,'katalog_patch','Startdesign „'+m.startDesign+'“ liegt nicht als Lieferform 2 im Katalog (designs/<reihe>/<id>/).');
  if(m.sizesOffered!==undefined&&m.sizesOffered!==null){if(!Array.isArray(m.sizesOffered)||!m.sizesOffered.length||m.sizesOffered.some(k=>!ID.test(String(k))))fail(422,'katalog_patch','sizesOffered: Liste von Größen-Schlüsseln.');const ids=subcategory?offeredFamilyIds(line,subcategory,{families:katalog.families}):line.families,keys=new Set(ids.flatMap(f=>(katalog.families.get(f)?.sizes||[]).map(s=>s.key)));const bad=m.sizesOffered.filter(k=>!keys.has(k));if(bad.length)fail(422,'katalog_patch','Größen nicht in den angebotenen Materialfamilien: '+bad.join(', '));}
  if(m.status!==undefined&&m.status!==null&&(typeof m.status!=='string'||m.status.length>2000))fail(422,'katalog_patch','Notiz (status): bis 2000 Zeichen.');
 };
 const changes={};let katalogId,action=input.action;
 if(action==='add'){
  const sub=subs.find(s=>s.id===input.subcategoryId);if(!sub)fail(422,'katalog_patch','Unterkategorie unbekannt.');
  katalogId=typeof input.katalogId==='string'?input.katalogId.trim():'';if(!MAIN_ID.test(katalogId))fail(422,'katalog_patch','Kennung des Hauptprodukts prüfen (Buchstaben, Ziffern, . _ -).');
  if(locate(katalogId))fail(409,'katalog_patch','Hauptprodukt „'+katalogId+'“ gibt es in dieser Linie schon.');
  const note=clean(input.status);if(note!==null&&note!==undefined&&(typeof note!=='string'||note.length>1800))fail(422,'katalog_patch','Notiz (status): bis 1800 Zeichen beim Anlegen.');
  const entry={id:katalogId,name:clean(input.name)??null,startDesign:clean(input.startDesign),sizesOffered:input.sizesOffered??null,externalIds:{},status:(note?note+' ':'')+'(angelegt '+now.toISOString().slice(0,10)+' Katalogseite, '+String(actor).slice(0,80)+')'};
  checkFields(entry,{subcategory:sub});if(entry.name===null)delete entry.name;
  (sub.mainProducts??=[]).push(entry);changes.added={subcategoryId:sub.id,entry};
 }else if(action==='edit'||action==='assign'){
  // productKey „katalog:<linie>/<unterkategorie>/<id>“ nennt die Unterkategorie – damit treffen wir den richtigen Eintrag, falls eine Kennung in zwei Unterkategorien vorkommt.
  const keyParts=typeof input.productKey==='string'?input.productKey.replace(/^katalog:/,'').split('/'):[];
  katalogId=typeof input.katalogId==='string'?input.katalogId:keyParts[keyParts.length-1]||'';
  const hit=locate(katalogId,keyParts.length===3?keyParts[1]:null);if(!hit)fail(404,'katalog_patch','Hauptprodukt „'+katalogId+'“ nicht in der Linie.');
  const {sub,index,entry}=hit;
  if(action==='assign'){
   const ids=input.subcategoryIds;if(!Array.isArray(ids)||ids.length!==1)fail(422,'katalog_patch','Im Katalog gehört ein Hauptprodukt genau einer Unterkategorie (eine auswählen).');
   const target=subs.find(s=>s.id===ids[0]);if(!target)fail(422,'katalog_patch','Unterkategorie unbekannt.');
   if(target!==sub){sub.mainProducts.splice(index,1);(target.mainProducts??=[]).push(entry);changes.subcategoryId={from:sub.id,to:target.id};}
  }else{
   const patch={};for(const k of ['name','startDesign','sizesOffered','status'])if(input[k]!==undefined)patch[k]=clean(input[k]);
   if(patch.startDesign===null)fail(422,'katalog_patch','Startdesign (Design-Kennung) prüfen.');
   // Existing products stay editable after an offer is withdrawn. Only a newly
   // selected size list must satisfy the current material offer.
   const toValidate={...patch};if(JSON.stringify(patch.sizesOffered)===JSON.stringify(entry.sizesOffered??null))delete toValidate.sizesOffered;
   checkFields(toValidate,{partial:true,subcategory:sub});
   for(const [k,v] of Object.entries(patch)){const from=entry[k]??null,to=v;if(JSON.stringify(from)!==JSON.stringify(to)){changes[k]={from,to};if(to===null&&k!=='sizesOffered')delete entry[k];else entry[k]=to;}}
  }
 }else fail(422,'katalog_patch','Unbekannte Aktion (edit, assign, add).');
 const files=[];let warning=null;
 if(Object.keys(changes).length){
  try{validateLine(next,{families:katalog.families,themes:katalog.themes,fontSets:katalog.fonts.sets,file:path.basename(file)});}catch(e){fail(422,'katalog_patch','Linie bleibt ungültig: '+e.message);}
  // Liniendateien im Katalog sind mit 2 Leerzeichen eingerückt (geprüft 23.10.2026, alle 12); so bleibt der Diff klein.
  writeAtomic(file,JSON.stringify(next,null,2)+'\n');files.push('linien/'+path.basename(file));forgetKatalog();
  const protocol=path.join(katalog.root,'linien','_aenderungen.jsonl');
  try{fs.appendFileSync(protocol,JSON.stringify({at:now.toISOString(),actor:String(actor).slice(0,160),line:line.id,action,productId:katalogId,changes})+'\n');files.push('linien/_aenderungen.jsonl');}catch(e){warning='Gespeichert, aber Protokoll linien/_aenderungen.jsonl nicht schreibbar: '+e.message;}
 }
 return {changed:files.length>0,line:line.id,action,productId:katalogId,changes,files,warning,uncommitted:files.length>0};
}
