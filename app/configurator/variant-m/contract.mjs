import {canDeleteTemplateElement} from './element-rights.mjs';
import {validateOptionPresentation} from './option-media.mjs';
import {validateStudio} from '../../platform/sources/app/shared/models/studio-products.mjs';
import {getProcessingProfile} from '../../platform/sources/app/shared/models/processing-profiles.mjs';
import {validateDesignContent, objectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';
import {validateUniversalElements} from '../../platform/sources/app/shared/models/universal-elements.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {localFontIds} from './local-pilot.mjs';
import {acrylicSelection} from './acrylic-product.mjs';

const clone = value => structuredClone(value);
const fail = message => { throw Error(message); };
// A printed/engraved element does not obstruct a screw. Mechanical access belongs
// to the model-bound plate assembly; retain the native outer-contour checks here.
export const customerLayoutIssue=(object,profile)=>objectIssue(object,{...profile,geometry:{...profile.geometry,holes:[]}});
export const DRAFT_SCHEMA = 'gravuru-universal-customer-draft/v1';
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const money = cents => new Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR'}).format(cents / 100);

// This adapter consumes the existing native profile. It never grants a runtime release.
export function prepareConfig(input) {
  const config = clone(input), p = config.profile;
  const extraFontIds=localFontIds(config);
  const review=config.reviewOnly===true&&p.binding?.kind==='local-review'&&p.features?.orderEnabled===false;
  if(config.reviewOnly&&!review)fail('Prüfprodukt darf keine Shop-Bestellung freigeben.');
  validateStudio(p, p, {extraFontIds});
  for(const group of p.optionGroups||[])for(const value of group.values)validateOptionPresentation(value);
  if (!p.binding?.productId || !p.id || !p.revision) fail('Produktbindung und feste Profilrevision fehlen.');
  if (!(review&&config.basePriceCents===null&&config.extraMotifCents===null)&&(!Number.isSafeInteger(config.basePriceCents) || config.basePriceCents < 0 ||
      !Number.isSafeInteger(config.extraMotifCents) || config.extraMotifCents < 0)) fail('Verbindliche Centpreise fehlen.');
  if (typeof config.photo?.enabled !== 'boolean' || config.photo.mode !== 'upload-only') fail('Fotofunktion ausdrücklich festlegen.');
  if(config.logo!==undefined&&typeof config.logo.enabled!=='boolean')fail('Logofunktion ausdrücklich festlegen.');
  if (!config.photo.enabled){p.designs = p.designs.filter(d => !d.objects.some(o => o.type === 'photoSlot'));if(config.localResources){config.localResources.photoPlaceholders=[];config.localResources.photoExamples=[];}}
  if (!p.designs.length) fail('Für dieses Produkt gibt es keine passende Vorlage ohne Fotobereich.');
  if(p.defaultDesignId&&!p.designs.some(d=>d.id===p.defaultDesignId))p.defaultDesignId=p.designs[0].id;
  // Image resources need their own versioned media manifest, not invented URLs.
  if (p.designs.some(d => d.objects.some(o => o.type === 'image'))) fail('Die feste Bildressource braucht zuerst eine geprüfte Medienzuordnung.');
  const rasters=config.localResources?.rasters||[];
  for(const o of p.designs.flatMap(d=>d.objects).filter(o=>o.type==='motif-raster'))if(!rasters.some(r=>r.assetId===o.assetId&&r.sha256===o.assetId&&r.pixelWidth>=Math.ceil(o.w*600/25.4)&&r.pixelHeight>=Math.ceil(o.h*600/25.4)))fail('Rastermotiv fehlt oder unterschreitet 600 dpi.');
  const placeholders=config.localResources?.photoPlaceholders||[],seen=new Set();
  for(const asset of placeholders){
    const design=p.designs.find(d=>d.id===asset.designId),slot=design?.objects.find(o=>o.id===asset.slotId&&o.type==='photoSlot');
    const key=asset.designId+'\0'+asset.slotId,box=asset.placement;
    if(!slot||seen.has(key)||!/^[a-f0-9]{64}$/.test(asset.sha256)||!Number.isInteger(asset.pixelWidth)||!Number.isInteger(asset.pixelHeight)||Math.min(asset.pixelWidth,asset.pixelHeight)<512||Math.max(asset.pixelWidth,asset.pixelHeight)>4096||!box||!['x','y','w','h'].every(k=>typeof box[k]==='number'&&Number.isFinite(box[k]))||box.w<=0||box.h<=0||Math.abs(box.w/box.h-asset.pixelWidth/asset.pixelHeight)>0.02||!/^\/(?:api\/product-workbench\/|produktvorschau\/)[A-Za-z0-9_./%-]+\.png$/.test(asset.url))fail('Fotoplatzhalter-Ressource ist ungültig.');
    seen.add(key);
  }
  const examples=config.localResources?.photoExamples||[],exampleKeys=new Set();
  if(!Array.isArray(examples)||examples.length>1200)fail('Ungültige Beispielfotos.');
  for(const example of examples){
    const key=example.designId+'\0'+example.slotId,slot=p.designs.find(d=>d.id===example.designId)?.objects.find(o=>o.id===example.slotId&&o.type==='photoSlot');
    if(!slot||exampleKeys.has(key)||!/^[a-f0-9]{64}$/.test(example.assetId||'')||Object.keys(example).some(k=>!['designId','slotId','assetId'].includes(k)))fail('Ungültige Beispielfoto-Zuordnung.');
    exampleKeys.add(key);
  }
  const hints=config.photo.hints||[],hintKeys=new Set();
  if(!Array.isArray(hints)||hints.length>1200)fail('Ungültige Fotohinweise.');
  for(const h of hints){
    const key=h.designId+'\0'+h.slotId,slot=p.designs.find(d=>d.id===h.designId)?.objects.find(o=>o.id===h.slotId&&o.type==='photoSlot');
    if(!slot||hintKeys.has(key)||typeof h.text!=='string'||!h.text.trim()||h.text.length>100||typeof h.enabled!=='boolean'||Object.keys(h).some(k=>!['designId','slotId','text','enabled'].includes(k)))fail('Ungültiger Fotohinweis.');
    hintKeys.add(key);
  }
  getProcessingProfile(p);
  if(config.acrylic)acrylicSelection(resolvedOptions(config),config.acrylic.pricing);
  return config;
}

export function resolvedOptions(config, values = {}) {
  const groups = config.profile.optionGroups || [], result = {};
  if (!values || typeof values !== 'object' || Array.isArray(values)) fail('Ungültige Optionen.');
  for (const key of Object.keys(values)) if (!groups.some(g => g.id === key)) fail('Unbekannte Optionsgruppe.');
  for (const group of groups) {
    const id = values[group.id] ?? group.defaultValueId;
    if (!group.values.some(v => v.id === id)) fail('Ungültige Auswahl: ' + group.name);
    result[group.id] = id;
  }
  return result;
}

export function selectedProfile(config, values = {}) {
  const profile = clone(config.profile), options = resolvedOptions(config, values);
  let holeSelection = false;
  delete profile.mountingPreview;
  for (const group of profile.optionGroups || []) {
    const value = group.values.find(v => v.id === options[group.id]);
    if (value.holes !== undefined) {
      if (holeSelection) fail('Mehrere Optionen bestimmen gleichzeitig das Bohrbild.');
      profile.geometry.holes = clone(value.holes); holeSelection = true;
      profile.mountingPreview={spacers:value.spacers===true,diameter:12,finish:value.spacerFinish||'silver'};
    }
  }
  return profile;
}

export function quote(config, objects, designId, values = {}, quantity = 1) {
  if(config.reviewOnly&&config.basePriceCents===null)fail('Preis noch offen.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) fail('Menge: 1 bis 99.');
  const options = resolvedOptions(config, values);
  const design = config.profile.designs.find(d => d.id === designId);
  if (!design) fail('Unbekanntes Design.');
  // Original template motifs are included once. A duplicate must not inherit this credit.
  const included = new Map(design.objects.filter(o => o.type === 'motif').map(o => [o.id, o.motif]));
  const embeddedOnly=new Set((config.localResources?.motifs||[]).filter(m=>m.embeddedOnly===true).map(m=>m.key));
  const seen = new Set();
  let additionalMotifs = 0;
  const lineKeys=new Set((design.marks||[]).map((_,i)=>'ux-line-'+design.id+'-'+i));
  for (const o of objects.filter(o => o.type === 'motif' && !o.uxHidden && !(o.uxDecoration&&lineKeys.has(o.motif)&&o.id===o.motif))) {
    if(embeddedOnly.has(o.motif)&&(included.get(o.id)!==o.motif||o.templateOrigin!==true||seen.has(o.id)))fail('Vorlagenmotiv darf nicht zusätzlich eingefügt werden.');
    if (included.get(o.id) === o.motif && !seen.has(o.id)) seen.add(o.id);
    else additionalMotifs++;
  }
  let unitCents = config.acrylic ? acrylicSelection(options,config.acrylic.pricing).totalCents : config.basePriceCents;
  if(!config.acrylic)for (const group of config.profile.optionGroups || []) unitCents += group.values.find(v => v.id === options[group.id]).priceCents;
  unitCents += additionalMotifs * config.extraMotifCents;
  if (!Number.isSafeInteger(unitCents) || !Number.isSafeInteger(unitCents * quantity)) fail('Ungültiger Gesamtpreis.');
  return {currency:'EUR', unitCents, totalCents:unitCents * quantity, quantity, additionalMotifs, options};
}

export function validateDesign(config, design, options, fonts, motifs) {
  const source = config.profile.designs.find(d => d.id === design?.id);
  if (!source) fail('Die Vorlage gehört nicht zu diesem Produkt.');
  if(source.importedSource&&!source.objects.some(o=>o.type==='photoSlot')&&design.objects.some(o=>o.type==='photoSlot'))fail('Diese importierte Vorlage hat noch keinen freigegebenen Fotobereich.');
  validateDesignContent(design, {universal:true,extraFontIds:localFontIds(config)});
  // Local logo uploads carry an opaque upload id, like photo slots. They are not
  // published media resources; the production media validator stays unchanged.
  validateUniversalElements({...design,objects:design.objects.map(o=>
    o.type==='image'&&o.uxUploadKind==='logo'&&o.uxUploadId&&config.logo?.enabled!==false
      ? {...o,type:'photoSlot'} : o)});
  if (JSON.stringify(design.marks || []) !== JSON.stringify(source.marks || [])) fail('Feste Gestaltungslinien wurden verändert.');
  for(const raw of source.objects.filter(o=>o.type==='motif-raster'&&!canDeleteTemplateElement(config,source.id,o)))if(!design.objects.some(o=>o.id===raw.id&&o.type==='motif-raster'&&o.assetId===raw.assetId&&o.locked===true))fail('Rastermotiv darf nicht entfernt oder ersetzt werden.');
  const p = selectedProfile(config, options);
  // Geometry locks are product rules, not just disabled drag handles. Colour
  // and an uploaded photograph may change without changing the fixed layout.
  const fixedKeys=['type','x','y','w','h','rotation','fieldKey','photoShape','shape','filled','strokeWidth','motif','assetId','required','acrylicFixed'];
  for(const raw of source.objects.filter(o=>o.acrylicFixed===true)){
    const matches=design.objects.filter(o=>o.id===raw.id),o=matches[0];
    if(!matches.length&&canDeleteTemplateElement(config,source.id,raw))continue;
    if(matches.length!==1||o.uxHidden===true||fixedKeys.some(key=>o[key]!==raw[key]))fail('Ein fester Acrylglas-Vorlagenbereich wurde verändert.');
  }
  for (const raw of source.objects.filter(o => o.technicalLocked === true)) {
    const o = design.objects.find(o => o.id === raw.id);
    if (!o || JSON.stringify(cleanObject(o)) !== JSON.stringify(cleanObject(raw))) fail('Ein fester Vorlagenbereich wurde verändert.');
  }
  for (const o of design.objects) {
    if(o.uxPhotoCrop!==undefined){
      const c=o.uxPhotoCrop;
      if(o.type!=='photoSlot'||!o.uxUploadId||!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['zoom','x','y','angle'].includes(k))||![c.zoom,c.x,c.y,c.angle??0].every(Number.isFinite)||c.zoom<.25||c.zoom>4||Math.abs(c.x)>1||Math.abs(c.y)>1||Math.abs(c.angle??0)>3600)fail('Ungültige Foto-Ausrichtung.');
    }
    if (o.uxPhotoBackground!==undefined && (o.uxUploadKind!=='photo'||!o.uxUploadId||!['remove','keep'].includes(o.uxPhotoBackground))) fail('Ungültige Foto-Aufbereitung.');
    if (o.uxLogoTint!==undefined && (o.uxUploadKind!=='logo'||o.type!=='image'||typeof o.uxLogoTint!=='boolean')) fail('Einfarbige Vorschau ist nur für hochgeladene Logos möglich.');
    if (o.type === 'photoSlot' && !config.photo.enabled) fail('Fotobereich nicht freigegeben.');
    if (o.type === 'image' && !(o.uxUploadKind==='logo'&&o.uxUploadId&&config.logo?.enabled!==false)) fail('Eigene Bilder ausschließlich über den freigegebenen Upload hochladen.');
    if (o.type === 'motif') {
      if(!motifs.some(m => m.key === o.motif))fail('Motiv ist nicht in der Bibliothek.');
      if(config.localResources?.motifs?.some(m=>m.key===o.motif&&m.embeddedOnly===true)&&(o.templateOrigin!==true||!source.objects.some(raw=>raw.id===o.id&&raw.type==='motif'&&raw.motif===o.motif&&raw.templateOrigin===true)))fail('Vorlagenmotiv darf nicht zusätzlich eingefügt werden.');
    }
    if (o.type === 'motif-raster'){
      if(!source.objects.some(raw=>raw.id===o.id&&raw.type==='motif-raster'&&raw.assetId===o.assetId&&raw.locked===true))fail('Festes Rastermotiv darf nicht ersetzt werden.');
      const raster=config.localResources?.rasters?.find(r=>r.assetId===o.assetId);
      if(!raster||raster.pixelWidth<Math.ceil(o.w*600/25.4)||raster.pixelHeight<Math.ceil(o.h*600/25.4))fail('Rastermotiv unterschreitet bei dieser Größe 600 dpi.');
    }
    const measured = o.type === 'text' ? measureText(clone(o), fonts) : o;
    const issue = customerLayoutIssue(measured, p); if (issue) fail(issue);
  }
  return design;
}

// Explicit whitelist: no selected objects, embedded photo bytes, arbitrary URLs or credentials.
const objectKeys = ['id','type','x','y','w','h','rotation','color','text','font','size','bold','italic','motif','fieldKey',
  'letterSpacing','customerEditable','templateOrigin','includedInDesign','slateIncluded','photoShape','required','shape','filled','strokeWidth','preserveColors','acrylicFixed',
  'uxHidden','uxLocked','uxUploadId','uxUploadKind','uxLogoTint','uxPhotoBackground','uxPhotoCrop','uxDecoration','uxPersonal','cSourceId','technicalLocked','assetId','opacity','locked'];
export function cleanObject(o) { return Object.fromEntries(objectKeys.filter(k => o[k] !== undefined).map(k => [k, clone(o[k])])); }
export function editedDesignTexts(config,state){
 const source=config.profile.designs.find(d=>d.id===state.designId);
 return new Map(state.objects.filter(o=>o.type==='text'&&o.fieldKey&&o.customerEditable!==false&&
  o.text!==source?.objects.find(original=>original.fieldKey===o.fieldKey)?.text).map(o=>[o.fieldKey,o.text]));
}

export function designFromState(config, state) {
  const source = config.profile.designs.find(d => d.id === state.designId);
  if (!source) fail('Unbekanntes Design.');
  return {...clone(source), objects:state.objects.map(cleanObject)};
}
export function saveDraft(config, state, options, fonts, motifs) {
  const design = designFromState(config, state);
  validateDesign(config, design, options, fonts, motifs);
  return {schema:DRAFT_SCHEMA, profileId:config.profile.id, profileRevision:config.profile.revision,
    productId:config.profile.binding.productId, design, options:resolvedOptions(config, options)};
}
export function readDraft(config, input, fonts, motifs) {
  if (new TextEncoder().encode(JSON.stringify(input)).length > 2_000_000) fail('Entwurfsdatei ist zu groß.');
  if (input?.schema !== DRAFT_SCHEMA || input.profileId !== config.profile.id || input.profileRevision !== config.profile.revision || input.productId !== config.profile.binding.productId) fail('Entwurf gehört zu einem anderen Produkt oder einer anderen Vorlagenrevision.');
  const design = {...clone(input.design), objects:(input.design?.objects || []).map(cleanObject)};
  const options = resolvedOptions(config, input.options);
  validateDesign(config, design, options, fonts, motifs);
  return {design, options};
}
export function validatePhotoFile(file) {
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_PHOTO_BYTES) fail('Bitte JPG, PNG oder WebP bis 15 MB auswählen.');
}

export function newEditableObject(config, input, id, fonts, motifs, options = {}) {
  if (!['text','motif'].includes(input.type)) fail('Dieses Element wird nicht zum freien Hinzufügen angeboten.');
  const p = selectedProfile(config, options), {width,height} = p.geometry;
  const o = {...cleanObject(input), id, x:width/2, y:height/2, rotation:0,
    color:getProcessingProfile(p).ink, customerEditable:true, templateOrigin:false};
  if (o.type === 'text') {
    if (!fonts[o.font]) o.font = 'Montserrat';
    o.size = Math.min(o.size || 14, height*.12); o.bold = !!o.bold;
    measureText(o, fonts);
    o.size = Math.max(1, o.size * Math.min(1, width*.6/o.w, height*.3/o.h));
    measureText(o, fonts);
  } else {
    const item = motifs.find(m => m.key === o.motif);
    if (!item) fail('Motiv ist nicht in der Bibliothek.');
    if(item.embeddedOnly===true||config.localResources?.motifs?.some(m=>m.key===o.motif&&m.embeddedOnly===true))fail('Vorlagenmotiv darf nicht zusätzlich eingefügt werden.');
    const [,,w,h] = item.bounds || [0,0,100,100], scale = Math.min(width*.25/w, height*.25/h);
    o.w = w*scale; o.h = h*scale;
  }
  const issue = customerLayoutIssue(o, p); if (issue) fail(issue);
  return o;
}
