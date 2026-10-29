// Read-only regression against exported /models.json copies; never calls Shopify.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {selectedDoorbellProfile,doorbellLayoutIssue} from '../app/configurator/variant-m/doorbell-selection.mjs';
import {prepareDoorbellDesignRepair} from './prepare-doorbell-design-repair.mjs';
import {doorbellOptionState} from '../app/configurator/variant-m/doorbell-ui.mjs';
import {doorbellChoiceGroups,doorbellChoicePreview} from '../app/configurator/variant-m/doorbell-presentation.mjs';
import {customerRightsTemplate} from '../app/configurator/variant-m/customer-rights.mjs';
import {restoreElementRights,designElementRights} from '../app/configurator/variant-m/element-rights.mjs';
import {quote} from '../app/configurator/variant-m/contract.mjs';
const dir=process.argv[2];if(!dir)throw Error('Exportordner mit modellbezogenen JSON-Dateien angeben.');
const proposal=process.argv.includes('--repair-proposal');
const result={proposal,products:0,models:0,selections:0,uniqueDesignSets:0,pictureGroups:0,checkedProposalDesigns:0,changedSourceDocuments:0};const models=new Set();
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json'))){
 let config=JSON.parse(fs.readFileSync(path.join(dir,file))).model?.universal;if(config?.doorbell?.schema!=='gravuru-doorbell/v1')continue;
 if(proposal)config=prepareDoorbellDesignRepair(config).input;
 const before=JSON.stringify(config),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 models.add(config.doorbell.modelKey);result.products++;
 const defaults=Object.fromEntries(config.profile.optionGroups.map(g=>[g.id,g.defaultValueId]));defaults.position=config.doorbell.defaultPosition;
 const source=selectedDoorbellProfile(config,defaults),start={designId:source.designs[0].id,mOptions:defaults,objects:structuredClone(source.designs[0].objects)};
 for(const f of config.doorbell.formats){
  const signatures=f.profile.designs.map(d=>hash(d.objects));assert.equal(new Set(signatures).size,16,file+' distinct designs');result.uniqueDesignSets++;
  if(proposal&&f.key!=='16x28')for(const position of ['standard','opposite']){
   const p=selectedDoorbellProfile(config,{...defaults,format:f.key,position});
   for(const d of p.designs){
    const original=config.doorbell.formats.find(f=>f.key==='16x28').profile.designs.find(s=>s.id===d.id);
    assert.deepEqual(d.objects.filter(o=>o.type==='motif').map(o=>o.motif),original.objects.filter(o=>o.type==='motif').map(o=>o.motif));
    for(const o of d.objects)assert.equal(doorbellLayoutIssue(o,p),'',file+' '+d.id+' '+position);
    result.checkedProposalDesigns++;
   }
  }
  for(const g of doorbellChoiceGroups(config,{...defaults,format:f.key}).filter(g=>g.id!=='mounting')){
   const svgs=g.values.map(v=>doorbellChoicePreview(config,{...defaults,format:f.key},g.id,v).replace(/choice-[\w-]+/g,'choice'));
   assert.equal(new Set(svgs).size,g.values.length,file+' '+f.key+' '+g.id);result.pictureGroups++;
  }
  for(const position of ['standard','opposite'])for(const frame of f.profile.frames)for(const color of ['schwarz','anthrazit'])for(const mounting of f.profile.mounting.options){
   const options={format:f.key,position,frame:frame.key,color,mounting:mounting.key};
   const state=doorbellOptionState(config,start,options),template=customerRightsTemplate(config,state);
   const restored=restoreElementRights(template.objects,state.objects,designElementRights(config,template.id,template.objects));
   assert.deepEqual(restored.objects,state.objects,file+' repair must preserve selected template');
   assert.equal(quote(config,restored.objects,state.designId,options).unitCents,f.basePriceCents+mounting.surchargeCents,file+' price');
   result.selections++;
  }
 }
 assert.equal(JSON.stringify(config),before,file+' immutable source');
}
result.models=models.size;assert.equal(result.products,126);assert.equal(result.models,42);assert.equal(result.selections,30240);
console.log(JSON.stringify(result,null,2));

