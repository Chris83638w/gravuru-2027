import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {makeProductDocument,validateProductDesign,resolveProduct} from './product-model.mjs';
import {planMotifRightsRevision} from './motif-rights-revision.mjs';
import {syntheticSlate} from '../../scripts/fixtures/slate-config.mjs';

function fixture(){
 const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
 const document=makeProductDocument(syntheticSlate(makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64))));
 const d=document.config.profile.designs[0],motif={id:'old-motif',type:'motif',motif:resources.motifs[0].key,x:190,y:35,w:15,h:15,rotation:0,color:'#ffffff',templateOrigin:true,customerEditable:false,locked:true};
 d.objects.push(motif);document.elementRights[d.id][motif.id]={content:false,color:false,replace:false,move:false,scale:false,delete:false};
 return {id:'cfg_00000000-0000-4000-8000-000000000001',revision:7,document};
}
test('offline revision changes motif rights only, leaves source and all option prices unchanged',()=>{
 const record=fixture(),before=structuredClone(record),id=record.document.config.profile.defaultDesignId,plan=planMotifRightsRevision(record,{designId:id});
 assert.equal(plan.expectedRevision,7);assert.equal(plan.proposedRevision,8);assert.equal(plan.changes.length,1);assert.deepEqual(record,before);
 const d=plan.document.config.profile.designs[0],o=d.objects.find(o=>o.id==='old-motif');
 assert.equal(o.customerEditable,true);assert.equal(o.locked,undefined);
 assert.deepEqual(plan.document.elementRights[id][o.id],{content:false,color:false,replace:true,move:false,scale:false,delete:true});
 for(const v of record.document.config.profile.optionGroups[0].values){const options={mounting:v.id};assert.deepEqual(resolveProduct(plan.document,{options}).price,resolveProduct(record.document,{options}).price);}
 const deleted=structuredClone(d);deleted.objects=deleted.objects.filter(x=>x.id!==o.id);
 assert.doesNotThrow(()=>validateProductDesign(plan.document,deleted,{draft:true}));
 assert.throws(()=>validateProductDesign(record.document,deleted,{draft:true}));
 for(const key of ['x','y','w','h','rotation']){const bad=structuredClone(d);bad.objects.find(x=>x.id===o.id)[key]+=1;assert.throws(()=>validateProductDesign(plan.document,bad,{draft:true}));}
 const expected=structuredClone(record.document);expected.config.profile.designs[0].objects.find(x=>x.id===o.id).customerEditable=true;delete expected.config.profile.designs[0].objects.find(x=>x.id===o.id).locked;expected.elementRights[id][o.id]={...expected.elementRights[id][o.id],replace:true,delete:true};
 assert.deepEqual(plan.document,expected);
 assert.throws(()=>planMotifRightsRevision({...record,document:plan.document},{designId:id}),/kein neuer Produktstand/);
 assert.throws(()=>planMotifRightsRevision(record,{designId:'foreign'}),/gehört nicht/);
});
