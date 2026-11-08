import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

const PIN=Object.freeze({tenantId:'gravuru',storeId:'acryl',shopDomain:'gravuru-design.myshopify.com',shopifyProductId:'gid://shopify/Product/16190784438652',productId:'cfg_ac514214-a313-4738-8008-00445ee1befd',revision:4,
 filename:'/var/www/vhosts/gravuru-designwerkstatt.de/private/acryl-employee-20261021-v1/data/workshop.sqlite',documentSerializedSha256:'2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0',documentSha256:'3b28df2b1792ca561243f1c592458f4dd309b0c317e88b83362a69e3e0586c1c'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const must=(condition,code)=>{if(!condition)throw Object.assign(Error('Target metadata: '+code),{code});};

/** Initial identity evidence only. The deployed mount must reread through
 * actual native resolveMany/approval APIs; this export is not an activation. */
export function readModuleTargetHeadMetadata(db){
 db.exec('BEGIN');
 try{
  const product=db.prepare('SELECT id,revision,kind,archived FROM products WHERE id=? AND tenant_id=?').get(PIN.productId,PIN.tenantId);
  must(product?.revision===PIN.revision&&product.kind==='product'&&!product.archived,'product');
  const revision=db.prepare('SELECT revision,status,document,published_revision FROM product_revisions WHERE product_id=? AND revision=? AND tenant_id=?').get(PIN.productId,PIN.revision,PIN.tenantId);
  must(revision?.document&&revision.status==='draft'&&revision.published_revision===null&&sha(revision.document)===PIN.documentSerializedSha256,'document_pin');
  const rows=db.prepare(`SELECT r.tenant_id,r.shop,r.store_id,r.product_gid,r.variant_gid,r.revision,r.binding_id,r.cfg_id,r.cfg_revision,r.document_sha256,
    b.shop AS binding_shop,b.variant_id AS binding_variant_id,b.product_id AS binding_product_id,b.product_revision AS binding_product_revision,b.unit_cents,s.options
    FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision
    LEFT JOIN form_shop_bindings b ON b.id=r.binding_id AND b.tenant_id=r.tenant_id
    LEFT JOIN form_shop_binding_selections s ON s.binding_id=b.id AND s.tenant_id=b.tenant_id
    WHERE h.tenant_id=? AND h.shop=? AND r.product_gid=? AND r.cfg_id=? ORDER BY r.variant_gid LIMIT 405`).all(PIN.tenantId,PIN.shopDomain,PIN.shopifyProductId,PIN.productId);
  must(rows.length===404&&new Set(rows.map(r=>r.variant_gid)).size===404,'coverage');
  for(const row of rows)must(row.store_id===PIN.storeId&&row.cfg_revision===4&&row.document_sha256===PIN.documentSha256&&row.binding_product_id===PIN.productId&&row.binding_product_revision===4&&row.binding_shop===PIN.shopDomain&&row.binding_variant_id===row.variant_gid.split('/').at(-1),'binding_identity');
  const approval=db.prepare('SELECT approval_id,document_sha256,variants_json FROM catalog_live_order_approvals WHERE tenant_id=? AND shop=? AND product_gid=? AND cfg_id=? AND cfg_revision=?').get(PIN.tenantId,PIN.shopDomain,PIN.shopifyProductId,PIN.productId,PIN.revision);
  must(approval?.document_sha256===PIN.documentSerializedSha256&&JSON.stringify(JSON.parse(approval.variants_json).sort())===JSON.stringify(rows.map(r=>r.variant_gid).sort()),'approval');
  const heads=rows.map(r=>({tenantId:r.tenant_id,storeId:r.store_id,shopDomain:r.shop,shopifyProductId:r.product_gid,shopifyVariantId:r.variant_gid,assignmentRevision:r.revision,bindingId:r.binding_id,productId:r.cfg_id,productRevision:r.cfg_revision,documentSha256:r.document_sha256,unitCents:r.unit_cents,options:JSON.parse(r.options)}));
  db.exec('COMMIT');
  return {schema:'gravuru-production-module-target-metadata/v1',readOnly:true,evidenceKind:'initial-sql-identity-only',nativeResolveManyRequired:true,
   target:{tenantId:PIN.tenantId,storeId:PIN.storeId,shopDomain:PIN.shopDomain,productId:PIN.productId,revision:4,shopifyProductId:PIN.shopifyProductId,documentSha256:PIN.documentSha256,documentSerializedSha256:PIN.documentSerializedSha256},heads,approval:{id:approval.approval_id,variantCount:404,documentSha256:approval.document_sha256},checkedAt:new Date().toISOString(),sourceWritten:false,ordersRead:false};
 }catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let db;
 try{
  const [filename]=process.argv.slice(2);must(process.argv.length===3&&path.isAbsolute(filename)&&!fs.existsSync(filename)&&fs.realpathSync(PIN.filename)===PIN.filename,'arguments');
  db=new DatabaseSync(PIN.filename,{readOnly:true});db.exec('PRAGMA query_only=ON');
  const result=readModuleTargetHeadMetadata(db),bytes=gzipSync(Buffer.from(JSON.stringify(result)),{level:9});
  fs.writeFileSync(filename,bytes,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({ok:true,file:filename,sha256:sha(bytes),bytes:bytes.length,heads:result.heads.length,revision:4,readOnly:true,ordersRead:false}));
 }catch(error){console.log(JSON.stringify({ok:false,code:error.code||'target_metadata_failed',readOnly:true}));process.exitCode=1;}
 finally{db?.close();}
}
