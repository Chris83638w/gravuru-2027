import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {importEnvironment} from './design-assets.mjs';
import {isFormProduct,FORM_MATERIALS} from './form-product.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'variant_export'});};
export function variantExportData(store,repository,input){
 if(!input||Object.keys(input).some(k=>k!=='groupIds')||!Array.isArray(input.groupIds)||input.groupIds.length>100||new Set(input.groupIds).size!==input.groupIds.length)fail('Bitte höchstens 100 unterschiedliche Gruppen auswählen.');
 const rows=[],variantRows=[],catalog=new Map(),batch=randomUUID();
 const addProduct=(record,referenced=false)=>{
  const key=record.id+':'+record.revision;if(catalog.has(key)){if(referenced)catalog.get(key).referenced=true;return;}
  if(catalog.size>=5000)fail('Die Produktliste überschreitet 5000 Stände. Export bitte eingrenzen.');
  const d=record.document,current=repository.get(record.id);let availability='Verwendbar';
  try{store.validate({name:'Prüfung',archived:false,defaultVariantId:'check',variants:[{id:'check',label:'Prüfung',productId:record.id,productRevision:record.revision}]});}catch(e){availability=e.message;}
  catalog.set(key,{product_id:record.id,product_revision:record.revision,name:d.name,material:FORM_MATERIALS.find(m=>m.id===d.material.id)?.name||d.material.id,width_mm:d.form.geometry.widthMm,height_mm:d.form.geometry.heightMm,thickness_mm:d.material.thicknessMm,method:d.processingMethod,price_cents:d.basePriceCents,design_count:d.designs?.length||0,current_revision:current.revision,availability,referenced});
 };
 // Everything is captured synchronously before the XLSX worker starts. No source writes.
 for(const id of input.groupIds){
  const g=store.get(id);if(g.document.archived)fail('Archivierte Gruppen zuerst bewusst in der Gruppenverwaltung aktivieren.');
  const key='export-'+batch+'-'+rows.length;
  rows.push({import_key:key,name:g.document.name,action:'update',group_id:g.id,expected_revision:g.revision});
  for(const v of g.document.variants){variantRows.push({import_key:key,variant_id:v.id,label:v.label,product_id:v.productId,product_revision:v.productRevision,default_variant:v.id===g.document.defaultVariantId?1:0});addProduct(repository.get(v.productId,{revision:v.productRevision}),true);}
 }
 for(const record of repository.list())if(isFormProduct(record.document)&&record.document.kind==='product')addProduct(record);
 return {rows,variantRows,products:[...catalog.values()]};
}
export function variantWorkbook(data){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.env.GRAVURU_PYTHON||(process.platform==='win32'?'python':'python3'),[fileURLToPath(new URL('./variant-export.py',import.meta.url))],{env:importEnvironment(),windowsHide:true,stdio:['pipe','pipe','pipe']});
  let done=false,size=0;const chunks=[];
  const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?reject(Object.assign(Error(error),{status:422,code:'variant_export'})):resolve(value);};
  const timer=setTimeout(()=>{child.kill();finish('Excel-Export hat zu lange gedauert.');},30000);
  child.on('error',()=>finish('Python ist für den Excel-Export nicht verfügbar.'));child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>5*1024*1024){child.kill();finish('Excel-Datei überschreitet 5 MB. Bitte weniger Gruppen wählen.');}else chunks.push(chunk);});
  child.on('close',code=>{const bytes=Buffer.concat(chunks);if(code||bytes.subarray(0,2).toString()!=='PK')finish('Excel-Export fehlgeschlagen. Die dokumentierte Python-Abhängigkeit openpyxl wird benötigt.');else finish(null,bytes);});
  child.stdin.end(JSON.stringify(data));
 });
}
