// Offline preparation only: no DB connection, fetch, credentials, apply or activation.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {validateProductDocument,resolveProduct} from '../app/workshop/product-model.mjs';
import {capturePersonalization} from '../app/workshop/cart-personalization.mjs';

export const D8=Object.freeze({shop:'gravuru-design.myshopify.com',product:'gid://shopify/Product/16077798965628',variant:'57265913332092',app:'gid://shopify/App/423276544001'});
export const D8_READ_QUERY=String.raw`query D8PricingReadback {
 shop { myshopifyDomain currencyCode plan { partnerDevelopment shopifyPlus } }
 currentAppInstallation { app { id } accessScopes { handle } }
 productVariant(id:"gid://shopify/ProductVariant/57265913332092") {
  id price selectedOptions { name value }
  product { id pricing:metafield(namespace:"$app",key:"personalization"){ id type value jsonValue compareDigest } }
 }
 cartTransforms(first:100) { nodes { id functionId blockOnFailure } pageInfo { hasNextPage endCursor } }
 shopifyFunctions(first:100) { nodes { id title apiType } pageInfo { hasNextPage endCursor } }
}`;
const fail=message=>{throw Error(message);};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cents=value=>/^\d+\.\d{2}$/.test(value)?Number(value.replace('.','')):NaN;

/** input is a private, independently read-back D8 record, exact binding and Shopify response.
 * Function ID must come from the reviewed owning-app release receipt, never a guessed ID.
 * The result is a proposal, not an approval or evidence of live readiness.
 */
export function prepareD8Pricing(input){
 if(input?.schema!=='gravuru-d8-pricing-readback/v1')fail('D8-Lesebeleg fehlt.');
 const {record,binding,shopify,expectedFunctionId}=input,data=shopify?.data;
 if(shopify?.errors?.length||!data)fail('Shopify-Leseabfrage nicht vollständig.');
 if(data.shop?.myshopifyDomain!==D8.shop||data.shop?.currencyCode!=='EUR'||data.currentAppInstallation?.app?.id!==D8.app)fail('Falscher Shop, Währung oder besitzende App.');
 if(data.shop.plan?.partnerDevelopment!==true&&data.shop.plan?.shopifyPlus!==true)fail('lineUpdate benötigt Entwicklungs-Shop oder Shopify Plus.');
 if(!data.currentAppInstallation.accessScopes?.some(s=>s.handle==='read_cart_transforms'))fail('Cart-Transform-Leserecht fehlt.');
 const variant=data.productVariant;
 if(variant?.id!=='gid://shopify/ProductVariant/'+D8.variant||variant.product?.id!==D8.product)fail('Produkt-/Varianten-Zuordnung passt nicht zu D8.');
 if(!Object.hasOwn(variant.product,'pricing')||variant.product.pricing!==null)fail('Erwarteter fehlender Preisvertrag nicht bestätigt; bestehenden Vertrag separat vergleichen, niemals ersetzen.');
 for(const key of ['cartTransforms','shopifyFunctions'])if(!Array.isArray(data[key]?.nodes)||data[key].pageInfo?.hasNextPage!==false)fail('Vollständiger Funktions-Readback fehlt: '+key);
 if(typeof expectedFunctionId!=='string'||!expectedFunctionId)fail('Funktions-ID aus geprüftem Release-Beleg fehlt.');
 const functions=data.shopifyFunctions.nodes.filter(f=>f.id===expectedFunctionId&&f.apiType==='cart_transform');
 const transforms=data.cartTransforms.nodes.filter(t=>t.functionId===expectedFunctionId&&/^gid:\/\/shopify\/CartTransform\/[1-9]\d*$/.test(t.id));
 if(functions.length!==1||transforms.length!==1)fail('Geprüfte Cart-Transform-Funktion nicht eindeutig installiert und aktiviert.');
 if(!record||!/^cfg_[a-f0-9-]{36}$/.test(record.id)||!Number.isSafeInteger(record.revision)||record.revision<1||record.status==='archived')fail('Eindeutiger versionierter Produktstand fehlt.');
 if(binding?.shopDomain!==D8.shop||binding.variantId!==D8.variant||binding.productId!==record.id||binding.productRevision!==record.revision||typeof binding.id!=='string'||!/^binding_[a-f0-9-]{36}$/.test(binding.id)||!binding.options)fail('Aktive Bindung und Produktstand stimmen nicht überein.');
 const original=structuredClone(record.document);validateProductDocument(original);
 if(original.config.extraMotifCents!==0)fail('D8-Ausgangsstand mit 0 Cent nicht bestätigt.');
 const document=structuredClone(original);
 document.config.motifCharge='additional';document.config.extraMotifCents=169;validateProductDocument(document);
 const oldPrice=resolveProduct(original,{options:binding.options}).price.unitCents,newPrice=resolveProduct(document,{options:binding.options}).price.unitCents;
 if(!Number.isSafeInteger(binding.unitCents)||binding.unitCents!==oldPrice||newPrice!==oldPrice||cents(variant.price)!==oldPrice)fail('Grundpreis oder Ausführungswahl stimmt nicht überein.');
 const pricing={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:D8.product,revision:1,currency:'EUR',variants:{[D8.variant]:oldPrice},extraMotifCents:169,extraPhotoCents:document.config.photo.extraPriceCents};
 for(const key of ['quantityTiers','quantityTierScope'])if(Object.hasOwn(document.config,key))pricing[key]=structuredClone(document.config[key]);
 capturePersonalization(pricing,{variantId:D8.variant,baseCents:oldPrice,document});
 const unchanged=structuredClone(document);for(const key of ['motifCharge','extraMotifCents'])if(Object.hasOwn(original.config,key))unchanged.config[key]=original.config[key];else delete unchanged.config[key];
 if(!isDeepStrictEqual(unchanged,original))fail('Unbeabsichtigte Produktänderung.');
 return {schema:'gravuru-d8-pricing-proposal/v1',dryRun:true,applied:false,shopifyRequests:0,dbWrites:0,productionApproved:false,
  source:{recordId:record.id,expectedRevision:record.revision,documentSha256:hash(original),bindingId:binding.id,options:binding.options,unitCents:oldPrice},
  candidate:{expectedNewRevision:record.revision+1,document},
  transform:{id:transforms[0].id,functionId:expectedFunctionId,blockOnFailure:transforms[0].blockOnFailure,installedInSuppliedReadback:true,liveCheckedByThisScript:false},
  pricing,
  metafieldProposal:{ownerId:D8.product,namespace:'$app',key:'personalization',type:'json',value:JSON.stringify(pricing),compareDigest:null},
  checks:{onlyTwoConfigFieldsChanged:true,basePriceUnchanged:true,originalCents:oldPrice,oneAdditionalMotifCents:oldPrice+169,existingTemplateIncluded:true,onlyD8VariantInContract:true},
  rollback:{document:original,bindingId:binding.id,pricingMetafieldBefore:null,cartTransformChangePlanned:false,requiresNewVersionAndFreshHeadCheck:true,neverRestoreWholeDatabaseOverOrders:true},
  openGates:['Frischen SQL-/Shopify-Lesebeleg und aktive Kopfzuordnung bestätigen.','Installierten Funktionscode/Release gegen den 169-Cent-Vertrag offline prüfen.','Chris muss die Live-Ausführung ausdrücklich freigeben.','Neue Produktrevision, Preisvertrag und Bindung gemeinsam kontrolliert aktivieren; echte Warenkorbpreise prüfen.']};
}
export function run(args){
 const values={};for(let i=0;i<args.length;i+=2){if(!['--input','--out'].includes(args[i])||!args[i+1]||values[args[i]])fail('Nur --input <privater-lesebeleg.json> --out <neuer-ordner>; kein Live-/Apply-Modus.');values[args[i]]=args[i+1];}
 if(!values['--input']||!values['--out'])fail('Nur --input <privater-lesebeleg.json> --out <neuer-ordner>.');
 const plan=prepareD8Pricing(JSON.parse(fs.readFileSync(values['--input'],'utf8'))),out=path.resolve(values['--out']);
 fs.mkdirSync(out,{recursive:false,mode:0o700});fs.writeFileSync(path.join(out,'proposal.json'),JSON.stringify(plan,null,2)+'\n',{flag:'wx',mode:0o600});
 const summary={...plan,candidate:{expectedNewRevision:plan.candidate.expectedNewRevision,document:'private proposal.json'},rollback:{...plan.rollback,document:'private proposal.json'},pricing:'private proposal.json',metafieldProposal:'private proposal.json'};
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});return summary;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{console.log(JSON.stringify(run(process.argv.slice(2))));}catch(error){console.error(error.message);process.exitCode=1;}}
