import {isLayeredDoorbell,DOORBELL_SCHEMA,validateDoorbellDefinition,selectedDoorbellProfile,selectedDoorbellDesign,doorbellPriceBase,doorbellLayoutIssue} from './doorbell-selection.mjs';
import {isFamilyFormats,validateFamilyFormats,familyFormatOptions,familyFormatSelection,familyFormatCombinations,familyFormatPrice,selectedFamilyProfile,selectedFamilyDesign} from './family-formats.mjs';
import {QUANTITY_TIER_MAX,quantityTiersIssue,quantityTiersOpen,activeQuantityTiers,quantityTierFor,applyQuantityTier,quantityTierLabels} from './quantity-tiers.mjs';
export {QUANTITY_TIER_MAX,quantityTiersIssue,quantityTiersOpen,activeQuantityTiers,quantityTierFor,applyQuantityTier,quantityTierLabels} from './quantity-tiers.mjs';
import {canDeleteTemplateElement,templateRightsIssue,customerAdditionPolicy,validateCustomerAdditions,designElementRights} from './element-rights.mjs';
import {processProfile,processColorIssue} from '../../workshop/process-profiles.mjs';
import {validateOptionPresentation} from './option-media.mjs';
import {validateStudio} from '../../platform/sources/app/shared/models/studio-products.mjs';
import {getProcessingProfile} from '../../platform/sources/app/shared/models/processing-profiles.mjs';
import {validateDesignContent, surfaceObjectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';
import {validateUniversalElements} from '../../platform/sources/app/shared/models/universal-elements.mjs';
import {measureText,setTextSize} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {localFontIds} from './local-pilot.mjs';
import {acrylicSelection,acrylicOptions} from './acrylic-product.mjs';
import {validSurface} from './material-surface.mjs';
import {validateSteelFormats} from './steel-formats.mjs';
import {textLimits,textLimitIssue,sameSampleText,requiredFieldMessage} from '../../workshop/theme-limits.mjs';
import {optionFields,visibleBy,validateOptionConditions,fieldValue,fieldPrice,fieldRequiredMessage,fieldDisplay} from './option-fields.mjs';
import {validateSurfaces,objectSurface,hasBack,backSurcharge,surfaceProcess} from './surfaces.mjs';
import {editorUi,validateToolbarConfig} from './toolbar-placement-model.mjs';

const clone = value => structuredClone(value);
const fail = message => { throw Error(message); };
// A printed/engraved element does not obstruct a screw. Mechanical access belongs
// to the model-bound plate assembly. Customer artwork may cross every drill
// hole; the finished preview shows hardware, production drills after artwork.
export const customerLayoutIssue=(object,profile,resources)=>profile.doorbellSchema===DOORBELL_SCHEMA?doorbellLayoutIssue(object,profile):surfaceObjectIssue(object,{...profile,geometry:{...profile.geometry,holes:[]}},resources);
export const DRAFT_SCHEMA = 'gravuru-universal-customer-draft/v1';
// Ü6.1: Ebenenrolle. 'guide' ist im Editor sichtbar, erscheint aber nie in der
// Fertigungsausgabe. Standard ohne Angabe ist 'print'. Die Rolle ist ein
// Vorlagenfeld; der Kunde kann sie weder setzen noch ändern.
export const OBJECT_ROLES=Object.freeze(['guide','print']);
export const objectRole=o=>o?.role==='guide'?'guide':'print';
export const isGuideObject=o=>objectRole(o)==='guide';
export const productionObjects=objects=>objects.filter(o=>!o.uxHidden&&!isGuideObject(o));
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
// K10 / Ü1: Verfahrensprofil des Produkts (Werkzeuge, Palette, Mindestschriftgröße, Soll-DPI).
export const productProcess=config=>processProfile(config.profile);
// New product revisions opt in explicitly. Existing logo/photo pricing remains unchanged.
export const vectorLogoAllowed=config=>config?.logo?.enabled===true&&config.logo.vectorUpload===true&&config.logo.extraPriceCents===1299&&config?.photo?.enabled===false&&config?.profile?.material?.kind==='steel'&&productProcess(config).method==='engraving';
// Physischer Maßstab der Gestaltung (Acryl: gewählte Größe / Designbreite, sonst 1).
export function physicalScale(config, options={}) {
  return config.acrylic ? acrylicSelection(acrylicOptions(resolvedOptions(config, options)), config.acrylic.pricing).size.width / config.acrylic.designWidth : 1;
}
export const money = cents => new Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR'}).format(cents / 100);

// This adapter consumes the existing native profile. It never grants a runtime release.
export function prepareConfig(input) {
  const config = clone(input);
  validateToolbarConfig(config);
  if(isLayeredDoorbell(config)){validateDoorbellDefinition(config);config.profile=selectedDoorbellProfile(config);}
  if(config.familyFormats){validateFamilyFormats(config);config.profile=selectedFamilyProfile(config);}
  const p = config.profile;
  if(config.designSelection!==undefined&&config.designSelection!=='all-approved')fail('Designauswahl ist ungültig.');
  if(config.motifCharge!==undefined&&!['additional','all'].includes(config.motifCharge))fail('Motiv-Preisregel ist ungültig.');
  if(config.textRules!==undefined){
    const rules=config.textRules,key=rules&&typeof rules==='object'&&!Array.isArray(rules)?Object.keys(rules).join(','):'';
    if(!['maxCharsPerLine','maxCharsPerField'].includes(key)||!Number.isInteger(rules[key])||rules[key]<1||rules[key]>500)fail('Zeichenregel ist ungültig.');
  }
  if(config.sceneBackground!==undefined&&!validSurface(config.sceneBackground))fail('Ungültiges Szenenbild.');
  if(config.steelFormats){if(p.material?.kind!=='steel')fail('Edelstahlgrößen gehören zu einem Edelstahlschild.');validateSteelFormats(config);}
  const extraFontIds=localFontIds(config);
  const review=config.reviewOnly===true&&p.binding?.kind==='local-review'&&p.features?.orderEnabled===false;
  if(config.reviewOnly&&!review)fail('Prüfprodukt darf keine Shop-Bestellung freigeben.');
  validateStudio(p, p, {extraFontIds,motifs:config.localResources?.motifs||[],fonts:config.localResources?.fonts,catalogSizes:isFamilyFormats(config)});
  // Themenlimits und Pflichtkennzeichen der Vorlage sind Produktregeln: ungültige Werte laden nicht.
  for(const d of p.designs||[])for(const o of d.objects||[])if(o.type==='text'){
    if(o.required!==undefined&&typeof o.required!=='boolean')fail('Pflichtfeld für Text ausdrücklich festlegen.');
    if(o.required===true&&o.customerEditable===false)fail('Ein Pflichttext muss für Kunden bearbeitbar sein.');
    const issue=textLimitIssue(o.text,textLimits(o,d,p,config));if(issue)fail((d.name||d.id)+': Mustertext – '+issue);
  }
  for(const group of p.optionGroups||[])for(const value of group.values)validateOptionPresentation(value);
  validateOptionConditions(p); // K14 / Ü12.1: bedingte Gruppen und Zusatzfelder
  // K14 / Ü15.1: Flächen (Vorder-/Rückseite). Die Rückseite darf ein eigenes Verfahrensprofil
  // tragen, aber dasselbe Verfahren (Gravur/Druck): die Fertigungsausgabe erzeugt beide Dateien
  // im selben Lauf; ein Verfahrenswechsel je Seite ist noch nicht an die Ausgabe angeschlossen.
  validateSurfaces(p);
  if(hasBack(p)&&surfaceProcess(config,'back').method!==processProfile(p).method)fail('Rückseite mit anderem Verfahren (Gravur/Druck) ist noch nicht an die Fertigungsausgabe angeschlossen.');
  if (!p.binding?.productId || !p.id || !p.revision) fail('Produktbindung und feste Profilrevision fehlen.');
  if (!(review&&config.basePriceCents===null&&config.extraMotifCents===null)&&(!Number.isSafeInteger(config.basePriceCents) || config.basePriceCents < 0 ||
      !Number.isSafeInteger(config.extraMotifCents) || config.extraMotifCents < 0)) fail('Verbindliche Centpreise fehlen.');
  if (typeof config.photo?.enabled !== 'boolean' || config.photo.mode !== 'upload-only') fail('Fotofunktion ausdrücklich festlegen.');
  if(config.logo!==undefined&&typeof config.logo.enabled!=='boolean')fail('Logofunktion ausdrücklich festlegen.');
  if(config.logo?.vectorUpload!==undefined&&typeof config.logo.vectorUpload!=='boolean')fail('Vektorlogo-Funktion ausdrücklich festlegen.');
  if(config.logo?.vectorUpload===true&&!vectorLogoAllowed(config))fail('Vektorlogos benötigen Edelstahlgravur ohne Fotoupload und einen ausdrücklichen Aufpreis von 12,99 € je Logo.');
  validateCustomerAdditions(config);
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
  activeQuantityTiers(config);
  getProcessingProfile(p);
  if(config.acrylic)acrylicSelection(acrylicOptions(resolvedOptions(config)),config.acrylic.pricing);
  return config;
}

// Gruppenwahl und Zusatzfelder (K14 / Ü12.1) in einem Objekt. Unsichtbare Gruppen
// und Felder werden verworfen (auch wenn ein Wert mitkommt); leere Felder fehlen.
// Pflichtfelder prüft `validateDesign` (nur sichtbare, nicht im Entwurf).
export function resolvedOptions(config, values = {}) {
  if(isFamilyFormats(config))return familyFormatOptions(config,values);
  const groups = config.profile.optionGroups || [], fields = optionFields(config.profile), result = {};
  if (!values || typeof values !== 'object' || Array.isArray(values)) fail('Ungültige Optionen.');
  for (const key of Object.keys(values)) if (!groups.some(g => g.id === key) && !fields.some(f => f.id === key)) fail('Unbekannte Optionsgruppe.');
  for (const group of groups) {
    if (!visibleBy(group.visibleIf, result)) continue;
    const id = values[group.id] ?? group.defaultValueId;
    if (!group.values.some(v => v.id === id)) fail('Ungültige Auswahl: ' + group.name);
    result[group.id] = id;
  }
  for (const field of fields) {
    if (!visibleBy(field.visibleIf, result)) continue;
    const value = fieldValue(field, values[field.id]??(isLayeredDoorbell(config)&&field.id==='position'?(config.doorbell.defaultPosition??'standard'):undefined));
    if (value !== undefined) result[field.id] = value;
  }
  return result;
}
const visibleFields = (config, options) => optionFields(config.profile).filter(f => visibleBy(f.visibleIf, options));
export const choiceOptions = (config, options) => Object.fromEntries(Object.entries(options).filter(([key]) => (config.profile.optionGroups || []).some(g => g.id === key)));
export const fieldOptions = (config, options) => Object.fromEntries(Object.entries(options).filter(([key]) => optionFields(config.profile).some(f => f.id === key)));
export const visibleGroups = (config, values = {}) => { const options = resolvedOptions(config, values); return (config.profile.optionGroups || []).filter(g => options[g.id] !== undefined); };
export function missingRequiredFields(config, values = {}) {
  const options = resolvedOptions(config, values);
  return visibleFields(config, options).filter(f => f.required === true && options[f.id] === undefined);
}
export const optionFieldCents = (config, options) => visibleFields(config, options).reduce((sum, f) => sum + fieldPrice(f, options[f.id]), 0);
// Sichtbare, ausgefüllte Zusatzfelder für Warenkorb, Bestellung und Fertigungszusammenfassung.
export function optionFieldEntries(config, values = {}) {
  const options = resolvedOptions(config, values);
  return visibleFields(config, options).filter(f => options[f.id] !== undefined).map(f => ({id:f.id, kind:f.kind, label:f.label, value:options[f.id], display:fieldDisplay(f, options[f.id]), priceCents:fieldPrice(f, options[f.id])}));
}
// Ausführungen für Shop-Varianten: alle Kombinationen der Gruppen, unsichtbare Gruppen
// verworfen und doppelte Ausführungen zusammengefasst; Zusatzfelder sind keine Varianten.
export function variantCombinations(config) {
  if(isFamilyFormats(config))return familyFormatCombinations(config);
  let combinations = [{}];
  for (const g of config.profile.optionGroups || []) combinations = combinations.flatMap(o => g.values.map(v => ({...o, [g.id]:v.id})));
  const seen = new Map();
  for (const o of combinations) { const resolved = choiceOptions(config, resolvedOptions(config, o)), key = JSON.stringify(Object.entries(resolved).sort()); if (!seen.has(key)) seen.set(key, resolved); }
  return [...seen.values()];
}

export function selectedProfile(config, values = {}) {
  if(isFamilyFormats(config))return selectedFamilyProfile(config,values);
  if(isLayeredDoorbell(config))return selectedDoorbellProfile(config,resolvedOptions(config,values));
  const profile = clone(config.profile), options = resolvedOptions(config, values);
  let holeSelection = false, finish;
  delete profile.mountingPreview;
  for (const group of profile.optionGroups || []) {
    const value = group.values.find(v => v.id === options[group.id]);
    if (!value) continue; // unsichtbare Gruppe (visibleIf)
    // Farbe der Abstandshalter aus einer eigenen, sichtbaren Gruppe (Familien: je Halterset).
    if (value.holes === undefined && value.spacerFinish !== undefined) finish = value.spacerFinish;
    if (value.holes !== undefined) {
      if (holeSelection) fail('Mehrere Optionen bestimmen gleichzeitig das Bohrbild.');
      profile.geometry.holes = clone(value.holes); holeSelection = true;
      // Zubehör aus der Familie (accessory) zeigt die Vorschau ebenfalls: Abstandshalter und Schrauben (Chris 20.10.2026).
      profile.mountingPreview={spacers:value.spacers===true||value.mountingRule?.accessory==='standoffs',screws:value.mountingRule?.accessory==='screws',diameter:12,finish:value.spacerFinish||'silver',...(Number.isFinite(value.mountingRule?.keepoutMm)?{keepoutMm:value.mountingRule.keepoutMm}:{})};
    }
  }
  if (finish !== undefined && profile.mountingPreview?.spacers) profile.mountingPreview.finish = finish;
  return profile;
}

export function quote(config, objects, designId, values = {}, quantity = 1) {
  if(config.reviewOnly&&config.basePriceCents===null)fail('Preis noch offen.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) fail('Menge: 1 bis 99.');
  const options = resolvedOptions(config, values);
  const design = isFamilyFormats(config)?selectedFamilyDesign(config,designId,options):isLayeredDoorbell(config)?selectedDoorbellDesign(config,designId,options):config.profile.designs.find(d => d.id === designId);
  if (!design) fail('Unbekanntes Design.');
  // Original template motifs are included once. A duplicate must not inherit this credit.
  const included = new Map(design.objects.filter(o => o.type === 'motif').map(o => [o.id, o.motif]));
  const embeddedOnly=new Set((config.localResources?.motifs||[]).filter(m=>m.embeddedOnly===true).map(m=>m.key));
  const seen = new Set();
  let additionalMotifs = 0,visibleMotifs = 0;
  const lineKeys=new Set((design.marks||[]).map((_,i)=>'ux-line-'+design.id+'-'+i));
  for (const o of objects.filter(o => o.type === 'motif' && !o.uxHidden && !isGuideObject(o) && !(o.uxDecoration&&lineKeys.has(o.motif)&&o.id===o.motif))) {
    visibleMotifs++;
    if(embeddedOnly.has(o.motif)&&(included.get(o.id)!==o.motif||o.templateOrigin!==true||seen.has(o.id)))fail('Vorlagenmotiv darf nicht zusätzlich eingefügt werden.');
    if (included.get(o.id) === o.motif && !seen.has(o.id)) seen.add(o.id);
    else additionalMotifs++;
  }
  let unitCents = isFamilyFormats(config)?familyFormatPrice(config,options):isLayeredDoorbell(config)?doorbellPriceBase(config,options):config.acrylic ? acrylicSelection(acrylicOptions(options),config.acrylic.pricing).totalCents : config.steelFormats ? 0 : config.basePriceCents;
  if(!config.acrylic&&!isFamilyFormats(config))for (const group of config.profile.optionGroups || []) if (options[group.id] !== undefined&&!(isLayeredDoorbell(config)&&group.id==='format')) unitCents += group.values.find(v => v.id === options[group.id]).priceCents;
  // Zusatzfelder (Ü12.1): Aufpreis nur sichtbarer, ausgefüllter Felder.
  const fieldCents = optionFieldCents(config, options);
  // Rückseite gestalten (Ü15.1): Aufpreis je Stück, sobald die Rückseite gestaltet ist; offen = nicht buchbar.
  const backCents = backSurcharge(config, objects);
  const chargedMotifs=config.motifCharge==='all'?visibleMotifs:additionalMotifs;
  unitCents += chargedMotifs * config.extraMotifCents + fieldCents + backCents;
  if (!Number.isSafeInteger(unitCents)) fail('Ungültiger Gesamtpreis.');
  // Staffel (Ü11.1) serverseitig auf den Stückpreis; nur Produkte mit Staffelangabe
  // tragen die Zusatzfelder, damit bestehende Preisstände unverändert bleiben.
  const priceConfig=isFamilyFormats(config)?{...config,basePriceCents:familyFormatSelection(config,options).variant.basePriceCents,quantityTiers:familyFormatSelection(config,options).variant.quantityTiers}:config;
  const listUnitCents = unitCents, tier = quantityTierFor(priceConfig, quantity);
  unitCents = applyQuantityTier(listUnitCents, tier, priceConfig.basePriceCents);
  if (!Number.isSafeInteger(unitCents * quantity)) fail('Ungültiger Gesamtpreis.');
  const tiers = priceConfig.quantityTiers === undefined ? {} : {listUnitCents, quantityTier:tier ? {...tier} : null, quantityTierDiscountCents:listUnitCents - unitCents,...(priceConfig.quantityTierScope===undefined?{}:{quantityTierScope:priceConfig.quantityTierScope})};
  return {currency:'EUR', unitCents, totalCents:unitCents * quantity, quantity, additionalMotifs, ...(config.motifCharge==='all'?{chargedMotifs}:{}), options, ...tiers, ...(config.profile.optionFields === undefined ? {} : {fieldCents}), ...(hasBack(config.profile) ? {backCents} : {})};
}

// `template:true` prüft eine Vorlage gegen sich selbst (Händler-Werkstatt):
// dort ist der Mustertext kein Kundenfehler. Warenkorb und Bestellung laufen
// ohne diese Option. `draft:true` (K7) prüft einen unfertigen Kundenentwurf
// (Sitzungsschutz, Konto-Entwurf): alle Strukturregeln gelten, nur der noch
// nicht ersetzte Mustertext eines Pflichtfelds ist erlaubt.
export function validateDesign(config, design, options, fonts, motifs, {template=false,draft=false}={}) {
  const source = selectedProfile(config,options).designs.find(d => d.id === design?.id);
  if (!source) fail('Die Vorlage gehört nicht zu diesem Produkt.');
  if(design.textOnTop!==undefined&&typeof design.textOnTop!=='boolean')fail('Ungültige Textebenen-Regel.');
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
  if(isLayeredDoorbell(config))p.designs=[source]; // Fixed decoration exemptions belong only to this saved template.
  // Ebenenrolle (Ü6.1) ist Vorlagensache: Vorlagenobjekte behalten ihre Rolle,
  // neue Kundenobjekte sind immer Druck-/Gravurebenen.
  for (const o of design.objects) {
    if (o.role !== undefined && !OBJECT_ROLES.includes(o.role)) fail('Ungültige Ebenenrolle.');
    const raw = source.objects.find(s => s.id === o.id);
    if (raw ? objectRole(o) !== objectRole(raw) : isGuideObject(o)) fail('Die Ebenenrolle einer Vorlage kann nicht vom Kunden geändert werden.');
  }
  // Geometry locks are product rules, not just disabled drag handles. Colour
  // and an uploaded photograph may change without changing the fixed layout.
  const fixedKeys=['type','x','y','w','h','rotation','fieldKey','photoShape','photoMaskAssetId','shape','filled','strokeWidth','motif','assetId','required','acrylicFixed'];
  for(const raw of source.objects.filter(o=>o.acrylicFixed===true)){
    const matches=design.objects.filter(o=>o.id===raw.id),o=matches[0];
    // Removal is judged by the delete right in the element-rights gate below.
    if(!matches.length)continue;
    const replaceMotif=raw.type==='motif'&&config.workshopElementRights?.[source.id]?.[raw.id]?.replace===true;
    if(matches.length!==1||o.uxHidden===true||fixedKeys.some(key=>!(key==='motif'&&replaceMotif)&&o[key]!==raw[key]))fail('Ein fester Acrylglas-Vorlagenbereich wurde verändert.');
  }
  for (const raw of source.objects.filter(o => o.technicalLocked === true)) {
    const o = design.objects.find(o => o.id === raw.id);
    if (!o || JSON.stringify(cleanObject(o)) !== JSON.stringify(cleanObject(raw))) fail('Ein fester Vorlagenbereich wurde verändert.');
  }
  // Pflichttexte (Ü2.2): vorhanden, sichtbar und nicht mehr der Mustertext der Vorlage.
  // Flächen (Ü15.1): Vorlagenelemente bleiben auf ihrer Seite, neue Elemente nur auf vorhandenen
  // Seiten; eine gestaltete Rückseite braucht ihren Aufpreis (offen sperrt, außer Vorlage/Entwurf).
  for (const o of design.objects) {
    if (o.surfaceId !== undefined && o.surfaceId !== 'front' && !(o.surfaceId === 'back' && hasBack(config.profile))) fail('Dieses Produkt hat keine solche Seite.');
    const raw = source.objects.find(s => s.id === o.id);
    if (raw && objectSurface(o) !== objectSurface(raw)) fail('Ein Vorlagenelement bleibt auf seiner Seite.');
  }
  if(!template&&!draft)backSurcharge(config,design.objects);
  // Pflicht-Zusatzfelder (Ü12.1): nur sichtbare, nicht in Vorlage oder Entwurf.
  if(!template&&!draft){const missing=missingRequiredFields(config,options);if(missing.length)fail(fieldRequiredMessage(missing[0]));}
  if(!template&&!draft)for(const raw of source.objects.filter(o=>o.type==='text'&&o.required===true)){
    const o=design.objects.find(o=>o.id===raw.id);
    if(!o||o.type!=='text'||o.uxHidden===true||sameSampleText(o.text,raw.text))fail(requiredFieldMessage(raw));
  }
  for (const o of design.objects) {
    // Zeichen-/Zeilenlimit (Ü3.1) aus der Vorlage, nie aus dem Kundenobjekt.
    if(o.type==='text'){
      const raw=source.objects.find(r=>r.id===o.id&&r.type==='text');
      if((raw??o).customerEditable!==false){const issue=textLimitIssue(o.text,textLimits(raw,source,config.profile,config));if(issue)fail(issue);}
    }
    if(o.uxPhotoCrop!==undefined){
      const c=o.uxPhotoCrop;
      if(o.type!=='photoSlot'||!o.uxUploadId||!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['zoom','x','y','angle'].includes(k))||![c.zoom,c.x,c.y,c.angle??0].every(Number.isFinite)||c.zoom<.25||c.zoom>4||Math.abs(c.x)>1||Math.abs(c.y)>1||Math.abs(c.angle??0)>3600)fail('Ungültige Foto-Ausrichtung.');
    }
    if (o.uxPhotoColor!==undefined && (o.type!=='photoSlot'||o.uxUploadKind!=='photo'||!o.uxUploadId||!['original','grayscale','sepia'].includes(o.uxPhotoColor))) fail('Ungültige Fotofarbe.');
    if (o.uxPhotoBackground!==undefined && (o.uxUploadKind!=='photo'||!o.uxUploadId||!['remove','keep'].includes(o.uxPhotoBackground))) fail('Ungültige Foto-Aufbereitung.');
    if (o.uxLogoTint!==undefined && (o.uxUploadKind!=='logo'||o.type!=='image'||typeof o.uxLogoTint!=='boolean')) fail('Einfarbige Vorschau ist nur für hochgeladene Logos möglich.');
    if(o.uxVectorLogo!==undefined){
      const v=o.uxVectorLogo;
      if(!vectorLogoAllowed(config)||o.type!=='image'||o.uxUploadKind!=='logo'||!o.uxUploadId||!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==3||Object.keys(v).some(k=>!['version','sourceSha256','outputSha256'].includes(k))||v.version!=='svg-black-v1'||!['sourceSha256','outputSha256'].every(k=>typeof v[k]==='string'&&/^[a-f0-9]{64}$/.test(v[k]))||o.uxLogoTint!==undefined)fail('Vektorlogo muss als geprüfte schwarze Gravurfassung vorliegen.');
    }
    if(config.logo?.vectorUpload===true&&o.uxUploadKind==='logo'&&o.uxVectorLogo===undefined)fail('Für dieses Produkt bitte ein geprüftes SVG-Vektorlogo hochladen.');
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
    const issue = customerLayoutIssue(measured, p, {motifs:config.localResources?.motifs||[],fonts}); if (issue) fail(issue);
  }
  // Element rights (rights document or legacy flags), fixed template layer order
  // and the product's addition policy, enforced for every server entry point
  // (draft, cart handoff, order intake) and the client alike.
  const rightsIssue=templateRightsIssue(config,design,source,design.objects); if(rightsIssue)fail(rightsIssue);
  // Verfahrensprofil (K10 / Ü1.2): Gravur erlaubt keine Farbänderung, Druck nur die
  // Profilpalette (Produktauswahl grenzt ein); Texte, die der Kunde skalieren darf,
  // nicht unter der Mindestschriftgröße des Verfahrens. Vorlagen prüft die Werkstatt
  // gegen sich selbst (template:true) ohne die Mindestgröße.
  const process = productProcess(config), scale = physicalScale(config, options), rights = designElementRights(config, source.id, source.objects);
  const backProcess = hasBack(config.profile) ? surfaceProcess(config, 'back') : process, processOf = o => objectSurface(o) === 'back' ? backProcess : process;
  const colorSelection = config.workshopProfiles?.selections?.colors ?? null, designColors = source.objects.map(s => s.color);
  for (const o of design.objects) {
    if (o.uxHidden || isGuideObject(o) || o.type === 'photoSlot') continue;
    const raw = source.objects.find(s => s.id === o.id);
    const colorIssue = processColorIssue(processOf(o), o.color, {templateColor: raw?.color, designColors, selection: colorSelection}); if (colorIssue) fail(colorIssue);
    if (template || o.type !== 'text' || !(raw ? rights[raw.id]?.scale === true : true)) continue;
    const min = processOf(o).minTextMm;
    if (!Number.isFinite(o.size) || o.size * scale < min - 0.005) fail('Text zu klein: mindestens ' + String(min).replace('.', ',') + ' mm bei diesem Verfahren.');
  }
  return design;
}

// Explicit whitelist: no selected objects, embedded photo bytes, arbitrary URLs or credentials.
const objectKeys = ['id','type','x','y','w','h','rotation','color','text','font','size','bold','italic','motif','fieldKey',
  'letterSpacing','textAnchor','lineHeight','customerEditable','templateOrigin','includedInDesign','slateIncluded','photoShape','photoMaskAssetId','required','shape','filled','strokeWidth','preserveColors','acrylicFixed',
  'uxHidden','uxLocked','uxUploadId','uxUploadKind','uxLogoTint','uxVectorLogo','uxPhotoBackground','uxPhotoCrop','uxPhotoColor','uxDecoration','uxPersonal','cSourceId','technicalLocked','assetId','opacity','locked','role','surfaceId'];
export function cleanObject(o) { return Object.fromEntries(objectKeys.filter(k => o[k] !== undefined).map(k => [k, clone(o[k])])); }
export function editedDesignTexts(config,state){
 const source=selectedProfile(config,state.mOptions||{}).designs.find(d=>d.id===state.designId);
 return new Map(state.objects.filter(o=>o.type==='text'&&o.fieldKey&&o.customerEditable!==false&&
  o.text!==source?.objects.find(original=>original.fieldKey===o.fieldKey)?.text).map(o=>[o.fieldKey,o.text]));
}

export function designFromState(config, state, values=state.mOptions||{}) {
  const source = selectedProfile(config,values).designs.find(d => d.id === state.designId);
  if (!source) fail('Unbekanntes Design.');
  return {...clone(source), textOnTop:true, objects:state.objects.map(cleanObject)};
}
export function saveDraft(config, state, options, fonts, motifs, {draft=false}={}) {
  const design = designFromState(config, state, options);
  validateDesign(config, design, options, fonts, motifs, {draft});
  const ui=editorUi(state.ui);
  return {schema:DRAFT_SCHEMA, profileId:config.profile.id, profileRevision:config.profile.revision,
    productId:config.profile.binding.productId, design, options:resolvedOptions(config, options),...(ui?{ui}:{})};
}
export function readDraft(config, input, fonts, motifs, {draft=false}={}) {
  if (new TextEncoder().encode(JSON.stringify(input)).length > 2_000_000) fail('Entwurfsdatei ist zu groß.');
  if (input?.schema !== DRAFT_SCHEMA || input.profileId !== config.profile.id || input.profileRevision !== config.profile.revision || input.productId !== config.profile.binding.productId) fail('Entwurf gehört zu einem anderen Produkt oder einer anderen Vorlagenrevision.');
  const design = {...clone(input.design), objects:(input.design?.objects || []).map(cleanObject)};
  const options = resolvedOptions(config, input.options);
  validateDesign(config, design, options, fonts, motifs, {draft});
  const ui=editorUi(input.ui);
  return {design, options,...(ui?{ui}:{})};
}
// Gestaltungslinien einer Vorlage (`marks`) werden im Kundeneditor als
// Motive `ux-line-<design>-<n>` registriert (ux.mjs addDecoration). Ein
// Server, der einen Kundenentwurf prüft, ergänzt seine Motivliste damit.
export const decorationMotifs = design => (design?.marks || []).map((_, i) => ({key:'ux-line-' + design.id + '-' + i, svgFragment:''}));
export function validatePhotoFile(file) {
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_PHOTO_BYTES) fail('Bitte JPG, PNG oder WebP bis 15 MB auswählen.');
}

export function newEditableObject(config, input, id, fonts, motifs, options = {}) {
  if (!['text','motif'].includes(input.type)) fail('Dieses Element wird nicht zum freien Hinzufügen angeboten.');
  const policy=customerAdditionPolicy(config);
  if(!(input.type==='text'?policy.text:policy.motifs))fail(input.type==='text'?'Eigener Text ist bei diesem Produkt nicht vorgesehen.':'Eigene Motive sind bei diesem Produkt nicht vorgesehen.');
  const p = selectedProfile(config, options), {width,height} = p.geometry;
  const area=isLayeredDoorbell(config)?p.geometry.designArea:null;
  const o = {...cleanObject(input), id, x:area?(area.left+area.right)/2:width/2, y:area?(area.top+area.bottom)/2:height/2, rotation:0,
    color:getProcessingProfile(p).ink, customerEditable:true, templateOrigin:false};
  delete o.role; // Neue Kundenelemente sind immer Druck-/Gravurebenen (Ü6.1).
  if (o.surfaceId !== undefined && !(o.surfaceId === 'front' || (o.surfaceId === 'back' && hasBack(config.profile)))) fail('Dieses Produkt hat keine solche Seite.');
  if (o.type === 'text') {
    if (!fonts[o.font]) o.font = 'Montserrat';
    setTextSize(o, Math.min(o.size || 14, height*.12)); o.bold = !!o.bold;
    measureText(o, fonts);
    // Nie unter die Mindestschriftgröße des Verfahrens (K10), in Designeinheiten.
    setTextSize(o, Math.max(productProcess(config).minTextMm / physicalScale(config, options), o.size * Math.min(1, width*.6/o.w, height*.3/o.h)));
    measureText(o, fonts);
  } else {
    const item = motifs.find(m => m.key === o.motif);
    if (!item) fail('Motiv ist nicht in der Bibliothek.');
    if(item.embeddedOnly===true||config.localResources?.motifs?.some(m=>m.key===o.motif&&m.embeddedOnly===true))fail('Vorlagenmotiv darf nicht zusätzlich eingefügt werden.');
    const [,,w,h] = item.bounds || [0,0,100,100], scale = Math.min(width*.25/w, height*.25/h);
    o.w = w*scale; o.h = h*scale;
  }
  const issue = customerLayoutIssue(o, p, {fonts,motifs:config.localResources?.motifs||[]}); if (issue) fail(issue);
  return o;
}

