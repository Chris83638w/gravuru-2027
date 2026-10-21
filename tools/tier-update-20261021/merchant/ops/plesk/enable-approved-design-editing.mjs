import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {merchantConfig} from './merchant-config.mjs';
import {lockTestData} from './lock.mjs';
import {createProductRepository} from '../../app/workshop/repository.mjs';
import {validateProductDocument} from '../../app/workshop/product-model.mjs';
import {createProfileLibrary} from '../../app/workshop/profile-library.mjs';
import {createProductionProfiles} from '../../app/workshop/production-profiles.mjs';
import {createDesignAssetStore} from '../../app/workshop/design-assets.mjs';
import {createFontLibrary} from '../../app/workshop/font-library.mjs';
import {createOrderIntake} from '../../app/workshop/order-intake.mjs';
import {workshopCatalog} from '../../app/workshop/catalog.mjs';
import {productOverview} from '../../app/workshop/product-preview.mjs';
import {isFormProduct,formOverview} from '../../app/workshop/form-product.mjs';
import {editableApprovedDesign} from '../../app/workshop/approved-design-editability.mjs';
import {variantKey} from '../../app/configurator/variant-m/commerce-model.mjs';
const [receiptFile,outputFile,copy]=process.argv.slice(2);
assert(receiptFile&&outputFile&&process.argv.length<=6);
process.umask(0o077);
const config=merchantConfig(process.env),live=config.data;
if(copy){assert(path.isAbsolute(copy)&&fs.realpathSync(copy)===copy&&path.dirname(copy)===path.dirname(live)&&copy!==live);config.data=copy;}
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const receipt=read(receiptFile);assert.equal(receipt.products.length,27);
const catalogFile=path.join(config.data,'approved-customer-preview.json'),catalog=read(catalogFile);assert.equal(catalog.products.length,27);
const lock=await lockTestData(config),stores=[];
try{
 const db=new DatabaseSync(path.join(config.data,'workshop.sqlite'));stores.push(db);
 if(db.prepare("SELECT 1 FROM ai_design_jobs WHERE status='running' LIMIT 1").get())throw Error('Ein KI-Auftrag läuft.');
 const fonts=createFontLibrary({filename:path.join(config.data,'design-assets.sqlite')});stores.push(fonts);
 const profiles=createProfileLibrary({filename:path.join(config.data,'profiles.sqlite'),catalog:workshopCatalog()});stores.push(profiles);profiles.registerFonts(fonts.list());
 const production=createProductionProfiles({filename:path.join(config.data,'profiles.sqlite')});stores.push(production);
 const assets=createDesignAssetStore({filename:path.join(config.data,'design-assets.sqlite')});stores.push(assets);
 const repository=createProductRepository({filename:path.join(config.data,'workshop.sqlite'),catalogOverview:d=>isFormProduct(d)?formOverview(d):productOverview(d),validateDocument:value=>{const d=validateProductDocument(value);profiles.resolve(d);assets.validateDocument(d);production.resolve(d);return d;},snapshotMetadata:d=>({profiles:profiles.resolve(d),productionProfile:production.resolve(d)})});stores.push(repository);
 const ids=new Set(receipt.products.map(p=>p.workshopProductId));assert.equal(ids.size,27);
 const unrelated=repository.list({includeArchived:true}).filter(r=>!ids.has(r.id)).map(r=>({id:r.id,revision:r.revision,hash:hash(r.document)}));
 const entries=receipt.products.map(p=>{
  const old=repository.get(p.workshopProductId,{revision:1}),current=repository.get(old.id),d=old.document.config.profile.designs[0];
  assert([1,2].includes(current.revision));assert.equal(d.preparedTemplate.designSku,p.designSku);assert.equal(d.preparedTemplate.blankBottomMm,20);
  const document=editableApprovedDesign(old.document);
  if(current.revision===2)assert.equal(hash(current.document),hash(document),'Concurrent product change');
  return {key:'gravuru-editable-20261016:'+p.designSku,fingerprint:hash(document),action:'update',productId:old.id,expectedRevision:1,document};
 });
 repository.importBatch(entries);
 const intake=createOrderIntake({database:db,snapshot:()=>{throw Error('Keine Bestellung während der Wartung.');}}),products=[];
 for(const p of receipt.products){
  const record=repository.get(p.workshopProductId);assert.equal(record.revision,2);
  assert.equal(hash(record.document),entries.find(e=>e.productId===record.id).fingerprint);
  const original=repository.get(record.id,{revision:1});assert.deepEqual(editableApprovedDesign(original.document),record.document);
  const linked=intake.bindVariants({record,shopDomain:'gravuru-design.myshopify.com',mappings:p.bindings.map(b=>({key:variantKey(b.options),variantId:b.variantId}))});assert.equal(linked.bindings.length,28);
  const item=catalog.products.find(c=>c.workshopProductId===record.id);assert(item&&item.designSku===p.designSku);item.workshopRevision=2;
  products.push({...p,workshopRevision:2,bindings:linked.bindings});
 }
 for(const p of unrelated){const r=repository.get(p.id);assert.equal(r.revision,p.revision);assert.equal(hash(r.document),p.hash);}
 const result={schema:'gravuru-approved-editability/v1',ok:true,dryRun:!!copy,products,previousRevisionsPreserved:true,unrelatedProductsUnchanged:unrelated.length,checkoutEnabled:false};
 fs.writeFileSync(outputFile,JSON.stringify(result,null,2),{mode:0o600});
 const temporary=catalogFile+'.editing-new';fs.writeFileSync(temporary,JSON.stringify(catalog,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(temporary,catalogFile);
 console.log(JSON.stringify({ok:true,dryRun:!!copy,products:27,revision:2,bindings:756,unrelatedProductsUnchanged:unrelated.length,receipt:outputFile}));
}finally{for(const store of stores.reverse())store.close();const done=once(lock,'exit');lock.stdin.end();await done;}
