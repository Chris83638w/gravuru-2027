import {isDeepStrictEqual} from 'node:util';
import {createGalleryShopSync} from './gallery-shop-sync.mjs';
import {nativeSource,composeNativeTarget,assertNativeTargetIdentity,ensureNativeAssets,syncFail,syncHash} from './gallery-shop-sync-native.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {applyModuleProfile,nativeModuleAvailability,MODULE_KEYS,MODULE_LABELS} from '../configurator/variant-m/module-profile.mjs';

const copy=structuredClone,same=isDeepStrictEqual;
const fail=(code,message)=>syncFail(code,message,422);
const positive=n=>Number.isSafeInteger(n)&&n>0;
const controls={photo:['enabled'],logo:['enabled','vectorUpload'],customerAdditions:['text','motifs']};
function withoutControls(config,key){const result=copy(config[key]||{});for(const name of controls[key])delete result[name];return result;}

/** Server-owned mappings from the existing gallery/family registry. No browser
 * documents, prices, invented IDs, product creation or variant deletion here.
 * moduleUpdate pins a profile and the SAME target product's native capability
 * revision. designs explicitly maps existing originals to existing design IDs.
 */
export function createGalleryModuleProjection({sourceWorkshop,targetWorkshop,moduleProfiles,sourceApproval}={}){
 const tenant=targetWorkshop?.repository?.tenantId;
 if(!tenant||sourceWorkshop?.repository?.tenantId!==tenant||moduleProfiles?.tenantId!==tenant||typeof sourceApproval!=='function')fail('gallery_module_scope','Modulbibliothek und beide Werkstätten müssen zum selben Mandanten gehören; die Designfreigabe muss vorhanden sein.');
 function read(mapping){
  const update=mapping.moduleUpdate,items=mapping.designs;
  if(!update&&!items) return nativeSource(sourceWorkshop,mapping.source);
  if(items&&(!Array.isArray(items)||!items.length||items.length>500||new Set(items.map(i=>i.target?.designId)).size!==items.length))fail('gallery_module_designs','Eine Designgruppe benötigt eindeutige bestehende Designzuordnungen.');
  const designs=(items||[]).map(item=>{
   if(!item.source?.productId||!item.source.designId||!item.source.originalId||!item.target?.designId)fail('gallery_module_designs','Die Original- und Zielkennungen der Designgruppe fehlen.');
   const source=nativeSource(sourceWorkshop,item.source),approval=sourceApproval({source,mapping:{...mapping,source:item.source,target:{...mapping.target,...item.target}},target:mapping});
   if(approval?.then||approval?.approved!==true)fail('gallery_sync_source_approval',approval?.reason||'Jedes Design der Gruppe benötigt seine aktuelle Sichtfreigabe.');
   return {identity:copy(item),source};
  });
  let module=null,capability=null;
  if(update){
   if(Object.keys(update).some(k=>!['id','revision','sourceRevision'].includes(k))||typeof update.id!=='string'||!positive(update.revision)||!positive(update.sourceRevision))fail('gallery_module_profile','Modulprofil und ursprüngliche Produktrechte benötigen feste Revisionen.');
   module=moduleProfiles.get(update.id);
   if(module.revision!==update.revision)fail('gallery_module_profile_changed','Das Modulprofil wurde geändert. Bitte eine neue Änderungsvorschau erstellen.');
   capability=targetWorkshop.repository.get(mapping.target.productId,{revision:update.sourceRevision});
   if(capability.status==='archived'||capability.document.kind!=='product')fail('gallery_module_source','Die ursprüngliche native Produktquelle ist nicht verfügbar.');
   if(capability.document.config.moduleProfile&&MODULE_KEYS.some(key=>module.profile.modules[key]&&!capability.document.config.moduleProfile.modules[key]))fail('gallery_module_source','Die gewählte Ursprungsrevision enthält bereits abgeschaltete Module. Für das Wiedereinschalten bitte die tatsächlich freigegebene native Ursprungsrevision wählen.');
  }
  const record=designs[0]?.source.record||capability;
  const evidence={...mapping.source,revision:record.revision,designs:designs.map(d=>({identity:d.identity,source:d.source.evidence})),
   module:module?{id:module.id,revision:module.revision,sha256:module.sha256}:null,
   capability:capability?{id:capability.id,revision:capability.revision,sha256:syncHash(capability.document)}:null};
  return {record,designs,module,capability,evidence:{...evidence,fingerprint:syncHash(evidence)}};
 }
 function assert(source,record,mapping){
  if(!source.designs)return assertNativeTargetIdentity(source,record,mapping.target);
  if(record.status==='archived'||record.document.kind!=='product'||record.id!==mapping.target.productId)fail('gallery_module_target','Die vorhandene Produktzuordnung stimmt nicht mehr.');
  if(source.capability&&source.capability.id!==record.id)fail('gallery_module_source','Die ursprünglichen Modulrechte müssen zu genau demselben Produkt gehören.');
  for(const d of source.designs)assertNativeTargetIdentity(d.source,record,d.identity.target,{allowSecondary:true});
  // Changing policy never changes the product's native price/limit contract.
  if(source.capability)for(const key of Object.keys(controls))if(!same(withoutControls(record.document.config,key),withoutControls(source.capability.document.config,key)))
   fail('gallery_module_capability_changed','Die gespeicherten Upload-/Motiv-/Textgrenzen oder Zusatzpreise haben sich geändert. Bitte zuerst die passende native Produktrevision bestätigen.');
 }
 function compose(source,record,mapping){
  if(!source.designs)return composeNativeTarget(source,record,mapping.target);
  assert(source,record,mapping);
  let document=copy(record.document);
  for(const d of source.designs)document=composeNativeTarget(d.source,{...record,document},d.identity.target,{allowSecondary:true});
  if(source.module){
   const base=source.capability.document.config;
   // Restore only permissions from the pinned native revision. All artwork,
   // pricing, format rules, resource references and historical revisions stay.
   for(const [key,names]of Object.entries(controls)){
    if(!base[key]&&!document.config[key])continue;
    document.config[key]??={};
    for(const name of names){if(base[key]?.[name]===undefined)delete document.config[key][name];else document.config[key][name]=copy(base[key][name]);}
    if(!Object.keys(document.config[key]).length&&!base[key])delete document.config[key];
   }
   delete document.config.moduleProfile;
   document.config=applyModuleProfile(document.config,source.module.profile);
  }
  const before=prepareShopProduct(record),after=prepareShopProduct({...record,document});
  for(const key of ['variants','seo','title'])if(!same(before[key],after[key]))fail('gallery_module_commerce','Dieser Abgleich darf keine Preise, Größen, Befestigungen, Titel oder SEO verändern. Änderungen am Angebot benötigen einen eigenen bestätigten Abgleich.');
  return document;
 }
 async function ensureAssets(source){
  if(!source.designs)return ensureNativeAssets(sourceWorkshop,targetWorkshop,source);
  for(const d of source.designs)await ensureNativeAssets(sourceWorkshop,targetWorkshop,d.source);
 }
 function describe(source,record,document,mapping){
  const changes=[];
  const available=nativeModuleAvailability(record.document.config);
  if(source.module)for(const key of MODULE_KEYS){const before=record.document.config.moduleProfile?.modules[key]??available[key],after=source.module.profile.modules[key];if(before!==after)changes.push({kind:'module',key,label:MODULE_LABELS[key],before,after});}
  const designSources=source.designs||[{identity:{target:mapping.target},source}];
  for(const d of designSources){const old=record.document.config.profile.designs.find(v=>v.id===d.identity.target.designId),next=document.config.profile.designs.find(v=>v.id===d.identity.target.designId);changes.push({kind:'design',designId:next.id,originalId:d.source.evidence.originalId,label:next.name,changed:!same(old,next),startDesign:next.id===document.config.profile.defaultDesignId});}
  changes.push({kind:'startDesign',label:'Die vorhandene Startdesign-ID bleibt erhalten',designId:document.config.profile.defaultDesignId},
   {kind:'commerce',label:'Bestehende Shopify-Produkte, Varianten, Grundpreise, Ausführungen, Bestand und Texte bleiben erhalten'},
   {kind:'extras',label:'Zusatzmodule verwenden ihre gespeicherten Preise',before:prepareShopProduct(record).extras,after:prepareShopProduct({...record,document}).extras});
  return changes;
 }
 return Object.freeze({read,assert,compose,ensureAssets,describe});
}

/** Reuses the existing journal, conflict checks, CAS transport and activation.
 * Explicit confirmation is mandatory for this expanded update workflow. */
export function createGalleryModuleSync(options={}){
 const projection=createGalleryModuleProjection(options),check=options.sourceApproval;
 return createGalleryShopSync({...options,projection,requireConfirmation:true,
  sourceApproval:({source,...args})=>source.designs?{approved:true}:check({source,...args})});
}
