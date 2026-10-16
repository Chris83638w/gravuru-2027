import {createHash} from 'node:crypto';
import {amazonIdentifier,amazonSku,amazonMoney,amazonTime} from './amazon-orders.mjs';
const fail=()=>{throw Object.assign(Error('Ungültiger Amazon-Angebotsstand.'),{status:422,code:'amazon_listing'});};
const code=v=>typeof v==='string'&&/^[-A-Za-z0-9_:.]{1,100}$/.test(v)?v:null;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const array=v=>{if(v===undefined)return [];if(!Array.isArray(v)||v.length>1000)fail();return v;};
const records=v=>{const a=array(v);if(a.some(v=>!object(v)))fail();return a;};
/** Keep catalog facts; free-form attributes and issue messages are intentionally omitted. */
export function normalizeAmazonListing(item,marketplaceId){
  amazonIdentifier(marketplaceId);if(!object(item)||!Array.isArray(item.summaries))fail();
  const summaries=records(item.summaries).filter(v=>v.marketplaceId===marketplaceId);if(summaries.length!==1)fail();const summary=summaries[0];
  return {marketplaceId,sku:amazonSku(item.sku),asin:amazonIdentifier(summary.asin,'ASIN'),
    status:array(summary.status).map(code).filter(Boolean),
    productType:code(summary.productType),lastUpdatedAt:summary.lastUpdatedDate===undefined?null:amazonTime(summary.lastUpdatedDate),
    // Listings Items Money.amount is Decimal/string in the official v2021-08-01 model.
    // Numeric attributes.list_price.value belongs to a different schema and is not used.
    offers:records(item.offers).filter(v=>v.marketplaceId===marketplaceId).map(v=>{if(!object(v.price))fail();return {type:code(v.offerType),price:amazonMoney(v.price)};}),
    availability:records(item.fulfillmentAvailability).map(v=>{if(v.quantity!==undefined&&(!Number.isSafeInteger(v.quantity)||v.quantity<0))fail();return {channel:code(v.fulfillmentChannelCode),quantity:v.quantity??null};}),
    issues:records(item.issues).map(v=>({code:code(v.code),severity:code(v.severity),attributes:array(v.attributeNames).map(code).filter(Boolean)})),
    relationships:records(item.relationships).filter(v=>v.marketplaceId===marketplaceId).flatMap(v=>records(v.relationships).map(r=>({type:code(r.type),parentSkus:array(r.parentSkus).map(amazonSku),childSkus:array(r.childSkus).map(amazonSku)}))) };
}
export function createAmazonCatalogStore({database:db,clock=Date.now}){
  db.exec(`CREATE TABLE IF NOT EXISTS amazon_listing_snapshots(marketplace_id TEXT NOT NULL,sku TEXT NOT NULL,sha256 TEXT NOT NULL,document TEXT NOT NULL,observed_at TEXT NOT NULL,PRIMARY KEY(marketplace_id,sku,sha256));
  CREATE TABLE IF NOT EXISTS amazon_listing_heads(marketplace_id TEXT NOT NULL,sku TEXT NOT NULL,provenance TEXT NOT NULL,sha256 TEXT NOT NULL,observed_at TEXT NOT NULL,sequence INTEGER NOT NULL,PRIMARY KEY(marketplace_id,sku,provenance));
  CREATE TRIGGER IF NOT EXISTS amazon_listing_snapshots_fixed BEFORE UPDATE ON amazon_listing_snapshots BEGIN SELECT RAISE(ABORT,'Amazon listing snapshots are immutable');END;
  CREATE TRIGGER IF NOT EXISTS amazon_listing_snapshots_keep BEFORE DELETE ON amazon_listing_snapshots BEGIN SELECT RAISE(ABORT,'Amazon listing snapshots require explicit retention');END;`);
  // Recover a head for any observations made by the initial development version.
  db.exec(`INSERT OR IGNORE INTO amazon_listing_heads SELECT marketplace_id,sku,json_extract(document,'$.provenance'),sha256,observed_at,rowid FROM amazon_listing_snapshots WHERE rowid IN (SELECT MAX(rowid) FROM amazon_listing_snapshots GROUP BY marketplace_id,sku,json_extract(document,'$.provenance')) AND json_extract(document,'$.provenance') IN ('synthetic','sandbox','anonymized');`);
  const tx=fn=>{if(db.isTransaction)return fn();db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
  return {save(items,{marketplaceId,provenance}={}){
    if(!['synthetic','sandbox','anonymized'].includes(provenance)||!Array.isArray(items)||items.length>100)fail();
    const documents=items.map(item=>({...normalizeAmazonListing(item,marketplaceId),provenance}));
    return tx(()=>{let inserted=0,stale=0;for(const value of documents){
      const json=JSON.stringify(value),hash=createHash('sha256').update(json).digest('hex'),at=new Date(clock()).toISOString();
      const old=db.prepare('SELECT s.document FROM amazon_listing_heads h JOIN amazon_listing_snapshots s ON s.marketplace_id=h.marketplace_id AND s.sku=h.sku AND s.sha256=h.sha256 WHERE h.marketplace_id=? AND h.sku=? AND h.provenance=?').get(value.marketplaceId,value.sku,provenance);
      inserted+=Number(db.prepare('INSERT OR IGNORE INTO amazon_listing_snapshots VALUES(?,?,?,?,?)').run(value.marketplaceId,value.sku,hash,json,at).changes);
      const before=old?JSON.parse(old.document):null;if(before?.lastUpdatedAt&&value.lastUpdatedAt&&before.lastUpdatedAt>value.lastUpdatedAt){stale++;continue;}
      const sequence=db.prepare('SELECT COALESCE(MAX(sequence),0)+1 AS next FROM amazon_listing_heads').get().next;
      // A later observation of a previously seen state (A -> B -> A) updates the head.
      // The historical snapshot remains byte-identical and scopes never overwrite each other.
      db.prepare('INSERT INTO amazon_listing_heads VALUES(?,?,?,?,?,?) ON CONFLICT(marketplace_id,sku,provenance) DO UPDATE SET sha256=excluded.sha256,observed_at=excluded.observed_at,sequence=excluded.sequence').run(value.marketplaceId,value.sku,provenance,hash,at,sequence);
    }return {saved:documents.length,inserted,stale};});
  },list(){return db.prepare('SELECT s.document,h.observed_at FROM amazon_listing_heads h JOIN amazon_listing_snapshots s ON s.marketplace_id=h.marketplace_id AND s.sku=h.sku AND s.sha256=h.sha256 ORDER BY h.sequence DESC LIMIT 200').all().map(r=>({...JSON.parse(r.document),observedAt:r.observed_at}));}};
}
