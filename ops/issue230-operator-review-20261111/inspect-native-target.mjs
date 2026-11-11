import {DatabaseSync} from 'node:sqlite';
import {copyPath,argumentsOf,isCLI,printResult} from './copy-guard.mjs';

export const TARGET_CFG='katalog-formate-acryl-tuerschilder-familienschilder-eb5fe26624befe4a';
export const TARGET_SHOP_PRODUCT='gid://shopify/Product/16190784602492';
const TENANT='gravuru';

// Deliberately no application imports: repository/host constructors can migrate.
export function inspectNativeTarget(filename){
 const file=copyPath(filename),db=new DatabaseSync(file,{readOnly:true});
 try{
  db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000; BEGIN');
  const columns=table=>db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name);
  const requireColumns=(table,list)=>{const available=columns(table);if(list.some(c=>!available.includes(c)))throw Error('Unerwartetes Schema: '+table);return available;};
  const pcols=requireColumns('products',['id','revision','published_revision','archived','kind']);
  const productFields=['id','revision','published_revision','archived','kind','master_id','created_at','updated_at','tenant_id'].filter(k=>pcols.includes(k));
  const directProductIdMatches=db.prepare('SELECT '+productFields.join(',')+' FROM products WHERE id=?'+(pcols.includes('tenant_id')?' AND tenant_id=?':'')).all(...[TARGET_CFG,...(pcols.includes('tenant_id')?[TENANT]:[])]);
  const rcols=requireColumns('product_revisions',['product_id','revision','status','document']);
  // The catalogue ID may be provenance INSIDE the immutable document rather
  // than products.id. Inspect only current revision JSON, never emit its bytes.
  // CASE protects malformed historical JSON regardless of WHERE evaluation order.
  const profileAliasMatches=db.prepare(`SELECT ${productFields.map(k=>'p.'+k).join(',')},r.status AS revision_status
   FROM products p JOIN product_revisions r ON r.product_id=p.id AND r.revision=p.revision
   ${pcols.includes('tenant_id')&&rcols.includes('tenant_id')?'AND r.tenant_id=p.tenant_id':''}
   WHERE CASE WHEN json_valid(r.document) THEN CASE WHEN json_extract(r.document,'$.schema')='gravuru-product/v1'
    THEN json_extract(r.document,'$.config.profile.id') ELSE NULL END ELSE NULL END = ?
   ${pcols.includes('tenant_id')?'AND p.tenant_id=?':''} ${rcols.includes('tenant_id')?'AND r.tenant_id=?':''}
   ORDER BY p.id LIMIT 101`).all(TARGET_CFG,...(pcols.includes('tenant_id')?[TENANT]:[]),...(rcols.includes('tenant_id')?[TENANT]:[]));
  if(profileAliasMatches.length>100)throw Error('Mehr als 100 native Köpfe teilen die Profilkennung; gezielt untersuchen.');
  const targetIds=[...new Set([TARGET_CFG,...profileAliasMatches.map(row=>row.id)])],marks=targetIds.map(()=>'?').join(',');
  const products=[...new Map([...directProductIdMatches,...profileAliasMatches].map(row=>[row.id,row])).values()];
  const revisionFields=['product_id','revision','published_revision','status','created_at','tenant_id'].filter(k=>rcols.includes(k));
  const revisions=db.prepare('SELECT '+revisionFields.join(',')+' FROM product_revisions WHERE product_id IN ('+marks+')'+(rcols.includes('tenant_id')?' AND tenant_id=?':'')+' ORDER BY product_id,revision').all(...[...targetIds,...(rcols.includes('tenant_id')?[TENANT]:[])]);
  const missing=[];let bindings=[];
  for(const table of ['shop_product_binding_heads','shop_product_binding_revisions'])if(!columns(table).length)missing.push(table);
  if(!missing.length){
   requireColumns('shop_product_binding_heads',['tenant_id','shop','variant_gid','revision']);
   requireColumns('shop_product_binding_revisions',['tenant_id','shop','variant_gid','revision','product_gid','store_id','binding_id','cfg_id','cfg_revision','document_sha256']);
   bindings=db.prepare(`SELECT r.tenant_id,r.shop,r.store_id,r.product_gid,r.variant_gid,r.revision AS assignment_revision,r.binding_id,r.cfg_id,r.cfg_revision,r.document_sha256
    FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r
    ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision
    WHERE h.tenant_id=? AND (r.product_gid=? OR r.cfg_id IN (${marks})) ORDER BY r.product_gid,r.cfg_id,r.cfg_revision,r.variant_gid LIMIT 10001`).all(TENANT,TARGET_SHOP_PRODUCT,...targetIds);
   if(bindings.length>10000)throw Error('Zielregister unerwartet groß; keine gekürzte Ausgabe als vollständig ausgeben.');
  }
  const groups=new Map();for(const b of bindings){const key=JSON.stringify([b.tenant_id,b.shop,b.store_id,b.product_gid,b.cfg_id,b.cfg_revision,b.document_sha256]);if(!groups.has(key))groups.set(key,{tenant:b.tenant_id,shop:b.shop,storeId:b.store_id,shopProduct:b.product_gid,cfgId:b.cfg_id,cfgRevision:b.cfg_revision,documentSha256:b.document_sha256,variants:0});groups.get(key).variants++;}
  // Historical fixed bindings can exist even when the explicit head tables do not.
  let legacyFixedBindings=[];const bcols=columns('form_shop_bindings');
  if(bcols.length){requireColumns('form_shop_bindings',['id','shop','variant_id','product_id','product_revision','unit_cents']);const fields=['id','shop','variant_id','product_id','product_revision','unit_cents','tenant_id'].filter(k=>bcols.includes(k));legacyFixedBindings=db.prepare('SELECT '+fields.join(',')+' FROM form_shop_bindings WHERE product_id IN ('+marks+')'+(bcols.includes('tenant_id')?' AND tenant_id=?':'')+' ORDER BY variant_id LIMIT 10001').all(...[...targetIds,...(bcols.includes('tenant_id')?[TENANT]:[])]);if(legacyFixedBindings.length>10000)throw Error('Zu viele feste Bindungen für diesen Zielbeleg.');}
  db.exec('COMMIT');
  return {readOnly:true,requestedCatalogProfileId:TARGET_CFG,targetShopProduct:TARGET_SHOP_PRODUCT,tenant:TENANT,productScope:pcols.includes('tenant_id')?'tenant-filtered':'legacy table without tenant column',directProductIdMatches,profileAliasLookup:{path:'$.config.profile.id',schema:'gravuru-product/v1',scope:'current revisions only; exact fixed identifier',matches:profileAliasMatches},nativeIdentityCandidates:products.filter(p=>/^cfg_[a-f0-9-]{36}$/.test(p.id)).map(p=>({id:p.id,revision:p.revision})),products,revisions,activeBindingCount:bindings.length,activeBindingGroups:[...groups.values()],activeBindings:bindings,legacyFixedBindings,missingBindingTables:missing,limits:['Only the exact inner profile ID is inspected in valid current product JSON; no document or arbitrary metadata JSON is returned.','No orders, customers, credentials or authorizations are read.','Alias matches are candidates, never automatic identity or binding approval; multiple matches remain explicit.','Only explicit head joins prove active native assignments; historical fixed bindings alone do not prove current Shopify product ownership.','This is an inventory, not approval to update a product or activate a binding.']};
 }finally{db.close();}
}
if(isCLI(import.meta.url))try{const args=argumentsOf(process.argv.slice(2),['--copy']);printResult(inspectNativeTarget(args['--copy']));}catch(error){console.error(error.message);process.exitCode=1;}
