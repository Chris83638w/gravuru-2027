import {createImportJobStore} from './import-job-store.mjs';
import {batchReportData} from './batch-report.mjs';
import {planBatch} from './batch.mjs';

export function createBatchJobs({filename,repository,assets}){
  return createImportJobStore({filename,table:'batch_jobs',plan:input=>planBatch(repository,input,assets),prepare:input=>{
    if(!input||Object.keys(input).some(k=>!['rows','designRows','designFiles','masterId','masterRevision','settings'].includes(k)))throw Object.assign(Error('Nur geprüfte Importdaten können gespeichert werden.'),{status:422,code:'batch_job'});
    const data=batchReportData(repository,{...input,mode:'report'},assets);
    // Keep the canonical shape of existing snapshots when no default folder is set.
    return {rows:data.rows,designRows:data.designRows,designFiles:structuredClone(input.designFiles||[]),...(data.settings.design_root?{settings:data.settings}:{})};
  }});
}
