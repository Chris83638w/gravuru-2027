import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {prepareShopProduct} from './shop-preparation.mjs';
import {getProcessingProfile} from '../platform/sources/app/shared/models/processing-profiles.mjs';

export const syncFail=(code,message,status=409)=>{throw Object.assign(Error(message),{code,status});};
export function canonical(value){
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 syncFail('gallery_sync_data','Der Synchronisierungsbeleg enthält ungültige Daten.',422);
}
export const syncHash=value=>createHash('sha256').update(Buffer.isBuffer(value)?value:canonical(value)).digest('hex');
const clone=v=>structuredClone(v),same=isDeepStrictEqual;
const changedDesignKeys=['objects','marks','customerFields','sourceElements','importedSource','editableSource','preparedTemplate'];

export function nativeSource(workshop,identity){
 const record=workshop.repository.get(identity.productId),config=record.document.config;
 const design=config?.profile?.designs?.find(d=>d.id===identity.designId);
 const originals=[design?.katalog?.originalId,design?.katalog?.designId].filter(Boolean);
 if(record.status==='archived'||!design||config.reviewOnly!==true||record.publishedRevision||
    !originals.length||originals.some(id=>id!==identity.originalId))
  syncFail('gallery_sync_source','Die freigegebene Galeriequelle ist nicht eindeutig oder kein privater Entwurf.');
 const fonts={},motifs=[],rasters=[];
 for(const object of design.objects){
  if(object.type==='text'){
   const font=config.localResources.fonts?.[object.font];
   if(!font)syncFail('gallery_sync_font','Die verwendete Schrift muss zuerst in der Galerievorlage gesichert werden.');
   fonts[object.font]=clone(font);
  }
  if(object.type==='motif'){
   const motif=config.localResources.motifs?.find(m=>m.key===object.motif);
   if(!motif)syncFail('gallery_sync_motif','Eine native Motivressource fehlt.');
   if(!motifs.some(m=>m.key===motif.key))motifs.push(clone(motif));
  }
  if(object.type==='motif-raster'){
   const raster=config.localResources.rasters?.find(r=>r.assetId===object.assetId);
   if(!raster)syncFail('gallery_sync_raster','Eine gesicherte Rasterressource fehlt.');
   if(!rasters.some(r=>r.assetId===raster.assetId))rasters.push(clone(raster));
  }
 }
 const photos=(config.localResources.photoExamples||[]).filter(p=>p.designId===design.id).map(clone);
 const payload={design:clone(design),rights:clone(record.document.elementRights[design.id]),geometry:clone(config.profile.geometry),material:clone(config.profile.material),processing:clone(getProcessingProfile(config.profile)),
  fonts,motifs,rasters,photos,placeholders:(config.localResources.photoPlaceholders||[]).filter(p=>p.designId===design.id).map(clone),
  hints:(config.photo?.hints||[]).filter(p=>p.designId===design.id).map(clone)};
 const ids=new Set();
 for(const match of JSON.stringify(payload).matchAll(/(?:"(?:assetId|photoMaskAssetId)"\s*:\s*"|\/design-assets\/)([a-f0-9]{64})/g))ids.add(match[1]);
 const assets=[...ids].sort().map(id=>{
  const metadata=workshop.assets.get(id),entry={id,metadata:clone(metadata),originalSha256:syncHash(workshop.assets.read(id,true)),previewSha256:syncHash(workshop.assets.read(id))};
  if(photos.some(p=>p.assetId===id)){
   entry.photo=workshop.assets.galleryPhotos.metadata(id);
   entry.photoSources=Object.fromEntries(['original','processed','editSource'].map(part=>[part,syncHash(workshop.assets.galleryPhotos.read(id,part))]));
  }
  return entry;
 });
 return {record,payload,assets,evidence:{...identity,revision:record.revision,fingerprint:syncHash({payload,assets}),assets}};
}

// Import validated immutable assets; never flatten a photo/mask into a screenshot.
// Legacy examples without an editing recipe require the shared original store:
// recreating their unknown crop/colour recipe would silently change the design.
export async function ensureNativeAssets(sourceWorkshop,targetWorkshop,source){
 for(const item of source.assets){
  let present=false;
  try{present=same(targetWorkshop.assets.get(item.id),item.metadata)&&syncHash(targetWorkshop.assets.read(item.id,true))===item.originalSha256&&syncHash(targetWorkshop.assets.read(item.id))===item.previewSha256;}catch(error){if(error.status!==404)throw error;}
  if(present&&item.photoSources)for(const part of ['original','processed','editSource']){
   try{if(syncHash(targetWorkshop.assets.galleryPhotos.read(item.id,part))!==item.photoSources[part])present=false;}catch{present=false;}
  }
  if(present)continue;
  let imported;
  if(item.photoSources){
   if(!item.photo)syncFail('gallery_sync_photo_source','Dieses ältere Musterfoto benötigt den gemeinsamen Originalspeicher; seine Bearbeitungsquelle ist noch nicht übertragbar.',422);
   const ref=source.payload.photos.find(p=>p.assetId===item.id),slot=source.payload.design.objects.find(o=>o.id===ref.slotId);
   imported=await targetWorkshop.assets.galleryPhotos.import({...item.photo,
    ...Object.fromEntries(['original','processed','editSource'].map(part=>[part,sourceWorkshop.assets.galleryPhotos.read(item.id,part).toString('base64')])),
    photoShape:slot.photoShape||'rect',photoMaskAssetId:slot.photoMaskAssetId||null});
  }else imported=await targetWorkshop.assets.import({name:'Galeriequelle.'+item.metadata.format,page:item.metadata.page,bytes:sourceWorkshop.assets.read(item.id,true).toString('base64')});
  if(imported.assetId!==item.id||syncHash(targetWorkshop.assets.read(item.id))!==item.previewSha256)
   syncFail('gallery_sync_asset_conversion','Die Zielumgebung erzeugt eine andere Ressource. Zuerst die Importversionen abgleichen.',422);
 }
}

function mergeNamed(target,source,key){
 for(const item of source){const old=target.find(x=>x[key]===item[key]);if(old&&!same(old,item))syncFail('gallery_sync_resource_conflict','Eine gleich benannte Zielressource hat einen anderen Inhalt. Andere Designs bleiben geschützt.');if(!old)target.push(clone(item));}
}
// Family/native schemas store physical identity separately from labels and
// preview colours. An absent optional steel/slate variant is not an invented
// default; acrylic catalogue variants and a real thickness must be explicit.
function materialIdentity(material,where){
 if(typeof material?.kind!=='string'||!material.kind||!Number.isFinite(material.thicknessMm)||material.thicknessMm<=0)
  syncFail('gallery_sync_material_identity',where+': Materialart oder tatsächliche Materialstärke fehlt. Zuerst die Materialvorlage vervollständigen.',422);
 const value={kind:material.kind,thicknessMm:material.thicknessMm};
 for(const key of ['variant','engravingSide']){
  if(material[key]===undefined){
   if(key==='variant'&&material.kind==='acrylic')syncFail('gallery_sync_material_identity',where+': Die Acrylglasvariante fehlt. Sie wird nicht aus Bezeichnungen oder Dateinamen abgeleitet.',422);
   continue;
  }
  if(typeof material[key]!=='string'||!material[key].trim())syncFail('gallery_sync_material_identity',where+': Die Materialvariante oder Gravurseite ist nicht eindeutig angegeben.',422);
  value[key]=material[key];
 }
 return value;
}
function nativeFamily(config,design,where){
 const families=[];
 const add=(value,required=false)=>{
  if(value===undefined&&!required)return;
  if(typeof value!=='string'||!value.trim())syncFail('gallery_sync_family_identity',where+': Eine gespeicherte Katalogfamilie ist unvollständig. Die Zuordnung muss zuerst geklärt werden.',422);
  families.push(value);
 };
 add(design.katalog?.target?.familyId);
 if(config.profile.familySelection)add(config.profile.familySelection.familyId,true);
 if(config.familyAcrylic)add(config.familyAcrylic.familyId,true);
 if(config.familyFormats){
  const f=config.familyFormats,format=f.formats.find(row=>row.key===f.defaultSize),variant=format?.variants.find(row=>row.color===f.defaultColor),bank=f.designs.find(row=>row.id===design.id);
  if(!variant?.designIds.includes(design.id)||!bank)syncFail('gallery_sync_family_identity',where+': Die native Familienvorlage gehört nicht zum ausgewählten Material-/Formatstand.',422);
  add(variant.familyId,true);add(bank.katalog?.target?.familyId);
  if(!same(materialIdentity(variant.material,where+' / Formatvorlage'),materialIdentity(config.profile.material,where)))
   syncFail('gallery_sync_material_identity',where+': Material, Variante, Stärke oder Gravurseite der Formatvorlage widersprechen dem angezeigten Produkt.',422);
 }
 if(!families.length)syncFail('gallery_sync_family_identity',where+': Die ausdrückliche Katalogfamilie fehlt. Ältere Vorlagen müssen zuerst zugeordnet werden; Namen oder Dateipfade reichen nicht aus.',422);
 if(families.some(value=>value!==families[0]))syncFail('gallery_sync_family_identity',where+': Die Katalogfamilien von Design und Material-/Formatvorlage widersprechen sich.',422);
 return families[0];
}
export function assertNativeTargetIdentity(source,targetRecord,identity,{allowSecondary=false}={}){
 const document=targetRecord.document,config=document.config,p=config?.profile;
 const target=p?.designs.find(d=>d.id===identity.designId);
 if(!target||targetRecord.status==='archived'||document.kind!=='product')
  syncFail('gallery_sync_target','Das Ziel muss eine bestehende Shopkonfiguration mit genau diesem Design sein.',422);
 // This connection updates the product's main picture and customer entry.
 // A secondary gallery design needs its own explicit picture contract; never
 // silently turn it into the starter or render it as the current main picture.
 if(!allowSecondary&&p.defaultDesignId!==identity.designId)syncFail('gallery_sync_start_design','Diese Zuordnung ist kein Startdesign des Shopprodukts. Das Hauptbild darf nicht mit einer anderen Galerievorlage überschrieben werden.',422);
 const matchesOriginal=design=>{const ids=[design.katalog?.originalId,design.katalog?.designId].filter(Boolean);return ids.length>0&&ids.every(id=>id===source.evidence.originalId);};
 if(!matchesOriginal(target))syncFail('gallery_sync_original_identity','Die Original-ID des Zieldesigns stimmt nicht mit der Galeriequelle überein. Eine unbekannte Alias-Zuordnung wird nicht übernommen.',422);
 if(!same(source.payload.geometry,p.geometry))syncFail('gallery_sync_geometry','Form oder Maße unterscheiden sich. Dafür ist zuerst eine ausdrücklich geprüfte Formatvorlage erforderlich.',422);
 if(source.payload.material.kind!==p.material.kind)syncFail('gallery_sync_material','Das Material unterscheidet sich. Dafür ist zuerst die bestätigte Materialvorlage erforderlich.',422);
 if(!same(materialIdentity(source.payload.material,'Galeriequelle'),materialIdentity(p.material,'Shopziel')))
  syncFail('gallery_sync_material','Materialvariante, Stärke oder Gravurseite unterscheiden sich. Dafür ist zuerst eine ausdrücklich passende Materialvorlage erforderlich.',422);
 if(!same(source.payload.processing,getProcessingProfile(p)))syncFail('gallery_sync_processing','Das Fertigungsverfahren unterscheidet sich. Dafür ist zuerst eine passende freigegebene Materialvorlage erforderlich.',422);
 if(config.familyFormats&&(config.familyFormats.formats.length!==1||config.familyFormats.formats[0].variants.length!==1))
  syncFail('gallery_sync_formats','Dieses Shopprodukt enthält mehrere Format-/Materialfassungen. Diese müssen zuerst einzeln mit geprüften Galerievorlagen zugeordnet werden.',422);
 if(config.familyFormats){
  const family=config.familyFormats,cut=family.source?.shopProduct,format=family.formats.find(f=>f.key===family.defaultSize),variant=format?.variants.find(v=>v.color===family.defaultColor);
  if((!allowSecondary&&cut?.defaultDesignId!==source.evidence.originalId)||!variant?.designIds.includes(identity.designId))syncFail('gallery_sync_start_design','Das gespeicherte Startdesign der Format-/Shopzuordnung passt nicht zur Galeriequelle.',422);
 }
 if(config.familyFormats){const bank=config.familyFormats.designs.find(d=>d.id===identity.designId);if(!bank)syncFail('gallery_sync_design','Die gemeinsame Formatvorlage fehlt.');if(!matchesOriginal(bank))syncFail('gallery_sync_original_identity','Die Original-ID der Formatvorlage stimmt nicht mit der Galeriequelle überein.',422);const mm=bank.katalog?.plateMm;if(mm&&(mm[0]!==p.geometry.width||mm[1]!==p.geometry.height))syncFail('gallery_sync_geometry','Die Formatvorlage benötigt eine eigene geprüfte Größenanpassung.',422);}
 if(nativeFamily(source.record.document.config,source.payload.design,'Galeriequelle')!==nativeFamily(config,target,'Shopziel'))
  syncFail('gallery_sync_family_identity','Galeriequelle und Shopziel gehören zu verschiedenen Katalogfamilien. Zuerst die ausdrücklich passende Material-/Familienvorlage zuordnen.',422);
 if(source.payload.design.objects.some(o=>o.type==='photoSlot')&&config.photo?.enabled!==true)
  syncFail('gallery_sync_photo_disabled','Für dieses Zielprodukt sind Fotos nicht bestätigt.',422);
}
export function composeNativeTarget(source,targetRecord,identity,options){
 assertNativeTargetIdentity(source,targetRecord,identity,options);
 const document=clone(targetRecord.document),config=document.config,target=config.profile.designs.find(d=>d.id===identity.designId);
 const replace=design=>{for(const key of changedDesignKeys){if(source.payload.design[key]===undefined)delete design[key];else design[key]=clone(source.payload.design[key]);}};
 replace(target);
 if(config.familyFormats)replace(config.familyFormats.designs.find(d=>d.id===identity.designId));
 document.elementRights[target.id]=clone(source.payload.rights);
 const resources=config.localResources;
 for(const [id,font]of Object.entries(source.payload.fonts)){
  if(resources.fonts[id]&&!same(resources.fonts[id],font))syncFail('gallery_sync_font_conflict','Eine gleich benannte Schrift im Ziel hat einen anderen Stand.');
  resources.fonts[id]=clone(font);
 }
 mergeNamed(resources.motifs,source.payload.motifs,'key');
 if(source.payload.rasters.length){resources.rasters??=[];mergeNamed(resources.rasters,source.payload.rasters,'assetId');}
 for(const [key,items]of [['photoExamples',source.payload.photos],['photoPlaceholders',source.payload.placeholders]]){
  if(resources[key]||items.length)resources[key]=[...(resources[key]||[]).filter(p=>p.designId!==target.id),...items.map(p=>({...clone(p),designId:target.id}))];
 }
 if(config.photo?.hints||source.payload.hints.length)config.photo.hints=[...(config.photo.hints||[]).filter(p=>p.designId!==target.id),...source.payload.hints.map(h=>({...clone(h),designId:target.id}))];
 const before=prepareShopProduct(targetRecord),after=prepareShopProduct({...targetRecord,document});
 if(!same(before.variants,after.variants)||!same(before.extras,after.extras)||!same(before.seo,after.seo)||before.title!==after.title)
  syncFail('gallery_sync_commerce','Diese Gestaltung würde Preise oder Ausführungen ändern und benötigt einen separaten Angebotsabgleich.',422);
 return document;
}
