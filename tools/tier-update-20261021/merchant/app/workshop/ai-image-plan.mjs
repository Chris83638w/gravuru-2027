import {aiFail} from './ai-design-plan.mjs';
import {imagePrompt} from './openai-image-provider.mjs';
import {authorDesign} from './ui/design-authoring.mjs';
import {prepareCustomerPhoto} from './customer-photo.mjs';
import {getProcessingProfile} from '../platform/sources/app/shared/models/processing-profiles.mjs';

export function aiImageContext(record,request,assets){
 const c=record.document.config,d=c?.profile?.designs.find(d=>d.id===request.designId);
 if(!d||record.status==='archived')throw aiFail(422,'ai_design_unsupported','Bitte ein gespeichertes, aktives Design auswählen.');
 const context={kind:request.kind,instruction:request.instruction};imagePrompt(context);
 if(request.kind==='image_generate'){
  if(d.objects.length>=20)throw aiFail(422,'ai_element_limit','Das Design enthält bereits 20 Elemente. Bitte zuerst Platz für ein neues Motiv schaffen.');
 }else{
  const o=d.objects.find(o=>o.id===request.targetObjectId);
  if(!o||o.type!=='photoSlot'||o.technicalLocked||request.preservePhotos)throw aiFail(422,'ai_photo_locked','Bitte ein bearbeitbares Fotofeld auswählen und die Fotobearbeitung freigeben.');
  const example=c.localResources.photoExamples?.find(e=>e.designId===d.id&&e.slotId===o.id);
  if(!example)throw aiFail(422,'ai_photo_missing','Bitte zuerst ein eigenes Musterfoto in diesem Fotofeld speichern.');
  context.image=assets.photoExampleImage(example.assetId);
 }
 return context;
}
export async function prepareAiImageContext(context){
 if(context.kind!=='photo_edit')return context;
 const photo=await prepareCustomerPhoto(context.image.toString('base64'));
 return {...context,image:photo.preview,size:photo.width>photo.height*1.15?'1536x1024':photo.height>photo.width*1.15?'1024x1536':'1024x1024'};
}
export async function applyAiImage(original,request,result,assets){
 if(!result.image)throw aiFail(422,'ai_plan_invalid','Der Bildauftrag enthält kein einzelnes gültiges Bild.');
 // Decode through the existing restricted photo pipeline; retain original PNG.
 const photo=await prepareCustomerPhoto(result.image);
 if(!result.image.startsWith('iVBORw0KGgo')||photo.width>1536||photo.height>1536||photo.width<256||photo.height<256)throw aiFail(422,'ai_plan_invalid','Das erzeugte Bild hat ein unerwartetes Format.');
 const document=structuredClone(original),c=document.config,d=c.profile.designs.find(d=>d.id===request.designId);
 if(request.kind==='photo_edit'){
  const o=d.objects.find(o=>o.id===request.targetObjectId);
  const asset=await assets.importPhotoExample({bytes:result.image,widthMm:o.w,heightMm:o.h});
  const example=c.localResources.photoExamples.find(e=>e.designId===d.id&&e.slotId===o.id);
  example.assetId=asset.assetId;
  return {document,summary:'Musterfoto bearbeitet. Fotofeld, Originalmaske und übriges Design bleiben erhalten.',changes:[{action:'photo_edit',objectId:o.id,assetId:asset.assetId}]};
 }
 const g=c.profile.geometry,max=Math.min(40,(g.width-2*(g.safeMarginMm??2))/2,(g.height-2*(g.safeMarginMm??2))/2);
 const scale=max/Math.max(photo.width,photo.height);
 const engraving=getProcessingProfile(c.profile).method==='engraving';
 const asset=await assets.importPhotoExample({bytes:result.image,widthMm:photo.width*scale,heightMm:photo.height*scale,monochrome:engraving});
 const motif=assets.resource(asset.assetId);motif.name='KI-Motiv';motif.category='Eigene Motive';
 const authored=authorDesign(document,d.id,'motif',{motif});
 return {document:authored.document,summary:'Neues KI-Motiv als einzelnes verschiebbares Bildelement ergänzt. '+(engraving?'Die Transparenz bildet die einfarbige Gravurmaske. ':'')+'Bestehende Texte, Fotos und Motive bleiben erhalten.',changes:[{action:'image_generate',objectId:authored.objectId,assetId:asset.assetId}]};
}
