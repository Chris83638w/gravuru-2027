import test from 'node:test';
import assert from 'node:assert/strict';
import {createProductRepository} from './repository.mjs';

test('3000 products are filtered, counted and paginated without sending their private document payloads',()=>{
 const repository=createProductRepository({filename:':memory:',catalogOverview:d=>({material:d.material,method:d.method,designCount:1})});
 try{
  const ids=[];for(let i=0;i<3000;i++)ids.push(repository.create({name:'Schild '+String(i).padStart(4,'0'),kind:i%10===0?'master':'product',masterId:null,categoryIds:[i%2?'tiere':'familie'],material:i%2?'steel':'slate',method:'engraving',privatePayload:'not-for-listing'}).id);
  const first=repository.catalog({material:'steel',category:'tiere',sort:'name',pageSize:24});assert.equal(first.total,1500);assert.equal(first.products.length,24);assert.equal(first.pages,63);assert.equal(first.products[0].name,'Schild 0001');assert.ok(!JSON.stringify(first).includes('privatePayload'));
  const next=repository.catalog({material:'steel',category:'tiere',sort:'name',page:2,pageSize:24});assert.equal(next.products[0].name,'Schild 0049');assert.ok(!first.products.some(p=>next.products.some(n=>n.id===p.id)));
  assert.equal(repository.catalog({query:'Schild 2999'}).total,1);assert.equal(repository.catalog({query:"%' OR 1=1"}).total,0);
  const current=repository.get(ids[1]);repository.save(current.id,{...current.document,name:'Änderung',categoryIds:['neu']},1);
  assert.equal(repository.catalog({query:'änderung',category:'neu'}).total,1);
  assert.throws(()=>repository.save(current.id,{...current.document,name:'Veraltet'},1),e=>e.status===409);
  assert.equal(repository.catalog({query:'veraltet'}).total,0);
  repository.setArchived(current.id,{expectedRevision:2,archived:true});assert.equal(repository.catalog({category:'neu'}).total,0);assert.equal(repository.catalog({filter:'archived',category:'neu'}).total,1);
  assert.equal(repository.catalog({page:9999}).page,repository.catalog({page:9999}).pages);
 }finally{repository.close();}
});
