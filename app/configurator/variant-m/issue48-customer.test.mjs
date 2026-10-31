import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {preserveProductSelection} from './product-design-transfer.mjs';
import {quote} from './contract.mjs';
import {summaryRows} from './mobile-steps.mjs';
import {customerFieldLabel} from './text-fields.mjs';
import {customerTextSummary} from './text-summary.mjs';
import {motifChoiceTarget,replacedMotif} from './motif-choice.mjs';
import {rotationAllowed} from './rotation-policy.mjs';
import {layoutReviewIssues} from './layout-review.mjs';
import {freePlacement} from './workflow-model.mjs';
import {prepareCartImages} from './cart-preparation.mjs';

test('design switch keeps every fastening, quantity and price through review and cart quote',()=>{
 const profile=JSON.parse(fs.readFileSync(new URL('./fixtures/native-profile.json',import.meta.url))),config={profile,basePriceCents:1999,extraMotifCents:169},design=profile.designs[0];
 for(const group of profile.optionGroups)for(const value of group.values){
  const original={options:{[group.id]:value.id},quantity:3},restored=preserveProductSelection(original,config),before=quote(config,design.objects,design.id,original.options,3),after=quote(config,design.objects,design.id,restored.options,restored.quantity);
  assert.deepEqual(after,before);assert.equal(restored.options[group.id],value.id);
  const rows=summaryRows({profile,state:{designId:design.id,objects:design.objects,mOptions:restored.options},quantity:restored.quantity,totalText:String(after.totalCents)});
  assert.equal(rows.find(r=>r[0]==='Menge')[1],'3');assert(rows.some(r=>r[1].includes(value.label)));
 }
});
test('unsupported options never silently turn into target defaults',()=>{
 const config={profile:{optionGroups:[{id:'mount',defaultValueId:'none',values:[{id:'none',priceCents:0}]}]}};
 assert.throws(()=>preserveProductSelection({quantity:2,options:{mount:'screws'}},config));
 assert.throws(()=>preserveProductSelection({quantity:0,options:{}},config));
 assert.throws(()=>preserveProductSelection({quantity:2,options:{unknown:'value'}},config));
});
test('added text label stays stable for every keystroke and original labels survive customer edits',()=>{
 const o={id:'added',type:'text',text:''},design={objects:[{id:'template',type:'text',text:'Kerstin & Ralf'}]};
 for(const c of 'Familie Müller'){o.text+=c;assert.equal(customerFieldLabel(o,5,design),'Text 6');}
 assert.equal(customerFieldLabel({id:'template',text:'Anna und Ben'},0,design),'Vornamen');
});
test('cart texts use immutable labels in top-to-bottom reading order and retain full input',()=>{
 const design={objects:[{id:'name',fieldKey:'name',text:'Meyer'},{id:'heading',fieldKey:'heading',text:'Heimathafen'}]};
 const entries=customerTextSummary([{id:'name',type:'text',text:'Müller & Sohn',x:40,y:30},{id:'heading',type:'text',text:'Willkommen',x:40,y:10},{id:'hidden',type:'text',text:'Secret',uxHidden:true}],design);
 assert.deepEqual(entries.map(e=>[e.label,e.text]),[['Überschrift','Willkommen'],['Name','Müller & Sohn']]);
});
test('motif selection replaces the selected motif or the master and preserves shape ratio',()=>{
 const original={id:'master',type:'motif',motif:'old',x:20,y:30,w:20,h:40},added={...original,id:'added'};
 assert.equal(motifChoiceTarget([original,added],'text',[original]),original);
 assert.equal(motifChoiceTarget([original,added],'added',[original]),added);
 const changed=replacedMotif(original,'new',[0,0,100,100]);assert.deepEqual(changed,{...original,motif:'new',w:20,h:20});assert.equal(original.motif,'old');
 assert.equal(motifChoiceTarget([{...original,uxHidden:true}]),null);assert.throws(()=>replacedMotif(original,'new',null));
});
const motif={id:'m',type:'motif',x:20,y:20,w:8,h:8,rotation:0},text={id:'t',type:'text',text:'Test',x:20,y:20,w:10,h:5,size:5,rotation:0};
const p={geometry:{width:100,height:60,shape:'rect',safeMarginMm:2,holes:[{x:20,y:20,diameter:4}]},material:{kind:'steel'},processing:{profileId:'steel-engraving'}};
const review=(objects,profile=p)=>layoutReviewIssues({config:{profile},objects,resources:{motifs:[]}});
test('engraving checks overlap, printing permits it; both reject the outer boundary',()=>{
 assert.equal(review([motif,text]).length,1);assert.equal(review([motif,text])[0].code,'overlap');
 const print={...p,material:{kind:'acrylic'},processing:{profileId:'color-print'}};
 assert.deepEqual(review([motif,text],print),[]);assert.equal(review([{...text,x:-2}],print)[0].code,'boundary');
 assert.deepEqual(review([motif,{...text,surfaceId:'back'}]),[]);
});
test('every shape permits artwork through holes without changing drilling geometry',()=>{
 for(const shape of ['rect','ellipse','contour']){
  const profile={...p,geometry:{...p.geometry,shape,outlinePath:'M0 0H100V60H0Z'}},copy=structuredClone(profile);
  assert.deepEqual(review([motif],profile),[]);assert.deepEqual(profile,copy);
 }
});
test('auto-placement uses exact contour and does not move other elements',()=>{
 const before=structuredClone(motif),surface={x:2,y:2,width:96,height:56,shape:'rect',accepts:o=>o.x-o.w/2>=10};
 const placed=freePlacement(text,surface,[motif,text],[],{minScale:.6});assert(placed);assert(placed.x-text.w*placed.scale/2>=10);assert.deepEqual(motif,before);
 assert.equal(freePlacement(text,{...surface,accepts:()=>false},[motif,text]),null);
});
test('rotation is immediately available but still follows persisted movement rights',()=>{
 const config={profile:{designs:[{id:'d',objects:[text]}]}};
 assert.equal(rotationAllowed(config,'d',text),true);assert.equal(rotationAllowed(config,'d',{id:'new'}),true);
 for(const flag of ['locked','technicalLocked','acrylicFixed','uxLocked'])assert.equal(rotationAllowed(config,'d',{...text,[flag]:true}),false);
 assert.equal(rotationAllowed({...config,workshopElementRights:{d:{t:{move:false}}}},'d',text),false);
 assert.equal(rotationAllowed({...config,workshopElementRights:{d:{t:{move:true}}}},'d',text),true);
 assert.equal(rotationAllowed(config,'d',null),false);
 assert.equal(rotationAllowed({...config,workbench:{embedded:true}},'d',text),true);
});
test('cart image preparation runs independent tasks concurrently and propagates any failure',async()=>{
 let finish,started=[];const gate=new Promise(r=>finish=r);
 const job=prepareCartImages({artwork:async()=>{started.push('art');await gate;return 'svg';},media:async()=>{started.push('media');await gate;return ['photo'];},customer:async()=>{started.push('customer');await gate;return 'png';},reference:async a=>a+'-reference'});
 assert.deepEqual(started,['art','media','customer']);finish();
 assert.deepEqual(await job,{art:'svg',media:['photo'],preview:'svg-reference',customerPreview:'png'});
 await assert.rejects(prepareCartImages({artwork:async()=>{throw Error('Missing font');},media:async()=>[],customer:async()=>'',reference:async()=>''}),/Missing font/);
});
