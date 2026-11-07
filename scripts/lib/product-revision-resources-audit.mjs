// Read-only backup verification. Uses the storage codec itself, so recovery
// cannot accept documents that the application would fail to hydrate.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {parseStoredDocument} from '../../app/workshop/product-document-resources.mjs';

export function auditProductRevisionResources({filename,assetIds}={}){
  if(typeof filename!=='string'||!Array.isArray(assetIds)||assetIds.some(id=>typeof id!=='string'))throw Error('Explicit database and design-asset inventory required.');
  const db=new DatabaseSync(filename,{readOnly:true});
  try{
    const version=db.prepare('PRAGMA user_version').get().user_version;
    if(version>5)throw Error('Unsupported workshop storage version.');
    const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name));
    if(version===5&&!tables.has('product_document_resources'))throw Error('Shared product resource store is missing.');
    let resources=0,revisions=0,references=0;
    if(tables.has('product_document_resources')){
      for(const row of db.prepare('SELECT tenant_id,kind,sha256 FROM product_document_resources').iterate()){
        const marker={$gravuruResource:1,kind:row.kind,sha256:row.sha256};
        if(!['font','material-image'].includes(row.kind))throw Error('Unsupported shared product resource kind.');
        const config=row.kind==='font'?{localResources:{fonts:{verification:marker}}}:{materialSurface:marker};
        parseStoredDocument(db,JSON.stringify({config}),{tenantId:row.tenant_id});
        resources++;
      }
    }
    const assets=new Set(assetIds);
    function visit(value){
      if(value&&typeof value==='object'){
        if(!Array.isArray(value)&&Object.hasOwn(value,'assetId')){
          if(!assets.has(value.assetId))throw Error('Revision refers to missing design asset.');
          references++;
        }
        for(const child of Object.values(value))visit(child);
      }
    }
    const hasTenant=db.prepare('PRAGMA table_info(product_revisions)').all().some(column=>column.name==='tenant_id');
    for(const row of db.prepare('SELECT document,'+(hasTenant?'tenant_id':"'gravuru' AS tenant_id")+' FROM product_revisions').iterate()){
      visit(parseStoredDocument(db,row.document,{tenantId:row.tenant_id}));
      revisions++;
    }
    return {revisions,resources,verifiedAssetReferences:references};
  }finally{db.close();}
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{
    if(process.argv.length!==3)throw Error('Expected a single read-only database path.');
    const result=auditProductRevisionResources({filename:process.argv[2],assetIds:JSON.parse(fs.readFileSync(0,'utf8'))});
    process.stdout.write(JSON.stringify(result)+'\n');
  }catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
}
