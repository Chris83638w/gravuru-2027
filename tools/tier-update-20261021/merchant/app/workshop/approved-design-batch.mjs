import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {makeProductDocument,validateProductDocument} from './product-model.mjs';
import {planNativePreparedDesign} from './prepared-design-native.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const key=o=>JSON.stringify(Object.entries(o).sort());

export async function importApprovedDesignBatch({repository,assets,intake,seedId,seedRevision,packages,products,mapping,fonts}) {
 const seed=repository.get(seedId);assert.equal(seed.revision,seedRevision,'Die Ausgangsvorlage wurde geändert.');
 assert.equal(packages.length,27);assert.equal(products.length,27);assert.equal(mapping.length,27);
 const existing=repository.list({includeArchived:true}).map(r=>({id:r.id,revision:r.revision,hash:sha(r.document)}));
 const prepared=[];const skuSet=new Set();const variantSet=new Set();
 for(const pkg of packages){
  const p=products.find(p=>p.designSku===pkg.designSku),m=mapping.find(m=>m.designSku===pkg.designSku);
  assert(p&&m,'Produkt-/Varianten-Zuordnung fehlt.');assert.equal(m.nativeDesignId,pkg.designId);
  assert(!skuSet.has(pkg.designSku));skuSet.add(pkg.designSku);
  const config=structuredClone(seed.document.config);
  for(const [id,font]of Object.entries(fonts.fonts||fonts)){
   if(config.localResources.fonts[id])assert.deepEqual(config.localResources.fonts[id],font,'Abweichende Originalschrift.');
   else config.localResources.fonts[id]=font;
  }
  const document=makeProductDocument(config,{name:p.input.title});
  const temporary={...seed,document};
  const planned=await planNativePreparedDesign({get:id=>{assert.equal(id,seedId);return temporary;}},assets,seedId,{expectedRevision:seedRevision,package:pkg,makeDefault:true});
  const doc=planned.document;doc.config.profile.designs=doc.config.profile.designs.filter(d=>d.id===pkg.designId);
  doc.elementRights={[pkg.designId]:doc.elementRights[pkg.designId]};
  doc.config.localResources.photoExamples=(doc.config.localResources.photoExamples||[]).filter(e=>e.designId===pkg.designId);
  doc.seo=structuredClone(p.input.seo);validateProductDocument(doc);assets.validateDocument(doc);
  const plan=prepareShopProduct({...seed,document:doc});assert.equal(plan.variants.length,28);assert.equal(m.variants.length,28);
  const bindings=plan.variants.map(v=>{
   const actual=m.variants.find(a=>key({size:a.size,base:a.base,wall:a.wall})===key(v.options));assert(actual,'Variante fehlt.');
   assert.equal(Math.round(Number(actual.price)*100),v.priceCents,'Preisabweichung.');
   assert(actual.sku.startsWith(pkg.designSku+'-'));assert(!variantSet.has(actual.shopifyVariantId));variantSet.add(actual.shopifyVariantId);
   assert(/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]+$/.test(actual.shopifyVariantId));
   return {key:v.key,variantId:actual.shopifyVariantId.split('/').pop()};
  });
  prepared.push({key:'gravuru-approved-20261015:'+pkg.designSku,fingerprint:sha(doc),document:doc,bindings,designId:p.designId,designSku:pkg.designSku,shopifyProductId:m.shopifyProductId});
 }
 const saved=repository.importBatch(prepared.map(({key,fingerprint,document})=>({key,fingerprint,document})));
 const result=[];
 for(let i=0;i<saved.length;i++){
  const record=repository.get(saved[i].id),p=prepared[i];
  assert.equal(sha(record.document),p.fingerprint,'Bereits importiertes Produkt wurde nachträglich geändert.');
  const linked=intake.bindVariants({record,shopDomain:'gravuru-design.myshopify.com',mappings:p.bindings});
  assert.equal(linked.bindings.length,28);
  result.push({designId:p.designId,designSku:p.designSku,shopifyProductId:p.shopifyProductId,workshopProductId:record.id,workshopRevision:record.revision,created:saved[i].created,bindingsCreated:linked.created,bindings:linked.bindings});
 }
 for(const r of existing){const now=repository.get(r.id);assert.equal(now.revision,r.revision);assert.equal(sha(now.document),r.hash,'Vorhandenes Produkt verändert.');}
 return {schema:'gravuru-approved-design-import/v1',products:result,existingProductsUnchanged:existing.length,publicIntegration:false,checkoutVerified:false};
}
