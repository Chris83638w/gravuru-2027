import {orderedFamilySizes,formGroupLabel} from './design-size-order.mjs';
// Dashboard main products are catalogue entries only. No approval or shop write.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {katalogFor} from './design-dashboard.mjs';
import {designTargets,assignTargetSeries} from './design-targets.mjs';
import {safeKatalogPath,withKatalogWriteLock} from './katalog-transaction.mjs';
import {writeKatalogLineChange} from './katalog-linien.mjs';

const fail=(status,message,code='design_main_product')=>{throw Object.assign(Error(message),{status,code});};
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hash=v=>createHash('sha256').update(v).digest('hex');
const key=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9_.-]{0,79}$/i.test(v);
const segment=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_. ,-]{0,119}$/.test(v)&&!v.includes('..')&&!/[. ]$/.test(v)&&!/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(v);
const checksum=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const oneLine=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\x00-\x1f\x7f]/.test(v);
const ownFields=(value,fields)=>record(value)&&Object.keys(value).every(k=>fields.includes(k));
const conflict=message=>fail(409,message,'design_main_product_conflict');
function source(katalog,query,{requiredChecksum=false}={}){
 if(!ownFields(query,['reihe','id','checksum'])||!segment(query.reihe)||query.reihe==='bestand'||!segment(query.id))fail(422,'Eine vorhandene Designreihe und Designkennung angeben.');
 if(requiredChecksum&&!checksum(query.checksum))fail(422,'Die Prüfsumme des Quelldesigns fehlt.');
 const master=katalog.designs.masters.find(d=>d.seriesFolder===query.reihe&&d.id===query.id);
 if(!master)fail(404,'Das Quelldesign liegt nicht als Lieferform 2 im Katalog.');
 const base='designs/'+query.reihe+'/'+query.id;
 const json=fs.readFileSync(safeKatalogPath(katalog.root,base+'/design.json'));
 const svg=fs.readFileSync(safeKatalogPath(katalog.root,base+'/design.svg'));
 const familySources=designTargets(master,katalog).map(t=>t.familie).sort().map(id=>{
  const file=katalog.files.get('familie:'+id),relative=path.relative(katalog.root,file).split(path.sep).join('/');
  return Buffer.concat([Buffer.from('\0'+id+'\0'),fs.readFileSync(safeKatalogPath(katalog.root,relative))]);
 });
 const digest=hash(Buffer.concat([json,Buffer.from('\0'),svg,...familySources]));
 if(query.checksum!==undefined&&digest!==query.checksum)conflict('Das Quelldesign oder eine Zielfamilie wurde inzwischen geändert. Bitte neu vorbereiten.');
 return {master,dto:{reihe:query.reihe,id:master.id,name:master.name,themes:[...(master.themes||[])],checksum:digest}};
}
function lineSource(katalog,line){
 const file=katalog.files.get('linie:'+line.id);
 const relative=path.relative(katalog.root,file).split(path.sep).join('/');
 const raw=fs.readFileSync(safeKatalogPath(katalog.root,relative),'utf8');
 return {next:JSON.parse(raw.replace(/^\uFEFF/,'')),checksum:hash(raw)};
}
function proposedId(master,group){
 const value=(master.id+'-'+group.key).replaceAll(',','_');
 return {value,valid:/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(value)};
}
const products=line=>line.subcategories.flatMap(sub=>(sub.mainProducts||[]).map(entry=>({sub,entry})));
const linked=entry=>entry.externalIds?.shopifyProductId!==undefined&&entry.externalIds.shopifyProductId!==null&&entry.externalIds.shopifyProductId!=='';
function existingDto(line,sub,entry,lineChecksum){
 return {lineId:line.id,lineName:line.name,lineChecksum,subcategoryId:sub.id,subcategoryName:sub.name,
  id:entry.id,name:entry.name||entry.startDesign,startDesign:entry.startDesign,sizesOffered:entry.sizesOffered??null,externalIds:{...(entry.externalIds||{})},
  canDelete:!linked(entry),deleteReason:linked(entry)?'Dieses Hauptprodukt ist bereits mit Shopify verbunden.':null};
}
function suggestedName(katalog,line,family,group,master,sizes){
 // Only reuse an observed same-form product pattern. Names with unexplained
 // motif text are not guessed: a named design is replaced only as a whole.
 const candidates=products(line).filter(({entry})=>oneLine(entry.name,160)&&Array.isArray(entry.sizesOffered)&&entry.sizesOffered.length&&entry.sizesOffered.every(k=>family.sizes.some(s=>s.key===k&&s.groupKey===group.key)));
 for(const {entry} of candidates){
  const old=katalog.designs.masters.find(d=>d.id===entry.startDesign);
  let value=entry.name;
  const named=old&&old.name!==old.id&&value.includes(old.name),identified=value.includes(entry.startDesign);
  // A dimension alone does not identify an arbitrary motif name. Reuse a title
  // only when its design-specific part can be replaced from known catalogue data.
  if(!named&&!identified)continue;
  if(named)value=value.replaceAll(old.name,master.name);
  if(identified)value=value.replaceAll(entry.startDesign,master.id);
  const oldSize=family.sizes.find(s=>s.key===entry.sizesOffered[0]),newSize=sizes[0];
  if(oldSize&&newSize){
   const decimal=n=>String(n/10).replace('.',',');
   const escaped=n=>String(n/10).replace('.', '[.,]');
   const dimension=new RegExp(escaped(oldSize.widthMm)+'\\s*[x×]\\s*'+escaped(oldSize.heightMm)+'\\s*cm','g');
   value=value.replace(dimension,decimal(newSize.widthMm)+' × '+decimal(newSize.heightMm)+' cm');
  }
  if(oneLine(value,160))return {suggestedName:value,nameBasis:{productId:entry.id,name:entry.name,rule:'Vorhandenes Hauptprodukt derselben Linie, Familie und Formgruppe; Designbezeichnung und bekannte Maßangabe werden übernommen.'}};
 }
 return {suggestedName:'',nameBasis:null};
}
export function mainProductOptions(root,query){
 const katalog=katalogFor(root,{maxAgeMs:0}),src=source(katalog,query),master=src.master;
 const targets=new Set(designTargets(master,katalog).map(t=>t.familie)),lines=[],existing=[];
 for(const line of katalog.lines.values()){
  const raw=lineSource(katalog,line);
  for(const {sub,entry} of products(line))if(entry.startDesign===master.id)existing.push(existingDto(line,sub,entry,raw.checksum));
  const families=[];
  for(const familyId of line.families){
   if(!targets.has(familyId))continue;
   const family=katalog.families.get(familyId);if(!family)continue;
   const compatible=new Set(assignTargetSeries(family,[master],katalog)[0].sizes);
   const groups=family.groups.map(group=>{
    const sizes=orderedFamilySizes(family,{compatible}).filter(s=>s.groupKey===group.key&&s.compatible);if(!sizes.length)return null;
    const identity=proposedId(master,group),hit=products(line).find(({entry})=>entry.id===identity.value);
    const reason=!identity.valid?'Kennung nicht zulässig: höchstens 80 Zeichen, Buchstaben, Ziffern, Punkt, Unterstrich und Bindestrich.':hit?'Hauptprodukt schon vorhanden.':null;
    return {key:group.key,name:formGroupLabel(group,sizes),shape:group.shape,sizes:sizes.map(s=>({key:s.key,label:s.label??s.key,widthMm:s.widthMm,heightMm:s.heightMm,groupName:s.groupName,seriesKey:s.seriesKey,ratioLabel:s.ratioLabel})),
     proposedId:identity.value,...suggestedName(katalog,line,family,group,master,sizes),existing:hit?existingDto(line,hit.sub,hit.entry,raw.checksum):null,eligible:!reason,reason};
   }).filter(Boolean);
   families.push({id:family.id,name:family.name,previewUrl:'/api/workshop/designs/target-preview?'+new URLSearchParams({reihe:master.seriesFolder,id:master.id,familie:family.id}),groups});
  }
  if(families.length)lines.push({id:line.id,name:line.name,lineChecksum:raw.checksum,subcategories:line.subcategories.map(sub=>({id:sub.id,name:sub.name,themeId:sub.themeId??null,eligible:Boolean(sub.themeId&&master.themes?.includes(sub.themeId)),reason:sub.themeId&&master.themes?.includes(sub.themeId)?null:'Thema fehlt – erst zuordnen'})),families});
 }
 return {source:src.dto,lines,existing};
}
function inputLine(katalog,input){
 if(!key(input.lineId)||!key(input.subcategoryId)||!checksum(input.lineChecksum))fail(422,'Linie, Unterkategorie und Linien-Prüfsumme angeben.');
 const line=katalog.lines.get(input.lineId);if(!line)fail(422,'Produktlinie unbekannt.');
 const raw=lineSource(katalog,line);
 if(raw.checksum!==input.lineChecksum)conflict('Die Produktlinie wurde inzwischen geändert. Bitte neu vorbereiten.');
 const sub=raw.next.subcategories.find(s=>s.id===input.subcategoryId);if(!sub)fail(422,'Unterkategorie unbekannt.');
 return {line,next:raw.next,sub};
}
export function createDesignMainProduct(root,input,{actor='werkstatt',now=new Date(),beforeReplace}={}){
 if(!ownFields(input,['source','lineId','lineChecksum','subcategoryId','familyId','groupKey','sizeKeys','name'])||!key(input.familyId)||!key(input.groupKey)||!oneLine(input.name,160)||!Array.isArray(input.sizeKeys)||!input.sizeKeys.length||input.sizeKeys.length>500||input.sizeKeys.some(k=>!key(k))||new Set(input.sizeKeys).size!==input.sizeKeys.length)fail(422,'Quelle, Linie, Familie, genau eine Formgruppe, eindeutige Größen und Name angeben.');
 return withKatalogWriteLock(root,lockedRoot=>{
  const katalog=katalogFor(lockedRoot,{maxAgeMs:0}),src=source(katalog,input.source,{requiredChecksum:true}),master=src.master;
  const {line,next,sub}=inputLine(katalog,input);
  if(!line.families.includes(input.familyId)||!designTargets(master,katalog).some(t=>t.familie===input.familyId))fail(422,'Das Design braucht ein bestätigtes Ziel in dieser Linie.');
  if(!sub.themeId||!master.themes?.includes(sub.themeId))fail(422,'Thema fehlt – erst zuordnen.');
  const family=katalog.families.get(input.familyId),group=family?.groups.find(g=>g.key===input.groupKey);
  if(!group)fail(422,'Formgruppe unbekannt.');
  const compatible=new Set(assignTargetSeries(family,[master],katalog)[0].sizes);
  if(input.sizeKeys.some(k=>!compatible.has(k)||!family.sizes.some(s=>s.key===k&&s.groupKey===group.key)))fail(422,'Nur kompatible Größen genau einer Formgruppe wählen.');
  const identity=proposedId(master,group);
  if(!identity.valid)conflict('Die Hauptprodukt-Kennung ist nicht zulässig (höchstens 80 Zeichen). Sie wird nicht gekürzt.');
  if(products(next).some(({entry})=>entry.id===identity.value))conflict('Hauptprodukt „'+identity.value+'“ schon vorhanden.');
  const entry={id:identity.value,name:input.name.trim(),startDesign:master.id,sizesOffered:family.sizes.filter(s=>input.sizeKeys.includes(s.key)).map(s=>s.key),externalIds:{},status:'angelegt im Dashboard '+now.toISOString().slice(0,10)+' von '+String(actor).slice(0,160)};
  (sub.mainProducts??=[]).push(entry);
  const changes={added:{subcategoryId:sub.id,entry},source:{reihe:src.dto.reihe,id:src.dto.id,checksum:src.dto.checksum},familyId:family.id,groupKey:group.key};
  const files=writeKatalogLineChange(katalog,next,{actor,now,action:'dashboard-add',productId:entry.id,changes,beforeReplace});
  return {changed:true,lineId:line.id,lineChecksum:lineSource(katalog,line).checksum,productId:entry.id,files,entry,uncommitted:true};
 });
}
export function deleteDesignMainProduct(root,input,{actor='werkstatt',now=new Date(),beforeReplace}={}){
 if(!ownFields(input,['lineId','lineChecksum','subcategoryId','productId'])||!key(input.productId))fail(422,'Linie, Unterkategorie und Hauptprodukt angeben.');
 return withKatalogWriteLock(root,lockedRoot=>{
  const katalog=katalogFor(lockedRoot,{maxAgeMs:0}),{line,next,sub}=inputLine(katalog,input);
  const index=(sub.mainProducts||[]).findIndex(p=>p.id===input.productId);if(index<0)fail(404,'Hauptprodukt nicht in dieser Unterkategorie gefunden.');
  const entry=sub.mainProducts[index];if(linked(entry))conflict('Hauptprodukte mit Shopify-Verknüpfung können hier nicht gelöscht werden.');
  sub.mainProducts.splice(index,1);
  const files=writeKatalogLineChange(katalog,next,{actor,now,action:'dashboard-delete',productId:entry.id,changes:{removed:{subcategoryId:sub.id,entry}},beforeReplace});
  return {changed:true,lineId:line.id,lineChecksum:lineSource(katalog,line).checksum,productId:entry.id,files,uncommitted:true};
 });
}
