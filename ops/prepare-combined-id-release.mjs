// Private local preparation. Source copies only; never opens a database or deploys.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {patchLegacyOrderIntakeSource} from '../legacy-patches/apply-order-intake-compat.mjs';
import {patchPreviewPrice,patchPreviewPhotoLimit} from '../legacy-patches/preview-price-compat.mjs';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const source=path.resolve(process.argv[2]||''),dest=path.resolve(process.argv[3]||'');
if(!source.endsWith(path.join('extrahiertes-paket','releases'))||!dest.startsWith(root+path.sep)||fs.existsSync(dest))throw Error('Explicit original source and fresh staging directory required.');
for(const name of ['legacy','acryl'])if(!fs.statSync(path.join(source,name,'app')).isDirectory())throw Error('Both original releases required.');
const sha=b=>createHash('sha256').update(b).digest('hex'),changes=[];
fs.mkdirSync(dest,{recursive:true});
for(const name of ['legacy','acryl'])fs.cpSync(path.join(source,name),path.join(dest,name),{recursive:true,errorOnExist:true,force:false});
function write(store,rel,bytes,reason){const target=path.join(dest,store,rel),old=fs.existsSync(target)?fs.readFileSync(target):null;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);changes.push({store,path:rel,sourceSha256:old?sha(old):null,resultSha256:sha(bytes),reason});}
function overlay(store,rel,from=root,reason='Scoped ID/cart implementation'){write(store,rel,fs.readFileSync(path.join(from,rel)),reason);}
function edit(store,rel,fn,reason){const raw=fs.readFileSync(path.join(dest,store,rel)),next=fn(raw.toString('utf8'));write(store,rel,Buffer.from(next),reason);}
function replace(source,old,value){if(source.split(old).length!==2)throw Error('Unique patch anchor missing: '+old.slice(0,100));return source.replace(old,value);}
const shared=[
 'cart-edit-revision.mjs','cart-configuration.mjs','draft-cart-handoff.mjs','cart-handoff-journal.mjs','storefront-cart.mjs','storefront-transport.mjs','cart-personalization.mjs',
 'shop-product-binding-store.mjs','shop-product-binding-plan.mjs','shop-product-binding-adapter.mjs','shop-product-binding-check.mjs','shop-product-binding-legacy.mjs'
];
for(const store of ['legacy','acryl'])for(const file of shared)overlay(store,'app/workshop/'+file);
for(const file of ['configurator-test-gateway.mjs','configurator-integration.mjs','bound-test-cart.mjs','cross-store-order-intake.mjs','acryl-employee-host.mjs','http.mjs','order-intake.mjs','shopify-admin-test-server.mjs','acrylic-review.mjs','form-review-snapshot.mjs'])overlay('acryl','app/workshop/'+file);
for(const file of ['contract.mjs','commerce-model.mjs','workshop-review.mjs','cart-edit.mjs','server.mjs'])overlay('acryl','app/configurator/variant-m/'+file);
for(const file of ['customer-preview.mjs','merchant-request.mjs','configurator-test-client.mjs','form-customer-ui.mjs'])overlay('acryl','app/workshop/ui/'+file);
// The old renderer keeps its original implementation. Only its pricing patch,
// private checkout/reopen bridge and original-photo retention are added.
const tierSource=path.resolve(root,'../tier-update-20261021');
for(const file of ['contract.mjs','commerce-model.mjs'])overlay('legacy','app/configurator/variant-m/'+file,tierSource,'Existing reviewed legacy complete-unit price patch');
for(const file of ['workshop-review.mjs','cart-edit.mjs'])overlay('legacy','app/configurator/variant-m/'+file);
for(const file of ['customer-preview.mjs','merchant-request.mjs','configurator-test-client.mjs'])overlay('legacy','app/workshop/ui/'+file);
edit('legacy','app/workshop/ui/form-customer-ui.mjs',s=>{
 const modern=fs.readFileSync(path.join(root,'app/workshop/ui/form-customer-ui.mjs'),'utf8');
 const gate=modern.slice(modern.indexOf('const cartGate='),modern.indexOf('const firstFocus='));
 const start=modern.indexOf('async function reopenCartDraft()'),end=modern.indexOf('\nfunction syncAdditions()',start);
 if(!gate.startsWith('const cartGate=')||start<0||end<start)throw Error('Form cart source missing');
 const methods=modern.slice(start,end).replaceAll('draftStorage.setItem','sessionStorage.setItem');
 s="import {cartEditParams,loadCartRevision} from '/configurator/variant-m/cart-edit.mjs';\n"+s;
 s=replace(s,'const firstFocus=',gate+'const firstFocus=');
 s=replace(s,'if(!busy){applyRights();syncAdditions();}panels?.sync();}','if(!busy){applyRights();syncAdditions();}panels?.sync();syncTestCart();}');
 s=replace(s,"renderMotifs();await openDraft(params.get('design')||undefined);await setupVariants();}","renderMotifs();if(cartEditParams(location.search))await reopenCartDraft();else await openDraft(params.get('design')||undefined);await setupVariants();if(cartGate)installTestCart();}");
 return replace(s,'\nfunction syncAdditions()', '\n'+methods+'\nfunction syncAdditions()');
},'Backport private form checkout without replacing original editor features');
overlay('legacy','app/workshop/tenant.mjs',root,'Helper for new cart tables and one existing cart-journal tenant column only');
const hooks=JSON.parse(fs.readFileSync(path.join(root,'ops/legacy-host-overlay/HOST-HOOKS.json')));
for(const f of hooks.files){if(sha(fs.readFileSync(path.join(dest,'legacy',f.path)))!==f.sourceSha256)throw Error('Legacy host source changed');overlay('legacy',f.path,path.join(root,'ops/legacy-host-overlay'),'Two additive factory exports');}
edit('legacy','app/workshop/order-intake.mjs',patchLegacyOrderIntakeSource,'Exact-source existing-connection registry and webhook patch');
edit('legacy','app/workshop/order-intake.mjs',s=>{
 s=replace(s,'{createLegacyOrderIntakeAccess,createLegacyOrderRouting}','{createLegacyOrderIntakeAccess,createLegacyOrderRouting,legacyConfigurationFor}');
 s=replace(s,'export function createOrderIntake({database:db,snapshot,clock=Date.now})','export function createOrderIntake({database:db,snapshot,clock=Date.now,configurations})');
 s=replace(s,"    const old=db.prepare('SELECT * FROM form_order_lines WHERE shop=? AND order_id=? AND line_id=?')","    const configuration=legacyConfigurationFor(configurations,properties,o.id);\n    const old=db.prepare('SELECT * FROM form_order_lines WHERE shop=? AND order_id=? AND line_id=?')");
 return replace(s,'bindingId:b.id,snapshotId:o.snapshot_id,sourcePackageSha256:','bindingId:b.id,snapshotId:o.snapshot_id,...(configuration?{configuration}:{}),sourcePackageSha256:');
},'Verify and retain exact cart revision on test-order intake');
edit('legacy','app/workshop/form-customer-store.mjs',s=>{
 s=replace(s,"import {createCartHandoffJournal} from './cart-handoff-journal.mjs';","import {createCartHandoffJournal} from './cart-handoff-journal.mjs';\nimport {createCartConfigurations} from './cart-configuration.mjs';");
 s=replace(s,' const cartHandoffs=createCartHandoffJournal({database:db});',' const cartHandoffs=createCartHandoffJournal({database:db});\n const cartConfigurations=createCartConfigurations({database:db,clock});');
 s=replace(s,'clock});\n const acrylicDrafts','clock,configurations:cartConfigurations});\n const acrylicDrafts');
 return replace(s,'return {exportJobs,orderIntake,cartHandoffs,acrylicDrafts','return {exportJobs,orderIntake,cartHandoffs,cartConfigurations,acrylicDrafts');
},'Add immutable cart configuration tables to existing connection');
edit('legacy','app/workshop/http.mjs',s=>{
 s="import {loadCartRevision,loadCartRevisionPhoto} from './cart-edit-revision.mjs';\n"+s;
 const reference=fs.readFileSync(path.join(root,'app/workshop/http.mjs'),'utf8');
 const begin=reference.indexOf('      const cartRevisionMatch='),end=reference.indexOf('      const acrylicDraftMatch=',begin);
 if(begin<0||end<begin)throw Error('Reopen route not found');
 return replace(s,'      const acrylicDraftMatch=',reference.slice(begin,end)+'      const acrylicDraftMatch=');
},'Private existing-token cart revision route');
edit('legacy','app/configurator/variant-m/completion.mjs',s=>{
 s="import {installCartEdit} from './cart-edit.mjs';\n"+s;
 return replace(s,' installWorkshopReview(api,footer);',' installWorkshopReview(api,footer);\n if(config)installCartEdit(api).catch(()=>{});');
},'Keep original completion UI and add private reopening');
edit('legacy','app/configurator/variant-m/server.mjs',s=>replace(s,'merchant-request\\.mjs','merchant-request\\.mjs|configurator-test-client\\.mjs'),'Allow the single new browser helper');
edit('legacy','app/workshop/acrylic-review.mjs',s=>replace(s,'const used=new Set(design.objects.filter(o=>!o.uxHidden&&o.uxUploadId)','const used=new Set(design.objects.filter(o=>o.uxUploadId)'),'Retain hidden original photos in new immutable snapshots');
edit('acryl','scripts/acryl-employee-entry.cjs',s=>replace(s,'dataDirectory:process.env.GRAVURU_ACRYL_DATA_DIR','dataDirectory:process.env.GRAVURU_ACRYL_DATA_DIR,customerIntegration:{mode:\'merchant-test-only\',legacyStoreId:\'legacy\',acrylStoreId:\'acryl\'}'),'Explicit test-only gateway with two fixed existing stores');
for(const store of ['legacy','acryl']){
 edit(store,'app/configurator/variant-m/ux.mjs',s=>patchPreviewPhotoLimit(patchPreviewPrice(s)),'Shared complete-unit price and 15 MB photo limit; preserve the distinct existing editors');
 overlay(store,'app/workshop/photo-import.py',root,'15 MB photo processing with bounded Linux workers and unchanged originals');
}
fs.writeFileSync(path.join(dest,'SOURCE-OVERLAY.json'),JSON.stringify({createdAt:new Date().toISOString(),privateSourceOnly:true,dataOpened:false,changes},null,2)+'\n');
console.log(JSON.stringify({destination:dest,changedSources:changes.length,dataOpened:false}));
