// Hash only already received/exported records. Never contacts a DB or creates plan IDs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {argumentsFor,sha,writeJson} from './inputs.mjs';
const a=argumentsFor(process.argv.slice(2),['workspace','records-dir','out-index','evidence-source','source-commit','store-id']);
const root=path.resolve(a['records-dir']),reference=JSON.parse(await fs.readFile(new URL('./v9-reference.json',import.meta.url),'utf8'));
const file=async name=>({path:name,sha256:sha(await fs.readFile(path.join(root,name)))});
const find=async name=>{for(const p of [name,name+'.gz'])try{return await file(p);}catch(e){if(e.code!=='ENOENT')throw e;}throw Error('Missing actual received record: '+name);};
const records=[];
for(const ref of reference.records)records.push({key:ref.key,originalWorkbookSha256:ref.originalSha256,creationKey:ref.creationKey,
 plan:await find(ref.key+'/plan.json'),template:await find(ref.key+'/template.json'),sourceDocument:await find(ref.key+'/source-document.json'),sourceMetadata:await find(ref.key+'/source-metadata.json')});
const report=await file('PINS.json'),compact=await file('kompakt-serverwerte.json');
const data=JSON.parse(await fs.readFile(path.join(root,report.path),'utf8'));
if(data.schema!=='gravuru-sechsgruppen-kopienrecords/v1'||data.confirm!==0||data.execute!==0)throw Error('Actual operator no-confirm/no-execute evidence required');
const result={schema:'gravuru-six-copy-plan-excel-input/v1',environment:'isolated-copy',tenantId:'gravuru',storeId:a['store-id'],
 recordsRoot:path.relative(path.resolve(a.workspace),root).replaceAll('\\','/'),recordProvenance:'local-reconstruction-matched-to-server-canonical-hashes',
 evidenceSource:a['evidence-source'],sourceCommit:a['source-commit'],confirmations:0,executions:0,shopifyWrites:0,approvalHash:null,
 nativePins:report,compactServerValues:compact,moduleProfile:await find('module-profile.get-record.json'),motifProfile:await find('motif-profile.get-record.json'),records};
const destination=path.resolve(a['out-index']);await writeJson(destination,result);
console.log(JSON.stringify({input:destination,sha256:sha(await fs.readFile(destination)),actualRecordsHashed:true,authoring:false}));
