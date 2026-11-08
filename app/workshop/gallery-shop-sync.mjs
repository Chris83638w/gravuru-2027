import {randomUUID} from 'node:crypto';
import {validateProductDocument} from './product-model.mjs';
import {nativeSource,composeNativeTarget,assertNativeTargetIdentity,ensureNativeAssets,syncFail,syncHash,canonical} from './gallery-shop-sync-native.mjs';
import {remoteCommerceHash,remoteBaselineMatches,remoteReleaseMatches} from './gallery-shop-sync-transport.mjs';

const clone=v=>structuredClone(v),issue=e=>({code:e.code||'gallery_sync_invalid',message:e.message});
const SCHEMA='gravuru-gallery-shop-sync/v1';
const cfg=/^cfg_[a-f0-9-]{36}$/,productGid=/^gid:\/\/shopify\/Product\/[1-9][0-9]*$/,variantGid=/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]*$/;

/** Private server service. Browser input is limited to registry IDs and the
 * immutable plan ID + digest. Customers and historical order snapshots are never
 * edited. Product creation, offer/material changes and general shop mirroring
 * are deliberately separate workflows.
 */
export function createGalleryShopSync({database,tenantId,shopDomain,sourceWorkshop,targetWorkshop,targets,transport,activation,
 executionEnabled=false,sourceApproval=()=>({approved:false,reason:'Die aktuelle Galerievorlage benötigt ihre Sichtfreigabe.'}),prepareImage,projection=null,requireConfirmation=false,clock=Date.now,checkpoint=()=>{}}={}){
 if(!database||sourceWorkshop?.repository?.tenantId!==tenantId||targetWorkshop?.repository?.tenantId!==tenantId||transport?.shopDomain!==shopDomain||activation?.tenantId!==tenantId||activation?.shopDomain!==shopDomain)
  syncFail('gallery_sync_scope','Quell-/Zielspeicher und Shop müssen ausdrücklich zum selben Mandanten gehören.',422);
 const db=database,scope=tenantId+'|'+shopDomain;
 if(projection&&['read','compose','assert','ensureAssets','describe'].some(key=>typeof projection[key]!=='function'))syncFail('gallery_sync_projection','Der native Produktadapter ist unvollständig.',422);
 const readSource=mapping=>projection?projection.read(mapping):nativeSource(sourceWorkshop,mapping.source);
 const compose=(source,record,mapping)=>projection?projection.compose(source,record,mapping):composeNativeTarget(source,record,mapping.target);
 const assertTarget=(source,record,mapping)=>projection?projection.assert(source,record,mapping):assertNativeTargetIdentity(source,record,mapping.target);
 db.exec(`CREATE TABLE IF NOT EXISTS gallery_shop_sync_plans(scope TEXT NOT NULL,id TEXT NOT NULL,sha TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(scope,id));
 CREATE TRIGGER IF NOT EXISTS gallery_shop_sync_plans_immutable BEFORE UPDATE ON gallery_shop_sync_plans BEGIN SELECT RAISE(ABORT,'sync plans are immutable');END;
 CREATE TRIGGER IF NOT EXISTS gallery_shop_sync_plans_retention BEFORE DELETE ON gallery_shop_sync_plans BEGIN SELECT RAISE(ABORT,'sync plan retention');END;
 CREATE TABLE IF NOT EXISTS gallery_shop_sync_operations(scope TEXT NOT NULL,id TEXT NOT NULL,plan_id TEXT NOT NULL,document TEXT NOT NULL,owner TEXT,lease_until INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(scope,id),UNIQUE(scope,plan_id));
 CREATE TABLE IF NOT EXISTS gallery_shop_sync_target_owners(scope TEXT NOT NULL,target_key TEXT NOT NULL,operation_id TEXT NOT NULL,PRIMARY KEY(scope,target_key));
 CREATE TABLE IF NOT EXISTS gallery_shop_sync_confirmations(scope TEXT NOT NULL,id TEXT NOT NULL,plan_id TEXT NOT NULL,plan_sha TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(scope,id),UNIQUE(scope,plan_id,plan_sha));
 CREATE TRIGGER IF NOT EXISTS gallery_shop_sync_confirmations_immutable BEFORE UPDATE ON gallery_shop_sync_confirmations BEGIN SELECT RAISE(ABORT,'sync confirmations are immutable');END;`);
 function registry(){
  const list=clone(typeof targets==='function'?targets():targets);
  if(!Array.isArray(list)||list.length>5000)syncFail('gallery_sync_registry','Eine ausdrücklich verwaltete Zielzuordnung fehlt.',422);
  const seen=new Set();
  for(const m of list){
   const profileOnly=m.kind==='module-profile';
   const sourceValid=profileOnly
    ?projection?.supportsModuleProfiles===true&&m.moduleUpdate&&!m.source&&!m.designs&&(!m.media||Array.isArray(m.media)&&m.media.length===0)&&m.mediaRequired===false
    :m.kind===undefined&&cfg.test(m.source?.productId)&&m.source?.designId&&m.source.originalId;
   if(typeof m.id!=='string'||!m.id||seen.has(m.id)||!sourceValid||!cfg.test(m.target?.productId)||!m.target.designId||!productGid.test(m.shopifyProductId)||!Array.isArray(m.shopifyVariantIds)||!m.shopifyVariantIds.length||m.shopifyVariantIds.some(v=>!variantGid.test(v))||new Set(m.shopifyVariantIds).size!==m.shopifyVariantIds.length)
    syncFail('gallery_sync_registry','Eine Galerie-/Produkt-/Varianten-Zuordnung ist unvollständig oder doppelt.',422);
   seen.add(m.id);
  }
  return list;
 }
 function environment(){return {mode:transport.mode,label:transport.mode==='test'?'Isoliertes Testsystem':'Shopify-Anschluss',executionEnabled:executionEnabled&&transport.canWrite===true,shopDomain};}
 function sourceCheck(source,mapping){const approval=sourceApproval({source,mapping,target:mapping});if(approval?.then||approval?.approved!==true)syncFail('gallery_sync_source_approval',approval?.reason||'Die aktuelle Galerievorlage benötigt ihre Sichtfreigabe.',422);}
 function brief(mapping){
  const result={id:mapping.id,kind:mapping.kind||'gallery-design',label:mapping.label||mapping.id,originalId:mapping.source?.originalId??null,shopifyProductId:mapping.shopifyProductId,source:mapping.source?clone(mapping.source):null,target:clone(mapping.target),issues:[]};
  try{
   const source=readSource(mapping),record=targetWorkshop.repository.get(mapping.target.productId),binding=activation.capture(mapping),profile=record.document.config.profile;
   Object.assign(result,{sourceRevision:source.record.revision,targetRevision:record.revision,boundRevision:binding.boundRevision,material:profile.material?.label||profile.material?.kind,size:{widthMm:profile.geometry.width,heightMm:profile.geometry.height},name:record.document.name});
   sourceCheck(source,mapping);compose(source,record,mapping);
   if(!binding.approved)syncFail('gallery_sync_binding_approval','Dieses Ziel hat noch keine bestehende Katalogfreigabe; zuerst den getrennten Erstanschluss abschließen.',422);
   if(record.revision!==binding.boundRevision)syncFail('gallery_sync_pending_draft','Für dieses Produkt liegt bereits ein ungeprüfter Zielentwurf vor.');
  }catch(e){result.issues.push(issue(e));}
  result.ready=result.issues.length===0;result.reason=result.ready?'Bestehende Zuordnung und Galeriequelle sind prüfbar.':result.issues.map(i=>i.message).join(' ');return result;
 }
 function listTargets(){return {schema:SCHEMA,...environment(),targets:registry().map(brief)};}
 function readPlan(id,sha){const row=db.prepare('SELECT * FROM gallery_shop_sync_plans WHERE scope=? AND id=?').get(scope,id);if(!row||sha&&row.sha!==sha)syncFail('gallery_sync_plan','Der feste Vorschauplan fehlt oder wurde verändert.',404);const value=JSON.parse(row.document);if(syncHash(value)!==row.sha)syncFail('gallery_sync_plan_integrity','Der gespeicherte Vorschauplan ist beschädigt.');return {...value,planSha256:row.sha};}
 function publicPlan(plan){return {schema:SCHEMA,planId:plan.id,planSha256:plan.planSha256,createdAt:plan.createdAt,...environment(),ready:plan.ready,
  entries:plan.entries.map(e=>({id:e.id,kind:e.mapping.kind||'gallery-design',label:e.mapping.label||e.id,originalId:e.mapping.source?.originalId??null,source:e.source??e.mapping.source??null,target:{...e.mapping.target,revision:e.expectedRevision??null},shopifyProductId:e.mapping.shopifyProductId,boundRevision:e.binding?.boundRevision??null,changes:e.changes,issues:e.issues,beforeSvg:e.beforeSvg,afterSvg:e.afterSvg,designPreviews:e.designPreviews||[],images:e.images.map(i=>({id:i.id,sha256:i.sha256})),ready:e.issues.length===0}))};}
 async function plan({targetIds}={}){
  if(!Array.isArray(targetIds)||!targetIds.length||targetIds.length>25||new Set(targetIds).size!==targetIds.length)syncFail('gallery_sync_targets','Bitte eindeutige bestehende Zielprodukte auswählen (höchstens 25).',422);
  const all=registry(),selected=targetIds.map(id=>{const m=all.find(m=>m.id===id);if(!m)syncFail('gallery_sync_target_missing','Eine ausgewählte Zuordnung ist nicht mehr vorhanden.',404);return m;});
  if(new Set(selected.map(m=>m.target.productId)).size!==selected.length||new Set(selected.map(m=>m.shopifyProductId)).size!==selected.length)
   syncFail('gallery_sync_target_duplicate','Pro Plan darf jedes Konfi-/Shopprodukt nur einmal enthalten sein. Mehrere Designs benötigen eine gemeinsame ausdrückliche Designgruppen-Zuordnung.',422);
  const entries=[];
  for(const mapping of selected){
   const entry={id:mapping.id,mapping,changes:[],issues:[],beforeSvg:null,afterSvg:null,images:[]};entries.push(entry);
   try{
    const source=readSource(mapping),record=targetWorkshop.repository.get(mapping.target.productId),binding=activation.capture(mapping);
    Object.assign(entry,{source:source.evidence,expectedRevision:record.revision,expectedDocumentSha256:syncHash(record.document),binding});
    sourceCheck(source,mapping);
    if(!binding.approved)syncFail('gallery_sync_binding_approval','Für dieses bestehende Ziel fehlt die Katalogfreigabe.',422);
    if(binding.boundRevision!==record.revision)syncFail('gallery_sync_pending_draft','Ein vorhandener Zielentwurf muss zuerst geklärt werden.');
    const proposed=compose(source,record,mapping);
    if(projection)await projection.ensureAssets(source);else await ensureNativeAssets(sourceWorkshop,targetWorkshop,source);
    entry.document=validateProductDocument(proposed);entry.documentSha256=syncHash(entry.document);
    entry.newRevision=record.revision+(entry.documentSha256===entry.expectedDocumentSha256?0:1);
    // A profile-only plan never changes artwork. Its useful preview is the
    // explicit module diff, not two identical renders requiring a write-capable
    // asset/workshop constructor on the independent customer data store.
    if(mapping.kind!=='module-profile'){
     entry.beforeSvg=targetWorkshop.editorPreview(record.document,mapping.target.designId).svg;entry.afterSvg=targetWorkshop.editorPreview(entry.document,mapping.target.designId).svg;
    }
    if(mapping.designs)entry.designPreviews=mapping.designs.map(d=>({designId:d.target.designId,originalId:d.source.originalId,beforeSvg:targetWorkshop.editorPreview(record.document,d.target.designId).svg,afterSvg:targetWorkshop.editorPreview(entry.document,d.target.designId).svg}));
    entry.baseline=await transport.inspect(mapping);validateRemote(entry,entry.baseline);
    if(activation.prepare)entry.pricing=activation.prepare({mapping,record,document:entry.document,binding,remote:entry.baseline});
    const assigned=mapping.media||[];
    if(assigned.length){
     if(!prepareImage||!transport.canUpdateImages)syncFail('gallery_sync_media_provider','Der native Produktbild-Export und gezielte Medienanschluss fehlen noch.',422);
     if(environment().executionEnabled&&transport.canWriteImages!==true)syncFail('gallery_sync_media_disabled','Die gezielte Aktualisierung der Produktbilder ist serverseitig noch nicht freigegeben.',422);
     if(mapping.designs){
      if(assigned.some(image=>!entry.designPreviews.some(d=>d.designId===image.designId)))syncFail('gallery_sync_media_design','Jedes Produktbild benötigt die ausdrückliche zugehörige Design-ID; Nebenentwürfe dürfen das Hauptbild nicht ersetzen.',422);
      for(const preview of entry.designPreviews){const media=assigned.filter(image=>image.designId===preview.designId);if(media.length)entry.images.push(...await prepareImage({mapping:{...mapping,target:{...mapping.target,designId:preview.designId},media},document:clone(entry.document),beforeSvg:preview.beforeSvg,afterSvg:preview.afterSvg}));}
     }else entry.images=await prepareImage({mapping,document:clone(entry.document),beforeSvg:entry.beforeSvg,afterSvg:entry.afterSvg});
     if(!Array.isArray(entry.images)||entry.images.length!==assigned.length||new Set(entry.images.map(i=>i.id)).size!==assigned.length||entry.images.some(i=>!assigned.some(a=>a.id===i.id)||!entry.baseline.media.some(m=>m.id===i.id)||!/^[a-f0-9]{64}$/.test(i.sha256)||typeof i.url!=='string'||!/^https:\/\//.test(i.url)))
      syncFail('gallery_sync_media_plan','Die Produktbilder brauchen eindeutige bestehende Medien-IDs, geprüfte Bildinhalte und gesicherte Quellen.',422);
    }else if(mapping.mediaRequired!==false)syncFail('gallery_sync_media_mapping','Das zugehörige Shop-Produktbild ist noch nicht ausdrücklich zugeordnet.',422);
    const origin=mapping.kind==='module-profile'
     ?{kind:'module-profile',nativeSource:{productId:source.capability.id,revision:source.capability.revision},moduleProfile:{id:source.module.id,revision:source.module.revision,sha256:source.module.sha256}}
     :{originalId:mapping.source.originalId};
    entry.desired={images:clone(entry.images),release:canonical({schema:SCHEMA,...origin,sourceRevision:source.record.revision,sourceFingerprint:source.evidence.fingerprint,productId:record.id,productRevision:entry.newRevision,designId:mapping.target.designId,documentSha256:entry.documentSha256})};
    entry.changes=projection?projection.describe(source,record,entry.document,mapping):[{kind:'design',label:entry.newRevision===record.revision?'Gestaltung bereits identisch':'Gesicherte native Gestaltung übernehmen'},{kind:'startDesign',label:'Bestehende Startdesign-ID beibehalten; ihr Inhalt wird aktualisiert'},{kind:'images',label:entry.images.length?entry.images.length+' zugeordnete Produktbilder aktualisieren':'Für diese Zuordnung ausdrücklich keine Produktbilder ändern'},{kind:'commerce',label:'Preise, Ausführungen, Bestand, Texte und SEO beibehalten'}];
   }catch(e){entry.issues.push(issue(e));}
  }
  const value={schema:SCHEMA,id:'gsp_'+randomUUID(),tenantId,shopDomain,createdAt:new Date(clock()).toISOString(),mode:transport.mode,ready:entries.every(e=>!e.issues.length),entries};
  const sha=syncHash(value);db.prepare('INSERT INTO gallery_shop_sync_plans(scope,id,sha,document,created_at) VALUES(?,?,?,?,?)').run(scope,value.id,sha,JSON.stringify(value),value.createdAt);
  return publicPlan({...value,planSha256:sha});
 }
 function validateRemote(entry,remote){
  if(remote.shopDomain!==shopDomain||remote.id!==entry.mapping.shopifyProductId||!Array.isArray(remote.variants)||remote.variants.length!==entry.binding.heads.length||entry.binding.heads.some(h=>!remote.variants.some(v=>v.id===h.shopifyVariantId&&v.priceCents===h.unitCents)))
   syncFail('gallery_sync_remote_identity','Shopprodukt, vollständige Varianten oder Preise stimmen nicht mit der bestehenden Bindung überein.');
 }
 function operation(id){const row=db.prepare('SELECT * FROM gallery_shop_sync_operations WHERE scope=? AND id=?').get(scope,id);if(!row)syncFail('gallery_sync_operation','Der Synchronisierungsvorgang fehlt.',404);return JSON.parse(row.document);}
 function status({operationId}={}){
  const values=operationId?[operation(operationId)]:db.prepare('SELECT document FROM gallery_shop_sync_operations WHERE scope=? ORDER BY rowid DESC LIMIT 30').all(scope).map(r=>JSON.parse(r.document));
  return {schema:SCHEMA,...environment(),operations:values.map(o=>({id:o.id,planId:o.planId,state:o.state,createdAt:o.createdAt,updatedAt:o.updatedAt,entries:o.entries,error:o.error??null}))};
 }
 function checkSource(entry){const source=readSource(entry.mapping);if(syncHash(source.evidence)!==syncHash(entry.source))syncFail('gallery_sync_source_changed','Die Galerievorlage, das Modulprofil oder eine Ressource wurde seit der Vorschau geändert.');sourceCheck(source,entry.mapping);return source;}
 function checkRegistry(entry){const current=registry().find(m=>m.id===entry.id);if(!current||syncHash(current)!==syncHash(entry.mapping))syncFail('gallery_sync_mapping_changed','Die ausdrückliche Zielzuordnung hat sich seit der Vorschau geändert.');}
 async function run(planId,planSha256,reconcileOnly=false){
  const prepared=readPlan(planId,planSha256);
  if(!prepared.ready)syncFail('gallery_sync_not_ready','Der Vorschauplan enthält offene Voraussetzungen.',422);
  if(!executionEnabled||transport.canWrite!==true)syncFail('gallery_sync_disabled','Synchronisieren ist auf diesem Server deaktiviert. Die Vorschau ist weiterhin möglich.',403);
  if(prepared.mode!==transport.mode)syncFail('gallery_sync_mode','Ein Testplan darf nicht in einem anderen System ausgeführt werden.');
  let row=db.prepare('SELECT * FROM gallery_shop_sync_operations WHERE scope=? AND plan_id=?').get(scope,planId);
  if(!row){
   const initial={id:'gso_'+randomUUID(),planId,state:'prepared',createdAt:new Date(clock()).toISOString(),updatedAt:new Date(clock()).toISOString(),entries:prepared.entries.map(e=>({id:e.id,stage:'planned',revision:e.newRevision}))};
   db.prepare('INSERT OR IGNORE INTO gallery_shop_sync_operations(scope,id,plan_id,document) VALUES(?,?,?,?)').run(scope,initial.id,planId,JSON.stringify(initial));
   row=db.prepare('SELECT * FROM gallery_shop_sync_operations WHERE scope=? AND plan_id=?').get(scope,planId);
  }
  let op=JSON.parse(row.document);if(op.state==='completed'){db.prepare('DELETE FROM gallery_shop_sync_target_owners WHERE scope=? AND operation_id=?').run(scope,op.id);return status({operationId:op.id});}
  const owner=randomUUID(),claimed=db.prepare('UPDATE gallery_shop_sync_operations SET owner=?,lease_until=? WHERE scope=? AND id=? AND (owner IS NULL OR lease_until<?)').run(owner,clock()+300000,scope,op.id,clock());
  if(!claimed.changes)syncFail('gallery_sync_busy','Dieser Vorgang wird bereits ausgeführt. Bitte den aktuellen Status anzeigen.');
  const persist=()=>{op.updatedAt=new Date(clock()).toISOString();const result=db.prepare('UPDATE gallery_shop_sync_operations SET document=?,lease_until=? WHERE scope=? AND id=? AND owner=?').run(JSON.stringify(op),clock()+300000,scope,op.id,owner);if(result.changes!==1)syncFail('gallery_sync_lease','Der Vorgang wurde von einer anderen Ausführung übernommen.');};
  const claimTargets=()=>{
   db.exec('BEGIN IMMEDIATE');
   try{
    for(const entry of prepared.entries)for(const key of ['config:'+entry.mapping.target.productId,entry.mapping.shopifyProductId]){
     const held=db.prepare('SELECT operation_id FROM gallery_shop_sync_target_owners WHERE scope=? AND target_key=?').get(scope,key);
     // An uncertain remote write never becomes safe merely because time passes.
     if(held&&held.operation_id!==op.id){
      if(operation(held.operation_id).state!=='completed')syncFail('gallery_sync_target_busy','Für dieses Produkt läuft bereits ein anderer Vorgang. Bitte diesen gespeicherten Vorgang zuerst prüfen.');
      db.prepare('DELETE FROM gallery_shop_sync_target_owners WHERE scope=? AND target_key=? AND operation_id=?').run(scope,key,held.operation_id);
     }
     db.prepare('INSERT OR IGNORE INTO gallery_shop_sync_target_owners(scope,target_key,operation_id) VALUES(?,?,?)').run(scope,key,op.id);
    }
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
  };
  try{
   claimTargets();
   op=operation(op.id);op.error=null;op.state='running';persist();
   // All targets are checked before any new draft or outbound write.
   for(const entry of prepared.entries){
    checkRegistry(entry);const source=checkSource(entry);
    const record=targetWorkshop.repository.get(entry.mapping.target.productId),hash=syncHash(record.document),progress=op.entries.find(e=>e.id===entry.id);
    if(record.revision===entry.newRevision&&hash===entry.documentSha256){if(['planned','draft-intent'].includes(progress.stage))progress.stage='draft';}
    else if(record.revision!==entry.expectedRevision||hash!==entry.expectedDocumentSha256||!['planned','draft-intent'].includes(progress.stage))syncFail('gallery_sync_target_changed','Der Zielstand wurde parallel geändert. Es wird nichts überschrieben.');
    else progress.stage='planned';
    // Stored plans may predate a stricter identity check. Recheck before any
    // target revision or outbound request, including a resumed operation.
    assertTarget(source,record,entry.mapping);
    const current=activation.capture(entry.mapping);
    if(syncHash(current)!==syncHash(entry.binding)&&!(current.boundRevision===entry.newRevision&&current.approved&&hash===entry.documentSha256))syncFail('gallery_sync_binding_changed','Die aktive Bindung wurde parallel geändert.');
    const fresh=await transport.inspect(entry.mapping);validateRemote(entry,fresh);
    if(remoteCommerceHash(fresh)!==remoteCommerceHash(entry.baseline))syncFail('gallery_sync_remote_commerce_changed','Angebot, Varianten, Preisvertrag oder Produkttexte im Shop wurden parallel geändert.');
    if(activation.prepare&&syncHash(activation.prepare({mapping:entry.mapping,record,document:entry.document,binding:entry.binding,remote:fresh}))!==syncHash(entry.pricing))syncFail('gallery_sync_pricing_changed','Die geprüften Zusatzpreisverträge haben sich seit der Vorschau geändert.');
   }
   persist();
   for(const entry of prepared.entries){
    const progress=op.entries.find(e=>e.id===entry.id);
    if(progress.stage==='planned'){
     if(reconcileOnly){op.state='pending';persist();return status({operationId:op.id});}
     progress.stage='draft-intent';persist();
     try{checkRegistry(entry);checkSource(entry);targetWorkshop.repository.save(entry.mapping.target.productId,clone(entry.document),entry.expectedRevision);}
     catch(error){progress.stage='planned';persist();throw error;}
     checkpoint('after-draft',{entry,operationId:op.id});progress.stage='draft';persist();
    }
   }
   for(const entry of prepared.entries){
    const progress=op.entries.find(e=>e.id===entry.id);checkSource(entry);
    const remote=await transport.inspect(entry.mapping);validateRemote(entry,remote);
    if(remoteCommerceHash(remote)!==remoteCommerceHash(entry.baseline))syncFail('gallery_sync_remote_commerce_changed','Angebot, Varianten oder Produkttexte im Shop wurden parallel geändert.');
    if(remoteReleaseMatches(remote,entry.desired)){progress.stage='verified';persist();continue;}
    if(progress.stage==='unknown'||progress.stage==='verified'){
     op.state='reconciliation-needed';op.error={code:'gallery_sync_remote_unknown',message:'Shopify hat den vorherigen Schreibvorgang noch nicht eindeutig bestätigt. Nur erneut lesen; keinen zweiten Schreibvorgang senden.'};persist();return status({operationId:op.id});
    }
    if(!remoteBaselineMatches(remote,entry.baseline))syncFail('gallery_sync_remote_changed','Die Shopdaten unterscheiden sich vom bestätigten Vorschauplan.');
    if(reconcileOnly){op.state='pending';persist();return status({operationId:op.id});}
    // The authenticated remote read yields. Recheck local evidence after it,
    // immediately before the durable write intent and any outbound mutation.
    const beforeWrite=()=>{
     checkRegistry(entry);checkSource(entry);
     const targetBeforeWrite=targetWorkshop.repository.get(entry.mapping.target.productId);
     if(targetBeforeWrite.revision!==entry.newRevision||syncHash(targetBeforeWrite.document)!==entry.documentSha256)syncFail('gallery_sync_target_changed','Der Zielentwurf wurde während der Shopprüfung geändert.');
     if(syncHash(activation.capture(entry.mapping))!==syncHash(entry.binding))syncFail('gallery_sync_binding_changed','Die aktive Zuordnung wurde während der Shopprüfung geändert.');
    };
    beforeWrite();
    progress.stage='unknown';persist(); // durable intent BEFORE any outbound write
    await transport.apply({mapping:entry.mapping,baseline:entry.baseline,desired:entry.desired,operationId:op.id,beforeWrite});
    checkpoint('after-remote',{entry,operationId:op.id});
    const checked=await transport.inspect(entry.mapping);validateRemote(entry,checked);
    if(remoteCommerceHash(checked)!==remoteCommerceHash(entry.baseline)||!remoteReleaseMatches(checked,entry.desired))syncFail('gallery_sync_remote_unverified','Der neue Shopstand ist noch nicht vollständig nachgewiesen.');
    progress.stage='verified';persist();
   }
   const activationEntries=[];
   for(const entry of prepared.entries){
    checkRegistry(entry);checkSource(entry);
    const remote=await transport.inspect(entry.mapping);validateRemote(entry,remote);
    if(remoteCommerceHash(remote)!==remoteCommerceHash(entry.baseline)||!remoteReleaseMatches(remote,entry.desired))syncFail('gallery_sync_remote_unverified','Der Shopstand hat sich vor der Freigabe geändert.');
    activationEntries.push({...entry,remote});
   }
   for(const entry of prepared.entries){checkRegistry(entry);checkSource(entry);}
   persist();activation.activate({entries:activationEntries,operationId:op.id});checkpoint('after-activation',{operationId:op.id});
   op.state='completed';op.entries.forEach(e=>e.stage='activated');persist();return status({operationId:op.id});
  }catch(error){op.state=op.entries.some(e=>e.stage==='unknown')?'reconciliation-needed':'conflict';op.error=issue(error);persist();return status({operationId:op.id});}
  finally{
   if(op.state==='completed'||op.entries.every(e=>e.stage==='planned'))db.prepare('DELETE FROM gallery_shop_sync_target_owners WHERE scope=? AND operation_id=?').run(scope,op.id);
   db.prepare('UPDATE gallery_shop_sync_operations SET owner=NULL,lease_until=0 WHERE scope=? AND id=? AND owner=?').run(scope,op.id,owner);
  }
 }
 return Object.freeze({listTargets,status,plan,openPlan({planId}={}){return publicPlan(readPlan(planId));},preview({planId,targetId}){const p=readPlan(planId),e=p.entries.find(e=>e.id===targetId);if(!e)syncFail('gallery_sync_target_missing','Ziel nicht im Plan.',404);return {beforeSvg:e.beforeSvg,afterSvg:e.afterSvg};},
  confirm({planId,planSha256,accepted}={}){
   if(accepted!==true||!/^[a-f0-9]{64}$/.test(planSha256))syncFail('gallery_sync_confirmation','Bitte genau die angezeigten Änderungen ausdrücklich bestätigen.',422);
   const plan=readPlan(planId,planSha256);if(!plan.ready)syncFail('gallery_sync_not_ready','Der Vorschauplan enthält offene Voraussetzungen.',422);
   for(const entry of plan.entries){checkRegistry(entry);checkSource(entry);const record=targetWorkshop.repository.get(entry.mapping.target.productId);if(record.revision!==entry.expectedRevision||syncHash(record.document)!==entry.expectedDocumentSha256)syncFail('gallery_sync_target_changed','Der Zielstand wurde seit der Vorschau geändert.');}
   const id='gsc_'+randomUUID();db.prepare('INSERT OR IGNORE INTO gallery_shop_sync_confirmations(scope,id,plan_id,plan_sha,created_at) VALUES(?,?,?,?,?)').run(scope,id,planId,planSha256,new Date(clock()).toISOString());
   const row=db.prepare('SELECT id FROM gallery_shop_sync_confirmations WHERE scope=? AND plan_id=? AND plan_sha=?').get(scope,planId,planSha256);return {confirmationId:row.id,planId,planSha256};
  },
  execute({planId,planSha256,confirmationId}={}){if(!/^[a-f0-9]{64}$/.test(planSha256))syncFail('gallery_sync_confirmation','Bitte den festen Vorschauplan bestätigen.',422);if(requireConfirmation&&!db.prepare('SELECT 1 FROM gallery_shop_sync_confirmations WHERE scope=? AND id=? AND plan_id=? AND plan_sha=?').get(scope,confirmationId??'',planId,planSha256))syncFail('gallery_sync_confirmation','Die ausdrückliche Bestätigung dieses Änderungsplans fehlt.',409);return run(planId,planSha256);},
  reconcile({operationId}={}){const o=operation(operationId),p=readPlan(o.planId);return run(o.planId,p.planSha256,true);}});
}
