// Lokale Nachstellung (nur neue synthetische Datenbank): liest listActiveForGallery den festen Beleg je Bindungszeile erneut?
// Aufruf: node --expose-gc repro-stamp.mjs <repo> <belegMiB> <bindungen>
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';import {pathToFileURL} from 'node:url';
const [repo,mibArg,nArg]=process.argv.slice(2),MiB=1024*1024,docBytes=Math.round(+mibArg*MiB),bindings=+nArg;
const imp=p=>import(pathToFileURL(path.join(repo,p)).href);
const {createProductRepository}=await imp('app/workshop/repository.mjs'),{createOrderIntake}=await imp('app/workshop/order-intake.mjs'),{createShopProductBindingStore}=await imp('app/workshop/shop-product-binding-store.mjs');
const scope={tenantId:'gravuru',storeId:'memory-test',shopDomain:'memory-test.myshopify.com'};
const canonical=v=>v&&typeof v==='object'?(Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}'):JSON.stringify(v);
const digest=v=>createHash('sha256').update(canonical(v)).digest('hex');
const noWrite=()=>{throw Error('no writes');},adapter={...scope,getCurrentProduct:noWrite},orders={tenantId:scope.tenantId,bindVariants:noWrite,bindings:noWrite};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kt-repro-')),filename=path.join(dir,'w.sqlite');
try{
 const repository=createProductRepository({filename,tenantId:scope.tenantId,snapshotMetadata:()=>({})});const db=new DatabaseSync(filename);
 createOrderIntake({database:db,tenantId:scope.tenantId,snapshot:noWrite});createShopProductBindingStore({database:db,orderIntake:orders,adapter,...scope});
 const record=repository.create({name:'Synthetic',kind:'product',masterId:null,payload:'x'.repeat(docBytes)}),sha=digest(record.document),at='2026-11-11T00:00:00.000Z';
 for(let i=0;i<bindings;i++){const v=String(10000+i),b='b-'+v;
  db.prepare('INSERT INTO form_shop_bindings(id,shop,variant_id,product_id,product_revision,unit_cents,created_at,tenant_id) VALUES(?,?,?,?,?,?,?,?)').run(b,scope.shopDomain,v,record.id,1,269,at,scope.tenantId);
  db.prepare('INSERT INTO shop_product_binding_revisions(tenant_id,shop,variant_gid,revision,product_gid,store_id,binding_id,cfg_id,cfg_revision,document_sha256,evidence_read_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(scope.tenantId,scope.shopDomain,'gid://shopify/ProductVariant/'+v,1,'gid://shopify/Product/1',scope.storeId,b,record.id,1,sha,at,at);
  db.prepare('INSERT INTO shop_product_binding_heads(tenant_id,shop,variant_gid,revision) VALUES(?,?,?,1)').run(scope.tenantId,scope.shopDomain,'gid://shopify/ProductVariant/'+v);}
 db.exec('PRAGMA wal_checkpoint(TRUNCATE)');db.close();repository.close();
 const ro=new DatabaseSync(filename,{readOnly:true});
 // Zählt nur, wie oft und wie viele Bytes der Belegspalte gelesen werden (Statement-Hülle, kein Eingriff in die App-Dateien).
 let docReads=0,docBytesRead=0;const prepare=ro.prepare.bind(ro);
 ro.prepare=sql=>{const st=prepare(sql);if(!/r\.document/.test(sql))return st;const get=st.get.bind(st);st.get=(...a)=>{const row=get(...a);if(row&&typeof row.document==='string'){docReads++;docBytesRead+=row.document.length;}return row;};return st;};
 const store=createShopProductBindingStore({database:ro,orderIntake:orders,adapter,...scope,readOnly:true,logger:()=>{}});
 let peak=0;const t=setInterval(()=>{peak=Math.max(peak,process.memoryUsage().rss);},20);
 const start=performance.now();let m=null;const list=await store.listActiveForGallery({onMeasure:x=>{m=x;}});clearInterval(t);
 console.log(JSON.stringify({belegMiB:+mibArg,bindungen:bindings,geliefert:list.length,ms:Math.round(performance.now()-start),belegLesungen:docReads,gelesenMiB:Math.round(docBytesRead/MiB),spitzeRssMiB:Math.round(Math.max(peak,process.resourceUsage().maxRSS*1024)/MiB),produkte:m?.products,documentReadMs:Math.round(m?.documentReadMs),documentHashMs:Math.round(m?.documentHashMs)}));
 ro.close();
}finally{fs.rmSync(dir,{recursive:true,force:true});}
