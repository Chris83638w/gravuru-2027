import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makeAcrylicConfig} from './acrylic-product.mjs';
import {prepareConfig,saveDraft,readDraft} from './contract.mjs';
import {commercePrice} from './commerce-model.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {makeProductDocument} from '../../workshop/product-model.mjs';
import {validateAcrylicReview,prepareAcrylicReview,ACRYLIC_REVIEW} from '../../workshop/acrylic-review.mjs';
import {readReviewPackage} from '../../workshop/review-package.mjs';
import {loadCartRevision} from '../../workshop/cart-edit-revision.mjs';
import {legacyCartDraft} from './legacy-cart-restore.mjs';
import {shopCartRequest} from './shop-cart.mjs';
import {createSessionGuard} from './session-guard.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
function fixture(){
 const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
 for(const o of config.profile.designs[0].objects.filter(o=>o.type==='text')){measureText(o,resources.fonts);if(o.id==='names'){o.size*=118/o.w;measureText(o,resources.fonts);}}
 const ready=prepareConfig(config),source=ready.profile.designs[0],state={designId:source.id,objects:structuredClone(source.objects)};
 Object.assign(state.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'synthetic-photo',uxUploadKind:'photo'});
 const options=Object.fromEntries(ready.profile.optionGroups.map(g=>[g.id,g.defaultValueId]));state.mOptions=options;
 const record={id:ready.profile.id,revision:1,status:'draft',document:makeProductDocument(ready)};
 const input={productId:record.id,productRevision:record.revision,designId:source.id,objects:state.objects,options,quantity:1,media:[{id:'synthetic-photo',original:'synthetic-png'}],preview:'synthetic-png'};
 return {config:ready,state,options,record,input};
}

test('both toolbar assignments roundtrip with the exact design, options, price and binding',()=>{
 const f=fixture(),before=saveDraft(f.config,f.state,f.options,resources.fonts,resources.motifs),price=commercePrice(f.config,f.state,1);
 assert.equal(Object.hasOwn(before,'ui'),false);
 for(const placement of ['plate','selection']){
  const state={...f.state,ui:{textToolbarPlacement:placement}},draft=saveDraft(f.config,state,f.options,resources.fonts,resources.motifs),restored=readDraft(f.config,draft,resources.fonts,resources.motifs);
  assert.deepEqual(restored.ui,state.ui);assert.notEqual(restored.ui,draft.ui);
  const {ui,...withoutUi}=draft;assert.deepEqual(withoutUi,before);assert.deepEqual(commercePrice(f.config,state,1),price);
  assert.throws(()=>readDraft(f.config,{...draft,productId:'foreign'},resources.fonts,resources.motifs),/anderen Produkt/);
  assert.throws(()=>readDraft(f.config,{...draft,ui:{textToolbarPlacement:placement,price:0}},resources.fonts,resources.motifs),/Textleiste/);
 }
});
test('the real adapter restore handler restores metadata and keeps the active assignment for older drafts',()=>{
 const f=fixture(),source=fs.readFileSync(new URL('./adapter.mjs',import.meta.url),'utf8').replaceAll('\r\n','\n'),handler=source.split('\n').find(line=>line.includes('el.restoreDraft=function'));
 const el={state:{ui:{textToolbarPlacement:'plate'}},fontData:resources.fonts,record(){},sync(){}},env=vm.createContext({el,config:f.config,readDraft,clone:structuredClone,motifs:()=>resources.motifs,options:{},photos:new Map(),photoDesign:''});
 vm.runInContext(handler,env);
 const saved=saveDraft(f.config,{...f.state,ui:{textToolbarPlacement:'selection'}},f.options,resources.fonts,resources.motifs);
 el.restoreDraft(saved);assert.deepEqual(el.state.ui,{textToolbarPlacement:'selection'});
 delete saved.ui;el.restoreDraft(saved);assert.deepEqual(el.state.ui,{textToolbarPlacement:'selection'});
});
test('session recovery keeps the saved placement without adding it to product options',()=>{
 const f=fixture(),data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
 for(const placement of ['plate','selection']){
  const ui={textToolbarPlacement:placement},payload=()=>({draft:saveDraft(f.config,{...f.state,ui},f.options,resources.fonts,resources.motifs)});
  const identity={productId:f.config.profile.binding.productId,profileRevision:f.config.profile.revision,storage};
  const first=createSessionGuard({...identity,payload,restore(){}});first.arm();assert.equal(first.flush(),true);
  let restored;const next=createSessionGuard({...identity,payload,restore:draft=>{restored=readDraft(f.config,draft,resources.fonts,resources.motifs);}});
  assert.ok(next.recover());assert.deepEqual(restored.ui,ui);assert.deepEqual(restored.options,f.options);
 }
});
test('native review validates UI independently and never lets metadata change the price or product',()=>{
 const f=fixture(),baseline=validateAcrylicReview(f.record,f.config,f.input);
 for(const placement of ['plate','selection']){
  const state=validateAcrylicReview(f.record,f.config,{...f.input,ui:{textToolbarPlacement:placement}}),{ui,...rest}=state;
  assert.equal(ui.textToolbarPlacement,placement);assert.deepEqual(rest,baseline);
 }
 for(const ui of [null,{}, {textToolbarPlacement:'invalid'},{textToolbarPlacement:'plate',unitCents:1}])assert.throws(()=>validateAcrylicReview(f.record,f.config,{...f.input,ui}),/Textleiste/);
 assert.throws(()=>validateAcrylicReview(f.record,f.config,{...f.input,productRevision:2,ui:{textToolbarPlacement:'plate'}}),/Revision/);
});
test('immutable order package and cart reopen retain UI; Shopify cart request receives no new field',async()=>{
 const f=fixture(),png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Vn0AAAAASUVORK5CYII=','base64');
 for(const placement of ['plate','selection']){
  const ui={textToolbarPlacement:placement},bundle=await prepareAcrylicReview({record:f.record,config:f.config,input:{...f.input,ui},assets:{},preparePhoto:async()=>({original:png,preview:png,width:1,height:1})});
  const saved=readReviewPackage(bundle.package,bundle.manifest.packageSha256,ACRYLIC_REVIEW),frozen=JSON.parse(saved.files.get('produkt-und-gestaltung.json'));
  assert.deepEqual(frozen.state.ui,ui);assert.equal(Object.hasOwn(bundle.manifest.selection,'ui'),false);
  const draftId='adraft_00000000-0000-4000-8000-000000000001',configId='konfig_00000000-0000-4000-8000-000000000002';
  const drafts={cartConfigurations:{revision:()=>({draftId,snapshotId:bundle.manifest.id,lineId:'theme'}),latest:()=>({rev:1})},acrylicDrafts:{get:()=>({id:draftId,revision:1,productId:f.record.id,productRevision:1,designId:f.state.designId})},review:()=>({manifest:bundle.manifest}),downloadSnapshot:()=>bundle.package};
  const loaded=loadCartRevision({drafts,repository:{get:()=>f.record},configId,rev:1,draftToken:'synthetic'});
  assert.deepEqual(loaded.document.ui,ui);assert.deepEqual(readDraft(f.config,loaded.document,resources.fonts,resources.motifs).ui,ui);
  assert.deepEqual(shopCartRequest({saved:{draftId,revision:1},quantity:1,ui}),{draftId,expectedRevision:1,quantity:1});
 }
});
test('legacy saved-design transport preserves UI while retaining exact product checks',()=>{
 const f=fixture(),snapshot={schema:'gravuru-shopify-design/v1',productId:'gid://shopify/Product/123',profileId:f.config.profile.id,revision:f.config.profile.revision,design:f.config.profile.designs[0],options:f.options,ui:{textToolbarPlacement:'selection'}};
 assert.deepEqual(legacyCartDraft(f.config,snapshot,snapshot.productId).ui,snapshot.ui);
 assert.throws(()=>legacyCartDraft(f.config,snapshot,'gid://shopify/Product/other'),/anderen Produkt/);
 assert.throws(()=>legacyCartDraft(f.config,{...snapshot,ui:{textToolbarPlacement:'invalid'}},snapshot.productId),/Textleiste/);
});
