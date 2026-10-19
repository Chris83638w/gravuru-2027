import {prepareShopProduct} from './shop-preparation.mjs';
import {createOrderStatus} from './order-status.mjs';
import {createProductionRelease} from './production-release.mjs';
import {resolveProduct,PRODUCT_SCHEMA} from './product-model.mjs';
import {createHash,createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {isNativeReviewSchema} from './native-review-schema.mjs';
import {capturePersonalization,personalizationForSnapshot,personalizationAttributes} from './cart-personalization.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'order_intake'});};
const optionKey=o=>JSON.stringify(Object.entries(o||{}).sort());
const sha=v=>createHash('sha256').update(v).digest('hex');
const domain=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(v);
const identifier=v=>{if(typeof v==='number'&&!Number.isSafeInteger(v))fail(422,'Unsichere Shop-ID.');const s=String(v);if(!/^[1-9][0-9]{0,19}$/.test(s))fail(422,'Ungültige Shop-ID.');return s;};
const money=v=>{if(typeof v!=='string'||!/^\d+\.\d{2}$/.test(v))fail(422,'Ungültiger Bestellpreis.');const [a,b]=v.split('.'),n=Number(a)*100+Number(b);if(!Number.isSafeInteger(n)||n>100000000)fail(422,'Ungültiger Bestellpreis.');return n;};
function verifyOrderWebhook(raw,headers,config,topics){
 if(!config||!domain(config.shopDomain)||typeof config.secret!=='string'||config.secret.length<16||!/^20\d{2}-(01|04|07|10)$/.test(config.apiVersion))fail(503,'Test-Bestellanbindung ist nicht eingerichtet.');
 if(!Buffer.isBuffer(raw)||!raw.length||raw.length>1024*1024)fail(413,'Ungültige Bestellnachricht.');
 const header=name=>{const v=headers[name];if(typeof v!=='string')fail(401,'Bestellnachricht nicht bestätigt.');return v;};
 const signature=header('x-shopify-hmac-sha256');if(!/^[A-Za-z0-9+/]{43}=$/.test(signature)||!timingSafeEqual(Buffer.from(signature,'base64'),createHmac('sha256',config.secret).update(raw).digest()))fail(401,'Bestellnachricht nicht bestätigt.');
 if(header('x-shopify-shop-domain')!==config.shopDomain||header('x-shopify-api-version')!==config.apiVersion||!topics.includes(header('x-shopify-topic')))fail(422,'Shop, API-Version oder Ereignis passen nicht zur Testanbindung.');
 const eventId=header('x-shopify-webhook-id');if(!/^[A-Za-z0-9-]{8,128}$/.test(eventId))fail(422,'Ungültige Ereignis-ID.');
 let payload;try{payload=JSON.parse(raw.toString('utf8'));}catch{fail(400,'Ungültige Bestellnachricht.');}
 if(!payload||Array.isArray(payload)||payload.test!==true)fail(422,'Diese Anbindung nimmt ausschließlich Testbestellungen an. Live-Bestellungen sind gesperrt.');
 return {shopDomain:config.shopDomain,eventId,bodySha256:sha(raw),orderId:identifier(payload.id),payload,topic:header('x-shopify-topic')};
}
export function verifyPaidWebhook(raw,headers,config){
 const v=verifyOrderWebhook(raw,headers,config,['orders/paid']),{payload}=v;
 if(payload.financial_status!=='paid'||payload.cancelled_at||payload.currency!=='EUR'||!Array.isArray(payload.line_items)||payload.line_items.length>250)fail(422,'Zahlungsstatus, Währung oder Bestellpositionen sind nicht geeignet.');
 return v;
}
// `autoRelease(line)` meldet, ob das Fertigungsprofil der Position automatische Freigabe erlaubt (http.mjs liefert es aus production-profiles.mjs).
// `configurations` (K8): Register der Konfigurations-IDs/Revisionen; eine Position mit unbekannter Revision wird als Positionsfehler abgelehnt.
export function createOrderIntake({database:db,snapshot,clock=Date.now,autoRelease=null,configurations=null}){
 db.exec(`CREATE TABLE IF NOT EXISTS form_shop_bindings(id TEXT PRIMARY KEY,shop TEXT NOT NULL,variant_id TEXT NOT NULL,product_id TEXT NOT NULL,product_revision INTEGER NOT NULL,unit_cents INTEGER NOT NULL,created_at TEXT NOT NULL,UNIQUE(shop,variant_id,product_id,product_revision));
 CREATE TABLE IF NOT EXISTS form_shop_binding_personalization(binding_id TEXT PRIMARY KEY,document TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS form_binding_personalization_fixed BEFORE UPDATE ON form_shop_binding_personalization BEGIN SELECT RAISE(ABORT,'Pricing contracts are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_binding_personalization_keep BEFORE DELETE ON form_shop_binding_personalization BEGIN SELECT RAISE(ABORT,'Pricing contracts are immutable');END;
 CREATE TABLE IF NOT EXISTS form_offer_personalization(offer_id TEXT PRIMARY KEY,document TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS form_offer_personalization_fixed BEFORE UPDATE ON form_offer_personalization BEGIN SELECT RAISE(ABORT,'Offer prices are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_offer_personalization_keep BEFORE DELETE ON form_offer_personalization BEGIN SELECT RAISE(ABORT,'Offer prices are immutable');END;
 CREATE TABLE IF NOT EXISTS form_shop_binding_selections(binding_id TEXT PRIMARY KEY,options TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS form_binding_selection_fixed BEFORE UPDATE ON form_shop_binding_selections BEGIN SELECT RAISE(ABORT,'Selections are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_binding_selection_no_delete BEFORE DELETE ON form_shop_binding_selections BEGIN SELECT RAISE(ABORT,'Selections are immutable');END;
 CREATE TABLE IF NOT EXISTS form_order_offers(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,binding_id TEXT NOT NULL,snapshot_id TEXT NOT NULL,package_sha256 TEXT NOT NULL,quantity INTEGER NOT NULL,created_at TEXT NOT NULL,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS form_order_events(shop TEXT NOT NULL,event_id TEXT NOT NULL,body_sha256 TEXT NOT NULL,order_id TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(shop,event_id));
 CREATE TABLE IF NOT EXISTS form_order_customers(shop TEXT NOT NULL,order_id TEXT NOT NULL,customer_id TEXT,PRIMARY KEY(shop,order_id));
 CREATE TRIGGER IF NOT EXISTS form_order_customer_fixed BEFORE UPDATE ON form_order_customers BEGIN SELECT RAISE(ABORT,'Order customers are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_order_customer_keep BEFORE DELETE ON form_order_customers BEGIN SELECT RAISE(ABORT,'Order customers are immutable');END;
 CREATE TABLE IF NOT EXISTS form_order_lines(id TEXT PRIMARY KEY,shop TEXT NOT NULL,order_id TEXT NOT NULL,line_id TEXT NOT NULL,offer_id TEXT NOT NULL UNIQUE,document TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(shop,order_id,line_id));
 CREATE TRIGGER IF NOT EXISTS form_shop_binding_fixed BEFORE UPDATE ON form_shop_bindings BEGIN SELECT RAISE(ABORT,'Bindings are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_order_offer_fixed BEFORE UPDATE ON form_order_offers BEGIN SELECT RAISE(ABORT,'Offers are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_order_line_fixed BEFORE UPDATE ON form_order_lines BEGIN SELECT RAISE(ABORT,'Order lines are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_order_line_no_delete BEFORE DELETE ON form_order_lines BEGIN SELECT RAISE(ABORT,'Order lines require explicit retention');END;
 CREATE TRIGGER IF NOT EXISTS form_order_event_fixed BEFORE UPDATE ON form_order_events BEGIN SELECT RAISE(ABORT,'Order events are immutable');END;
 CREATE TABLE IF NOT EXISTS form_order_line_errors(id TEXT PRIMARY KEY,shop TEXT NOT NULL,order_id TEXT NOT NULL,line_id TEXT NOT NULL,event_id TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(shop,order_id,line_id,event_id));
 CREATE TRIGGER IF NOT EXISTS form_order_line_error_fixed BEFORE UPDATE ON form_order_line_errors BEGIN SELECT RAISE(ABORT,'Order line errors are immutable');END;`);
 const tx=fn=>{if(db.isTransaction)return fn();db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}},at=()=>new Date(clock()).toISOString();
 const binding=id=>{const r=db.prepare('SELECT * FROM form_shop_bindings WHERE id=?').get(id);if(!r)fail(404,'Shop-Zuordnung nicht gefunden.');return r;};
 const selection=id=>{const r=db.prepare('SELECT options FROM form_shop_binding_selections WHERE binding_id=?').get(id);return r?JSON.parse(r.options):null;};
 const safeBinding=r=>({id:r.id,shopDomain:r.shop,variantId:r.variant_id,productId:r.product_id,productRevision:r.product_revision,unitCents:r.unit_cents,...(selection(r.id)?{options:selection(r.id)}:{})});
 const pricing=id=>{const row=db.prepare('SELECT document FROM form_shop_binding_personalization WHERE binding_id=?').get(id);return row?JSON.parse(row.document):null;};
 const offerPricing=id=>{const row=db.prepare('SELECT document FROM form_offer_personalization WHERE offer_id=?').get(id);return row?JSON.parse(row.document):null;};
 const get=id=>{const r=db.prepare('SELECT document FROM form_order_lines WHERE id=?').get(id);if(!r)fail(404,'Bestellposition nicht gefunden.');return JSON.parse(r.document);};
 // E3: rejected single positions (status „fehler“). Append-only per delivery; the overview shows the latest reason
 // per shop line until that line is accepted by a later delivery.
 const errorRows=(where='',...args)=>db.prepare('SELECT e.document FROM form_order_line_errors e WHERE e.rowid=(SELECT max(rowid) FROM form_order_line_errors x WHERE x.shop=e.shop AND x.order_id=e.order_id AND x.line_id=e.line_id) AND NOT EXISTS(SELECT 1 FROM form_order_lines l WHERE l.shop=e.shop AND l.order_id=e.order_id AND l.line_id=e.line_id)'+where+' ORDER BY e.rowid DESC LIMIT 200').all(...args).map(r=>JSON.parse(r.document));
 const rejected=id=>{const r=db.prepare('SELECT document FROM form_order_line_errors WHERE id=?').get(id);if(!r)fail(404,'Bestellposition nicht gefunden.');return JSON.parse(r.document);};
 // Freigabeprozess (K5) kennt auch abgelehnte Positionen: sie stehen dort als „fehler“ mit dem Grund aus dem Eingang.
 const lineOrRejected=id=>typeof id==='string'&&id.startsWith('ordererror_')?rejected(id):get(id);
 // Shop-Status und Freigabeprozess verweisen aufeinander: Freigabe braucht Storno/Erstattung, der Status liefert productionReady.
 let release=null;
 const statuses=createOrderStatus({database:db,clock,production:(line,shop)=>release.state(line.id,{shop})});
 release=createProductionRelease({database:db,clock,line:lineOrRejected,shopStatus:line=>statuses.shopState(line),autoRelease,rejectedLines:()=>errorRows()});
 const forSnapshot=snapshotId=>typeof snapshotId==='string'?db.prepare("SELECT document FROM form_order_lines WHERE json_extract(document,'$.snapshotId')=? ORDER BY rowid").all(snapshotId).map(r=>JSON.parse(r.document)):[];
 return {get,forSnapshot,production:release,errors:()=>errorRows(),customer:id=>{const line=get(id);return db.prepare('SELECT customer_id FROM form_order_customers WHERE shop=? AND order_id=?').get(line.shopDomain,line.orderId)?.customer_id||null;},status:id=>statuses.forLine(get(id)),list:()=>db.prepare('SELECT document FROM form_order_lines ORDER BY rowid DESC LIMIT 200').all().map(r=>JSON.parse(r.document)),bindings:()=>db.prepare('SELECT * FROM form_shop_bindings ORDER BY rowid DESC').all().map(safeBinding),
  // Caller supplies the actual saved product record, never a browser price.
  bind({shopDomain,variantId,record,snapshotId,options:selected,personalizationPricing}){
   if(!domain(shopDomain))fail(422,'Bitte die myshopify.com-Domain des Entwicklungsstores angeben.');variantId=identifier(variantId);
   const d=record.document;let options=null,unit=d.basePriceCents;
   if(d.kind!=='product'||record.status==='archived')fail(422,'Ein aktives eigenes Produkt ist erforderlich.');
   if(d.schema===PRODUCT_SCHEMA){
    if(selected!==undefined){
     if(snapshotId||!selected||typeof selected!=='object'||Array.isArray(selected))fail(422,'Ausführung nicht eindeutig.');
     const resolved=resolveProduct(d,{options:selected});options=resolved.resolvedOptions;unit=resolved.price.unitCents;
     if(optionKey(options)!==optionKey(selected))fail(422,'Die vollständige gespeicherte Ausführung angeben.');
    }else{
     if(!snapshotId)fail(422,'Für Acryl bitte zuerst einen festen Prüfstand auswählen.');const m=snapshot(snapshotId);
     if(!isNativeReviewSchema(m.schema)||m.product.id!==record.id||m.product.revision!==record.revision||!m.selection)fail(422,'Acryl-Prüfstand und Produktstand stimmen nicht überein.');
     const resolved=resolveProduct(d,{options:m.selection.options});options=resolved.resolvedOptions;unit=resolved.price.unitCents;
     if(personalizationPricing===undefined&&m.selection.price.unitCents!==unit)fail(422,'Zusätzliche kostenpflichtige Elemente benötigen zuerst eine bestätigte Shop-Aufpreisbindung.');
    }
   }else if(d.schema!=='gravuru-form-product/v1'||unit===null||!d.designs?.length)fail(422,'Ein Produkt mit Design und Preis ist erforderlich.');
   const contract=personalizationPricing===undefined?null:capturePersonalization(personalizationPricing,{variantId,baseCents:unit,document:d});
   if(contract&&snapshotId)personalizationForSnapshot(contract,snapshot(snapshotId));
   return tx(()=>{
    const old=db.prepare('SELECT * FROM form_shop_bindings WHERE shop=? AND variant_id=? AND product_id=? AND product_revision=?').get(shopDomain,variantId,record.id,record.revision);
    if(old){if(JSON.stringify(pricing(old.id))!==JSON.stringify(contract))fail(409,'Diese Bindung besitzt bereits einen anderen Preisvertrag. Einen neuen Produktstand verwenden.');if(optionKey(selection(old.id))!==optionKey(options)||old.unit_cents!==unit)fail(409,'Diese Shop-Variante ist bereits einer anderen Ausführung zugeordnet.');return safeBinding(old);}
    const id='binding_'+randomUUID();db.prepare('INSERT INTO form_shop_bindings VALUES(?,?,?,?,?,?,?)').run(id,shopDomain,variantId,record.id,record.revision,unit,at());
    if(contract)db.prepare('INSERT INTO form_shop_binding_personalization VALUES(?,?)').run(id,JSON.stringify(contract));
    if(options)db.prepare('INSERT INTO form_shop_binding_selections VALUES(?,?)').run(id,JSON.stringify(options));return safeBinding(binding(id));
   });
  },
  bindVariants({record,shopDomain,mappings,personalizationPricing}){
   const plan=prepareShopProduct(record);
   if(!plan.sourceReady)fail(422,'Produkt, Designs, Material und Grundpreise zuerst vollständig vorbereiten.');
   if(!domain(shopDomain)||!Array.isArray(mappings)||!mappings.length||mappings.length>plan.variants.length)fail(422,'Shop und mindestens eine gültige Ausführung angeben.');
   const keys=new Set(),ids=new Set(),mapped=mappings.map(m=>{
    if(!m||Object.keys(m).some(k=>!['key','variantId'].includes(k)))fail(422,'Nur Ausführung und Varianten-ID angeben; Preise kommen aus dem Produktstand.');
    const variant=plan.variants.find(v=>v.key===m.key),variantId=identifier(m.variantId);
    if(!variant||keys.has(m.key)||ids.has(variantId))fail(422,'Ausführung oder Shop-Variante fehlt oder wurde doppelt zugeordnet.');keys.add(m.key);ids.add(variantId);return {variant,variantId};
   });
   return tx(()=>{
    const before=this.bindings().filter(b=>b.shopDomain===shopDomain&&b.productId===record.id&&b.productRevision===record.revision);
    for(const {variant,variantId} of mapped)if(before.some(b=>optionKey(b.options)===optionKey(variant.options)&&b.variantId!==variantId))fail(409,'Diese Ausführung ist bereits anders zugeordnet. Bestehende Bindungen bleiben erhalten; Änderungen benötigen einen neuen Produktstand.');
    const bindings=mapped.map(({variant,variantId})=>this.bind({record,shopDomain,variantId,...(record.document.schema===PRODUCT_SCHEMA?{options:variant.options}:{}),...(personalizationPricing===undefined?{}:{personalizationPricing})}));
    return {bindings,created:bindings.filter(b=>!before.some(old=>old.id===b.id)).length,configuration:plan.configuration,sourceSha256:plan.sha256,shopVerified:false,sent:false};
   });
  },
  offer({bindingId,snapshotId,quantity}, {stableToken}={}){return tx(()=>{
   const b=binding(bindingId),m=snapshot(snapshotId),contract=pricing(bindingId);
   const extra=contract?personalizationForSnapshot(contract,m):null,unit=extra?.unitCents??b.unit_cents;
   if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)fail(422,'Menge: 1 bis 99.');
   if(m.product.id!==b.product_id||m.product.revision!==b.product_revision||m.product.basePriceCents!==unit||m.product.currency!=='EUR')fail(422,'Prüfstand und Shop-/Preisbindung stimmen nicht überein.');
   const chosen=selection(b.id);
   if(isNativeReviewSchema(m.schema)){
    if(!chosen||optionKey(chosen)!==optionKey(m.selection?.options))fail(422,'Die Ausführung passt nicht zur Shop-Variante.');
    if(quantity!==m.selection.price.quantity)fail(422,'Die Menge gehört zum gesicherten Stand. Für eine andere Menge bitte neu sichern.');
   }else if(chosen||contract)fail(422,'Diese Bindung benötigt einen nativen Prüfstand.');
   // Optional server-derived capability makes one private test-draft revision
   // idempotent across lost responses/restarts. HTTP input never sets this option.
   if(stableToken!==undefined){
    if(typeof stableToken!=='string'||!/^[a-f0-9]{64}$/.test(stableToken))fail(422,'Ungültige private Angebotskennung.');
    const existing=db.prepare('SELECT * FROM form_order_offers WHERE token_hash=?').get(sha(stableToken));
    if(existing){
     if(existing.binding_id!==bindingId||existing.snapshot_id!==snapshotId||existing.quantity!==quantity)fail(409,'Die private Angebotskennung gehört zu einem anderen Stand.');
     return this.resolveCartOffer({offerId:existing.id,offerToken:stableToken,snapshotId,shopDomain:b.shop});
    }
   }
   const id='offer_'+randomUUID(),token=stableToken??randomBytes(32).toString('hex');
   db.prepare('INSERT INTO form_order_offers VALUES(?,?,?,?,?,?,?,?)').run(id,sha(token),bindingId,snapshotId,m.packageSha256,quantity,at(),clock()+7*86400000);
   if(extra)db.prepare('INSERT INTO form_offer_personalization VALUES(?,?)').run(id,JSON.stringify(extra));
   return {id,property:{name:'_gravuru_offer',value:token},variantId:b.variant_id,quantity,unitCents:unit,currency:'EUR',scope:'test-checkout-only',...(extra?{personalization:extra.personalization}:{})};
  });},
  // Resolve only a previously saved offer. Price, quantity and variant are never
  // accepted from a browser here. Callers must additionally authenticate its draft.
  resolveCartOffer({offerId,offerToken,snapshotId,shopDomain}){
   if(typeof offerId!=='string'||typeof offerToken!=='string'||!/^[a-f0-9]{64}$/.test(offerToken)||typeof snapshotId!=='string'||!domain(shopDomain))fail(404,'Dieses Angebot ist nicht zugänglich.');
   const o=db.prepare('SELECT * FROM form_order_offers WHERE id=? AND token_hash=? AND snapshot_id=?').get(offerId,sha(offerToken),snapshotId);
   if(!o)fail(404,'Dieses Angebot ist nicht zugänglich.');const b=binding(o.binding_id);
   if(b.shop!==shopDomain)fail(404,'Dieses Angebot ist nicht zugänglich.');
   if(o.expires_at<=clock())fail(409,'Dieses Angebot ist abgelaufen.');
   if(db.prepare('SELECT 1 FROM form_order_lines WHERE offer_id=?').get(o.id))fail(409,'Dieses Angebot gehört bereits zu einer Bestellung.');
   const m=snapshot(o.snapshot_id),extra=offerPricing(o.id),contract=pricing(b.id);
   if(JSON.stringify(extra)!==JSON.stringify(contract?personalizationForSnapshot(contract,m):null))fail(409,'Gesicherter Preisvertrag stimmt nicht überein.');
   const unit=extra?.unitCents??b.unit_cents;
   const chosen=selection(b.id);
   if(chosen&&(!isNativeReviewSchema(m.schema)||optionKey(chosen)!==optionKey(m.selection?.options)||m.selection?.price?.quantity!==o.quantity))fail(409,'Die gesicherte Ausführung oder Menge stimmt nicht überein.');
   if(m.packageSha256!==o.package_sha256||m.product.id!==b.product_id||m.product.revision!==b.product_revision||m.product.basePriceCents!==unit||m.product.currency!=='EUR')fail(409,'Der gesicherte Angebotsstand stimmt nicht überein.');
   return {id:o.id,property:{name:'_gravuru_offer',value:offerToken},variantId:b.variant_id,quantity:o.quantity,unitCents:unit,currency:'EUR',scope:'test-checkout-only',...(extra?{personalization:extra.personalization}:{})};
  },
  receive(raw,headers,config){
   if(['orders/updated','orders/cancelled'].includes(headers['x-shopify-topic'])){
    const v=verifyOrderWebhook(raw,headers,config,['orders/updated','orders/cancelled']);
    return tx(()=>{
     if(db.prepare('SELECT 1 FROM form_order_events WHERE shop=? AND event_id=?').get(v.shopDomain,v.eventId))fail(409,'Ereignis-ID gehört bereits zu einer Zahlungsnachricht.');
     const result=statuses.record(v),lines=db.prepare('SELECT id FROM form_order_lines WHERE shop=? AND order_id=?').all(v.shopDomain,v.orderId);
     for(const l of lines)release.syncShop(l.id);
     return {...result,orderId:v.orderId,matchedLines:lines.length,statuses:lines.map(l=>({id:l.id,...statuses.forLine(get(l.id))}))};
    });
   }
   const verified=verifyPaidWebhook(raw,headers,config);return tx(()=>{
   if(db.prepare('SELECT 1 FROM form_order_status_events WHERE shop=? AND event_id=? AND topic!=\'orders/paid\'').get(verified.shopDomain,verified.eventId))fail(409,'Ereignis-ID gehört bereits zu einer Statusnachricht.');
   const {shopDomain:shop,eventId,bodySha256,orderId,payload}=verified,existing=db.prepare('SELECT body_sha256 FROM form_order_events WHERE shop=? AND event_id=?').get(shop,eventId);
   if(existing){if(existing.body_sha256!==bodySha256)fail(409,'Ereignis-ID wurde mit anderem Inhalt erneut geliefert.');return {duplicate:true,lines:db.prepare('SELECT document FROM form_order_lines WHERE shop=? AND order_id=?').all(shop,orderId).map(r=>JSON.parse(r.document)),errors:errorRows(' AND e.shop=? AND e.order_id=?',shop,orderId)};}
   const result=[],errors=[],seen=new Set();
   // E3 (P2-9): one invalid position is rejected alone. Valid positions are still
   // admitted, the event is recorded and the webhook answers 200 (no Shopify retry storm).
   const reject=(line,lineId,reason)=>{
    const document={id:'ordererror_'+randomUUID(),shopDomain:shop,orderId,lineId,eventId,variantId:line.variant_id==null?null:String(line.variant_id),quantity:Number.isSafeInteger(line.quantity)?line.quantity:null,status:'fehler',intakeError:reason,test:true,receivedAt:at(),productionReady:false,customerDownloadAllowed:false};
    db.prepare('INSERT INTO form_order_line_errors VALUES(?,?,?,?,?,?,?)').run(document.id,shop,orderId,lineId,eventId,JSON.stringify(document),at());
    release.rejectIntake(document.id,reason);errors.push(document);
   };
   for(const line of payload.line_items){
    const lineId=identifier(line.id);if(seen.has(lineId))fail(422,'Doppelte Bestellposition.');seen.add(lineId);
    try{admit(line,lineId);}catch(error){if(!Number.isInteger(error?.status)||error.status>=500)throw error;reject(line,lineId,error.message);}
   }
   function configurationFor(properties,offerId){
    const value=name=>{const found=properties.filter(p=>p?.name===name);if(found.length>1)fail(422,'Konfigurations-Revision der Position ist nicht eindeutig.');return found.length?found[0].value:undefined;};
    const configId=value('_gravuru_config'),rev=value('_gravuru_rev'),known=configurations?.byOffer(offerId)||null;
    if(configId===undefined&&rev===undefined){if(known)fail(422,'Die Position nennt ihre Konfigurations-Revision nicht.');return null;}
    if(!known||typeof configId!=='string'||typeof rev!=='string'||!/^[1-9][0-9]{0,8}$/.test(rev)||known.id!==configId||known.rev!==Number(rev))fail(422,'Die Konfigurations-Revision dieser Position ist unbekannt oder gehört zu einem anderen Stand.');
    return {id:known.id,rev:known.rev};
   }
   function admit(line,lineId){
    const properties=line.properties||[];if(!Array.isArray(properties))fail(422,'Ungültige Positionszuordnung.');const refs=properties.filter(p=>p?.name==='_gravuru_offer');
    if(!refs.length){if(line.variant_id&&db.prepare('SELECT 1 FROM form_shop_bindings WHERE shop=? AND variant_id=?').get(shop,identifier(line.variant_id)))fail(422,'Für diese konfigurierte Variante fehlt der gesicherte Entwurf.');return;}
    if(refs.length!==1||typeof refs[0].value!=='string'||!/^[a-f0-9]{64}$/.test(refs[0].value))fail(422,'Ungültige Entwurfszuordnung.');
    const o=db.prepare('SELECT * FROM form_order_offers WHERE token_hash=?').get(sha(refs[0].value));if(!o)fail(422,'Entwurfszuordnung nicht gefunden.');const b=binding(o.binding_id),extra=offerPricing(o.id),unit=extra?.unitCents??b.unit_cents;
    if(b.shop!==shop||b.variant_id!==identifier(line.variant_id)||line.quantity!==o.quantity||money(line.price)!==unit)fail(422,'Shop-Variante, Menge oder Preis weichen vom gesicherten Entwurf ab.');
    for(const expected of personalizationAttributes(extra?.personalization)){
     const actual=properties.filter(p=>p?.name===expected.key);
     if(actual.length!==1||actual[0].value!==expected.value)fail(422,'Bestellung hat die gesicherte Entwurfs- oder Aufpreiszuordnung verändert.');
    }
    // K8 (Ü9.1): Die Position verweist auf genau die Konfigurations-Revision, die zu diesem Angebot gesichert wurde.
    // Fehlt sie oder ist sie unbekannt, wird nur diese Position abgelehnt (E3), nicht die ganze Bestellung.
    const configuration=configurationFor(properties,o.id);
    const old=db.prepare('SELECT * FROM form_order_lines WHERE shop=? AND order_id=? AND line_id=?').get(shop,orderId,lineId);if(old){if(old.offer_id!==o.id)fail(409,'Bestellposition darf ihren Entwurf nicht wechseln.');result.push(JSON.parse(old.document));return;}
    if(db.prepare('SELECT 1 FROM form_order_lines WHERE offer_id=?').get(o.id))fail(409,'Dieser Entwurf wurde bereits einer anderen Bestellposition zugeordnet.');
    if(o.expires_at<clock())fail(422,'Die Checkout-Zuordnung ist abgelaufen; vor Übernahme prüfen.');const m=snapshot(o.snapshot_id);if(m.packageSha256!==o.package_sha256)fail(409,'Der gesicherte Prüfstand wurde verändert.');
    const id='orderline_'+randomUUID(),document={id,shopDomain:shop,orderId,lineId,variantId:b.variant_id,bindingId:b.id,snapshotId:o.snapshot_id,...(configuration?{configuration}:{}),sourcePackageSha256:o.package_sha256,product:{...m.product},sourceSchema:m.schema||'gravuru-form-review/v1',...(m.selection?{selection:structuredClone(m.selection)}:{}),productionProfile:m.productionProfile?{id:m.productionProfile.id,revision:m.productionProfile.revision,sha256:m.productionProfile.sha256}:null,quantity:o.quantity,unitCents:unit,totalCents:unit*o.quantity,currency:'EUR',status:'test-paid-event-recorded',test:true,receivedAt:at(),productionReady:false,customerDownloadAllowed:false};
    db.prepare('INSERT INTO form_order_lines VALUES(?,?,?,?,?,?,?)').run(id,shop,orderId,lineId,o.id,JSON.stringify(document),at());result.push(document);
   }
   if(result.length){
    const customerId=payload.customer?.id==null?null:'gid://shopify/Customer/'+identifier(payload.customer.id);
    const owner=db.prepare('SELECT customer_id FROM form_order_customers WHERE shop=? AND order_id=?').get(shop,orderId);
    if(owner&&owner.customer_id!==customerId)fail(409,'Bestellung darf ihre Kundenbindung nicht wechseln.');
    // Older paid lines remain unbound: a later delivery cannot silently claim them.
    if(!owner&&!db.prepare('SELECT 1 FROM form_order_events WHERE shop=? AND order_id=?').get(shop,orderId))db.prepare('INSERT INTO form_order_customers VALUES(?,?,?)').run(shop,orderId,customerId);
   }
   if(payload.updated_at)statuses.record(verified);
   db.prepare('INSERT INTO form_order_events VALUES(?,?,?,?,?)').run(shop,eventId,bodySha256,orderId,at());
   // Eine frühere Storno-/Erstattungsmeldung sperrt die Position sofort.
   for(const l of result)release.syncShop(l.id);
   return {duplicate:false,lines:result,errors};
  });}
 };
}
