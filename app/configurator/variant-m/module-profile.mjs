// One editor, versioned module choices. Mikail, 08.11.2026: product groups
// enable existing modules; they do not create a new editor or production rule.
import {processProfile} from '../../workshop/process-profiles.mjs';

export const MODULE_PROFILE_SCHEMA='gravuru-configurator-modules/v1';
export const MODULE_KEYS=Object.freeze(['options','designs','text','motifs','photo','logo','colors']);
export const MODULE_LABELS=Object.freeze({options:'Ausführungen',designs:'Designs',text:'Text und Schriften',motifs:'Motive',photo:'Foto',logo:'Logo',colors:'Farbwahl'});
// The native editor receives its pinned JSON model from its parent window.
// That window has a different Object.prototype; class instances still do not
// qualify. Keep the exact fields/versions/booleans below unchanged.
const objectConstructor=Function.prototype.toString.call(Object);
const plain=v=>{
 if(v===null||typeof v!=='object'||Array.isArray(v))return false;
 const prototype=Object.getPrototypeOf(v);
 if(prototype===null)return true;
 const constructor=Object.getOwnPropertyDescriptor(prototype,'constructor')?.value;
 return Object.getPrototypeOf(prototype)===null&&typeof constructor==='function'&&constructor.prototype===prototype&&Function.prototype.toString.call(constructor)===objectConstructor;
};
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&keys.every(key=>Object.hasOwn(v,key));
const fail=(message,code='module_profile_invalid')=>{throw Object.assign(Error(message),{status:422,code});};

/** A pinned, complete policy snapshot, never a mutable reference or a price list. */
export function validateModuleProfile(value){
 if(!exact(value,['schema','id','revision','modules'])||value.schema!==MODULE_PROFILE_SCHEMA||typeof value.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value.id)||!Number.isSafeInteger(value.revision)||value.revision<1)fail('Modulprofil benötigt eine gültige Kennung, feste Version und vollständige Modulfreigaben.');
 if(!exact(value.modules,MODULE_KEYS)||MODULE_KEYS.some(key=>typeof value.modules[key]!=='boolean'))fail('Modulprofil: Ausführungen, Designs, Text, Motive, Foto, Logo und Farbwahl ausdrücklich ein- oder ausschalten.');
 return value;
}

/** Additional gate only. Native product/process permissions still apply. */
export function moduleEnabled(config,key){
 if(!MODULE_KEYS.includes(key))fail('Unbekanntes Konfigurator-Modul: '+String(key));
 if(config?.moduleProfile===undefined)return true;
 return validateModuleProfile(config.moduleProfile).modules[key];
}

// Read only the authoritative design locations, never crawl font/media payloads.
function templateObjects(config){
 const profiles=[config?.profile,...(config?.scalableSizes?.sizes||[]).map(size=>size.profile),...(config?.doorbell?.formats||[]).map(format=>format.profile)];
 const designs=[...profiles.flatMap(profile=>profile?.designs||[]),...(config?.familyFormats?.designs||[])];
 return designs.flatMap(design=>design.objects||[]);
}
const editable=object=>object.customerEditable!==false&&!object.technicalLocked&&!object.locked;

// Chris, 11.11.2026 (#230): acrylic engraving may offer photos and checked SVG
// logos together. The existing steel SVG-only path remains photo-free.
export const photoWithVectorLogoAllowed=config=>config?.logo?.vectorUpload!==true||
 (config?.profile?.material?.kind==='acrylic'&&config?.profile?.processing?.profileId==='acrylic-engraving');

/** Upper bound from the saved source, independent of the selected module profile.
 * Keep binding to that source when changing a profile: applying a restricted
 * output does not reconstruct permissions that its source never granted. */
export function nativeModuleAvailability(config){
 const objects=templateObjects(config),additions=config?.customerAdditions;
 let process=null;try{process=processProfile(config?.profile);}catch{}
 return {
  options:true,designs:true,
  text:additions===undefined||additions.text===true||objects.some(object=>object.type==='text'&&editable(object)),
  motifs:additions===undefined||additions.motifs===true||objects.some(object=>['motif','motif-raster'].includes(object.type)&&editable(object)),
  // No new photo capability on steel. Its explicitly approved upload is SVG logo.
  photo:config?.photo?.enabled===true&&photoWithVectorLogoAllowed(config)&&config?.profile?.material?.kind!=='steel'&&process?.tools.photo===true,
  logo:config?.logo?.enabled!==false,
  colors:process?.tools.textColor===true,
 };
}

/** Human-readable compatibility error; source artwork is never silently removed. */
export function moduleProfileIssue(config,profile=config?.moduleProfile){
 if(profile===undefined)return null;
 validateModuleProfile(profile);
 if(!plain(config)||!plain(config.profile))return 'Das Modulprofil benötigt eine gespeicherte native Produktvorlage.';
 const available=nativeModuleAvailability(config),modules=profile.modules;
 for(const key of MODULE_KEYS)if(modules[key]&&!available[key])return MODULE_LABELS[key]+': Die gespeicherte Produktquelle gibt dieses Modul nicht frei. Bitte zuerst die passende Produktfreigabe bestätigen.';
 const objects=templateObjects(config);
 // Checkout requires required customer text to differ from the saved sample.
 // Hiding its editor would create an article that customers cannot complete.
 if(!modules.text&&objects.some(object=>object.type==='text'&&object.required===true))return 'Text kann nicht abgeschaltet werden: Eine gespeicherte Designvorlage benötigt eine persönliche Pflichtangabe. Bitte eine passende Vorlage ohne Pflichttext wählen; die Vorlage bleibt unverändert.';
 if(!modules.photo&&objects.some(object=>object.type==='photoSlot'&&object.uxUploadKind!=='logo'))return 'Foto kann nicht abgeschaltet werden: Eine gespeicherte Designvorlage enthält einen Fotobereich. Bitte eine passende Designgruppe ohne Fotobereich wählen; die Vorlage bleibt unverändert.';
 if(!modules.logo&&objects.some(object=>object.uxUploadKind==='logo'))return 'Logo kann nicht abgeschaltet werden: Eine gespeicherte Designvorlage enthält ein Logo-Upload-Element. Bitte die Designzuordnung prüfen; die Vorlage bleibt unverändert.';
 return null;
}

/** Create a native configuration projection; do not rewrite assets, geometry,
 * option groups, prices, design identities or production profiles. */
export function applyModuleProfile(config,profile=config?.moduleProfile){
 if(profile===undefined)return structuredClone(config);
 const issue=moduleProfileIssue(config,profile);if(issue)fail(issue,'module_profile_conflict');
 const result=structuredClone(config);
 result.moduleProfile=structuredClone(profile);
 if(!profile.modules.photo)result.photo={...result.photo,enabled:false};
 if(!profile.modules.logo)result.logo={...result.logo,enabled:false,vectorUpload:false};
 // The default addition policy remains in element-rights.mjs; consumers use
 // moduleEnabled as well. Explicit source limits are preserved unchanged.
 if(result.customerAdditions){
  if(!profile.modules.text)result.customerAdditions.text=false;
  if(!profile.modules.motifs)result.customerAdditions.motifs=false;
 }
 return result;
}
