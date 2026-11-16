import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const root=path.resolve(process.argv[2]||'work/issue230-integration-candidate');
const out=path.resolve(process.argv[3]||'work/restabschluss/full-host-schema-audit.json');
const base='ac10e6cee00469591514dcb4fa477b0547a54c48',head='a038e1ae7e3de3954ea204f6925c60c7b4213d4f';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:40*1024*1024});
const sha=s=>createHash('sha256').update(s).digest('hex');
const source=(rev,file)=>git('show',rev+':'+file).replace(/\r\n/g,'\n');
const files=git('ls-tree','-r','--name-only',head,'--','app','ops','scripts').trim().split('\n');
const runtime=files.filter(f=>/\.(?:mjs|cjs|js|py)$/.test(f)&&!/(?:\.test\.|(?:^|\/)(?:fixtures|test-fixtures)\/|(?:test-)?fixture\.mjs$)/.test(f));
const diff=git('diff','--unified=0',base,head,'--','app','ops','scripts');
let current='';const ddlDelta=[];
for(const line of diff.split('\n')){
 if(line.startsWith('diff --git ')){current=line.split(' b/')[1];continue;}
 if(runtime.includes(current)&&/^[+-](?![+-])/.test(line)&&/\b(?:CREATE\s+(?:TABLE|TRIGGER|INDEX)|ALTER\s+TABLE|DROP\s+(?:TABLE|TRIGGER|INDEX)|ensureTenantColumns?)\b/i.test(line))ddlDelta.push({file:current,kind:line[0],line:line.slice(1).trim()});
}
// Exact executable db.exec template blocks, rather than CREATE strings used by
// read-only schema assertions. This does not execute any application constructor.
function blocks(s){return [...s.matchAll(/\bdb\.exec\(\s*`([\s\S]*?)`\s*\)/g)].map(m=>m[1]).filter(s=>/\b(?:CREATE|ALTER|DROP)\s+(?:TABLE|TRIGGER|INDEX)\b/i.test(s));}
const unchangedFiles=['app/workshop/repository.mjs','app/workshop/order-intake.mjs','app/workshop/form-customer-store.mjs','app/workshop/shop-product-binding-store.mjs','app/workshop/catalog-live-orders.mjs','app/workshop/tenant.mjs'];
const unchanged=unchangedFiles.map(file=>{
 const a=blocks(source(base,file)),b=blocks(source(head,file));
 const same=JSON.stringify(a)===JSON.stringify(b);if(!same)throw Error('DDL changed unexpectedly: '+file);
 return {file,executableDdlTemplateCount:b.length,sameExecutableDdl:true,ddlSha256:sha(JSON.stringify(b))};
});
const additions=['app/workshop/gallery-photo-media.mjs','app/workshop/configurator-module-profiles.mjs','app/workshop/product-group-templates.mjs','app/workshop/gallery-shop-sync.mjs','app/workshop/gallery-shop-sync-media.mjs','scripts/lib/slate-review-comments.mjs','scripts/lib/design-review-approvals.mjs'];
const schemas=additions.map(file=>{
 const s=source(head,file),sqls=blocks(s);if(!sqls.length||sqls.some(s=>s.includes('${')))throw Error('Nonliteral/unexpected schema: '+file);
 const db=new DatabaseSync(':memory:');
 try{
  for(const sql of sqls)db.exec(sql);
  return {file,sourceSha256:sha(s),literalDdlExecutedInIsolatedMemoryOnly:true,objects:db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all()};
 }finally{db.close();}
});
const scripts=['assets.mjs','bind-products.mjs','import-products.mjs','remote-import.mjs'];
const importReferences=[];
for(const file of runtime){
 const full=path.join(root,file);if(!fs.existsSync(full))continue;
 const s=fs.readFileSync(full,'utf8');
 for(const name of scripts)if(s.includes('acryl-original18/'+name)||s.includes("'./"+name+"'")&&file.startsWith('scripts/acryl-original18/'))importReferences.push({file,name});
}
const result={base,head,scope:'Versioned app/ops/scripts; no real DB opened; static source comparison plus isolated SQLite :memory: DDL syntax/inventory',runtimeSourceFiles:runtime.length,ddlDelta,unchanged,schemas,serverOnlyImportTools:{names:scripts,versionedReferences:importReferences,privateAppCjsNotAvailable:true},limitations:['Static source scan includes optional modules, not proof they are mounted by the private host.','Actual live SQLite schemas and external legacy-release modules were not opened.','No full createWorkshop/host constructor was executed.']};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({out,runtimeSourceFiles:runtime.length,unchangedDdlModules:unchanged.length,newSchemaModules:schemas.length,newTables:schemas.reduce((n,s)=>n+s.objects.filter(o=>o.type==='table').length,0),newTriggers:schemas.reduce((n,s)=>n+s.objects.filter(o=>o.type==='trigger').length,0),serverOnlyImportReferences:importReferences.length}));
