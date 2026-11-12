// Haupt-Kopienanschluss für Astras Main-Operator v2 (ops/issue230-main-shop-binding-20261112 @ 49912d0, Manifest de182709…).
// Ein vollständiger Anschlusslauf über die tatsächliche CLI-Funktion run() des Pakets mit privater createConnections-Datei:
// plan → (synthetische TEST-Zustimmung) → apply mit verlorener Preis-CAS-Antwort → apply abgewiesen → reconcile shop-pricing
// → apply (8 Blöcke) → finish-catalog → Replay. Native Seite = echte Fabrik auf einer NEUEN Wegwerfkopie der Pilotkopie
// updatepilot-…/a (Main schon R2, alle 808 Bindungen noch R1). Shopify synthetisch, Netz gesperrt, keine Live-Daten.
//   node mo-lauf.mjs [--ordner=mainanschluss-…  (nur zum Fortsetzen einer Kopie, auf der noch nichts geschrieben wurde)]
import './vh-netzwaechter.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,P=process.env.MO_P||path.resolve(hier,'..'),RT=process.env.MO_RT||path.join(P,'kandidat-f85390b-20261112'),BASIS=process.env.MO_BASIS||path.join(P,'sicherungen-db');
const QUELLE=process.env.MO_QUELLE||'updatepilot-20261112T074826Z/a',WIEDER=(process.argv.find(a=>a.startsWith('--ordner='))||'').slice(9);
const MANIFEST_SHA='de182709cb4c004d338f666186cfa2785b755a708605adcf4d58b0c25721f416',DBS=['workshop.sqlite','design-assets.sqlite','profiles.sqlite'];
const PREIS_SHA='37ef02c6f98f6b463179093aca38a715a153141d8281203a158ddbc3e49b0705',CFG='cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0',TENANT='gravuru';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function dateiSha(file){const fd=fs.openSync(file,'r'),h=crypto.createHash('sha256'),buf=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null)))h.update(buf.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
const log=e=>console.log(JSON.stringify({event:'mo_lauf',...e}));
const kurzFehler=e=>({code:e?.code??null,message:String(e?.message||e).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,240),wo:String(e?.stack||'').split('\n').slice(1,4).map(l=>l.trim().replace(/^at /,'').replace(/file:\/\/\S*\/(private|sicherungen-db)\//,'').slice(0,110))});
let netzVersuche=0;const fetchOriginal=globalThis.fetch;globalThis.fetch=()=>{netzVersuche++;throw new Error('Kein Netz in diesem Kopienlauf');};
const errWrite=process.stderr.write.bind(process.stderr);process.stderr.write=(chunk,...rest)=>{if(String(chunk).includes('vh_netz_blockiert'))netzVersuche++;return errWrite(chunk,...rest);};
let schritt='start';const ergebnis={schema:'gravuru-main-kopienanschluss-TESTBELEG/v1',kennzeichnung:'TESTBELEG auf Wegwerfkopie - Main-Operator v2 über privaten createConnections-Anschluss; synthetische TEST-Zustimmung, TEST-Functionbeleg, Shopify synthetisch, Netz gesperrt; keine Nutzerfreigabe, kein produktiver Plan',erstellt:new Date().toISOString(),kandidat:path.basename(RT)};
try{
 const ts=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',Q=path.join(BASIS,QUELLE);
 if(WIEDER&&!/^mainanschluss-\d{8}T\d{6}Z$/.test(WIEDER))throw new Error('--ordner ungültig.');
 const U=path.join(BASIS,WIEDER||'mainanschluss-'+ts),daten=path.join(U,'daten'),bau=path.join(U,'bau'),paket=path.join(U,'paket'),lauf=path.join(U,'lauf-'+ts);
 // 1. Paket prüfen und entpacken
 schritt='paket';const sammel=JSON.parse(fs.readFileSync(path.join(hier,'mo-paket.json'),'utf8')),manifestBytes=Buffer.from(sammel['manifest.json'],'base64');
 if(sha(manifestBytes)!==MANIFEST_SHA)throw new Error('Manifest weicht ab.');const manifest=JSON.parse(manifestBytes);
 for(const f of manifest.files){const b=Buffer.from(sammel[f.path]??'','base64');if(sha(b)!==f.sha256||b.length!==f.bytes)throw new Error('Paketdatei weicht ab: '+f.path);}
 const connSha=sha(fs.readFileSync(path.join(hier,'mo-connections.mjs')));
 ergebnis.paket={commit:'49912d0',manifestSha256:MANIFEST_SHA,dateien:manifest.files.length,runnerSha256:sha(fs.readFileSync(path.join(hier,'mo-lauf.mjs'))),connectionsSha256:connSha};
 if(WIEDER){
  schritt='wiederaufnahme-kopie';if(!fs.existsSync(daten)||fs.existsSync(path.join(U,'journal'))||fs.existsSync(path.join(U,'TESTBELEG-mainanschluss.json')))throw new Error('Kopie nicht fortsetzbar (Journal oder Beleg vorhanden).');
  if(fs.existsSync(path.join(U,'shop-zustand.json'))){const z=JSON.parse(fs.readFileSync(path.join(U,'shop-zustand.json'),'utf8')).zaehler;if(z.variantenBulk||z.metafeld)throw new Error('Kopie nicht fortsetzbar (synthetischer Shop schon geändert).');}
  for(const f of manifest.files)if(sha(fs.readFileSync(path.join(paket,f.path)))!==f.sha256)throw new Error('Paket in der Kopie weicht ab: '+f.path);
  ergebnis.fortgesetzteKopie=true;
 }else{
  fs.mkdirSync(U,{mode:0o700});for(const d of [daten,bau,paket])fs.mkdirSync(d,{mode:0o700});
  for(const f of manifest.files){const z=path.join(paket,f.path);fs.mkdirSync(path.dirname(z),{recursive:true,mode:0o700});fs.writeFileSync(z,Buffer.from(sammel[f.path],'base64'),{flag:'wx',mode:0o600});}
  fs.writeFileSync(path.join(paket,'manifest.json'),manifestBytes,{flag:'wx',mode:0o600});
  // 2. neue Kopie der Pilotkopie a (Quelle nur gelesen, vorher/nachher gehasht)
  schritt='kopie';const st=fs.statfsSync(BASIS),frei=Number(st.bavail)*Number(st.bsize),bedarf=DBS.reduce((n,f)=>n+fs.statSync(path.join(Q,f)).size,0);if(frei<bedarf*2)throw new Error('Zu wenig freier Speicher.');
  const vorher={};for(const f of DBS){for(const s of ['-wal','-shm','-journal'])if(fs.existsSync(path.join(Q,f+s))&&fs.statSync(path.join(Q,f+s)).size>0)throw new Error('Quelle hat offene Nebendatei: '+f+s);
   vorher[f]=dateiSha(path.join(Q,f));fs.copyFileSync(path.join(Q,f),path.join(daten,f),fs.constants.COPYFILE_EXCL);fs.chmodSync(path.join(daten,f),0o600);if(dateiSha(path.join(daten,f))!==vorher[f])throw new Error('Kopie weicht ab: '+f);}
  ergebnis.quelle={ordner:QUELLE,dateienVorher:vorher,platz:{bedarfBytes:bedarf,freiBytes:frei}};
  schritt='bau';const {build}=await import(pathToFileURL(path.join(RT,'app/configurator/variant-m/build.mjs')).href);build({outputDirectory:bau});
 }
 ergebnis.ordner=path.basename(U);fs.mkdirSync(lauf,{mode:0o700});
 // 3. gepinnte native Abhängigkeiten des Pakets gegen den Kandidaten
 schritt='pins';const dep=JSON.parse(fs.readFileSync(path.join(paket,'dependency-pins.json'),'utf8')).files,pp=JSON.parse(fs.readFileSync(path.join(paket,'pricing-pins.json'),'utf8'));
 const abw=[];for(const f of dep)if(!fs.existsSync(path.join(RT,f.path))||sha(fs.readFileSync(path.join(RT,f.path)))!==f.sha256)abw.push(f.path);for(const [f,h] of Object.entries(pp))if(!fs.existsSync(path.join(RT,f))||sha(fs.readFileSync(path.join(RT,f)))!==h)abw.push(f);
 ergebnis.pins={abhaengigkeiten:dep.length,preisfunktionen:Object.keys(pp).length,abweichend:[...new Set(abw)]};if(abw.length)throw Object.assign(new Error('Native Pins weichen ab oder fehlen: '+[...new Set(abw)].join(', ')),{code:'mo_pins'});
 // 4. Zähler direkt aus der Kopie (unabhängig vom Operator)
 const wFile=path.join(daten,'workshop.sqlite');
 const zaehle=()=>{const db=new DatabaseSync(wFile,{readOnly:true});try{const n=(q,...a)=>{try{return db.prepare(q).get(...a)?.n??null;}catch{return null;}};return {revisionen:n('SELECT COUNT(*) AS n FROM product_revisions WHERE tenant_id=?',TENANT),formbindungen:n('SELECT COUNT(*) AS n FROM form_shop_bindings WHERE tenant_id=?',TENANT),mainR1:n('SELECT COUNT(*) AS n FROM form_shop_bindings WHERE tenant_id=? AND product_id=? AND product_revision=1',TENANT,CFG),mainR2:n('SELECT COUNT(*) AS n FROM form_shop_bindings WHERE tenant_id=? AND product_id=? AND product_revision=2',TENANT,CFG),mainR2MitVertrag:n('SELECT COUNT(*) AS n FROM form_shop_bindings b JOIN form_shop_binding_personalization p ON p.binding_id=b.id WHERE b.tenant_id=? AND b.product_id=? AND b.product_revision=2',TENANT,CFG),preisvertraege:n('SELECT COUNT(*) AS n FROM form_shop_binding_personalization'),bindungskoepfe:n('SELECT COUNT(*) AS n FROM shop_product_binding_heads WHERE tenant_id=?',TENANT),bindungsrevisionen:n('SELECT COUNT(*) AS n FROM shop_product_binding_revisions WHERE tenant_id=?',TENANT),katalogfreigaben:n('SELECT COUNT(*) AS n FROM catalog_live_order_approvals')};}finally{db.close();}};
 // 5. Operatoraufrufe über die tatsächliche CLI-Funktion des Pakets
 process.env.MO_ORDNER=U;process.env.MO_RT=RT;
 const {run}=await import(pathToFileURL(path.join(paket,'operator.mjs')).href),{makeExecutionApproval}=await import(pathToFileURL(path.join(paket,'main-operator.mjs')).href);
 const conn=path.join(hier,'mo-connections.mjs'),planFile=path.join(lauf,'plan.json'),approvalFile=path.join(lauf,'approval-TEST.json'),journal=path.join(U,'journal');
 const shopZ=()=>structuredClone(globalThis.__moShopZustand??null),S=[];
 const aufruf=async(name,args)=>{const t=Date.now();let r;try{const out=await run(args);r={name,ok:true,sha256:out.sha256,bytes:out.bytes};}catch(e){r={name,ok:false,fehler:kurzFehler(e)};}r.ms=Date.now()-t;r.shop=shopZ()?.zaehler??null;r.zaehler=zaehle();S.push(r);return r;};
 const voll=(mode,name,extra=[])=>aufruf(name,['--mode',mode,'--connections',conn,'--out',path.join(lauf,name+'.json'),'--plan',planFile,'--approval',approvalFile,'--journal',journal,'--execute','yes',...extra]);
 const lies=name=>JSON.parse(fs.readFileSync(path.join(lauf,name+'.json'),'utf8'));
 ergebnis.vorher=zaehle();
 schritt='plan';const p=await aufruf('plan',['--mode','plan','--connections',conn,'--out',planFile]);if(!p.ok)throw Object.assign(new Error('Plan: '+p.fehler.message),{code:p.fehler.code});
 const plan=JSON.parse(fs.readFileSync(planFile,'utf8')),pr=plan.pricing;
 ergebnis.plan={planHash:plan.planHash,planSha256:p.sha256,planBytes:p.bytes,mutationen:plan.mutations.length,preisAenderungen:plan.mutations.filter(m=>m.price!==undefined).length,labelAenderungen:plan.mutations.filter(m=>m.optionValues!==undefined).length,bloecke:plan.bindingBlocks.map(b=>b.length),baselineBindings:plan.baselineBindings.length,baselineR1:plan.baselineBindings.filter(b=>b.productRevision===1).length,r1Freigabe:plan.baselineR1Approval?.kind,
  preis:{pricingPlanHash:pr.pricingPlanHash,vorherBytes:pr.before?Buffer.byteLength(pr.before.value):null,vorherSha256:pr.before?sha(pr.before.value):null,vorherCompareDigest:pr.before?.compareDigest??null,nachherBytes:Buffer.byteLength(pr.afterValue),nachherSha256:pr.afterSha256,changed:pr.changed,priceRevision:pr.priceRevision,requiredFormats:pr.requiredFormats,historicalContracts:pr.historicalContracts.length,nullHistorical:pr.nullHistoricalContracts,retainedHistorical:pr.retainedHistoricalContracts,expectedContracts:pr.expectedContracts.length,functionReleaseId:pr.functionEvidence.releaseId,beispielNeuerVertrag:pr.expectedContracts[0]?.contract}};
 ergebnis.evidenz={datei:'main-evidence.private.json',sha256:dateiSha(path.join(U,'main-evidence.private.json')),bytes:fs.statSync(path.join(U,'main-evidence.private.json')).size};
 schritt='zustimmung';const approval=makeExecutionApproval(plan,{accepted:true,actor:'SYNTHETISCHE TEST-Zustimmung (Kopienlauf Claude, keine Nutzerfreigabe)',reference:'TEST-ONLY-no-user-approval',acceptedAt:new Date().toISOString(),catalogApprovalId:'TEST-ONLY-mainanschluss-'+ts});
 fs.writeFileSync(approvalFile,JSON.stringify(approval),{flag:'wx',mode:0o600});ergebnis.zustimmung={approvalHash:approval.approvalHash,catalogApprovalId:approval.decision.catalogApprovalId,actor:approval.decision.actor};
 schritt='apply';globalThis.__moFehler={pricingAntwortVerloren:true};
 const a1=await voll('apply','apply-1-verlorene-preisantwort'),a2=await voll('apply','apply-2-ohne-klaerung');
 const jr=()=>fs.readdirSync(journal).filter(n=>/^\d{5}\.json$/.test(n)).sort().map(n=>{const e=JSON.parse(fs.readFileSync(path.join(journal,n),'utf8'));return e.key+'='+e.state+(e.reconciled?'(reconcile)':'');});
 const journalNachVerlust=jr();
 const rc=await voll('reconcile','reconcile-shop-pricing',['--step','shop-pricing']),a3=await voll('apply','apply-3-fortsetzung');
 if(!a3.ok)throw Object.assign(new Error('Apply-Fortsetzung: '+a3.fehler.message),{code:a3.fehler.code});
 const nachApply=zaehle(),quittung=lies('apply-3-fortsetzung');
 schritt='katalog';const k1=await voll('finish-catalog','finish-catalog-1');if(!k1.ok)throw Object.assign(new Error('Katalogabschluss: '+k1.fehler.message),{code:k1.fehler.code});
 const nachKatalog=zaehle(),kq=lies('finish-catalog-1'),shopNachher=shopZ();
 schritt='replay';const a4=await voll('apply','apply-4-replay'),k2=await voll('finish-catalog','finish-catalog-2-replay');const nachReplay=zaehle(),journalEnde=jr();
 // 6. unabhängige Nachprüfung des synthetischen Shopstands gegen das Mapping
 schritt='nachpruefung';const z=JSON.parse(fs.readFileSync(path.join(U,'shop-zustand.json'),'utf8')),{gunzipSync}=await import('node:zlib'),m=JSON.parse(gunzipSync(fs.readFileSync(path.join(paket,'variant-mapping.preview.json.gz')))),by=new Map(z.variants.map(v=>[v.id,v]));
 const c=x=>{const [a,b='']=x.split('.');return Number(a)*100+Number(b.padEnd(2,'0'));},gl=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const shopPruef={varianten:z.variants.length,zielPreisUndLabel:m.matches.filter(r=>{const v=by.get(r.shopifyVariantId);return c(v.price)===r.targetUnitCents&&gl(v.selectedOptions,r.proposedSelectedOptions);}).length,restUnveraendert:m.residualVariants.filter(r=>{const v=by.get(r.id);return v.price===r.price&&gl(v.selectedOptions,r.selectedOptions);}).length,status:z.product.status,preisfeldSha256:sha(z.pricing.value),preisfeldBytes:Buffer.byteLength(z.pricing.value),metafeldIdErhalten:z.pricing.id==='gid://shopify/Metafield/200717188759932',zaehler:z.zaehler};
 const v0=ergebnis.vorher,d=(a,b,k)=>a[k]-b[k];
 ergebnis.aufrufe=S.map(s=>({name:s.name,ok:s.ok,code:s.fehler?.code??null,ms:s.ms,shop:s.shop?[s.shop.variantenBulk,s.shop.metafeld,s.shop.abgelehnt]:null,mainR2:s.zaehler.mainR2,katalog:s.zaehler.katalogfreigaben}));
 ergebnis.ablauf={journalNachVerlust,journalEnde,fehlerAusgeloest:globalThis.__moFehler.ausgeloest??0,reconcile:rc.ok?lies('reconcile-shop-pricing'):rc.fehler,quittung:{schema:quittung.schema,revision2Bindings:quittung.revision2Bindings,revision1BindingsPreserved:quittung.revision1BindingsPreserved,historicalPriceContractsPreserved:quittung.historicalPriceContractsPreserved,priceRevision:quittung.priceRevision,shopifyVariantIdsPreserved:quittung.shopifyVariantIdsPreserved,catalogApprovalPerformed:quittung.catalogApprovalPerformed,published:quittung.published,commerceSha256:quittung.commerceSha256,bindingReadbackSha256:quittung.bindingReadbackSha256},katalog:{schema:kq.schema,revision2Coverage:kq.revision2Coverage,revision1CoveragePreserved:kq.revision1CoveragePreserved,revision1ActiveBindingsPreserved:kq.revision1ActiveBindingsPreserved,published:kq.published,shopifyWrites:kq.shopifyWrites}};
 ergebnis.zaehler={vorher:v0,nachApply,nachKatalog,nachReplay};ergebnis.shop=shopPruef;ergebnis.anschlussProtokoll=globalThis.__moProtokoll??[];ergebnis.netzVersuche=netzVersuche;
 if(ergebnis.quelle)ergebnis.quelle.dateienNachherGleich=Object.fromEntries(DBS.map(f=>[f,dateiSha(path.join(Q,f))===ergebnis.quelle.dateienVorher[f]]));
 const pk=ergebnis.anschlussProtokoll,ro=pk.filter(e=>e.readOnly),rw=pk.filter(e=>!e.readOnly);
 ergebnis.pruefungen={plan_182_158_30:ergebnis.plan.mutationen===182&&ergebnis.plan.preisAenderungen===158&&ergebnis.plan.labelAenderungen===30,plan_8_bloecke_778:gl(ergebnis.plan.bloecke,[100,100,100,100,100,100,100,78]),plan_808_r1_bindungen:ergebnis.plan.baselineBindings===808&&ergebnis.plan.baselineR1===808&&v0.mainR1===808&&v0.mainR2===0,
  preisvorschlag_3898_gepinnt:pr.afterSha256===PREIS_SHA&&ergebnis.plan.preis.nachherBytes===3898&&pr.priceRevision===2&&pr.changed===true,preis_808_alt_778_neu:pr.historicalContracts.length===808&&pr.nullHistoricalContracts===0&&pr.expectedContracts.length===778,
  verlorene_preisantwort_stoppt:!a1.ok&&journalNachVerlust.join()==='shop-variants=started,shop-variants=done,shop-pricing=started'&&a1.zaehler.mainR2===0&&a1.shop.variantenBulk===1&&a1.shop.metafeld===1,
  ohne_klaerung_abgewiesen:!a2.ok&&a2.fehler.code==='reconcile_required'&&a2.shop.variantenBulk===1&&a2.shop.metafeld===1&&a2.zaehler.mainR2===0,reconcile_nur_lesend_done:rc.ok&&ergebnis.ablauf.reconcile.state==='done'&&ergebnis.ablauf.reconcile.shopifyWrites===0&&rc.shop.metafeld===1&&rc.zaehler.mainR2===0,
  fortsetzung_778_r2_30_r1:quittung.revision2Bindings===778&&quittung.revision1BindingsPreserved===30&&quittung.historicalPriceContractsPreserved===808&&nachApply.mainR2===778&&nachApply.mainR2MitVertrag===778&&nachApply.mainR1===808,
  zaehler_plus_778:d(nachApply,v0,'formbindungen')===778&&d(nachApply,v0,'preisvertraege')===778&&d(nachApply,v0,'bindungsrevisionen')===778&&d(nachApply,v0,'bindungskoepfe')===0&&d(nachApply,v0,'katalogfreigaben')===0&&d(nachApply,v0,'revisionen')===0,
  genau_ein_bulk_ein_cas:shopPruef.zaehler.variantenBulk===1&&shopPruef.zaehler.metafeld===1&&shopPruef.zaehler.abgelehnt===0&&shopPruef.zaehler.variantenGeaendert===182,shop_ziel_778_rest_30:shopPruef.varianten===808&&shopPruef.zielPreisUndLabel===778&&shopPruef.restUnveraendert===30&&shopPruef.status==='DRAFT',preisfeld_im_shop:shopPruef.preisfeldSha256===PREIS_SHA&&shopPruef.preisfeldBytes===3898&&shopPruef.metafeldIdErhalten,
  katalog_778_r2_r1_erhalten:kq.revision2Coverage===778&&kq.revision1CoveragePreserved===808&&kq.revision1ActiveBindingsPreserved===30&&kq.published===false&&nachKatalog.mainR2===778,
  replay_ohne_mutation:a4.ok&&k2.ok&&gl(nachReplay,nachKatalog)&&a4.shop.variantenBulk===1&&a4.shop.metafeld===1&&k2.shop.variantenBulk===1&&k2.shop.metafeld===1&&journalEnde.length===2+2+16+2,
  journal_vollstaendig:journalEnde.filter(e=>e.endsWith('=done')||e.endsWith('=done(reconcile)')).length===11&&journalEnde.includes('shop-pricing=done(reconcile)')&&journalEnde.at(-1)==='catalog-main-r2=done',
  readonly_ohne_preisprovider_und_checker:ro.length===2&&ro.every(e=>e.idBindingsMitPreisprovider===0&&e.checker===0&&!e.nativeMethoden.includes('persist')&&!e.nativeMethoden.includes('approveCatalog')),schreibend_genau_ein_gepreister_store:rw.length===6&&rw.every(e=>e.idBindingsMitPreisprovider===1&&e.idBindingsOhnePreisprovider===0&&e.checker===1),
  quellkopie_unveraendert:ergebnis.quelle?Object.values(ergebnis.quelle.dateienNachherGleich).every(Boolean):null,kein_netzversuch:netzVersuche===0};
 ergebnis.bestanden=Object.values(ergebnis.pruefungen).every(w=>w===true||w===null);
 const beleg=path.join(U,'TESTBELEG-mainanschluss.json');fs.writeFileSync(beleg,JSON.stringify(ergebnis,null,1),{flag:'wx',mode:0o600});ergebnis.belegSha256=dateiSha(beleg);
 const P_=ergebnis.plan,x=k=>{const o={...ergebnis[k]};return o;};
 log({ordner:ergebnis.ordner,lauf:path.basename(lauf),bestanden:ergebnis.bestanden,belegSha256:ergebnis.belegSha256,belegBytes:fs.statSync(beleg).size,runnerSha256:ergebnis.paket.runnerSha256,connectionsSha256:connSha,pruefungen:Object.entries(ergebnis.pruefungen).map(([k,w])=>(w===true?'+':w===null?'~':'-')+k).join(' '),
  plan:{planHash:P_.planHash,planSha256:P_.planSha256,planBytes:P_.planBytes,pricingPlanHash:P_.preis.pricingPlanHash,vorher:[P_.preis.vorherBytes,P_.preis.vorherCompareDigest],nachher:[P_.preis.nachherBytes,P_.preis.nachherSha256],formate:P_.preis.requiredFormats.join(','),beispiel:P_.preis.beispielNeuerVertrag},
  zustimmung:x('zustimmung'),evidenz:x('evidenz'),aufrufe:ergebnis.aufrufe,journalNachVerlust,journalEnde:journalEnde.join(' '),quittung:ergebnis.ablauf.quittung,katalog:ergebnis.ablauf.katalog,zaehler:ergebnis.zaehler,shop:shopPruef,protokoll:pk.map(e=>[e.mode,e.idBindingsOhnePreisprovider,e.idBindingsMitPreisprovider,e.checker,e.evidenzNeuGelesen]),platz:ergebnis.quelle?.platz??null,netzVersuche});
}catch(error){log({...ergebnis,schritt,fehler:kurzFehler(error),aufrufeBisher:(globalThis.__moProtokoll??[]).length,bestanden:false});process.exitCode=1;}
finally{globalThis.fetch=fetchOriginal;}
