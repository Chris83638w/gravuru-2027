// Nur lesend auf der Datenbank-SICHERUNG: Produktkopf und Revisionen der tatsächlich gebundenen Konfi-Kennung(en)
// des Shopify-Produkts 16190784602492. Keine Dokumente, keine Bestell- oder Kundendaten.
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const base=process.env.A168_BASE||path.resolve(import.meta.dirname,'../sicherungen-db');
const file=path.join(base,process.env.A168_STAND||'20261111T195242Z','workshop.sqlite');
if(/[\\/]acryl-employee-20261021-v1[\\/]data[\\/]/.test(file))throw new Error('Live-Datenordner ist ausgeschlossen.');
const SHOP_PRODUCT='gid://shopify/Product/16190784602492',META_CFG='katalog-formate-acryl-tuerschilder-familienschilder-eb5fe26624befe4a';
const db=new DatabaseSync(pathToFileURL(file).href+'?immutable=1',{readOnly:true});
try{
 db.exec('PRAGMA query_only=ON');
 const cols=t=>db.prepare('PRAGMA table_info('+t+')').all().map(c=>c.name);
 const pick=(t,want)=>want.filter(c=>cols(t).includes(c));
 const cfgs=db.prepare(`SELECT r.cfg_id AS cfg,r.cfg_revision AS rev,r.store_id AS store,COUNT(*) AS varianten FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision WHERE r.product_gid=? GROUP BY 1,2,3`).all(SHOP_PRODUCT);
 const pf=pick('products',['id','revision','published_revision','archived','kind','master_id','created_at','updated_at','tenant_id']);
 const rf=pick('product_revisions',['product_id','revision','published_revision','status','created_at','tenant_id']);
 const out={event:'abnahme_168',schritt:'produktkopf',sicherung:path.basename(path.dirname(file)),gebunden:cfgs,produkte:[],revisionen:{},
  metafeldKennungAlsProdukt:db.prepare('SELECT COUNT(*) AS n FROM products WHERE id=?').get(META_CFG).n,
  aehnlicheKennungen:db.prepare("SELECT id FROM products WHERE id LIKE 'katalog-formate-acryl-tuerschilder%' ORDER BY id LIMIT 20").all().map(r=>r.id),
  andereBindungenDieserKennung:{}};
 for(const {cfg} of cfgs){
  out.produkte.push(...db.prepare('SELECT '+pf.join(',')+' FROM products WHERE id=?').all(cfg));
  out.revisionen[cfg]=db.prepare('SELECT '+rf.filter(c=>c!=='product_id').join(',')+' FROM product_revisions WHERE product_id=? ORDER BY revision').all(cfg);
  out.andereBindungenDieserKennung[cfg]=db.prepare(`SELECT r.product_gid AS produkt,COUNT(*) AS varianten FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision WHERE r.cfg_id=? GROUP BY 1`).all(cfg);
 }
 console.log(JSON.stringify(out));
}finally{db.close();}
