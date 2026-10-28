import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makeAcrylicConfig} from './acrylic-product.mjs';
import {prepareConfig,saveDraft,readDraft} from './contract.mjs';
import {commercePrice} from './commerce-model.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {installToolbarPlacementUi} from './toolbar-placement-ui.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
const source=fs.readFileSync(new URL('./adapter.mjs',import.meta.url),'utf8').replaceAll('\r\n','\n');
const handler=source.split('\n').find(line=>line.includes('el.restoreDraft=function'));
function fixture(){
 const input=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
 for(const o of input.profile.designs[0].objects.filter(o=>o.type==='text')){measureText(o,resources.fonts);if(o.id==='names'){o.size*=118/o.w;measureText(o,resources.fonts);}}
 const config=prepareConfig(input),design=config.profile.designs[0];
 const state={designId:design.id,objects:structuredClone(design.objects)};
 Object.assign(state.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'synthetic-photo',uxUploadKind:'photo'});
 state.mOptions=Object.fromEntries(config.profile.optionGroups.map(g=>[g.id,g.defaultValueId]));
 const calls={record:0,sync:0},el={state,fontData:resources.fonts,record(){calls.record++;},sync(){calls.sync++;}};
 vm.runInContext(handler,vm.createContext({el,config,readDraft,clone:structuredClone,motifs:()=>resources.motifs,options:{},photos:new Map(),photoDesign:''}));
 const draft=placement=>saveDraft(config,{...state,ui:{textToolbarPlacement:placement}},state.mOptions,resources.fonts,resources.motifs);
 return {config,el,calls,draft};
}

test('explicit comparison wins after the real late restore without changing its input, design, options or price',()=>{
 for(const [search,expected,saved] of [['?leiste=a','selection','plate'],['?leiste=b','plate','selection']]){
  const {config,el,calls,draft}=fixture(),input=draft(saved),before=structuredClone(input),price=commercePrice(config,el.state);
  installToolbarPlacementUi(el,{config,embedded:true,search});
  const restored=el.restoreDraft(input);
  assert.deepEqual(input,before);assert.equal(restored.ui.textToolbarPlacement,saved);
  assert.deepEqual(el.state.ui,{textToolbarPlacement:expected});assert.deepEqual(el.state.objects,readDraft(config,before,resources.fonts,resources.motifs).design.objects);
  assert.deepEqual(el.state.mOptions,input.options);assert.deepEqual(commercePrice(config,el.state),price);
  assert.equal(calls.record,1);assert.equal(calls.sync,2);
 }
});

test('without a valid embedded comparison a late saved assignment wins; old drafts keep the current assignment',()=>{
 for(const args of [{},{embedded:false,search:'?leiste=a'},{embedded:true,search:'?leiste=invalid'},{embedded:true,search:'?leiste=a&leiste=b'}]){
  const {config,el,calls,draft}=fixture();installToolbarPlacementUi(el,{config,...args});
  el.restoreDraft(draft('selection'));assert.equal(el.state.ui.textToolbarPlacement,'selection');assert.equal(calls.sync,1);
  const old=draft('plate');delete old.ui;el.restoreDraft(old);assert.equal(el.state.ui.textToolbarPlacement,'selection');
 }
});

test('comparison cannot mask invalid draft metadata or a product mismatch at the real adapter boundary',()=>{
 const {config,el,calls,draft}=fixture();installToolbarPlacementUi(el,{config,embedded:true,search:'?leiste=a'});
 const before=structuredClone(el.state);
 for(const ui of [null,{},[],{textToolbarPlacement:'other'},{textToolbarPlacement:'plate',price:1}]){
  const bad={...draft('plate'),ui},unchanged=structuredClone(bad);
  assert.throws(()=>el.restoreDraft(bad),/Textleiste/);assert.deepEqual(bad,unchanged);assert.deepEqual(el.state,before);
 }
 assert.throws(()=>el.restoreDraft({...draft('plate'),productId:'foreign-product'}),/anderen Produkt/);
 assert.deepEqual(el.state,before);assert.equal(calls.record,0);assert.equal(calls.sync,0);
});
