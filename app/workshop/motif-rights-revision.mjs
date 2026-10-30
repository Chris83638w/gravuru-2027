import {createHash} from 'node:crypto';
import {validateProductDocument} from './product-model.mjs';
import {applyNewMotifRights} from '../configurator/variant-m/new-motif-rights.mjs';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

// An offline candidate, not a repository write or an order migration. A later
// operator must compare expectedRevision and sourceDocumentSha256 with the
// current product before saving through the regular revision API.
export function planMotifRightsRevision(record,{designId}){
 if(typeof record?.id!=='string'||!/^cfg_[a-f0-9-]+$/.test(record.id)||!Number.isSafeInteger(record.revision)||record.revision<1)throw Error('Produktkennung und feste Quellrevision fehlen.');
 const source=validateProductDocument(record.document),document=structuredClone(source);
 const design=document.config.profile.designs.find(d=>d.id===designId);
 if(!design)throw Error('Design gehört nicht zu diesem Produktstand.');
 if(design.wholePrintDesign===true)throw Error('Ganzes Druck-Design bleibt als verkaufte Einheit geschützt.');
 const changes=[];
 for(const object of design.objects){
  if(object.type!=='motif'||object.role==='guide'||object.technicalLocked)continue;
  const before={object:structuredClone(object),rights:document.elementRights[design.id][object.id]};
  const rights=applyNewMotifRights(object,before.rights,design);document.elementRights[design.id][object.id]=rights;
  if(JSON.stringify(before)!==JSON.stringify({object,rights}))changes.push({designId:design.id,objectId:object.id,before:before.rights,after:rights});
 }
 if(!changes.length)throw Error('Keine geänderten Motivrechte: kein neuer Produktstand nötig.');
 // Some exported product copies carry an already resolved rights mirror.
 if(document.config.workshopElementRights)document.config.workshopElementRights=structuredClone(document.elementRights);
 const checked=validateProductDocument(document);
 return {schema:'gravuru-motif-rights-revision-plan/v1',mode:'offline-candidate',productId:record.id,expectedRevision:record.revision,proposedRevision:record.revision+1,designId,
  sourceDocumentSha256:digest(record.document),candidateDocumentSha256:digest(checked),changes,document:checked};
}
