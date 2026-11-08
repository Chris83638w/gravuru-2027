import {nativeFamilyAcrylicConfig} from './family-acrylic-product.mjs';
import {nativeDoorbellConfig} from './doorbell-product.mjs';
import {workshopResources} from './catalog.mjs';
import {isLayeredDoorbell} from '../configurator/variant-m/doorbell-selection.mjs';
import {isFamilyFormats} from '../configurator/variant-m/family-formats.mjs';
import {isFormProduct,validateFormProduct} from './form-product.mjs';
import {nativeSlateConfig} from './slate-product.mjs';
import {nativeSpecimenConfig} from './specimen-product.mjs';
import {prepareConfig,resolvedOptions,selectedProfile,quote,validateDesign,cleanObject,productProcess} from '../configurator/variant-m/contract.mjs';
import {applyNewMotifRights,checkWholePrintDesign} from '../configurator/variant-m/new-motif-rights.mjs';
import {ACRYLIC_BASES,ACRYLIC_SIZES,acrylicSelection,acrylicOptions} from '../configurator/variant-m/acrylic-product.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {physicalGeometry} from '../configurator/variant-m/print-geometry.mjs';
import {legacyElementRights,ELEMENT_RIGHTS} from '../configurator/variant-m/element-rights.mjs';

export const PRODUCT_SCHEMA='gravuru-product/v1';
const PROFILE_TYPES=['fonts','motifs','colors','bestsellers'];
const RIGHTS=ELEMENT_RIGHTS;
const DOCUMENT_KEYS=['schema','name','kind','masterId','categoryIds','seo','profileAssignments','elementRights','config'];
const resolutionSnapshots=new WeakSet();
// A synchronous internal batch validates once and receives a detached, deeply
// frozen document. There is no caller-controlled "already validated" flag.
// Outside the callback resolveProduct keeps its normal validation behaviour.
export function withProductResolutionSnapshot(document,read){
  if(typeof read!=='function')throw Error('Eine synchrone Produktprüfung ist erforderlich.');
  if(resolutionSnapshots.has(document)){const result=read(document);if(result?.then instanceof Function)throw Error('Die Produktprüfung darf nicht asynchron sein.');return result;}
  const validated=validateProductDocument(document),seen=new WeakSet();
  function freeze(value){if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);Object.values(value).forEach(freeze);Object.freeze(value);}}
  freeze(validated);resolutionSnapshots.add(validated);
  try{const result=read(validated);if(result?.then instanceof Function)throw Error('Die Produktprüfung darf nicht asynchron sein.');return result;}
  finally{resolutionSnapshots.delete(validated);}
}
const fail=message=>{throw Error(message);};
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
function keys(value,expected,label){
  if(!record(value)||Object.keys(value).length!==expected.length||expected.some(key=>!Object.hasOwn(value,key)))fail(label+': Felder fehlen oder sind unbekannt.');
}
function text(value,min,max,label){
  if(typeof value!=='string'||value.trim().length<min||value.length>max)fail(label+': ungültiger Text.');
  return value.trim();
}
function jsonData(value,seen=new Set()){
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'&&Number.isFinite(value))return;
  if((!Array.isArray(value)&&!record(value))||seen.has(value))fail('Das Produkt muss aus vollständigen JSON-Daten bestehen.');
  seen.add(value);for(const child of Object.values(value))jsonData(child,seen);seen.delete(value);
}
// Explicit motif replacement is independent of a fixed-size viewport. Stored
// rights remain authoritative; reading a revision never enables new rights.
const capability=object=>({...legacyElementRights(object),replace:legacyElementRights(object).replace||(object.type==='motif'&&object.role!=='guide'&&!object.technicalLocked&&!object.locked&&object.customerEditable!==false),delete:!object.technicalLocked});
function initialRights(config){
  // Keep the released layered-doorbell authoring contract. Its format-specific
  // originals are separate from the root selection and must not be changed only
  // at the root when creating the immutable document.
  if(isLayeredDoorbell(config))return Object.fromEntries(config.profile.designs.map(design=>[design.id,Object.fromEntries(design.objects.map(object=>[object.id,legacyElementRights(object)]))]));
  return Object.fromEntries((isFamilyFormats(config)?config.familyFormats.designs:config.profile.designs).map(design=>[design.id,Object.fromEntries(design.objects.map(object=>[object.id,applyNewMotifRights(object,legacyElementRights(object),design)]))]));
}

// This first document model deliberately supports the existing rectangular
// acrylic pilot. Other materials, arbitrary contours and design filtering need
// their own verified geometry/import adapters; they are not inferred here.
function nativeAcrylicConfig(input){
  if(!record(input)||!record(input.profile)||!record(input.acrylic)||input.acrylic.version!==1||!record(input.acrylic.pricing))fail('Ein natives Acryl-Pilotprodukt mit versionierten Preisen ist erforderlich.');
  const config=structuredClone(input),profile=config.profile;
  if(profile.kind!=='universal-product'||profile.material?.kind!=='acrylic'||profile.geometry?.shape!=='rect'||profile.geometry?.holes?.length!==0||profile.geometry?.width!==ACRYLIC_SIZES.small.width||profile.geometry?.height!==ACRYLIC_SIZES.small.height||config.acrylic.designWidth!==profile.geometry.width||config.acrylic.designHeight!==profile.geometry.height)fail('Der Acrylpilot benötigt die kanonische rechteckige Designfläche 150 × 200 mm ohne Bohrungen.');
  if(!Array.isArray(profile.designs)||!profile.designs.length||!profile.designs.some(design=>design.id===profile.defaultDesignId))fail('Das Standarddesign verweist auf keine vorhandene Vorlage.');
  const groups=profile.optionGroups,allowed={size:Object.keys(ACRYLIC_SIZES),base:ACRYLIC_BASES.map(base=>base.id),wall:['none','wall']};
  if(!Array.isArray(groups)||groups.length!==3||new Set(groups.map(group=>group.id)).size!==3||groups.some(group=>!Object.hasOwn(allowed,group.id)))fail('Acrylvarianten benötigen genau Größe, Sockel und Wandhalterung.');
  const basePrice=acrylicSelection({size:'small',base:'none',wall:'none'},config.acrylic.pricing).size.basePriceCents;
  config.basePriceCents=basePrice;
  for(const group of groups){
    if(!Array.isArray(group.values)||!group.values.length||group.values.some(value=>!allowed[group.id].includes(value.id)))fail('Eine Variante verweist auf eine unbekannte Acryl-Ausführung.');
    for(const value of group.values){
      const choice=acrylicSelection({[group.id]:value.id},config.acrylic.pricing);
      // These are compatibility mirrors for the current editor, never an
      // independent persisted source of the commercial calculation.
      value.priceCents=group.id==='size'?choice.size.basePriceCents-basePrice:group.id==='base'?choice.baseCents:choice.wallCents;
    }
  }
  for(const design of profile.designs)for(const object of design.objects||[])if(object.type==='text')measureText(object,config.localResources?.fonts||{});
  const validated=prepareConfig(config);
  if(validated.profile.designs.length!==profile.designs.length)fail('Ein gespeichertes Design widerspricht der freigegebenen Fotofunktion.');
  for(const size of groups.find(group=>group.id==='size').values)for(const base of groups.find(group=>group.id==='base').values)for(const wall of groups.find(group=>group.id==='wall').values)acrylicSelection({size:size.id,base:base.id,wall:wall.id},config.acrylic.pricing);
  return validated;
}

const nativeConfig = input => isFamilyFormats(input) ? prepareConfig(input) : input?.familyAcrylic ? nativeFamilyAcrylicConfig(input) : isLayeredDoorbell(input) ? nativeDoorbellConfig(input) : input?.doorbell||input?.profile?.material?.kind==='steel' ? nativeSpecimenConfig(input) : input?.profile?.material?.kind==='slate' ? nativeSlateConfig(input) : nativeAcrylicConfig(input);

export function makeProductDocument(input,{name,kind='product',masterId=null}={}){
  const config=nativeConfig(input),title=text(name??config.profile.name,1,200,'Produktname');
  return validateProductDocument({schema:PRODUCT_SCHEMA,name:title,kind,masterId,categoryIds:[],seo:{title:title.slice(0,70),description:''},
    profileAssignments:Object.fromEntries(PROFILE_TYPES.map(type=>[type,{mode:'inherit',profileId:null}])),elementRights:initialRights(config),config});
}

export function validateProductDocument(document){
  jsonData(document);if(isFormProduct(document))return validateFormProduct(document);keys(document,[...DOCUMENT_KEYS,...(Object.hasOwn(document,'productionProfile')?['productionProfile']:[])],'Produktdokument');
  if(document.productionProfile!==undefined&&document.productionProfile!==null){keys(document.productionProfile,['id','revision'],'Fertigungsprofil');if(!id(document.productionProfile.id)||!Number.isSafeInteger(document.productionProfile.revision)||document.productionProfile.revision<1)fail('Ungültiger Fertigungsprofilstand.');}
  if(document.schema!==PRODUCT_SCHEMA)fail('Unbekannte Version des Produktdokuments.');
  const result=structuredClone(document);
  result.name=text(result.name,1,200,'Produktname');
  if(!['product','master'].includes(result.kind))fail('Produkttyp muss Produkt oder Master sein.');
  if(result.masterId!==null&&!id(result.masterId))fail('Ungültige Masterreferenz.');
  if(!Array.isArray(result.categoryIds)||result.categoryIds.length>100||result.categoryIds.some(value=>!id(value))||new Set(result.categoryIds).size!==result.categoryIds.length)fail('Kategorien benötigen eindeutige IDs.');
  keys(result.seo,['title','description'],'SEO');
  result.seo.title=text(result.seo.title,0,70,'SEO-Titel');result.seo.description=text(result.seo.description,0,160,'SEO-Beschreibung');
  keys(result.profileAssignments,PROFILE_TYPES,'Profilzuordnungen');
  for(const type of PROFILE_TYPES){
    const assignment=result.profileAssignments[type];keys(assignment,['mode','profileId'],'Profil '+type);
    if(!['inherit','empty','override'].includes(assignment.mode)||(assignment.mode==='override'?!id(assignment.profileId):assignment.profileId!==null))fail('Profil '+type+': Vererben, ausdrücklich leer oder gültige Überschreibung festlegen.');
  }
  if(!record(result.config)||!record(result.config.profile))fail('Die native Produktvorlage fehlt.');
  result.config.profile.name=result.name;
  result.config=nativeConfig(result.config);
  const templates=isFamilyFormats(result.config)?result.config.familyFormats.designs:result.config.profile.designs;
  keys(result.elementRights,templates.map(design=>design.id),'Designrechte');
  for(const design of templates){
    checkWholePrintDesign(design,productProcess(result.config).method);
    if(design.customerFields!==undefined){
      if(!design.importedSource||!Array.isArray(design.customerFields)||design.customerFields.length>19)fail('Kundenfelder brauchen eine importierte Vorlage und höchstens 19 Zuordnungen.');
      const seen=new Set();
      for(const field of design.customerFields){
        keys(field,['id','label'],'Kundenfeld');
        const object=design.objects.find(o=>o.id===field.id);
        if(!id(field.id)||seen.has(field.id)||!object||!['text','photoSlot'].includes(object.type)||!object.fieldKey)fail('Kundenfeld verweist auf kein eindeutiges Text- oder Fotoelement.');
        text(field.label,1,80,'Kundenfeldname');seen.add(field.id);
      }
    }
    const designRights=result.elementRights[design.id];keys(designRights,design.objects.map(object=>object.id),'Elementrechte '+design.id);
    for(const object of design.objects){
      const rights=designRights[object.id],allowed=capability(object);keys(rights,RIGHTS,'Rechte '+object.id);
      if(design.wholePrintDesign===true&&object.type==='motif'&&(rights.replace||rights.delete))fail('Ein als Einheit verkauftes Druck-Design bleibt vor Entfernen und Ersetzen geschützt.');
      if(RIGHTS.some(right=>typeof rights[right]!=='boolean'||rights[right]&&!allowed[right]))fail('Element '+object.id+': Rechte widersprechen dem Typ oder einem festen Vorlagenbereich.');
    }
  }
  return result;
}

export function resolveProduct(document,{options={},designId}={}){
  const product=resolutionSnapshots.has(document)?document:validateProductDocument(document),config=product.config;
  const resolved=resolvedOptions(config,options),selected=selectedProfile(config,resolved);
  const chosenId=designId===undefined?selected.defaultDesignId:designId;
  const design=selected.designs.find(item=>item.id===chosenId);
  if(!design)fail('Das gewählte Design gehört nicht zu diesem Produkt.');
  const profile=selected,selection=config.acrylic?acrylicSelection(acrylicOptions(resolved),config.acrylic.pricing):null;
  const width=config.acrylic?.designWidth??profile.geometry.width,height=config.acrylic?.designHeight??profile.geometry.height;
  const physical=physicalGeometry(config,{mOptions:resolved});
  return {config,profile,designId:chosenId,design:structuredClone(design),resolvedOptions:resolved,
    price:quote(config,design.objects,chosenId,resolved),
    physical:{widthMm:physical.width,heightMm:physical.height,thicknessMm:profile.material.thicknessMm,insertionMm:selection?.base.insertionMm??0},
    designSpace:{widthMm:width,heightMm:height,scaleX:physical.width/width,scaleY:physical.height/height},
    elementRights:structuredClone(product.elementRights[chosenId])};
}

// A server must call this against its saved document, not a client-supplied
// rights table. Element rights, template layer order and the addition policy
// are enforced inside `validateDesign` (contract.mjs) from the saved
// `elementRights`, followed by the content/geometry/media validation.
export function validateProductDesign(document,design,{options={},fonts,motifs,template=false,draft=false}={}){
  const product=validateProductDocument(document),config=product.config;
  const source=selectedProfile(config,options).designs.find(item=>item.id===design?.id);
  if(!source||!Array.isArray(design.objects))fail('Kundendesign gehört zu keiner Produktvorlage.');
  const fontLibrary=fonts??(isLayeredDoorbell(config)&&design.objects.some(o=>o.type==='text')?workshopResources(config.localResources).fonts:config.localResources?.fonts??{});
  const validated=validateDesign({...config,workshopElementRights:product.elementRights},design,resolvedOptions(config,options),fontLibrary,motifs??config.localResources?.motifs??[],{template,draft});
  const result={...structuredClone(validated),objects:validated.objects.map(cleanObject)};
  for(const object of result.objects.filter(item=>item.type==='text'))measureText(object,fontLibrary);
  return result;
}

