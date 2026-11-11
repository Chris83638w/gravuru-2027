import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeAcrylicConfig,ACRYLIC_BASES} from '../configurator/variant-m/acrylic-product.mjs';
import {combineScalableSizes} from '../configurator/variant-m/scalable-sizes.mjs';
import {measureText} from '../platform/sources/app/shared/models/text-paths.mjs';
import {makeProductDocument,validateProductDocument} from './product-model.mjs';
import {createProductRepository} from './repository.mjs';
import {createBatchJobs} from './batch-jobs.mjs';
import {planBatch,commitBatch} from './batch.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
const sizes=[['10x14',100,140,1399],['15x20',150,200,1799],['20x27',200,270,2599],['40x54',400,540,4499]];
const option=(id,priceCents)=>({id,label:id,priceCents,currency:'EUR'});
function document(){
 const entries=sizes.map(([id,width,height,basePriceCents])=>{
  const c=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
  delete c.acrylic;c.basePriceCents=basePriceCents;
  const p=c.profile,scale=Math.min(width/150,height/200),offset=[(width-150*scale)/2,(height-200*scale)/2];
  p.geometry={width,height,shape:'rect',cornerRadiusMm:2,safeMarginMm:0,holes:[]};
  p.designs[0].objects=p.designs[0].objects.filter(o=>['photo-main','heading','heart'].includes(o.id));
  for(const o of p.designs[0].objects){
   if(o.type==='text')o.text='Unser Anfang';
   o.x=o.x*scale+offset[0];o.y=o.y*scale+offset[1];
   for(const key of ['w','h','size','lineHeight','letterSpacing','strokeWidth'])if(Number.isFinite(o[key]))o[key]*=scale;
   if(o.type==='text')measureText(o,resources.fonts);
  }
  p.designs[0].katalog={scale,offsetMm:offset};
  const small={groupId:'size',valueIds:sizes.slice(0,3).map(s=>s[0])};
  p.optionGroups=[
   {id:'base',name:'Sockel',required:true,defaultValueId:'none',visibleIf:small,values:ACRYLIC_BASES.map(b=>option(b.id,b.priceCents+(id==='20x27'&&b.id!=='none'?100:0)))},
   {id:'wall-small',name:'Wandhalterung',required:true,defaultValueId:'none',visibleIf:small,values:[option('none',0),option('wall',599)]},
   {id:'wall-large',name:'Wandhalterung',required:true,defaultValueId:'wall',visibleIf:{groupId:'size',valueIds:['40x54']},values:[option('wall',599)]}
  ];
  return {id,label:id,config:c};
 });
 const config=combineScalableSizes(entries,'15x20');
 config.moduleProfile={schema:'gravuru-configurator-modules/v1',id:'test-four-size-acrylic',revision:1,modules:{options:true,designs:false,text:true,motifs:true,photo:true,logo:false,colors:false}};
 return makeProductDocument(config,{kind:'master',name:'Viergrößen-Master'});
}
function fixture(t){
 const repository=createProductRepository({filename:':memory:',validateDocument:validateProductDocument});
 const jobs=createBatchJobs({filename:':memory:',repository});
 t.after(()=>{jobs.close();repository.close();});
 const master=repository.create(document());
 return {repository,jobs,master,input:{rows:[{import_key:'four-size-acrylic-r1',name:'Fotogeschenk'}],masterId:master.id,masterRevision:master.revision}};
}

test('saved batch job preserves four acrylic sizes, 43 native prices and module policy on commit and replay',t=>{
 const f=fixture(t),before=structuredClone(f.master.document.config);
 const job=f.jobs.create({name:'Viergrößenprüfung',input:f.input}),review=f.jobs.review(job.id);
 assert.equal(review.plan.valid,true,JSON.stringify(review.plan.report));assert.ok(review.plan.token);
 const variants=review.plan.report[0].prices.variants;
 assert.equal(variants.length,43);assert.deepEqual(Object.fromEntries(sizes.map(([id])=>[id,variants.filter(v=>v.options.size===id).length])),{'10x14':14,'15x20':14,'20x27':14,'40x54':1});
 assert.deepEqual(variants.find(v=>v.options.size==='40x54').options,{size:'40x54','wall-large':'wall'});
 assert.equal(variants.find(v=>v.options.size==='40x54').priceCents,5098);
 assert.deepEqual(f.repository.get(f.master.id).document.config,before);
 const created=commitBatch(f.repository,{...review.input,token:review.plan.token});assert.equal(created.products.length,1);
 const record=f.repository.get(created.products[0].id);
 assert.equal(record.status,'draft');assert.equal(record.revision,1);assert.equal(record.publishedRevision,null);
 assert.deepEqual(record.document.config,before);assert.deepEqual(prepareShopProduct(record).variants,variants);
 const repeated=f.jobs.review(job.id);assert.equal(repeated.plan.report[0].status,'existing');
 assert.deepEqual(commitBatch(f.repository,{...repeated.input,token:repeated.plan.token}).products,[{key:'four-size-acrylic-r1',id:record.id,created:false}]);
 assert.equal(f.repository.list().length,2);
});

test('legacy price columns cannot silently alter a scalable acrylic source or enter an executable batch',t=>{
 const f=fixture(t);
 for(const column of ['price_eur','price_small_eur','price_large_eur']){
  const input={...f.input,rows:[{...f.input.rows[0],[column]:'12,99'}]},plan=planBatch(f.repository,input);
  assert.equal(plan.valid,false);assert.match(plan.report[0].message,/gespeicherten Größenquelle/);
  assert.equal(plan.entries.length,0);assert.equal(plan.token,null);
  assert.throws(()=>commitBatch(f.repository,{...input,token:'not-a-plan',skipErrors:true}),/Fehler/);
 }
 assert.equal(f.repository.list().length,1);
});

test('a nondefault variant review failure never leaks its row into an explicit partial import',t=>{
 const f=fixture(t),bad=structuredClone(f.master.document);
 // Each default is valid, but this source offers a combination with two
 // simultaneous hole selectors. The shared full variant review must reject it.
 for(const size of bad.config.scalableSizes.sizes){
  size.profile.optionGroups.find(g=>g.id==='base').values.find(v=>v.id==='eiche').holes=[];
  size.profile.optionGroups.find(g=>g.id==='wall-small').values.find(v=>v.id==='wall').holes=[];
 }
 const badMaster=f.repository.create(bad),input={...f.input,rows:[f.input.rows[0],{import_key:'bad-variant',name:'Fehlerhafte Auswahl',master_id:badMaster.id,master_revision:badMaster.revision}]};
 const plan=planBatch(f.repository,input);
 assert.equal(plan.valid,false);assert.deepEqual(plan.report.map(r=>r.status),['ready','error']);
 assert.match(plan.report[1].message,/Mehrere Optionen bestimmen gleichzeitig/);
 assert.deepEqual(plan.entries.map(e=>e.key),['four-size-acrylic-r1']);
 const result=commitBatch(f.repository,{...input,token:plan.token,skipErrors:true});
 assert.equal(result.products.length,1);assert.equal(result.errors.length,1);assert.equal(f.repository.importItem('bad-variant'),null);
});
