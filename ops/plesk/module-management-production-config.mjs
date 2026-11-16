import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGalleryModuleManagementHost} from '../../scripts/lib/gallery-module-management-host.mjs';
import {createProductionModulePreflight,createProductionModuleLibraryConfig} from '../../scripts/lib/gallery-production-connection.mjs';
import {openProductionModuleReadonlyTarget} from '../../scripts/lib/gallery-production-readonly-target.mjs';
import {loadExistingProductionShopifyReader,loadProductionModuleIdentity} from '../../scripts/lib/gallery-production-private-settings.mjs';

// Existing locations verified by the operator on 2026-11-08. The identity
// files are copied privately into the release package, NOT committed to Git.
const privateRoot='/var/www/vhosts/gravuru-designwerkstatt.de/private';
const sourceData=privateRoot+'/gesamtbestand-stage-0bb50565-20261106-v1/data';
const sourceGallery=privateRoot+'/gesamtbestand-stage-0bb50565-20261106-v1/gallery-4';
// Separate existing private operator directory: the source's storage guard
// intentionally does not allow additional SQLite files in its data directory.
const managementData=privateRoot+'/mika-module-connect-20261108-v2';
const targetDatabase=privateRoot+'/acryl-employee-20261021-v1/data/workshop.sqlite';
const appConfig=privateRoot+'/gravuru-2027-merchant-shopify.json';
const existingSecret='/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-werkstatt/private/shopify-app-secret';
const identityDirectory=fileURLToPath(new URL('./module-production-identity/',import.meta.url));
const fail=code=>{throw Object.assign(Error('Die private Modulverwaltung passt nicht zur geprüften Galerie.'),{code});};

/** Selected by the existing private Plesk loader only. No mount is enabled by
 * importing this file, and no source gallery or customer runtime is replaced. */
export async function configureGalleryManagement(context){
 if(context?.workshop?.tenantId!=='gravuru'||context.dataDirectory!==sourceData||context.galleryDirectory!==sourceGallery||context.filename!==sourceData+'/workshop.sqlite'||context.importsFile!==sourceData+'/local-review-import.json')fail('module_connection_host_identity');
 const expected=loadProductionModuleIdentity({metadataFilename:path.join(identityDirectory,'target-heads-r4.json.gz'),metadataSha256:'3895cfba6aaf56e53ce580221f08c46743f0c353605dbaf4b3dde0d086975798',
  originalIdsFilename:path.join(identityDirectory,'steel-original-ids-251.json'),originalIdsSha256:'91a5e067fea4477e35574b10eb5b79b74fee17ca72d61e7c4f6b475923dc4c41'});
 const shopify=loadExistingProductionShopifyReader(appConfig,{expectedSecretFilename:existingSecret});
 const target=openProductionModuleReadonlyTarget({filename:targetDatabase,expected});
 let mounted=false,closed=false,timer;
 const close=()=>{if(!closed){closed=true;clearTimeout(timer);target.close();}};
 try{
  const config=await createProductionModuleLibraryConfig({preflight:createProductionModulePreflight({...target,shopify,expected}),targetWorkshop:target.targetWorkshop,
   createHost:createGalleryModuleManagementHost,sourceRevision:4,journalFilename:managementData+'/module-shop-sync-preview.sqlite'});
  // A loader failure before connect must not leave an unused DB reader alive.
  // This is cleanup only; it never extends the native 60-second evidence age.
  timer=setTimeout(close,60000);timer.unref();
  return {filename:managementData+'/module-management.sqlite',connect(nativeContext){
   if(closed||mounted||nativeContext?.sourceWorkshop!==context.workshop)fail('module_connection_host_lifecycle');
   try{
    const host=config.connect(nativeContext);mounted=true;clearTimeout(timer);
    return Object.freeze({...host,close(){try{host.close();}finally{close();}}});
   }catch(error){close();throw error;}
  }};
 }catch(error){close();throw error;}
}
