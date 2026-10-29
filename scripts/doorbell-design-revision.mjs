// Chris, 29.10.2026: publish the reviewed presentation and editable designs.
// Pure preparation; callers must save a NEW revision via the existing repository.
import assert from 'node:assert/strict';
import {prepareDoorbellDesignRepair} from './prepare-doorbell-design-repair.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';
import {legacyElementRights} from '../app/configurator/variant-m/element-rights.mjs';

export function prepareDoorbellDesignRevision(document){
 const result=structuredClone(document);
 const prepared=prepareDoorbellDesignRepair(document.config).input;
 result.config=prepared;
 // Each format now uses the same source element identities. Preserve the old
 // rights for matching elements, and grant only the requested move/delete/replace.
 const oldRights=document.elementRights;
 result.elementRights=Object.fromEntries(prepared.profile.designs.map(d=>[d.id,Object.fromEntries(d.objects.map(o=>{
  // Restoring a source motif that was missing in the landscape template also
  // restores its native policy; there cannot be an old per-element entry for it.
  const rights=oldRights[d.id]?.[o.id]??legacyElementRights(o);
  const editable=['text','motif'].includes(o.type)&&!o.technicalLocked&&!o.locked&&!o.acrylicFixed;
  return [o.id,editable?{...rights,move:true,delete:true,...(o.type==='motif'?{replace:true}:{})}:structuredClone(rights)];
 }))]));
 if(result.config.workshopElementRights)result.config.workshopElementRights=structuredClone(result.elementRights);
 // Designs and their explicit edit policy are the only permitted changes.
 const strip=c=>{
  const x=structuredClone(c);delete x.profile.designs;delete x.workshopElementRights;
  for(const f of x.doorbell.formats)delete f.profile.designs;
  return x;
 };
 assert.deepEqual(strip(result.config),strip(document.config));
 const validated=validateProductDocument(result);
 assert.deepEqual(strip(validated.config),strip(document.config));
 for(const key of ['name','kind','masterId','categoryIds','seo','profileAssignments','productionProfile'])assert.deepEqual(validated[key],document[key]);
 return validated;
}
