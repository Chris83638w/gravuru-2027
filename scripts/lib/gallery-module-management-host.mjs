import {createGalleryShopConnection} from './gallery-shop-connection.mjs';
import {createGalleryManagementHandler} from './gallery-management-http.mjs';

/** Mounts the existing /originale/verwaltung routes on a private gallery host.
 * All registries, approvals, credentials and paths come from the server's
 * existing gallery installation, never from a request. No substitute catalogue
 * or duplicated importer is constructed. Both remote write gates default off.
 * The workshop owns its shared module management; this adapter owns its journal.
 */
export function createGalleryModuleManagementHost({sourceWorkshop,targetWorkshop,filename,
 sourceRegistry,sourceApproval,targets,csrfToken,shopDomain,journalFilename,graphql,
 imagePreparation,mediaAdapter,personalizationPricingFor,executionEnabled=false,
 writesEnabled=false,clock=Date.now}={}){
 if(!sourceRegistry||typeof sourceRegistry.targets!=='function'||typeof sourceRegistry.offeringFor!=='function'||typeof sourceRegistry.scopes!=='function'||typeof sourceApproval!=='function'||!targets||typeof sourceWorkshop?.configureModuleManagement!=='function')
  throw Object.assign(Error('Die vorhandene Galerie-Registry, Produktzuordnung und Sichtfreigabe müssen serverseitig verbunden werden.'),{status:422,code:'gallery_module_host_registry'});
 const management=sourceWorkshop.configureModuleManagement({filename,sourceRegistry});
 let connection;
 try{
  connection=createGalleryShopConnection({sourceWorkshop,targetWorkshop,tenantId:sourceWorkshop.tenantId,
   shopDomain,journalFilename,targets,graphql,imagePreparation,mediaAdapter,personalizationPricingFor,
   sourceApproval,moduleProfiles:management.profiles,executionEnabled,writesEnabled,clock});
  const handler=createGalleryManagementHandler({workshop:sourceWorkshop,templates:management.groups,synchronizer:connection,csrfToken});
  let closed=false;
  return Object.freeze({management,synchronizer:connection,
   // The existing gallery router invokes this first and falls through only when
   // it returns false. Authentication/CSRF stays in the reused private handler.
   handle(req,res,url){return handler(req,res,url);},
   close(){if(closed)return;closed=true;connection.close();}});
 }catch(error){connection?.close();throw error;}
}
