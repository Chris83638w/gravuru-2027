import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustomerDesignImages} from './customer-design-image.mjs';
import {zipFiles} from '../configurator/variant-m/print-export-model.mjs';
import {digest} from './review-package.mjs';
import {NATIVE_REVIEW} from './native-review-schema.mjs';
const origin='https://app.example',shopDomain='test.myshopify.com',secret='synthetic-secret-image-only',id='offer_12345678-1234-1234-1234-123456789012';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM9sAAAAASUVORK5CYII=','base64');
async function setup(){
 let reads=0;
 const archive=Buffer.from(await (await zipFiles([{name:'gestaltung-kundenansicht.png',blob:new Blob([png])},{name:'manifest.json',blob:new Blob([JSON.stringify({schema:NATIVE_REVIEW,files:[{path:'gestaltung-kundenansicht.png',bytes:png.length,sha256:digest(png)}]})])}])).arrayBuffer());
 const workshop={orderIntake:{imageSnapshot(offer,shop){assert.equal(offer,id);assert.equal(shop,shopDomain);reads++;return {snapshotId:'synthetic',packageSha256:digest(archive)};}},customerDrafts:{downloadSnapshot(){return archive;}}};
 const stores=[{storeId:'acryl',workshop},{storeId:'legacy',workshop:{orderIntake:{}}}];
 return {api:createCustomerDesignImages({origin,shopDomain,secret,stores}),stores,archive,reads:()=>reads};
}
test('image capability is stable and isolated by shop, store, and secret before accessing private data',async()=>{
 const s=await setup(),url=s.api.url('acryl',id),path=new URL(url).pathname;
 assert.equal(createCustomerDesignImages({origin,shopDomain,secret,stores:s.stores}).url('acryl',id),url);
 for(const pathname of [path.replace('/acryl/','/legacy/'),path.replace('12345678','22345678'),path.replace(/.$/,'x'),path+'/package',new URL(createCustomerDesignImages({origin,shopDomain:'other.myshopify.com',secret,stores:s.stores}).url('acryl',id)).pathname,new URL(createCustomerDesignImages({origin,shopDomain,secret:secret+'changed',stores:s.stores}).url('acryl',id)).pathname])assert.throws(()=>s.api.read(pathname),{status:404});
 assert.equal(s.reads(),0);assert.deepEqual(s.api.read(path),png);assert.equal(s.reads(),1);
 assert.throws(()=>s.api.url('unknown',id),{status:404});
 assert.throws(()=>s.api.read(new URL(s.api.url('legacy',id)).pathname),{status:404});
});
test('an image cannot escape verification of the immutable archive',async()=>{
 const s=await setup(),path=new URL(s.api.url('acryl',id)).pathname;
 const changed=Buffer.from(s.archive);changed[40]^=1;s.stores[0].workshop.customerDrafts.downloadSnapshot=()=>changed;
 assert.throws(()=>s.api.read(path),{status:422});
});
