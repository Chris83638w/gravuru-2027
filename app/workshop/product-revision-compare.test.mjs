import test from 'node:test';
import assert from 'node:assert/strict';
import {createProductRepository} from './repository.mjs';
import {compareProductRevisions} from './product-revision-compare.mjs';

function setup(t,options={}){const repository=createProductRepository({filename:':memory:',...options});t.after(()=>repository.close());return repository;}
const document=()=>({name:'Acrylglasbild',kind:'master',masterId:null,basePriceCents:2500,designs:[{id:'design-1',fields:[{id:'text-1',text:'Pia & Rafael'},{id:'photo-1',locked:false}]}]});

test('revision comparison shows exact text, price and rights changes without mutating stored or unsaved data',t=>{
  const repo=setup(t),one=repo.create(document()),next=structuredClone(one.document);
  next.basePriceCents=2900;next.designs[0].fields[0].text='Mia & Leon';next.designs[0].fields[1].locked=true;
  const two=repo.save(one.id,next,one.revision),draft=structuredClone(two.document);draft.name='Nicht gespeichert';
  const before=repo.history(one.id),result=compareProductRevisions(repo,one.id,1,2);
  assert.equal(result.total,3);assert.equal(result.truncated,false);
  const price=result.changes.find(c=>c.path.at(-1)==='basePriceCents');assert.equal(price.before.text,'2500');assert.equal(price.after.text,'2900');assert.match(price.label,/Cent/);
  const text=result.changes.find(c=>c.path.at(-1)==='text');assert.equal(text.before.text,'Pia & Rafael');assert.equal(text.after.text,'Mia & Leon');
  assert.equal(result.changes.find(c=>c.path.at(-1)==='locked').after.text,'Ja');
  assert.deepEqual(repo.history(one.id),before);assert.equal(draft.name,'Nicht gespeichert');
  assert.equal(compareProductRevisions(repo,one.id,2,2).total,0);
});

test('stable field IDs distinguish addition, removal and stacking order instead of treating shifted indexes as edits',t=>{
  const repo=setup(t),source=document();source.designs[0].fields.push({id:'motif-1',color:'#aabbcc'});
  const one=repo.create(source),next=structuredClone(source);next.designs[0].fields=[source.designs[0].fields[2],{id:'text-2',text:'Neu'},source.designs[0].fields[0]];repo.save(one.id,next,1);
  const result=compareProductRevisions(repo,one.id,1,2);assert.equal(result.total,3);
  assert.ok(result.changes.some(c=>c.path.at(-1)==='order'));
  assert.ok(result.changes.some(c=>c.kind==='removed'&&c.path.at(-1)==='[photo-1]'));
  assert.ok(result.changes.some(c=>c.kind==='added'&&c.path.at(-1)==='[text-2]'));
});

test('captured profile changes are compared even if documents are identical; later metadata never replaces old snapshots',t=>{
  let profileRevision=1;const repo=setup(t,{snapshotMetadata:()=>({profiles:{fonts:{revision:profileRevision}}})});
  const one=repo.create(document());profileRevision=2;repo.save(one.id,one.document,1);profileRevision=9;
  const result=compareProductRevisions(repo,one.id,1,2);assert.equal(result.total,1);assert.equal(result.changes[0].path[0],'metadata');assert.equal(result.changes[0].before.text,'1');assert.equal(result.changes[0].after.text,'2');
});

test('large content stays bounded and differences beyond the display limit are explicitly counted',t=>{
  const repo=setup(t),source=document();source.large='data:image/png;base64,'+'a'.repeat(5000);source.extra=Object.fromEntries(Array.from({length:220},(_,i)=>['x'+i,i]));
  const one=repo.create(source),next=structuredClone(source);next.large=next.large.replace(/a$/,'b');for(const key of Object.keys(next.extra))next.extra[key]++;
  repo.save(one.id,next,1);const result=compareProductRevisions(repo,one.id,1,2);
  assert.equal(result.total,221);assert.equal(result.changes.length,200);assert.equal(result.truncated,true);assert.ok(!JSON.stringify(result).includes('aaaaaa'));
  const three=structuredClone(next);three.large+='c';repo.save(one.id,three,2);
  const value=compareProductRevisions(repo,one.id,2,3).changes[0];assert.match(value.before.sha256,/^[a-f0-9]{64}$/);assert.notEqual(value.before.sha256,value.after.sha256);
});

test('missing, invalid or foreign product revisions cannot silently fall back to current',t=>{
  const repo=setup(t),one=repo.create(document());
  for(const invalid of [undefined,null,0,-1,1.5,Number.MAX_SAFE_INTEGER+1,'1'])assert.throws(()=>compareProductRevisions(repo,one.id,invalid,1),{code:'invalid_revision'});
  assert.throws(()=>compareProductRevisions(repo,one.id,1,999),{code:'revision_not_found'});
  assert.throws(()=>compareProductRevisions(repo,'cfg-missing',1,1),{code:'not_found'});
  assert.equal(repo.history(one.id).length,1);
});

test('small choice lists are readable while embedded media is never copied to the report',t=>{
  const repo=setup(t),source={...document(),choices:['white','black'],media:['data:image/svg+xml,<svg/>']};
  const first=repo.create(source),next=structuredClone(source);next.choices=['grey','black'];next.media=['data:image/svg+xml,<svg></svg>'];repo.save(first.id,next,1);
  const result=compareProductRevisions(repo,first.id,1,2),choices=result.changes.find(c=>c.path.at(-1)==='choices');
  assert.equal(choices.before.text,'["white","black"]');assert.equal(choices.after.text,'["grey","black"]');assert.ok(!JSON.stringify(result).includes('<svg'));
});

test('ambiguous IDs, primitive arrays, null, absent fields and historical status retain meaningful differences',t=>{
  const repo=setup(t),source={...document(),items:[{id:'same',value:1},{id:'same',value:2}],empty:null};
  const one=repo.create(source),next=structuredClone(source);next.items[1].value=3;delete next.empty;next.list=['one','two'];repo.save(one.id,next,1);
  const result=compareProductRevisions(repo,one.id,1,2);assert.equal(result.total,3);
  const items=result.changes.find(c=>c.path.at(-1)==='items');assert.notEqual(items.before.sha256,items.after.sha256);
  assert.equal(result.changes.find(c=>c.path.at(-1)==='empty').before.text,'Nicht festgelegt');
  repo.setArchived(one.id,{expectedRevision:2,archived:true});
  assert.ok(compareProductRevisions(repo,one.id,2,3).changes.some(c=>c.path[0]==='status'&&c.after.text==='archived'));
});
