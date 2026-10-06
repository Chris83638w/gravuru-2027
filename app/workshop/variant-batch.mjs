import {createHash} from 'node:crypto';
export const VARIANT_GROUP_COLUMNS=['import_key','name','action','group_id','expected_revision'];
export const VARIANT_MEMBER_COLUMNS=['import_key','variant_id','label','product_id','product_revision','default_variant'];
export const variantBatchHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const text=v=>String(v??'').trim(),fail=message=>{throw Object.assign(Error(message),{status:422,code:'variant_batch'});};
function rowKeys(row,columns){if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!columns.includes(k)))fail('Unbekannte Spalten oder ungültiger Datensatz.');}
function revision(value){const s=text(value),v=Number(s);if(!/^[1-9][0-9]*$/.test(s)||!Number.isSafeInteger(v))fail('Ein fester gespeicherter Stand als ganze Zahl ist erforderlich.');return v;}
export function planVariantBatch(store,{rows,variantRows=[]}={}){
 if(!Array.isArray(rows)||!rows.length||rows.length>100)fail('Bitte 1 bis 100 Gruppen verwenden.');
 if(!Array.isArray(variantRows)||variantRows.length>5000)fail('Bitte höchstens 5000 Ausführungszeilen verwenden.');
 const children=new Map(),counts=new Map(),targets=new Map();
 for(const r of rows){const key=text(r?.import_key);counts.set(key,(counts.get(key)||0)+1);if(text(r?.group_id))targets.set(text(r.group_id),(targets.get(text(r.group_id))||0)+1);}
 for(const [i,r] of variantRows.entries()){
  if(!r||typeof r!=='object'||Array.isArray(r))fail('Ungültiger Datensatz im Blatt Varianten.');
  const key=text(r.import_key);if(!counts.has(key)||!key)fail('Varianten, Datensatz '+(i+1)+': import_key gehört zu keiner Gruppe.');
  if(!children.has(key))children.set(key,[]);children.get(key).push({row:r,index:i+1});
 }
 const entries=[],report=[];
 for(const [i,r] of rows.entries()){
  const key=text(r?.import_key);
  try{
   rowKeys(r,VARIANT_GROUP_COLUMNS);if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(key)||counts.get(key)>1)fail('Importschlüssel fehlt, ist ungültig oder doppelt.');
   const action=text(r.action)||'create',groupId=text(r.group_id)||null;if(!['create','update'].includes(action))fail('action muss create oder update sein.');
   let expectedRevision=null,previous=null,current=null,document;
   if(action==='update'){
    expectedRevision=revision(r.expected_revision);if(!groupId)fail('update benötigt group_id.');if(targets.get(groupId)>1)fail('Eine Gruppe darf nur einmal pro Tabelle aktualisiert werden.');
    previous=store.get(groupId,expectedRevision);current=store.get(groupId);document=structuredClone(previous.document);if(document.archived)fail('Archivierte Gruppen zuerst bewusst im Backend aktivieren.');if(text(r.name))document.name=text(r.name);
   }else{if(groupId||text(r.expected_revision))fail('group_id und expected_revision benötigen action=update.');document={name:text(r.name),archived:false,defaultVariantId:null,variants:[]};}
   const members=children.get(key)||[];if(members.length>50)fail('Höchstens 50 Ausführungszeilen pro Gruppe.');const ids=new Set();let chosen=null;
   for(const {row:v,index} of members){try{
    rowKeys(v,VARIANT_MEMBER_COLUMNS);const id=text(v.variant_id),flag=text(v.default_variant);if(!/^[a-zA-Z0-9][\w-]{0,79}$/.test(id)||ids.has(id))fail('variant_id fehlt, ist ungültig oder doppelt.');ids.add(id);
    if(!['','0','1'].includes(flag))fail('default_variant muss leer, 0 oder 1 sein.');if(flag==='1'){if(chosen)fail('Nur eine Standardausführung pro Gruppe markieren.');chosen=id;}
    const member={id,label:text(v.label),productId:text(v.product_id),productRevision:revision(v.product_revision)},at=document.variants.findIndex(v=>v.id===id);
    if(at<0)document.variants.push(member);else document.variants[at]=member;
   }catch(e){fail('Varianten, Datensatz '+index+': '+e.message);}}
   document.defaultVariantId=chosen||document.defaultVariantId||document.variants[0]?.id||null;
   const fingerprint=variantBatchHash({action,groupId,expectedRevision,document}),prior=store.importItem(key);
   if(prior&&prior.fingerprint!==fingerprint)fail('Importschlüssel ist bereits mit anderen Daten verknüpft. Für eine neue Änderung einen neuen Schlüssel verwenden.');
   if(!prior){
    if(current&&(current.revision!==expectedRevision||current.document.archived))fail('Gruppe inzwischen geändert oder archiviert. Aktuellen Stand prüfen und expected_revision anpassen.');
    document=store.validate(document);
   }
   const unchanged=!prior&&previous&&JSON.stringify(document)===JSON.stringify(previous.document);
   if(!unchanged)entries.push({key,fingerprint,action,groupId,expectedRevision,document});
   report.push({row:i+1,key,name:document.name,action,status:prior?'existing':unchanged?'unchanged':'ready',groupId:prior?.id||groupId,expectedRevision,variants:document.variants,changedIds:[...ids],defaultVariantId:document.defaultVariantId});
  }catch(e){report.push({row:i+1,key,name:text(r?.name),status:'error',message:e.message});}
 }
 return {valid:report.every(r=>r.status!=='error'),entries,report,token:entries.length?variantBatchHash({rows,variantRows,entries:entries.map(e=>({key:e.key,fingerprint:e.fingerprint}))}):null};
}
