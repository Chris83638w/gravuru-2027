import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadExistingProductionShopifyReader} from './gallery-production-private-settings.mjs';
import {configureGalleryManagement} from '../../ops/plesk/module-management-production-config.mjs';

test('existing secret-file provider remains lazy and uses only the confirmed app identity',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-existing-reader-'));
 try{
  const filename=path.join(directory,'app.json'),secretFilename=path.join(directory,'secret');
  fs.writeFileSync(secretFilename,'synthetic-secret-only-for-test');
  fs.writeFileSync(filename,JSON.stringify({values:{GRAVURU_SHOPIFY_DRAFT_TRANSFER:'draft-only',GRAVURU_SHOPIFY_CLIENT_SECRET_FILE:secretFilename}}));
  let requests=0;
  const reader=loadExistingProductionShopifyReader(filename,{expectedSecretFilename:secretFilename,fetchImpl:async(url,request)=>{
   requests++;assert.equal(url,'https://gravuru-design.myshopify.com/admin/oauth/access_token');assert.equal(request.redirect,'manual');assert.ok(request.signal);assert.equal(request.body.get('client_id'),'9640dd7a6907f0c73e7013ea8c24869b');
   return new Response(JSON.stringify({access_token:'synthetic-test-token',expires_in:1200,scope:'write_products'}),{headers:{'content-type':'application/json'}});
  }});
  assert.equal(requests,0);assert.equal(reader.clientSecret,undefined);assert.equal(await reader.getAccessToken(),'synthetic-test-token');assert.equal(await reader.getAccessToken(),'synthetic-test-token');assert.equal(requests,1);
  assert.throws(()=>loadExistingProductionShopifyReader(filename,{expectedSecretFilename:path.join(directory,'other')}),{code:'module_private_app_config'});
  fs.writeFileSync(filename,JSON.stringify({values:{GRAVURU_SHOPIFY_DRAFT_TRANSFER:'draft-only',GRAVURU_SHOPIFY_CLIENT_SECRET_FILE:secretFilename,GRAVURU_SHOPIFY_SHOP_DOMAIN:'other.myshopify.com'}}));
  assert.throws(()=>loadExistingProductionShopifyReader(filename),{code:'module_private_app_config'});
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('production host factory rejects a staged or foreign source before opening any connection',async()=>{
 await assert.rejects(configureGalleryManagement({workshop:{tenantId:'gravuru'},dataDirectory:'/staged/data',galleryDirectory:'/staged/gallery'}),{code:'module_connection_host_identity'});
});
