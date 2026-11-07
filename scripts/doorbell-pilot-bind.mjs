// Fixed, explicitly selected AOSU pilot. It composes the production binding
// functions; it neither creates Shopify products nor registers webhooks.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {parseStoredDocument} from '../app/workshop/product-document-resources.mjs';
import {isDeepStrictEqual} from 'node:util';
import {resolvedOptions} from '../app/configurator/variant-m/contract.mjs';
import {DOORBELL_BIND_SCHEMA,validateDoorbellManifest,validateDoorbellExport,validateDoorbellRecords,createDoorbellLiveReader,applyDoorbellBindings} from './doorbell-shop-bind.mjs';
import {openWorkshopDb} from './shop-bind.mjs';
import {readCredentials,createShopifyClient,exportProducts,EXPORT_SCHEMA} from './shop-export.mjs';

export const PILOT_MODEL='aosu-pro-v8p1ax11-16x28';
export const PILOT_PRODUCTS=Object.freeze({'16x28':'gid://shopify/Product/16124413084028','24x20':'gid://shopify/Product/16182701621628','35x18':'gid://shopify/Product/16182702211452'});
export const PILOT_MANIFEST_SHA='98014562f22f360dd7ae70335a701e711a8b4b9a7d0096190b3985e7f3f17233';
const SHOP='gravuru-design.myshopify.com',formats=Object.keys(PILOT_PRODUCTS);
const fail=message=>{throw Object.assign(Error(message),{code:'doorbell_pilot'});};
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const expectedDefaults=format=>({format,color:format==='24x20'?'anthrazit':'schwarz',frame:'FK-RUNDUM',mounting:'K00',position:'standard',designId:'FK-RUNDUM'});

export function preparePilotManifest({createdInput,portraitPlan,importReport,readImportDocument,resolveImportedRecord}){
 if(createdInput?.schema!=='gravuru-doorbell-created-binding-input/v1'||createdInput.shopDomain!==SHOP||!Array.isArray(createdInput.products)||createdInput.products.length!==2)fail('Genau die zwei angelegten AOSU-Pilotprodukte sind erforderlich.');
 if(importReport?.schema!=='gravuru-doorbell-import-report/v1'||importReport.mode!=='imported-internal-only'||importReport.manifestSha256!==PILOT_MANIFEST_SHA||!Array.isArray(importReport.entries))fail('Der echte Serverimportbericht des geprüften Katalogstands fehlt.');
 const rows=[portraitPlan,...createdInput.products],records=new Map(),products=[];
 if(rows.length!==3||new Set(rows.map(p=>p.formatKey)).size!==3)fail('Der Pilot benötigt genau drei unterschiedliche Einstiegsformate.');
 for(const formatKey of formats){
  const row=rows.find(p=>p.formatKey===formatKey),key=PILOT_MODEL+'--'+formatKey;
  if(!row||row.key!==key||row.modelKey!==PILOT_MODEL||row.shopifyProductId!==PILOT_PRODUCTS[formatKey]||!isDeepStrictEqual(row.defaults,expectedDefaults(formatKey)))fail('Modell, Format, Shop-ID oder Startwerte gehören nicht zum festgelegten AOSU-Pilot.');
  const matches=importReport.entries.filter(e=>e.key===key);
  if(matches.length!==1)fail('Der Importbericht enthält keine eindeutige Pilotzuordnung.');
  const imported=matches[0],importKey='doorbell-v1:'+key;
  if(imported.importKey!==importKey||!/^cfg_[a-f0-9-]{36}$/.test(imported.id||'')||!/^[a-f0-9]{64}$/.test(imported.fingerprint||'')||imported.documentPath!=='documents/'+key+'.json'||!isDeepStrictEqual(imported.defaults,row.defaults))fail('Import-ID, Fingerprint, Dokumentpfad oder Startwerte sind nicht eindeutig.');
  const record=resolveImportedRecord(importKey);
  if(!record||record.id!==imported.id||record.importFingerprint!==imported.fingerprint||!isDeepStrictEqual(record.document,readImportDocument(imported.documentPath)))fail('Aktuelle Produktrevision und geprüfter Importstand stimmen nicht mehr überein.');
  const config=record.document?.config,options=resolvedOptions(config);
  if(['format','color','frame','mounting'].some(k=>options[k]!==row.defaults[k])||config.doorbell?.defaultPosition!==row.defaults.position||config.profile?.defaultDesignId!==row.defaults.designId)fail('Gespeicherte Startwerte stimmen nicht mit dem Pilotprodukt überein.');
  records.set(record.id,record);
  products.push({modelKey:PILOT_MODEL,formatKey,productId:record.id,productRevision:record.revision,shopifyProductId:row.shopifyProductId,defaults:structuredClone(row.defaults),variants:structuredClone(row.variants)});
 }
 const manifest={schema:DOORBELL_BIND_SCHEMA,shopDomain:SHOP,scope:'aosu-pro-three-format-pilot',products};
 const selections=validateDoorbellManifest(manifest,{expectedModels:1,expectedProducts:3});
 validateDoorbellRecords(manifest,id=>records.get(id));
 return {manifest,selections};
}

export function readPilotManifest({createdInput,portraitPlan,importReportFile,database}){
 if(!fs.existsSync(database))fail('Der bestehende Acryl-Speicher fehlt.');
 const report=read(importReportFile),base=fs.realpathSync(path.dirname(importReportFile));
 const db=new DatabaseSync(database,{readOnly:true});
 try{
  if(![4,5].includes(db.prepare('PRAGMA user_version').get().user_version))fail('Nur der vorhandene Acryl-Speicher mit Schema v4 oder v5 ist zulässig.');
  const query=db.prepare('SELECT p.id,p.revision,p.archived,p.kind,r.document,r.status,r.metadata,i.fingerprint FROM import_items i JOIN products p ON p.id=i.product_id AND p.tenant_id=i.tenant_id JOIN product_revisions r ON r.product_id=p.id AND r.tenant_id=p.tenant_id AND r.revision=p.revision WHERE i.tenant_id=? AND i.import_key=?');
  return preparePilotManifest({createdInput,portraitPlan,importReport:report,
   readImportDocument:relative=>{
    const file=fs.realpathSync(path.resolve(base,relative)),rel=path.relative(base,file);
    if(path.isAbsolute(rel)||rel==='..'||rel.startsWith('..'+path.sep))fail('Importdokument liegt außerhalb der Prüfablage.');
    return read(file);
   },
   resolveImportedRecord:key=>{
    const r=query.get('gravuru',key);
    return r&&!r.archived&&r.kind==='product'?{id:r.id,revision:r.revision,status:r.status,metadata:JSON.parse(r.metadata),document:parseStoredDocument(db,r.document,{tenantId:'gravuru'}),importFingerprint:r.fingerprint}:null;
   }});
 }finally{db.close();}
}

export function parsePilotArgs(argv){
 const options={apply:false,approveLive:false};
 const fields=new Map([['--created-input','createdInput'],['--portrait-plan','portraitPlan'],['--import-report','importReport'],['--db','database'],['--out','out'],['--export','exportFile'],['--approval-id','approvalId']]);
 for(let i=0;i<argv.length;i++){
  const arg=argv[i];
  if(arg==='--apply'){options.apply=true;continue;}
  if(arg==='--approve-live'){options.approveLive=true;continue;}
  const field=fields.get(arg),value=argv[++i];
  if(!field||!value||value.startsWith('--')||options[field]!==undefined)fail('Unbekannte, doppelte oder unvollständige Pilotoption.');
  options[field]=value;
 }
 if(['createdInput','portraitPlan','importReport','database','out'].some(k=>!options[k]))fail('Aufruf: --created-input <pilot-binding-input.json> --portrait-plan <AOSU-16x28.json> --import-report <Serverimport/import-report.json> --db <Acryl-workshop.sqlite> --out <Prüfordner> [--export <vollständiger-Shop-Export>] [--apply [--approve-live --approval-id <Freigabe>]]');
 if(options.approveLive&&(!options.apply||!options.approvalId))fail('Livefreigabe benötigt ausdrücklich --apply und --approval-id.');
 if(options.approvalId&&!options.approveLive)fail('--approval-id benötigt --approve-live.');
 return options;
}

export async function run(argv,{env=process.env,stdout=process.stdout,client:providedClient}={}){
 const args=parsePilotArgs(argv),prepared=readPilotManifest({createdInput:read(args.createdInput),portraitPlan:read(args.portraitPlan),importReportFile:args.importReport,database:path.resolve(args.database)});
 const {manifest,selections}=prepared,out=path.resolve(args.out);
 const client=providedClient||createShopifyClient({credentials:readCredentials(env)});
 let exported;
 if(args.exportFile)exported=read(args.exportFile);
 else{
  // Small pages remain comfortably below Shopify's requested-query cost limit.
  const result=await exportProducts(client,{pageSize:5,variantPageSize:120});
  exported={schema:EXPORT_SCHEMA,shopDomain:client.shopDomain,apiVersion:client.apiVersion,exportedAt:new Date().toISOString(),complete:result.complete,products:result.products};
 }
 const exportCheck=validateDoorbellExport(exported,manifest);
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 if(!args.exportFile)fs.writeFileSync(path.join(out,'products.json'),JSON.stringify(exported,null,2)+'\n');
 const report={schema:'gravuru-doorbell-pilot-bind-report/v1',generatedAt:new Date().toISOString(),mode:args.apply?'apply':'dry-run',shopDomain:SHOP,modelKey:PILOT_MODEL,products:3,variants:360,export:exportCheck,written:false,liveRelease:null,blocks:[],webhookSubscriptionsChanged:false,productionReady:false};
 const save=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 let workshop;
 try{
  const reader=createDoorbellLiveReader(client,selections);
  if(args.apply){
   workshop=openWorkshopDb(path.resolve(args.database),{tenantId:'gravuru',storeId:'acryl',shopDomain:SHOP});
   const result=await applyDoorbellBindings({manifest,selections,workshop,reader,approvalId:args.approveLive?args.approvalId:null,onProgress:row=>{report.blocks.push(row);save();}});
   report.written=true;report.liveRelease=result.liveRelease;
  }else{
   for(let i=0;i<selections.length;i+=100)await reader.inspectVariants(selections.slice(i,i+100).map(s=>s.shopifyVariantId));
   report.shopVerified=true;
  }
  save();stdout.write(JSON.stringify({mode:report.mode,products:3,variants:360,written:report.written,liveRelease:report.liveRelease,webhookSubscriptionsChanged:false,productionReady:false})+'\n');return report;
 }catch(error){report.error={code:error.code||'doorbell_pilot',message:error.message};save();throw error;}finally{workshop?.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).catch(error=>{process.stderr.write((error.code?'['+error.code+'] ':'')+error.message+'\n');process.exitCode=1;});
