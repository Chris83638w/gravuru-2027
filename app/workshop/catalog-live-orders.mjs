// Issue #139, Chris 2026-11-02: publish the catalog products with their own
// options, prices and fixed revisions. A release never invents product rules
// and never changes an existing paid snapshot or grants production approval.
import {createHash} from 'node:crypto';
import {prepareShopProduct} from './shop-preparation.mjs';
import {PRODUCT_SCHEMA} from './product-model.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'catalog_live_orders'});};
const sha=v=>createHash('sha256').update(v).digest('hex');
const key=o=>JSON.stringify(Object.entries(o||{}).sort());
const shop=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(v);
const gid=(v,type)=>new RegExp('^gid://shopify/'+type+'/[1-9][0-9]{0,19}$').test(v||'');
const product=v=>/^cfg_[a-f0-9-]{36}$/.test(v||'');

export function createCatalogLiveOrders({database:db,tenantId,clock=Date.now}){
 const exists=()=>!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='catalog_live_order_approvals'").get();
 const active=(shopDomain,p)=>db.prepare('SELECT r.variant_gid FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision WHERE r.tenant_id=? AND r.shop=? AND r.store_id=? AND r.product_gid=? AND r.cfg_id=? AND r.cfg_revision=?').all(tenantId,shopDomain,'acryl',p.shopifyProductId,p.productId,p.productRevision).map(r=>r.variant_gid).sort();
 function approval({shopDomain,shopifyProductId,shopifyVariantId,productId,productRevision}={}){
  if(!shop(shopDomain)||!gid(shopifyProductId,'Product')||!gid(shopifyVariantId,'ProductVariant')||!product(productId)||!Number.isSafeInteger(productRevision)||productRevision<1||!exists())return null;
  const b=db.prepare('SELECT 1 FROM form_shop_bindings WHERE tenant_id=? AND shop=? AND variant_id=? AND product_id=? AND product_revision=?').get(tenantId,shopDomain,shopifyVariantId.split('/').at(-1),productId,productRevision);
  if(!b)return null;
  const row=db.prepare('SELECT * FROM catalog_live_order_approvals WHERE tenant_id=? AND shop=? AND product_gid=? AND cfg_id=? AND cfg_revision=?').get(tenantId,shopDomain,shopifyProductId,productId,productRevision);
  if(!row||!JSON.parse(row.variants_json).includes(shopifyVariantId))return null;
  const source=db.prepare('SELECT document FROM product_revisions WHERE tenant_id=? AND product_id=? AND revision=?').get(tenantId,productId,productRevision);
  if(!source||sha(source.document)!==row.document_sha256)fail(409,'Der freigegebene Katalogstand stimmt nicht mehr überein.');
  return {id:row.approval_id,approvedAt:row.approved_at,kind:'catalog'};
 }
 function approve({shopDomain,products,approvalId,registry}={}){
  if(!shop(shopDomain)||!Array.isArray(products)||!products.length||typeof approvalId!=='string'||!/^[A-Za-z0-9_.:-]{1,160}$/.test(approvalId)||typeof registry?.resolve!=='function')fail(422,'Eine ausdrückliche Katalogfreigabe mit festen Produktständen ist erforderlich.');
  const own=!db.isTransaction;if(own)db.exec('BEGIN IMMEDIATE');
  try{
   const ids=new Set(),shopIds=new Set();
   const entries=products.map(p=>{
    if(!p||Object.keys(p).sort().join(',')!=='productId,productRevision,shopifyProductId'||!product(p.productId)||!Number.isSafeInteger(p.productRevision)||p.productRevision<1||!gid(p.shopifyProductId,'Product')||ids.has(p.productId)||shopIds.has(p.shopifyProductId))fail(422,'Die Katalogfreigabe muss eindeutige Produktstände nennen.');
    ids.add(p.productId);shopIds.add(p.shopifyProductId);
    const row=db.prepare('SELECT r.document,r.status,p.revision AS head,p.archived,p.kind FROM products p JOIN product_revisions r ON r.product_id=p.id AND r.tenant_id=p.tenant_id WHERE p.tenant_id=? AND p.id=? AND r.revision=?').get(tenantId,p.productId,p.productRevision);
    if(!row||row.head!==p.productRevision||row.archived||row.kind!=='product'||row.status==='archived')fail(409,'Der freizugebende Katalogstand ist nicht aktuell.');
    const document=JSON.parse(row.document),config=document.config;
    if(document.schema!==PRODUCT_SCHEMA||!config||config.doorbell)fail(422,'Katalogfreigaben gelten für native Produkte; Funkklingeln behalten ihre eigene Freigabe.');
    if(config.familyFormats&&(!config.familyFormats.source?.shopProduct||config.familyFormats.source?.reviewUnreleased===true))fail(422,'Für den Shop ist ein fester, freigegebener Produktzuschnitt erforderlich.');
    const plan=prepareShopProduct({id:p.productId,revision:p.productRevision,status:row.status,document});
    if(!plan.sourceReady||!plan.variants.length)fail(422,'Die Katalogausführungen sind noch nicht vollständig vorbereitet.');
    const variants=active(shopDomain,p),seen=new Set();
    if(variants.length!==plan.variants.length)fail(422,'Nicht alle Katalogausführungen sind aktiv gebunden.');
    for(const variant of variants){
     const bound=registry.resolve({shopifyProductId:p.shopifyProductId,shopifyVariantId:variant}),k=key(bound.options),expected=plan.variants.find(v=>key(v.options)===k);
     if(bound.storeId!=='acryl'||bound.tenantId!==tenantId||bound.shopDomain!==shopDomain||bound.productId!==p.productId||bound.productRevision!==p.productRevision||!expected||expected.priceCents!==bound.unitCents||seen.has(k))fail(422,'Katalogbindung, Auswahl oder Preis passen nicht zum festen Produktstand.');
     seen.add(k);
    }
    return {...p,documentSha256:sha(row.document),variants};
   });
   db.exec(`CREATE TABLE IF NOT EXISTS catalog_live_order_approvals(tenant_id TEXT NOT NULL,shop TEXT NOT NULL,product_gid TEXT NOT NULL,cfg_id TEXT NOT NULL,cfg_revision INTEGER NOT NULL,document_sha256 TEXT NOT NULL,variants_json TEXT NOT NULL,approval_id TEXT NOT NULL,approved_at TEXT NOT NULL,PRIMARY KEY(tenant_id,shop,product_gid,cfg_id,cfg_revision));
    CREATE TRIGGER IF NOT EXISTS catalog_live_approval_fixed BEFORE UPDATE ON catalog_live_order_approvals BEGIN SELECT RAISE(ABORT,'Live approvals are immutable');END;
    CREATE TRIGGER IF NOT EXISTS catalog_live_approval_keep BEFORE DELETE ON catalog_live_order_approvals BEGIN SELECT RAISE(ABORT,'Live approvals require explicit retention');END;`);
   let created=0;
   for(const e of entries){
    const old=db.prepare('SELECT document_sha256,variants_json,approval_id FROM catalog_live_order_approvals WHERE tenant_id=? AND shop=? AND product_gid=? AND cfg_id=? AND cfg_revision=?').get(tenantId,shopDomain,e.shopifyProductId,e.productId,e.productRevision),variants=JSON.stringify(e.variants);
    if(old){if(old.document_sha256!==e.documentSha256||old.variants_json!==variants||old.approval_id!==approvalId)fail(409,'Diese Katalogfreigabe besitzt bereits einen anderen festen Stand oder Freigabenachweis.');continue;}
    db.prepare('INSERT INTO catalog_live_order_approvals VALUES(?,?,?,?,?,?,?,?,?)').run(tenantId,shopDomain,e.shopifyProductId,e.productId,e.productRevision,e.documentSha256,variants,approvalId,new Date(clock()).toISOString());created++;
   }
   if(own)db.exec('COMMIT');
   return {schema:'gravuru-catalog-live-release/v1',shopDomain,approvalId,products:entries.length,created,productionReady:false};
  }catch(error){if(own)db.exec('ROLLBACK');throw error;}
 }
 return {approval,approve};
}
