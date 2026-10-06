import {getProcessingProfile} from '../platform/sources/app/shared/models/processing-profiles.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {validateProductDesign,resolveProduct} from './product-model.mjs';
import {cleanObject} from '../configurator/variant-m/contract.mjs';
import {commercePrice} from '../configurator/variant-m/commerce-model.mjs';
import {prepareCustomerPhoto} from './customer-photo.mjs';
import {zipFiles} from '../configurator/variant-m/print-export-model.mjs';

export const ACRYLIC_REVIEW='gravuru-acrylic-review/v1';
const fail=message=>{throw Object.assign(Error(message),{status:422});};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const zip=async files=>Buffer.from(await (await zipFiles(files.map(f=>({name:f.path,blob:new Blob([f.bytes])})))).arrayBuffer());
const keys=(o,allowed)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!allowed.includes(k)))fail('Unbekannte Felder in der Acryl-Übergabe.');};

// Native Konfi state, not a conversion into a form product. All prices and rights
// come from the pinned server record. The submitted PNG is a visual reference,
// explicitly not server-verified artwork or a production file.
export function validateAcrylicReview(record,config,input){
 keys(input,['productId','productRevision','designId','objects','options','quantity','media','preview']);
 if(!config.acrylic||input.productId!==record.id||input.productRevision!==record.revision)fail('Produkt und feste Revision stimmen nicht überein.');
 if(!Number.isSafeInteger(input.quantity)||input.quantity<1||input.quantity>99)fail('Menge: 1 bis 99.');
 if(!Array.isArray(input.objects)||input.objects.length>120)fail('Ungültiger Elementumfang.');
 const source=config.profile.designs.find(d=>d.id===input.designId);if(!source)fail('Design gehört nicht zum Produkt.');
 const design=validateProductDesign(record.document,{...structuredClone(source),objects:input.objects.map(cleanObject)},{options:input.options,fonts:config.localResources.fonts,motifs:config.localResources.motifs});
 const resolved=resolveProduct(record.document,{options:input.options,designId:source.id});
 const price=commercePrice(config,{objects:design.objects,designId:design.id,mOptions:resolved.resolvedOptions},input.quantity);
 const used=new Set(design.objects.filter(o=>!o.uxHidden&&o.uxUploadId).map(o=>o.uxUploadId));
 if(!Array.isArray(input.media)||input.media.length!==used.size||used.size>4)fail('Alle verwendeten Originalbilder müssen mitgesichert werden.');
 const ids=new Set();for(const m of input.media){keys(m,['id','original','edited']);if(typeof m.id!=='string'||!used.has(m.id)||ids.has(m.id))fail('Bildzuordnung ist nicht eindeutig.');ids.add(m.id);}
 for(const o of design.objects)if(!o.uxHidden&&o.type==='photoSlot'&&o.required&&!o.uxUploadId)fail('Bitte das erforderliche eigene Foto hochladen.');
 return {design,options:resolved.resolvedOptions,geometry:resolved.physical,price};
}

export async function prepareAcrylicReview({record,config,input,assets,preparePhoto=prepareCustomerPhoto}){
 const state=validateAcrylicReview(record,config,input),files=[],photos=[];
 let total=0;const add=(path,bytes,purpose)=>{const b=Buffer.from(bytes);total+=b.length;if(total>100*1024*1024)fail('Prüfstand ist größer als 100 MB.');files.push({path,bytes:b,purpose});return {path,bytes:b.length,sha256:sha(b)};};
 const frozen=structuredClone(config);
 // No ephemeral upload URLs or tokens are accepted from the browser.
 add('produkt-und-gestaltung.json',json({schema:'gravuru-acrylic-review-input/v1',product:record.document,state,profileRevision:config.profile.revision,profileSelections:config.workshopProfiles}),'Gespeichertes natives Produkt, Kundenwerte und serverberechneter Preis.');
 add('konfigurator-quellen.json',json(frozen),'Feste Konfiguratorrevision mit Schriftpfaden und Motivquellen.');
 for(const [i,m] of input.media.entries()){
  const original=await preparePhoto(m.original),extension=original.original.subarray(0,3).equals(Buffer.from([255,216,255]))?'jpg':original.original.subarray(1,4).toString()==='PNG'?'png':'webp';
  const source=add(`fotos/${i+1}-original.${extension}`,original.original,'Byteidentisches privates Originalbild.');
  let edited=null;if(m.edited){const photo=await preparePhoto(m.edited);const ext=photo.original.subarray(0,3).equals(Buffer.from([255,216,255]))?'jpg':photo.original.subarray(1,4).toString()==='PNG'?'png':'webp';edited=add(`fotos/${i+1}-bearbeitet.${ext}`,photo.original,'Geprüfte Darstellung der angewendeten Bildbearbeitung.');}
  photos.push({uploadId:m.id,...source,width:original.width,height:original.height,edited});
 }
 const referenced=new Set();
 for(const o of state.design.objects.filter(o=>!o.uxHidden)){
  const motif=config.localResources.motifs.find(m=>m.key===o.motif);
  if(motif?.artwork?.assetId)referenced.add(motif.artwork.assetId);
  if(o.assetId)referenced.add(o.assetId);
  const example=config.localResources.photoExamples?.find(e=>e.designId===state.design.id&&e.slotId===o.id&&!o.uxUploadId);if(example)referenced.add(example.assetId);
 }
 for(const id of referenced){const a=assets.get(id);add('quellen/'+id+'-original.'+a.format,assets.read(id,true),'Byteidentische importierte Designquelle.');add('quellen/'+id+'-vorschau.svg',assets.read(id),'Geprüfte Designvorschau.');}
 if(typeof input.preview!=='string'||input.preview.length>3*1024*1024)fail('Die Gestaltungsvorschau fehlt oder ist zu groß.');
 const image=await preparePhoto(input.preview);add('gestaltung-referenz.png',image.preview,'Vom Browser übermittelte Gestaltungsvorschau; kein serverseitiger Fertigungsnachweis.');
 const preview=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${image.width} ${image.height}"><image width="${image.width}" height="${image.height}" href="data:image/png;base64,${image.preview.toString('base64')}"/></svg>`);
 const id='proof_'+randomUUID(),manifest={schema:ACRYLIC_REVIEW,id,createdAt:new Date().toISOString(),source:{draftId:'acrylic_'+randomUUID(),draftRevision:1,designId:state.design.id},product:{id:record.id,revision:record.revision,name:record.document.name,basePriceCents:state.price.unitCents,currency:'EUR',material:config.profile.material,method:getProcessingProfile(config.profile).method,widthMm:state.geometry.widthMm,heightMm:state.geometry.heightMm},selection:{options:state.options,labels:config.profile.optionGroups.map(g=>({label:g.name,value:g.values.find(v=>v.id===state.options[g.id]).label})),geometry:state.geometry,price:state.price},status:'review-only',order:null,payment:null,productionProfile:null,productionReady:false,capabilities:{contour:true,print:true,cart:false},blockers:['Gemessenes ICC-Profil und Maschinenabnahme fehlen.','Shopify-Bestellbindung und echte Maschinenabnahme sind nicht bestätigt.'],warnings:['Die PNG-Vorschau stammt aus dem Browser. Geprüft wurden Produktrevision, Elementrechte, Maße, Preis und Bilddateien; die Vorschau ist kein Fertigungsnachweis.'],photos,files:files.map(({path,bytes,purpose})=>({path,bytes:bytes.length,sha256:sha(bytes),purpose}))};
 add('manifest.json',json(manifest),'Prüfsummen und Geltungsgrenzen.');
 const archive=await zip(files);return {manifest:{...manifest,packageSha256:sha(archive)},preview,contourPdf:Buffer.alloc(0),package:archive,photos:await zip(files.filter(f=>f.path.startsWith('fotos/')&&f.path.includes('-original.')))};
}
