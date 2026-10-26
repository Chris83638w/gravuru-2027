// R1 assigns families and themes only. It never approves, imports, creates variants or calls a shop.
import {createHash} from 'node:crypto';
import {setImmediate as nextTurn} from 'node:timers/promises';
import {katalogFor,patchDesignDerived} from './design-dashboard.mjs';
import {designTargets,assignTargetSeries} from './design-targets.mjs';
import {familyReadinessDetails} from './product-families.mjs';
import {safeKatalogPath} from './katalog-transaction.mjs';

const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const hash=value=>createHash('sha256').update(value).digest('hex');
const checksum=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const segment=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.,-]{0,119}$/.test(value)&&!value.includes('..');
const identifier=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9_.-]{0,79}$/i.test(value);
const fail=(status,message,code='design_assignments_invalid')=>{throw Object.assign(Error(message),{status,code});};
const errorInfo=error=>({status:error.status??500,code:error.code??'design_assignments_write',message:error.message});
const key=design=>JSON.stringify([design.reihe,design.id]);
function uniqueIds(value,label,max,{empty=false}={}){
 if(!Array.isArray(value)||(!empty&&!value.length)||value.length>max||value.some(id=>!identifier(id)))fail(422,label+': gültige Kennungen angeben (höchstens '+max+').');
 return [...new Set(value)];
}
function parseInput(input,{apply=false}={}){
 if(!record(input)||Object.keys(input).some(k=>!['designs','change',...(apply?['checksum']:[])].includes(k))||!record(input.change))fail(422,'Designauswahl und genau eine Zuordnungsaktion angeben.');
 if(!Array.isArray(input.designs)||!input.designs.length||input.designs.length>500)fail(422,'Zwischen 1 und 500 Designs je Sammelzuordnung auswählen.');
 const seen=new Set(),designs=input.designs.map(design=>{
  if(!record(design)||Object.keys(design).some(k=>!['reihe','id',...(apply?['sourceChecksum']:[])].includes(k))||!segment(design.reihe)||design.reihe==='bestand'||design.reihe.startsWith('_')||!segment(design.id))fail(422,'Nur eindeutige Lieferform-2-Designs mit Reihe und Kennung auswählen.');
  if(seen.has(key(design)))fail(422,'Ein Design wurde mehrfach ausgewählt.');seen.add(key(design));
  if(apply&&(!Object.hasOwn(design,'sourceChecksum')||design.sourceChecksum!==null&&!checksum(design.sourceChecksum)))fail(422,'Die Prüfsumme der vorbereiteten Designzuordnung fehlt.');
  return {reihe:design.reihe,id:design.id,...(apply?{sourceChecksum:design.sourceChecksum}:{})};
 });
 const fields=Object.keys(input.change);let change;
 if(fields.length===1&&fields[0]==='familyIds')change={familyIds:uniqueIds(input.change.familyIds,'Materialien',100)};
 else if(fields.length&&fields.every(k=>['themeAdd','themeRemove'].includes(k))){
  const normalize=list=>list.map(id=>id.toLowerCase()),themeAdd=normalize(uniqueIds(input.change.themeAdd??[],'Themen hinzufügen',20,{empty:true})),themeRemove=normalize(uniqueIds(input.change.themeRemove??[],'Themen entfernen',20,{empty:true}));
  if(!themeAdd.length&&!themeRemove.length)fail(422,'Mindestens ein Thema hinzufügen oder entfernen.');
  if(themeAdd.some(id=>themeRemove.includes(id)))fail(422,'Ein Thema kann nicht gleichzeitig hinzugefügt und entfernt werden.');
  change={themeAdd:[...new Set(themeAdd)],themeRemove:[...new Set(themeRemove)]};
 }else fail(422,'Materialien hinzufügen oder Themen ändern; keine Freigaben oder weiteren Felder senden.');
 if(apply&&(!checksum(input.checksum)||input.checksum!==planChecksum(designs,change)))fail(409,'Die bestätigte Auswahl wurde geändert. Zuordnung erneut vorbereiten.','design_assignments_conflict');
 return {designs,change};
}
const planChecksum=(designs,change)=>hash(JSON.stringify({designs:designs.map(({reihe,id,sourceChecksum})=>({reihe,id,sourceChecksum})),change}));
function context(katalog,change){
 // Geometry may resolve through original-family sizes and line bindings. Bind those rules,
 // not other design documents: applying one batch must not invalidate the next batch.
 const dependencies=change.familyIds?{families:[...katalog.families].sort(([a],[b])=>a.localeCompare(b)),lines:[...katalog.lines].sort(([a],[b])=>a.localeCompare(b))}:{themes:katalog.themes};
 return {katalog,change,dependencies:hash(JSON.stringify(dependencies)),readiness:new Map()};
}
function masterFor(katalog,design){
 const master=katalog.designs.masters.find(master=>master.seriesFolder===design.reihe&&master.id===design.id);
 if(!master)fail(404,'Design „'+design.id+'“ liegt in dieser Reihe nicht als Lieferform 2 vor.','design_missing');
 safeKatalogPath(katalog.root,'designs/'+design.reihe+'/'+design.id+'/design.json');safeKatalogPath(katalog.root,'designs/'+design.reihe+'/'+design.id+'/design.svg');
 return master;
}
function readiness(ctx,family){
 if(!ctx.readiness.has(family.id))ctx.readiness.set(family.id,familyReadinessDetails(family));
 return ctx.readiness.get(family.id);
}
function prepareOne(ctx,design){
 const {katalog,change}=ctx,master=masterFor(katalog,design),sourceChecksum=hash(JSON.stringify({dependencies:ctx.dependencies,json:master.json,svg:master.svg()}));
 const result={reihe:design.reihe,id:design.id,status:'ready',sourceChecksum,pairs:[],themesBefore:master.themes??[],themesAfter:master.themes??[]};let patch=null;
 if(change.familyIds){
  const targets=designTargets(master,katalog),existing=new Set(targets.map(target=>target.familie));
  result.pairs=change.familyIds.map(familyId=>{
   const family=katalog.families.get(familyId);
   if(!family)return {familyId,status:'incompatible',sizeKeys:[],reasons:['Familie fehlt.'],readiness:{complete:false,issues:['Familie fehlt.']}};
   const assigned=assignTargetSeries(family,[master],katalog)[0],sizeKeys=assigned.sizes;
   const reasons=sizeKeys.length?[]:[...new Set(assigned.excludedTargets.flatMap(target=>target.issues))];
   if(!sizeKeys.length&&!reasons.length)reasons.push('Keine passende Größe – Variante oder Klärung der Quelle nötig.');
   return {familyId,status:existing.has(familyId)?'existing':sizeKeys.length?'addable':'incompatible',sizeKeys,reasons,readiness:readiness(ctx,family)};
  });
  const add=result.pairs.filter(pair=>pair.status==='addable').map(pair=>pair.familyId);
  if(targets.length+add.length>100)fail(422,'Ein Design darf insgesamt höchstens 100 Familienziele tragen.');
  if(add.length)patch={reihe:design.reihe,designId:design.id,zieleHinzufuegen:add};
 }else{
  const unknown=[...change.themeAdd,...change.themeRemove].filter(theme=>!katalog.theme(theme));if(unknown.length)fail(422,'Unbekannte Themen: '+unknown.join(', ')+'.');
  const removed=new Set(change.themeRemove);result.themesAfter=[...new Set([...result.themesBefore.filter(theme=>!removed.has(theme)),...change.themeAdd])];
  if(result.themesAfter.length>20)fail(422,'Ein Design darf höchstens 20 Themen tragen.');
  if(JSON.stringify(result.themesBefore)!==JSON.stringify(result.themesAfter))patch={reihe:design.reihe,designId:design.id,themes:result.themesAfter};
 }
 return {result,patch};
}
export function prepareDesignAssignments(root,input){
 const {designs,change}=parseInput(input),ctx=context(katalogFor(root,{maxAgeMs:0}),change),rows=designs.map(design=>{
  try{return prepareOne(ctx,design).result;}catch(error){return {...design,status:'rejected',sourceChecksum:null,pairs:[],error:errorInfo(error)};}
 });
 const pairs=rows.flatMap(row=>row.pairs),counts={designs:rows.length,pairs:pairs.length,addable:pairs.filter(pair=>pair.status==='addable').length,existing:pairs.filter(pair=>pair.status==='existing').length,incompatible:pairs.filter(pair=>pair.status==='incompatible').length,rejected:rows.filter(row=>row.status==='rejected').length};
 return {counts,designs:rows,checksum:planChecksum(rows,change)};
}
export async function applyDesignAssignments(root,input,{actor='werkstatt',now=new Date(),beforeReplace}={}){
 const {designs,change}=parseInput(input,{apply:true}),rows=[];
 for(const design of designs){
  let planned=null;
  try{
   const saved=patchDesignDerived(root,katalog=>{
    const prepared=prepareOne(context(katalog,change),design);planned=prepared.result;
    // An unchanged retry is harmless and does not add another audit line. Every mutation
    // still requires exactly the source/rules that the operator saw before confirmation.
    if(prepared.patch&&planned.sourceChecksum!==design.sourceChecksum)fail(409,'Design oder Zuordnungsregeln wurden inzwischen geändert. Zuordnung erneut vorbereiten.','design_assignments_conflict');
    return prepared.patch;
   },{actor,now,beforeReplace:beforeReplace?(relative,index)=>beforeReplace(design,relative,index):undefined});
   const pairs=planned.pairs.map(pair=>({...pair,status:pair.status==='addable'?'added':pair.status})),onlyIncompatible=pairs.length>0&&pairs.every(pair=>pair.status==='incompatible');
   rows.push({...planned,status:onlyIncompatible?'rejected':'ok',changed:saved.changed,files:saved.files,pairs,...(onlyIncompatible?{error:{status:422,code:'design_assignments_incompatible',message:'Keine passende Größe – keine Ziele hinzugefügt.'}}:{})});
  }catch(error){rows.push({reihe:design.reihe,id:design.id,status:'rejected',changed:false,files:[],pairs:(planned?.pairs??[]).map(pair=>pair.status==='addable'?{...pair,status:'rejected',reasons:[...pair.reasons,error.message]}:pair),error:errorInfo(error)});}
  // One catalogue lock/transaction per design; allow other requests between items.
  await nextTurn();
 }
 const pairs=rows.flatMap(row=>row.pairs),counts={designs:rows.length,changed:rows.filter(row=>row.changed).length,unchanged:rows.filter(row=>row.status==='ok'&&!row.changed).length,rejected:rows.filter(row=>row.status==='rejected').length,added:pairs.filter(pair=>pair.status==='added').length,existing:pairs.filter(pair=>pair.status==='existing').length,incompatible:pairs.filter(pair=>pair.status==='incompatible').length,rejectedPairs:pairs.filter(pair=>pair.status==='rejected').length};
 return {counts,designs:rows};
}
