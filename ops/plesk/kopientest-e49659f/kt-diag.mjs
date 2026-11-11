// Nur lesen: Form der aktiven Bindungen (Store acryl) auf der Datenbank-ARBEITSKOPIE – wie viele Bindungszeilen je festem
// Produktstand und wie groß dessen gespeicherter Beleg ist. Keine Inhalte, nur Kennungen, Zahlen und Bytegrößen.
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const hier=import.meta.dirname;
const BASE=process.env.KT_BASE||path.resolve(hier,'../sicherungen-db');
const WORKSHOP=process.env.KT_WORKSHOP||path.join(BASE,'arbeitskopie-20261111T195242Z','workshop.copy.sqlite');
const STORE=process.env.KT_STORE||'acryl',SHOP=process.env.KT_SHOP||'gravuru-design.myshopify.com',TENANT='gravuru';
try{
 const real=fs.realpathSync(WORKSHOP);
 if(!/\.copy\.sqlite$/.test(real)||/[\\/]private[\\/](?:acryl-employee-20261021-v1|mika-r15-resume-20261108-v1)[\\/]/.test(real))throw new Error('Nur die Arbeitskopie.');
 const db=new DatabaseSync(real,{readOnly:true});
 try{
  db.exec('PRAGMA query_only=1');
  const gruppen=db.prepare(`SELECT r.cfg_id AS id,r.cfg_revision AS rev,count(*) AS n,count(DISTINCT r.product_gid) AS shopprodukte FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r
   ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision WHERE h.tenant_id=? AND h.shop=? AND r.store_id=? GROUP BY r.cfg_id,r.cfg_revision ORDER BY n DESC`).all(TENANT,SHOP,STORE);
  const groesse=db.prepare('SELECT length(CAST(r.document AS BLOB)) AS d,length(CAST(r.metadata AS BLOB)) AS m,r.status AS status,p.kind AS kind,p.archived AS archived,p.revision AS head FROM product_revisions r JOIN products p ON p.id=r.product_id AND p.tenant_id=r.tenant_id WHERE r.tenant_id=? AND r.product_id=? AND r.revision=?');
  const zeilen=gruppen.map(g=>{const s=groesse.get(TENANT,g.id,g.rev)||{};return {cfg:g.id,rev:g.rev,bindungen:g.n,shopprodukte:g.shopprodukte,belegBytes:s.d??null,metadatenBytes:s.m??null,status:s.status??null,art:s.kind??null,archiviert:s.archived??null,kopf:s.head??null};});
  const summe=(f)=>zeilen.reduce((a,z)=>a+f(z),0);
  const stores=db.prepare('SELECT r.store_id AS store,count(*) AS n FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision WHERE h.tenant_id=? AND h.shop=? GROUP BY r.store_id').all(TENANT,SHOP);
  const trigger=db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name='product_revisions' ORDER BY name").all().map(r=>r.name);
  const cache=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'shop_gallery%'").all().map(r=>r.name);
  console.log(JSON.stringify({event:'kt_diag',store:STORE,produktstaende:zeilen.length,bindungszeilen:summe(z=>z.bindungen),belegBytesEinmalig:summe(z=>z.belegBytes||0),belegBytesMalBindungen:summe(z=>(z.belegBytes||0)*z.bindungen),metadatenBytesMalBindungen:summe(z=>(z.metadatenBytes||0)*z.bindungen),
   stores,recursiveTriggers:db.prepare('PRAGMA recursive_triggers').get().recursive_triggers,triggerAufProductRevisions:trigger,galerieTabellen:cache,zeilen}));
 }finally{db.close();}
}catch(error){console.log(JSON.stringify({event:'kt_diag',fehler:String(error.message||error)}));process.exitCode=1;}
