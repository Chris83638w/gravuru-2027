import {createHash,createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'order_intake'});};
const sha=v=>createHash('sha256').update(v).digest('hex');
const domain=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(v);
const identifier=v=>{if(typeof v==='number'&&!Number.isSafeInteger(v))fail(422,'Unsichere Shop-ID.');const s=String(v);if(!/^[1-9][0-9]{0,19}$/.test(s))fail(422,'Ungültige Shop-ID.');return s;};
const money=v=>{if(typeof v!=='string'||!/^\d+\.\d{2}$/.test(v))fail(422,'Ungültiger Bestellpreis.');const [a,b]=v.split('.'),n=Number(a)*100+Number(b);if(!Number.isSafeInteger(n)||n>100000000)fail(422,'Ungültiger Bestellpreis.');return n;};
export function verifyPaidWebhook(raw,headers,config){
 if(!config||!domain(config.shopDomain)||typeof config.secret!=='string'||config.secret.length<16||!/^20\d{2}-(01|04|07|10)$/.test(config.apiVersion))fail(503,'Test-Bestellanbindung ist nicht eingerichtet.');
 if(!Buffer.isBuffer(raw)||!raw.length||raw.length>1024*1024)fail(413,'Ungültige Bestellnachricht.');
 const header=name=>{const v=headers[name];if(typeof v!=='string')fail(401,'Bestellnachricht nicht bestätigt.');return v;};
 const signature=header('x-shopify-hmac-sha256');if(!/^[A-Za-z0-9+/]{43}=$/.test(signature)||!timingSafeEqual(Buffer.from(signature,'base64'),createHmac('sha256',config.secret).update(raw).digest()))fail(401,'Bestellnachricht nicht bestätigt.');
 if(header('x-shopify-shop-domain')!==config.shopDomain||header('x-shopify-api-version')!==config.apiVersion||header('x-shopify-topic')!=='orders/paid')fail(422,'Shop, API-Version oder Ereignis passen nicht zur Testanbindung.');
 const eventId=header('x-shopify-webhook-id');if(!/^[A-Za-z0-9-]{8,128}$/.test(eventId))fail(422,'Ungültige Ereignis-ID.');
 let payload;try{payload=JSON.parse(raw.toString('utf8'));}catch{fail(400,'Ungültige Bestellnachricht.');}
 if(!payload||Array.isArray(payload)||payload.test!==true)fail(422,'Diese Anbindung nimmt ausschließlich Testbestellungen an. Live-Bestellungen sind gesperrt.');
 if(payload.financial_status!=='paid'||payload.cancelled_at||payload.currency!=='EUR'||!Array.isArray(payload.line_items)||payload.line_items.length>250)fail(422,'Zahlungsstatus, Währung oder Bestellpositionen sind nicht geeignet.');
 return {shopDomain:config.shopDomain,eventId,bodySha256:sha(raw),orderId:identifier(payload.id),payload};
}
export function createOrderIntake({database:db,snapshot,clock=Date.now}){
 db.exec(`CREATE TABLE IF NOT EXISTS form_shop_bindings(id TEXT PRIMARY KEY,shop TEXT NOT NULL,variant_id TEXT NOT NULL,product_id TEXT NOT NULL,product_revision INTEGER NOT NULL,unit_cents INTEGER NOT NULL,created_at TEXT NOT NULL,UNIQUE(shop,variant_id,product_id,product_revision));
 CREATE TABLE IF NOT EXISTS form_order_offers(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,binding_id TEXT NOT NULL,snapshot_id TEXT NOT NULL,package_sha256 TEXT NOT NULL,quantity INTEGER NOT NULL,created_at TEXT NOT NULL,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS form_order_events(shop TEXT NOT NULL,event_id TEXT NOT NULL,body_sha256 TEXT NOT NULL,order_id TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(shop,event_id));
 CREATE TABLE IF NOT EXISTS form_order_lines(id TEXT PRIMARY KEY,shop TEXT NOT NULL,order_id TEXT NOT NULL,line_id TEXT NOT NULL,offer_id TEXT NOT NULL UNIQUE,document TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(shop,order_id,line_id));
 CREATE TRIGGER IF NOT EXISTS form_shop_binding_fixed BEFORE UPDATE ON form_shop_bindings BEGIN SELECT RAISE(ABORT,'Bindings are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_order_offer_fixed BEFORE UPDATE ON form_order_offers BEGIN SELECT RAISE(ABORT,'Offers are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_order_line_fixed BEFORE UPDATE ON form_order_lines BEGIN SELECT RAISE(ABORT,'Order lines are immutable');END;
 CREATE TRIGGER IF NOT EXISTS form_order_line_no_delete BEFORE DELETE ON form_order_lines BEGIN SELECT RAISE(ABORT,'Order lines require explicit retention');END;
 CREATE TRIGGER IF NOT EXISTS form_order_event_fixed BEFORE UPDATE ON form_order_events BEGIN SELECT RAISE(ABORT,'Order events are immutable');END;`);
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}},at=()=>new Date(clock()).toISOString();
 const binding=id=>{const r=db.prepare('SELECT * FROM form_shop_bindings WHERE id=?').get(id);if(!r)fail(404,'Shop-Zuordnung nicht gefunden.');return r;};
 const safeBinding=r=>({id:r.id,shopDomain:r.shop,variantId:r.variant_id,productId:r.product_id,productRevision:r.product_revision,unitCents:r.unit_cents});
 const get=id=>{const r=db.prepare('SELECT document FROM form_order_lines WHERE id=?').get(id);if(!r)fail(404,'Bestellposition nicht gefunden.');return JSON.parse(r.document);};
 return {get,list:()=>db.prepare('SELECT document FROM form_order_lines ORDER BY rowid DESC LIMIT 200').all().map(r=>JSON.parse(r.document)),bindings:()=>db.prepare('SELECT * FROM form_shop_bindings ORDER BY rowid DESC').all().map(safeBinding),
  // Caller supplies the actual saved product record, never a browser price.
  bind({shopDomain,variantId,record}){if(!domain(shopDomain))fail(422,'Bitte die myshopify.com-Domain des Entwicklungsstores angeben.');variantId=identifier(variantId);const d=record.document;if(d.schema!=='gravuru-form-product/v1'||d.kind!=='product'||record.status==='archived'||d.basePriceCents===null||!d.designs?.length)fail(422,'Für die erste Testbindung ist ein eigenes Formprodukt mit Design und Preis erforderlich.');return tx(()=>{const old=db.prepare('SELECT * FROM form_shop_bindings WHERE shop=? AND variant_id=? AND product_id=? AND product_revision=?').get(shopDomain,variantId,record.id,record.revision);if(old)return safeBinding(old);const id='binding_'+randomUUID();db.prepare('INSERT INTO form_shop_bindings VALUES(?,?,?,?,?,?,?)').run(id,shopDomain,variantId,record.id,record.revision,d.basePriceCents,at());return safeBinding(binding(id));});},
  offer({bindingId,snapshotId,quantity}){return tx(()=>{const b=binding(bindingId),m=snapshot(snapshotId);if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)fail(422,'Menge: 1 bis 99.');if(m.product.id!==b.product_id||m.product.revision!==b.product_revision||m.product.basePriceCents!==b.unit_cents||m.product.currency!=='EUR')fail(422,'Prüfstand und Shop-/Preisbindung stimmen nicht überein.');const id='offer_'+randomUUID(),token=randomBytes(32).toString('hex');db.prepare('INSERT INTO form_order_offers VALUES(?,?,?,?,?,?,?,?)').run(id,sha(token),bindingId,snapshotId,m.packageSha256,quantity,at(),clock()+7*86400000);return {id,property:{name:'_gravuru_offer',value:token},variantId:b.variant_id,quantity,unitCents:b.unit_cents,currency:'EUR',scope:'test-checkout-only'};});},
  receive(raw,headers,config){const verified=verifyPaidWebhook(raw,headers,config);return tx(()=>{
   const {shopDomain:shop,eventId,bodySha256,orderId,payload}=verified,existing=db.prepare('SELECT body_sha256 FROM form_order_events WHERE shop=? AND event_id=?').get(shop,eventId);
   if(existing){if(existing.body_sha256!==bodySha256)fail(409,'Ereignis-ID wurde mit anderem Inhalt erneut geliefert.');return {duplicate:true,lines:db.prepare('SELECT document FROM form_order_lines WHERE shop=? AND order_id=?').all(shop,orderId).map(r=>JSON.parse(r.document))};}
   const result=[],seen=new Set();
   for(const line of payload.line_items){
    const lineId=identifier(line.id);if(seen.has(lineId))fail(422,'Doppelte Bestellposition.');seen.add(lineId);
    const properties=line.properties||[];if(!Array.isArray(properties))fail(422,'Ungültige Positionszuordnung.');const refs=properties.filter(p=>p?.name==='_gravuru_offer');
    if(!refs.length){if(line.variant_id&&db.prepare('SELECT 1 FROM form_shop_bindings WHERE shop=? AND variant_id=?').get(shop,identifier(line.variant_id)))fail(422,'Für diese konfigurierte Variante fehlt der gesicherte Entwurf.');continue;}
    if(refs.length!==1||typeof refs[0].value!=='string'||!/^[a-f0-9]{64}$/.test(refs[0].value))fail(422,'Ungültige Entwurfszuordnung.');
    const o=db.prepare('SELECT * FROM form_order_offers WHERE token_hash=?').get(sha(refs[0].value));if(!o)fail(422,'Entwurfszuordnung nicht gefunden.');const b=binding(o.binding_id);
    if(b.shop!==shop||b.variant_id!==identifier(line.variant_id)||line.quantity!==o.quantity||money(line.price)!==b.unit_cents)fail(422,'Shop-Variante, Menge oder Preis weichen vom gesicherten Entwurf ab.');
    const old=db.prepare('SELECT * FROM form_order_lines WHERE shop=? AND order_id=? AND line_id=?').get(shop,orderId,lineId);if(old){if(old.offer_id!==o.id)fail(409,'Bestellposition darf ihren Entwurf nicht wechseln.');result.push(JSON.parse(old.document));continue;}
    if(db.prepare('SELECT 1 FROM form_order_lines WHERE offer_id=?').get(o.id))fail(409,'Dieser Entwurf wurde bereits einer anderen Bestellposition zugeordnet.');
    if(o.expires_at<clock())fail(422,'Die Checkout-Zuordnung ist abgelaufen; vor Übernahme prüfen.');const m=snapshot(o.snapshot_id);if(m.packageSha256!==o.package_sha256)fail(409,'Der gesicherte Prüfstand wurde verändert.');
    const id='orderline_'+randomUUID(),document={id,shopDomain:shop,orderId,lineId,variantId:b.variant_id,bindingId:b.id,snapshotId:o.snapshot_id,sourcePackageSha256:o.package_sha256,product:{...m.product},productionProfile:m.productionProfile?{id:m.productionProfile.id,revision:m.productionProfile.revision,sha256:m.productionProfile.sha256}:null,quantity:o.quantity,unitCents:b.unit_cents,totalCents:b.unit_cents*o.quantity,currency:'EUR',status:'test-paid-event-recorded',test:true,receivedAt:at(),productionReady:false,customerDownloadAllowed:false};
    db.prepare('INSERT INTO form_order_lines VALUES(?,?,?,?,?,?,?)').run(id,shop,orderId,lineId,o.id,JSON.stringify(document),at());result.push(document);
   }
   db.prepare('INSERT INTO form_order_events VALUES(?,?,?,?,?)').run(shop,eventId,bodySha256,orderId,at());return {duplicate:false,lines:result};
  });}
 };
}
