import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {commercePrice} from '../configurator/variant-m/commerce-model.mjs';
import {optionFieldEntries} from '../configurator/variant-m/contract.mjs';
import {makeProductDocument} from './product-model.mjs';
import {capturePersonalization,personalizationForSnapshot,personalizationAttributes} from './cart-personalization.mjs';
import {createOrderIntake} from './order-intake.mjs';
import {cartTransformRun} from '../../ops/shopify/master-release/cart_transform_run.mjs';

// Synthetic historical amounts from cart-priced-options.test.mjs; this test is
// not approval of current product prices or of a new checkout deployment.
const prices={silikon:699,'staender-klar':1399,'staender-schwarz':1599};
function fixture(t){
  const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
  const c=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));delete c.acrylic;
  const p=c.profile;p.material={kind:'slate',color:'#41494b',thicknessMm:5};p.processing={profileId:'slate-engraving'};
  p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]};
  const text=structuredClone(p.designs[0].objects.find(o=>o.type==='text'));
  Object.assign(text,{id:'name',text:'Synthetic',size:5,x:110,y:70,w:30,h:8,rotation:0,acrylicFixed:false});
  p.designs=[{id:'test',name:'Synthetic',objects:[text]}];p.defaultDesignId='test';
  p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[
    {id:'none',label:'Ohne',priceCents:0,currency:'EUR',holes:[]},
    {id:'adhesive',label:'Synthetic adhesive variant',priceCents:499,currency:'EUR',holes:[]}
  ]}];
  p.optionFields=Object.entries(prices).map(([id,priceCents])=>({id,kind:'checkbox',label:id,priceCents}));
  c.basePriceCents=2199;c.extraMotifCents=169;c.photo={enabled:true,mode:'upload-only',includedCount:0,extraPriceCents:999};
  c.localResources.photoExamples=[];c.localResources.photoPlaceholders=[];
  const record={id:'cfg_cart229_synthetic',revision:1,status:'draft',document:makeProductDocument(c)};
  const config=record.document.config,pricing={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:'gid://shopify/Product/101',revision:1,currency:'EUR',variants:{301:2199,302:2698},extraMotifCents:169,extraPhotoCents:999};
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());let manifest;
  const intake=createOrderIntake({database:db,snapshot:()=>structuredClone(manifest)});
  const quote=(fields={},mounting='none')=>{
    const options={mounting,...fields},price=commercePrice(config,{objects:config.profile.designs[0].objects,designId:'test',mOptions:options},1);
    manifest={id:'proof_cart229',schema:'gravuru-native-review/v1',packageSha256:'b'.repeat(64),product:{id:record.id,revision:1,basePriceCents:price.unitCents,currency:'EUR'},selection:{options:{mounting},price,fields:optionFieldEntries(config,options)},productionReady:false,productionProfile:null};
    return structuredClone(manifest);
  };
  return {db,intake,record,config,pricing,quote};
}
const rejects=e=>e.code==='cart_personalization'&&e.status===422;

test('issue229: candidate V3 contract is rejected before a binding or offer is saved',t=>{
  const f=fixture(t),pricing={...f.pricing,schema:'gravuru-personalization-pricing/v3',optionPrices:prices};
  assert.throws(()=>capturePersonalization(pricing,{variantId:'301',baseCents:2199,document:f.record.document}),rejects);
  assert.throws(()=>f.intake.bind({record:f.record,shopDomain:'synthetic.myshopify.com',variantId:'301',options:{mounting:'none'},personalizationPricing:pricing}),rejects);
  for(const table of ['form_shop_bindings','form_order_offers'])assert.equal(f.db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n,0);
});

test('issue229: none selected works with V1; all seven paid checkbox combinations block before an offer exists',t=>{
  const f=fixture(t),contract=capturePersonalization(f.pricing,{variantId:'301',baseCents:2199,document:f.record.document});
  assert.equal(personalizationForSnapshot(contract,f.quote()).unitCents,2199);
  const binding=f.intake.bind({record:f.record,shopDomain:'synthetic.myshopify.com',variantId:'301',options:{mounting:'none'},personalizationPricing:f.pricing});
  for(let mask=1;mask<8;mask++){
    const selected=Object.fromEntries(Object.keys(prices).filter((_,i)=>mask&(1<<i)).map(id=>[id,true]));
    const m=f.quote(selected),expected=Object.keys(selected).reduce((sum,id)=>sum+prices[id],0);
    assert.equal(m.selection.price.fieldCents,expected);assert.equal(m.selection.price.unitCents,2199+expected);
    assert.throws(()=>personalizationForSnapshot(contract,m),rejects);
    assert.throws(()=>f.intake.offer({bindingId:binding.id,snapshotId:m.id,quantity:1}),rejects);
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM form_order_offers').get().n,0);
  }
});

test('issue229: a paid mounting variant remains orderable and its amount is preserved through the checkout transform',t=>{
  const f=fixture(t),m=f.quote({},'adhesive');
  assert.equal(m.selection.price.fieldCents,0);assert.equal(m.selection.price.unitCents,2698);
  const binding=f.intake.bind({record:f.record,shopDomain:'synthetic.myshopify.com',variantId:'302',options:{mounting:'adhesive'},personalizationPricing:f.pricing});
  const offer=f.intake.offer({bindingId:binding.id,snapshotId:m.id,quantity:1});assert.equal(offer.unitCents,2698);
  const a=Object.fromEntries(personalizationAttributes(offer.personalization).map(v=>[v.key,v.value]));
  const result=cartTransformRun({presentmentCurrencyRate:'1',cart:{lines:[{id:'synthetic',quantity:1,motifs:{value:a._gravuru_motifs},uploads:{value:a._gravuru_uploads},revision:{value:a._gravuru_revision},designFile:{value:a['Bearbeitbarer Entwurf']},merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/302',product:{id:f.pricing.productId,pricing:{jsonValue:f.pricing}}}}]}});
  assert.equal(result.operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,'26.98');
  assert.throws(()=>f.intake.bind({record:f.record,shopDomain:'synthetic.myshopify.com',variantId:'301',options:{mounting:'adhesive'},personalizationPricing:f.pricing}),rejects);
});
