// AUSFÜHRUNG AUF DEN TATSÄCHLICHEN DATEN (Freigabe #168 6829898414 „Ja, Gesamtpaket ausführen“, Umfang f26ada8):
// sechs neue Shopify-DRAFTs über Astras unveränderten Sechs-DRAFT-Operator (ops/issue230-six-draft-execution-20261112 @ 1e1bbc36,
// Manifest f752b6f1…; seit der Wiederaufnahme das reparierte Paket -v2 @ 630e3db, Manifest fb86a5e6…, einzige
// Codeänderung SET_TEMPLATE userErrors{field message}). Gleicher Anschluss wie der geprüfte Kopienlauf sd-lauf.mjs (15/15), aber: keine Kopie, ECHTER
// Shopify-Transport der Eigentümer-App (Client-Credentials wie die App selbst), keine Fehlerinjektion, keine Drifttests.
// Natives confirm/execute der sechs gespeicherten Pläne, dann je Gruppe: DRAFT anlegen, Preisvertrag, 45 Bindungen,
// Katalogfreigabe, Einstieg. Nichts wird veröffentlicht. Bei jeder Abweichung hält der Operator an (kein blinder Zweitversuch).
//   node sdl-live.mjs --quelle=sechsgruppen-live-…                 erster Lauf (action create)
//   node sdl-live.mjs --quelle=… --ordner=sechsdraft-live-… --reconcile   NUR nach Klärung eines angehaltenen Laufs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,P=process.env.SD_P||path.resolve(hier,'..'),RT=process.env.SD_RT||path.join(P,'kandidat-f85390b-20261112'),BASIS=path.join(P,'sicherungen-db'),LIVE=path.join(P,'acryl-employee-20261021-v1','data');
const arg=n=>(process.argv.find(a=>a.startsWith('--'+n+'='))||'').slice(n.length+3),QUELLE=arg('quelle'),WIEDER=arg('ordner'),RECONCILE=process.argv.includes('--reconcile');
const MANIFEST_SHA='fb86a5e645c956f8f253e138dba13182b3d6b141a059ff0a4880c7512b24741c',SAMMEL='sd-paket-v2.json',PAKETORDNER='paket-v2',FREIGABE='chris-168-6829898414-gesamtpaket',AKTEUR='Chris - Freigabe #168 6829898414 (Gesamtpaket), ausgefuehrt durch Claude';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');let geheim=[];
const sauber=s=>{let t=String(s);for(const g of geheim)if(g)t=t.replaceAll(g,'[entfernt]');return t.replace(/\/var\/www\/vhosts\/[^/]+/g,'~');};
const kurzFehler=e=>({code:e?.code??null,status:e?.status??null,message:sauber(e?.message||e).slice(0,300),wo:String(e?.stack||'').split('\n').slice(1,3).map(l=>sauber(l.trim().replace(/^at /,'')).replace(/file:\/\/\S*\/(private|sicherungen-db)\//,'').slice(0,100))});
const zeige=o=>{const t=JSON.stringify({event:'sdl_live',...o});if(geheim.some(g=>g&&t.includes(g)))throw new Error('Ausgabe enthielte einen Zugangswert');console.log(t);};
const TEST=process.env.SD_TEST_FETCH?await import(pathToFileURL(process.env.SD_TEST_FETCH).href):null; // nur lokaler Test, auf dem Server nie gesetzt
let schritt='start',workshop=null;const ergebnis={schema:'gravuru-sechs-draft-ausfuehrung/v1',kennzeichnung:'AUSFÜHRUNG auf den tatsächlichen Daten mit echtem Shopify; Freigabe #168 6829898414; alle Produkte bleiben DRAFT',erstellt:new Date().toISOString(),kandidat:path.basename(RT),modus:RECONCILE?'reconcile':'create'};
try{
 if(!/^sechsgruppen-live-\d{8}T\d{6}Z$/.test(QUELLE))throw new Error('--quelle ungültig.');if(RECONCILE!==!!WIEDER||(WIEDER&&!/^sechsdraft-live-\d{8}T\d{6}Z$/.test(WIEDER)))throw new Error('--reconcile nur zusammen mit --ordner.');
 const Q=path.join(BASIS,QUELLE),ts=ergebnis.erstellt.replace(/[-:]/g,'').slice(0,15)+'Z',U=path.join(BASIS,WIEDER||'sechsdraft-live-'+ts),bau=path.join(U,'bau'),paket=path.join(U,PAKETORDNER),ZUSTAND=path.join(U,'zustand.json');
 // 1. Paket
 schritt='paket';const sammel=JSON.parse(fs.readFileSync(path.join(hier,SAMMEL),'utf8')),mb=Buffer.from(sammel['manifest.json'],'base64');if(sha(mb)!==MANIFEST_SHA)throw new Error('Manifest weicht ab.');const manifest=JSON.parse(mb);
 for(const f of manifest.files){const b=Buffer.from(sammel[f.file],'base64');if(sha(b)!==f.sha256||b.length!==f.bytes)throw new Error('Paketdatei weicht ab: '+f.file);}
 if(!RECONCILE){fs.mkdirSync(U,{mode:0o700});for(const d of [bau,paket])fs.mkdirSync(d,{mode:0o700});for(const f of manifest.files)fs.writeFileSync(path.join(paket,f.file),Buffer.from(sammel[f.file],'base64'),{flag:'wx',mode:0o600});fs.writeFileSync(path.join(paket,'manifest.json'),mb,{flag:'wx',mode:0o600});}
 else if(!fs.existsSync(paket)){fs.mkdirSync(paket,{mode:0o700});for(const f of manifest.files)fs.writeFileSync(path.join(paket,f.file),Buffer.from(sammel[f.file],'base64'),{flag:'wx',mode:0o600});fs.writeFileSync(path.join(paket,'manifest.json'),mb,{flag:'wx',mode:0o600});}
 else for(const f of manifest.files)if(sha(fs.readFileSync(path.join(paket,f.file)))!==f.sha256)throw new Error('Paket im Ordner weicht ab: '+f.file);
 const pins=JSON.parse(fs.readFileSync(path.join(paket,'native-pins.json'),'utf8'));for(const [f,h] of Object.entries(pins))if(sha(fs.readFileSync(path.join(RT,f)))!==h)throw new Error('Nativer Pin weicht ab: '+f);
 ergebnis.ordner=path.basename(U);ergebnis.paket={commit:'630e3db (v2)',ordner:PAKETORDNER,manifestSha256:MANIFEST_SHA,dateien:manifest.files.length,runnerSha256:sha(fs.readFileSync(path.join(hier,'sdl-live-v2.mjs')))};
 const beleg0=JSON.parse(fs.readFileSync(path.join(Q,'AUSFUEHRUNG-sechsgruppen.json'),'utf8'));if(beleg0.bestanden!==true||beleg0.gruppen.length!==6)throw new Error('Vorbereitungsbeleg nicht bestanden.');
 ergebnis.quelle={ordner:QUELLE,belegSha256:sha(fs.readFileSync(path.join(Q,'AUSFUEHRUNG-sechsgruppen.json')))};
 // 2. tatsächliche native Fabrik auf den tatsächlichen Dateien (wie der Host, ohne HTTP-Server)
 schritt='bau';delete process.env.GRAVURU_KATALOG_WORKER;const imp=p=>import(pathToFileURL(path.join(RT,p)).href);
 if(!RECONCILE){const {build}=await imp('app/configurator/variant-m/build.mjs');build({outputDirectory:bau});}
 const seed=JSON.parse(fs.readFileSync(path.join(bau,'models.json'),'utf8'))[0];
 schritt='fabrik';const six=await import(pathToFileURL(path.join(paket,'six-drafts.mjs')).href),steps=await import(pathToFileURL(path.join(paket,'shopify-steps.mjs')).href),{openPrivateLog}=await import(pathToFileURL(path.join(paket,'private-log.mjs')).href);
 const {SHOP,TENANT,STORE}=six,[{createWorkshop},{nativeModuleSources},{createShopBindingReadAdapter},{SHOPIFY_IDENTITY},ro]=await Promise.all(['app/workshop/http.mjs','app/workshop/configurator-module-http.mjs','app/workshop/shop-product-binding-adapter.mjs','app/workshop/shopify-runtime-config.mjs','app/workshop/shopify-admin-readonly.mjs'].map(imp));
 if(SHOPIFY_IDENTITY.shopDomain!==SHOP||ro.ADMIN_READONLY_IDENTITY.shopDomain!==SHOP)throw new Error('Shopidentität passt nicht.');
 const wFile=path.join(LIVE,'workshop.sqlite');
 workshop=createWorkshop({filename:wFile,seedConfig:seed.universal,legacy:seed.legacy,shopifySessions:{mode:'test-only',shopDomain:SHOP,clientId:SHOPIFY_IDENTITY.clientId,secret:crypto.randomBytes(32).toString('hex')}});
 if(workshop.tenantId!==TENANT)throw new Error('Mandant der Fabrik ist nicht '+TENANT);
 const repository=workshop.repository,orders=workshop.orderIntake,transferJournal=workshop.customerDrafts.shopDraftTransfers;
 const groups=workshop.configureModuleManagement({filename:wFile,sourceRegistry:nativeModuleSources(repository)}).groups;
 const adapter=createShopBindingReadAdapter({storeId:STORE,tenantId:workshop.tenantId,shopDomain:SHOP,productionProfileScope:{storeId:STORE,tenantId:workshop.tenantId},workshop});
 const zaehle=()=>{const db=new DatabaseSync(wFile,{readOnly:true});try{const n=(q,...a)=>{try{return db.prepare(q).get(...a)?.n??null;}catch{return null;}};return {produkte:n('SELECT COUNT(*) AS n FROM products WHERE tenant_id=?',TENANT),revisionen:n('SELECT COUNT(*) AS n FROM product_revisions WHERE tenant_id=?',TENANT),importjournal:n('SELECT COUNT(*) AS n FROM import_items WHERE tenant_id=?',TENANT),plaene:n('SELECT COUNT(*) AS n FROM product_group_creation_plans WHERE tenant_id=?',TENANT),bestaetigungen:n('SELECT COUNT(*) AS n FROM product_group_confirmations WHERE tenant_id=?',TENANT),ausfuehrungen:n('SELECT COUNT(*) AS n FROM product_group_creation_results WHERE tenant_id=?',TENANT),formbindungen:n('SELECT COUNT(*) AS n FROM form_shop_bindings WHERE tenant_id=?',TENANT),preisvertraege:n('SELECT COUNT(*) AS n FROM form_shop_binding_personalization WHERE tenant_id=?',TENANT),bindungskoepfe:n('SELECT COUNT(*) AS n FROM shop_product_binding_heads WHERE tenant_id=?',TENANT),bindungsrevisionen:n('SELECT COUNT(*) AS n FROM shop_product_binding_revisions WHERE tenant_id=?',TENANT),katalogfreigaben:n('SELECT COUNT(*) AS n FROM catalog_live_order_approvals'),transfers:n('SELECT COUNT(*) AS n FROM shop_draft_transfers')};}finally{db.close();}};
 ergebnis.vorher=zaehle();
 // 3. natives confirm/execute der sechs gespeicherten Pläne (im reconcile-Modus nur Replay mit den gespeicherten Bestätigungen)
 schritt='execute';const native=await six.loadNativeFunctions(RT),refs=six.loadReferences().groups,entries=[];ergebnis.gruppen=[];
 const alt=RECONCILE?JSON.parse(fs.readFileSync(ZUSTAND,'utf8')):null;if(!RECONCILE&&(ergebnis.vorher.bestaetigungen||ergebnis.vorher.ausfuehrungen))throw Object.assign(new Error('Es gibt bereits Bestätigungen/Ausführungen; kein zweiter Erstlauf.'),{code:'sdl_schon_begonnen'});
 const zustand={freigabe:FREIGABE,gruppen:[]};
 for(const ref of refs){
  const g0=beleg0.gruppen.find(x=>x.ordner===ref.group);if(!g0)throw new Error('Gruppe fehlt im Vorbereitungsbeleg: '+ref.group);
  const plan=groups.getPlan(g0.plan.id);if(plan.planHash!==g0.plan.planHash)throw new Error('Planhash weicht ab: '+ref.group);
  const confirmationId=RECONCILE?alt.gruppen.find(x=>x.planId===plan.id).confirmationId:groups.confirm({planId:plan.id,planHash:plan.planHash,accepted:true},{actor:AKTEUR}).confirmationId;
  zustand.gruppen.push({gruppe:ref.group,planId:plan.id,confirmationId});if(!RECONCILE){const t=ZUSTAND+'.neu';fs.writeFileSync(t,JSON.stringify(zustand),{mode:0o600});fs.renameSync(t,ZUSTAND);}
  const execution=groups.execute({planId:plan.id,planHash:plan.planHash,confirmationId}),record=repository.get(execution.products[0].productId);
  entries.push({group:ref.group,plan,execution,record});
  ergebnis.gruppen.push({gruppe:ref.group,planId:plan.id,planHash:plan.planHash,confirmationId,zielProduktId:record.id,zielRevision:record.revision,status:record.status,publishedRevision:record.publishedRevision,created:execution.products[0].created,quelleProduktId:g0.quelle.id,localOnly:execution.localOnly,shopifyWrites:execution.shopifyWrites});
 }
 ergebnis.nachExecute=zaehle();
 schritt='prepare';const review=six.prepareSixDrafts(entries,{native});
 ergebnis.review={reviewHash:review.reviewHash,produkte:review.rows.length,varianten:review.rows.reduce((m,r)=>m+r.request.input.variants.length,0),jeGruppe:review.rows.map(r=>({productId:r.productId,handle:r.request.input.handle,titel:r.request.input.title,status:r.request.input.status,varianten:r.request.input.variants.length,preise:[...new Set(r.request.input.variants.map(v=>v.price))]}))};
 const erst=RECONCILE?JSON.parse(fs.readFileSync(path.join(U,'AUSFUEHRUNG-sechsdraft.json'),'utf8')):null;if(RECONCILE&&erst.review.reviewHash!==review.reviewHash)throw Object.assign(new Error('reviewHash weicht vom ersten Lauf ab.'),{code:'sdl_review_geaendert'});if(RECONCILE)ergebnis.ersterLauf={reviewHash:erst.review.reviewHash,vorher:erst.vorher,operatorFehler:erst.operatorFehler?.code??null};
 if(ergebnis.review.produkte!==6||ergebnis.review.varianten!==45||!review.rows.every(r=>r.request.input.status==='DRAFT'&&r.request.input.files===undefined))throw Object.assign(new Error('Review nicht 6/45/DRAFT.'),{code:'sdl_review'});
 // 4. echter Shopify-Zugang der Eigentümer-App (wie die App: Client-Credentials aus der privaten Händlerkonfiguration)
 schritt='shopify-zugang';const I=ro.ADMIN_READONLY_IDENTITY;let fremd=0;const fetchEcht=TEST?TEST.fetchImpl:globalThis.fetch;
 const nurShop=(url,o)=>{let h='';try{h=new URL(String(url)).host;}catch{}if(h!==SHOP){fremd++;throw new Error('Netz gesperrt außer Shopify');}return fetchEcht(url,o);};
 let secret;if(TEST)secret=TEST.secret;else{const appText=fs.readFileSync(path.join(P,'..','gravuru-2027-merchant','app.cjs'),'utf8'),cfgFile=(appText.match(/process\.env\.GRAVURU_SHOPIFY_CONFIG_FILE\s*=\s*(["'])(.*?)\1/)||[])[2];if(!cfgFile)throw Object.assign(new Error('Konfiguration fehlt'),{code:'sdl_konfiguration'});
  const secretFile=JSON.parse(fs.readFileSync(cfgFile,'utf8')).values?.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE,st=fs.statSync(secretFile);if(!st.isFile()||st.mode&0o077||st.size<16||st.size>1024)throw Object.assign(new Error('Secretdatei'),{code:'sdl_secretdatei'});secret=fs.readFileSync(secretFile,'utf8').trim();}
 geheim.push(secret);if(!/^[A-Za-z0-9_-]{16,256}$/.test(secret))throw Object.assign(new Error('Secretformat'),{code:'sdl_secretformat'});
 const tr=await nurShop(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({grant_type:'client_credentials',client_id:I.clientId,client_secret:secret}).toString()});
 if(!tr.ok)throw Object.assign(new Error('Tokenabruf HTTP '+tr.status),{code:'sdl_token_http'});const tk=await tr.json();if(typeof tk.access_token!=='string'||tk.access_token.length<16)throw Object.assign(new Error('Token'),{code:'sdl_token'});geheim.push(tk.access_token);
 const zaehler={lesen:0,schreiben:0,create:0,kosten:[]},fehlerProtokoll=[],merke=(art,text)=>{if(fehlerProtokoll.length<12)fehlerProtokoll.push({art,text:sauber(text).slice(0,220)});};
 const zaehlend=(url,o)=>{try{const b=JSON.parse(o?.body||'{}');if(typeof b.query==='string'){if(/^\s*mutation\b/.test(b.query)){zaehler.schreiben++;if(b.query===native.SHOP_DRAFT_CREATE)zaehler.create++;}else zaehler.lesen++;}}catch{}return nurShop(url,o);};
 const draftTransport=native.createShopDraftTransport({shopDomain:SHOP,apiVersion:I.apiVersion,accessToken:tk.access_token},{fetchImpl:zaehlend});
 const client={async graphql(query,variables){const r=await zaehlend(`https://${SHOP}/admin/api/${I.apiVersion}/graphql.json`,{method:'POST',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json',Accept:'application/json','X-Shopify-Access-Token':tk.access_token},body:JSON.stringify({query,variables})});if(!r.ok){merke('http',String(r.status));throw Object.assign(new Error('Shopify HTTP '+r.status),{code:'sdl_http_'+r.status});}const j=await r.json();if(j.extensions?.cost)zaehler.kosten.push(j.extensions.cost.actualQueryCost);if(Array.isArray(j.errors)&&j.errors.length)for(const e of j.errors.slice(0,3))merke('graphql',String(e.extensions?.code||'')+' '+String(e.message));for(const v of Object.values(j.data||{}))if(Array.isArray(v?.userErrors)&&v.userErrors.length)for(const e of v.userErrors.slice(0,3))merke('userErrors',String(e.code||'')+' '+String(e.field||'')+' '+String(e.message));return j;}};
 const readonlyReader=ro.createShopifyAdminReadonly({readSecret:async()=>secret},{fetchImpl:nurShop});
 const shop=steps.createSixDraftShopSteps({client,readonlyReader,native});
 // nur Beobachtung: jede unveränderliche Bindung muss einen Preisvertrag mitbringen
 const bind=orders.bindVariants;let bindAufrufe=0,bindOhneVertrag=0;orders.bindVariants=function(input){bindAufrufe++;if(!input.personalizationPricing)bindOhneVertrag++;return bind.call(this,input);};
 // 5. Ausführung – genau ein Operatoraufruf; bei Fehler anhalten und Stand festhalten
 schritt='operator';const plog=openPrivateLog(path.join(U,'operator-log.jsonl')),phasen=[];
 const context={native,repository,orders,transferJournal,draftTransport,shop,adapter,principal:{role:'merchant',shopDomain:SHOP,subject:'chris-freigabe-168-6829898414'},approval:{id:FREIGABE,reviewHash:review.reviewHash},checkpoint:e=>{phasen.push(e.phase);plog.checkpoint(e);},action:RECONCILE?'reconcile':'create'};
 let res=null,opFehler=null;try{res=await six.executeSixDrafts(review,context);}catch(e){opFehler=kurzFehler(e);}
 try{plog.close();}catch{}
 ergebnis.nachOperator=zaehle();ergebnis.shopifyAufrufe={...zaehler,kosten:zaehler.kosten.length?[Math.min(...zaehler.kosten),Math.max(...zaehler.kosten),zaehler.kosten.length]:null,fremdeNetzversuche:fremd};ergebnis.bindungen={aufrufe:bindAufrufe,ohneVertrag:bindOhneVertrag};ergebnis.fehlerProtokoll=fehlerProtokoll;ergebnis.phasen=phasen.reduce((m,p)=>{m[p]=(m[p]||0)+1;return m;},{});
 if(opFehler){ergebnis.operatorFehler=opFehler;ergebnis.hinweis='Operator hat angehalten. Kein automatischer Zweitversuch. Stand klären, dann ggf. --reconcile.';}
 else{
  ergebnis.operator={produkte:res.products.length,varianten:res.variants,jeProdukt:res.products.map(p=>({gruppe:p.group,productId:p.productId,revision:p.revision,shopifyProductId:p.shopifyProductId,varianten:p.variants,bindingsCreated:p.bindingsCreated,assignmentsChanged:p.assignmentsChanged,pricingSha256:p.pricingSha256,requestSha256:p.requestSha256,selections:p.selections}))};
  // 6. unabhängiger Readback bei Shopify und in der Registry
  schritt='readback';ergebnis.readback=[];
  for(const p of res.products){const s=await shop.readProduct(p.shopifyProductId),row=review.rows.find(r=>r.productId===p.productId),soll=row.request.input;
   const ap=orders.catalogLiveApprovals(p.selections.map(x=>({...x,shopDomain:SHOP})));
   ergebnis.readback.push({gruppe:p.group,shopifyProductId:s.id,handle:s.handle,titel:s.title,status:s.status,publishedAt:s.publishedAt,templateSuffix:s.templateSuffix,varianten:s.variants.nodes.length,variantenIds:s.variants.nodes.map(v=>v.id.split('/').pop()),preise:[...new Set(s.variants.nodes.map(v=>v.price))],preiseWieGeplant:JSON.stringify(s.variants.nodes.map(v=>Number(v.price)).sort())===JSON.stringify(soll.variants.map(v=>Number(v.price)).sort()),titelWieGeplant:s.title===soll.title&&s.handle===soll.handle,customizationId:s.customizationId?.value??null,einstiegGleichCfg:s.customizationId?.value===p.productId,
    preisvertrag:s.pricing?{schema:s.pricing.jsonValue?.schema,revision:s.pricing.jsonValue?.revision,varianten:Object.keys(s.pricing.jsonValue?.variants||{}).length,extraMotifCents:s.pricing.jsonValue?.extraMotifCents??null,extraPhotoCents:s.pricing.jsonValue?.extraPhotoCents??null,extraLogoCents:s.pricing.jsonValue?.extraLogoCents??null,staffel:(s.pricing.jsonValue?.quantityTiers||[]).length,sha256GleichOperator:six.digest(s.pricing.jsonValue)===p.pricingSha256}:null,katalogfreigaben:ap.filter(a=>a?.id===FREIGABE).length});}
  const v=RECONCILE?erst.vorher:ergebnis.vorher,x=ergebnis.nachExecute,o=ergebnis.nachOperator,rb=ergebnis.readback;
  ergebnis.pruefungen={execute_sechs_zielrecords:RECONCILE||(x.produkte-v.produkte===6&&x.bestaetigungen-v.bestaetigungen===6&&x.ausfuehrungen-v.ausfuehrungen===6&&ergebnis.gruppen.every(g=>g.created===true&&g.zielRevision===1&&g.status==='draft'&&g.publishedRevision===null)),operator_6_45:res.products.length===6&&res.variants===45,sechs_shopify_ids_verschieden:new Set(rb.map(r=>r.shopifyProductId)).size===6,alle_draft_unveroeffentlicht_konfi:rb.every(r=>r.status==='DRAFT'&&r.publishedAt===null&&r.templateSuffix==='konfi'),varianten_45_preise_wie_geplant:rb.reduce((m,r)=>m+r.varianten,0)===45&&rb.every(r=>r.preiseWieGeplant&&r.titelWieGeplant),einstieg_gleich_cfg:rb.every(r=>r.einstiegGleichCfg),preisvertrag_je_produkt:rb.every(r=>r.preisvertrag&&r.preisvertrag.varianten===r.varianten&&r.preisvertrag.sha256GleichOperator),
   bindungen_45_mit_vertrag:o.formbindungen-v.formbindungen===45&&o.preisvertraege-v.preisvertraege===45&&o.bindungskoepfe-v.bindungskoepfe===45&&bindOhneVertrag===0,produkte_plus_6_seit_erstlauf:o.produkte-v.produkte===6&&o.bestaetigungen===6&&o.ausfuehrungen===6,katalogfreigaben_plus_6:(o.katalogfreigaben??0)-(v.katalogfreigaben??0)===6,transfers_6:o.transfers===6,katalogfreigaben_45:rb.reduce((m,r)=>m+r.katalogfreigaben,0)===45,creates_wie_erwartet:zaehler.create===(RECONCILE?5:6),kein_fremdes_netz:fremd===0};
  ergebnis.bestanden=Object.values(ergebnis.pruefungen).every(Boolean);
 }
 schritt='abschluss';try{workshop.close();}catch{}workshop=null;
 const text=JSON.stringify(ergebnis,null,1);if(geheim.some(g=>text.includes(g)))throw new Error('Beleg enthielte einen Zugangswert');const beleg=path.join(U,'AUSFUEHRUNG-sechsdraft'+(RECONCILE?'-reconcile-'+ts:'')+'.json');fs.writeFileSync(beleg,text,{flag:'wx',mode:0o600});
 zeige({ordner:ergebnis.ordner,modus:ergebnis.modus,bestanden:ergebnis.bestanden??false,belegSha256:sha(text),belegBytes:Buffer.byteLength(text),operatorFehler:ergebnis.operatorFehler??null,pruefungen:ergebnis.pruefungen?Object.entries(ergebnis.pruefungen).map(([k,w])=>(w?'+':'-')+k).join(' '):null,reviewHash:ergebnis.review.reviewHash,gruppen:ergebnis.gruppen.map(g=>[g.gruppe,g.confirmationId,g.zielProduktId]),shop:(ergebnis.readback||[]).map(r=>[r.shopifyProductId.split('/').pop(),r.status,r.templateSuffix,r.varianten,r.preise.join('/'),r.handle]),zaehler:{vorher:ergebnis.vorher,nachOperator:ergebnis.nachOperator},aufrufe:ergebnis.shopifyAufrufe,phasen:ergebnis.phasen,fehlerProtokoll:ergebnis.fehlerProtokoll});
 if(!ergebnis.bestanden)process.exitCode=1;
}catch(error){try{workshop?.close();}catch{}try{zeige({...ergebnis,schritt,fehler:kurzFehler(error),bestanden:false});}catch{console.log(JSON.stringify({event:'sdl_live',schritt,bestanden:false,fehler:{code:'sdl_ausgabe_gesperrt'}}));}process.exitCode=1;}
