import {doorbellSeparations} from './doorbell-artwork.mjs';
import {isLayeredDoorbell} from '../configurator/variant-m/doorbell-selection.mjs';
import {nativeReviewConfig} from './native-review-resources.mjs';
import {acrylicPhotoResolution,resolutionTargetDpi} from './acrylic-photo-resolution.mjs';
import {NATIVE_REVIEW} from './native-review-schema.mjs';
import {artworkViewport} from '../configurator/variant-m/print-geometry.mjs';
import {getProcessingProfile} from '../platform/sources/app/shared/models/processing-profiles.mjs';
import {processProfile} from './process-profiles.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {validateProductDesign,resolveProduct} from './product-model.mjs';
import {cleanObject,isGuideObject,choiceOptions,optionFieldEntries} from '../configurator/variant-m/contract.mjs';
// K14 / Ü12.1: Ausführung (Gruppen) und Zusatzfelder getrennt im Manifest; der Gestaltungsstand
// (produkt-und-gestaltung.json, state.options) behält beide für Bearbeiten und Fertigung.
import {commercePrice} from '../configurator/variant-m/commerce-model.mjs';
import {prepareCustomerPhoto} from './customer-photo.mjs';
import {zipFiles} from '../configurator/variant-m/print-export-model.mjs';
import {textsNearHoles} from '../platform/sources/app/shared/models/hole-proximity.mjs';
import {selectedProfile} from '../configurator/variant-m/contract.mjs';

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
 if((!config.acrylic&&!config.doorbell&&!['slate','steel'].includes(config.profile?.material?.kind))||input.productId!==record.id||input.productRevision!==record.revision)fail('Produkt und feste Revision stimmen nicht überein.');
 if(!Number.isSafeInteger(input.quantity)||input.quantity<1||input.quantity>99)fail('Menge: 1 bis 99.');
 if(!Array.isArray(input.objects)||input.objects.length>120)fail('Ungültiger Elementumfang.');
 const source=config.profile.designs.find(d=>d.id===input.designId);if(!source)fail('Design gehört nicht zum Produkt.');
 const design=validateProductDesign(record.document,{...structuredClone(source),objects:input.objects.map(cleanObject)},{options:input.options,fonts:config.localResources.fonts,motifs:config.localResources.motifs});
 const resolved=resolveProduct(record.document,{options:input.options,designId:source.id});
 const price=commercePrice(config,{objects:design.objects,designId:design.id,mOptions:resolved.resolvedOptions},input.quantity);
 // Hidden layers remain editable; their originals belong to this immutable revision.
 const used=new Set(design.objects.filter(o=>!isGuideObject(o)&&o.uxUploadId).map(o=>o.uxUploadId));
 if(!Array.isArray(input.media)||input.media.length!==used.size||used.size>4)fail('Alle verwendeten Originalbilder müssen mitgesichert werden.');
 const ids=new Set();for(const m of input.media){keys(m,['id','original','edited']);if(typeof m.id!=='string'||!used.has(m.id)||ids.has(m.id))fail('Bildzuordnung ist nicht eindeutig.');ids.add(m.id);}
 for(const o of design.objects)if(!o.uxHidden&&!isGuideObject(o)&&o.type==='photoSlot'&&o.required&&!o.uxUploadId)fail('Bitte das erforderliche eigene Foto hochladen.');
 return {design,options:resolved.resolvedOptions,geometry:resolved.physical,price};
}

// Eingefrorene Konfiguratorquelle für genau diese Gestaltung. Fertigung, Bestellprodukt und
// Warenkorb-Bearbeiten lesen daraus nur Profil, Preis-/Materialangaben und die Schriften,
// Motive und Fotovorgaben dieses Designs. Das komplette Schriftset des Profils und das
// eingebettete Materialbild (live ~11 MB je Klick) werden nicht mehr in jedes Paket kopiert;
// das Materialbild bleibt über Prüfsumme nachvollziehbar.
export function reviewSources(config,design){
 const {localResources:local,...rest}=config,frozen=structuredClone(rest),references={};
 for(const key of ['materialSurface','sceneBackground'])if(typeof frozen[key]==='string'&&frozen[key].startsWith('data:')){references[key]={sha256:sha(frozen[key]),length:frozen[key].length};delete frozen[key];}
 if(Object.keys(references).length)frozen.embeddedImageReferences=references;
 if(!local)return frozen;
 const fonts=new Set(),motifs=new Set();
 for(const o of design.objects){if(typeof o.font==='string')fonts.add(o.font);if(typeof o.motif==='string')motifs.add(o.motif);}
 const resources={};
 for(const [key,value] of Object.entries(local))if(!['fonts','motifs','photoExamples','photoPlaceholders'].includes(key))resources[key]=structuredClone(value);
 resources.fonts={};for(const id of fonts)if(Object.hasOwn(local.fonts||{},id))resources.fonts[id]=structuredClone(local.fonts[id]);
 resources.motifs=(local.motifs||[]).filter(m=>motifs.has(m.key)).map(m=>structuredClone(m));
 for(const key of ['photoExamples','photoPlaceholders'])if(Array.isArray(local[key]))resources[key]=local[key].filter(e=>e.designId===design.id).map(e=>structuredClone(e));
 frozen.localResources=resources;
 return frozen;
}

export async function prepareAcrylicReview({record,config,input,assets,preparePhoto=prepareCustomerPhoto}){
 config=nativeReviewConfig(config,input);
 const layered=isLayeredDoorbell(config);
 let state;try{state=validateAcrylicReview(record,config,input);}catch(error){if(error.constructor===Error&&error.status===undefined)Object.assign(error,{status:422,code:'acrylic_review_invalid'});throw error;}
 const files=[],photos=[];
 let total=0;const add=(path,bytes,purpose)=>{const b=Buffer.from(bytes);total+=b.length;if(total>100*1024*1024)fail('Prüfstand ist größer als 100 MB.');files.push({path,bytes:b,purpose});return {path,bytes:b.length,sha256:sha(b)};};
 if(layered)add('funkklingel-fertigung.json',json(doorbellSeparations(config,state.options)),'Feste getrennte Materialkonturen und Originalausschnitte, gleiche Revision wie Gestaltung und Preis.');
 const frozen=reviewSources(config,state.design),ref=record.document.productionProfile,productionProfile=record.metadata?.productionProfile||null;
 if(ref?(!productionProfile||productionProfile.id!==ref.id||productionProfile.revision!==ref.revision):!!productionProfile)fail('Der gesicherte Fertigungsprofilstand fehlt oder passt nicht zur Produktrevision.');
 if(productionProfile)add('fertigungsprofil.json',json(productionProfile),'Unveränderlicher Fertigungsprofilstand; keine Maschinenfreigabe.');
 // No ephemeral upload URLs or tokens are accepted from the browser.
 add('produkt-und-gestaltung.json',json({schema:config.acrylic?'gravuru-acrylic-review-input/v1':'gravuru-native-review-input/v1',product:record.document,state,profileRevision:config.profile.revision,profileSelections:config.workshopProfiles}),'Gespeichertes natives Produkt, Kundenwerte und serverberechneter Preis.');
 add('konfigurator-quellen.json',json(frozen),'Feste Konfiguratorrevision mit Schriftpfaden und Motivquellen.');
 for(const [i,m] of input.media.entries()){
  const original=await preparePhoto(m.original),extension=original.original.subarray(0,3).equals(Buffer.from([255,216,255]))?'jpg':original.original.subarray(1,4).toString()==='PNG'?'png':'webp';
  const source=add(`fotos/${i+1}-original.${extension}`,original.original,'Byteidentisches privates Originalbild.');
  let edited=null;if(m.edited){const photo=await preparePhoto(m.edited);const ext=photo.original.subarray(0,3).equals(Buffer.from([255,216,255]))?'jpg':photo.original.subarray(1,4).toString()==='PNG'?'png':'webp';edited={...add(`fotos/${i+1}-bearbeitet.${ext}`,photo.original,'Geprüfte Darstellung der angewendeten Bildbearbeitung.'),width:photo.width,height:photo.height};}
  photos.push({uploadId:m.id,...source,width:original.width,height:original.height,edited});
 }
 const viewport=artworkViewport(config,{mOptions:state.options});
 // Ü5.1/Ü5.2: Ampel je Fotoobjekt gegen das Soll des Fertigungsprofils, sonst (K10) des
 // Verfahrensprofils, sonst 300 dpi. Nie eine Sperre: der Grad wird mitgeführt, damit
 // Summary und Freigabe „Auflösung niedrig“ vermerken.
 const process=processProfile(config.profile),targetDpi=resolutionTargetDpi(productionProfile,process);
 const photoResolution=state.design.objects.filter(o=>!o.uxHidden&&!isGuideObject(o)&&o.uxUploadId).map(o=>acrylicPhotoResolution(o,photos.find(p=>p.uploadId===o.uxUploadId),viewport.scale,{targetDpi})).filter(Boolean);
 const photoWarnings=photoResolution.filter(p=>p.grade!=='gruen').map(p=>p.productionNote+': Bild „'+p.label+'“ erreicht in dieser Platzierung etwa '+p.effectiveDpi+' dpi (Soll '+p.targetDpi+' dpi). Foto wurde angenommen; bitte in der Freigabe prüfen. Mehr dpi beim Export ergänzen keine fehlenden Bilddetails.');
 const photoHints=photoResolution.filter(p=>p.hint).map(p=>({objectId:p.objectId,grade:p.grade,text:p.hint}));
 const referenced=new Set();
 for(const o of state.design.objects.filter(o=>!o.uxHidden&&!isGuideObject(o))){
  const motif=config.localResources.motifs.find(m=>m.key===o.motif);
  if(motif?.artwork?.assetId)referenced.add(motif.artwork.assetId);
  if(o.assetId)referenced.add(o.assetId);
  if(o.photoMaskAssetId)referenced.add(o.photoMaskAssetId);
  const example=config.localResources.photoExamples?.find(e=>e.designId===state.design.id&&e.slotId===o.id&&!o.uxUploadId);if(example)referenced.add(example.assetId);
 }
 for(const id of referenced){const a=assets.get(id);add('quellen/'+id+'-original.'+a.format,assets.read(id,true),'Byteidentische importierte Designquelle.');add('quellen/'+id+'-vorschau.svg',assets.read(id),'Geprüfte Designvorschau.');}
 if(typeof input.preview!=='string'||input.preview.length>3*1024*1024)fail('Die Gestaltungsvorschau fehlt oder ist zu groß.');
 const image=await preparePhoto(input.preview);add('gestaltung-referenz.png',image.preview,'Vom Browser übermittelte Gestaltungsvorschau; kein serverseitiger Fertigungsnachweis.');
 const preview=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${image.width} ${image.height}"><image width="${image.width}" height="${image.height}" href="data:image/png;base64,${image.preview.toString('base64')}"/></svg>`);
 const method=getProcessingProfile(config.profile).method;
 // Production note (not a blocker): customer kept a text inside a drill-hole protection zone.
 const holeWarnings=config.acrylic?[]:textsNearHoles(state.design,selectedProfile(config,state.options),config.localResources.fonts).map(n=>'Prüfvermerk Bohrloch: Text „'+String(n.text).trim().slice(0,60)+'“ liegt im Schutzbereich des Bohrlochs bei '+n.hole.x+' | '+n.hole.y+' mm. Kunde wurde vor der Bestellung darauf hingewiesen.');
 const id='proof_'+randomUUID(),manifest={schema:config.acrylic?ACRYLIC_REVIEW:NATIVE_REVIEW,id,createdAt:new Date().toISOString(),source:{draftId:'acrylic_'+randomUUID(),draftRevision:1,designId:state.design.id},product:{id:record.id,revision:record.revision,name:record.document.name,basePriceCents:state.price.unitCents,currency:'EUR',material:config.profile.material,method,processingProfileId:process.id,widthMm:state.geometry.widthMm,heightMm:state.geometry.heightMm},selection:{options:choiceOptions(config,state.options),labels:config.profile.optionGroups.filter(g=>state.options[g.id]!==undefined).map(g=>({label:g.name,value:g.values.find(v=>v.id===state.options[g.id]).label})),...(config.profile.optionFields===undefined?{}:{fields:optionFieldEntries(config,state.options)}),geometry:state.geometry,price:state.price},status:'review-only',order:null,payment:null,productionProfile,productionReady:false,photoHints,capabilities:{contour:!config.doorbell||layered,print:!config.doorbell&&method==='print',engraving:(!config.doorbell||layered)&&method==='engraving',...(layered?{layered:true}:{}),cart:false},blockers:[...(config.doorbell&&!layered?['Die getrennte Fertigungsausgabe für Edelstahlträger und Acrylglasauflage ist noch nicht angebunden.']:[]),method==='print'?'Gemessenes ICC-Profil und Maschinenabnahme fehlen.':'Gravurparameter und Probegravur sind nicht freigegeben.','Shopify-Bestellbindung und echte Maschinenabnahme sind nicht bestätigt.'],photoResolution,warnings:[...photoWarnings,...holeWarnings,'Die PNG-Vorschau stammt aus dem Browser. Geprüft wurden Produktrevision, Elementrechte, Maße, Preis und Bilddateien; die Vorschau ist kein Fertigungsnachweis.'],photos,files:files.map(({path,bytes,purpose})=>({path,bytes:bytes.length,sha256:sha(bytes),purpose}))};
 add('manifest.json',json(manifest),'Prüfsummen und Geltungsgrenzen.');
 const archive=await zip(files);return {manifest:{...manifest,packageSha256:sha(archive)},preview,contourPdf:Buffer.alloc(0),package:archive,photos:await zip(files.filter(f=>f.path.startsWith('fotos/')&&f.path.includes('-original.')))};
}
