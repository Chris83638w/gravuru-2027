// Prepared native products -> existing workshop store. No publication or checkout activation.
// The same command plans by default and commits only with --apply. Immutable assets are appended.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync,backup} from 'node:sqlite';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {parseStoredDocument} from '../app/workshop/product-document-resources.mjs';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';
import {prepareShopProduct} from '../app/workshop/shop-preparation.mjs';
import {saveSlateGroup,slateGroupMainImage} from '../app/workshop/slate-product-groups.mjs';
import {checkRuntime} from './check-slate-import-runtime.mjs';

export const BUNDLE_SCHEMA='gravuru-slate-group-import/v1';
export const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const atomic=(file,value)=>{fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.renameSync(file+'.tmp',file);};
const fail=message=>{throw Error(message);};
const tables={design_sources:['sha256','bytes'],design_assets:['id','source_sha256','preview','metadata','tenant_id'],material_surfaces:['sha256','original','preview','tenant_id'],photo_example_sources:['asset_id','source_sha256','tenant_id']};
const binary=new Set(['bytes','preview','original']);
const decoded=row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,binary.has(k)?Buffer.from(v,'base64'):v]));
const encoded=row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v instanceof Uint8Array?Buffer.from(v).toString('base64'):v]));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const columns=db=>Object.fromEntries(Object.keys(tables).map(t=>[t,db.prepare('PRAGMA table_info('+t+')').all().map(c=>c.name)]));
function checkTables(db){const c=columns(db);for(const [t,expected] of Object.entries(tables))if(!same(c[t],expected))fail('Ressourcenschema abweichend: '+t);}
function assetReferences(document){
 const c=document.config,ids=new Set();
 for(const e of c.localResources?.photoExamples??[])ids.add(e.assetId);
 for(const m of c.localResources?.motifs??[])if(m.artwork)ids.add(m.artwork.assetId);
 for(const d of c.profile.designs){for(const s of [d.editableSource,d.importedSource])if(s)ids.add(s.assetId);for(const o of d.objects)if(o.photoMaskAssetId)ids.add(o.photoMaskAssetId);}
 return ids;
}
export function validateBundle(bundle){
 if(bundle?.schema!==BUNDLE_SCHEMA||bundle.tenantId!=='gravuru'||!Array.isArray(bundle.products)||!bundle.products.length||!bundle.assets)fail('Kein vollständiges Schiefer-Importpaket.');
 if(!same(Object.keys(bundle.assets).sort(),Object.keys(tables).sort()))fail('Unbekannte Ressourcentabellen im Paket.');
 const keys=new Set(),profiles=new Set();
 for(const p of bundle.products){
  if(!/^schiefer-gruppe:[a-f0-9]{32}$/.test(p.key)||keys.has(p.key)||profiles.has(p.document?.config?.profile?.id))fail('Produktkennungen sind nicht eindeutig.');
  keys.add(p.key);profiles.add(p.document.config.profile.id);
  if(digest(p.document)!==p.fingerprint)fail('Produktprüfsumme geändert: '+p.key);
  const d=validateProductDocument(p.document),c=d.config;
  if(!same(d,p.document)||d.kind!=='product'||c.profile.material.kind!=='slate'||c.profile.defaultDesignId!==p.defaultDesignId)fail('Nativer Produktstand oder Startdesign verändert.');
  if(c.profile.designs.some(v=>!v.katalog?.target?.released||!v.katalog.target.explicit||v.katalog.target.familyId!==p.family)||!same(c.profile.designs.map(v=>v.katalog.designId),p.designIds))fail('Eine Galerie enthält ungeprüfte oder fremde Designs.');
  const variants=prepareShopProduct({id:p.productId,revision:p.revision,status:'draft',document:d}).variants;
  if(!same(variants.map(v=>({options:v.options,priceCents:v.priceCents})),p.variants.map(v=>({options:v.options,priceCents:v.priceCents}))))fail('Server-Preis-/Variantenlogik passt nicht zum vorbereiteten Produkt: '+p.sourceDesignId);
  if(p.mainImage.designId!==p.defaultDesignId||digest(Buffer.from(p.imageSvg,'base64'))!==p.mainImage.sha256)fail('Hauptbild gehört nicht zum gespeicherten Startdesign.');
 }
 for(const [table,cols]of Object.entries(tables)){
  if(!Array.isArray(bundle.assets[table]))fail('Ressourcentabelle fehlt: '+table);
  for(const row of bundle.assets[table])if(!same(Object.keys(row),cols)||row.tenant_id&&row.tenant_id!==bundle.tenantId)fail('Fremde oder ungültige Ressource.');
 }
 const sources=new Map(bundle.assets.design_sources.map(r=>[r.sha256,r]));
 for(const r of sources.values())if(digest(Buffer.from(r.bytes,'base64'))!==r.sha256)fail('Originaldatei wurde verändert.');
 const assets=new Map(bundle.assets.design_assets.map(r=>[r.id,r]));
 if(assets.size!==bundle.assets.design_assets.length||sources.size!==bundle.assets.design_sources.length)fail('Doppelte Ressourcenkennung.');
 for(const r of assets.values()){
  const m=JSON.parse(r.metadata);if(!sources.has(r.source_sha256)||m.assetId!==r.id||m.sourceSha256!==r.source_sha256||digest(Buffer.from(r.preview,'base64'))!==m.previewSha256||digest([m.sourceSha256,m.previewSha256,m.page].join(':'))!==r.id)fail('Original/Vorschau stimmen nicht mit der Ressourcenkennung überein.');
 }
 const surfaces=new Map(bundle.assets.material_surfaces.map(r=>[r.sha256,r]));
 if(surfaces.size!==bundle.assets.material_surfaces.length)fail('Doppelte Materialoberfläche.');
 for(const r of surfaces.values())if(digest(Buffer.from(r.original,'base64'))!==r.sha256)fail('Materialoriginal wurde verändert.');
 for(const p of bundle.products)for(const k of ['materialSurface','sceneBackground']){const id=p.document.config[k]?.match(/^\/api\/workshop\/material-surfaces\/([a-f0-9]{64})\.png$/)?.[1];if(id&&!surfaces.has(id))fail('Materialoberfläche fehlt.');}
 for(const p of bundle.products)for(const id of assetReferences(p.document))if(!assets.has(id))fail('Originalressource fehlt: '+id);
 for(const r of bundle.assets.photo_example_sources)if(!assets.has(r.asset_id)||!sources.has(r.source_sha256))fail('Originalfoto fehlt.');
 for(const p of bundle.products){
  const examples=(p.document.config.localResources.photoExamples??[]).map(e=>({...e,url:'data:image/svg+xml;base64,'+assets.get(e.assetId).preview}));
  if(slateGroupMainImage(p.document,{examples}).sha256!==p.mainImage.sha256)fail('Das Hauptbild entspricht nicht dem gerenderten Startdesign.');
 }
 return bundle;
}
export function makeBundle(source,{only=[]}={}){
 const all=read(path.join(source,'shopify-plan.json')),products=all.filter(p=>!only.length||only.includes(p.sourceDesignId)||only.includes(p.key));
 if(only.some(id=>!products.some(p=>p.key===id||p.sourceDesignId===id)))fail('Ausgewähltes Startdesign fehlt in der Vorbereitung.');
 const db=new DatabaseSync(path.join(source,'workshop.sqlite'),{readOnly:true}),adb=new DatabaseSync(path.join(source,'design-assets.sqlite'),{readOnly:true});
 try{
  checkTables(adb);
  const entries=products.map(p=>{const row=db.prepare('SELECT document FROM product_revisions WHERE product_id=? AND revision=? AND tenant_id=?').get(p.productId,p.revision,'gravuru');if(!row)fail('Vorbereitete Revision fehlt.');const imagePath=fs.realpathSync(path.join(source,p.mainImage.file)),relative=path.relative(fs.realpathSync(source),imagePath);if(relative.startsWith('..'+path.sep)||path.isAbsolute(relative))fail('Hauptbild liegt außerhalb der Vorbereitung.');return {...p,document:parseStoredDocument(db,row.document,{tenantId:'gravuru'}),imageSvg:fs.readFileSync(imagePath).toString('base64')};});
  const ids=new Set(entries.flatMap(p=>[...assetReferences(p.document)])),assets=Object.fromEntries(Object.keys(tables).map(t=>[t,[]]));
  assets.design_assets=adb.prepare('SELECT * FROM design_assets WHERE tenant_id=?').all('gravuru').filter(r=>ids.has(r.id));
  assets.photo_example_sources=adb.prepare('SELECT * FROM photo_example_sources WHERE tenant_id=?').all('gravuru').filter(r=>ids.has(r.asset_id));
  const sourceIds=new Set([...assets.design_assets.map(r=>r.source_sha256),...assets.photo_example_sources.map(r=>r.source_sha256)]);
  assets.design_sources=adb.prepare('SELECT * FROM design_sources').all().filter(r=>sourceIds.has(r.sha256));
  const surfaceIds=new Set(entries.flatMap(p=>['materialSurface','sceneBackground'].map(k=>p.document.config[k]?.match(/^\/api\/workshop\/material-surfaces\/([a-f0-9]{64})\.png$/)?.[1]).filter(Boolean)));
  assets.material_surfaces=adb.prepare('SELECT * FROM material_surfaces WHERE tenant_id=?').all('gravuru').filter(r=>surfaceIds.has(r.sha256));
  return validateBundle({schema:BUNDLE_SCHEMA,tenantId:'gravuru',products:entries,assets:Object.fromEntries(Object.entries(assets).map(([t,rows])=>[t,rows.map(encoded)]))});
 }finally{db.close();adb.close();}
}
function existingRows(db,bundle){
 checkTables(db);const pending={};
 for(const [t,rows]of Object.entries(bundle.assets)){
  const primary=t==='photo_example_sources'?['asset_id','source_sha256','tenant_id']:[t==='design_assets'?'id':'sha256'];pending[t]=[];
  const get=db.prepare('SELECT * FROM '+t+' WHERE '+primary.map(k=>k+'=?').join(' AND '));
  for(const row of rows){const prior=get.get(...primary.map(k=>row[k]));if(prior&&!same(encoded(prior),row))fail('Bestehende unveränderliche Ressource weicht ab: '+t);if(!prior)pending[t].push(row);}
 }
 return pending;
}
export function planImport(bundle,target){
 validateBundle(bundle);
 const db=new DatabaseSync(path.join(target,'workshop.sqlite'),{readOnly:true}),adb=new DatabaseSync(path.join(target,'design-assets.sqlite'),{readOnly:true});
 try{
  if(![4,5].includes(db.prepare('PRAGMA user_version').get().user_version))fail('Ziel ist keine vorhandene Werkstatt mit Schema 4 oder 5.');
  const pending=existingRows(adb,bundle),stateFile=path.join(target,'slate-group-import-state.json'),states=fs.existsSync(stateFile)?read(stateFile):{};
  const products=bundle.products.map(p=>{
   const prior=db.prepare('SELECT product_id FROM import_items WHERE import_key=? AND tenant_id=?').get(p.key,bundle.tenantId);
   const collisions=db.prepare("SELECT p.id FROM products p JOIN product_revisions r ON p.id=r.product_id AND p.tenant_id=r.tenant_id AND p.revision=r.revision WHERE p.tenant_id=? AND p.archived=0 AND json_extract(r.document,'$.config.profile.id')=?").all(bundle.tenantId,p.document.config.profile.id);
   if(collisions.some(r=>r.id!==prior?.product_id))fail('Die Produktgruppe existiert außerhalb dieses Imports; zuerst zuordnen: '+p.sourceDesignId);
   if(!prior)return {key:p.key,action:'create',sourceDesignId:p.sourceDesignId};
   const row=db.prepare('SELECT p.id,p.revision,p.archived,r.document FROM products p JOIN product_revisions r ON p.id=r.product_id AND p.tenant_id=r.tenant_id AND p.revision=r.revision WHERE p.id=? AND p.tenant_id=?').get(prior.product_id,bundle.tenantId);
   if(!row||row.archived)fail('Früher importierte Produktgruppe fehlt oder ist archiviert.');
   const fingerprint=digest(parseStoredDocument(db,row.document,{tenantId:bundle.tenantId}));
   if(fingerprint!==p.fingerprint&&(!states[p.key]||states[p.key].id!==row.id||states[p.key].revision!==row.revision||states[p.key].fingerprint!==fingerprint))fail('Produktgruppe wurde außerhalb des Imports bearbeitet.');
   return {key:p.key,action:fingerprint===p.fingerprint?'unchanged':'update',id:row.id,revision:row.revision,sourceDesignId:p.sourceDesignId};
  });
  return {products,assets:pending,states,stateFile};
 }finally{db.close();adb.close();}
}
export async function importBundle(bundle,target,{apply=false,runtime}={}){
 target=fs.realpathSync(target);let lock,repository,assetStore;
 try{
  const runtimeCheck=runtime?await checkRuntime(bundle,runtime):null;
  if(apply&&!runtimeCheck)fail('--apply benötigt --runtime <tatsächlich aktive Codewurzel>.');
  if(runtimeCheck&&!runtimeCheck.compatible)fail('Ziel-Laufzeit inkompatibel: '+runtimeCheck.products.filter(p=>!p.compatible).map(p=>p.sourceDesignId+': '+p.reason).join('; '));
  if(apply)lock=fs.openSync(path.join(target,'.slate-group-import.lock'),'wx',0o600);
  const plan=planImport(bundle,target),changed=plan.products.some(p=>p.action!=='unchanged')||Object.values(plan.assets).some(r=>r.length);
  const result={schema:'gravuru-slate-group-import-result/v1',bundleSha256:digest(bundle),runtime:runtimeCheck,products:plan.products,assetAdditions:Object.fromEntries(Object.entries(plan.assets).map(([t,rows])=>[t,rows.length])),applied:false,shopifyWrites:0};
  if(!apply)return result;
  if(!changed){
   // A process can stop after the SQLite commit but before the sidecar journal
   // rename. Identical, import-owned records safely repair that journal.
   let repaired=false;
   for(const p of plan.products){const state={id:p.id,revision:p.revision,fingerprint:bundle.products.find(b=>b.key===p.key).fingerprint};if(!same(plan.states[p.key],state)){plan.states[p.key]=state;repaired=true;}}
   if(repaired)atomic(plan.stateFile,plan.states);
   return {...result,applied:true,journalRepaired:repaired};
  }
  const backupDir=path.join(target,'slate-import-backups',Date.now()+'-'+result.bundleSha256.slice(0,12));fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
  for(const file of ['workshop.sqlite','design-assets.sqlite']){const db=new DatabaseSync(path.join(target,file),{readOnly:true});try{await backup(db,path.join(backupDir,file));}finally{db.close();}fs.chmodSync(path.join(backupDir,file),0o600);}
  result.backupDirectory=backupDir;
  const adb=new DatabaseSync(path.join(target,'design-assets.sqlite'));adb.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
  try{const pending=existingRows(adb,bundle);for(const [t,rows]of Object.entries(pending)){const cols=tables[t],insert=adb.prepare('INSERT INTO '+t+' ('+cols.join(',')+') VALUES ('+cols.map(()=>'?').join(',')+')');for(const row of rows){const r=decoded(row);insert.run(...cols.map(c=>r[c]));}}adb.exec('COMMIT');}catch(e){adb.exec('ROLLBACK');throw e;}finally{adb.close();}
  assetStore=createDesignAssetStore({filename:path.join(target,'design-assets.sqlite'),tenantId:bundle.tenantId});
  repository=createProductRepository({filename:path.join(target,'workshop.sqlite'),tenantId:bundle.tenantId,validateDocument:d=>assetStore.validateDocument(validateProductDocument(d))});
  result.products=[];
  for(const p of bundle.products){const saved=saveSlateGroup(repository,{key:p.key,document:p.document,previous:plan.states[p.key]});plan.states[p.key]={id:saved.id,revision:saved.revision,fingerprint:saved.fingerprint};atomic(plan.stateFile,plan.states);result.products.push({key:p.key,sourceDesignId:p.sourceDesignId,...saved});}
  result.applied=true;atomic(path.join(backupDir,'result.json'),result);return result;
 }finally{repository?.close();assetStore?.close();if(lock!==undefined){fs.closeSync(lock);fs.unlinkSync(path.join(target,'.slate-group-import.lock'));}}
}
export async function run(argv){
 const get=k=>{const i=argv.indexOf(k);return i<0?undefined:argv[i+1];};
 if(argv.includes('--package')){if(!get('--source')||!get('--out'))fail('--package --source <Vorbereitung> --out <Paket.json.gz> erforderlich.');const bundle=makeBundle(get('--source'),{only:(get('--only')??'').split(',').filter(Boolean)}),bytes=gzipSync(JSON.stringify(bundle));fs.writeFileSync(get('--out'),bytes,{mode:0o600});return {products:bundle.products.length,bytes:bytes.length,sha256:digest(bytes),shopifyWrites:0};}
 if(!get('--bundle')||!get('--target'))fail('--bundle <Paket.json.gz> --target <vorhandener Datenordner> --runtime <aktive Codewurzel> [--apply] [--out <Ergebnis.json>] erforderlich.');
 const bundle=JSON.parse(gunzipSync(fs.readFileSync(get('--bundle')))),result=await importBundle(bundle,get('--target'),{apply:argv.includes('--apply'),runtime:get('--runtime')});if(get('--out'))atomic(get('--out'),result);return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});
