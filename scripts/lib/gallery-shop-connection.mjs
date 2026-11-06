import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createGalleryShopSync} from '../../app/workshop/gallery-shop-sync.mjs';
import {createGallerySyncActivation} from '../../app/workshop/gallery-shop-sync-activation.mjs';
import {createGallerySyncShopifyTransport} from '../../app/workshop/gallery-shop-sync-transport.mjs';

/** Server configuration only, never a spread of an HTTP request. GraphQL auth,
 * tenant, fixed identities, image staging and native review approval are supplied
 * by the host. Constructing the connection sends no Shopify request. Its two
 * write gates default off; real image writes additionally need their own gate.
 * The caller owns workshops, mediaAdapter/staging and an injected database.
 */
export function createGalleryShopConnection({sourceWorkshop,targetWorkshop,tenantId=sourceWorkshop?.tenantId,shopDomain,
 journalFilename,database,targets,graphql,imagePreparation,mediaAdapter,sourceApproval,
 executionEnabled=false,writesEnabled=false,clock=Date.now}={}){
 if(!sourceWorkshop||!targetWorkshop||typeof sourceApproval!=='function'||typeof graphql!=='function'||!!database===!!journalFilename)
  throw Object.assign(Error('Serverseitige Werkstätten, Freigabeprüfung, Shopify-Lesezugriff und genau ein privater Journalspeicher sind erforderlich.'),{status:422,code:'gallery_connection_configuration'});
 const prepareImage=typeof imagePreparation==='function'?imagePreparation:imagePreparation?.prepareImage;
 if(imagePreparation&&typeof prepareImage!=='function')throw Object.assign(Error('Der gesicherte Bildexport ist unvollständig.'),{status:422,code:'gallery_connection_images'});
 if(journalFilename&&!path.isAbsolute(journalFilename))throw Object.assign(Error('Der private Journalspeicher benötigt einen absoluten Serverpfad.'),{status:422,code:'gallery_connection_path'});
 // Validate scope and the real binding connection before creating a journal.
 const activation=createGallerySyncActivation({workshop:targetWorkshop,tenantId,shopDomain,clock});
 const transport=createGallerySyncShopifyTransport({shopDomain,graphql,writesEnabled,mediaAdapter,clock});
 let journal=database,owned=false;
 try{
  if(!journal){fs.mkdirSync(path.dirname(journalFilename),{recursive:true});journal=new DatabaseSync(journalFilename);owned=true;journal.exec('PRAGMA busy_timeout=5000;');}
  if(journal.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name IN ('products','form_shop_bindings','form_order_lines')").get())
   throw Object.assign(Error('Das Syncjournal muss getrennt vom Produkt- und Bestellspeicher liegen.'),{status:422,code:'gallery_connection_journal'});
  const synchronizer=createGalleryShopSync({database:journal,tenantId,shopDomain,sourceWorkshop,targetWorkshop,targets,transport,activation,executionEnabled,sourceApproval,prepareImage,clock});
  let closed=false;
  return Object.freeze({...synchronizer,transport,activation,close(){if(closed)return;closed=true;if(owned)journal.close();}});
 }catch(error){if(owned)journal.close();throw error;}
}
