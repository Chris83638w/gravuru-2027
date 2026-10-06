import {randomUUID} from 'node:crypto';
import {IMPORT_COLUMNS,DESIGN_COLUMNS} from './batch.mjs';
import {isFormProduct} from './form-product.mjs';
import {variantWorkbook} from './variant-export.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'design_export'});};
export function designExportData(repository,input){
 if(!input||Object.keys(input).some(k=>k!=='productIds')||!Array.isArray(input.productIds)||!input.productIds.length||input.productIds.length>100||new Set(input.productIds).size!==input.productIds.length)fail('Bitte 1 bis 100 unterschiedliche Formprodukte auswählen.');
 const rows=[],designRows=[],references=[],batch=randomUUID();
 for(const id of input.productIds){
  const record=repository.get(id),d=record.document;if(record.status==='archived'||d.kind!=='product'||!isFormProduct(d))fail('Nur aktive freie Formprodukte können exportiert werden.');
  const key='design-export-'+batch+'-'+rows.length,row=Object.fromEntries(IMPORT_COLUMNS.map(k=>[k,'']));
  Object.assign(row,{import_key:key,name:d.name,action:'update',product_id:id,expected_revision:record.revision});rows.push(row);
  for(const design of d.designs||[]){
   const child=Object.fromEntries(DESIGN_COLUMNS.map(k=>[k,'']));Object.assign(child,{import_key:key,design_id:design.id,design_name:design.name,default_design:design.id===d.defaultDesignId?1:0});designRows.push(child);
   // Allowlist only. No customer field values, media, originals or file paths.
   references.push({product_id:id,product_revision:record.revision,design_id:design.id,design_name:design.name,width_mm:design.widthMm,height_mm:design.heightMm,field_count:design.fields?.length||0,default_design:design.id===d.defaultDesignId?1:0});
  }
 }
 return {rows,designRows,references,columns:IMPORT_COLUMNS,designColumns:DESIGN_COLUMNS};
}
export const designWorkbook=data=>variantWorkbook(data,new URL('./design-export.py',import.meta.url));
