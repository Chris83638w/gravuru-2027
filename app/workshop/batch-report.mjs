import {IMPORT_COLUMNS,DESIGN_COLUMNS,planBatch} from './batch.mjs';
import {variantWorkbook} from './variant-export.mjs';

const fail=message=>{throw Object.assign(Error(message),{status:422,code:'batch_report'});};
const text=value=>String(value??'').trim();
const labels={ready:'Bereit – noch nicht angewendet',existing:'Bereits ausgeführt',unchanged:'Unverändert',error:'Fehler'};
function cells(rows,columns){
  for(const row of rows){
    if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(key=>!columns.includes(key)))fail('Die Tabelle enthält unbekannte Spalten oder ungültige Zeilen.');
    for(const value of Object.values(row))if(value!=null&&!(typeof value==='number'&&Number.isFinite(value))&&!(typeof value==='string'&&value.length<=32767&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)))fail('Excel-Zellen benötigen Text bis 32767 Zeichen oder eine endliche Zahl.');
  }
}
/** Read-only fresh validation: never trust a browser-supplied success/error report. */
export function batchReportData(repository,input,assets){
  if(!input||!['report','errors'].includes(input.mode)||Object.keys(input).some(key=>!['mode','rows','designRows','designFiles','masterId','masterRevision','token'].includes(key)))fail('Prüfbericht oder Fehlerkorrektur auswählen.');
  if(!Array.isArray(input.rows)||input.rows.length<1||input.rows.length>100||!Array.isArray(input.designRows??[])||(input.designRows?.length||0)>3000)fail('Bitte 1 bis 100 Produktzeilen und höchstens 3000 Designzeilen übergeben.');
  cells(input.rows,IMPORT_COLUMNS);cells(input.designRows||[],DESIGN_COLUMNS);
  const plan=planBatch(repository,input,assets);
  const selected=plan.report.filter(row=>input.mode==='report'||row.status==='error');
  if(!selected.length)fail('Aktuell sind keine fehlerhaften Zeilen vorhanden. Den Prüfbericht herunterladen, um den aktuellen Stand zu sehen.');
  const rows=selected.map(item=>{
    const row=structuredClone(input.rows[item.row-1]);
    if((text(row.action)||'create')==='create'){
      // Pin only the defaults actually used by the planner. Invalid explicit references remain errors.
      if(!text(row.master_id)){row.master_id=input.masterId??'';if(!text(row.master_revision))row.master_revision=input.masterRevision??'';}
      else if(text(row.master_id)===input.masterId&&!text(row.master_revision))row.master_revision=input.masterRevision??'';
    }
    return row;
  });
  const keys=new Set(rows.map(row=>text(row.import_key)));
  cells(rows,IMPORT_COLUMNS);
  const designRows=(input.designRows||[]).filter(row=>keys.has(text(row.import_key))).map(row=>structuredClone(row));
  const positions=new Map(selected.map((row,index)=>[row.row,index+2]));
  const report=plan.report.map(item=>({source_record:item.row,correction_excel_row:positions.get(item.row)??'',import_key:item.key,name:item.name,status:labels[item.status],message:item.message||'',product_id:item.id||item.productId||'',expected_revision:item.expectedRevision??'',master_id:item.masterId??'',master_revision:item.masterRevision??''}));
  return {mode:input.mode,createdAt:new Date().toISOString(),columns:IMPORT_COLUMNS,designColumns:DESIGN_COLUMNS,rows,designRows,report};
}
export const batchReportWorkbook=data=>variantWorkbook(data,new URL('./batch-report.py',import.meta.url));

export {cells as validateWorkbookRows};
