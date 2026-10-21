import {workbookSheets,records} from './batch-reader.mjs';
const groups=['import_key','name','action','group_id','expected_revision'],members=['import_key','variant_id','label','product_id','product_revision','default_variant'];
export function parseVariantWorkbook(bytes){
 const {matrixFor,hasSheet}=workbookSheets(bytes);
 return {rows:records(matrixFor('Gruppen',groups.length),{allowed:groups,required:['import_key','name'],limit:100}),variantRows:hasSheet('Varianten')?records(matrixFor('Varianten',members.length),{allowed:members,required:['import_key','variant_id','label','product_id','product_revision'],limit:5000,optional:true}):[]};
}
export async function readVariantImport(file){if(!file||file.size>5*1024*1024||!file.name.toLowerCase().endsWith('.xlsx'))throw Error('Bitte eine XLSX-Datei bis 5 MB mit den Blättern Gruppen und Varianten wählen.');return parseVariantWorkbook(new Uint8Array(await file.arrayBuffer()));}
