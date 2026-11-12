// AUSFÜHRUNG AUF DEN TATSÄCHLICHEN DATEN (Freigabe #168 6829898414 „Ja, Gesamtpaket ausführen“, Umfang f26ada8):
// Astras unveränderter Main-Operator v2 (Manifest de182709…) über die private Anschlussdatei ml-connections.mjs.
//   node ml-lauf.mjs --stufe=plan                                   -> NUR LESEND: R2-Plan erzeugen und gegen die festen Pins prüfen
//   node ml-lauf.mjs --stufe=apply --ordner=mainlive-…             -> Zustimmung binden, apply (1 Variantenupdate, 1 Preis-CAS, 8 Blöcke),
//                                                                      finish-catalog, vollständiger Readback. Hält beim ersten Fehler an.
//   node ml-lauf.mjs --stufe=reconcile --ordner=… --step=<Schlüssel> -> NUR LESEND bei Shopify/Bindungen: unklaren Schritt klären (Journal)
//   node ml-lauf.mjs --stufe=readback --ordner=…                    -> NUR LESEND: vollständiger Readback
// Keine automatische Wiederholung einer Mutation. Voraussetzung: natives Update (Kopf R2) ist erfolgt.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {isDeepStrictEqual as gleich} from 'node:util';
import {pathToFileURL,fileURLToPath} from 'node:url';
const hier=import.meta.dirname,P=fs.realpathSync(process.env.ML_P||path.resolve(hier,'..')),RT=process.env.ML_RT||path.join(P,'kandidat-f85390b-20261112'),BASIS=path.join(P,'sicherungen-db'),LIVE=path.join(P,'acryl-employee-20261021-v1','data');
const PAKET=path.join(BASIS,'mainanschluss-20261112T105018Z','paket'),ROP=path.join(BASIS,'readonly-ausgang-20261112T160607Z','ro-paket'),READER=path.join(BASIS,'functioncallback-20261112T163355Z','reader');
const OP_MANIFEST='de182709cb4c004d338f666186cfa2785b755a708605adcf4d58b0c25721f416',RO_MANIFEST='5eea1f5815f93689b2cd6f0a2b0b54895c90e4b13b3f2e4208818f15e9168d01',READER_MANIFEST='2a4ddc33fa888c458312ee0d9d0623b082c7dad72bdeb3fcfaf7488379a57d83';
const PREIS_SHA='37ef02c6f98f6b463179093aca38a715a153141d8281203a158ddbc3e49b0705',PREIS_ALT_SHA='7c997f49153d43a937a75501ed5bc016eda1003e129d1735528b801ee7962cf5',PREIS_ALT_DIGEST='66b0aa6d8ab008aa31bc3ab39cec8d10760061bab055c3d990e74b882ed6500d',METAFELD='gid://shopify/Metafield/200717188759932';
const VERTRAEGE_R1_SHA='1fe75355a43c448c25d7800bfb63c9b0e8cb82dbee5d5ee6ae8649d6acd86da1',R1_FREIGABE='chris-issue139-pr156-two-draft-previews',VERSION='gid://shopify/Version/1199363391489',WASM='a5c59354755dcf73bdeca8006134847549d8712f70277634fab405db93532da2',BUILD='5977e9d9a510223d55f2f6635910aa7af97fcd300eaeec6480a56d921129f1a7';
const FORMATE=['history','v2','valueInput','variantDeltas','variantSequence','variantsFromRevision'],CFG='cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0',TENANT='gravuru';
// Tatsächliche Zustimmung: wörtliche Nutzerantwort „Ja, Gesamtpaket ausführen“, von Astra übermittelt und in #168 dokumentiert
const ENTSCHEIDUNG={accepted:true,actor:'Chris (Nutzer, gravuru GmbH); ausgefuehrt durch Claude',reference:'GitHub Chris83638w/gravuru-2027 Issue 168 Kommentar 6829898414: woertliche Nutzerantwort "Ja, Gesamtpaket ausfuehren" auf die gemeinsame Ausfuehrungsfrage, Umfang f26ada8',acceptedAt:'2026-11-12T16:46:42Z',catalogApprovalId:'chris-168-6829898414-gesamtpaket'};
const arg=n=>(process.argv.find(a=>a.startsWith('--'+n+'='))||'').slice(n.length+3);
const STUFE=arg('stufe'),ORDNER=arg('ordner'),STEP=arg('step');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function dateiSha(file){const fd=fs.openSync(file,'r'),h=crypto.createHash('sha256'),buf=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null)))h.update(buf.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
const geheim=globalThis.__mlGeheim??=[],protokoll=globalThis.__mlProtokoll??=[];
const sauber=s=>{let t=String(s);for(const g of geheim)if(g)t=t.replaceAll(g,'[entfernt]');return t.replace(/\/var\/www\/vhosts\/[^/]+/g,'~');};
const kurzFehler=e=>({code:e?.code??null,message:sauber(e?.message||e).slice(0,260),wo:String(e?.stack||'').split('\n').slice(1,4).map(l=>sauber(l.trim().replace(/^at /,'').replace(/file:\/\/\S*\/(private|sicherungen-db)\//,'')).slice(0,110))});
const zeige=o=>{const t=JSON.stringify({event:'ml_lauf',...o});if(geheim.some(g=>g&&t.includes(g)))throw new Error('Ausgabe enthielte einen Zugangswert');console.log(t);};
const schreibe=(file,o)=>{const t=JSON.stringify(o,null,1);if(geheim.some(g=>g&&t.includes(g)))throw new Error('Beleg enthielte einen Zugangswert');fs.writeFileSync(file,t,{flag:'wx',mode:0o600});return {datei:path.basename(file),bytes:Buffer.byteLength(t),sha256:sha(t)};};
process.umask(0o077);
let schritt='start';const zeit=new Date().toISOString(),ts=zeit.replace(/[-:]/g,'').slice(0,15)+'Z';
const ergebnis={schema:'gravuru-main-ausfuehrung/v1',stufe:STUFE,erstellt:zeit,kandidat:path.basename(RT)};
const wFile=path.join(LIVE,'workshop.sqlite');
const zaehle=()=>{const db=new DatabaseSync(wFile,{readOnly:true});try{const n=(q,...a)=>{try{return db.prepare(q).get(...a)?.n??null;}catch{return null;}};return {produkte:n('SELECT COUNT(*) AS n FROM products WHERE tenant_id=?',TENANT),revisionen:n('SELECT COUNT(*) AS n FROM product_revisions WHERE tenant_id=?',TENANT),kopf:n('SELECT revision AS n FROM products WHERE tenant_id=? AND id=?',TENANT,CFG),formbindungen:n('SELECT COUNT(*) AS n FROM form_shop_bindings WHERE tenant_id=?',TENANT),mainR1:n('SELECT COUNT(*) AS n FROM form_shop_bindings WHERE tenant_id=? AND product_id=? AND product_revision=1',TENANT,CFG),mainR2:n('SELECT COUNT(*) AS n FROM form_shop_bindings WHERE tenant_id=? AND product_id=? AND product_revision=2',TENANT,CFG),mainR2MitVertrag:n('SELECT COUNT(*) AS n FROM form_shop_bindings b JOIN form_shop_binding_personalization p ON p.binding_id=b.id WHERE b.tenant_id=? AND b.product_id=? AND b.product_revision=2',TENANT,CFG),preisvertraege:n('SELECT COUNT(*) AS n FROM form_shop_binding_personalization'),bindungskoepfe:n('SELECT COUNT(*) AS n FROM shop_product_binding_heads WHERE tenant_id=?',TENANT),bindungsrevisionen:n('SELECT COUNT(*) AS n FROM shop_product_binding_revisions WHERE tenant_id=?',TENANT),katalogfreigaben:n('SELECT COUNT(*) AS n FROM catalog_live_order_approvals')};}finally{db.close();}};
const kompaktProtokoll=()=>protokoll.map(e=>({mode:e.mode,readOnly:e.readOnly,evidenzNeu:e.evidenzNeuGelesen,preisprovider:e.idBindingsMitPreisprovider,checker:e.checker,methoden:e.nativeMethoden??null,canWrite:e.canWrite??null,lesen:e.shop?.lesen??null,mutationen:e.shop?.mutationen??null,fremd:e.shop?.fremd??null,gedrosselt:e.shop?.gedrosselt??null,drossel:e.shop?.drossel??null,kostenMax:e.shop?.kosten?.length?Math.max(...e.shop.kosten.map(k=>k[1]??0)):null,fehler:e.shop?.fehler??[],function:e.functionLesungen.map(l=>({exit:l.exit??null,code:l.code??null,observedAt:l.observedAt??null,versionId:l.versionId??null,sha256:l.sha256??null}))}));
try{
 if(!['plan','apply','reconcile','readback'].includes(STUFE))throw new Error('--stufe=plan|apply|reconcile|readback erforderlich.');
 // 1. Pakete und Pins (alle drei Astra-Pakete unverändert aus den bereits geprüften Entpackordnern)
 schritt='pakete';
 const pruefePaket=(dir,manifestSha,name)=>{const mb=fs.readFileSync(path.join(dir,'manifest.json'));if(sha(mb)!==manifestSha)throw new Error(name+'-Manifest weicht ab.');const man=JSON.parse(mb);for(const f of man.files){const p=f.path??f.file;if(sha(fs.readFileSync(path.join(dir,p)))!==f.sha256)throw new Error(name+'-Datei weicht ab: '+p);}return man.files.length;};
 const conn=path.join(hier,'ml-connections.mjs');
 ergebnis.pakete={operator:[OP_MANIFEST,pruefePaket(PAKET,OP_MANIFEST,'Operator')],readonly:[RO_MANIFEST,pruefePaket(ROP,RO_MANIFEST,'Readonly')],reader:[READER_MANIFEST,pruefePaket(READER,READER_MANIFEST,'Reader')],runnerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),connectionsSha256:sha(fs.readFileSync(conn)),callbackSha256:sha(fs.readFileSync(path.join(hier,'fr-callback.mjs')))};
 schritt='pins';const dep=JSON.parse(fs.readFileSync(path.join(PAKET,'dependency-pins.json'),'utf8')).files,pp=JSON.parse(fs.readFileSync(path.join(PAKET,'pricing-pins.json'),'utf8')),abw=[];
 for(const f of dep)if(!fs.existsSync(path.join(RT,f.path))||sha(fs.readFileSync(path.join(RT,f.path)))!==f.sha256)abw.push(f.path);for(const [f,h] of Object.entries(pp))if(!fs.existsSync(path.join(RT,f))||sha(fs.readFileSync(path.join(RT,f)))!==h)abw.push(f);
 ergebnis.pins={abhaengigkeiten:dep.length,preisfunktionen:Object.keys(pp).length,abweichend:[...new Set(abw)]};if(abw.length)throw Object.assign(new Error('Native Pins weichen ab: '+[...new Set(abw)].join(', ')),{code:'ml_pins'});
 // 2. Ordner
 schritt='ordner';let U;
 if(STUFE==='plan'){if(ORDNER)throw new Error('plan legt einen neuen Ordner an.');U=path.join(BASIS,'mainlive-'+ts);fs.mkdirSync(U,{mode:0o700});fs.mkdirSync(path.join(U,'bau'),{mode:0o700});const {build}=await import(pathToFileURL(path.join(RT,'app/configurator/variant-m/build.mjs')).href);build({outputDirectory:path.join(U,'bau')});}
 else{if(!/^mainlive-\d{8}T\d{6}Z$/.test(ORDNER))throw new Error('--ordner=mainlive-… erforderlich.');U=path.join(BASIS,ORDNER);if(!fs.statSync(U).isDirectory())throw new Error('Ordner fehlt.');}
 const lauf=path.join(U,'lauf-'+STUFE+'-'+ts);fs.mkdirSync(lauf,{mode:0o700});ergebnis.ordner=path.basename(U);ergebnis.lauf=path.basename(lauf);
 const planFile=path.join(U,'plan.json'),planBeleg=path.join(U,'PLANBELEG.json'),approvalFile=path.join(U,'approval.json'),journal=path.join(U,'journal'),evidenzFile=path.join(U,'main-evidence.private.json');
 process.env.ML_ORDNER=U;process.env.ML_P=P;process.env.ML_RT=RT;
 const op=await import(pathToFileURL(path.join(PAKET,'main-operator.mjs')).href),g=await import(pathToFileURL(path.join(PAKET,'gateways.mjs')).href),{run}=await import(pathToFileURL(path.join(PAKET,'operator.mjs')).href);
 const {POLICY,loadPinnedMapping,makeExecutionApproval,bindingView,digest,commerce}=op,mapping=loadPinnedMapping(path.join(PAKET,'variant-mapping.preview.json.gz')),ids=[...mapping.matches,...mapping.residual].map(v=>v.id).sort();
 const S=[];
 const aufruf=async(name,args)=>{const t=Date.now();let r;try{const out=await run(args);r={name,ok:true,sha256:out.sha256,bytes:out.bytes};}catch(e){r={name,ok:false,fehler:kurzFehler(e)};}r.ms=Date.now()-t;r.zaehler=zaehle();S.push(r);return r;};
 const voll=(mode,name,extra=[])=>aufruf(name,['--mode',mode,'--connections',conn,'--out',path.join(lauf,name+'.json'),'--plan',planFile,'--approval',approvalFile,'--journal',journal,'--execute','yes',...extra]);
 const lies=name=>JSON.parse(fs.readFileSync(path.join(lauf,name+'.json'),'utf8'));
 const jr=()=>fs.existsSync(journal)?fs.readdirSync(journal).filter(n=>/^\d{5}\.json$/.test(n)).sort().map(n=>{const e=JSON.parse(fs.readFileSync(path.join(journal,n),'utf8'));return e.key+'='+e.state+(e.reconciled?'(reconcile)':'');}):[];
 const sperre=()=>fs.existsSync(path.join(journal,'.lock'));
 const hist=rows=>[...rows].sort((a,b)=>a.shopifyVariantId.localeCompare(b.shopifyVariantId));
 ergebnis.vorher=zaehle();
 if(ergebnis.vorher.kopf!==2)throw Object.assign(new Error('Natives Hauptprodukt steht nicht auf Revision 2.'),{code:'ml_kopf_nicht_r2'});

 // ---- vollständiger Readback, NUR LESEND (eigener Lesetransport, Astras Readonly-Anschluss)
 async function readback(plan,approval){
  const c=await import(pathToFileURL(conn).href),ro=await import(pathToFileURL(path.join(RT,'app/workshop/shopify-admin-readonly.mjs')).href);
  const z=await c.shopZugang({P,identity:ro.ADMIN_READONLY_IDENTITY}),shopify=g.createMainShopifyGateway({graphqlRead:z.graphqlRead});
  const snap=await shopify.inspect(),now=commerce(snap),sv=new Map(now.variants.map(v=>[v.id,v])),alt=new Map(plan.baselineCommerce.variants.map(v=>[v.id,v])),pf=await shopify.readPricing();
  const geaendert=now.variants.filter(v=>{const a=alt.get(v.id);return !a||a.priceCents!==v.priceCents||!gleich(a.selectedOptions,v.selectedOptions);}),{personalization:pNeu,...schutzNeu}=now.protectedProduct,{personalization:pAlt,...schutzAlt}=plan.baselineCommerce.protectedProduct;
  const shop={status:snap.status,varianten:snap.variants.length,updatedAt:snap.updatedAt,idsGleichMapping:gleich([...sv.keys()].sort(),ids),zielPreisUndLabel:mapping.matches.filter(m=>{const v=sv.get(m.id);return v&&v.priceCents===m.afterCents&&gleich(v.selectedOptions,m.afterOptions)&&v.protectedVariant.sku===m.sku;}).length,restUnveraendert:mapping.residual.filter(m=>{const v=sv.get(m.id);return v&&v.priceCents===m.cents&&gleich(v.selectedOptions,m.options)&&v.protectedVariant.sku===m.sku;}).length,
   geaenderteVarianten:geaendert.length,geaendertPreis:geaendert.filter(v=>alt.get(v.id)?.priceCents!==v.priceCents).length,geaendertLabel:geaendert.filter(v=>!gleich(alt.get(v.id)?.selectedOptions,v.selectedOptions)).length,schutzfelderVariantenGleich:now.variants.every(v=>gleich(alt.get(v.id)?.protectedVariant,v.protectedVariant)),
   produktfelderUnveraendert:gleich(schutzNeu,schutzAlt),optionenDefinitionGleich:gleich(now.optionDefinitions,plan.baselineCommerce.optionDefinitions),titel:now.protectedProduct.title,handle:now.protectedProduct.handle,templateSuffix:now.protectedProduct.templateSuffix,customizationId:now.protectedProduct.customization?.value??null,
   gleichPlanZiel:gleich(now,plan.targetPricingCommerce),gleichPlanZwischenstand:gleich(now,plan.targetCommerce),gleichPlanAusgang:gleich(now,plan.baselineCommerce),commerceSha256:digest(now),
   preisfeld:pf?{id:pf.id,namespace:pf.namespace,key:pf.key,type:pf.type,bytes:Buffer.byteLength(pf.value),sha256:sha(pf.value),compareDigest:pf.compareDigest,imProduktlesenGleich:pNeu?.value===pf.value}:null,leseabfragen:z.eintrag.lesen,mutationen:z.eintrag.mutationen,fremd:z.eintrag.fremd,fehler:z.eintrag.fehler};
  const {createMainProductionReadonlyAdapterFactory}=await import(pathToFileURL(path.join(ROP,'adapter-factory.mjs')).href);
  const factory=await createMainProductionReadonlyAdapterFactory({codeRoot:RT,operatorRoot:PAKET,workshopFilename:fs.realpathSync(wFile),profilesFilename:fs.realpathSync(path.join(LIVE,'profiles.sqlite'))}),target=await factory({readOnly:true,mode:'reconcile'});
  let nativ;
  try{
   const rec=await target.native.inspect(),rows=(await target.native.resolveMany(ids.map(id=>({shopifyProductId:POLICY.shopifyProductId,shopifyVariantId:id})))).map(bindingView),by=new Map(rows.map(r=>[r.shopifyVariantId,r])),altB=new Map(plan.baselineBindings.map(b=>[b.shopifyVariantId,b]));
   const zielIds=mapping.matches.map(m=>m.id),restIds=mapping.residual.map(m=>m.id),k1=await target.native.catalogApprovals(1,ids),k2=await target.native.catalogApprovals(2,ids),k2by=new Map(ids.map((id,i)=>[id,k2[i]]));
   const ev=JSON.parse(fs.readFileSync(evidenzFile,'utf8')),histJetzt=hist(ev.historicalContracts.map(h=>({bindingId:h.bindingId,shopifyVariantId:h.shopifyVariantId,contract:target.workshop.orderIntake.bindingPricing(h.bindingId)})));
   const neu=zielIds.map(id=>by.get(id)).filter(r=>r?.productRevision===2).map(r=>({shopifyVariantId:r.shopifyVariantId,contract:target.workshop.orderIntake.bindingPricing(r.bindingId)})),erwartet=new Map(plan.pricing.expectedContracts.map(r=>[r.shopifyVariantId,r.contract]));
   nativ={kopf:{revision:rec.revision,status:rec.status,documentSha256:rec.documentSha256,metadataSha256:rec.metadataSha256},bindungen:rows.length,eindeutig:by.size,
    zielR2:mapping.matches.filter(m=>{const b=by.get(m.id),a=altB.get(m.id);return b&&a&&b.productRevision===2&&b.documentSha256===POLICY.targetDocumentSha256&&b.assignmentRevision===a.assignmentRevision+1&&b.unitCents===m.afterCents&&gleich(b.options,m.options);}).length,zielNochR1Unveraendert:mapping.matches.filter(m=>gleich(by.get(m.id),altB.get(m.id))).length,
    restR1Unveraendert:restIds.filter(id=>gleich(by.get(id),altB.get(id))).length,bindungenSha256:digest(hist(rows)),
    katalogR1:{anzahl:k1.filter(Boolean).length,alleWieVorher:k1.every(r=>gleich(r,plan.baselineR1Approval))},katalogR2:{ziel:zielIds.filter(id=>{const r=k2by.get(id);return r?.kind==='catalog'&&r.id===approval?.decision?.catalogApprovalId;}).length,rest:restIds.filter(id=>k2by.get(id)!==null).length,gesamt:k2.filter(Boolean).length,id:k2.find(Boolean)?.id??null,approvedAt:k2.find(Boolean)?.approvedAt??null},
    historischeVertraege:{anzahl:histJetzt.length,gleichEvidenz:gleich(histJetzt,hist(ev.historicalContracts)),sha256:digest(histJetzt),nullVertraege:histJetzt.filter(h=>h.contract===null).length},neueVertraege:{anzahl:neu.length,nullVertraege:neu.filter(n=>n.contract===null).length,wieGeplant:neu.filter(n=>erwartet.has(n.shopifyVariantId)&&gleich(n.contract,erwartet.get(n.shopifyVariantId))).length,beispiel:neu[0]?.contract??null}};
  }finally{target.close();}
  return {shop,nativ,zaehler:zaehle(),journal:jr(),sperreOffen:sperre()};
 }
 const readbackGruen=(rb,v0)=>{const s=rb.shop,n=rb.nativ,z=rb.zaehler;return {
  shop_808_ids_draft:s.status==='DRAFT'&&s.varianten===808&&s.idsGleichMapping,shop_778_ziel_30_rest:s.zielPreisUndLabel===778&&s.restUnveraendert===30,shop_182_geaendert_158_preis_30_label:s.geaenderteVarianten===182&&s.geaendertPreis===158&&s.geaendertLabel===30,
  shop_sonst_unveraendert:s.produktfelderUnveraendert&&s.optionenDefinitionGleich&&s.schutzfelderVariantenGleich&&s.gleichPlanZiel,preisfeld_3898_gepinnt:s.preisfeld?.sha256===PREIS_SHA&&s.preisfeld.bytes===3898&&s.preisfeld.id===METAFELD&&s.preisfeld.imProduktlesenGleich===true,
  nativ_kopf_r2:n.kopf.revision===2&&n.kopf.status==='draft'&&n.kopf.documentSha256===POLICY.targetDocumentSha256&&n.kopf.metadataSha256===POLICY.targetMetadataSha256,bindungen_778_r2_30_r1:n.bindungen===808&&n.eindeutig===808&&n.zielR2===778&&n.restR1Unveraendert===30&&z.mainR2===778&&z.mainR2MitVertrag===778&&z.mainR1===808,
  historische_808_vertraege_unveraendert:n.historischeVertraege.anzahl===808&&n.historischeVertraege.gleichEvidenz&&n.historischeVertraege.sha256===VERTRAEGE_R1_SHA&&n.historischeVertraege.nullVertraege===0,neue_778_vertraege_wie_geplant:n.neueVertraege.anzahl===778&&n.neueVertraege.nullVertraege===0&&n.neueVertraege.wieGeplant===778,
  katalog_778_r2_808_r1:n.katalogR2.ziel===778&&n.katalogR2.rest===0&&n.katalogR2.gesamt===778&&n.katalogR1.anzahl===808&&n.katalogR1.alleWieVorher,
  zaehler_plus_778_plus_1:v0?z.formbindungen-v0.formbindungen===778&&z.preisvertraege-v0.preisvertraege===778&&z.bindungsrevisionen-v0.bindungsrevisionen===778&&z.bindungskoepfe===v0.bindungskoepfe&&z.katalogfreigaben-v0.katalogfreigaben===1&&z.revisionen===v0.revisionen&&z.produkte===v0.produkte:null,
  journal_vollstaendig:rb.journal.filter(e=>/=done(\(reconcile\))?$/.test(e)).length===11&&rb.journal.at(-1)==='catalog-main-r2=done'&&!rb.sperreOffen,readback_nur_gelesen:s.mutationen===0&&s.fremd===0};};

 if(STUFE==='plan'){
  schritt='plan';const p=await aufruf('plan',['--mode','plan','--connections',conn,'--out',planFile]);
  if(!p.ok)throw Object.assign(new Error('Plan: '+p.fehler.message),{code:p.fehler.code,wo:p.fehler.wo});
  const plan=JSON.parse(fs.readFileSync(planFile,'utf8')),pr=plan.pricing,ev=JSON.parse(fs.readFileSync(evidenzFile,'utf8')),pk=kompaktProtokoll(),bc=plan.baselineCommerce,alt=new Map(bc.variants.map(v=>[v.id,v]));
  const senk=mapping.matches.filter(m=>m.beforeCents!==m.afterCents),lab=mapping.matches.filter(m=>!gleich(m.beforeOptions,m.afterOptions)),paare=[...new Set(lab.flatMap(m=>m.beforeOptions.map((o,i)=>o.value!==m.afterOptions[i]?.value?o.name+': '+o.value+' -> '+m.afterOptions[i]?.value:null).filter(Boolean)))];
  ergebnis.plan={planHash:plan.planHash,planSha256:p.sha256,planBytes:p.bytes,preparedAt:plan.preparedAt,mutationen:plan.mutations.length,preisAenderungen:plan.mutations.filter(m=>m.price!==undefined).length,labelAenderungen:plan.mutations.filter(m=>m.optionValues!==undefined).length,mutationenSha256:digest(plan.mutations),bloecke:plan.bindingBlocks.map(b=>b.length),baselineBindings:plan.baselineBindings.length,baselineR1:plan.baselineBindings.filter(b=>b.productRevision===1).length,r1Freigabe:plan.baselineR1Approval,
   shop:{status:bc.status,varianten:bc.variants.length,titel:bc.protectedProduct.title,handle:bc.protectedProduct.handle,templateSuffix:bc.protectedProduct.templateSuffix,customizationId:bc.protectedProduct.customization?.value??null,optionen:bc.optionDefinitions.map(o=>o.name),ausgangSha256:digest(bc),zielSha256:digest(plan.targetPricingCommerce)},
   preisSenkungen:{anzahl:senk.length,alleNiedriger:senk.every(m=>m.afterCents<m.beforeCents),summeVorherCent:senk.reduce((a,m)=>a+m.beforeCents,0),summeNachherCent:senk.reduce((a,m)=>a+m.afterCents,0),groessteSenkungCent:Math.max(...senk.map(m=>m.beforeCents-m.afterCents)),kleinsteSenkungCent:Math.min(...senk.map(m=>m.beforeCents-m.afterCents)),beispiele:senk.slice(0,3).map(m=>[m.sku,m.beforeCents,m.afterCents])},labelPaare:paare.slice(0,12),labelPaareAnzahl:paare.length,
   preis:{pricingPlanHash:pr.pricingPlanHash,vorher:pr.before?{id:pr.before.id,bytes:Buffer.byteLength(pr.before.value),sha256:sha(pr.before.value),compareDigest:pr.before.compareDigest}:null,nachherBytes:Buffer.byteLength(pr.afterValue),nachherSha256:pr.afterSha256,gleichPaketvorschau:pr.afterValue===fs.readFileSync(path.join(PAKET,'pricing-value.preview.json'),'utf8'),changed:pr.changed,priceRevision:pr.priceRevision,requiredFormats:pr.requiredFormats,historicalContracts:pr.historicalContracts.length,nullHistorical:pr.nullHistoricalContracts,retainedHistorical:pr.retainedHistoricalContracts,expectedContracts:pr.expectedContracts.length,functionEvidence:pr.functionEvidence,beispielNeuerVertrag:pr.expectedContracts[0]?.contract}};
  ergebnis.evidenz={datei:path.basename(evidenzFile),sha256:dateiSha(evidenzFile),bytes:fs.statSync(evidenzFile).size,vertraegeSha256:digest(hist(ev.historicalContracts)),preisfeldGleichPlan:gleich(ev.observedField,pr.before)};
  ergebnis.nachher=zaehle();ergebnis.anschlussProtokoll=pk;const P_=ergebnis.plan,fe=pr.functionEvidence;
  ergebnis.pruefungen={plan_182_158_30:P_.mutationen===182&&P_.preisAenderungen===158&&P_.labelAenderungen===30&&plan.mutations.every(m=>Object.keys(m).every(k=>['id','price','optionValues'].includes(k))),plan_8_bloecke_778:gleich(P_.bloecke,[100,100,100,100,100,100,100,78]),plan_808_r1_bindungen:P_.baselineBindings===808&&P_.baselineR1===808&&ergebnis.vorher.mainR1===808&&ergebnis.vorher.mainR2===0,
   r1_katalogfreigabe_wie_ausgang:plan.baselineR1Approval?.kind==='catalog'&&plan.baselineR1Approval.id===R1_FREIGABE,shop_draft_808_vorzustand:bc.status==='DRAFT'&&bc.variants.length===808&&mapping.matches.every(m=>alt.get(m.id)?.priceCents===m.beforeCents)&&bc.protectedProduct.customization?.value===CFG,
   alle_158_sind_senkungen:P_.preisSenkungen.anzahl===158&&P_.preisSenkungen.alleNiedriger,preis_vorher_wie_beobachtet:P_.preis.vorher?.bytes===18108&&P_.preis.vorher.sha256===PREIS_ALT_SHA&&P_.preis.vorher.compareDigest===PREIS_ALT_DIGEST&&P_.preis.vorher.id===METAFELD&&ergebnis.evidenz.preisfeldGleichPlan,
   preisvorschlag_3898_gepinnt:pr.afterSha256===PREIS_SHA&&P_.preis.nachherBytes===3898&&sha(pr.afterValue)===PREIS_SHA&&P_.preis.gleichPaketvorschau&&pr.priceRevision===2&&pr.changed===true,preis_808_alt_778_neu:pr.historicalContracts.length===808&&pr.nullHistoricalContracts===0&&pr.expectedContracts.length===778,vertraege_wie_r1_ausgang:ergebnis.evidenz.vertraegeSha256===VERTRAEGE_R1_SHA,
   function_echt_und_belegt:fe?.releaseId===VERSION&&fe.wasmSha256===WASM&&fe.buildSourceSha256===BUILD&&pr.requiredFormats.every(f=>FORMATE.includes(f))&&pk.length===1&&pk[0].function.length>=1&&pk[0].function.every(l=>l.exit===0&&l.versionId===VERSION),
   anschluss_nur_lesend:pk.length===1&&pk[0].readOnly===true&&pk[0].canWrite===false&&gleich(pk[0].methoden,['catalogApprovals','inspect','resolveMany'])&&pk[0].mutationen===0&&pk[0].preisprovider===0&&pk[0].checker===0,zaehler_unveraendert:gleich(ergebnis.vorher,ergebnis.nachher),kein_fremdes_netz:pk[0].fremd===0,noch_kein_journal:jr().length===0&&!fs.existsSync(approvalFile)};
  ergebnis.bestanden=Object.values(ergebnis.pruefungen).every(Boolean);
  const b=schreibe(planBeleg,ergebnis);
  zeige({stufe:STUFE,ordner:ergebnis.ordner,bestanden:ergebnis.bestanden,beleg:b,pakete:ergebnis.pakete,pruefungen:Object.entries(ergebnis.pruefungen).map(([k,w])=>(w?'+':'-')+k).join(' '),plan:{...P_,r1Freigabe:[P_.r1Freigabe?.kind,P_.r1Freigabe?.id,P_.r1Freigabe?.approvedAt]},evidenz:ergebnis.evidenz,ms:p.ms,protokoll:pk,vorher:ergebnis.vorher});
  if(!ergebnis.bestanden)process.exitCode=1;
 }else{
  // gemeinsame Voraussetzung: geprüfter Plan dieses Ordners
  schritt='planbeleg';const pb=JSON.parse(fs.readFileSync(planBeleg,'utf8'));if(pb.bestanden!==true||dateiSha(planFile)!==pb.plan.planSha256)throw Object.assign(new Error('Plan ist nicht der geprüfte Plan dieses Ordners.'),{code:'ml_plan_ungeprueft'});
  const plan=JSON.parse(fs.readFileSync(planFile,'utf8'));if(plan.planHash!==pb.plan.planHash)throw new Error('planHash weicht ab.');
  ergebnis.plan={planHash:plan.planHash,planSha256:pb.plan.planSha256,planbelegSha256:dateiSha(planBeleg)};const V0=pb.vorher;
  if(STUFE==='readback'){
   schritt='readback';const approval=fs.existsSync(approvalFile)?JSON.parse(fs.readFileSync(approvalFile,'utf8')):null,rb=await readback(plan,approval);ergebnis.readback=rb;ergebnis.pruefungen=readbackGruen(rb,V0);ergebnis.bestanden=Object.values(ergebnis.pruefungen).every(w=>w===true||w===null);
   const b=schreibe(path.join(lauf,'READBACK-main.json'),ergebnis);zeige({stufe:STUFE,ordner:ergebnis.ordner,lauf:ergebnis.lauf,bestanden:ergebnis.bestanden,beleg:b,pruefungen:Object.entries(ergebnis.pruefungen).map(([k,w])=>(w===true?'+':w===null?'~':'-')+k).join(' '),readback:rb});
  }else{
   schritt='zustimmung';let approval;
   if(fs.existsSync(approvalFile)){approval=JSON.parse(fs.readFileSync(approvalFile,'utf8'));if(!gleich(approval,makeExecutionApproval(plan,ENTSCHEIDUNG)))throw Object.assign(new Error('Vorhandene Zustimmungsakte passt nicht zu Plan/Entscheidung.'),{code:'ml_zustimmung'});}
   else{if(STUFE!=='apply')throw new Error('Zustimmungsakte fehlt.');approval=makeExecutionApproval(plan,ENTSCHEIDUNG);fs.writeFileSync(approvalFile,JSON.stringify(approval),{flag:'wx',mode:0o600});}
   ergebnis.zustimmung={approvalHash:approval.approvalHash,sha256:dateiSha(approvalFile),catalogApprovalId:approval.decision.catalogApprovalId,actor:approval.decision.actor,acceptedAt:approval.decision.acceptedAt};
   if(sperre())throw Object.assign(new Error('Journalsperre vorhanden - läuft ein Operatorprozess oder wurde einer abgebrochen? Erst klären.'),{code:'ml_journalsperre'});
   ergebnis.journalVorher=jr();
   if(STUFE==='reconcile'){
    if(!/^(shop-variants|shop-pricing|bindings:[0-7]|catalog-main-r2)$/.test(STEP))throw new Error('--step fehlt oder ungültig.');
    schritt='reconcile';const name='reconcile-'+STEP.replace(':','-'),rc=await voll('reconcile',name,['--step',STEP]);
    ergebnis.reconcile=rc.ok?lies(name):rc.fehler;ergebnis.aufrufe=S.map(s=>({name:s.name,ok:s.ok,code:s.fehler?.code??null,ms:s.ms}));ergebnis.journalNachher=jr();ergebnis.anschlussProtokoll=kompaktProtokoll();ergebnis.nachher=zaehle();
    ergebnis.pruefungen={reconcile_ok:rc.ok,nur_gelesen:rc.ok&&ergebnis.reconcile.shopifyWrites===0&&ergebnis.reconcile.bindingWrites===0&&ergebnis.anschlussProtokoll.every(e=>e.mutationen===0),zaehler_unveraendert:gleich(ergebnis.vorher,ergebnis.nachher)};ergebnis.bestanden=Object.values(ergebnis.pruefungen).every(Boolean);
    const b=schreibe(path.join(lauf,'RECONCILE-main.json'),ergebnis);zeige({stufe:STUFE,step:STEP,ordner:ergebnis.ordner,lauf:ergebnis.lauf,bestanden:ergebnis.bestanden,beleg:b,reconcile:ergebnis.reconcile,journalVorher:ergebnis.journalVorher,journalNachher:ergebnis.journalNachher,protokoll:ergebnis.anschlussProtokoll});
    if(!ergebnis.bestanden)process.exitCode=1;
   }else{
    // ---- apply -> finish-catalog -> Readback. Hält beim ersten Fehler an; keine Wiederholung, kein automatisches Reconcile.
    schritt='apply';const a=await voll('apply','apply');let k=null,rb=null,angehalten=null;
    if(!a.ok)angehalten={bei:'apply',fehler:a.fehler};
    else{schritt='katalog';k=await voll('finish-catalog','finish-catalog');if(!k.ok)angehalten={bei:'finish-catalog',fehler:k.fehler};}
    ergebnis.aufrufe=S.map(s=>({name:s.name,ok:s.ok,code:s.fehler?.code??null,message:s.fehler?.message??null,wo:s.fehler?.wo??null,ms:s.ms,mainR2:s.zaehler.mainR2,katalog:s.zaehler.katalogfreigaben}));ergebnis.journalNachher=jr();ergebnis.sperreOffen=sperre();ergebnis.anschlussProtokoll=kompaktProtokoll();ergebnis.nachher=zaehle();
    if(a.ok){const q=lies('apply');ergebnis.quittung={datei:'apply.json',sha256:a.sha256,bytes:a.bytes,schema:q.schema,revision2Bindings:q.revision2Bindings,revision1BindingsPreserved:q.revision1BindingsPreserved,historicalPriceContractsPreserved:q.historicalPriceContractsPreserved,priceRevision:q.priceRevision,pricingPlanHash:q.pricingPlanHash,shopifyVariantIdsPreserved:q.shopifyVariantIdsPreserved,commerceSha256:q.commerceSha256,bindingReadbackSha256:q.bindingReadbackSha256,catalogApprovalPerformed:q.catalogApprovalPerformed,published:q.published};}
    if(k?.ok){const kq=lies('finish-catalog');ergebnis.katalog={datei:'finish-catalog.json',sha256:k.sha256,bytes:k.bytes,...Object.fromEntries(Object.entries(kq).filter(([,v])=>v===null||['string','number','boolean'].includes(typeof v)))};}
    if(angehalten){ergebnis.angehalten=angehalten;ergebnis.hinweis='Angehalten. Keine Wiederholung. Journal lesen; unklaren Schritt mit --stufe=reconcile --step=… klären.';ergebnis.bestanden=false;}
    else{schritt='readback';rb=await readback(plan,approval);ergebnis.readback=rb;const pk=ergebnis.anschlussProtokoll,q=ergebnis.quittung,kq=ergebnis.katalog;
     ergebnis.pruefungen={...readbackGruen(rb,V0),quittung_778_30_808:q.revision2Bindings===778&&q.revision1BindingsPreserved===30&&q.historicalPriceContractsPreserved===808&&q.shopifyVariantIdsPreserved===808&&q.priceRevision===2&&q.published===false,katalogquittung:kq.revision2Coverage===778&&kq.revision1CoveragePreserved===808&&kq.revision1ActiveBindingsPreserved===30&&kq.published===false,
      genau_ein_bulk_ein_cas:(m=>ergebnis.journalVorher.length?m<=2:m===2)(pk.reduce((n,e)=>n+(e.mutationen??0),0)),schreibanschluss_ein_gepreister_store:pk.filter(e=>!e.readOnly).every(e=>e.preisprovider===1&&e.checker===1),kein_fremdes_netz:pk.every(e=>e.fremd===0),function_immer_belegte_version:pk.every(e=>e.function.every(l=>l.exit===0&&l.versionId===VERSION))};
     ergebnis.mutationenGesamt=pk.reduce((n,e)=>n+(e.mutationen??0),0);ergebnis.bestanden=Object.values(ergebnis.pruefungen).every(w=>w===true||w===null);}
    const b=schreibe(path.join(lauf,'AUSFUEHRUNG-main.json'),ergebnis);
    zeige({stufe:STUFE,ordner:ergebnis.ordner,lauf:ergebnis.lauf,bestanden:ergebnis.bestanden,beleg:b,angehalten:ergebnis.angehalten??null,pruefungen:ergebnis.pruefungen?Object.entries(ergebnis.pruefungen).map(([k2,w])=>(w===true?'+':w===null?'~':'-')+k2).join(' '):null,zustimmung:ergebnis.zustimmung,aufrufe:ergebnis.aufrufe,journal:ergebnis.journalNachher.join(' '),sperreOffen:ergebnis.sperreOffen,quittung:ergebnis.quittung??null,katalog:ergebnis.katalog??null,mutationenGesamt:ergebnis.mutationenGesamt??null,vorher:ergebnis.vorher,nachher:ergebnis.nachher,readback:rb?{shop:rb.shop,nativ:rb.nativ}:null,protokoll:ergebnis.anschlussProtokoll.map(e=>({mode:e.mode,lesen:e.lesen,mutationen:e.mutationen,gedrosselt:e.gedrosselt,kostenMax:e.kostenMax,fehler:e.fehler,function:e.function.length}))});
    if(!ergebnis.bestanden)process.exitCode=1;
   }
  }
 }
}catch(error){const f=kurzFehler(error);try{zeige({...ergebnis,schritt,fehler:f,protokoll:kompaktProtokoll(),bestanden:false});}catch{console.log(JSON.stringify({event:'ml_lauf',schritt,bestanden:false,fehler:{code:'ml_ausgabe_gesperrt'}}));}process.exitCode=1;}
