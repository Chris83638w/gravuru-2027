// Nur lesen: Astras Kleinidentitätshelfer (c6f9910, unverändert im Ordner kandidat-f85390b-20261112) auf der
// ARBEITSKOPIE des Legacy-Stores. Das Schemaflag wird aus der Kopie abgelesen (tenant_id vorhanden oder nicht) und
// ausdrücklich übergeben. Aufruf: node kt-legacy-klein.mjs <Stand>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
const hier=import.meta.dirname;
const RT=process.env.KT_RT||path.resolve(hier,'../kandidat-f85390b-20261112');
const BASIS=process.env.KT_LEGACY_ZIEL||path.resolve(hier,'../sicherungen-db/legacy');
const TOOL='ops/issue230-small-targets-copy-review-20261111';
const PINS={[TOOL+'/inspect-small-targets-copy.mjs']:'f7885dbd2c7b23686a6086a6b8b4c6f2dea6c76b04f55f8062b91adc4fe98fee',[TOOL+'/copy-guard.mjs']:'466ffb3e96fa8bcc2b569a3069abe7ea4ca00a856fae9a8cc65ac186b39a1671',[TOOL+'/v9-source-aliases.json']:'2ddc13a66c323ece8228867e1e8bf32388f7d82b129ff37128d37fb12a79f694'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const log=e=>console.log(JSON.stringify({event:'kt_legacy_klein',...e}));
try{
 const stand=process.argv[2];if(!/^\d{8}T\d{6}Z$/.test(stand||''))throw new Error('Stand fehlt.');
 for(const [f,h] of Object.entries(PINS))if(sha(fs.readFileSync(path.join(RT,f)))!==h)throw new Error('Prüfsumme weicht ab: '+f);
 const gruppen=path.join(hier,'kt-six-groups.json');if(sha(fs.readFileSync(gruppen))!=='d2cb6cac1149da13db9ed9c2af83f27f3060a4531840636542e9fe95f4d6346f')throw new Error('Gruppenliste weicht ab.');
 const dir=path.join(BASIS,'arbeitskopie-'+stand),kopie=path.join(dir,'workshop.copy.sqlite');
 const db=new DatabaseSync(kopie,{readOnly:true});let schema;
 try{
  const spalten=t=>db.prepare('PRAGMA table_info('+t+')').all().map(r=>r.name);
  const tabellen=db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name);
  schema={tenantInProducts:spalten('products').includes('tenant_id'),tenantInFormShopBindings:spalten('form_shop_bindings').includes('tenant_id'),bindingTabellen:tabellen.filter(n=>/^shop_product_binding|^form_shop_bindings$|^shop_gallery/.test(n)),tabellen:tabellen.length,
   produkte:db.prepare('SELECT count(*) AS n FROM products').get().n,revisionen:db.prepare('SELECT count(*) AS n FROM product_revisions').get().n,formBindungen:tabellen.includes('form_shop_bindings')?db.prepare('SELECT count(*) AS n FROM form_shop_bindings').get().n:null,
   koepfe:tabellen.includes('shop_product_binding_heads')?db.prepare('SELECT count(*) AS n FROM shop_product_binding_heads').get().n:null};
 }finally{db.close();}
 const legacyFlag=!schema.tenantInProducts;
 const args=[path.join(RT,TOOL,'inspect-small-targets-copy.mjs'),'--copy',kopie,'--groups',gruppen,'--native-aliases',path.join(RT,TOOL,'v9-source-aliases.json'),'--tenant','gravuru','--store-id','legacy',...(legacyFlag?['--legacy-single-store','true']:[])];
 const t=Date.now(),r=spawnSync(process.execPath,args,{cwd:RT,encoding:'utf8',maxBuffer:256*1024*1024});
 const stempel=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z'),datei=path.join(dir,'small-target-identities-legacy-'+stempel+'.json');
 fs.writeFileSync(datei,r.stdout||'',{flag:'wx',mode:0o600});
 let e=null;try{e=JSON.parse(r.stdout);}catch{}
 const anzahl=v=>Array.isArray(v)?v.length:v&&typeof v==='object'?Object.keys(v).length:v??null;
 log({stand,schema,legacyFlag,exit:r.status,ms:Date.now()-t,stderr:String(r.stderr||'').slice(0,900),datei:path.basename(datei),bytes:(r.stdout||'').length,
  inventoryCompleted:e?.inventoryCompleted??null,readyForImport:e?.readyForImport??null,productScope:e?.productScope??null,activeBindingSchemaAvailable:e?.activeBindingSchemaAvailable??null,missingBindingTables:e?.missingBindingTables??null,issues:e?.issues??null,
  scope:e?.scope??null,copyEvidence:e?.copyEvidence??null,
  zahlen:e?Object.fromEntries(['activeBindings','bindingRevisionHistory','historicalFixedBindings','nativeAliasCandidates','nativeSourceIdCandidates','nativeCfgRevisions','variantsWithoutCurrentHead'].map(k=>[k,anzahl(e[k])])):null,
  perGroup:e?.perGroup?.map(g=>({g:g.group,rv:anzahl(g.relevantVariants),heads:anzahl(g.activeHeadRows),ok:anzahl(g.consistentActiveBindingRows),cfg:g.activeCfgRevisions,hist:anzahl(g.historicalFixedBindingRows),alias:anzahl(g.nativeAliasCandidates),src:anzahl(g.exactLocalSourceIdCandidates)}))??null,
  cfgRevisionen:e?.nativeCfgRevisions?(Array.isArray(e.nativeCfgRevisions)?e.nativeCfgRevisions:Object.values(e.nativeCfgRevisions)).map(x=>[x.cfgId,x.cfgRevision,x.headFound,x.revisionFound,x.head?.revision??null,x.head?.archived??null,x.head?.kind??null,x.revisionStatus??null,String(x.idBindingDocumentSha256||'').slice(0,12)]):null,
  festbindungen:e?.historicalFixedBindings?Object.entries(e.historicalFixedBindings.reduce((a,h)=>{const k=h.group+'|'+String(h.auditedShopProductId).split('/').pop()+'|'+h.cfgId+'@'+h.cfgRevision;a[k]=(a[k]||0)+1;return a;},{})).slice(0,60):null});
 if(r.status!==0)process.exitCode=1;
}catch(error){log({fehler:String(error.message||error)});process.exitCode=1;}
