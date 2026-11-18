import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createFontConnectionHost} from './font-connection-host.mjs';
import {createGalleryProductionShopifyRead} from './gallery-production-shopify-read.mjs';
import {createGallerySyncTestFixture,GALLERY_SYNC_TEST_SHOP as shopDomain,GALLERY_SYNC_TEST_PRODUCT as PRODUCT} from '../../app/workshop/gallery-shop-sync-test-fixture.mjs';

async function fixture(t){
  const dir=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'font-host-'));
  const f=await createGallerySyncTestFixture({directory:dir,activationOptions:{approvalMode:'preserve'}});
  t.after(()=>{f.close();assert.equal(path.dirname(dir),fs.realpathSync(os.tmpdir()));fs.rmSync(dir,{recursive:true,force:true});});
  const katalogRoot=path.join(dir,'katalog'),fonts=['Michroma','Lato','Cinzel','Montserrat'];
  fs.cpSync(new URL('../../app/workshop/fixtures/katalog/',import.meta.url),katalogRoot,{recursive:true});
  f.targetWorkshop.profiles.registerFonts(fonts);f.targetWorkshop.profiles.syncCatalogFontSet('tuerschilder',fonts);
  const calls=[];let onFetch=()=>{};
  const reader=createGalleryProductionShopifyRead({shopDomain,apiVersion:'2026-07',getAccessToken:async()=>{calls.push('token');return 'synthetic-only';},
    fetchImpl:async(url,request)=>{const {query,variables}=JSON.parse(request.body);calls.push({query,variables});onFetch();
      return new Response(JSON.stringify({data:{shop:{myshopifyDomain:shopDomain,currencyCode:'EUR'},product:{id:PRODUCT,
        variants:{nodes:f.variants.map(v=>({id:v.id,price:(v.priceCents/100).toFixed(2)})),pageInfo:{hasNextPage:false}},media:{nodes:[],pageInfo:{hasNextPage:false}}}}}),
        {headers:{'content-type':'application/json','x-shopify-api-version':'2026-07'}});}});
  const options={tenantId:'gravuru',shopDomain,dataDirectory:path.join(dir,'target'),katalogRoot,planDirectory:path.join(dir,'private','plans'),webRoots:[path.join(dir,'public')],
    targets:[{id:'synthetic',setId:'tuerschilder',reviewedRevision:1,mapping:f.mapping}],approvedSets:[{id:'tuerschilder',fonts}],
    runtimeFonts:Object.fromEntries(fonts.map(n=>[n,{regular:{units:1000,glyphs:{}}}]))};
  const context={workshop:f.targetWorkshop,dataDirectory:options.dataDirectory,katalogRoot,shopifyReader:reader};
  return {...f,options,context,calls,onFetch:fn=>{onFetch=fn;}};
}

test('private host connects once to the existing store, does nothing on connect and saves only an explicit plan',async t=>{
  const f=await fixture(t),before=f.activation.capture(f.mapping),host=createFontConnectionHost({...f.options,executionEnabled:true});
  assert.throws(()=>host.operator(),{code:'font_connection_host_closed'});
  const mounted=host.connect(f.context);assert.deepEqual(f.calls,[]);assert.equal(fs.existsSync(f.options.planDirectory),false);
  assert.throws(()=>host.connect(f.context),{code:'font_connection_host_lifecycle'});
  const operator=host.operator(),plan=await operator.plan({targetId:'synthetic'});
  assert.equal(operator.read(plan.sha256).targetId,'synthetic');assert.equal(f.calls.length,2);
  await assert.rejects(operator.execute(plan.sha256),{code:'font_connection_execution_disabled'});
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision,1);assert.deepEqual(f.activation.capture(f.mapping),before);
  mounted.close();mounted.close();assert.throws(()=>host.operator(),{code:'font_connection_host_closed'});
  assert.throws(()=>operator.read(plan.sha256),{code:'font_connection_host_closed'});
  await assert.rejects(operator.plan({targetId:'synthetic'}),{code:'font_connection_host_closed'});
  await assert.rejects(operator.execute(plan.sha256),{code:'font_connection_host_closed'});
  assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,1,'mount never closes its owner');
});

test('wrong owner scope, credentials and write-capable readers fail without any network or plan file',async t=>{
  const f=await fixture(t);
  for(const change of [{dataDirectory:path.join(f.dir,'other')},{katalogRoot:path.join(f.dir,'other')},
    {workshop:f.sourceWorkshop,dataDirectory:path.join(f.dir,'source')},
    {shopifyReader:{...f.context.shopifyReader,canWrite:true}},
    {shopifyReader:{...f.context.shopifyReader,shopDomain:'other.myshopify.com'}},
    {shopifyReader:{...f.context.shopifyReader,accessToken:'synthetic'}},
    {shopifyReader:{...f.context.shopifyReader,getAccessToken:async()=> 'synthetic'}}]){
    assert.throws(()=>createFontConnectionHost(f.options).connect({...f.context,...change}),{code:'font_connection_host_scope'});
  }
  assert.deepEqual(f.calls,[]);assert.equal(fs.existsSync(f.options.planDirectory),false);
  await assert.rejects(f.context.shopifyReader.graphql('mutation Write { productDelete { deletedProductId } }',{}),{code:'gallery_connection_read_only'});
  assert.deepEqual(f.calls,[],'mutation rejected before token lookup');
});

test('closing the host during Shopify reading discards the pending plan before creating any file',async t=>{
  const f=await fixture(t),host=createFontConnectionHost(f.options),mounted=host.connect(f.context);
  f.onFetch(()=>mounted.close());
  await assert.rejects(host.operator().plan({targetId:'synthetic'}),{code:'font_connection_host_closed'});
  assert.equal(fs.existsSync(f.options.planDirectory),false);assert.equal(f.targetWorkshop.repository.head(f.target.id).revision,1);
});

test('all web roots are enforced by the connected operator',async t=>{
  const f=await fixture(t);
  assert.throws(()=>createFontConnectionHost({...f.options,webRoots:[...f.options.webRoots,path.join(f.dir,'private')]}).connect(f.context),{code:'font_connection_plan_file'});
  assert.deepEqual(f.calls,[]);assert.equal(fs.existsSync(f.options.planDirectory),false);
});
