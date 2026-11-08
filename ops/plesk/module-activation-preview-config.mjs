import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createProductionModulePreviewMount} from '../../scripts/lib/gallery-production-preview-mount.mjs';
import {loadExistingProductionShopifyReader,loadProductionModuleIdentity} from '../../scripts/lib/gallery-production-private-settings.mjs';

// Actual persisted profiles from the 2026-11-08 private mount receipt. These
// references are not product assignments. Re-read/review before later writes.
export const PREVIEW_PROFILE_PINS=Object.freeze([
 Object.freeze({id:'cmp_c79daee4-13ce-4097-9a83-4e0c4a6ac34d',revision:1,sha256:'a4012295275d4d40f04b925a34a492bca6ebb58738b836a027f8d7b5a23f6889'}),
 Object.freeze({id:'cmp_83b38184-7ebf-4e55-a65d-5f4d7309d5d6',revision:1,sha256:'1c8a420b18abde3a0f4ae0c50c27c634cc17d1bee4abdfda1e9d5d4d9873e105'})
]);
const privateRoot='/var/www/vhosts/gravuru-designwerkstatt.de/private';
const sourceData=privateRoot+'/gesamtbestand-stage-0bb50565-20261106-v1/data';
const managementData=privateRoot+'/mika-module-connect-20261108-v2';
const identityDirectory=fileURLToPath(new URL('./module-production-identity/',import.meta.url));

/** Alternative external-loader export, never enabled merely by import. The
 * existing gallery-4 source and customer runtime are not replaced. */
export function configureGalleryManagement(context){
 const sourceIdentity={dataDirectory:sourceData,galleryDirectory:privateRoot+'/gesamtbestand-stage-0bb50565-20261106-v1/gallery-4',filename:sourceData+'/workshop.sqlite',importsFile:sourceData+'/local-review-import.json'};
 if(context?.workshop?.tenantId!=='gravuru'||Object.keys(sourceIdentity).some(key=>context[key]!==sourceIdentity[key]))
  throw Object.assign(Error('Die Vorschau gehört ausschließlich zur vorhandenen privaten Galerie.'),{status:409,code:'module_preview_host_identity'});
 const expected=loadProductionModuleIdentity({metadataFilename:path.join(identityDirectory,'target-heads-r4.json.gz'),metadataSha256:'3895cfba6aaf56e53ce580221f08c46743f0c353605dbaf4b3dde0d086975798',
  originalIdsFilename:path.join(identityDirectory,'steel-original-ids-251.json'),originalIdsSha256:'91a5e067fea4477e35574b10eb5b79b74fee17ca72d61e7c4f6b475923dc4c41'});
 const shopify=loadExistingProductionShopifyReader(privateRoot+'/gravuru-2027-merchant-shopify.json',{
  expectedSecretFilename:'/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-werkstatt/private/shopify-app-secret'});
 return createProductionModulePreviewMount({context,sourceIdentity,
  filename:managementData+'/module-management.sqlite',targetFilename:privateRoot+'/acryl-employee-20261021-v1/data/workshop.sqlite',
  journalFilename:managementData+'/module-shop-sync-preview.sqlite',expected,shopify,profilePins:PREVIEW_PROFILE_PINS});
}
