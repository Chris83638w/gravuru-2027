import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {familyExecution,executionKind,executionOptionGroups,MEMORIAL_FAMILIES} from './execution-registry.mjs';
import {stakeChoicesMarkup} from './stake-execution.mjs';
import {memorialChoicesMarkup} from './memorial-execution.mjs';
import {selectedFamilyProfile} from './family-formats.mjs';
import {buildProductEditorBundles,EXECUTION_ENTRIES} from './bundle-build.mjs';

test('execution selection uses catalogue/schema identity, never title, material or geometry',()=>{
 for(const source of ['steel-door-signs','acryl-3mm-tuerschilder-schwarz'])assert.equal(executionKind({productExecution:familyExecution(source)}),'door-sign');
 for(const source of MEMORIAL_FAMILIES)assert.equal(executionKind({productExecution:familyExecution(source)}),'memorial');
 assert.equal(executionKind({productExecution:familyExecution('grabstecker-edelstahl')}),'stake');
 assert.equal(executionKind({doorbell:{schema:'gravuru-doorbell/v1'}}),'doorbell');
 assert.equal(executionKind({profile:{name:'Grabstecker Gedenktafel Funkklingel',material:{kind:'steel'},workingArea:{headHeightMm:100,previewHeightMm:110}}}),'generic');
 assert.equal(executionKind({productExecution:{...familyExecution('steel-door-signs'),kind:'stake'}}),'generic');
 assert.equal(executionKind({productExecution:{...familyExecution(MEMORIAL_FAMILIES[0]),enabled:false}}),'generic','the deferred memorial UI stays off until the price round');
 assert.equal(executionKind({productExecution:{...familyExecution('grabstecker-edelstahl'),enabled:false}}),'stake','the memorial-only switch cannot weaken stake validation');
});

test('stake offers only current-form sizes and follows size-specific head/production geometry without source changes',()=>{
 const mount={id:'K00',priceCents:0,holes:[]};
 const format=(key,form,width,height,head,price)=>({key,form,label:key,geometry:{width,height,shape:'contour',outlinePath:'M0 0H'+width+'V'+height+'H0Z',holes:[]},workingArea:{headHeightMm:head,previewHeightMm:head+10},variants:[{color:'edelstahl',familyId:'grabstecker-edelstahl',sizeKey:key,material:{kind:'steel'},basePriceCents:price,mounting:[mount],designIds:['test']} ]});
 const c={productExecution:familyExecution('grabstecker-edelstahl'),profile:{defaultDesignId:'test',workingArea:{headHeightMm:100,previewHeightMm:110},optionGroups:[{id:'size'},{id:'mounting'},{id:'color'}]},familyFormats:{schema:'gravuru-family-formats/v1',defaultSize:'S',defaultColor:'edelstahl',formats:[format('S','GS-HERZ',100,300,100,1899),format('L','GS-HERZ',200,450,200,2999),format('cross','GS-KREUZ',200,450,200,2499)],designs:[{id:'test',katalog:{plateMm:[100,300]},objects:[]}]}};
 const before=JSON.stringify(c),markup=stakeChoicesMarkup(c,{size:'L'}),selected=selectedFamilyProfile(c,{size:'L'});
 assert.deepEqual(executionOptionGroups(c).map(g=>g.id),['size']);
 assert.match(markup,/data-stake-size="S"/);assert.match(markup,/data-stake-size="L" aria-pressed="true"/);assert.match(markup,/29,99/);
 assert.doesNotMatch(markup,/mounting|cross|Befestigung|Farbe|form/);
 assert.deepEqual(selected.workingArea,{headHeightMm:200,previewHeightMm:210});assert.equal(selected.geometry.height,450);
 assert.equal(JSON.stringify(c),before);
});

test('memorial shows bound accessory alternatives, K00 first, catalogue surcharges and no unrelated controls',()=>{
 const c={profile:{optionGroups:[{id:'mounting',values:[{id:'B02',label:'2 Bohrlöcher',priceCents:299,holes:[{x:12,y:50}]},{id:'STK',label:'Ständer klar',priceCents:1399,holes:[]},{id:'K00',label:'Ohne Bohrung',priceCents:0,holes:[]}]}]}};
 const before=JSON.stringify(c),html=memorialChoicesMarkup(c);
 assert.ok(html.indexOf('data-picture-option="K00"')<html.indexOf('data-picture-option="B02"'));
 assert.match(html,/Zubehör/);assert.match(html,/Alternativ/);assert.match(html,/13,99/);assert.match(html,/2,99/);
 assert.doesNotMatch(html,/Position|Gerät|data-stake-size|data-family-group/);assert.equal(JSON.stringify(c),before);
});

test('each execution UI is a separate chunk with no other execution or duplicate common dependency',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-executions-'));
 try{
  const result=buildProductEditorBundles(dir),core=new Set(result.modules),seen=new Set(core);
  for(const [kind,entries] of Object.entries(EXECUTION_ENTRIES)){
   const chunk=result.executions[kind];for(const entry of entries){assert.ok(chunk.modules.includes(entry));assert.equal(core.has(entry),false);}
   for(const url of chunk.modules){assert.equal(seen.has(url),false,url);seen.add(url);assert.equal(result.chunks[url],chunk.url);}
   for(const [other,es] of Object.entries(EXECUTION_ENTRIES))if(other!==kind)for(const entry of es)assert.equal(chunk.modules.includes(entry),false);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
