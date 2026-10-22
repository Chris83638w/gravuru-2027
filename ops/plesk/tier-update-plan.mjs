// Narrow, pure planning contract for the one approved memorial test product.
import {createHash} from 'node:crypto';
import {capturePersonalization} from '../../app/workshop/cart-personalization.mjs';
export const TARGET=Object.freeze({productId:'cfg_b4fd3f0c-1d36-4708-b65a-2450134c4ef1',shopifyProductId:'gid://shopify/Product/16138083107196',shopDomain:'gravuru-design.myshopify.com',fromRevision:5,toRevision:6,pricingFrom:'30',pricingTo:'31',sourceCommit:'d18bc6cb8fdbe9e69008d9be18b2b74ce72365eb',sourceArchiveBytes:28980925,sourceArchiveSha256:'57bff9f9dd1c978718e0687241fb9c43b16703cc91bd040db72d83ee3fa10460'});
export const VARIANTS=Object.freeze(['57509812633980','57509812666748','57509812699516','57509812732284','57509812765052','57509812830588','57509812863356','57509812896124','57509812797820'].sort());
export const TIERS=Object.freeze([Object.freeze({minQuantity:2,percentOff:6}),Object.freeze({minQuantity:3,percentOff:10})]);
export const fail=code=>{throw Object.assign(Error(code),{code});};
export const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function nextDocument(before){
 if(!before?.config||Object.hasOwn(before.config,'quantityTiers')||Object.hasOwn(before.config,'quantityTierScope'))fail('unexpected_previous_tiers');
 const document=structuredClone(before);document.config.quantityTiers=structuredClone(TIERS);document.config.quantityTierScope='complete-unit';return document;
}
export function nextPricing(before,document){
 if(before?.productId!==TARGET.shopifyProductId||String(before?.revision)!==TARGET.pricingFrom||Object.hasOwn(before,'quantityTiers')||Object.hasOwn(before,'quantityTierScope')||!same(Object.keys(before.variants||{}).sort(),VARIANTS))fail('unexpected_previous_pricing');
 const after=structuredClone(before);after.revision=typeof before.revision==='number'?Number(TARGET.pricingTo):TARGET.pricingTo;
 after.quantityTiers=structuredClone(TIERS);after.quantityTierScope='complete-unit';
 for(const id of VARIANTS)capturePersonalization(after,{variantId:id,baseCents:after.variants[id],document});
 return after;
}
export function assertPlan(plan){
 if(plan?.schema!=='gravuru-memorial-tier-plan/v1'||!same(plan.target,TARGET)||!same(plan.documentAfter,nextDocument(plan.documentBefore))||!same(plan.pricingAfter,nextPricing(plan.pricingBefore,plan.documentAfter))||plan.documentBeforeSha256!==digest(plan.documentBefore)||plan.documentAfterSha256!==digest(plan.documentAfter)||plan.pricingBeforeSha256!==digest(plan.pricingBefore)||plan.pricingAfterSha256!==digest(plan.pricingAfter))fail('plan_contract');
 if(!Array.isArray(plan.mappings)||plan.mappings.length!==9||!same(plan.mappings.map(m=>m.variantId).sort(),VARIANTS)||new Set(plan.mappings.map(m=>m.key)).size!==9||plan.mappings.some(m=>typeof m.key!=='string'||!m.key||Object.keys(m).some(k=>!['key','variantId'].includes(k))))fail('plan_mappings');
 if(!/^[a-f0-9]{64}$/.test(plan.configBeforeSha256||'')||!plan.evidence)fail('plan_evidence');
 return plan;
}
export function assertBackupChain(snapshot,restore,sourceReceipt){
 const names=['design-assets.sqlite','profiles.sqlite','workshop.sqlite'];
 if(snapshot?.schema!=='gravuru-merchant-private-snapshot/v1'||snapshot.runtimeLockHeld!==true||snapshot.privateDataChanged!==false||!Array.isArray(snapshot.databases)||!same(snapshot.databases.map(d=>d.file).sort(),names))fail('snapshot_receipt');
 if(restore?.schema!=='gravuru-private-restore-check/v1'||restore.databaseRestorePassed!==true||restore.sourceFilesUnchanged!==true||restore.allDatabaseBytesPreserved!==true||restore.relations?.valid!==true||!restore.relations.issues||Array.isArray(restore.relations.issues)||typeof restore.relations.issues!=='object'||Object.keys(restore.relations.issues).length||!Array.isArray(restore.databases)||!same(restore.databases.map(d=>d.file).sort(),names))fail('restore_receipt');
 for(const item of snapshot.databases){const r=restore.databases.find(d=>d.file===item.file);if(!Number.isSafeInteger(item.bytes)||item.bytes<1||!/^[a-f0-9]{64}$/.test(item.sha256)||item.quickCheck!=='ok'||r.sha256!==item.sha256||r.bytes!==item.bytes||r.integrityCheck!=='ok'||r.foreignKeys!=='ok')fail('restore_digest');}
 if(sourceReceipt?.schema!=='gravuru-source-restore-check/v1'||sourceReceipt.sourceCommit!==TARGET.sourceCommit||sourceReceipt.verifiedFiles!==436||sourceReceipt.archiveBytes!==TARGET.sourceArchiveBytes||sourceReceipt.archiveSha256!==TARGET.sourceArchiveSha256)fail('source_receipt');
 return true;
}
