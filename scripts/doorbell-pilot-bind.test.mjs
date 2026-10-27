import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {makeProductDocument} from '../app/workshop/product-model.mjs';
import {prepareShopProduct} from '../app/workshop/shop-preparation.mjs';
import {doorbellFixture} from '../app/workshop/test-fixtures/doorbell-config.mjs';
import {DatabaseSync} from 'node:sqlite';
import {PILOT_MODEL,PILOT_PRODUCTS,PILOT_MANIFEST_SHA,preparePilotManifest,readPilotManifest,parsePilotArgs,run} from './doorbell-pilot-bind.mjs';
const SHOP='gravuru-design.myshopify.com',formats=Object.keys(PILOT_PRODUCTS);
const hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-pilot-bind-')),database=path.join(dir,'workshop.sqlite'),repository=createProductRepository({filename:database,tenantId:'gravuru'});
 const entries=[],rows=[],records=new Map(),docs=new Map();let variant=57000100000000;
 fs.mkdirSync(path.join(dir,'documents'));
 for(const format of formats){
  const defaults={format,color:format==='24x20'?'anthrazit':'schwarz',frame:'FK-RUNDUM',mounting:'K00',position:'standard',designId:'FK-RUNDUM'},key=PILOT_MODEL+'--'+format,config=doorbellFixture();
  config.doorbell.modelKey=PILOT_MODEL;config.doorbell.defaultFormatKey=format;config.basePriceCents=config.doorbell.formats.find(f=>f.key===format).basePriceCents;
  config.profile.optionGroups.find(g=>g.id==='format').defaultValueId=format;config.profile.optionGroups.find(g=>g.id==='color').defaultValueId=defaults.color;
  config.profile.defaultDesignId='FK-RUNDUM';config.profile.designs[0].id='FK-RUNDUM';
  for(const f of config.doorbell.formats)f.profile.designs[0].id='FK-RUNDUM';
  const document=makeProductDocument(config,{name:'Synthetic pilot '+format,kind:'product'}),importKey='doorbell-v1:'+key,fingerprint=hash(key),saved=repository.importBatch([{key:importKey,fingerprint,document}])[0],record=repository.get(saved.id);
  records.set(importKey,{...record,importFingerprint:fingerprint});docs.set('documents/'+key+'.json',document);
  entries.push({key,importKey,fingerprint,id:saved.id,defaults,documentPath:'documents/'+key+'.json'});
  fs.writeFileSync(path.join(dir,'documents',key+'.json'),JSON.stringify(document));
  const variants=prepareShopProduct(record).variants.map(v=>({shopifyVariantId:'gid://shopify/ProductVariant/'+variant++,sku:'SYNTH-PILOT-'+variant,priceCents:v.priceCents,options:v.options,selectedOptions:[{name:'Acrylfarbe',value:v.options.color},{name:'Edelstahlrahmen',value:v.options.format+' / '+v.options.frame},{name:'Befestigung',value:v.options.mounting}]}));
  rows.push({key,modelKey:PILOT_MODEL,formatKey:format,shopifyProductId:PILOT_PRODUCTS[format],defaults,variants});
 }
 repository.close();
 const createdInput={schema:'gravuru-doorbell-created-binding-input/v1',shopDomain:SHOP,products:rows.slice(1)},portraitPlan=rows[0],importReport={schema:'gravuru-doorbell-import-report/v1',mode:'imported-internal-only',manifestSha256:PILOT_MANIFEST_SHA,entries};
 for(const [name,doc]of Object.entries({'created.json':createdInput,'portrait.json':portraitPlan,'import-report.json':importReport}))fs.writeFileSync(path.join(dir,name),JSON.stringify(doc));
 const exported={schema:'gravuru-shop-export/v1',shopDomain:SHOP,complete:true,exportedAt:new Date().toISOString(),products:rows.map(p=>({id:p.shopifyProductId,status:'ACTIVE',variants:{nodes:p.variants.map(v=>({id:v.shopifyVariantId,sku:v.sku,price:(v.priceCents/100).toFixed(2),selectedOptions:v.selectedOptions}))}}))};
 fs.writeFileSync(path.join(dir,'export.json'),JSON.stringify(exported));
 const client={shopDomain:SHOP,apiVersion:'2026-07',async graphql(query,{ids}){assert.match(query,/GravuruDoorbellBindingEvidence/);return {data:{shop:{myshopifyDomain:SHOP,currencyCode:'EUR'},nodes:ids.map(id=>{const p=rows.find(p=>p.variants.some(v=>v.shopifyVariantId===id)),v=p.variants.find(v=>v.shopifyVariantId===id);return {id,sku:v.sku,price:(v.priceCents/100).toFixed(2),selectedOptions:v.selectedOptions,product:{id:p.shopifyProductId,status:'ACTIVE',variantsCount:{count:120}}};})}};}};
 const args=['--created-input',path.join(dir,'created.json'),'--portrait-plan',path.join(dir,'portrait.json'),'--import-report',path.join(dir,'import-report.json'),'--db',database,'--out',path.join(dir,'out'),'--export',path.join(dir,'export.json')];
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 return {dir,database,createdInput,portraitPlan,importReport,rows,records,docs,args,client,pure:()=>({createdInput,portraitPlan,importReport,readImportDocument:p=>docs.get(p),resolveImportedRecord:k=>records.get(k)})};
}
test('pilot default is dry-run; approval requires explicit apply and no arbitrary scope flag exists',()=>{
 const base=['--created-input','a','--portrait-plan','b','--import-report','c','--db','d','--out','e'];
 assert.equal(parsePilotArgs(base).apply,false);assert.equal(parsePilotArgs(base).approveLive,false);
 assert.throws(()=>parsePilotArgs([...base,'--approve-live','--approval-id','user']));assert.throws(()=>parsePilotArgs([...base,'--models','42']));
 assert.equal(parsePilotArgs([...base,'--apply','--approve-live','--approval-id','user']).approveLive,true);
});
test('exact three fixed product identities retain 360 choices and each native format/color default',t=>{
 const f=fixture(t),result=preparePilotManifest(f.pure());
 assert.equal(result.selections.length,360);assert.deepEqual(result.manifest.products.map(p=>p.shopifyProductId),Object.values(PILOT_PRODUCTS));
 for(const mutate of [
  v=>v.createdInput.products[0].shopifyProductId=PILOT_PRODUCTS['35x18'],
  v=>v.createdInput.products[0].defaults.color='schwarz',
  v=>v.importReport.mode='dry-run',
  v=>v.importReport.entries[0].fingerprint='f'.repeat(64),
  v=>v.importReport.entries[0].documentPath='../outside.json',
  v=>v.createdInput.products[0].variants.pop()
 ]){const input=f.pure();input.createdInput=structuredClone(input.createdInput);input.importReport=structuredClone(input.importReport);mutate(input);assert.throws(()=>preparePilotManifest(input));}
 const journal=f.records.get(f.importReport.entries[0].importKey);journal.document=structuredClone(journal.document);journal.document.name='Changed after import';
 assert.throws(()=>preparePilotManifest(f.pure()),/Importstand/);
});
test('dry-run reads current import journal and fresh Shopify evidence without mutating the product database',async t=>{
 const f=fixture(t),before=hash(fs.readFileSync(f.database));
 const result=await run(f.args,{client:f.client,stdout:{write(){}}});
 assert.equal(result.mode,'dry-run');assert.equal(result.shopVerified,true);assert.equal(result.written,false);assert.equal(result.liveRelease,null);
 assert.equal(hash(fs.readFileSync(f.database)),before);assert.equal(result.webhookSubscriptionsChanged,false);
});
test('explicit apply reuses immutable registry and creates only three exact revision approvals, without webhook subscription changes',async t=>{
 const f=fixture(t),result=await run([...f.args,'--apply','--approve-live','--approval-id','user-synthetic-pilot'],{client:f.client,stdout:{write(){}}});
 assert.equal(result.written,true);assert.equal(result.blocks.reduce((n,b)=>n+b.createdBindings,0),360);assert.equal(result.liveRelease.created,3);assert.equal(result.webhookSubscriptionsChanged,false);
 const db=new DatabaseSync(f.database,{readOnly:true});assert.equal(db.prepare('SELECT count(*) AS n FROM doorbell_live_order_approvals').get().n,3);db.close();
 const repeat=await run([...f.args,'--apply','--approve-live','--approval-id','user-synthetic-pilot'],{client:f.client,stdout:{write(){}}});
 assert.equal(repeat.blocks.reduce((n,b)=>n+b.createdBindings,0),0);assert.equal(repeat.liveRelease.created,0);assert.equal(repeat.productionReady,false);
});
