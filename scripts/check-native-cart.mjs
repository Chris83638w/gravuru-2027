// Exercise a private copy of the released merchant data. No Shopify requests,
// payment or production; stdout contains only aggregate verification results.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from '../app/configurator/variant-m/build.mjs';
import {createWorkshop} from '../app/workshop/http.mjs';
import {prepareShopProduct} from '../app/workshop/shop-preparation.mjs';
import {prepareAcrylicReview} from '../app/workshop/acrylic-review.mjs';
import {createDraftCartHandoff} from '../app/workshop/draft-cart-handoff.mjs';
import {prepareCartRequest} from '../app/workshop/storefront-cart.mjs';
import {replaceNativeFont,bundledWorkshopFont} from '../app/workshop/native-font-replacement.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [backup,pricingFile,productId,replacementFont]=process.argv.slice(2);
if(!backup||!pricingFile||!/^cfg_[a-f0-9-]{36}$/.test(productId||''))throw Error('Private backup, pricing receipt and product ID required');
process.umask(0o077);
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-native-cart-'));
for(let p=directory;;p=path.dirname(p)){
  if(fs.existsSync(path.join(p,'.git')))throw Error('Private fixture must remain outside Git');
  if(path.dirname(p)===p)break;
}
let w;
try {
  const built=path.join(directory,'build');build({outputDirectory:built});
  const seed=JSON.parse(fs.readFileSync(path.join(built,'models.json')))[0];
  for(const name of ['workshop.sqlite','profiles.sqlite','design-assets.sqlite'])fs.copyFileSync(path.join(backup,name),path.join(directory,name));
  w=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
  let record=w.repository.get(productId),fontChange=null;
  if(replacementFont){
    const fonts=JSON.parse(fs.readFileSync(path.join(root,'app/designs/acrylic-unser-anfang/resources.json'))).fonts;
    const originals=[...new Set(record.document.config.profile.designs.flatMap(d=>d.objects.filter(o=>o.type==='text').map(o=>o.font)))];
    assert.equal(originals.length,1);
    const change=replaceNativeFont(record.document,{from:originals[0],to:replacementFont,font:fonts[replacementFont]??bundledWorkshopFont(replacementFont)});
    record=w.repository.save(record.id,change.document,record.revision);
    fontChange={font:replacementFont,changedTextElements:change.changedTextElements,productRevision:record.revision,originalRevisionPreserved:true};
  }
  const config=w.model(productId,record.revision).universal;
  const receipt=JSON.parse(fs.readFileSync(pricingFile)),pricing=receipt.product.pricing;
  assert.equal(receipt.installation.appId,'gid://shopify/App/423276544001');assert.equal(receipt.installation.currency,'EUR');
  const plan=prepareShopProduct(record);assert.equal(plan.sourceReady,true);
  const archive=path.join(root,'deliverables/shopify-extension-build-20261010/gravuru-shopify-extension-candidate.zip');
  assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),'5c447d58a9b35d935d5155db108afcb1d9975b6f2cb67f0ca80f1534e1e2c904');
  const source=execFileSync('python',['-c','import zipfile,sys;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read("extensions/gravuru-personalization-price/src/cart_transform_run.js"))',archive]);
  const {cartTransformRun}=await import('data:text/javascript;base64,'+source.toString('base64'));
  const mappings=plan.variants.map(v=>{const ids=Object.entries(pricing.variants).filter(([,p])=>p===v.priceCents).map(([id])=>id);assert.equal(ids.length,1);return {key:v.key,variantId:ids[0]};});
  // A bad final price must roll back the complete batch, including valid rows.
  const invalid=structuredClone(pricing);invalid.variants[mappings.at(-1).variantId]++;
  const before=w.orderIntake.bindings().length;
  assert.throws(()=>w.orderIntake.bindVariants({record,shopDomain:receipt.installation.shopDomain,mappings,personalizationPricing:invalid}));
  assert.equal(w.orderIntake.bindings().length,before);
  const batch={record,shopDomain:receipt.installation.shopDomain,mappings,personalizationPricing:pricing};
  assert.equal(w.orderIntake.bindVariants(batch).bindings.length,9);
  assert.equal(w.orderIntake.bindVariants(batch).created,0);
  let sends=0,checks=0;const results=[];
  for(const variant of plan.variants){
    // This particular recovered product has distinct variant base prices. An
    // ambiguous match must fail, not silently choose a different attachment.
    const matches=Object.entries(pricing.variants).filter(([,price])=>price===variant.priceCents);assert.equal(matches.length,1);
    const [variantId]=matches[0],design=config.profile.designs[0],objects=structuredClone(design.objects);
    // PDF font subsets may not contain arbitrary new letters. Use a changed,
    // non-personal sample from an already present letter; never substitute fonts.
    for(const o of objects)if(o.type==='text'&&record.document.elementRights[design.id]?.[o.id]?.content){
      const letter=[...o.text].find(c=>/\p{L}/u.test(c));if(letter)o.text=replacementFont?'TEST ÄÖÜ †':letter.repeat(3);
    }
    const input={productId:record.id,productRevision:record.revision,designId:design.id,objects,options:variant.options,quantity:1,media:[],
      preview:fs.readFileSync(path.join(root,'app/workshop/preview-assets/reference.jpg')).toString('base64')};
    const bundle=await prepareAcrylicReview({record,config,input,assets:w.assets});
    const draft=w.customerDrafts.acrylicDrafts.create(bundle);
    const binding=w.orderIntake.bind({record,shopDomain:receipt.installation.shopDomain,variantId,snapshotId:bundle.manifest.id,personalizationPricing:pricing});
    const offer=w.orderIntake.offer({bindingId:binding.id,snapshotId:bundle.manifest.id,quantity:1});
    const line=prepareCartRequest(offer).variables.input.lines[0],attr=Object.fromEntries(line.attributes.map(a=>[a.key,{value:a.value}]));
    const transformed=cartTransformRun({presentmentCurrencyRate:'1',cart:{lines:[{id:'synthetic-line',motifs:attr._gravuru_motifs,uploads:attr._gravuru_uploads,revision:attr._gravuru_revision,designFile:attr['Bearbeitbarer Entwurf'],merchandise:{__typename:'ProductVariant',id:line.merchandiseId,product:{id:pricing.productId,pricing:{jsonValue:pricing}}}}]}});
    assert.equal(transformed.operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,(offer.unitCents/100).toFixed(2));
    const submit=createDraftCartHandoff({drafts:w.customerDrafts,config:{shopDomain:receipt.installation.shopDomain,apiVersion:'2026-07',authentication:'tokenless'}},{fetchImpl:async()=>{sends++;throw Error('Unexpected network request');}});
    await assert.rejects(submit({draftId:draft.id,snapshotId:draft.snapshotId,expectedRevision:1,offerId:offer.id,offerToken:offer.property.value},{draftToken:draft.token,buyerIp:'192.0.2.5'}),e=>e.code==='cart_blocked');
    assert.equal(bundle.manifest.productionReady,false);assert.ok(bundle.manifest.blockers.length);
    checks++;results.push({unitCents:offer.unitCents,functionPriceMatches:true,privateDraftOwnershipAccepted:true,unapprovedProductionStillBlocked:true});
  }
  assert.equal(sends,0);
  console.log(JSON.stringify({result:'PASS',variantsChecked:checks,pricingRevision:String(pricing.revision),checks:results,
    privateSourceCopied:true,sourceDataChanged:false,fontChange,bindingBatchAtomic:true,bindingBatchIdempotent:true,realShopifyRequests:0,testOrderPlaced:false,productionApproved:false}));
} finally {if(w)w.close();fs.rmSync(directory,{recursive:true,force:true});}
