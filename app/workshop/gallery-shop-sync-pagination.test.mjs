import test from 'node:test';
import assert from 'node:assert/strict';
import {createGallerySyncShopifyTransport} from './gallery-shop-sync-transport.mjs';
const shopDomain='isolated-gallery-sync.myshopify.com',productId='gid://shopify/Product/168001';
function setup(change=()=>{}){
 const calls=[],variants=Array.from({length:404},(_,i)=>({id:'gid://shopify/ProductVariant/'+(168100+i),price:'19.99',selectedOptions:[]}));
 const graphql=async(query,variables)=>{calls.push({query,variables});assert.ok(!query.includes('mutation'));const tail=!!variables.after;const product={id:productId,updatedAt:'2026-11-08T12:00:00Z',title:'Erhalten',variants:{nodes:structuredClone(tail?variants.slice(250):variants.slice(0,250)),pageInfo:{hasNextPage:!tail,endCursor:tail?'last':'page-250'}},media:{nodes:[],pageInfo:{hasNextPage:false}},metafield:null};change(product,tail);return {data:{shop:{myshopifyDomain:shopDomain,currencyCode:'EUR'},product}};};
 return {calls,transport:createGallerySyncShopifyTransport({shopDomain,graphql})};
}
test('read-only Shopify adapter reads both pages and preserves all 404 existing variant IDs',async()=>{const f=setup(),remote=await f.transport.inspect({shopifyProductId:productId});assert.equal(remote.variants.length,404);assert.equal(remote.commerce.variants.length,404);assert.equal(f.calls.length,2);assert.equal(f.calls[1].variables.after,'page-250');assert.equal(f.transport.canWrite,false);});
test('variant pagination rejects a parallel product change',async()=>{const f=setup((p,tail)=>{if(tail)p.updatedAt='2026-11-08T12:00:01Z';});await assert.rejects(()=>f.transport.inspect({shopifyProductId:productId}),e=>e.code==='gallery_sync_remote_changed');});
test('variant pagination rejects duplicates within the second page',async()=>{const f=setup((p,tail)=>{if(tail)p.variants.nodes[1]=p.variants.nodes[0];});await assert.rejects(()=>f.transport.inspect({shopifyProductId:productId}),e=>e.code==='gallery_sync_remote_incomplete');});
