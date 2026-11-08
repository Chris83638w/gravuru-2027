import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createGalleryShopConnection} from './gallery-shop-connection.mjs';
import {createGallerySyncTestFixture,GALLERY_SYNC_TEST_SHOP as shopDomain} from '../../app/workshop/gallery-shop-sync-test-fixture.mjs';
import {createGallerySyncImagePreparation,createGallerySyncShopifyMedia} from '../../app/workshop/gallery-shop-sync-media.mjs';
import {galleryTestPng} from '../fixtures/gallery-editor.mjs';

test('real server bootstrap is mountable on createWorkshop, isolated and read-only by default',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-connection-')),f=await createGallerySyncTestFixture({directory});
 t.after(()=>{f.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'gallery-connection-')));fs.rmSync(directory,{recursive:true,force:true});});
 const before=f.targetWorkshop.repository.get(f.target.id),read=await f.transport.inspect(f.mapping);let reads=0;
 const graphql=async(query,variables)=>{
  assert.match(query,/^query GallerySyncProduct/,'bootstrap must never mutate Shopify');assert.equal(variables.id,f.mapping.shopifyProductId);reads++;
  return {data:{shop:{myshopifyDomain:shopDomain,currencyCode:'EUR'},product:{id:read.id,title:'Titel',handle:'test',status:'ACTIVE',descriptionHtml:'',seo:{title:'Titel',description:''},options:[],variants:{nodes:read.variants.map(v=>({id:v.id,price:(v.priceCents/100).toFixed(2),compareAtPrice:null,sku:v.id,selectedOptions:[],inventoryItem:{id:'gid://shopify/InventoryItem/1',tracked:true}})),pageInfo:{hasNextPage:false}},media:{nodes:[],pageInfo:{hasNextPage:false}},metafield:null}}};
 };
 const mapping={...f.mapping,media:[],mediaRequired:false},args={sourceWorkshop:f.sourceWorkshop,targetWorkshop:f.targetWorkshop,shopDomain,journalFilename:path.join(directory,'real-connection-journal.sqlite'),targets:[mapping],graphql,sourceApproval:()=>({approved:true})};
 const connection=createGalleryShopConnection(args);assert.equal(reads,0);assert.equal(connection.status().executionEnabled,false);assert.equal(connection.status().mode,'shopify');
 assert.equal(connection.listTargets().targets[0].ready,true);const plan=await connection.plan({targetIds:[mapping.id]});assert.equal(plan.ready,true,JSON.stringify(plan.entries[0].issues));assert.equal(reads,1);
 await assert.rejects(()=>connection.execute({planId:plan.planId,planSha256:plan.planSha256}),e=>e.code==='gallery_sync_disabled');assert.deepEqual(f.targetWorkshop.repository.get(f.target.id),before);connection.close();connection.close();
 const reopened=createGalleryShopConnection(args);assert.equal(reopened.preview({planId:plan.planId,targetId:mapping.id}).afterSvg,plan.entries[0].afterSvg);assert.deepEqual(reopened.openPlan({planId:plan.planId}),plan);reopened.close();
 assert.throws(()=>createGalleryShopConnection({...args,journalFilename:path.join(directory,'target','workshop.sqlite')}),e=>e.code==='gallery_connection_journal');
 assert.deepEqual(f.targetWorkshop.repository.get(f.target.id),before);
});

test('full mounted native sync uses real image adapter, scoped fileUpdate, release CAS and real binding activation',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-connection-e2e-')),f=await createGallerySyncTestFixture({directory});
 const oldPng=Buffer.from(galleryTestPng,'base64'),newPng=Buffer.concat([oldPng,Buffer.from('synthetic new product image')]);let bytes=oldPng,version=1,release=null;
 const imageId=f.mapping.media[0].id,calls=[],staging=createGallerySyncImagePreparation({filename:path.join(directory,'staging.sqlite'),tenantId:'gravuru',shopDomain,origin:'https://isolated-images.example.test',secret:'synthetic-only-staging-secret-32-characters',renderPng:async svg=>{assert.match(svg,/<svg/);return newPng;}});
 let connection;
 t.after(()=>{connection?.close();staging.close();f.close();assert.ok(directory.startsWith(path.join(os.tmpdir(),'gallery-connection-e2e-')));fs.rmSync(directory,{recursive:true,force:true});});
 const image=()=>({id:imageId,status:'READY',image:{url:'https://cdn.shopify.com/product.png?v='+version}});
 const graphql=async(query,v)=>{
  calls.push({query,variables:structuredClone(v)});
  if(query.startsWith('query GallerySyncProduct'))return {data:{shop:{myshopifyDomain:shopDomain,currencyCode:'EUR'},product:{id:f.mapping.shopifyProductId,title:'Beibehaltener Titel',handle:'gleich',status:'ACTIVE',descriptionHtml:'Unverändert',seo:{title:'SEO bleibt',description:'Unverändert'},options:[],variants:{nodes:f.variants.map(x=>({id:x.id,price:(x.priceCents/100).toFixed(2),compareAtPrice:null,sku:x.id,selectedOptions:Object.entries(x.options).map(([name,value])=>({name,value})),inventoryItem:{id:'gid://shopify/InventoryItem/1',tracked:true}})),pageInfo:{hasNextPage:false}},media:{nodes:[image()],pageInfo:{hasNextPage:false}},metafield:release}}};
  if(query.startsWith('query GallerySyncImageFiles'))return {data:{shop:{myshopifyDomain:shopDomain},nodes:v.ids.map(id=>({...image(),id,__typename:'MediaImage',fileStatus:'READY',mimeType:'image/png',originalSource:{url:'https://cdn.shopify.com/original.png?version='+version,fileSize:bytes.length}}))}};
  if(query.startsWith('query GallerySyncImageOwners'))return {data:{shop:{myshopifyDomain:shopDomain},products:{nodes:[{id:f.mapping.shopifyProductId,media:{nodes:[{id:imageId}],pageInfo:{hasNextPage:false,endCursor:null}}}],pageInfo:{hasNextPage:false,endCursor:null}}}};
  if(query.startsWith('mutation GallerySyncImageUpdate')){
   assert.equal(v.files.length,1);assert.deepEqual(Object.keys(v.files[0]).sort(),['id','originalSource']);assert.equal(v.files[0].id,imageId);
   bytes=staging.read(new URL(v.files[0].originalSource).pathname);version++;return {data:{fileUpdate:{files:[{id:imageId}],userErrors:[]}}};
  }
  if(query.startsWith('mutation GallerySyncRelease')){assert.deepEqual(bytes,newPng,'image proof precedes release metadata');assert.equal(v.metafields[0].compareDigest,null);release={value:v.metafields[0].value,compareDigest:'isolated-next-digest'};return {data:{metafieldsSet:{metafields:[release],userErrors:[]}}};}
  throw Error('Unexpected isolated GraphQL request');
 };
 const mediaAdapter=createGallerySyncShopifyMedia({shopDomain,graphql,staging,writesEnabled:true,dedicatedProductFiles:true,wait:async()=>{},fetchImpl:async url=>{assert.match(url,/^https:\/\/cdn\.shopify\.com\/original\.png/);return new Response(bytes,{headers:{'Content-Type':'image/png','Content-Length':String(bytes.length)}});}});
 connection=createGalleryShopConnection({sourceWorkshop:f.sourceWorkshop,targetWorkshop:f.targetWorkshop,shopDomain,journalFilename:path.join(directory,'connection.sqlite'),targets:[f.mapping],graphql,imagePreparation:staging,mediaAdapter,sourceApproval:()=>({approved:true}),executionEnabled:true,writesEnabled:true});
 const p=await connection.plan({targetIds:[f.mapping.id]});assert.equal(p.ready,true,JSON.stringify(p.entries[0].issues));assert.equal(calls.filter(c=>c.query.startsWith('mutation')).length,0);
 const executed=await connection.execute({planId:p.planId,planSha256:p.planSha256});assert.equal(executed.operations[0].state,'completed',JSON.stringify(executed.operations[0].error));assert.equal(f.activation.capture(f.mapping).boundRevision,2);assert.equal(f.activation.capture(f.mapping).approved,true);
 const writes=calls.filter(c=>c.query.startsWith('mutation'));assert.equal(writes.length,2);assert.match(writes[0].query,/GallerySyncImageUpdate/);assert.match(writes[1].query,/GallerySyncRelease/);assert.deepEqual(bytes,newPng);
 await connection.execute({planId:p.planId,planSha256:p.planSha256});assert.equal(calls.filter(c=>c.query.startsWith('mutation')).length,2);
});
