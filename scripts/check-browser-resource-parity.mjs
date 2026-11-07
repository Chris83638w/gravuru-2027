// Run only against isolated acceptance copies; never against a backup/live DB.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {createWorkshop} from '../app/workshop/http.mjs';
import {readStoredDocumentText} from '../app/workshop/product-document-resources.mjs';
import {createBrowserModelResources} from '../app/workshop/browser-model-resources.mjs';
import {fetchResourceJSON,hydrateMaterialSurface} from '../app/configurator/variant-m/browser-model-resources.mjs';
import {loadStart} from '../app/configurator/variant-m/lazy-resources.mjs';
import {OUTPUT,LAZY} from '../app/configurator/variant-m/build.mjs';
const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1];
if(!args.includes('--data')||!args.includes('--out')||!args.includes('--isolated-copy'))throw Error('Use --isolated-copy --data COPY --out NEW_REPORT.json');
const directory=fs.realpathSync(value('--data')),out=path.resolve(value('--out'));
if(directory.split(/[\\/]/).includes('checkpoints')||fs.existsSync(out))throw Error('Use an isolated copy and a new report path.');
const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];
const db=new DatabaseSync(path.join(directory,'workshop.sqlite'),{readOnly:true});
const heads=db.prepare('SELECT id,revision,tenant_id FROM products ORDER BY id').all();
if(!heads.length)throw Error('Acceptance requires existing products.');
const first=heads[0],record=db.prepare('SELECT document FROM product_revisions WHERE product_id=? AND revision=? AND tenant_id=?').get(first.id,first.revision,first.tenant_id);
const firstDocument=JSON.parse(readStoredDocumentText(db,record.document,{tenantId:first.tenant_id}));db.close();
const workshop=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:firstDocument.config,legacy:seed.legacy,katalogDir:null});
const resources=createBrowserModelResources({prefix:'/browser-ressourcen'}),unique=new Map();
const report={schema:'gravuru-browser-resource-parity/v1',shopifyWrites:0,models:0,designs:0,originalModelBytes:0,transportModelBytes:0,uniqueResourceBytes:0,fonts:0,plates:0,examples:[]};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const browserGet=url=>fetchResourceJSON(url,{fetcher:async p=>{
 const resource=resources.read(p);assert.ok(resource,'resource is admitted');unique.set(resource.hash,{kind:p.includes('/schriften/')?'font':'plate',bytes:resource.body.length});return new Response(resource.body);
}});
try{
 for(const {id,revision} of heads){
  const original=workshop.internalModel(id,revision);
  if(!original.universal)continue;
  const stored=JSON.stringify(workshop.repository.get(id,{revision}).document);
  const transport=resources.prepare(original,{source:()=>workshop.internalModel(id,revision)});
  const beforeBytes=Buffer.byteLength(JSON.stringify(original)),afterBytes=Buffer.byteLength(JSON.stringify(transport));
  report.models++;report.designs+=original.universal.profile.designs.length;report.originalModelBytes+=beforeBytes;report.transportModelBytes+=afterBytes;
  const starts=[];
  const start=await loadStart(transport.universal,{get:async url=>{
   starts.push(url);
   if(url.startsWith('/browser-ressourcen/'))return browserGet(url);
   assert.ok(url.startsWith('/_runtime/lazy/'));
   return JSON.parse(fs.readFileSync(path.join(LAZY,url.slice('/_runtime/lazy/'.length))));
  }});
  const startFonts=starts.filter(u=>u.startsWith('/browser-ressourcen/')&&u.includes('/schriften/')).length;
  const hydrated=structuredClone(transport),local=hydrated.universal.localResources;
  for(const font of local.lazyFonts||[])if(font.url.startsWith('/browser-ressourcen/'))local.fonts[font.name]=await browserGet(font.url);
  if(original.universal.localResources.lazyFonts===undefined)delete local.lazyFonts;
  else local.lazyFonts=structuredClone(original.universal.localResources.lazyFonts);
  await hydrateMaterialSurface(hydrated.universal,{get:browserGet});
  assert.deepEqual(hydrated,original,'entire native model unchanged after hydration');
  for(const design of original.universal.profile.designs)for(const o of design.objects||[])if(o.type==='text'&&original.universal.localResources.fonts[o.font])
   assert.deepEqual(start.catalog.fonts[o.font]||transport.universal.localResources.fonts[o.font],original.universal.localResources.fonts[o.font],'start uses the complete exact source font');
  assert.equal(JSON.stringify(workshop.repository.get(id,{revision}).document),stored,'no source write');
  report.examples.push({productId:id,revision,designs:original.universal.profile.designs.length,originalBytes:beforeBytes,transportBytes:afterBytes,productFonts:Object.keys(original.universal.localResources.fonts).length,startFonts,roundTripSha256:digest(hydrated)});
 }
 for(const resource of unique.values()){report.uniqueResourceBytes+=resource.bytes;report[resource.kind==='font'?'fonts':'plates']++;}
 report.result='PASS';report.finishedAt=new Date().toISOString();
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,examples:report.examples.slice(0,1)}));
}finally{workshop.close();}
