import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadCatalogChoices} from './ui/catalog-ui.mjs';

function catalogue(counts){
 const calls=[];
 const api=async path=>{
  calls.push(path);const url=new URL(path,'http://test.invalid'),kind=url.searchParams.get('kind'),page=Number(url.searchParams.get('page')),total=counts[kind]||0;
  assert.equal(url.pathname,'/api/workshop/products');assert.equal(url.searchParams.get('catalog'),'1');assert.equal(url.searchParams.get('pageSize'),'100');assert.equal(url.searchParams.get('filter'),'all');
  return {page,pageSize:100,total,pages:Math.max(1,Math.ceil(total/100)),products:Array.from({length:Math.min(100,Math.max(0,total-(page-1)*100))},(_,i)=>({id:kind+'-'+((page-1)*100+i),kind,status:'draft',revision:7,name:'Gespeicherter Name',overview:{formProduct:kind==='product'}}))};
 };
 return {api,calls};
}

test('selection lists read all compact catalogue pages and retain names, revisions and form metadata',async()=>{
 const {api,calls}=catalogue({product:241,master:103}),products=await loadCatalogChoices(api);
 assert.equal(calls.length,5);assert.equal(products.length,344);assert.equal(new Set(products.map(p=>p.id)).size,344);
 assert.equal(products.find(p=>p.id==='product-240').revision,7);assert.equal(products.find(p=>p.id==='product-240').overview.formProduct,true);assert.equal(products.at(-1).id,'master-102');
});

test('master-only and empty product selectors never read unrelated product documents',async()=>{
 const h=catalogue({product:9000,master:1});assert.equal((await loadCatalogChoices(h.api,{kinds:['master']})).length,1);assert.equal(h.calls.length,1);
 const empty=catalogue({});assert.deepEqual(await loadCatalogChoices(empty.api,{kinds:['product']}),[]);assert.equal(empty.calls.length,1);
});

test('changing or truncated pages fail without returning a silently incomplete selection',async()=>{
 for(const mutation of ['count','duplicate','truncated','document']){
  const h=catalogue({product:101});
  await assert.rejects(()=>loadCatalogChoices(async path=>{const data=await h.api(path);if(data.page===2){if(mutation==='count')data.total++;if(mutation==='duplicate')data.products[0].id='product-0';if(mutation==='truncated')data.products=[];if(mutation==='document')data.products[0].document={embedded:'forbidden'};}return data;},{kinds:['product']}),/Produktauswahl/);
 }
});

test('request errors propagate without fallback to the full legacy endpoint',async()=>{
 let requests=0;await assert.rejects(()=>loadCatalogChoices(async()=>{requests++;throw Error('Lesen fehlgeschlagen');}),/Lesen fehlgeschlagen/);assert.equal(requests,1);
});

test('the three former bare-list UI callers use the compact reader and still fetch chosen documents explicitly',()=>{
 for(const file of ['app.mjs','batch-ui.mjs','form-variants-ui.mjs']){
  const code=fs.readFileSync(new URL('./ui/'+file,import.meta.url),'utf8');assert.match(code,/loadCatalogChoices/);assert.doesNotMatch(code,/api\('\/api\/workshop\/products'\)/);
 }
 assert.match(fs.readFileSync(new URL('./ui/app.mjs',import.meta.url),'utf8'),/api\('\/api\/workshop\/products\/\'\+encodeURIComponent\(id\)\)/);
});
