import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createConfiguratorModuleProfiles} from '../../app/workshop/configurator-module-profiles.mjs';
import {nativeModuleAvailability,moduleProfileIssue,MODULE_PROFILE_SCHEMA} from '../../app/configurator/variant-m/module-profile.mjs';

export const APPROVED_STEEL_DOCUMENT_SHA='2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0';
const fail=code=>{throw Object.assign(Error(code),{code});};
/** Explicit one-time operator action, never an application-startup seed.
 * Only the separately owned module library may be written. The fixed source
 * document is the freshly verified native r4; source/target products stay closed.
 */
export function seedApprovedSteelModuleProfiles({documentFilename,filename,apply=false}={}){
 if(!path.isAbsolute(documentFilename||'')||!path.isAbsolute(filename||'')||path.basename(filename)!=='module-management.sqlite'||path.dirname(filename)===path.dirname(documentFilename))fail('module_seed_path');
 const bytes=fs.readFileSync(documentFilename);
 if(createHash('sha256').update(bytes).digest('hex')!==APPROVED_STEEL_DOCUMENT_SHA)fail('module_seed_source_pin');
 const document=JSON.parse(bytes),modules=nativeModuleAvailability(document.config);
 if(document.config.familyFormats?.designs?.length!==251||document.config.familyFormats?.formats?.length!==80||modules.photo||!modules.logo||modules.colors)fail('module_seed_source_capability');
 const definitions=[{name:'Edelstahl-Türschilder · mit Logo',modules:{...modules,logo:true}},{name:'Edelstahl-Türschilder · ohne Logo',modules:{...modules,logo:false}}];
 for(const [index,d] of definitions.entries())if(moduleProfileIssue(document.config,{schema:MODULE_PROFILE_SCHEMA,id:'seed-validation-'+index,revision:1,modules:d.modules}))fail('module_seed_profile');
 let existing=[];
 if(fs.existsSync(filename)){
  const db=new DatabaseSync(filename,{readOnly:true});
  try{
   if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name IN ('products','product_revisions','form_shop_bindings','form_order_lines')").get())fail('module_seed_not_own_library');
   if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='configurator_module_profiles'").get())existing=db.prepare('SELECT id,revision FROM configurator_module_profiles WHERE tenant_id=?').all('gravuru');
  }finally{db.close();}
 }
 const result={schema:'gravuru-approved-steel-profiles/v1',source:{productId:'cfg_ac514214-a313-4738-8008-00445ee1befd',revision:4,documentSha256:APPROVED_STEEL_DOCUMENT_SHA},definitions,existingProfiles:existing,created:0,nativeWrites:0,shopifyWrites:0};
 if(!apply||existing.length)return {...result,mode:apply?'existing-library-preserved':'preview'};
 fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
 const store=createConfiguratorModuleProfiles({filename,tenantId:'gravuru'});
 try{
  // A concurrent operator may have filled the library after the read above.
  const current=store.list();if(current.length)return {...result,mode:'existing-library-preserved',existingProfiles:current.map(p=>({id:p.id,revision:p.revision}))};
  const profiles=definitions.map(d=>store.create(d,{actor:'Mikail-freigegeben-2026-11-08-native-r4'}));
  return {...result,mode:'created',created:profiles.length,profiles:profiles.map(p=>({id:p.id,revision:p.revision,sha256:p.sha256,name:p.document.name}))};
 }finally{store.close();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  process.umask(0o077);
  const [documentFilename,filename,action]=process.argv.slice(2);
  if(process.argv.length<4||process.argv.length>5||action!==undefined&&action!=='--apply')fail('module_seed_arguments');
  console.log(JSON.stringify(seedApprovedSteelModuleProfiles({documentFilename,filename,apply:action==='--apply'})));
 }catch(error){console.log(JSON.stringify({ok:false,code:error.code||'module_seed_failed',nativeWrites:0,shopifyWrites:0}));process.exitCode=1;}
}
