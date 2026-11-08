import test from 'node:test';
import assert from 'node:assert/strict';
import {pageConfig,startHref,currentVariant,productForms,createStartTickets,pageStartUrl} from './ui/shop-embed.mjs';
import {prepareSteelPresentation} from '../../ops/shopify/prepare-steel-presentation.mjs';

const ids=Array.from({length:404},(_,i)=>String(1000+i));
const base={productId:'16190784438652',variantId:ids[0],variants:ids.slice(0,250),back:'/products/steel'};
const presentation={schema:'gravuru-shop-presentation/v1',productId:base.productId,ui:'prio-r15',variantId:ids[260],themeVariantId:ids[0],back:base.back,variants:ids};
function documentFor(raw=base,profile=presentation){
 const form=(value,{sticky=false,submit=true}={})=>({value,querySelector(selector){if(selector==='[name="id"]')return {value:this.value};if(selector==='[type="submit"],[name="add"]')return submit?{}:null;return null;},closest(){return sticky?{}:null;}});
 const installment=form(ids[0],{submit:false}),sticky=form(ids[0],{sticky:true}),main=form(ids[0]),foreign=form('9000');
 return {main,sticky,foreign,getElementById(id){const data=id==='gravuru-konfi'?raw:id==='gravuru-konfi-presentation'?profile:null;return data?{textContent:JSON.stringify(data)}:null;},querySelectorAll(){return [installment,sticky,main,foreign];}};
}
test('reviewed product presentation includes all404 IDs, beyond Liquid first250, without changing ordinary product data',()=>{
 const doc=documentFor(),config=pageConfig(doc);
 assert.equal(config.ui,'prio-r15');assert.equal(config.variants.length,404);assert.equal(config.variantId,ids[260]);assert.equal(config.themeVariantId,ids[0]);
 doc.main.value=ids[403];assert.equal(currentVariant(config,doc,''),ids[403]);assert.equal(productForms(config,doc).length,3);
 assert.deepEqual(pageConfig(documentFor(base,null)),base);
 assert.equal(pageConfig(documentFor({...base,variants:ids},null)),null,'ordinary limit is unchanged');
});
test('malformed, cross-product or duplicate opt-ins never activate presentation or broaden ordinary membership',()=>{
 for(const patch of [{schema:'wrong'},{productId:'77'},{ui:'prio-r15&price=0'},{variantId:'9000'},{variants:[...ids,ids[0]]},{variants:[...ids,'not-id']},{variants:Array.from({length:2049},(_,i)=>String(1000+i))}]){
  assert.deepEqual(pageConfig(documentFor(base,{...presentation,...patch})),base);
 }
 assert.equal(pageConfig(documentFor(null,presentation)),null);
});
test('the actual custom-Liquid shape works without global app-embed JSON, only beside the matching own product link',()=>{
 const doc=documentFor(null,presentation),forms=doc.querySelectorAll();
 let product=base.productId,start='__PROXY_PATH__/start';
 const block={getAttribute(name){return name==='data-product-id'?product:name==='data-start'?start:null;}};
 doc.querySelectorAll=selector=>selector==='[data-gravuru-personalisieren]'?[block]:forms;
 const config=pageConfig(doc);assert.equal(config.ui,'prio-r15');assert.equal(config.variants.length,404);assert.equal(currentVariant(config,doc,''),ids[260]);
 doc.main.value=ids[403];assert.equal(currentVariant(config,doc,''),ids[403]);
 product='99';assert.equal(pageConfig(doc),null);product=base.productId;start='https://foreign.example/start';assert.equal(pageConfig(doc),null);
});
test('main image default wins until actual main form changes; choosing the first variant later remains possible',()=>{
 const doc=documentFor(),config=pageConfig(doc);
 assert.equal(currentVariant(config,doc,''),ids[260]);
 doc.main.value=ids[403];assert.equal(currentVariant(config,doc,''),ids[403]);
 doc.main.value=ids[0];assert.equal(currentVariant(config,doc,''),ids[0]);
 assert.equal(currentVariant(config,doc,''),ids[0]);
 doc.foreign.value='9999';assert.equal(currentVariant(config,doc,''),ids[0]);
});
test('explicit variant deep link and later URL changes preserve a valid selection without following stale installment or sticky fields',()=>{
 const doc=documentFor(),config=pageConfig(doc);
 assert.equal(currentVariant(config,doc,'?variant='+ids[403]),ids[403]);
 doc.main.value=ids[300];assert.equal(currentVariant(config,doc,'?variant='+ids[403]),ids[300]);
 assert.equal(currentVariant(config,doc,'?variant='+ids[0]),ids[0]);
 for(const search of ['?variant=9000','?variant='+ids[3]+'&variant='+ids[4],'?price=0'])assert.equal(currentVariant(config,doc,search),ids[0]);
});
test('ordinary products retain existing form-first behavior',()=>{
 const doc=documentFor(base,null),config=pageConfig(doc);doc.main.value=ids[10];
 assert.equal(currentVariant(config,doc,'?variant='+ids[20]),ids[0]);
});
test('start URLs retain explicit product presentation, variant and toolbar; arbitrary URL fields cannot opt another product in',()=>{
 const config=pageConfig(documentFor());
 for(const variant of [ids[0],ids[403]]){
  const u=new URL(startHref(config,variant,'?price=0&ui=evil&leiste=b'),'https://shop.example/');
  assert.equal(u.searchParams.get('ui'),'prio-r15');assert.equal(u.searchParams.get('variant'),variant);assert.equal(u.searchParams.get('product'),base.productId);assert.equal(u.searchParams.get('leiste'),'b');assert.equal(u.searchParams.has('price'),false);
 }
 const ordinary=new URL(startHref(base,ids[0],'?ui=prio-r15'),'https://shop.example/');assert.equal(ordinary.searchParams.has('ui'),false);
 assert.equal(new URL(startHref(config,'9000'),'https://shop.example/').searchParams.get('variant'),ids[260]);
});
test('prefetch ticket and page fallback keep the presentation and selected variant together',async()=>{
 const config=pageConfig(documentFor()),key=new URL(startHref(config,ids[403]),'https://shop.example/');key.searchParams.set('embed','1');
 const requests=[],tickets=createStartTickets({now:()=>1000,fetchImpl:async url=>{requests.push(new URL(url));return {ok:true,json:async()=>({url:'__EDITOR_ORIGIN__/#s=synthetic&ui=prio-r15',expiresAt:new Date(3601000).toISOString()})};}});
 assert.match(await tickets.load(key.href),/ui=prio-r15/);assert.equal(requests[0].searchParams.get('ui'),'prio-r15');assert.equal(requests[0].searchParams.get('variant'),ids[403]);assert.equal(requests[0].searchParams.get('format'),'json');
 const fallback=new URL(pageStartUrl(requests[0].href));assert.equal(fallback.searchParams.get('ui'),'prio-r15');assert.equal(fallback.searchParams.get('variant'),ids[403]);assert.equal(fallback.searchParams.has('embed'),false);assert.equal(fallback.searchParams.has('format'),false);
});

const original="{%- assign gv_back = product.url | split: '?' | first -%}<div data-variant-id=\"{{ gv_variant.id }}\"><a href=\"/apps/konfigurator/start?product={{ product.id }}&amp;variant={{ gv_variant.id }}&amp;back={{ gv_back | url_encode }}\">Jetzt personalisieren</a></div><script>if(/[?&]fenster=1(&|$)/.test(location.search))import('/apps/konfigurator/shop-embed.mjs');</script>";
const theme=()=>({sections:{main:{blocks:{custom_liquid_mTPWzc:{type:'custom_liquid',settings:{custom_liquid:original}},other:{type:'price',settings:{keep:true}}}}},order:['main']});
function planFor(){const variants=ids.map((id,i)=>({shopifyVariantId:'gid://shopify/ProductVariant/'+(i===260?'58104606556540':id),options:{size:i===260?'GR-ES-AB-120X80-T15':'other-'+i,mounting:'K00'}}));return {existingTarget:{shopifyProductId:base.productId},start:{sizeKey:'GR-ES-AB-120X80-T15',mounting:'K00',nativeDesignId:'katalog-TAE-V2A-8x5-D1'},nativeUpdate:{shopReadback:{productId:'gid://shopify/Product/'+base.productId,variants},document:{config:{profile:{id:'katalog-formate-edelstahl-tuerschilder-familienschilder-eb5fe26624befe4a'}}}}};}
test('local theme candidate changes exactly the existing start block and gates all additional metadata/imports on the one product and customization ID',()=>{
 const before=theme(),plan=planFor(),result=prepareSteelPresentation(JSON.stringify(before),plan),after=JSON.parse(result.text);
 const newLiquid=after.sections.main.blocks.custom_liquid_mTPWzc.settings.custom_liquid;after.sections.main.blocks.custom_liquid_mTPWzc.settings.custom_liquid=original;assert.deepEqual(after,before);
 assert.equal(result.manifest.variantCount,404);assert.equal(result.manifest.shopWrites,false);
 assert.match(newLiquid,/product\.id == 16190784438652 and gv_konfi_id == 'katalog-formate-edelstahl-tuerschilder-familienschilder-eb5fe26624befe4a'/);
 assert.match(newLiquid,/product\.selected_variant\.id \| default: 58104606556540/);assert.match(newLiquid,/if gv_prio_ui == 'prio-r15' %}&amp;ui=prio-r15/);
 const manifestJson=newLiquid.match(/<script type="application\/json" id="gravuru-konfi-presentation">([\s\S]*?)<\/script>/)[1];assert.equal(JSON.parse(manifestJson.replace('{{ gv_start_variant_id }}','58104606556540').replace('{{ gv_variant.id }}',ids[0]).replace('{{ gv_back | json }}','"/products/steel"')).variants.length,404);
 assert.match(manifestJson,/"themeVariantId":"\{\{ gv_variant\.id \}\}"/,'original theme default is kept separate from the main-image start');
 assert.match(newLiquid,/{% else %}if\(\/\[\?&\]fenster=1/,'other products retain the existing import condition');
});
test('candidate preparation fails closed for changed source, incomplete variants, other products or changed approved start',()=>{
 for(const edit of [p=>p.existingTarget.shopifyProductId='1',p=>p.nativeUpdate.shopReadback.variants.pop(),p=>p.nativeUpdate.shopReadback.variants[0]=p.nativeUpdate.shopReadback.variants[1],p=>p.start.nativeDesignId='other']){const p=planFor();edit(p);assert.throws(()=>prepareSteelPresentation(JSON.stringify(theme()),p));}
 const changed=theme();changed.sections.main.blocks.custom_liquid_mTPWzc.settings.custom_liquid+='gravuru-konfi-presentation';assert.throws(()=>prepareSteelPresentation(JSON.stringify(changed),planFor()));
});
