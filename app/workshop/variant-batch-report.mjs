import {VARIANT_GROUP_COLUMNS,VARIANT_MEMBER_COLUMNS} from './variant-batch.mjs';
import {validateWorkbookRows,batchReportWorkbook} from './batch-report.mjs';
import {createImportJobStore} from './import-job-store.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'variant_batch_report'});};
const text=value=>String(value??'').trim();
const labels={ready:'Bereit – noch nicht angewendet',existing:'Bereits ausgeführt',unchanged:'Unverändert',error:'Fehler'};
export function variantBatchReportData(variants,input){
  if(!input||!['report','errors'].includes(input.mode)||Object.keys(input).some(k=>!['mode','rows','variantRows'].includes(k)))fail('Prüfbericht oder Fehlerkorrektur für Ausführungen auswählen.');
  if(!Array.isArray(input.rows)||input.rows.length<1||input.rows.length>100||!Array.isArray(input.variantRows??[])||(input.variantRows?.length||0)>5000)fail('Bitte 1 bis 100 Gruppen und höchstens 5000 Ausführungszeilen übergeben.');
  validateWorkbookRows(input.rows,VARIANT_GROUP_COLUMNS);validateWorkbookRows(input.variantRows||[],VARIANT_MEMBER_COLUMNS);
  const plan=variants.plan(input),selected=plan.report.filter(row=>input.mode==='report'||row.status==='error');
  if(!selected.length)fail('Aktuell sind keine fehlerhaften Gruppen vorhanden. Der Prüfbericht zeigt den aktuellen Stand.');
  const rows=selected.map(row=>structuredClone(input.rows[row.row-1])),keys=new Set(rows.map(row=>text(row.import_key)));
  const variantRows=(input.variantRows||[]).filter(row=>keys.has(text(row.import_key))).map(row=>structuredClone(row));
  const positions=new Map(selected.map((row,index)=>[row.row,index+2]));
  const report=plan.report.map(row=>({source_record:row.row,correction_excel_row:positions.get(row.row)??'',import_key:row.key,name:row.name,status:labels[row.status],message:row.message||'',group_id:row.groupId||'',expected_revision:row.expectedRevision??''}));
  return {kind:'variants',mode:input.mode,createdAt:new Date().toISOString(),columns:VARIANT_GROUP_COLUMNS,designColumns:VARIANT_MEMBER_COLUMNS,rows,variantRows,report};
}
export const variantBatchReportWorkbook=batchReportWorkbook;
export function createVariantBatchJobs({filename,variants,tenantId}){
  return createImportJobStore({filename,table:'variant_batch_jobs',tenantId:tenantId??variants?.tenantId,plan:input=>variants.plan(input),prepare:input=>{
    if(!input||Object.keys(input).some(k=>!['rows','variantRows'].includes(k)))fail('Nur Gruppen- und Ausführungszeilen können gespeichert werden.');
    const data=variantBatchReportData(variants,{...input,mode:'report'});
    return {rows:data.rows,variantRows:data.variantRows};
  }});
}
