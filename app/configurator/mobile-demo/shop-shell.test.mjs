import test from 'node:test';
import assert from 'node:assert/strict';
import {shopPresentationContext,shopProductSummary,installPrioShopShell} from './shop-shell.mjs';

function fixture(){
 const config={profile:{name:'Türschild',material:{kind:'steel'}},photo:{enabled:false},logo:{enabled:true}};
 const binding={productId:'cfg_test',productRevision:3};
 const host={location:{origin:'https://app.example'},UniversalConfig:config,GravuruWorkshopReview:binding,
  GravuruShopEntry:{...binding,presentation:'prio-r15',productName:'Edelstahl-Türschild',cartMode:'theme',submitCart(){},request(){}}};
 return {host,view:{location:{origin:'https://app.example'}},config};
}
test('only an explicit, matching native shop presentation is installed',async()=>{
 const f=fixture(),before={...f.host.GravuruShopEntry};
 assert.equal(shopPresentationContext(f).mode,'shop');assert.equal(shopPresentationContext(f).logoOnly,true);
 assert.ok(Object.isFrozen(shopPresentationContext(f)));assert.deepEqual(f.host.GravuruShopEntry,before);
 for(const alter of [v=>v.host.GravuruShopEntry.productId='foreign',v=>v.host.GravuruWorkshopReview.productRevision=4,
  v=>v.host.GravuruWorkshopReview.productRevision='3',v=>v.host.GravuruShopEntry.submitCart=null,
  v=>v.host.GravuruShopEntry.request=null,v=>v.host.GravuruShopEntry.cartMode='demo',
  v=>v.view.location.origin='https://foreign.example',v=>v.config=structuredClone(v.config),v=>v.view=v.host]){
  const bad=fixture();alter(bad);assert.throws(()=>shopPresentationContext(bad));
 }
 delete f.host.GravuruShopEntry.presentation;
 assert.equal(shopPresentationContext(f),null);assert.equal(await installPrioShopShell(null,f.config,f),null);
 assert.equal(f.host.GravuruMobileDemo,undefined);
});
test('native dimensions and material are shown without rounding away approved dimensions',()=>{
 const f=fixture(),context=shopPresentationContext(f);
 assert.equal(shopProductSummary(f.config,{width:70,height:23.3},context),'Edelstahl · 7 × 2,33 cm');
 assert.equal(shopProductSummary(f.config,{width:80,height:53.3},context),'Edelstahl · 8 × 5,33 cm');
 assert.equal(shopProductSummary(f.config,{width:0,height:20},context),'Edelstahl-Türschild');
 assert.equal(shopProductSummary({profile:{material:{kind:'acrylic'}}},{width:300,height:200},context),'Acrylglas · 30 × 20 cm');
 assert.equal(shopProductSummary({}, {width:220,height:140}, null),'Schiefer · 22 × 14 cm');
});
