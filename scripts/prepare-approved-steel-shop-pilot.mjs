// Authorized pilot: four approved Andenken designs, 50 x 20 mm, normal sign
// mountings, Shopify DRAFT only. No network, publication or live-order approval.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createWorkshop} from '../app/workshop/http.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';
import {prepareShopProduct} from '../app/workshop/shop-preparation.mjs';
import {shopDraftRequest} from '../app/workshop/shop-draft-transfer.mjs';
import {nativeDesignReviewFingerprint} from './lib/design-review-approvals.mjs';
import {rendererSignature} from './lib/slate-review-approval-targets.mjs';

export const STEEL_PILOT = Object.freeze({
  schema:'gravuru-approved-steel-shop-pilot/v1', sourceSchema:'gravuru-approved-steel-pilot-source/v1',
  familyId:'steel-door-signs', sizeKey:'GR-ES-RE-50X20-T15', material:'steel',
  originals:Object.freeze(['TRE-V2A-5x2-D401','TRE-V2A-5x2-D406','TRE-V2A-5x2-D408','TRE-V2A-5x2-D410']),
  mountings:Object.freeze(['K00','KGL','KRA','B02','B02S']),
  name:'Andenkenschild Edelstahl – 5 × 2 cm', shopDomain:'gravuru-design.myshopify.com'
});
const fail=message=>{throw Error(message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const same=(a,b)=>digest(a)===digest(b);
const fingerprint=(document,designId,options)=>nativeDesignReviewFingerprint({document,designId,...options});
const names=()=>STEEL_PILOT.originals.map(id=>'katalog-'+id);

/** Pure preparation from a fresh, authenticated host export. Recomputes the
 * exact gallery fingerprints, using the same renderer and resource resolver.
 * This validates the supplied snapshot, not freshness of an unseen live host. */
export function prepareApprovedSteelShopPilot(bundle,{rendererVersion=rendererSignature(),resourceResolvers={}}={}){
  if(bundle?.schema!==STEEL_PILOT.sourceSchema||!Number.isFinite(Date.parse(bundle.checkedAtUtc))||!bundle.approvals||Array.isArray(bundle.approvals))fail('Vollständiger bestätigter Host-Quellstand fehlt.');
  const source=bundle.source;
  if(!/^cfg_[a-f0-9-]{36}$/.test(source?.id||'')||!Number.isSafeInteger(source.revision)||source.revision<1||!['draft','active'].includes(source.status))fail('Gültiger nativer Quellstand fehlt.');
  const sourceDocument=validateProductDocument(source.document),c=sourceDocument.config,p=c.profile;
  if(sourceDocument.kind!=='product'||c.reviewOnly!==true||p.features?.orderEnabled!==false||p.features?.productionConfirmed!==false)fail('Dieser Pilot benötigt eine unveröffentlichte native Prüfvorlage.');
  if(p.material.kind!=='steel'||p.geometry.width!==50||p.geometry.height!==20||c.productExecution?.kind!=='door-sign'||c.productExecution?.sourceFamilyId!==STEEL_PILOT.familyId||c.familyFormats||c.steelFormats||c.scalableSizes)fail('Nur der freigegebene Edelstahl-Festformatpilot 50 × 20 mm ist zulässig.');
  const selected=names(),proof=[];
  if(new Set(p.designs.map(d=>d.id)).size!==p.designs.length)fail('Doppelte native Designkennungen.');
  for(const originalId of STEEL_PILOT.originals){
    const designId='katalog-'+originalId,key=JSON.stringify(['steel',originalId,STEEL_PILOT.sizeKey]);
    const state=bundle.approvals[key],m=state?.metadata,design=p.designs.find(d=>d.id===designId);
    if(!design||(design.katalog?.originalId??design.katalog?.designId)!==originalId)fail('Freigegebenes Original fehlt im nativen Quellstand: '+originalId);
    if(state?.key!==key||state.status!=='approved'||state.approved!==true||!Number.isSafeInteger(state.revision)||state.revision<1||!state.fingerprint||state.approvedFingerprint!==state.fingerprint)fail('Gültige Freigabe fehlt: '+originalId);
    if(m?.key!==key||m.id!==originalId||m.designId!==designId||m.productId!==source.id||m.productRevision!==source.revision||m.materialKey!=='steel'||m.materialKind!=='steel'||m.familyId!==STEEL_PILOT.familyId||m.sizeKey!==STEEL_PILOT.sizeKey||!same(m.mm,[50,20]))fail('Freigabe gehört zu einem anderen Produkt-, Material- oder Größenstand: '+originalId);
    const actual=fingerprint(sourceDocument,designId,{rendererVersion,resourceResolvers});
    if(actual!==state.fingerprint)fail('Freigabe passt nicht mehr zu Design, Ressourcen oder Renderer: '+originalId);
    proof.push({originalId,designId,key,approvalRevision:state.revision,fingerprint:actual,approvalStateSha256:digest(state)});
  }
  const sourcePreparation=prepareShopProduct({...source,document:sourceDocument});
  if(!sourcePreparation.sourceReady||sourcePreparation.variants.length!==5||!same(sourcePreparation.variants.map(v=>v.options.mounting),STEEL_PILOT.mountings)||sourcePreparation.variants.some(v=>Object.keys(v.options).join(',')!=='mounting'||v.widthMm!==50||v.heightMm!==20))fail('Die fünf nativen Schildbefestigungen sind nicht vollständig.');
  const document=structuredClone(sourceDocument);
  document.name=STEEL_PILOT.name;document.seo.title=STEEL_PILOT.name;
  document.config.profile.designs=selected.map(id=>document.config.profile.designs.find(d=>d.id===id));
  document.config.profile.defaultDesignId=selected[0];
  document.elementRights=Object.fromEntries(selected.map(id=>[id,document.elementRights[id]]));
  // Resources are retained exactly, including original masks/photos and unused
  // library entries. No reimport of catalogue baselines and no font fallback.
  const native=validateProductDocument(document);
  if(!same(native.config.localResources,c.localResources))fail('Native Ressourcen wurden während der Vorbereitung verändert.');
  for(const item of proof)if(fingerprint(native,item.designId,{rendererVersion,resourceResolvers})!==item.fingerprint)fail('Die getrennte Pilotfassung verändert eine bestätigte Gestaltung.');
  const prepared=prepareShopProduct({id:'pending-native-import',revision:1,status:'draft',document:native,metadata:{}});
  if(!same(prepared.variants,sourcePreparation.variants))fail('Ausführungen oder Preise weichen vom Quellstand ab.');
  const preview=shopDraftRequest({id:'pending-native-import',revision:1,status:'draft',document:native,metadata:{}},STEEL_PILOT.shopDomain);
  const {handle,tags,...unboundInput}=preview.input;
  const plan={schema:STEEL_PILOT.schema,scope:'draft-only',published:false,shopifyWrites:0,productionReady:false,sourceSnapshotOnly:true,
    source:{productId:source.id,revision:source.revision,documentSha256:digest(source.document),metadataSha256:digest(source.metadata??{}),checkedAtUtc:bundle.checkedAtUtc,designCount:p.designs.length},
    rendererVersion,approvals:proof,selectedDesignIds:selected,excludedDesignIds:p.designs.filter(d=>!selected.includes(d.id)).map(d=>d.id),
    importKey:'approved-steel-50x20-andenken:'+source.id,document:native,documentSha256:digest(native),
    variants:prepared.variants,shopPreview:{requiresNativeImport:true,input:unboundInput,mappings:preview.mappings},
    pending:['Shopify-Produkt-ID und Varianten-IDs entstehen erst beim getrennten DRAFT-Transfer.','Produktbilder, vollständige Shop-Inhalte und Shopify-Konfi-Metafelder sind nicht Bestandteil dieses Vorbereiters.','Keine Veröffentlichung, Bestellfreigabe oder Fertigungsfreigabe.']};
  return {...plan,planSha256:digest(plan)};
}

function assertPlan(plan){
  const {planSha256,...value}=plan??{};
  if(value.schema!==STEEL_PILOT.schema||digest(value)!==planSha256||digest(value.document)!==value.documentSha256)fail('Pilotplan ist unvollständig oder wurde verändert.');
}

/** Full native readback; only an actual new target ID can produce an executable
 * Shopify request. No remote creation is performed here. */
export function verifyApprovedSteelPilotReadback(plan,record){
  assertPlan(plan);
  if(!/^cfg_[a-f0-9-]{36}$/.test(record?.id||'')||record.id===plan.source.productId||record.revision!==1||record.status!=='draft'||record.publishedRevision!==null||!same(record.document,plan.document))fail('Der zurückgelesene native Entwurf stimmt nicht vollständig mit dem Plan überein.');
  const shopRequest=shopDraftRequest(record,STEEL_PILOT.shopDomain);
  if(!same(prepareShopProduct(record).variants,plan.variants)||shopRequest.input.status!=='DRAFT')fail('Zurückgelesene Ausführungen oder Shop-Entwurfsstatus stimmen nicht überein.');
  return {productId:record.id,revision:record.revision,documentSha256:digest(record.document),readbackComplete:true,published:false,shopifyWrites:0,productionReady:false,shopRequest};
}

/** Same guarded import path as product-group creation. The caller supplies a
 * fresh server-owned source/approval reader; a saved JSON file alone cannot
 * authorize importing a changed or since-revoked source. Never updates a head. */
export function importApprovedSteelShopPilot(plan,{repository,currentBundle,rendererVersion=rendererSignature(),resourceResolvers={}}={}){
  assertPlan(plan);
  if(repository?.transactionalImportGuards!==true||typeof currentBundle!=='function')fail('Transaktionsgeschützter Import und aktuelle serverseitige Freigabeprüfung erforderlich.');
  const recheck=()=>{
    const current=prepareApprovedSteelShopPilot(currentBundle(),{rendererVersion,resourceResolvers});
    // Observation time may advance. Everything affecting the approved source,
    // exact plan, prices, rights, resources and approval events must stay equal.
    const comparable=x=>({...x,source:{...x.source,checkedAtUtc:null},planSha256:null});
    if(!same(comparable(current),comparable(plan)))fail('Quellstand, Freigaben oder Pilotplan wurden inzwischen verändert.');
  };
  recheck();
  const existing=repository.importItem(plan.importKey);
  if(existing)verifyApprovedSteelPilotReadback(plan,repository.get(existing.id));
  const [saved]=repository.importBatch([{key:plan.importKey,fingerprint:plan.documentSha256,document:plan.document}],{beforeWrite:recheck});
  return {...verifyApprovedSteelPilotReadback(plan,repository.get(saved.id)),created:saved.created,importKey:plan.importKey,planSha256:plan.planSha256};
}

// State is derived from actual latest events and the current source; the
// exported approved=true never replaces the persisted approval at import time.
function currentSourceBundle(bundle,repository,approvalDb,options){
  const source=repository.get(bundle.source.id),approvals={};
  for(const originalId of STEEL_PILOT.originals){
    const key=JSON.stringify(['steel',originalId,STEEL_PILOT.sizeKey]),prior=bundle.approvals[key];
    const event=approvalDb.prepare('SELECT revision,approved,fingerprint,actor,created_at FROM design_review_approval_events WHERE target_key=? ORDER BY revision DESC LIMIT 1').get(key);
    const actual=fingerprint(source.document,'katalog-'+originalId,options),approved=!!(event?.approved&&event.fingerprint===actual);
    approvals[key]={key,approved,status:approved?'approved':event?.approved?'changed':'unreviewed',revision:event?.revision||0,fingerprint:actual,approvedFingerprint:event?.approved?event.fingerprint:null,updatedAt:event?.created_at||null,actor:event?.actor||null,metadata:{...prior.metadata,productRevision:source.revision}};
  }
  return {...bundle,source,approvals};
}

/** Match the normal approval-save lock order: approval reservation first,
 * native repository write transaction second. No approval row is written.
 * Hold the reservation through importBatch's commit and complete readback so
 * a concurrent revocation cannot slip between the guard and native commit. */
export function importApprovedSteelShopPilotWithApprovalReservation(plan,{bundle,repository,approvalDb,rendererVersion=rendererSignature(),resourceResolvers={}}={}){
  const options={rendererVersion,resourceResolvers};
  approvalDb.exec('BEGIN IMMEDIATE');
  try{
    return importApprovedSteelShopPilot(plan,{repository,currentBundle:()=>currentSourceBundle(bundle,repository,approvalDb,options),...options});
  }finally{
    // Release only the reservation. Approval history remains byte-for-byte
    // unchanged, including when validation or the native transaction fails.
    approvalDb.exec('ROLLBACK');
  }
}

/** Explicit local operator command, invoked by the authorized root only.
 * A successful native import may survive an output failure; import journal
 * identity makes retry safe. It never calls a Shopify transport. */
function importFromExistingDatabase(plan,bundle,filename){
  const resolved=path.resolve(filename),approvalsFile=path.join(path.dirname(resolved),'review-approvals.sqlite');
  for(const file of [resolved,approvalsFile])if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile())fail('Vorhandene native Werkstatt- und Freigabedatenbank erforderlich.');
  // Fail before opening any writing service when this is the wrong database.
  const check=new DatabaseSync(resolved,{readOnly:true});
  try{
    const row=check.prepare('SELECT p.id,p.revision,r.document FROM products p JOIN product_revisions r ON r.product_id=p.id AND r.tenant_id=p.tenant_id AND r.revision=p.revision WHERE p.id=? AND p.tenant_id=?').get(plan.source.productId,'gravuru');
    if(!row||row.revision!==plan.source.revision||digest(JSON.parse(row.document))!==plan.source.documentSha256)fail('Die Datenbank enthält nicht den bestätigten aktuellen Quellstand.');
  }finally{check.close();}
  // A writable connection is required for a short write reservation. The
  // operation itself only SELECTs approvals and always rolls this DB back.
  const approvalDb=new DatabaseSync(approvalsFile);let workshop;
  try{
    approvalDb.exec('PRAGMA busy_timeout=5000');
    // Existing database only: the seed cannot replace existing products.
    workshop=createWorkshop({filename:resolved,seedConfig:bundle.source.document.config,legacy:{}});
    const options={rendererVersion:plan.rendererVersion,resourceResolvers:{asset:id=>workshop.assets.read(id),font:id=>workshop.fonts.resources()[id]}};
    const result=importApprovedSteelShopPilotWithApprovalReservation(plan,{bundle,repository:workshop.repository,approvalDb,...options});
    const createdRecord=workshop.repository.get(result.productId);
    return {...result,createdRecord,shopDraftRequest:result.shopRequest};
  }finally{workshop?.close();approvalDb.close();}
}

export function run(argv){
  const args={};for(let i=0;i<argv.length;i+=2){if(!['--source','--out','--record','--db','--confirm'].includes(argv[i])||!argv[i+1]||argv[i+1].startsWith('--')||args[argv[i]])fail('Aufruf: --source <Host-Bundle.json> --out <neue-Ausgabe.json> [--record <nativer-Readback.json> | --db <vorhandene-workshop.sqlite> --confirm <planSha256>]');args[argv[i]]=argv[i+1];}
  if(!args['--source']||!args['--out'])fail('--source und --out erforderlich.');
  if(args['--record']&&args['--db']||!!args['--db']!==!!args['--confirm'])fail('--db benötigt exakt den bestätigten Planhash; --record ist ein eigener Nur-Leseweg.');
  if(fs.existsSync(args['--out']))fail('Ausgabedatei existiert bereits; kein Überschreiben.');
  const bundle=JSON.parse(fs.readFileSync(args['--source'],'utf8')),plan=prepareApprovedSteelShopPilot(bundle);
  if(args['--db']&&args['--confirm']!==plan.planSha256)fail('Bestätigung gehört nicht zum vollständig vorbereiteten Pilotplan.');
  const result=args['--db']?{plan,...importFromExistingDatabase(plan,bundle,args['--db'])}:args['--record']?{plan,readback:verifyApprovedSteelPilotReadback(plan,JSON.parse(fs.readFileSync(args['--record'],'utf8')))}:plan;
  fs.writeFileSync(args['--out'],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  return {planSha256:plan.planSha256,source:plan.source.productId,sourceRevision:plan.source.revision,designs:plan.selectedDesignIds.length,variants:plan.variants.length,scope:'draft-only',shopifyWrites:0,readbackComplete:!!(result.readback||result.readbackComplete),...(result.productId?{productId:result.productId,created:result.created}:{})};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){try{console.log(JSON.stringify(run(process.argv.slice(2))));}catch(error){console.error(error.message);process.exitCode=1;}}
