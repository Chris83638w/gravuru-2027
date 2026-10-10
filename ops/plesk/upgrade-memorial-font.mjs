// Authorized one-product revision change, with offline lock and a verified
// activation backup. Shopify is queried read-only; no shop product is mutated.
import fs from 'node:fs';
import path from 'node:path';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {merchantConfig,verifyMerchantStorage} from './merchant-config.mjs';
import {lockTestData} from './lock.mjs';
import {readPrivateFile} from './shopify-preflight.mjs';
import {createShopifyAdminReadonly} from '../../app/workshop/shopify-admin-readonly.mjs';
import {preflightVariantBindings} from '../../app/workshop/shopify-variant-preflight.mjs';
import {prepareShopProduct} from '../../app/workshop/shop-preparation.mjs';
import {replaceNativeFont,bundledWorkshopFont} from '../../app/workshop/native-font-replacement.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {OUTPUT} from '../../app/configurator/variant-m/build.mjs';

const id='cfg_b4fd3f0c-1d36-4708-b65a-2450134c4ef1',shopifyProductId='gid://shopify/Product/16138083107196';
const fontName='Cormorant Garamond',from='PDF-EdwardianScriptITC-eb1411f1';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const backup=process.argv[2];let lock,workshop,released;
try {
 process.umask(0o077);
 const config=merchantConfig(process.env);verifyMerchantStorage(config);
 if(config.origin!=='https://app-2027.gravuru-designwerkstatt.de'||!backup)throw Error('target');
 const receipt=JSON.parse(readPrivateFile(path.join(backup,'ACTIVATION-RECEIPT.json'),1024*1024));
 const manifest=JSON.parse(fs.readFileSync(new URL('../../PACKAGE-MANIFEST.json',import.meta.url)));
 if(receipt.sourceCommit!==manifest.sourceCommit||receipt.entryActivated!==true)throw Error('backup_receipt');
 lock=await lockTestData(config);released=once(lock,'exit');
 const databaseFile=path.join(config.data,'workshop.sqlite');
 const readRecord=file=>{const db=new DatabaseSync(file,{readOnly:true});try {
  const row=db.prepare('SELECT p.id,p.revision,p.archived,r.document,r.metadata,r.status FROM products p JOIN product_revisions r ON r.product_id=p.id AND r.revision=p.revision WHERE p.id=?').get(id);
  if(!row||row.archived)throw Error('product');
  return {id,revision:row.revision,document:JSON.parse(row.document),metadata:JSON.parse(row.metadata),status:row.status};
 }finally{db.close();}};
 if(receipt.sqliteBackups?.length!==3||new Set(receipt.sqliteBackups.map(i=>i.file)).size!==3)throw Error('backup_inventory');
 for(const item of receipt.sqliteBackups){
  if(!['workshop.sqlite','profiles.sqlite','design-assets.sqlite'].includes(item.file)||sha(readPrivateFile(path.join(backup,item.file),100*1024*1024,null))!==item.sha256)throw Error('backup_digest');
 }
 const original=readRecord(path.join(backup,'workshop.sqlite')),record=readRecord(databaseFile);
 const change=replaceNativeFont(original.document,{from,to:fontName,font:bundledWorkshopFont(fontName)});
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const alreadyApplied=record.revision===original.revision+1&&same(record.document,change.document);
 if(!alreadyApplied&&(record.revision!==original.revision||!same(record.document,original.document)))throw Error('product_changed_since_backup');
 const next={...original,document:change.document,revision:original.revision+1},plan=prepareShopProduct(next);
 const client=createShopifyAdminReadonly({readSecret:()=>config.runtimeEnv.GRAVURU_SHOPIFY_CLIENT_SECRET});
 const remote=await client.inspectProductPricing(shopifyProductId),pricing=remote.product?.pricing;
 if(!pricing?.enabled)throw Error('pricing_unavailable');
 const mappings=plan.variants.map(v=>{const ids=Object.entries(pricing.variants).filter(([,price])=>price===v.priceCents).map(([id])=>id);if(ids.length!==1)throw Error('ambiguous_variant');return {key:v.key,variantId:ids[0]};});
 const checked=await preflightVariantBindings({record:next,shopifyProductId,mappings},client);
 if(!checked.matches||!checked.complete)throw Error('variant_preflight');
 process.env.GRAVURU_PYTHON=config.python;
 const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];
 workshop=createWorkshop({filename:databaseFile,seedConfig:seed.universal,legacy:seed.legacy});
 // The revision and the binding batch are separately committed. A stopped run
 // can resume only this exact saved revision; bindVariants is atomic/idempotent.
 const saved=alreadyApplied?workshop.repository.get(id):workshop.repository.save(id,change.document,record.revision);
 const bound=workshop.orderIntake.bindVariants({record:saved,shopDomain:remote.installation.shopDomain,mappings,personalizationPricing:pricing});
 if(!same(workshop.repository.get(id,{revision:original.revision}).document,original.document))throw Error('history_changed');
 console.log(JSON.stringify({ok:true,alreadyApplied,fontName,changedTextElements:change.changedTextElements,productRevision:saved.revision,
  previousRevision:original.revision,previousRevisionPreserved:true,variantBindings:bound.bindings.length,
  pricesAndOptionsVerified:true,shopifyPricingRevision:String(pricing.revision),shopifyChanged:false,checkoutEnabled:false,productionReady:false}));
} catch(error){console.log(JSON.stringify({ok:false,code:/^[a-z_]+$/.test(error.code||'')?error.code:'font_upgrade_stopped',reason:/^[a-z_]+$/.test(error.message)?error.message:'verification_failed'}));process.exitCode=1;}
finally {if(workshop)workshop.close();if(lock){lock.stdin.end();await released;}}
