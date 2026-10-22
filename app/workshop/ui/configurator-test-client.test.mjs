import test from 'node:test';
import assert from 'node:assert/strict';
import {openConfiguratorTest} from './configurator-test-client.mjs';
import {createMerchantRequest} from './merchant-request.mjs';
const ids={shopifyProductId:'gid://shopify/Product/123',shopifyVariantId:'gid://shopify/ProductVariant/456'};
const productId='cfg_11111111-1111-1111-1111-111111111111';
const search='?'+new URLSearchParams(ids);
function fixture(overrides={}){
 const calls=[],session={token:'c'.repeat(64),expiresAt:'2026-10-22T12:00:00.000Z',binding:{...ids,productId,productRevision:5,options:{}},editorKind:'form',apiPrefix:'/api/workshop/acryl/',editorPath:'/_merchant-acryl-form-editor.html',testOnly:true,productionReady:false,...overrides};
 const request=async(url,options={})=>{calls.push({url,options});return Response.json(url.endsWith('/session')?{csrfToken:'b'.repeat(64),mode:'merchant-test-only',publicAccess:false,productionReady:false}:url.endsWith('/sessions')?session:{ok:true});};
 return {calls,session,request,now:()=>Date.parse('2026-10-22T11:00:00.000Z')};
}
test('ordinary preview performs no test session request; partial or invalid IDs fail',async()=>{
 const f=fixture();assert.equal(await openConfiguratorTest({...f,search:''}),null);assert.equal(f.calls.length,0);
 for(const bad of ['?shopifyProductId=123','?'+new URLSearchParams({...ids,shopifyVariantId:'https://example.com'})])await assert.rejects(openConfiguratorTest({...f,search:bad}),/genaue Shopify/);
 assert.equal(f.calls.length,0);
});
test('exact IDs open a private session and neither secret reaches a URL or serialized public context',async()=>{
 const f=fixture(),gate=await openConfiguratorTest({...f,search});
 assert.deepEqual(JSON.parse(f.calls[1].options.body),ids);assert.equal(gate.productId,productId);
 assert.ok(!JSON.stringify(gate).includes(f.session.token));
 await gate.model();await gate.submitCart({draftId:'draft_test',expectedRevision:1,quantity:2},{draftToken:'d'.repeat(64)});
 assert.equal(f.calls.at(-1).options.headers['X-Gravuru-Configurator'],f.session.token);
 assert.equal(f.calls.at(-1).options.headers['X-Gravuru-Draft'],'d'.repeat(64));
 for(const {url} of f.calls)assert.ok(!url.includes(f.session.token)&&!url.includes('d'.repeat(64)));
});
test('server-resolved store prefix preserves source paths and rejects cross-store access',async()=>{
 const f=fixture(),gate=await openConfiguratorTest({...f,search});
 await gate.request('/api/workshop/customer-drafts/draft_x');assert.equal(f.calls.at(-1).url,'/api/workshop/acryl/customer-drafts/draft_x');
 await gate.request('/api/workshop/acryl/session');assert.equal(f.calls.at(-1).url,'/api/workshop/acryl/session');
 assert.throws(()=>gate.request('https://example.com'),/datenspeicher/i);
 const legacy=fixture({apiPrefix:'/api/workshop/',editorPath:'/_merchant-form-editor.html'}),other=await openConfiguratorTest({...legacy,search});
 assert.throws(()=>other.request('/api/workshop/acryl/session'),/datenspeicher/i);
});
test('wrong IDs, public mode, unknown resource routes and expired sessions are rejected',async()=>{
 for(const change of [{binding:{...ids,productId,productRevision:5,shopifyVariantId:'gid://shopify/ProductVariant/457'}},{testOnly:false},{productionReady:true},{apiPrefix:'/api/other/'},{editorPath:'https://example.com/'},{expiresAt:'2026-10-22T10:00:00Z'}])await assert.rejects(openConfiguratorTest({...fixture(change),search}),/stimmen nicht/);
 let time=Date.parse('2026-10-22T11:00:00Z');const f=fixture(),gate=await openConfiguratorTest({...f,search,now:()=>time});time+=3600001;
 await assert.rejects(gate.model(),/abgelaufen/);assert.equal(f.calls.length,2);
});
test('merchant broker authorizes only the four explicit test endpoints without replaying writes',async()=>{
 const seen=[],request=createMerchantRequest({bridge:()=>({idToken:async()=>'merchant-test-token'}),required:()=>true,fetchImpl:async(url,options)=>{seen.push({url,options});return Response.json({ok:true});}});
 for(const name of ['session','sessions','model','cart'])await request('/api/configurator-test/'+name,{method:name==='cart'?'POST':'GET'});
 assert.equal(seen.length,4);assert.equal(seen[3].options.headers.get('authorization'),'Bearer merchant-test-token');
 for(const path of ['/api/configurator-test/admin','/api/configurator-test/cart?token=x','/api/configurator-test/../session','https://example.com'])await assert.rejects(request(path),/Unzulässiges/);
 assert.equal(seen.length,4);
});
