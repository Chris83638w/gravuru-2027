import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {makeProductDocument, validateProductDocument, resolveProduct, validateProductDesign} from './product-model.mjs';
import {createProductRepository} from './repository.mjs';
import {planBatch} from './batch.mjs';
import {productPreview} from './product-preview.mjs';
import {productionSubject} from './production-profiles.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {NATIVE_REVIEW} from './native-review-schema.mjs';
import {createFormCustomerStore} from './form-customer-store.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {importNativeSlate} from './slate-import.mjs';

const resources = JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json', import.meta.url)));
function fixture() {
  const c = makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
  delete c.acrylic;
  const p = c.profile, text = structuredClone(p.designs[0].objects.find(o=>o.type==='text'));
  Object.assign(text,{id:'name',text:'Test',size:5,x:110,y:70,w:20,h:8,rotation:0,customerEditable:true,acrylicFixed:false});
  p.material={kind:'slate',color:'#41494b',thicknessMm:6};
  p.processing={profileId:'slate-engraving'};
  p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]};
  p.features={...p.features,orderEnabled:false,productionConfirmed:false};
  p.designs=[{id:'test',name:'Synthetisches Prüfdesign',objects:[text]}];p.defaultDesignId='test';
  p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[
    {id:'none',label:'Ohne',priceCents:0,currency:'EUR',holes:[]},
    {id:'two',label:'Zwei Bohrungen',priceCents:299,currency:'EUR',holes:[{x:12,y:70,diameter:5},{x:208,y:70,diameter:5}]}
  ]}];
  c.basePriceCents=2299;c.extraMotifCents=169;c.photo={enabled:true,mode:'upload-only',includedCount:0,extraPriceCents:999};
  c.localResources.photoExamples=[];c.localResources.photoPlaceholders=[];
  return c;
}

test('slate retains editable native resources, physical geometry and option prices without mutating input',()=>{
  const c=fixture(),before=structuredClone(c),d=makeProductDocument(c),r=resolveProduct(d,{options:{mounting:'two'}});
  assert.deepEqual(c,before);assert.deepEqual(d.config.localResources,c.localResources);
  assert.equal(r.price.unitCents,2598);assert.equal(r.design.objects[0].type,'text');
  assert.deepEqual(r.physical,{widthMm:220,heightMm:140,thicknessMm:6,insertionMm:0});
  assert.deepEqual(r.designSpace,{widthMm:220,heightMm:140,scaleX:1,scaleY:1});
  assert.deepEqual(r.profile.geometry.holes,c.profile.optionGroups[0].values[1].holes);
  assert.equal(d.config.reviewOnly,true);assert.equal(d.config.profile.features.orderEnabled,false);
  assert.deepEqual(productionSubject(d),{method:'engraving',materialId:'slate',thicknessMm:6});
  const svg=productPreview({universal:d.config},{options:{mounting:'two'}});assert.match(svg,/<svg/);assert.match(svg,/<rect width="220" height="140"/);assert.match(svg,/cx="12" cy="70"/);
});

test('invalid nondefault holes, missing defaults, unsupported material and release flags fail closed',()=>{
  for(const change of [c=>{c.profile.optionGroups[0].values[1].holes[0].x=0;},
    c=>{c.profile.optionGroups[0].defaultValueId='missing';},c=>{c.profile.defaultDesignId='missing';},
    c=>{c.profile.material.kind='wood';},c=>{c.profile.processing.profileId='acrylic-print';},
    c=>{c.profile.features.orderEnabled=true;},c=>{c.profile.features.productionConfirmed=true;},
    c=>{c.basePriceCents=null;},c=>{c.extraMotifCents=1.69;},c=>{c.photo.extraPriceCents=-1;},
    c=>{c.profile.optionGroups[0].values[1].priceCents=100000000;},c=>{c.photo.includedCount=-1;}]){
    const c=fixture();change(c);assert.throws(()=>makeProductDocument(c));
  }
});

test('saved customer element rights still protect slate original text',()=>{
  const d=makeProductDocument(fixture()),source=d.config.profile.designs[0];
  const edited=structuredClone(source);edited.objects[0].text='Neu';
  assert.equal(validateProductDesign(d,edited).objects[0].text,'Neu');
  d.elementRights.test.name.content=false;
  assert.throws(()=>validateProductDesign(d,edited),/Recht content/);
});

test('same repository preserves slate revisions and batch uses its native cent source',t=>{
  const repository=createProductRepository({filename:':memory:',validateDocument:validateProductDocument});
  t.after(()=>repository.close());
  const record=repository.create(makeProductDocument(fixture(),{kind:'master'}));
  const plan=planBatch(repository,{rows:[{import_key:'slate-1',name:'Schieferkopie',price_eur:'25,00'}],masterId:record.id,masterRevision:record.revision});
  assert.equal(plan.report[0].status,'ready');assert.equal(plan.report[0].prices.base,2500);
  assert.equal(repository.get(record.id).document.config.basePriceCents,2299);
  const bad=planBatch(repository,{rows:[{import_key:'slate-2',name:'Falsch',price_small_eur:'12,00'}],masterId:record.id,masterRevision:record.revision});
  assert.equal(bad.report[0].status,'error');assert.match(bad.report[0].message,/Schiefer/);
});

test('slate customer snapshot preserves private ownership and produces original-scale engraving with holes',async t=>{
 const repository=createProductRepository({filename:':memory:',validateDocument:validateProductDocument});
 const drafts=createFormCustomerStore({filename:':memory:'});t.after(()=>{drafts.close();repository.close();});
 const record=repository.create(makeProductDocument(fixture()));
 const config=structuredClone(record.document.config);config.profile.id=record.id;config.profile.revision=record.id+':1';
 const input={productId:record.id,productRevision:1,designId:'test',objects:config.profile.designs[0].objects,
   options:{mounting:'two'},quantity:1,media:[],preview:fs.readFileSync(new URL('./preview-assets/reference.jpg',import.meta.url)).toString('base64')};
 const bundle=await prepareAcrylicReview({record,config,input});
 assert.equal(bundle.manifest.schema,NATIVE_REVIEW);assert.equal(bundle.manifest.product.basePriceCents,2598);
 assert.equal(bundle.manifest.productionReady,false);assert.equal(bundle.manifest.capabilities.cart,false);
 const saved=drafts.acrylicDrafts.create(bundle);assert.throws(()=>drafts.acrylicDrafts.get(saved.id,'0'.repeat(64)));
 const art=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256,{engraving:true});
 assert.equal(art.geometry.widthMm,220);assert.equal(art.geometry.heightMm,140);assert.equal(art.geometry.holeCount,2);
 assert.doesNotMatch(art.svg,/<text|material-surface|scene|data-object/);assert.match(art.svg,/fill="#000000"/);
 const proof=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'vector'});
 assert.equal(proof.pdf.subarray(0,5).toString(),'%PDF-');assert.equal(proof.metadata.productionReady,false);
 const files=readReviewPackage(proof.archive,digest(proof.archive),NATIVE_REVIEW).files;
 assert.ok(files.has('gravur-kontur-1zu1.pdf'));
 const changed=structuredClone(record.document);changed.config.basePriceCents=3000;repository.save(record.id,changed,1);
 assert.equal(drafts.review(bundle.manifest.id).manifest.product.basePriceCents,2598);
 assert.deepEqual(drafts.downloadSnapshot(bundle.manifest.id,'package'),bundle.package);
});

test('legacy import is hash-bound and idempotent, and never overwrites a newer workshop revision',async t=>{
 const repository=createProductRepository({filename:':memory:',validateDocument:validateProductDocument});t.after(()=>repository.close());
 const config=fixture();config.workbench={productId:'P-11111111-1111-4111-8111-111111111111',revision:30};
 config.profile.id=config.workbench.productId;config.profile.binding.productId=config.workbench.productId;config.profile.revision='30';delete config.materialSurface;
 const sourceBytes=Buffer.from(JSON.stringify(config)),input={sourceBytes,sourceSha256:digest(sourceBytes)};
 const first=await importNativeSlate({repository},input);assert.equal(first.created,true);assert.equal(first.published,false);
 const record=repository.get(first.id),changed=structuredClone(record.document);changed.name='Später bearbeitet';repository.save(first.id,changed,1);
 const second=await importNativeSlate({repository},input);assert.equal(second.created,false);assert.equal(second.id,first.id);
 assert.equal(repository.get(first.id).document.name,'Später bearbeitet');assert.equal(repository.get(first.id).publishedRevision,null);
 await assert.rejects(importNativeSlate({repository},{...input,sourceSha256:'0'.repeat(64)}),/prüfsumme/i);
 config.basePriceCents+=1;const other=Buffer.from(JSON.stringify(config));await assert.rejects(importNativeSlate({repository},{sourceBytes:other,sourceSha256:digest(other)}),/anderen Inhalten/);
 config.workbench.revision=31;config.profile.revision='31';config.materialSurface='/api/product-workbench/assets/'+'a'.repeat(64)+'.png';const missing=Buffer.from(JSON.stringify(config));
 await assert.rejects(importNativeSlate({repository},{sourceBytes:missing,sourceSha256:digest(missing)}),/Materialoberfläche fehlt/);
});
