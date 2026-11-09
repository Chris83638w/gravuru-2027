import {cleanObject} from '../configurator/variant-m/contract.mjs';
import {legacyElementRights} from '../configurator/variant-m/element-rights.mjs';
import {surfaceObjectIssue} from '../platform/sources/app/shared/models/design-content.mjs';
import {measureText} from '../platform/sources/app/shared/models/text-paths.mjs';
import {workshopResources} from './catalog.mjs';
import {formMotif} from './form-additions.mjs';
import {photoColorMode} from '../platform/sources/app/shared/models/photo-color.mjs';
import {isDeepStrictEqual} from 'node:util';

const fail=(status,code,message,extra={})=>{throw Object.assign(Error(message),{status,code,...extra});};
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const same=isDeepStrictEqual;
const clone=v=>structuredClone(v);
const protectedObject=o=>o.technicalLocked===true||o.role==='guide'||o.type==='motif-raster';
const identityKeys=['type','fieldKey','cSourceId','assetId','customerEditable','templateOrigin','includedInDesign','slateIncluded','locked','technicalLocked','acrylicFixed','required','role','surfaceId'];
const transientKeys=['uxUploadId','uxUploadKind','uxVectorLogo','uxLogoTint','uxPhotoCrop','uxPhotoColor','uxPhotoBackground','uxPersonal','uxLocked'];
const kinds={Schiefer:'slate',Edelstahl:'steel',Acryl:'acrylic',Acrylglas:'acrylic',Holz:'wood',Leder:'leather'};
export const galleryReturnPath=originalId=>'/originale/#design-'+encodeURIComponent(originalId);

/** Private operator adapter. The registry is authoritative; native slugs are
 * never reversed to infer catalogue IDs. No product document is accepted from
 * the browser, and the repository's whole-product CAS is retained. */
export function createGalleryEditor({workshop,targets}){
 if(!workshop?.repository||!workshop?.assets?.galleryPhotos||!workshop.editorPreview||workshop.sessionContext)throw Error('Private native workshop required');
 const registry=new Map(),motifAssets=new Map();
 for(const input of targets||[]){
  if(!input.productId)continue;
  const target={originalId:input.originalId??input.id,material:input.material,materialKind:input.materialKind??kinds[input.material]??input.material,
   sizeKey:input.sizeKey,mm:clone(input.mm),productId:input.productId,designId:input.nativeDesignId??input.designId};
  if(typeof target.originalId!=='string'||!target.originalId||!target.sizeKey||!target.designId||!Array.isArray(target.mm)||target.mm.length!==2||!target.mm.every(n=>Number.isFinite(n)&&n>0))throw Error('Incomplete gallery editor target');
  const key=JSON.stringify([target.productId,target.designId]);
  if(registry.has(key)&&!same(registry.get(key),target))throw Error('Ambiguous gallery editor target');
  registry.set(key,target);
 }
 function select(input,version){
  const target=registry.get(JSON.stringify([input.productId,input.designId]));
  if(!target||input.originalId!==target.originalId)fail(404,'review_target_missing','Diese Originalvorlage gehört nicht zu diesem Galerieformat.');
  const record=workshop.repository.get(target.productId,version?{revision:version}:undefined),profile=record.document.config?.profile;
  const design=profile?.designs?.find(d=>d.id===target.designId);
  if(!design||design.katalog?.designId&&design.katalog.designId!==target.originalId||record.status==='archived'||record.publishedRevision||record.document.config.reviewOnly!==true||profile.material.kind!==target.materialKind||Math.abs(profile.geometry.width-target.mm[0])>1e-6||Math.abs(profile.geometry.height-target.mm[1])>1e-6)fail(409,'review_target_changed','Vorlage, Material oder Größe haben sich geändert. Bitte die Galerie neu öffnen.');
  return {record,design,target};
 }
 function checkRevision(record,expectedRevision){
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)fail(422,'revision_required','Der geladene Versionsstand fehlt.');
  if(record.revision!==expectedRevision)fail(409,'revision_conflict','Diese Produktgruppe wurde inzwischen geändert. Deine Bearbeitung bleibt geöffnet; bitte den aktuellen Stand separat prüfen.',{actualRevision:record.revision});
 }
 const context=(record,target)=>({...target,revision:record.revision,returnUrl:galleryReturnPath(target.originalId),previewUrl:'/api/workshop/products/'+encodeURIComponent(record.id)+'/preview.svg?'+new URLSearchParams({designId:target.designId,revision:String(record.revision)})});
 function photoRefs(record,target){
  return (record.document.config.localResources.photoExamples||[]).filter(e=>e.designId===target.designId).map(e=>({objectId:e.slotId,assetId:e.assetId,...(workshop.assets.galleryPhotos.metadata(e.assetId)||{})}));
 }
 return {
  open(input){
   const {record,design,target}=select(input),model=clone(workshop.internalModel(record.id,record.revision));
   if(model.key!=='acryl')fail(422,'review_editor_unsupported','Für dieses Produkt ist der native Vollkonfigurator noch nicht verbunden.');
   const operator=clone(design);
   for(const object of operator.objects){
    if(protectedObject(object)){object.uxLocked=true;continue;}
    object.customerEditable=true;object.locked=false;object.uxLocked=false;object.acrylicFixed=false;
   }
   model.universal.profile.designs=[operator];model.universal.profile.defaultDesignId=design.id;
   model.universal.workshopElementRights={[design.id]:Object.fromEntries(operator.objects.map(object=>[object.id,legacyElementRights(object)]))};
   model.universal.profile.features={...model.universal.profile.features,orderEnabled:false,productionConfirmed:false};
   model.universal.localResources.photoExamples=(model.universal.localResources.photoExamples||[]).filter(e=>e.designId===design.id);
   model.universal.localResources.photoPlaceholders=(model.universal.localResources.photoPlaceholders||[]).filter(e=>e.designId===design.id);
   if(model.universal.photo?.hints)model.universal.photo.hints=model.universal.photo.hints.filter(e=>e.designId===design.id);
   model.universal.workbench={embedded:true,gallery:true};
   model.legacy.designs=[{...operator}];
   return {context:context(record,target),model,photos:photoRefs(record,target)};
  },
  async upload(input){
   if(!exact(input,['productId','designId','originalId','expectedRevision','photo']))fail(422,'review_payload_invalid','Ungültige Bildübertragung.');
   const {record,design}=select(input);checkRevision(record,input.expectedRevision);
   if(record.document.config.photo?.enabled!==true)fail(422,'review_photo_disabled','Fotos sind für diese Produktgruppe nicht vorgesehen.');
   const photo=input.photo;
   if(!exact(photo,['objectId','original','processed','editSource','widthMm','heightMm','edited','color','editSourceColor','photoEdit','crop','photoShape','photoMaskAssetId'])||typeof photo.objectId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(photo.objectId))fail(422,'review_photo_invalid','Ungültige Bilddaten.');
   const existing=design.objects.find(o=>o.id===photo.objectId);
   if(existing&&(existing.type!=='photoSlot'||protectedObject(existing)))fail(422,'review_photo_invalid','Dieses Element ist kein bearbeitbares Fotofeld.');
   if((photo.photoMaskAssetId||null)!==(existing?.photoMaskAssetId||null))fail(422,'review_photo_invalid','Die Original-Fotomaske muss erhalten bleiben.');
   const media=await workshop.assets.galleryPhotos.import(photo);
   checkRevision(select(input).record,input.expectedRevision);
   return {...media,objectId:photo.objectId};
  },
  media(input,assetId,part,revision){
   if(!Number.isSafeInteger(revision)||revision<1)fail(422,'revision_required','Bildversion fehlt.');
   const {record,target}=select(input,revision);
   if(!photoRefs(record,target).some(e=>e.assetId===assetId))fail(404,'review_photo_missing','Dieses Foto gehört nicht zur geöffneten Vorlage.');
   return workshop.assets.galleryPhotos.read(assetId,part);
  },
  async save(input){
   if(!exact(input,['productId','designId','originalId','expectedRevision','objects','photos'])||!Array.isArray(input.objects)||input.objects.length>200||!Array.isArray(input.photos)||input.photos.length>20)fail(422,'review_payload_invalid','Ungültige Vorlagenbearbeitung.');
   const {record,design:source,target}=select(input);checkRevision(record,input.expectedRevision);
   const document=clone(record.document),config=document.config,design=config.profile.designs.find(d=>d.id===target.designId),ids=new Set(),sourceMap=new Map(source.objects.map(o=>[o.id,o]));
   const photos=new Map();
   for(const p of input.photos){if(!exact(p,['objectId','assetId'])||photos.has(p.objectId)||!/^[a-f0-9]{64}$/.test(p.assetId))fail(422,'review_photo_invalid','Ungültige Fotozuordnung.');photos.set(p.objectId,p.assetId);}
   const resourceLibrary=workshopResources(config.localResources),resources=config.localResources;
   Object.assign(resourceLibrary.fonts,workshop.fonts?.resources?.()||{});
   const originalPhotos=(resources.photoExamples||[]).filter(p=>p.designId===design.id);
   const objects=[];
   for(const raw of input.objects){
    if(!plain(raw)||typeof raw.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(raw.id)||ids.has(raw.id))fail(422,'review_object_invalid','Element-IDs müssen eindeutig sein.');
    ids.add(raw.id);
    if(raw.uxDecoration===true&&!sourceMap.has(raw.id))fail(422,'review_object_invalid','Feste Gestaltungslinien werden unverändert aus der Originalvorlage geladen.');
    const original=sourceMap.get(raw.id),object=cleanObject(raw);
    if(original&&object.type!==original.type||!['text','motif','photoSlot','graphic','motif-raster'].includes(object.type))fail(422,'review_object_invalid','Elementtyp darf nicht ausgetauscht werden.');
    if(protectedObject(original||object)){
     const comparable=clone(object);delete comparable.uxLocked;
     const baseline=cleanObject(original||{});delete baseline.uxLocked;
     if(!original||!same(comparable,baseline))fail(422,'review_object_protected','Technisch geschützte Elemente bleiben unverändert.');
     objects.push(clone(original));continue;
    }
    if(original)for(const key of identityKeys){if(original[key]===undefined)delete object[key];else object[key]=clone(original[key]);}
    else {object.templateOrigin=true;object.customerEditable=true;delete object.locked;delete object.technicalLocked;delete object.acrylicFixed;delete object.role;delete object.assetId;delete object.cSourceId;}
    if(object.type==='photoSlot'){
     if(!config.photo.enabled)fail(422,'review_photo_disabled','Fotos sind für diese Produktgruppe nicht vorgesehen.');
     if((object.photoMaskAssetId||null)!==(original?.photoMaskAssetId||null))fail(422,'review_photo_invalid','Die Original-Fotomaske muss erhalten bleiben.');
     if(!same(object.photoMaskGeometry,original?.photoMaskGeometry))fail(422,'review_photo_invalid','Die Original-Fotogeometrie muss erhalten bleiben.');
     if(original?.photoShape==='template'&&object.photoShape!=='template')fail(422,'review_photo_invalid','Die Original-Fotomaske muss erhalten bleiben.');
     if(raw.uxUploadId&&!photos.has(object.id))fail(422,'review_photo_missing','Ein Foto wurde noch nicht dauerhaft gespeichert.');
     if(photos.has(object.id)){
      const assetId=photos.get(object.id),metadata=workshop.assets.galleryPhotos.metadata(assetId);
      if(metadata){
       // The card may have proportionally resized this exact persisted slot.
       // Its immutable photo asset still describes the original physical size.
       // Reusing the current native size is safe; a new edit must still supply
       // a matching photo rendition, crop and colour.
       const retainedSize=original&&originalPhotos.some(p=>p.slotId===object.id&&p.assetId===assetId)&&
        object.w===original.w&&object.h===original.h&&
        Math.abs(object.w/metadata.widthMm-object.h/metadata.heightMm)<1e-8;
       if((!retainedSize&&(Math.abs(metadata.widthMm-object.w)>1e-5||Math.abs(metadata.heightMm-object.h)>1e-5))||!same(metadata.crop,raw.uxPhotoCrop||null)||metadata.color!==photoColorMode(config.profile,raw))fail(422,'review_photo_invalid','Foto und Bearbeitungsstand stimmen nicht überein. Bitte erneut speichern.');
      }else if(!originalPhotos.some(p=>p.slotId===object.id&&p.assetId===assetId)||!original||original.w!==object.w||original.h!==object.h||raw.uxPhotoCrop&&!same(raw.uxPhotoCrop,{zoom:1,x:0,y:0,angle:0}))fail(422,'review_photo_invalid','Das ursprüngliche Foto muss für diesen Zuschnitt neu gesichert werden.');
     }
     if(!object.fieldKey)object.fieldKey='photo-'+object.id;
     if(object.required===undefined)object.required=false;
    }
    for(const key of transientKeys)delete object[key];
    if(original?.uxLocked!==undefined)object.uxLocked=original.uxLocked;
    if(object.type==='text'){
     const font=resourceLibrary.fonts[object.font];if(!font)fail(422,'review_font_missing','Die gewählte Schrift ist nicht dauerhaft verfügbar.');
     resources.fonts[object.font]=clone(font);measureText(object,resources.fonts);
    }
    if(object.type==='motif'){
     const local=resources.motifs.find(m=>m.key===object.motif);
     if(!local){
      const motif=formMotif(object.motif); // Server-owned passive library, including inherited legacy paint.
      let resource=motifAssets.get(motif.key);
      if(!resource){
       const scale=Math.min(1,1000/Math.max(motif.bounds[2],motif.bounds[3]));
       const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${motif.bounds[2]*scale}mm" height="${motif.bounds[3]*scale}mm" viewBox="${motif.bounds.join(' ')}">${motif.svgFragment}</svg>`;
       const imported=await workshop.assets.import({name:'Bibliotheksmotiv.svg',bytes:Buffer.from(svg).toString('base64')});
       resource={...workshop.assets.resource(imported.assetId),name:motif.name};motifAssets.set(motif.key,resource);
      }
      object.motif=resource.key;
      if(!resources.motifs.some(m=>m.key===resource.key))resources.motifs.push(clone(resource));
     }
    }
    const issue=surfaceObjectIssue(object,config.profile,resources);if(issue)fail(422,'review_object_outside',issue);
    objects.push(object);
   }
   for(const object of source.objects)if(protectedObject(object)&&!ids.has(object.id))fail(422,'review_object_protected','Technisch geschützte Elemente dürfen nicht gelöscht werden.');
   if([...photos.keys()].some(id=>!objects.some(o=>o.id===id&&o.type==='photoSlot')))fail(422,'review_photo_invalid','Fotozuordnung ohne Fotofeld.');
   design.objects=objects;
   document.elementRights[design.id]=Object.fromEntries(objects.map(o=>[o.id,clone(record.document.elementRights[design.id][o.id]||legacyElementRights(o))]));
   for(const key of ['customerFields','sourceElements'])if(Array.isArray(design[key]))design[key]=design[key].filter(f=>ids.has(f.id));
   const hasPhoto=id=>objects.some(o=>o.id===id&&o.type==='photoSlot');
   if(resources.photoExamples||photos.size){
    // Keep the resource order on a no-op save, including neighbouring designs.
    const remaining=new Map(photos);
    resources.photoExamples=(resources.photoExamples||[]).flatMap(p=>{
     if(p.designId!==design.id)return [p];
     const assetId=remaining.get(p.slotId);remaining.delete(p.slotId);
     return assetId?[{...p,assetId}]:[];
    });
    resources.photoExamples.push(...[...remaining].map(([slotId,assetId])=>({designId:design.id,slotId,assetId})));
   }
   if(resources.photoPlaceholders)resources.photoPlaceholders=resources.photoPlaceholders.filter(p=>p.designId!==design.id||hasPhoto(p.slotId));
   if(config.photo.hints)config.photo.hints=config.photo.hints.filter(p=>p.designId!==design.id||hasPhoto(p.slotId));
   const rendered=workshop.editorPreview(document,design.id);
   checkRevision(select(input).record,input.expectedRevision);
   const saved=same(document,record.document)?record:workshop.repository.save(record.id,document,input.expectedRevision);
   return {context:context(saved,target),photos:photoRefs(saved,target),changed:saved.revision!==record.revision,svg:rendered.svg};
  }
 };
}
