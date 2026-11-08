import fs from 'node:fs';
import path from 'node:path';
import {createProductionModuleActivationConfig} from './gallery-production-activation.mjs';

const fail=code=>{throw Object.assign(Error('Die gesicherte Vorschau-Verbindung passt nicht zum vorhandenen Verwaltungsstand.'),{status:409,code});};
const existing=file=>typeof file==='string'&&path.isAbsolute(file)&&fs.existsSync(file)&&fs.statSync(file).isFile();

/** Operator-only preview of the exact activation adapter. Existing stores and
 * profile revisions are required; this factory never seeds or assigns profiles.
 * There is deliberately no parameter, environment switch or browser field that
 * can enable either write gate here. */
export function createProductionModulePreviewMount({context,sourceIdentity,filename,targetFilename,journalFilename,expected,shopify,profilePins}={}){
 if(!context?.workshop||context.workshop.tenantId!==expected?.tenantId||
  !sourceIdentity||['dataDirectory','galleryDirectory','filename','importsFile'].some(key=>context[key]!==sourceIdentity[key]))fail('module_preview_host_identity');
 if(![filename,targetFilename,journalFilename].every(existing)||new Set([filename,targetFilename,journalFilename].map(file=>path.resolve(file))).size!==3)fail('module_preview_existing_stores');
 if(!Array.isArray(profilePins)||!profilePins.length||new Set(profilePins.map(p=>p.id)).size!==profilePins.length||
  profilePins.some(p=>!/^cmp_[a-f0-9-]{36}$/.test(p.id||'')||!Number.isSafeInteger(p.revision)||p.revision<1||!/^[a-f0-9]{64}$/.test(p.sha256||'')))fail('module_preview_profile_pins');
 const pins=structuredClone(profilePins),workshop=context.workshop;
 const activation=createProductionModuleActivationConfig({targetFilename,expected,shopify,allowedProfileIds:pins.map(p=>p.id),journalFilename,
  executionEnabled:false,writesEnabled:false});
 let connected=false;
 return Object.freeze({filename,connect(nativeContext){
  if(connected||nativeContext?.sourceWorkshop!==workshop||nativeContext.filename!==filename)fail('module_preview_host_lifecycle');
  const management=workshop.configureModuleManagement({filename,sourceRegistry:nativeContext.sourceRegistry});
  for(const pin of pins){const current=management.profiles.get(pin.id);if(current.revision!==pin.revision||current.sha256!==pin.sha256)fail('module_preview_profile_changed');}
  const host=activation.connect(nativeContext);connected=true;return host;
 }});
}
