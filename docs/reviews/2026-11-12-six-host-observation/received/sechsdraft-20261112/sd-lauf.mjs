// Sechs neue DRAFTs: privater Kopienanschluss von Astras Operatorpaket ops/issue230-six-draft-execution-20261112
// (Commit 1e1bbc36, Manifest f752b6f1…) mit TATSÄCHLICHEM nativen Gruppen-confirm/execute auf einer WEITEREN Wegwerfkopie
// der Sechsgruppen-Kopie. Die frühere Kopie (Planbeleg, confirm 0 / execute 0) wird nur gelesen und bleibt unverändert.
// Shopify ist vollständig injiziert (synthetischer Transport im Speicher), das Netz ist gesperrt (Netzwächter + fetch-Sperre).
// Die Testzustimmung ist ausdrücklich synthetisch und keine Nutzerfreigabe; es entsteht kein echter Shopify-Entwurf.
//   node sd-lauf.mjs [--quelle=sechsgruppen-JJJJMMTTThhmmssZ]
import './vh-netzwaechter.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,P=process.env.SD_P||path.resolve(hier,'..'),RT=process.env.SD_RT||path.join(P,'kandidat-f85390b-20261112'),BASIS=process.env.SD_BASIS||path.join(P,'sicherungen-db');
const QUELLE=(process.argv.find(a=>a.startsWith('--quelle='))||'--quelle=sechsgruppen-20261112T084929Z').slice(9);
const MANIFEST_SHA='f752b6f13a90ef61db552fd9441ae4167c4abd5cab7da3b56e58cfc563849512',DBS=['workshop.sqlite','design-assets.sqlite','profiles.sqlite'];
const ZUSTIMMUNG='SYNTHETISCHE TEST-Zustimmung (Kopienlauf Claude, keine Nutzerfreigabe)';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function dateiSha(file){const fd=fs.openSync(file,'r'),h=crypto.createHash('sha256'),buf=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null)))h.update(buf.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
const log=e=>console.log(JSON.stringify({event:'sd_lauf',...e}));
const imp=p=>import(pathToFileURL(path.join(RT,p)).href);
const kurzFehler=e=>({code:e?.code??null,status:e?.status??null,message:String(e?.message||e).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,300)});
const copy=v=>structuredClone(v);
let netzVersuche=0;const fetchOriginal=globalThis.fetch;globalThis.fetch=()=>{netzVersuche++;throw new Error('Kein Netz in diesem Kopienlauf');};
const errWrite=process.stderr.write.bind(process.stderr);process.stderr.write=(chunk,...rest)=>{if(String(chunk).includes('vh_netz_blockiert'))netzVersuche++;return errWrite(chunk,...rest);};
let schritt='start',workshop=null;const ergebnis={schema:'gravuru-sechs-draft-kopienanschluss-TESTBELEG/v1',kennzeichnung:'TESTBELEG auf Wegwerfkopie - natives Gruppen-confirm/execute mit synthetischer Testzustimmung, Shopify injiziert, Netz gesperrt; keine Nutzerfreigabe, kein echter Shopify-Entwurf, Kopien-IDs',erstellt:new Date().toISOString(),kandidat:path.basename(RT)};
try{
 if(!/^sechsgruppen-\d{8}T\d{6}Z$/.test(QUELLE))throw new Error('--quelle ungültig.');
 const Q=path.join(BASIS,QUELLE),ts=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',U=path.join(BASIS,'sechsdraft-'+ts),daten=path.join(U,'daten'),bau=path.join(U,'bau'),paket=path.join(U,'paket');
 // 1. Paket (13 gepinnte Dateien) aus der mitgelieferten Sammeldatei entpacken und gegen Astras Manifest prüfen
 schritt='paket';const sammel=JSON.parse(fs.readFileSync(path.join(hier,'sd-paket.json'),'utf8'));
 const manifestBytes=Buffer.from(sammel['manifest.json'],'base64');if(sha(manifestBytes)!==MANIFEST_SHA)throw new Error('Manifest weicht ab.');
 const manifest=JSON.parse(manifestBytes);fs.mkdirSync(U,{mode:0o700});for(const d of [daten,bau,paket])fs.mkdirSync(d,{mode:0o700});
 for(const f of manifest.files){const b=Buffer.from(sammel[f.file],'base64');if(sha(b)!==f.sha256||b.length!==f.bytes)throw new Error('Paketdatei weicht ab: '+f.file);fs.writeFileSync(path.join(paket,f.file),b,{flag:'wx',mode:0o600});}
 fs.writeFileSync(path.join(paket,'manifest.json'),manifestBytes,{flag:'wx',mode:0o600});
 const pins=JSON.parse(fs.readFileSync(path.join(paket,'native-pins.json'),'utf8'));for(const [f,h] of Object.entries(pins))if(sha(fs.readFileSync(path.join(RT,f)))!==h)throw new Error('Nativer Pin weicht ab: '+f);
 ergebnis.paket={commit:'1e1bbc36',manifestSha256:MANIFEST_SHA,dateien:manifest.files.length,nativePins:Object.keys(pins).length,runnerSha256:sha(fs.readFileSync(path.join(hier,'sd-lauf.mjs')))};
 // 2. weitere Kopie der Sechsgruppen-Kopie; Quelle vorher/nachher gehasht
 schritt='kopie';const beleg0=JSON.parse(fs.readFileSync(path.join(Q,'TESTBELEG-sechsgruppen.json'),'utf8')),quelleVorher={};
 const st=fs.statfsSync(BASIS),frei=Number(st.bavail)*Number(st.bsize),bedarf=DBS.reduce((n,f)=>n+fs.statSync(path.join(Q,'daten',f)).size,0);if(frei<bedarf*2)throw new Error('Zu wenig freier Speicher.');
 for(const f of DBS){for(const s of ['-wal','-shm','-journal'])if(fs.existsSync(path.join(Q,'daten',f+s))&&fs.statSync(path.join(Q,'daten',f+s)).size>0)throw new Error('Quelle hat offene Nebendatei: '+f+s);
  quelleVorher[f]=dateiSha(path.join(Q,'daten',f));fs.copyFileSync(path.join(Q,'daten',f),path.join(daten,f),fs.constants.COPYFILE_EXCL);fs.chmodSync(path.join(daten,f),0o600);if(dateiSha(path.join(daten,f))!==quelleVorher[f])throw new Error('Kopie weicht ab: '+f);}
 ergebnis.ordner=path.basename(U);ergebnis.quelle={ordner:QUELLE,testbelegSha256:sha(fs.readFileSync(path.join(Q,'TESTBELEG-sechsgruppen.json'))),dateienVorher:quelleVorher,platz:{bedarfBytes:bedarf,freiBytes:frei}};
 // 3. tatsächliche native Fabrik (createWorkshop wie shopify-admin-test-server.mjs) auf der Kopie
 schritt='bau';delete process.env.GRAVURU_KATALOG_WORKER;const {build}=await imp('app/configurator/variant-m/build.mjs');build({outputDirectory:bau});
 const seed=JSON.parse(fs.readFileSync(path.join(bau,'models.json'),'utf8'))[0];
 schritt='fabrik';const six=await import(pathToFileURL(path.join(paket,'six-drafts.mjs')).href),steps=await import(pathToFileURL(path.join(paket,'shopify-steps.mjs')).href),{openPrivateLog}=await import(pathToFileURL(path.join(paket,'private-log.mjs')).href);
 const {SHOP,TENANT,STORE}=six,[{createWorkshop},{nativeModuleSources},{createShopBindingReadAdapter},{SHOPIFY_IDENTITY}]=await Promise.all(['app/workshop/http.mjs','app/workshop/configurator-module-http.mjs','app/workshop/shop-product-binding-adapter.mjs','app/workshop/shopify-runtime-config.mjs'].map(imp));
 if(SHOPIFY_IDENTITY.shopDomain!==SHOP)throw new Error('Shopidentität des Pakets passt nicht zur Laufzeit.');
 const wFile=path.join(daten,'workshop.sqlite');
 workshop=createWorkshop({filename:wFile,seedConfig:seed.universal,legacy:seed.legacy,shopifySessions:{mode:'test-only',shopDomain:SHOP,clientId:SHOPIFY_IDENTITY.clientId,secret:crypto.randomBytes(32).toString('hex')}});
 if(workshop.tenantId!==TENANT)throw new Error('Mandant der Fabrik ist nicht '+TENANT);
 const repository=workshop.repository,orders=workshop.orderIntake,transferJournal=workshop.customerDrafts.shopDraftTransfers;
 const management=workshop.configureModuleManagement({filename:wFile,sourceRegistry:nativeModuleSources(repository)}),groups=management.groups;
 // derselbe Adapteraufruf wie configurator-integration.mjs:46 für den Acryl-Store
 const adapter=createShopBindingReadAdapter({storeId:STORE,tenantId:workshop.tenantId,shopDomain:SHOP,productionProfileScope:{storeId:STORE,tenantId:workshop.tenantId},workshop});
 const db=new DatabaseSync(wFile,{readOnly:true}),n=(q,...a)=>{try{return db.prepare(q).get(...a)?.n??null;}catch{return null;}};
 const zaehle=()=>({produkte:n('SELECT COUNT(*) AS n FROM products WHERE tenant_id=?',TENANT),revisionen:n('SELECT COUNT(*) AS n FROM product_revisions WHERE tenant_id=?',TENANT),importjournal:n('SELECT COUNT(*) AS n FROM import_items WHERE tenant_id=?',TENANT),plaene:n('SELECT COUNT(*) AS n FROM product_group_creation_plans WHERE tenant_id=?',TENANT),bestaetigungen:n('SELECT COUNT(*) AS n FROM product_group_confirmations WHERE tenant_id=?',TENANT),ausfuehrungen:n('SELECT COUNT(*) AS n FROM product_group_creation_results WHERE tenant_id=?',TENANT),
  formbindungen:n('SELECT COUNT(*) AS n FROM form_shop_bindings WHERE tenant_id=?',TENANT),preisvertraege:n('SELECT COUNT(*) AS n FROM form_shop_binding_personalization WHERE tenant_id=?',TENANT),bindungskoepfe:n('SELECT COUNT(*) AS n FROM shop_product_binding_heads WHERE tenant_id=?',TENANT),bindungsrevisionen:n('SELECT COUNT(*) AS n FROM shop_product_binding_revisions WHERE tenant_id=?',TENANT),katalogfreigaben:n('SELECT COUNT(*) AS n FROM catalog_live_order_approvals'),transfers:n('SELECT COUNT(*) AS n FROM shop_draft_transfers')});
 ergebnis.anschluss={fabrik:'createWorkshop({filename,seedConfig,legacy,shopifySessions:test-only}) aus app/workshop/http.mjs – dieselbe Fabrik wie der Host (shopify-admin-test-server.mjs:23), ohne HTTP-Server, ohne shopDrafts/appProxy/Webhook',repository:'workshop.repository',orders:'workshop.orderIntake',transferJournal:'workshop.customerDrafts.shopDraftTransfers',modulverwaltung:'workshop.configureModuleManagement({filename,sourceRegistry:nativeModuleSources(repository)})',adapter:'createShopBindingReadAdapter({storeId:acryl,tenantId,shopDomain,productionProfileScope,workshop}) wie configurator-integration.mjs:46',tenant:workshop.tenantId,store:STORE,shop:SHOP,sessionContext:workshop.sessionContext?{mode:workshop.sessionContext.mode,shopDomain:workshop.sessionContext.shopDomain}:null,shopify:'injiziert (synthetischer Transport/Client/Reader im Speicher), kein Netz'};
 ergebnis.vorher=zaehle();
 // 4. tatsächliches natives confirm/execute der sechs gespeicherten Pläne
 schritt='execute';const native=await six.loadNativeFunctions(RT),refs=six.loadReferences().groups,entries=[];ergebnis.gruppen=[];
 for(const ref of refs){
  const g0=beleg0.gruppen.find(x=>x.ordner===ref.group);if(!g0)throw new Error('Gruppe fehlt im Planbeleg: '+ref.group);
  const plan=groups.getPlan(g0.plan.id);if(plan.planHash!==g0.plan.planHash)throw new Error('Planhash weicht vom Planbeleg ab: '+ref.group);
  const confirmation=groups.confirm({planId:plan.id,planHash:plan.planHash,accepted:true},{actor:ZUSTIMMUNG}),execution=groups.execute({planId:plan.id,planHash:plan.planHash,confirmationId:confirmation.confirmationId});
  const wiederholt=groups.execute({planId:plan.id,planHash:plan.planHash,confirmationId:confirmation.confirmationId}),record=repository.get(execution.products[0].productId);
  entries.push({group:ref.group,plan,execution,record});
  ergebnis.gruppen.push({gruppe:ref.group,planId:plan.id,planHash:plan.planHash,confirmationId:confirmation.confirmationId,actor:confirmation.actor,zielProduktId:record.id,zielRevision:record.revision,status:record.status,publishedRevision:record.publishedRevision,created:execution.products[0].created,quelleProduktId:g0.quelle.id,zielUngleichQuelle:record.id!==g0.quelle.id,executeWiederholungReplay:wiederholt.replayed===true&&wiederholt.products[0].productId===record.id,localOnly:execution.localOnly,shopifyWrites:execution.shopifyWrites});
 }
 ergebnis.nachExecute=zaehle();
 // 5. Vorbereitung der sechs Requests aus den tatsächlichen Zielrecords
 schritt='prepare';const review=six.prepareSixDrafts(entries,{native});
 ergebnis.review={reviewHash:review.reviewHash,produkte:review.rows.length,varianten:review.rows.reduce((m,r)=>m+r.request.input.variants.length,0),jeGruppe:review.rows.map(r=>({productId:r.productId,handle:r.request.input.handle,status:r.request.input.status,varianten:r.request.input.variants.length,preise:[...new Set(r.request.input.variants.map(v=>v.price))].length,tags:Array.isArray(r.request.input.tags)?r.request.input.tags.length:null,files:r.request.input.files===undefined?null:'vorhanden'}))};
 let manip=null;try{const bad=copy(entries);bad[0].plan.planHash='0'.repeat(64);six.prepareSixDrafts(bad,{native});manip='nicht abgewiesen';}catch(e){manip=e.code||'abgewiesen';}ergebnis.review.planManipulation=manip;
 // 6. injiziertes Shopify (im Speicher), aus Astras Testharness übernommen
 schritt='shopify-injektion';const products=new Map(),events=[],writes=[];let seq=0,loseCreate=true;
 const jsonResponse=data=>Response.json({data},{headers:{'x-shopify-api-version':'2026-07'}});
 const fetchImpl=async(url,opts)=>{const {query,variables}=JSON.parse(opts.body);
  if(query===native.SHOP_DRAFT_CREATE){const input=variables.input;if(input.status!=='DRAFT'||input.id!==undefined||input.files!==undefined)throw new Error('Unerwarteter Create-Request');
   const k=++seq,id='gid://shopify/Product/'+(910000+k),p={id,handle:input.handle,title:input.title,status:'DRAFT',publishedAt:null,templateSuffix:null,tags:copy(input.tags),seo:copy(input.seo),pricing:null,customizationId:null,variants:{pageInfo:{hasNextPage:false},nodes:input.variants.map((v,i)=>({id:'gid://shopify/ProductVariant/'+(920000+k*100+i),price:v.price,selectedOptions:v.optionValues.map(o=>({name:o.optionName,value:o.name}))}))}};
   products.set(id,p);writes.push({kind:'create',id});events.push('created:'+id);if(loseCreate){loseCreate=false;throw new Error('Synthetisch verlorene Antwort nach entfernter Anlage');}
   return jsonResponse({productSet:{product:copy(p),userErrors:[]}});}
  if(query!==native.SHOP_DRAFT_LOOKUP)throw new Error('Unerwartete Transportabfrage');
  const handle=variables.query.match(/^handle:([^ ]+) /)[1];return jsonResponse({shop:{myshopifyDomain:SHOP,currencyCode:'EUR'},products:{nodes:[...products.values()].filter(p=>p.handle===handle).map(copy),pageInfo:{hasNextPage:false}}});};
 const draftTransport=native.createShopDraftTransport({shopDomain:SHOP,apiVersion:'2026-07',accessToken:'synthetic-only-not-a-real-token'},{fetchImpl});
 const client={async graphql(query,variables){
  if(query===steps.READ_PRODUCT){const p=products.get(variables.id);events.push('read:'+variables.id);return {data:{shop:{myshopifyDomain:SHOP,currencyCode:'EUR'},currentAppInstallation:{app:{id:'gid://shopify/App/423276544001'},accessScopes:[{handle:'write_products'}]},product:copy(p)}};}
  if(query===steps.SET_META){if(variables.metafields.length!==1)throw new Error('Unerwartete Metafeldanzahl');const m=variables.metafields[0],p=products.get(m.ownerId);if(p.status!=='DRAFT'||m.compareDigest!==null)throw new Error('Metafeld nur als CAS-Ergänzung am DRAFT');
   if(m.namespace==='$app'){if(m.key!=='personalization'||p.pricing!==null)throw new Error('Preisvertrag unerwartet');p.pricing={jsonValue:JSON.parse(m.value),value:m.value,compareDigest:'pricing-digest'};events.push('pricing:'+p.id);}
   else{if(m.namespace!=='custom'||m.key!=='customization_id'||p.customizationId!==null)throw new Error('Einstiegsmetafeld unerwartet');p.customizationId={value:m.value,compareDigest:'entry-digest'};events.push('entry:'+p.id);}
   writes.push({kind:m.key,id:p.id});return {data:{metafieldsSet:{metafields:[m],userErrors:[]}}};}
  if(query!==steps.SET_TEMPLATE||Object.keys(variables.product).sort().join()!=='id,templateSuffix'||variables.product.templateSuffix!=='konfi')throw new Error('Unerwartete Client-Operation');
  const p=products.get(variables.product.id);if(p.status!=='DRAFT')throw new Error('Template nur am DRAFT');p.templateSuffix='konfi';writes.push({kind:'template',id:p.id});return {data:{productUpdate:{product:copy(p),userErrors:[]}}};}};
 const readonlyReader={async inspectVariants(ids){return {installation:{shopDomain:SHOP,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>{const p=[...products.values()].find(p=>p.variants.nodes.some(v=>v.id===id)),v=p.variants.nodes.find(v=>v.id===id);return {id,found:true,productId:p.id,status:p.status,priceCents:Math.round(Number(v.price)*100),options:copy(v.selectedOptions)};})};}};
 const shop=steps.createSixDraftShopSteps({client,readonlyReader,native});
 // Beobachtung: Preisvertrag muss vor der ersten unveränderlichen Bindung vorhanden und gleich dem gelesenen sein
 const bind=orders.bindVariants;let bindOhneVertrag=0,bindVertragUngleich=0;orders.bindVariants=function(input){if(!input.personalizationPricing)bindOhneVertrag++;else{const p=products.get(input.personalizationPricing.productId);if(!p||JSON.stringify(p.pricing?.jsonValue)!==JSON.stringify(input.personalizationPricing))bindVertragUngleich++;events.push('bind:'+(p?.id||'?'));}return bind.call(this,input);};
 const plog=openPrivateLog(path.join(U,'operator-log.jsonl'));
 const context={native,repository,orders,transferJournal,draftTransport,shop,adapter,principal:{role:'merchant',shopDomain:SHOP,subject:'synthetic-fixture'},approval:{id:'TEST-ONLY-no-user-approval',reviewHash:review.reviewHash},checkpoint:e=>{events.push(e.phase);plog.checkpoint(e);}};
 const versuch=async(extra={})=>{try{return {ok:true,result:await six.executeSixDrafts(review,{...context,...extra})};}catch(e){return {ok:false,fehler:kurzFehler(e)};}};
 const creates=()=>writes.filter(w=>w.kind==='create').length;
 // 7. Ablauf: verlorene Create-Antwort → Stopp, kein blinder Zweitcreate → ausdrückliches reconcile → Replay → Driftfälle
 schritt='operator';const A={};
 let r=await versuch();A.verloreneAntwort={gestoppt:!r.ok,fehler:r.fehler||null,creates:creates(),bindungen:orders.bindings().length-ergebnis.vorher.formbindungen};
 r=await versuch();A.zweiterCreateVersuch={gestoppt:!r.ok,fehler:r.fehler||null,creates:creates()};
 r=await versuch({action:'reconcile'});if(!r.ok)throw Object.assign(new Error('Reconcile fehlgeschlagen: '+r.fehler.message),{code:r.fehler.code});
 const res=r.result;ergebnis.nachOperator=zaehle();
 A.reconcile={produkte:res.products.length,varianten:res.variants,creates:creates(),schreibvorgaenge:writes.reduce((m,w)=>{m[w.kind]=(m[w.kind]||0)+1;return m;},{}),ergebnisSchluessel:Object.keys(res).slice(0,14),produktSchluessel:Object.keys(res.products[0]).slice(0,20)};
 const reihenfolge=[...products.values()].map(p=>({id:p.id,status:p.status,publishedAt:p.publishedAt,templateSuffix:p.templateSuffix,varianten:p.variants.nodes.length,preisvertragVorBindung:events.indexOf('pricing:'+p.id)>=0&&events.indexOf('pricing:'+p.id)<events.indexOf('bind:'+p.id),bindungVorEinstieg:events.indexOf('bind:'+p.id)<events.indexOf('entry:'+p.id),vertrag:p.pricing?{schema:p.pricing.jsonValue.schema,revision:p.pricing.jsonValue.revision,varianten:Object.keys(p.pricing.jsonValue.variants||{}).length,extraMotifCents:p.pricing.jsonValue.extraMotifCents,extraPhotoCents:p.pricing.jsonValue.extraPhotoCents??null,extraLogoCents:p.pricing.jsonValue.extraLogoCents??null,staffel:(p.pricing.jsonValue.quantityTiers||[]).length}:null,customizationId:p.customizationId?.value??null}));
 ergebnis.shopifySynthetisch={produkte:reihenfolge,bindOhneVertrag,bindVertragUngleich,einstiegGleichCfg:reihenfolge.every(p=>ergebnis.gruppen.some(g=>g.zielProduktId===p.customizationId))};
 const vorReplay=writes.length;r=await versuch({action:'reconcile'});A.replay={ok:r.ok,fehler:r.fehler||null,neueSchreibvorgaenge:writes.length-vorReplay,keineNeuenBindungen:r.ok?r.result.products.every(p=>p.bindingsCreated===0&&p.assignmentsChanged===0):null};ergebnis.nachReplay=zaehle();
 const p0=[...products.values()][0],w0=writes.length,preis=p0.variants.nodes[0].price;
 p0.variants.nodes[0].price='0.01';r=await versuch({action:'reconcile'});A.preisdrift={gestoppt:!r.ok,fehler:r.fehler||null};p0.variants.nodes[0].price=preis;
 p0.status='ACTIVE';r=await versuch({action:'reconcile'});A.activeStatus={gestoppt:!r.ok,fehler:r.fehler||null};p0.status='DRAFT';
 const alt=p0.pricing.jsonValue.extraMotifCents;p0.pricing.jsonValue.extraMotifCents=170;r=await versuch({action:'reconcile'});A.vertragskonflikt={gestoppt:!r.ok,fehler:r.fehler||null};p0.pricing.jsonValue.extraMotifCents=alt;
 r=await versuch({principal:{role:'customer',shopDomain:SHOP}});A.ohneHaendlerrolle={gestoppt:!r.ok,fehler:r.fehler||null};
 r=await versuch({approval:{id:'TEST-ONLY-no-user-approval',reviewHash:'0'.repeat(64)}});A.falscherReviewHash={gestoppt:!r.ok,fehler:r.fehler||null};
 A.driftfaelleOhneSchreibvorgang=writes.length===w0;ergebnis.nachDriftfaellen=zaehle();
 const letzter=entries.at(-1).record;repository.save(letzter.id,{...letzter.document,name:letzter.document.name+' (Kopienlauf: Kopfdrift)'},1);r=await versuch();A.kopfdrift={gestoppt:!r.ok,fehler:r.fehler||null,ohneSchreibvorgang:writes.length===w0};
 plog.close();ergebnis.ablauf=A;ergebnis.operatorLog={datei:'operator-log.jsonl',bytes:fs.statSync(path.join(U,'operator-log.jsonl')).size,sha256:dateiSha(path.join(U,'operator-log.jsonl')),phasen:[...new Set(events.filter(e=>!/^(created|read|pricing|bind|entry):/.test(e)))].slice(0,30)};
 // 8. Abschluss
 schritt='abschluss';const v=ergebnis.vorher,x=ergebnis.nachExecute,o=ergebnis.nachOperator,rp=ergebnis.nachReplay;for(const zu of [()=>db.close(),()=>management.close?.(),()=>workshop.close()])try{zu();}catch{}workshop=null;
 ergebnis.quelle.dateienNachherGleich=Object.fromEntries(DBS.map(f=>[f,dateiSha(path.join(Q,'daten',f))===quelleVorher[f]]));
 ergebnis.pruefungen={execute_sechs_neue_zielrecords:x.produkte-v.produkte===6&&x.bestaetigungen-v.bestaetigungen===6&&x.ausfuehrungen-v.ausfuehrungen===6&&ergebnis.gruppen.every(g=>g.created===true&&g.zielRevision===1&&g.status==='draft'&&g.publishedRevision===null&&g.zielUngleichQuelle&&g.executeWiederholungReplay),
  review_6_45:ergebnis.review.produkte===6&&ergebnis.review.varianten===45&&ergebnis.review.planManipulation==='six_drafts_plan',
  verlorene_antwort_stoppt_ohne_bindung:A.verloreneAntwort.gestoppt&&A.verloreneAntwort.creates===1&&A.verloreneAntwort.bindungen===0,kein_blinder_zweitcreate:A.zweiterCreateVersuch.gestoppt&&A.zweiterCreateVersuch.creates===1,
  reconcile_6_drafts_45:A.reconcile.produkte===6&&A.reconcile.varianten===45&&A.reconcile.creates===6&&products.size===6,
  bindungen_45_mit_vertrag:o.formbindungen-v.formbindungen===45&&o.preisvertraege-v.preisvertraege===45&&bindOhneVertrag===0&&bindVertragUngleich===0,id_koepfe_45:o.bindungskoepfe-v.bindungskoepfe===45,katalogfreigaben_6:(o.katalogfreigaben??0)-(v.katalogfreigaben??0)===6,
  vertrag_vor_bindung_vor_einstieg:reihenfolge.every(p=>p.preisvertragVorBindung&&p.bindungVorEinstieg),alle_draft_konfi_unveroeffentlicht:reihenfolge.every(p=>p.status==='DRAFT'&&p.publishedAt===null&&p.templateSuffix==='konfi'),einstieg_gleich_cfg:ergebnis.shopifySynthetisch.einstiegGleichCfg,
  replay_ohne_mutation:A.replay.ok&&A.replay.neueSchreibvorgaenge===0&&A.replay.keineNeuenBindungen===true&&JSON.stringify(rp)===JSON.stringify(o),
  driftfaelle_stoppen_ohne_schreiben:A.preisdrift.gestoppt&&A.activeStatus.gestoppt&&A.vertragskonflikt.gestoppt&&A.ohneHaendlerrolle.gestoppt&&A.falscherReviewHash.gestoppt&&A.driftfaelleOhneSchreibvorgang&&A.kopfdrift.gestoppt&&A.kopfdrift.ohneSchreibvorgang,
  quellkopie_unveraendert:Object.values(ergebnis.quelle.dateienNachherGleich).every(Boolean),kein_netzversuch:netzVersuche===0};ergebnis.netzVersuche=netzVersuche;
 ergebnis.bestanden=Object.values(ergebnis.pruefungen).every(Boolean);
 const beleg=path.join(U,'TESTBELEG-sechsdraft.json');fs.writeFileSync(beleg,JSON.stringify(ergebnis,null,1),{flag:'wx',mode:0o600});ergebnis.belegSha256=dateiSha(beleg);
 const fc=x=>x?.fehler?.code||(x?.gestoppt===false?'NICHT-GESTOPPT':null);
 log({ordner:ergebnis.ordner,bestanden:ergebnis.bestanden,belegSha256:ergebnis.belegSha256,belegBytes:fs.statSync(beleg).size,runnerSha256:ergebnis.paket.runnerSha256,quelle:QUELLE,quelleGleich:ergebnis.pruefungen.quellkopie_unveraendert,pruefungen:Object.entries(ergebnis.pruefungen).map(([k,w])=>(w?'+':'-')+k).join(' '),
  reviewHash:ergebnis.review.reviewHash,operatorLogSha256:ergebnis.operatorLog.sha256,operatorLogBytes:ergebnis.operatorLog.bytes,gruppen:ergebnis.gruppen.map(g=>[g.gruppe,g.planId,g.confirmationId,g.zielProduktId,g.quelleProduktId]),
  zaehler:{vorher:ergebnis.vorher,nachExecute:ergebnis.nachExecute,nachOperator:ergebnis.nachOperator,nachReplayGleich:JSON.stringify(ergebnis.nachReplay)===JSON.stringify(ergebnis.nachOperator),nachDriftGleich:JSON.stringify(ergebnis.nachDriftfaellen)===JSON.stringify(ergebnis.nachOperator)},
  ablauf:{verloren:[fc(A.verloreneAntwort),A.verloreneAntwort.fehler?.status,A.verloreneAntwort.creates,A.verloreneAntwort.bindungen],zweit:[fc(A.zweiterCreateVersuch),A.zweiterCreateVersuch.fehler?.status,A.zweiterCreateVersuch.creates],reconcile:[A.reconcile.produkte,A.reconcile.varianten,A.reconcile.schreibvorgaenge],replay:[A.replay.ok,A.replay.neueSchreibvorgaenge],drift:{preis:fc(A.preisdrift),active:fc(A.activeStatus),vertrag:fc(A.vertragskonflikt),rolle:fc(A.ohneHaendlerrolle),review:fc(A.falscherReviewHash),kopf:fc(A.kopfdrift)}},
  shop:ergebnis.shopifySynthetisch.produkte.map(p=>[p.varianten,p.status,p.templateSuffix,p.vertrag?.varianten,p.vertrag?.extraMotifCents,p.vertrag?.extraPhotoCents,p.vertrag?.extraLogoCents,p.vertrag?.staffel]),platz:ergebnis.quelle.platz});
}catch(error){try{workshop?.close();}catch{}log({...ergebnis,schritt,fehler:kurzFehler(error),bestanden:false});process.exitCode=1;}
finally{globalThis.fetch=fetchOriginal;}
