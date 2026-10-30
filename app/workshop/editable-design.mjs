import {convertDesign} from './design-assets.mjs';
import {validateProductDocument} from './product-model.mjs';
import {applyNewMotifRights} from '../configurator/variant-m/new-motif-rights.mjs';

// Preparing an editable draft does not save or replace any product revision.
// Original glyph outlines remain exact until a merchant chooses editable text.
export async function prepareEditableDesign(document,assets,designId){
 const draft=structuredClone(document),c=draft.config,d=c.profile.designs.find(d=>d.id===designId),source=d?.importedSource;
 if(!source)throw Error('Bitte ein importiertes PDF/SVG-Design auswählen.');
 const original=d.objects.find(o=>o.motif==='artwork-'+source.assetId),a=assets.get(source.assetId);
 if(!original||original.rotation)throw Error('Bitte die Originalgrafik vor der Aufbereitung ungedreht übernehmen.');
 if(d.objects.length!==1)throw Error('Dieses Design enthält zusätzliche Elemente. Bitte zuerst eine Kopie der ursprünglichen importierten Gestaltung aufbereiten.');
 const converted=await convertDesign({kind:a.format,bytes:assets.read(a.assetId,true).toString('base64'),page:a.page,parts:true});
 const parts=converted.parts;
 if(!Array.isArray(parts)||!parts.length||parts.length>20)throw Error('Keine bearbeitbaren Bestandteile gefunden.');
 d.objects=[];d.sourceElements=[];
 d.editableSource={assetId:a.assetId,originalName:source.originalName};
 delete d.importedSource;delete d.preparedTemplate;delete d.customerFields;
 draft.elementRights[d.id]={};
 for(const key of ['photoExamples','photoPlaceholders'])if(c.localResources[key])c.localResources[key]=c.localResources[key].filter(e=>e.designId!==d.id);
 if(c.photo.hints)c.photo.hints=c.photo.hints.filter(e=>e.designId!==d.id);
 for(const [i,part] of parts.entries()){
  const asset=await assets.import({name:`PDF-Element-${i+1}.svg`,bytes:Buffer.from(part.svg).toString('base64')});
  const id='pdf-element-'+(i+1),sx=original.w/a.widthMm,sy=original.h/a.heightMm;
  const o={id,type:part.kind==='photo'?'photoSlot':'motif',x:original.x-original.w/2+(part.xMm+part.widthMm/2)*sx,y:original.y-original.h/2+(part.yMm+part.heightMm/2)*sy,w:part.widthMm*sx,h:part.heightMm*sy,rotation:0,templateOrigin:true,customerEditable:true};
  if(o.type==='photoSlot'){
   const mask=part.maskSvg?await assets.import({name:`PDF-Fotomaske-${i+1}.svg`,bytes:Buffer.from(part.maskSvg).toString('base64')}):null;
   Object.assign(o,{fieldKey:'photo-'+id,photoShape:mask?'template':'rect',...(mask?{photoMaskAssetId:mask.assetId}:{}),required:true});c.photo.enabled=true;
   (c.localResources.photoExamples??=[]).push({designId:d.id,slotId:id,assetId:asset.assetId});
   (c.photo.hints??=[]).push({designId:d.id,slotId:id,text:'Hier eigenes Foto hochladen',enabled:true});
  }else{
   const motif=assets.resource(asset.assetId);if(!c.localResources.motifs.some(m=>m.key===motif.key))c.localResources.motifs.push(motif);
   Object.assign(o,{motif:motif.key,color:'#000000',preserveColors:true});
  }
  d.objects.push(o);d.sourceElements.push({id,kind:part.kind,label:(part.kind==='text'?'PDF-Text':part.kind==='photo'?'Musterfoto':'PDF-Motiv')+' '+(i+1),...(part.kind==='text'?{text:part.text}:{})});
  draft.elementRights[d.id][id]=applyNewMotifRights(o,{content:false,color:false,replace:o.type==='photoSlot',move:false,scale:false,delete:false},d);
 }
 const checked=validateProductDocument(draft);assets.validateDocument(checked);
 return {document:checked,designId:d.id,parts:d.sourceElements,warnings:['Original und gespeicherte Fassungen bleiben erhalten.','PDF-Texte behalten zunächst ihre Originalkonturen. Über „Text bearbeiten“ eine vollständige Werkstatt-Schrift auswählen.','Texte innerhalb eines flachen Fotos sind nicht als Text erkennbar. Musterfotos und Fotoform vor dem Speichern prüfen.']};
}
