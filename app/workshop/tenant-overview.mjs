// B1 (Vorbereitung Mandanten-Verwaltung, nur Gerüst): Mandantenliste mit Anzahl Produkte und Konfis.
// Plattformsicht über alle Mandanten – bewusst ohne Mandantenfilter und darum nur für den
// Standardmandanten erreichbar (http.mjs: `platformOverview` bekommt nur gravuru). Kein Abo-Modell,
// keine Tarife, keine Abrechnung. Liest nur; legt nichts an.
import {DEFAULT_TENANT} from './tenant.mjs';

// Gleiche Bedingung wie isCustomerCapable() in konfi-status.mjs: aktives Produkt, Formprodukt mit Design.
const CAPABLE=`CASE WHEN json_extract(c.overview,'$.formProduct')=1 THEN coalesce(json_extract(c.overview,'$.designCount'),0)>0 ELSE 1 END`;

export function tenantOverview(db,tenants){
  const table=name=>Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
  const counts=new Map();
  if(table('products')&&table('product_catalog'))for(const r of db.prepare(`SELECT p.tenant_id AS tenant,count(*) AS products,sum(${CAPABLE}) AS konfis FROM products p LEFT JOIN product_catalog c ON c.product_id=p.id AND c.tenant_id=p.tenant_id WHERE p.kind='product' AND p.archived=0 GROUP BY p.tenant_id`).all())counts.set(r.tenant,{products:r.products,konfis:r.konfis||0,released:0,paused:0});
  if(table('konfi_status')&&table('products'))for(const r of db.prepare(`SELECT k.tenant_id AS tenant,k.status,count(*) AS n FROM konfi_status k JOIN products p ON p.id=k.product_id AND p.tenant_id=k.tenant_id AND p.archived=0 GROUP BY k.tenant_id,k.status`).all()){const c=counts.get(r.tenant);if(c)c[r.status]=r.n;}
  return {tenants:tenants.list().map(t=>{const c=counts.get(t.id)||{products:0,konfis:0,released:0,paused:0};return {id:t.id,name:t.name,shopDomain:t.shopDomain,status:t.status,createdAt:t.createdAt,primary:t.id===DEFAULT_TENANT,products:c.products,konfis:c.konfis,released:c.released,paused:c.paused};}),
    create:{available:false,reason:'Mandant anlegen folgt mit dem Abo-Modell.'}};
}
