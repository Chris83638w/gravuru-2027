// Offline, explicit pin after a verified deployment backup. Shopify reads only;
// immutable price bindings are appended before the private runtime pin changes.
import fs from 'node:fs';import path from 'node:path';import {once} from 'node:events';import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';
import {parseStoredDocument} from '../../app/workshop/product-document-resources.mjs';
import {merchantConfig,verifyMerchantStorage} from './merchant-config.mjs';import {readPrivateFile} from './shopify-preflight.mjs';import {lockTestData} from './lock.mjs';
import {createShopifyAdminReadonly} from '../../app/workshop/shopify-admin-readonly.mjs';import {preflightVariantBindings} from '../../app/workshop/shopify-variant-preflight.mjs';import {prepareShopProduct} from '../../app/workshop/shop-preparation.mjs';import {createWorkshop} from '../../app/workshop/http.mjs';import {OUTPUT} from '../../app/configurator/variant-m/build.mjs';
let lock,released,workshop;
try{
 process.umask(0o077);
 const [backup,revisionText]=process.argv.slice(2),revision=Number(revisionText),config=merchantConfig(process.env),file=process.env.GRAVURU_SHOPIFY_CONFIG_FILE;
 if(!backup||!file||! /^[1-9][0-9]*$/.test(revisionText)||!Number.isSafeInteger(revision)||revision<2||config.origin!=='https://app-2027.gravuru-designwerkstatt.de'||!config.merchantTestCart)throw Error('target');
 verifyMerchantStorage(config);
 const receipt=JSON.parse(readPrivateFile(path.join(backup,'ACTIVATION-RECEIPT.json'),1024*1024)),manifest=JSON.parse(fs.readFileSync(new URL('../../PACKAGE-MANIFEST.json',import.meta.url)));
 if(receipt.sourceCommit!==manifest.sourceCommit||!receipt.entryActivated||receipt.sqliteBackups?.length!==3||new Set(receipt.sqliteBackups.map(b=>b.file)).size!==3)throw Error('backup_receipt');
 for(const b of receipt.sqliteBackups)if(!['workshop.sqlite','profiles.sqlite','design-assets.sqlite'].includes(b.file)||createHash('sha256').update(readPrivateFile(path.join(backup,b.file),100*1024*1024,null)).digest('hex')!==b.sha256)throw Error('backup_digest');
 lock=await lockTestData(config);released=once(lock,'exit');
 const before=readPrivateFile(file,16384),current=JSON.parse(before),previous=JSON.parse(readPrivateFile(path.join(backup,'previous-config.json'),16384));
 const enabled=structuredClone(previous);enabled.values.GRAVURU_SHOPIFY_TEST_CART_REVISION=String(revision);
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(!same(current,previous)&&!same(current,enabled))throw Error('concurrent_config_change');
 const originalDb=new DatabaseSync(path.join(backup,'workshop.sqlite'),{readOnly:true});let original;
 try{original=originalDb.prepare('SELECT p.revision,p.archived,r.document FROM products p JOIN product_revisions r ON p.id=r.product_id AND p.revision=r.revision WHERE p.id=?').get(config.merchantTestCart.productId);if(original)original.document=parseStoredDocument(originalDb,original.document,{tenantId:'gravuru'});}finally{originalDb.close();}
 if(original?.revision!==revision||original.archived)throw Error('backup_product_revision');
 process.env.GRAVURU_PYTHON=config.python;const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];workshop=createWorkshop({filename:path.join(config.data,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
 const record=workshop.repository.get(config.merchantTestCart.productId);
 if(record.revision!==revision||record.status==='archived'||!same(record.document,original.document))throw Error('product_changed_since_backup');
 const client=createShopifyAdminReadonly({readSecret:()=>config.runtimeEnv.GRAVURU_SHOPIFY_CLIENT_SECRET}),product='gid://shopify/Product/16138083107196',remote=await client.inspectProductPricing(product),pricing=remote.product?.pricing;
 if(!pricing?.enabled)throw Error('pricing_unavailable');
 const plan=prepareShopProduct(record),mappings=plan.variants.map(v=>{const ids=Object.entries(pricing.variants).filter(([,price])=>price===v.priceCents).map(([id])=>id);if(ids.length!==1)throw Error('ambiguous_variant');return {key:v.key,variantId:ids[0]};});
 const checked=await preflightVariantBindings({record,shopifyProductId:product,mappings},client);if(!checked.matches||!checked.complete)throw Error('variant_preflight');
 const bound=workshop.orderIntake.bindVariants({record,shopDomain:remote.installation.shopDomain,mappings,personalizationPricing:pricing});
 if(!same(current,enabled)){
  const temp=file+'.cart-revision-'+revision+'.new';fs.writeFileSync(temp,JSON.stringify(enabled,null,2)+'\n',{flag:'wx',mode:0o600});
  if(readPrivateFile(file,16384)!==before)throw Error('concurrent_config_change');fs.renameSync(temp,file);
 }
 if(merchantConfig(process.env).merchantTestCart.productRevision!==revision)throw Error('pin_readback');
 console.log(JSON.stringify({ok:true,sourceCommit:manifest.sourceCommit,productRevision:revision,variantBindings:bound.bindings.length,bindingsCreated:bound.created,pricingRevision:String(pricing.revision),photoExtraCents:plan.extras.photoCents,shopifyChanged:false,productionReady:false}));
}catch(e){console.log(JSON.stringify({ok:false,code:/^[a-z_]+$/.test(e.code||'')?e.code:'pin_failed',reason:/^[a-z_]+$/.test(e.message)?e.message:'verification_failed'}));process.exitCode=1;}
finally{workshop?.close();if(lock){lock.stdin.end();await released;}}
