import {validateStudio} from '../../platform/sources/app/shared/models/studio-products.mjs';
import {getProcessingProfile} from '../../platform/sources/app/shared/models/processing-profiles.mjs';
import {validateDesignContent, objectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';
import {validateUniversalElements} from '../../platform/sources/app/shared/models/universal-elements.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {localFontIds} from './local-pilot.mjs';

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
  if (!p.binding?.productId || !p.id || !p.revision) fail('Produktbindung und feste Profilrevision fehlen.');
  if (!(review&&config.basePriceCents===null&&config.extraMotifCents===null)&&(!Number.isSafeInteger(config.basePriceCents) || config.basePriceCents < 0 ||
      !Number.isSafeInteger(config.extraMotifCents) || config.extraMotifCents < 0)) fail('Verbindliche Centpreise fehlen.');
  if (typeof config.photo?.enabled !== 'boolean' || config.photo.mode !== 'upload-only') fail('Fotofunktion ausdrücklich festlegen.');
  if (!config.photo.enabled) p.designs = p.designs.filter(d => !d.objects.some(o => o.type === 'photoSlot'));
  if (!p.designs.length) fail('Für dieses Produkt gibt es keine passende Vorlage ohne Fotobereich.');
  // Image resources need their own versioned media manifest, not invented URLs.
  if (p.designs.some(d => d.objects.some(o => o.type === 'image'))) fail('Die feste Bildressource braucht zuerst eine geprüfte Medienzuordnung.');
  getProcessingProfile(p);
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
  for (const group of profile.optionGroups || []) {
    const value = group.values.find(v => v.id === options[group.id]);
    if (value.holes !== undefined) {
      if (holeSelection) fail('Mehrere Optionen bestimmen gleichzeitig das Bohrbild.');
      profile.geometry.holes = clone(value.holes); holeSelection = true;
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
  const seen = new Set();
  let additionalMotifs = 0;
  const lineKeys=new Set((design.marks||[]).map((_,i)=>'ux-line-'+design.id+'-'+i));
  for (const o of objects.filter(o => o.type === 'motif' && !o.uxHidden && !(o.uxDecoration&&lineKeys.has(o.motif)&&o.id===o.motif))) {
    if (included.get(o.id) === o.motif && !seen.has(o.id)) seen.add(o.id);
    else additionalMotifs++;
  }
  let unitCents = config.basePriceCents;
  for (const group of config.profile.optionGroups || []) unitCents += group.values.find(v => v.id === options[group.id]).priceCents;
  unitCents += additionalMotifs * config.extraMotifCents;
  if (!Number.isSafeInteger(unitCents) || !Number.isSafeInteger(unitCents * quantity)) fail('Ungültiger Gesamtpreis.');
  return {currency:'EUR', unitCents, totalCents:unitCents * quantity, quantity, additionalMotifs, options};
}

export function validateDesign(config, design, options, fonts, motifs) {
  const source = config.profile.designs.find(d => d.id === design?.id);
  if (!source) fail('Die Vorlage gehört nicht zu diesem Produkt.');
  validateDesignContent(design, {universal:true,extraFontIds:localFontIds(config)});
  // Local logo uploads carry an opaque upload id, like photo slots. They are not
  // published media resources; the production media validator stays unchanged.
  validateUniversalElements({...design,objects:design.objects.map(o=>
    o.type==='image'&&o.uxUploadKind==='logo'&&o.uxUploadId&&config.logo?.enabled!==false
      ? {...o,type:'photoSlot'} : o)});
  if (JSON.stringify(design.marks || []) !== JSON.stringify(source.marks || [])) fail('Feste Gestaltungslinien wurden verändert.');
  const p = selectedProfile(config, options);
  for (const raw of source.objects.filter(o => o.technicalLocked === true)) {
    const o = design.objects.find(o => o.id === raw.id);
    if (!o || JSON.stringify(cleanObject(o)) !== JSON.stringify(cleanObject(raw))) fail('Ein fester Vorlagenbereich wurde verändert.');
  }
  for (const o of design.objects) {
    if (o.uxPhotoBackground!==undefined && (o.uxUploadKind!=='photo'||!o.uxUploadId||!['remove','keep'].includes(o.uxPhotoBackground))) fail('Ungültige Foto-Aufbereitung.');
    if (o.uxLogoTint!==undefined && (o.uxUploadKind!=='logo'||o.type!=='image'||typeof o.uxLogoTint!=='boolean')) fail('Einfarbige Vorschau ist nur für hochgeladene Logos möglich.');
    if (o.type === 'photoSlot' && !config.photo.enabled) fail('Fotobereich nicht freigegeben.');
    if (o.type === 'image' && !(o.uxUploadKind==='logo'&&o.uxUploadId&&config.logo?.enabled!==false)) fail('Eigene Bilder ausschließlich über den freigegebenen Upload hochladen.');
    if (o.type === 'motif' && !motifs.some(m => m.key === o.motif)) fail('Motiv ist nicht in der Bibliothek.');
    const measured = o.type === 'text' ? measureText(clone(o), fonts) : o;
    const issue = customerLayoutIssue(measured, p); if (issue) fail(issue);
  }
  return design;
}

// Explicit whitelist: no selected objects, embedded photo bytes, arbitrary URLs or credentials.
const objectKeys = ['id','type','x','y','w','h','rotation','color','text','font','size','bold','motif','fieldKey',
  'customerEditable','templateOrigin','includedInDesign','slateIncluded','photoShape','required','shape','filled','strokeWidth','preserveColors',
  'uxHidden','uxLocked','uxUploadId','uxUploadKind','uxLogoTint','uxPhotoBackground','uxDecoration','uxPersonal','cSourceId','technicalLocked'];
export function cleanObject(o) { return Object.fromEntries(objectKeys.filter(k => o[k] !== undefined).map(k => [k, clone(o[k])])); }
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
    const [,,w,h] = item.bounds || [0,0,100,100], scale = Math.min(width*.25/w, height*.25/h);
    o.w = w*scale; o.h = h*scale;
  }
  const issue = customerLayoutIssue(o, p); if (issue) fail(issue);
  return o;
}
