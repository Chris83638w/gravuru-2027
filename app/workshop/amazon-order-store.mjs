import {createHash,randomUUID} from 'node:crypto';
import {normalizeAmazonOrder,normalizeAmazonOrderQuery,amazonIdentifier,amazonSku,AMAZON_ORDER_PROVENANCE} from './amazon-orders.mjs';
import {isNativeReviewSchema} from './native-review-schema.mjs';

const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'amazon_order_store'});};
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const parse=row=>row?JSON.parse(row.document):null;
const labels={PENDING_AVAILABILITY:'Vorbestellung',PENDING:'Noch nicht versandbereit',UNSHIPPED:'Noch nicht versandt',PARTIALLY_SHIPPED:'Teilweise versandt',SHIPPED:'Versandt',CANCELLED:'Storniert',UNFULFILLABLE:'Nicht erfüllbar',UNKNOWN:'Status nicht verfügbar'};
const token=value=>{if(value===undefined||value===null)return null;if(typeof value!=='string'||!value.length||value.length>10000||/[\x00-\x1f\x7f]/.test(value))fail(422,'Ungültiger Amazon-Fortsetzungsschlüssel.');return value;};

/** One seller account per database, frozen on first creation. No production API mode exists. */
export function createAmazonOrderStore({database:db,clock=Date.now,repository,snapshot,accountId='local-test'}){
 accountId=amazonIdentifier(accountId,'Account-ID');
 db.exec(`CREATE TABLE IF NOT EXISTS amazon_integration_meta(name TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS amazon_order_events(source_key TEXT NOT NULL,event_hash TEXT NOT NULL,updated_at TEXT NOT NULL,document TEXT NOT NULL,received_at TEXT NOT NULL,PRIMARY KEY(source_key,event_hash));
 CREATE INDEX IF NOT EXISTS amazon_order_events_current ON amazon_order_events(source_key,updated_at);
 CREATE TABLE IF NOT EXISTS amazon_order_lines(id TEXT PRIMARY KEY,source_key TEXT NOT NULL,item_id TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(source_key,item_id));
 CREATE TABLE IF NOT EXISTS amazon_sku_bindings(id TEXT PRIMARY KEY,marketplace_id TEXT NOT NULL,sku TEXT NOT NULL,product_id TEXT NOT NULL,product_revision INTEGER NOT NULL,document TEXT NOT NULL,UNIQUE(marketplace_id,sku));
 CREATE TABLE IF NOT EXISTS amazon_production_assignments(line_id TEXT PRIMARY KEY,snapshot_id TEXT NOT NULL UNIQUE,document TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS amazon_order_checkpoints(name TEXT PRIMARY KEY,revision INTEGER NOT NULL,provenance TEXT NOT NULL,query TEXT NOT NULL,next_token TEXT,updated_at TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS amazon_account_fixed BEFORE UPDATE ON amazon_integration_meta BEGIN SELECT RAISE(ABORT,'Amazon account is immutable');END;
 CREATE TRIGGER IF NOT EXISTS amazon_account_keep BEFORE DELETE ON amazon_integration_meta BEGIN SELECT RAISE(ABORT,'Amazon account is immutable');END;`);
 for(const table of ['amazon_order_events','amazon_order_lines','amazon_sku_bindings','amazon_production_assignments'])db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_fixed BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT,'Amazon records are immutable');END;CREATE TRIGGER IF NOT EXISTS ${table}_keep BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'Amazon records require explicit retention');END;`);
 const tx=fn=>{if(db.isTransaction)return fn();db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
 tx(()=>{db.prepare('INSERT OR IGNORE INTO amazon_integration_meta VALUES(?,?)').run('account_id',accountId);if(db.prepare('SELECT value FROM amazon_integration_meta WHERE name=?').get('account_id').value!==accountId)fail(409,'Diese Datenbank gehört bereits einem anderen Amazon-Konto.');});
 const at=()=>new Date(clock()).toISOString();
 const rawLine=id=>{const row=db.prepare('SELECT * FROM amazon_order_lines WHERE id=?').get(id);if(!row)fail(404,'Amazon-Bestellposition nicht gefunden.');return row;};
 const events=key=>db.prepare('SELECT * FROM amazon_order_events WHERE source_key=? ORDER BY updated_at DESC,event_hash').all(key);
 const mapping=(marketplaceId,sku)=>parse(db.prepare('SELECT document FROM amazon_sku_bindings WHERE marketplace_id=? AND sku=?').get(marketplaceId,sku));
 const assignment=id=>parse(db.prepare('SELECT document FROM amazon_production_assignments WHERE line_id=?').get(id));
 const context=id=>{const row=rawLine(id),initial=parse(row),history=events(row.source_key),latest=parse(history[0]),current=latest.items.find(i=>i.orderItemId===row.item_id),conflict=history.filter(e=>e.updated_at===history[0].updated_at).length>1;return {row,initial,history,latest,current,conflict,assigned:assignment(id)};};
 function status(id){
  const c=context(id),{current,latest,history,initial,assigned,conflict}=c;
  // Cancellation is a monotonic safety latch: an out-of-order cancelled event must still block work.
  const cancelled=history.some(e=>{const v=parse(e);return v.fulfillmentStatus==='CANCELLED'||v.items.some(i=>i.orderItemId===initial.orderItemId&&i.cancelled);});
  const cancellationRequested=history.some(e=>parse(e).items.some(i=>i.orderItemId===initial.orderItemId&&i.cancellationRequested));
  const changed=Boolean(assigned&&(!current||sha({item:current,fulfilledBy:latest.fulfilledBy})!==assigned.itemHash));
  const blockers=[];
  if(cancelled)blockers.push('cancelled');if(cancellationRequested)blockers.push('cancellation-requested');if(conflict)blockers.push('conflicting-source-events');if(!current)blockers.push('item-missing-in-latest-order');
  if(!assigned)blockers.push('snapshot-not-assigned');if(assigned&&assigned.quantityVerified!==true)blockers.push('snapshot-quantity-unverified');if(changed)blockers.push('order-changed-after-assignment');if(!['UNSHIPPED','PARTIALLY_SHIPPED'].includes(latest.fulfillmentStatus))blockers.push('order-not-ready');
  if(latest.fulfilledBy!=='MERCHANT')blockers.push('merchant-fulfillment-not-confirmed');
  if(current?.customizationAvailable)blockers.push('customization-not-imported');
  if(current?.quantity===0)blockers.push('empty-quantity');
  const latestShip=latest.shipByWindow?.latestDateTime,late=Boolean(latestShip&&Date.parse(latestShip)<clock()&&!['SHIPPED','CANCELLED'].includes(latest.fulfillmentStatus));
  return {state:cancelled?'CANCELLED':latest.fulfillmentStatus,label:cancelled?'Storniert':labels[latest.fulfillmentStatus],cancelled,cancellationRequested,conflict,changed,missing:!current,updatedAt:latest.lastUpdatedTime,eventCount:history.length,requiresReview:blockers.length>0,blockers,late,productionBlocked:true,productionReady:false,customerDownloadAllowed:false,test:true,provenance:latest.provenance};
 }
 function get(id){
  const {row,initial,latest,current,assigned}=context(id),item=current??initial,bound=assigned?.binding??(item.sku?mapping(latest.marketplaceId,item.sku):null);
  return {id:row.id,channel:'amazon',accountId,provenance:latest.provenance,marketplaceId:latest.marketplaceId,orderId:latest.orderId,lineId:initial.orderItemId,sku:item.sku,asin:item.asin,quantity:item.quantity,quantityFulfilled:item.quantityFulfilled,quantityUnfulfilled:item.quantityUnfulfilled,unitCents:item.unitCents,totalCents:item.totalCents,proceedsCents:item.proceedsCents,currency:item.currency,product:bound?.product??{id:null,revision:null,name:item.sku??'Amazon-Position ohne SKU'},bindingId:bound?.id??null,snapshotId:assigned?.snapshotId??null,sourcePackageSha256:assigned?.sourcePackageSha256??null,productionProfile:assigned?.productionProfile??null,selection:assigned?.selection??null,customizationAvailable:item.customizationAvailable,createdTime:latest.createdTime,updatedAt:latest.lastUpdatedTime,receivedAt:row.created_at,fulfillmentStatus:latest.fulfillmentStatus,fulfilledBy:latest.fulfilledBy,shipByWindow:latest.shipByWindow,deliverByWindow:latest.deliverByWindow,test:true,productionReady:false,customerDownloadAllowed:false,assignment:assigned};
 }
 function checkpoint(key){const row=db.prepare('SELECT * FROM amazon_order_checkpoints WHERE name=?').get(key);return row?{key:row.name,revision:row.revision,provenance:row.provenance,query:JSON.parse(row.query),nextToken:row.next_token,updatedAt:row.updated_at}:null;}
 return {get,status,accountId,
  list:()=>db.prepare('SELECT id FROM amazon_order_lines ORDER BY rowid DESC LIMIT 200').all().map(row=>get(row.id)),
  bindings:()=>db.prepare('SELECT document FROM amazon_sku_bindings ORDER BY rowid DESC').all().map(parse),
  checkpoint,
  checkpoints:()=>db.prepare('SELECT name,revision,provenance,updated_at,next_token IS NOT NULL AS has_next_page FROM amazon_order_checkpoints ORDER BY name').all().map(row=>({key:row.name,revision:row.revision,provenance:row.provenance,updatedAt:row.updated_at,hasNextPage:Boolean(row.has_next_page)})),
  ingestPage({orders,nextToken=null,checkpointKey,query={},expectedRevision,expectedNextToken}={},options={}){
   if(!Array.isArray(orders)||orders.length>100)fail(422,'Ungültige Amazon-Bestellseite.');
   if(!AMAZON_ORDER_PROVENANCE.includes(options.provenance))fail(422,'Echte Amazon-Bestellungen sind gesperrt.');
   const normalized=orders.map(order=>normalizeAmazonOrder(order,options)),next=token(nextToken),safeQuery=normalizeAmazonOrderQuery(query);
   if(checkpointKey!==undefined)amazonIdentifier(checkpointKey,'Fortsetzungsname');
   if(expectedRevision!==undefined&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<0))fail(422,'Ungültiger Amazon-Fortsetzungsstand.');
   const expected=expectedNextToken===undefined?undefined:token(expectedNextToken);
   return tx(()=>{
    const previous=checkpointKey===undefined?null:checkpoint(checkpointKey);
    if(previous){
     if(expectedRevision!==previous.revision||expected!==previous.nextToken)fail(409,'Amazon-Abruf wurde inzwischen fortgesetzt. Veraltete Antwort nicht übernommen.');
     if(previous.provenance!==options.provenance||JSON.stringify(previous.query)!==JSON.stringify(safeQuery))fail(409,'Amazon-Fortsetzung gehört zu einer anderen Suchabfrage.');
    }else if((expectedRevision!==undefined&&expectedRevision!==0)||(expected!==undefined&&expected!==null))fail(409,'Amazon-Fortsetzungsstand fehlt.');
    let inserted=0,duplicates=0,stale=0;const ids=new Set();
    for(const order of normalized){
     const sourceKey=JSON.stringify([accountId,order.provenance,order.marketplaceId,order.orderId]),hash=sha(order),old=db.prepare('SELECT MAX(updated_at) AS updated_at FROM amazon_order_events WHERE source_key=?').get(sourceKey);
     const exists=db.prepare('SELECT 1 FROM amazon_order_events WHERE source_key=? AND event_hash=?').get(sourceKey,hash);
     if(exists)duplicates++;else{db.prepare('INSERT INTO amazon_order_events VALUES(?,?,?,?,?)').run(sourceKey,hash,order.lastUpdatedTime,JSON.stringify(order),at());inserted++;if(old?.updated_at&&old.updated_at>order.lastUpdatedTime)stale++;}
     for(const item of order.items){
      let row=db.prepare('SELECT id FROM amazon_order_lines WHERE source_key=? AND item_id=?').get(sourceKey,item.orderItemId);
      if(!row){const id='amazonline_'+randomUUID();db.prepare('INSERT INTO amazon_order_lines VALUES(?,?,?,?,?)').run(id,sourceKey,item.orderItemId,JSON.stringify(item),at());row={id};}ids.add(row.id);
     }
    }
    if(checkpointKey!==undefined)db.prepare('INSERT INTO amazon_order_checkpoints VALUES(?,?,?,?,?,?) ON CONFLICT(name) DO UPDATE SET revision=excluded.revision,provenance=excluded.provenance,query=excluded.query,next_token=excluded.next_token,updated_at=excluded.updated_at').run(checkpointKey,(previous?.revision??0)+1,options.provenance,JSON.stringify(safeQuery),next,at());
    return {inserted,duplicates,stale,lines:[...ids].map(get),checkpoint:checkpointKey===undefined?null:this.checkpoints().find(c=>c.key===checkpointKey),test:true};
   });
  },
  bind({marketplaceId,sku,productId,productRevision}={}){
   marketplaceId=amazonIdentifier(marketplaceId,'Marketplace-ID');sku=amazonSku(sku);
   if(!repository||!Number.isSafeInteger(productRevision)||productRevision<1)fail(422,'Gespeicherten Produktstand ausdrücklich angeben.');
   const record=repository.get(productId,{revision:productRevision});
   if(record.id!==productId||record.revision!==productRevision||record.document?.kind!=='product'||record.status==='archived'||repository.get(productId).status==='archived')fail(422,'Ein aktives eigenes Produkt mit festem Stand ist erforderlich.');
   return tx(()=>{
    const old=mapping(marketplaceId,sku);if(old){if(old.product.id!==productId||old.product.revision!==productRevision)fail(409,'Amazon-SKU ist bereits unveränderlich einem anderen Produktstand zugeordnet.');return old;}
    const id='amazonbinding_'+randomUUID(),document={id,marketplaceId,sku,product:{id:productId,revision:productRevision,name:record.document.name},createdAt:at(),test:true};
    db.prepare('INSERT INTO amazon_sku_bindings VALUES(?,?,?,?,?,?)').run(id,marketplaceId,sku,productId,productRevision,JSON.stringify(document));return document;
   });
  },
  attachSnapshot({lineId,snapshotId}={}){return tx(()=>{
   const {current,latest,assigned}=context(lineId),s=status(lineId);
   if(assigned){if(assigned.snapshotId!==snapshotId)fail(409,'Amazon-Produktionszuordnung ist unveränderlich.');return assigned;}
   if(!current||s.cancelled||s.cancellationRequested||s.conflict||!['UNSHIPPED','PARTIALLY_SHIPPED'].includes(latest.fulfillmentStatus)||latest.fulfilledBy!=='MERCHANT'||current.quantity<1)fail(409,'Amazon-Position ist für eine Prüfstandzuordnung gesperrt.');
   const binding=current.sku?mapping(latest.marketplaceId,current.sku):null;if(!binding)fail(422,'Amazon-SKU zuerst einem gespeicherten Produktstand zuordnen.');
   if(typeof snapshot!=='function')fail(503,'Werkstatt-Prüfstände sind nicht angeschlossen.');const manifest=snapshot(snapshotId);
   if(!manifest||manifest.id!==snapshotId||!(isNativeReviewSchema(manifest.schema)||manifest.schema==='gravuru-form-review/v1')||!/^[a-f0-9]{64}$/.test(manifest.packageSha256??'')||manifest.product?.id!==binding.product.id||manifest.product?.revision!==binding.product.revision)fail(422,'Amazon-Zuordnung und gesicherter Produktstand stimmen nicht überein.');
   if(isNativeReviewSchema(manifest.schema)&&manifest.selection?.price?.quantity!==current.quantity)fail(422,'Amazon-Menge stimmt nicht mit dem gesicherten Prüfstand überein.');
   const document={lineId,snapshotId,binding,product:{...binding.product},sourcePackageSha256:manifest.packageSha256,sourceUpdatedAt:latest.lastUpdatedTime,itemHash:sha({item:current,fulfilledBy:latest.fulfilledBy}),quantity:current.quantity,quantityVerified:isNativeReviewSchema(manifest.schema),snapshotSchema:manifest.schema,unitCents:current.unitCents,totalCents:current.totalCents,currency:current.currency,productionProfile:manifest.productionProfile?{id:manifest.productionProfile.id,revision:manifest.productionProfile.revision,sha256:manifest.productionProfile.sha256}:null,selection:manifest.selection?structuredClone(manifest.selection):null,assignedAt:at(),test:true,productionReady:false};
   db.prepare('INSERT INTO amazon_production_assignments VALUES(?,?,?)').run(lineId,snapshotId,JSON.stringify(document));return document;
  });}
 };
}
