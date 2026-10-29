// Derived catalogue cards only. No drafts, session IDs, tokens or customer media.
// The caller authenticates payloads; SQLite atomically replaces one snapshot per
// tenant/shop/store. A missing or unreadable cache never replaces live checks.
export function createShopGalleryCache({database:db,tenantId,storeId,shopDomain,readOnly=false}){
 if(!readOnly)db.exec(`CREATE TABLE IF NOT EXISTS shop_gallery_cache(
  tenant_id TEXT NOT NULL,shop TEXT NOT NULL,store_id TEXT NOT NULL,
  revision TEXT NOT NULL,payload TEXT NOT NULL,mac TEXT NOT NULL,
  PRIMARY KEY(tenant_id,shop,store_id))`);
 const exists=()=>!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='shop_gallery_cache'").get();
 return Object.freeze({
  read(revision){
   if(!exists())return null;
   return db.prepare('SELECT payload,mac FROM shop_gallery_cache WHERE tenant_id=? AND shop=? AND store_id=? AND revision=?').get(tenantId,shopDomain,storeId,revision)||null;
  },
  write(revision,{payload,mac}){
   if(readOnly)return false;
   db.prepare(`INSERT INTO shop_gallery_cache(tenant_id,shop,store_id,revision,payload,mac) VALUES(?,?,?,?,?,?)
    ON CONFLICT(tenant_id,shop,store_id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload,mac=excluded.mac`).run(tenantId,shopDomain,storeId,revision,payload,mac);
   return true;
  }
 });
}
