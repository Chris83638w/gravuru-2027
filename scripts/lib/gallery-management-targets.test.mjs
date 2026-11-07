import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {galleryProductGroupSources} from './gallery-management-targets.mjs';

const sourceKey=(productKey,productId)=>'source-'+createHash('sha256').update(JSON.stringify([productKey,productId])).digest('hex').slice(0,24);
const document=designs=>({config:{profile:{designs}}});
const design=(id,familyId)=>({id,katalog:{target:{familyId}}});

test('348 products / 2449 interleaved design targets require exactly one native read per unique product',()=>{
 const products=348,targets=[],records=new Map(),reads=new Map();
 for(let p=0;p<products;p++)records.set('cfg-'+p,{document:document(Array.from({length:p<13?8:7},(_,d)=>design('design-'+d,'family-'+p)))});
 for(let d=0;d<8;d++)for(let p=0;p<(d===7?13:products);p++)targets.push({productId:'cfg-'+p,productKey:'product-'+p,sizeKey:'format-'+p,designId:'design-'+d});
 assert.equal(targets.length,2449);
 const workshop={repository:{get(id){reads.set(id,(reads.get(id)||0)+1);return records.get(id);}}},actual=galleryProductGroupSources(workshop,targets);
 assert.deepEqual(actual,Array.from({length:products},(_,p)=>({key:sourceKey('product-'+p,'cfg-'+p),productId:'cfg-'+p,familyId:'family-'+p,sizeKey:'format-'+p})));
 assert.equal(reads.size,products);assert.equal([...reads.values()].reduce((n,v)=>n+v,0),products);assert.ok([...reads.values()].every(n=>n===1));
});

test('each invocation rereads authoritative families and preserves ambiguous target rejection',()=>{
 let record={document:document([design('one','family-a'),design('two','family-a')])},reads=0;
 const workshop={repository:{get(){reads++;return record;}}},target={productId:'cfg-1',productKey:'product-1',sizeKey:'size-1',designId:'one'},targets=[target,{...target,designId:'two'}];
 assert.equal(galleryProductGroupSources(workshop,targets)[0].familyId,'family-a');assert.equal(reads,1);
 record={document:document([design('one','family-b'),design('two','family-b')])};assert.equal(galleryProductGroupSources(workshop,targets)[0].familyId,'family-b');assert.equal(reads,2);
 record.document.config.profile.designs[1].katalog.target.familyId='other-family';assert.throws(()=>galleryProductGroupSources(workshop,targets),/Ambiguous product group source/);
 for(const changed of [{productKey:'different-product-key'},{sizeKey:'different-size'}])assert.throws(()=>galleryProductGroupSources(workshop,[target,{...target,...changed}]),/Ambiguous product group source/);
});

test('incomplete targets stay skipped and missing explicit design/family remains unresolved',()=>{
 let reads=0;const workshop={repository:{get(){reads++;return {document:document([design('known','family-a'),design('duplicate','first'),design('duplicate','second')])};}}};
 const base={productId:'cfg-1',productKey:'product-1',sizeKey:'size-1'};
 assert.deepEqual(galleryProductGroupSources(workshop,[{}, {...base,sizeKey:null}, {...base,productId:null}, {...base,productKey:null}]),[]);assert.equal(reads,0);
 assert.equal(galleryProductGroupSources(workshop,[{...base,designId:'missing'}])[0].familyId,null);
 assert.equal(galleryProductGroupSources(workshop,[{...base,designId:'duplicate'}])[0].familyId,'first','same first-match semantics as the former native .find');
});
