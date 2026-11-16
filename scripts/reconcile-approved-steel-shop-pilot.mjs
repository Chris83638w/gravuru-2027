// Private operator bridge for genuine, freshly captured Shopify connector output.
// No credentials, network client, product creation or publication. The operator
// must supply the complete unique-handle lookup, including every product status.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as same} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {createOrderIntake} from '../app/workshop/order-intake.mjs';
import {createShopDraftJournal,createShopDraftTransfer,verifyShopDraftProduct,SHOP_DRAFT_LOOKUP} from '../app/workshop/shop-draft-transfer.mjs';
import {openWorkshopDb,checkSelections,applyChecks} from './shop-bind.mjs';
import {STEEL_PILOT,verifyApprovedSteelPilotReadback} from './prepare-approved-steel-shop-pilot.mjs';

export const CONNECTOR_LOOKUP=SHOP_DRAFT_LOOKUP.replace('shop {','shop { id').replace('variants(first: 100)','variants(first: 50)').replace('id handle title status tags','id handle title status publishedAt onlineStoreUrl tags');
export const MAX_EVIDENCE_AGE_MS=60000;
const tenantId='gravuru',shopDomain=STEEL_PILOT.shopDomain;
const fail=(message,status=409)=>{throw Object.assign(Error(message),{status,code:'approved_steel_pilot_reconcile'});};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

function nativeRequest(native,record){
  const checked=verifyApprovedSteelPilotReadback(native?.plan,record);
  if(!same(native?.createdRecord,record)||!same(native?.shopDraftRequest,checked.shopRequest))
    fail('Nativer Readback oder Shop-Anfrage entspricht nicht dem unveränderten gespeicherten Pilotstand.');
  return checked.shopRequest;
}

export function verifyConnectorEvidence(evidence,request,{clock=Date.now,action}={}){
  if(!['claim','reconcile'].includes(action))fail('Nur claim oder reconcile ist erlaubt.',422);
  const raw=evidence?.checkedAtUtc,checked=typeof raw==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(raw)?Date.parse(raw):NaN,now=clock();
  if(!Number.isSafeInteger(now)||!Number.isFinite(checked)||checked>now||now-checked>MAX_EVIDENCE_AGE_MS)
    fail('Echter Connector-Readback muss höchstens 60 Sekunden alt sein und darf nicht aus der Zukunft stammen.');
  const data=evidence?.data;
  if(evidence.errors!==undefined&&(!Array.isArray(evidence.errors)||evidence.errors.length)||
    data?.shop?.myshopifyDomain!==shopDomain||request.shopDomain!==shopDomain||data.shop.currencyCode!=='EUR'||
    !/^gid:\/\/shopify\/Shop\/[1-9][0-9]{0,19}$/.test(data.shop.id||'')||
    !Array.isArray(data.products?.nodes)||data.products.pageInfo?.hasNextPage!==false)
    fail('Shop-Identität, Euro-Währung oder vollständiger Connector-Readback ist nicht bestätigt.');
  const nodes=data.products.nodes;
  if(action==='claim'){
    if(nodes.length!==0)fail('Für die erste Schreibabsicht muss die eindeutige Handle-Suche genau null Treffer liefern; vorhandenen Entwurf abgleichen.');
    return null;
  }
  if(nodes.length!==1)fail('Abgleich benötigt genau einen vollständigen Shop-Entwurf. Nicht erneut anlegen.');
  if(nodes[0]?.publishedAt!==null||nodes[0]?.onlineStoreUrl!==null)fail('Unveröffentlichter Entwurf ist nicht ausdrücklich bestätigt.');
  return verifyShopDraftProduct(nodes[0],request);
}

/** Only an authorized local operator supplies evidence; this is deliberately
 * not an HTTP endpoint and cannot attest how the connector output was obtained.
 * A failed local binding is resumed through reconcile, never a second create. */
export async function reconcileApprovedSteelShopPilot(native,{action,evidence,repository,orders,journal,storeId,adapter,clock=Date.now}={}){
  if(storeId!==undefined&&(!/^[A-Za-z0-9_-]{1,100}$/.test(storeId)||adapter?.storeId!==storeId||adapter.tenantId!==tenantId||adapter.shopDomain!==shopDomain))
    fail('Expliziter passender privater Store-Kontext für ID-Bindungen fehlt.',422);
  // Detach operator input before the first await; the captured evidence cannot
  // be swapped while the existing binding service checks the native revision.
  native=structuredClone(native);evidence=structuredClone(evidence);
  const request=nativeRequest(native,repository.get(native?.createdRecord?.id));
  const verify=()=>verifyConnectorEvidence(evidence,request,{clock,action});
  const result=verify(),existing=journal.get(request.identity);
  const summary={schema:'gravuru-approved-steel-shop-pilot-reconcile/v1',action,scope:'draft-only',published:false,productionReady:false,
    shopifyWrites:0,networkRequests:0,productId:request.productId,revision:request.revision,
    planSha256:native.plan.planSha256,requestSha256:request.requestSha256,
    evidence:{source:'operator-supplied-shopify-connector-readback',checkedAtUtc:evidence.checkedAtUtc,sha256:hash(evidence),
      shopId:evidence.data.shop.id,shopDomain,lookupQuery:'handle:'+request.handle+' AND status:active,draft,archived,unlisted'}};
  if(action==='claim'){
    if(existing?.state==='completed')fail('Abgeschlossener Transfer widerspricht der leeren Handle-Suche; erneut abgleichen.');
    if(!existing&&orders.bindings().some(b=>b.shopDomain===shopDomain&&b.productId===request.productId))
      fail('Pilot besitzt bereits Shop-Variantenbindungen. Keine zweite Anlage.');
    nativeRequest(native,repository.get(request.productId));verify();
    const ticket=journal.claim(request);
    return {...summary,transfer:ticket,claimed:ticket.claimed,mayCreateDraft:ticket.claimed,
      nextAction:ticket.claimed?'operator-create-once-then-fresh-reconcile':'fresh-reconcile-only',idBindingsRequested:false};
  }
  if(!existing)fail('Es wurde noch keine Schreibabsicht für diesen Pilot begonnen.');
  // The service intentionally skips lookup on completed replay; this bridge
  // must still reject changed/ACTIVE products and different Shopify IDs.
  if(existing.state==='completed'&&!same(existing.result,result))fail('Frischer Shop-Readback widerspricht dem abgeschlossenen Transfer.');
  const transport={async lookup(current){if(!same(current,request))fail('Shop-Anfrage wurde geändert.');return verify();},async create(){fail('Dieser Abgleich darf niemals Shopify-Produkte anlegen.');}};
  const guardedJournal={...journal,claim(current){verify();return journal.claim(current);},finish(identity,value){verify();journal.finish(identity,value);}};
  const guardedOrders={...orders,bindVariants(input){nativeRequest(native,repository.get(request.productId));verify();return orders.bindVariants(input);}};
  const transfer=createShopDraftTransfer({repository,orders:guardedOrders,journal:guardedJournal,config:{mode:'draft-only',shopDomain},transport});
  const completed=await transfer({productId:request.productId,expectedRevision:request.revision,sourceSha256:request.sourceSha256,action:'reconcile'},{role:'merchant',shopDomain});
  let idBindings=null;
  if(storeId!==undefined){
    // Prices are taken from the existing validated native plan only AFTER the
    // shared transport validator has compared each real remote variant price.
    const selections=result.mappings.map(mapping=>{
      const variant=native.plan.variants.find(v=>v.key===mapping.key);
      return {shopifyProductId:result.shopifyProductId,shopifyVariantId:'gid://shopify/ProductVariant/'+mapping.variantId,
        productId:request.productId,productRevision:request.revision,options:variant.options,expectedUnitCents:variant.priceCents};
    });
    const reader={async inspectVariants(ids){
      verify();
      return {installation:{shopDomain,currency:'EUR',scope:'admin-readonly',source:summary.evidence.source,checkedAtUtc:evidence.checkedAtUtc},
        variants:ids.map(id=>{
          const selected=selections.find(s=>s.shopifyVariantId===id),remote=evidence.data.products.nodes[0].variants.nodes.find(v=>v.id===id);
          if(!selected||!remote)fail('Angefragte Variante fehlt im echten Readback.');
          return {id,found:true,productId:result.shopifyProductId,status:'DRAFT',priceCents:selected.expectedUnitCents,options:remote.selectedOptions};
        })};
    }};
    const checks=await checkSelections(selections,{adapter,reader,clock,maxEvidenceAgeMs:MAX_EVIDENCE_AGE_MS});
    nativeRequest(native,repository.get(request.productId));verify();
    if(checks.length!==1||checks[0].count!==5||!checks[0].result?.plan)fail('Die fünf ID-Bindungen sind noch blockiert; Standardbindungen bleiben erhalten, nur Abgleich wiederholen.');
    // Enclose the existing registry transaction: expiry at its end rolls back
    // ID assignments too, without changing the plan/store freshness contract.
    const guardedIntake={idBindings(options){const registry=orders.idBindings(options);return {...registry,persist(input){
      return orders.withBindingTransaction(()=>{verify();const saved=registry.persist(input);verify();return saved;});
    }};}};
    idBindings=applyChecks(checks,{orderIntake:guardedIntake,storeId,shopDomain,adapter});
    if(idBindings.some(b=>b.reason))fail('ID-Bindungen konnten nicht bestätigt werden; nur Abgleich wiederholen.');
  }
  return {...summary,transfer:completed,mayCreateDraft:false,idBindingsRequested:storeId!==undefined,idBindings};
}

function regularFile(filename,maxBytes){
  if(!filename||!fs.existsSync(filename)||fs.lstatSync(filename).isSymbolicLink()||!fs.statSync(filename).isFile()||
    (maxBytes&&fs.statSync(filename).size>maxBytes))fail('Vorhandene reguläre Eingabedatei erforderlich.',422);
  return path.resolve(filename);
}

function readNativeRecord(db,id){
  const row=db.prepare('SELECT p.id,p.revision,p.created_at,r.published_revision,r.status,r.document,r.metadata,r.created_at AS updated_at FROM products p JOIN product_revisions r ON r.product_id=p.id AND r.tenant_id=p.tenant_id AND r.revision=p.revision WHERE p.id=? AND p.tenant_id=?').get(id,tenantId);
  if(!row)fail('Pilotprodukt fehlt in der vorhandenen Datenbank.');
  return {id:row.id,revision:row.revision,publishedRevision:row.published_revision,status:row.status,document:JSON.parse(row.document),metadata:JSON.parse(row.metadata),createdAt:row.created_at,updatedAt:row.updated_at};
}

export async function run(argv,{clock=Date.now}={}){
  const args={},allowed=['--native','--db','--action','--evidence','--store-id','--out'];
  for(let i=0;i<argv.length;i+=2){if(!allowed.includes(argv[i])||!argv[i+1]||argv[i+1].startsWith('--')||args[argv[i]])fail('Aufruf: --native <Import-Readback.json> --db <workshop.sqlite> --action claim|reconcile --evidence <Connector-Readback.json> --out <neuer-Bericht.json> [--store-id <privater-Store>]',422);args[argv[i]]=argv[i+1];}
  if(['--native','--db','--action','--evidence','--out'].some(k=>!args[k]))fail('Native Quelle, vorhandene DB, Aktion, echter Shop-Readback und neue Berichtdatei sind erforderlich.',422);
  if(args['--store-id']!==undefined&&!/^[A-Za-z0-9_-]{1,100}$/.test(args['--store-id']))fail('Ungültige Store-Kennung.',422);
  const output=path.resolve(args['--out']);
  if(fs.existsSync(output))fail('Berichtdatei existiert bereits; kein Überschreiben.',422);
  if(!fs.statSync(path.dirname(output)).isDirectory())fail('Berichtordner fehlt.',422);
  const filename=regularFile(args['--db']),native=JSON.parse(fs.readFileSync(regularFile(args['--native'],64*1024*1024),'utf8')),
    evidence=JSON.parse(fs.readFileSync(regularFile(args['--evidence'],1024*1024),'utf8'));
  // All supplied files and the real current record are checked READ-ONLY before
  // opening any existing writing service or initializing its journal tables.
  const check=new DatabaseSync(filename,{readOnly:true});
  try{const request=nativeRequest(native,readNativeRecord(check,native?.createdRecord?.id));verifyConnectorEvidence(evidence,request,{clock,action:args['--action']});}finally{check.close();}
  let context;
  try{
    if(args['--store-id'])context=openWorkshopDb(filename,{tenantId,shopDomain,storeId:args['--store-id'],clock});
    else{
      const repository=createProductRepository({filename,tenantId}),db=new DatabaseSync(filename);
      try{
        db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000;');
        const orderIntake=createOrderIntake({database:db,tenantId,clock,snapshot:()=>fail('Keine Kunden-Prüfstände in diesem Abgleich.')});
        context={repository,db,orderIntake,close(){repository.close();db.close();}};
      }catch(error){repository.close();db.close();throw error;}
    }
    const journal=createShopDraftJournal({database:context.db,tenantId});
    const result=await reconcileApprovedSteelShopPilot(native,{action:args['--action'],evidence,repository:context.repository,orders:context.orderIntake,journal,storeId:args['--store-id'],adapter:context.adapter,clock});
    fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
    return {action:result.action,state:result.transfer.state,claimed:result.claimed??false,mayCreateDraft:result.mayCreateDraft,
      standardBindings:result.transfer.bindings?.length||0,idBindings:result.idBindings?.flatMap(b=>b.assignments||[]).length||0,
      scope:result.scope,published:false,productionReady:false,shopifyWrites:0,networkRequests:0};
  }finally{context?.close();}
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{console.log(JSON.stringify(await run(process.argv.slice(2))));}
  catch(error){console.error(error.code==='approved_steel_pilot_reconcile'||error.code==='shop_draft_transfer'?error.message:'Pilot-Abgleich fehlgeschlagen; lokale Eingaben und unveränderten Datenbankstand prüfen.');process.exitCode=1;}
}
