import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createPublicDesignPreviewCache} from './public-design-preview-cache.mjs';
import {createPublicDesignPreviews} from './public-design-previews.mjs';
import {createShopDesignGallery} from './shop-design-gallery.mjs';
import {familyFormatCombinations} from '../configurator/variant-m/family-formats.mjs';
import {quote,selectedProfile} from '../configurator/variant-m/contract.mjs';
const source=process.env.GRAVURU_PUBLIC_PREVIEW_SOURCE||fileURLToPath(new URL('../../../../outputs/steel-design-bank-repair-20261108/live-runner/candidate-product-document.live-normalized.compact.json',import.meta.url));
test('real immutable r4 bank prepares only three original previews; all 251 designs and 404 variant data stay byte-identical',{skip:!fs.existsSync(source)},async t=>{
 const raw=fs.readFileSync(source);assert.equal(createHash('sha256').update(raw).digest('hex'),'2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0');
 const doc=JSON.parse(raw),config=doc.config,before=JSON.stringify(doc),options={size:config.familyFormats.defaultSize,mounting:'K00'},profile=selectedProfile(config,options);
 assert.equal(config.familyFormats.designs.length,251);assert.equal(config.familyFormats.formats.length,80);assert.equal(familyFormatCombinations(config).length,404);
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'public-template-bank-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 // Real original artwork/configuration; binding/approval are explicit synthetic
 // transport fixtures, not a claim of checking the remote production registry.
 const binding={storeId:'acryl',tenantId:'synthetic-bank-review',shopDomain:'synthetic.myshopify.com',shopifyProductId:'gid://shopify/Product/16190784438652',shopifyVariantId:'gid://shopify/ProductVariant/58104606556540',productId:'cfg_review_r4',productRevision:4,bindingId:'binding_review',assignmentRevision:1,options,unitCents:quote(config,[],profile.defaultDesignId,options).unitCents};
 const model={key:'acryl',name:doc.name,configuration:{id:binding.productId,revision:4},galleryCategoryIds:doc.categoryIds,universal:config};
 const store={storeId:'acryl',workshop:{tenantId:binding.tenantId,assets:{read(){throw Error('No private asset lookup expected');}}},registry:{listActive:()=>[binding]}};
 const resolve=()=>({store,binding:structuredClone(binding)}),modelFor=()=>structuredClone(model),checkBinding=()=>{},secret='synthetic-public-bank-review-secret',previewUrl=h=>'/konfigurator/shop/vorschauen/'+h+'.svg';let renders=0;
 const make=()=>{const cache=createPublicDesignPreviewCache({directory,secret}),gallery=createShopDesignGallery({secret,resolve,modelFor,checkBinding,allowedAssets:()=>new Set()});return createPublicDesignPreviews({cache,resolve,modelFor,checkBinding,gallery,previewUrl,renderTemplate:(context,id)=>{renders++;const fresh=createShopDesignGallery({secret,resolve,modelFor,checkBinding,allowedAssets:()=>new Set()});return fresh.preview(context,fresh.start(context,context.model,id).target);}});};
 const first=make(),started=performance.now(),prepared=await first.prepare(binding),prepareMs=performance.now()-started;assert.equal(prepared.prepared,3);assert.equal(renders,3);
 const restarted=make(),warmAt=performance.now(),urls=restarted.urls(binding),lookupMs=performance.now()-warmAt;assert.deepEqual(urls,prepared.items.map(x=>x.url));assert.equal(renders,3);
 const readAt=performance.now();for(const url of urls)assert.ok(restarted.read(url.split('/').at(-1).slice(0,-4)).length>100000);const read3Ms=performance.now()-readAt;
 const report={sourceSha256:createHash('sha256').update(raw).digest('hex'),sourceBytes:raw.length,designs:251,sizes:80,variants:404,prepared:3,svgBytes:prepared.items.map(x=>x.bytes),prepareMs,lookupMs,read3Ms,renders};
 console.log('PUBLIC_PREVIEW_BANK '+JSON.stringify(report));assert.equal(JSON.stringify(doc),before);assert.equal(renders,3);assert.equal(fs.readdirSync(directory).length,3);
});
