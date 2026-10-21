import {validateProductDocument} from './product-model.mjs';

// A new saved product revision; original imported designs/history are untouched.
export function editableApprovedDesign(document){
 const next=structuredClone(document),design=next.config.profile.designs[0];
 if(next.config.profile.designs.length!==1||design?.preparedTemplate?.schema!=='gravuru-prepared-design/v2'||!/^GR-ACR-/.test(design.preparedTemplate.designSku))throw Error('Nur bestätigte native Fotodesigns aktualisieren.');
 for(const o of design.objects){
  if(!design.customerFields.some(f=>f.id===o.id))continue;
  if(!['text','photoSlot'].includes(o.type)||o.technicalLocked)throw Error('Unbekanntes Kundenfeld.');
  delete o.acrylicFixed;delete o.locked;o.customerEditable=true;
  next.elementRights[design.id][o.id]={content:o.type==='text',color:o.type==='text',replace:o.type==='photoSlot',move:true,scale:true,delete:o.type==='text'};
 }
 next.config.profile.features.motifsAllowed=true;
 return validateProductDocument(next);
}

// Keep the template's photo mask fixed; only the image inside it is adjustable.
export function fixedPhotoMaskApprovedDesign(document){
 const next=structuredClone(document),design=next.config.profile.designs[0];
 if(next.config.profile.designs.length!==1||design?.preparedTemplate?.schema!=='gravuru-prepared-design/v2'||!/^GR-ACR-/.test(design.preparedTemplate.designSku))throw Error('Nur bestätigte native Fotodesigns aktualisieren.');
 for(const o of design.objects.filter(o=>o.type==='photoSlot')){
  o.acrylicFixed=true;delete o.locked;o.customerEditable=true;
  next.elementRights[design.id][o.id]={content:false,color:false,replace:true,move:false,scale:false,delete:false};
 }
 return validateProductDocument(next);
}
