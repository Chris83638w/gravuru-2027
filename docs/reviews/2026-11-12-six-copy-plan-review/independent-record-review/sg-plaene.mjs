// Sechs neue Kleinproduktgruppen: vorbereitende Quellen, Vorlagen und gespeicherte Zielpläne auf einer NEUEN
// Wegwerfkopie der drei Acryl-Datenbanken (Astras Schritte 1–6 aus
// docs/reviews/2026-11-12-main-v7-copy-review/six-new-groups-copy-plan-prerequisites.md, Commit b2a0a19d).
// Es wird NICHT bestätigt und NICHT ausgeführt (kein confirm, kein execute), kein Netz, keine Live-Datenbank,
// keine Shopify-Funktion, keine Produktanlage im Shop. Die hier entstehenden cfg-/pgt-/pgp-/cmp-/prf-Kennungen
// existieren nur auf der Kopie und sind keine Einträge der Live-Registry.
//   node sg-plaene.mjs [--stand=JJJJMMTTThhmmssZ]     (Sicherung, aus der kopiert wird; Standard: neueste)
import './vh-netzwaechter.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL,fileURLToPath} from 'node:url';
const hier=import.meta.dirname,P=process.env.SG_P||path.resolve(hier,'..');
const RT=process.env.SG_RT||path.join(P,'kandidat-f85390b-20261112');
const BASIS=process.env.SG_BASIS||path.join(P,'sicherungen-db');
const EIN=process.env.SG_EIN||hier;
const DBS=['workshop.sqlite','design-assets.sqlite','profiles.sqlite'],TENANT='gravuru';
const ACTOR='Claude Kopienlauf sechs Gruppen (nur Wegwerfkopie, keine Freigabe)';
const PINS={'app/workshop/http.mjs':'e2d7071c46463ed097044dc979f22796670804e5dda4c389f84684a4fce0948f',
 'app/workshop/repository.mjs':'f9bba8887d956d283fd14cfd34a9455de2130d45ad75a7e5042b458a307bb4b1',
 'app/workshop/profile-library.mjs':'d3aa96dd7800f3e98bd2706b20bb2a0eb5b47adc9172099547453225e8460e51',
 'app/workshop/production-profiles.mjs':'931d595d1abc374d84da7330476218f1f319aacc2648aa8210f1b8b9076c4cb3',
 'app/workshop/design-assets.mjs':'888d6935c1b59dd189589ebb6ee16c54402bfc203d731e42bb4b276d70a2bdf1',
 'app/workshop/font-library.mjs':'fa34d4855716547b5c4ebfa453b036f9ab73a6e73c417f834e03aee87a89415b',
 'app/workshop/product-model.mjs':'f452d2590c6c9ec00fac260fd154d8fb5ec4f0fed1b7d34f98d16d594ae114a8',
 'app/workshop/form-product.mjs':'eb932fef506d1878c66aec741545ef3f1618cc4783bd184e6fb5e559751e3754',
 'app/workshop/catalog.mjs':'0d236f7873f3fae1bdaed174511164a08fc3af0a4424c993481730f8dcb88459',
 'app/configurator/variant-m/build.mjs':'b7dfb58afb136ed6ad6939b6a9df0a56c26eef4b16e5926c3b700594dd4fb782',
 'app/workshop/configurator-module-http.mjs':'70c9eaefe325258016fb8328e77c98803b183550f328bd13b6bdde212cb7adb8',
 'app/workshop/configurator-module-profiles.mjs':'ccab1695f4ac21bc3819623b8871f641cd503587cbd7aaf6790d57820aff5720',
 'app/workshop/product-group-templates.mjs':'e37c7ea780512efc02724c34e89c54461ad844e7875de96f7e301227450f5faf',
 'scripts/issue230-product-plan-audit.mjs':'05f6ea7a9396c26e14e6832decfe284f951001ac7cdc596e269099c16818b509'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function dateiSha(file){const fd=fs.openSync(file,'r'),h=crypto.createHash('sha256'),buf=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null)))h.update(buf.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const canonical=v=>Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const csha=v=>sha(JSON.stringify(canonical(v)));
const gleich=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const log=e=>console.log(JSON.stringify({event:'sg_plaene',...e}));
const imp=p=>import(pathToFileURL(path.join(RT,p)).href);
const kurzFehler=e=>({code:e?.code??null,status:e?.status??null,message:String(e?.message||e).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,400)});
let schritt='start';const ergebnis={schema:'gravuru-sechsgruppen-kopienlauf-TESTBELEG/v1',kennzeichnung:'TESTBELEG auf Wegwerfkopie - Vorbereitungsquellen, Vorlagen und Pläne; kein confirm, kein execute, keine Nutzerfreigabe, keine Live-Registry',erstellt:new Date().toISOString(),kandidat:path.basename(RT)};
try{
 // 0. Pins des Kandidaten f85390b (Datei-SHA-256)
 schritt='pins';if(!process.env.SG_OHNE_PINS)for(const [f,h] of Object.entries(PINS))if(sha(fs.readFileSync(path.join(RT,f)))!==h)throw new Error('Prüfsumme weicht ab: '+f);
 // 1. Eingaben (aus dem v9-Transport gebaut) und Quelldokumente prüfen
 schritt='eingaben';const einBytes=fs.readFileSync(path.join(EIN,'sg-eingaben.json')),ein=JSON.parse(einBytes);
 if(ein.schema!=='gravuru-sechsgruppen-eingaben/v1'||ein.gruppen.length!==6)throw new Error('Eingaben unerwartet.');
 const br=Buffer.concat(ein.dokumente.teile.map(t=>{const b=fs.readFileSync(path.join(EIN,t.name));if(sha(b)!==t.sha256)throw new Error('Teil weicht ab: '+t.name);return b;}));
 if(sha(br)!==ein.dokumente.brSha256)throw new Error('Dokumentpaket weicht ab.');
 const alle=zlib.brotliDecompressSync(br,{params:{[zlib.constants.BROTLI_DECODER_PARAM_LARGE_WINDOW]:1}});
 if(alle.length!==ein.dokumente.bytes||sha(alle)!==ein.dokumente.sha256)throw new Error('Entpackte Dokumente weichen ab.');
 for(const g of ein.gruppen){const roh=alle.subarray(g.dokument.offset,g.dokument.offset+g.dokument.bytes);if(sha(roh)!==g.dokument.sha256)throw new Error('Quelldokument weicht ab: '+g.ordner);}
 const selbst=sha(fs.readFileSync(fileURLToPath(import.meta.url)));
 ergebnis.eingaben={dateiSha256:sha(einBytes),transportManifestSha256:ein.quelle.manifestSha256,repoCommit:ein.quelle.repoCommit,dokumentpaketSha256:ein.dokumente.brSha256,skriptSha256:selbst};
 // 2. neue Wegwerfkopie aus der Sicherung
 schritt='kopie';const stand=(process.argv.find(a=>a.startsWith('--stand='))||'').slice(8)||fs.readdirSync(BASIS).filter(n=>/^\d{8}T\d{6}Z$/.test(n)).sort().at(-1);
 if(!/^\d{8}T\d{6}Z$/.test(stand||''))throw new Error('Sicherungsstand fehlt.');
 const SICH=path.join(BASIS,stand),ts=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',U=path.join(BASIS,'sechsgruppen-'+ts);
 const bedarf=DBS.reduce((n,f)=>n+fs.statSync(path.join(SICH,f)).size,0),st=fs.statfsSync(BASIS),frei=Number(st.bavail)*Number(st.bsize);
 if(frei<bedarf*2)throw new Error('Zu wenig freier Speicher: frei '+frei+' Bytes, verlangt '+bedarf*2);ergebnis.platz={bedarfBytes:bedarf,freiBytes:frei};
 fs.mkdirSync(U,{mode:0o700});const daten=path.join(U,'daten'),bau=path.join(U,'bau');fs.mkdirSync(daten,{mode:0o700});fs.mkdirSync(bau,{mode:0o700});
 const manifest=JSON.parse(fs.readFileSync(path.join(SICH,'manifest.json'),'utf8')).dateien,kopien={};
 for(const f of DBS){fs.copyFileSync(path.join(SICH,f),path.join(daten,f),fs.constants.COPYFILE_EXCL);fs.chmodSync(path.join(daten,f),0o600);const s=dateiSha(path.join(daten,f));if(s!==manifest[f].sha256)throw new Error('Kopie weicht ab: '+f);kopien[f]=[manifest[f].bytes,s];}
 ergebnis.ordner=path.basename(U);ergebnis.kopienquelle={sicherung:stand,dateien:kopien};
 // 3. Saat wie der Host und native Instanzen auf den zusammengehörigen Kopien
 schritt='bau';const {build}=await imp('app/configurator/variant-m/build.mjs');build({outputDirectory:bau});
 const seed=JSON.parse(fs.readFileSync(path.join(bau,'models.json'),'utf8'))[0];
 schritt='instanzen';
 const [{createFontLibrary},{createProfileLibrary},{createProductionProfiles},{createDesignAssetStore},{workshopCatalog},{validateProductDocument},{isFormProduct},{productOverview},{createProductRepository},{createConfiguratorModuleManagement},audit]=await Promise.all(['app/workshop/font-library.mjs','app/workshop/profile-library.mjs','app/workshop/production-profiles.mjs','app/workshop/design-assets.mjs','app/workshop/catalog.mjs','app/workshop/product-model.mjs','app/workshop/form-product.mjs','app/workshop/product-preview.mjs','app/workshop/repository.mjs','app/workshop/configurator-module-http.mjs','scripts/issue230-product-plan-audit.mjs'].map(imp));
 const wFile=path.join(daten,'workshop.sqlite'),aFile=path.join(daten,'design-assets.sqlite'),pFile=path.join(daten,'profiles.sqlite');
 const fonts=createFontLibrary({filename:aFile,tenantId:TENANT});
 const profiles=createProfileLibrary({filename:pFile,catalog:workshopCatalog(seed.universal.localResources),tenantId:TENANT});profiles.registerFonts(fonts.list());
 const productionProfiles=createProductionProfiles({filename:pFile,tenantId:TENANT});
 const assets=createDesignAssetStore({filename:aFile,tenantId:TENANT});
 // Derselbe Nicht-Formprodukt-Zweig wie http.mjs:156 (Validator und Snapshot-Metadaten)
 const nativeValidate=value=>{const document=validateProductDocument(value);if(isFormProduct(document))throw Error('Dieser Anschluss gilt nur für Universalprodukte.');profiles.resolve(document);assets.validateDocument(document);productionProfiles.resolve(document);return document;};
 const snapshotMetadata=document=>({profiles:profiles.resolve(document),productionProfile:productionProfiles.resolve(document)});
 const repository=createProductRepository({filename:wFile,tenantId:TENANT,validateDocument:nativeValidate,snapshotMetadata,catalogOverview:productOverview});
 // Der Acryl-Host konfiguriert keine Katalogregistry; er nutzt genau diesen Standardanschluss (http.mjs:170).
 const management=createConfiguratorModuleManagement({filename:wFile,repository,tenantId:TENANT});
 const zaehle=()=>{const d=new DatabaseSync(wFile,{readOnly:true});try{const n=q=>{try{return d.prepare(q).get(TENANT)?.n??null;}catch{return null;}};return {produkte:n('SELECT COUNT(*) AS n FROM products WHERE tenant_id=?'),revisionen:n('SELECT COUNT(*) AS n FROM product_revisions WHERE tenant_id=?'),importjournal:n('SELECT COUNT(*) AS n FROM import_items WHERE tenant_id=?'),bindungskoepfe:n('SELECT COUNT(*) AS n FROM shop_product_binding_heads WHERE tenant_id=?'),bindungsrevisionen:n('SELECT COUNT(*) AS n FROM shop_product_binding_revisions WHERE tenant_id=?'),modulprofile:n('SELECT COUNT(*) AS n FROM configurator_module_profiles WHERE tenant_id=?'),vorlagen:n('SELECT COUNT(*) AS n FROM product_group_templates WHERE tenant_id=?'),plaene:n('SELECT COUNT(*) AS n FROM product_group_creation_plans WHERE tenant_id=?'),bestaetigungen:n('SELECT COUNT(*) AS n FROM product_group_confirmations WHERE tenant_id=?'),ausfuehrungen:n('SELECT COUNT(*) AS n FROM product_group_creation_results WHERE tenant_id=?')};}finally{d.close();}};
 ergebnis.vorher=zaehle();
 ergebnis.registry={quellenVorher:management.overview().sources.length,vorlagenVorher:management.groups.list().length,modulprofileVorher:management.profiles.list().length,vertrag:'nativeModuleSources (Standard des Acryl-Hosts, keine Katalogregistry konfiguriert)'};
 // 4. Modulprofil: vorhandenen Registryeintrag verwenden, sonst auf der Kopie anlegen und tatsächliche ID protokollieren
 schritt='modulprofil';let modul,modulHerkunft;
 try{modul=management.profiles.get(ein.modulprofil.id,{revision:ein.modulprofil.revision});modulHerkunft='vorhanden';}
 catch(e){if(e?.code!=='module_profile_missing')throw e;modul=management.profiles.create({name:ein.modulprofil.name,modules:ein.modulprofil.modules},{actor:ACTOR});modulHerkunft='auf der Kopie angelegt';}
 const modulZurueck=management.profiles.get(modul.id,{revision:modul.revision});
 ergebnis.modulprofil={v9:{id:ein.modulprofil.id,revision:ein.modulprofil.revision,sha256:ein.modulprofil.sha256},tatsaechlich:{id:modul.id,revision:modul.revision,sha256:modul.sha256},herkunft:modulHerkunft,dokumentHashGleichV9:modulZurueck.sha256===ein.modulprofil.sha256,module:modulZurueck.document.modules};
 // 5. Motivbibliotheksprofil: 13 IDs müssen im tatsächlichen Katalog stehen; vorhandenes Profil verwenden, sonst anlegen
 schritt='motivprofil';const katalog=profiles.catalog(),katalogIds=new Set(katalog.motifs.map(m=>m.id)),fehlend=ein.motivprofil.items.filter(i=>!katalogIds.has(i));
 if(fehlend.length)throw Object.assign(new Error('Motive fehlen im tatsächlichen Katalog: '+fehlend.length),{code:'motive_fehlen'});
 let motiv,motivHerkunft;
 try{motiv=profiles.get(ein.motivprofil.id,{revision:ein.motivprofil.revision});motivHerkunft='vorhanden';}
 catch(e){motiv=profiles.create({name:ein.motivprofil.name,type:ein.motivprofil.type,items:ein.motivprofil.items});motivHerkunft='auf der Kopie angelegt ('+(e?.code||'nicht gefunden')+')';}
 const motivDok=motiv.document??{name:motiv.name,type:motiv.type,items:motiv.items};
 ergebnis.motivprofil={v9:{id:ein.motivprofil.id,revision:ein.motivprofil.revision,documentSha256:ein.motivprofil.documentSha256},tatsaechlich:{id:motiv.id,revision:motiv.revision,felder:Object.keys(motiv).slice(0,12)},herkunft:motivHerkunft,katalogMotive:katalog.motifs.length,alle13ImKatalog:true,
  itemsGleichV9InReihenfolge:JSON.stringify(motivDok.items)===JSON.stringify(ein.motivprofil.items),dokumentSha256:{kanonisch:csha({name:motivDok.name,type:motivDok.type,items:motivDok.items}),gleichV9:[csha({name:motivDok.name,type:motivDok.type,items:motivDok.items}),sha(JSON.stringify({name:motivDok.name,type:motivDok.type,items:motivDok.items})),motiv.sha256,motiv.documentSha256].includes(ein.motivprofil.documentSha256)},
  einstellungenRevision:profiles.settings().revision};
 // 6. je Gruppe: Quelle speichern, Vorlage anlegen, Plan erzeugen und zurücklesen
 ergebnis.gruppen=[];
 for(const g of ein.gruppen){
  const e={ordner:g.ordner};ergebnis.gruppen.push(e);
  try{
   schritt=g.ordner+':quelle';const doc=JSON.parse(alle.subarray(g.dokument.offset,g.dokument.offset+g.dokument.bytes).toString('utf8'));
   if(doc.profileAssignments?.motifs?.profileId!==ein.motivprofil.id)throw new Error('Motivprofilverweis im Quelldokument unerwartet.');
   if(motiv.id!==ein.motivprofil.id)doc.profileAssignments.motifs.profileId=motiv.id;
   e.motivVerweis={v9:ein.motivprofil.id,gesetzt:doc.profileAssignments.motifs.profileId,abgebildet:motiv.id!==ein.motivprofil.id};
   let t=Date.now();const angelegt=repository.create(doc),zurueck=repository.get(angelegt.id);
   e.quelle={id:zurueck.id,revision:zurueck.revision,status:zurueck.status??null,sha256:zurueck.sha256??null,dokumentKanonischSha256:csha(zurueck.document),v9:{id:g.v9.quelle.id,revision:g.v9.quelle.revision,sha256:g.v9.quelle.sha256},
    inhaltGleichEingabe:gleich(zurueck.document,doc),nurMotivverweisAnders:gleich({...zurueck.document,profileAssignments:{...zurueck.document.profileAssignments,motifs:{...zurueck.document.profileAssignments.motifs,profileId:ein.motivprofil.id}}},JSON.parse(alle.subarray(g.dokument.offset,g.dokument.offset+g.dokument.bytes).toString('utf8'))),ms:Date.now()-t};
   const aufl=profiles.resolve(zurueck.document);
   e.ressourcen={motive:Array.isArray(aufl.selections?.motifs)?aufl.selections.motifs.length:null,motiveGleich13:JSON.stringify(aufl.selections?.motifs)===JSON.stringify(ein.motivprofil.items),quellen:Object.fromEntries(Object.entries(aufl.sources||{}).map(([k,v])=>[k,{level:v?.level??null,mode:v?.mode??null,profileId:v?.profileId??null,profileRevision:v?.profileRevision??null}])),settingsRevision:aufl.settingsRevision??null,warnungen:Array.isArray(aufl.warnings)?aufl.warnings.length:null,fertigung:(r=>r===null?null:{id:r.id,revision:r.revision})(productionProfiles.resolve(zurueck.document))};
   schritt=g.ordner+':registry';const ueber=management.overview(),src=ueber.sources.filter(s=>s.productId===zurueck.id),scopes=ueber.scopes.filter(s=>Array.isArray(s.sourceKeys)&&src[0]&&s.sourceKeys.includes(src[0].key));
   if(src.length!==1||scopes.length!==1)throw new Error('Quelle/Scope in der Registry nicht eindeutig: '+src.length+'/'+scopes.length);
   const scope={lineId:scopes[0].lineId,subcategoryId:scopes[0].subcategoryId};
   e.registry={key:src[0].key,productId:src[0].productId,familyId:src[0].familyId,sizeKey:src[0].sizeKey,scope};
   schritt=g.ordner+':vorlage';const draft=management.groups.draft({name:g.v9.vorlagenName,scope,sourceKeys:[src[0].key]});
   if(draft.targets.length!==1)throw new Error('Vorlagenentwurf hat nicht genau ein Ziel.');
   const z=draft.targets[0];e.vorlageInhalt={zielInhaltSha256:csha({material:z.material,optionGroups:z.optionGroups,optionFields:z.optionFields}),gleichV9:csha({material:z.material,optionGroups:z.optionGroups,optionFields:z.optionFields})===g.erwartet.zielInhaltSha256};
   z.moduleProfile={id:modul.id,revision:modul.revision};
   const vorlage=management.groups.create(draft,{actor:ACTOR}),vz=management.groups.get(vorlage.id);
   e.vorlage={id:vz.id,revision:vz.revision,sha256:vz.sha256,name:vz.document.name,modulprofil:vz.document.targets[0].moduleProfile,quelle:vz.document.targets[0].source,v9:g.v9.vorlage};
   schritt=g.ordner+':plan';t=Date.now();
   const r=audit.planExistingTemplate({groups:management.groups,templateId:vz.id,templateRevision:vz.revision,product:{key:g.produkt.key,name:g.produkt.name,targetKey:src[0].key},excel:{workbookPath:g.workbook,sourceCommit:ein.quelle.excelCommit,workbookSha256:g.excelSha256}});
   const plan=management.groups.getPlan(r.planId),p=plan.products[0]||null,cfg=p?.document?.config,prof=cfg?.profile;
   e.plan={id:plan.id,planHash:plan.planHash,zurueckgelesenGleich:plan.planHash===r.planHash,valid:plan.valid,issues:plan.issues,creationKey:plan.creationKey,creationKeyStabil:plan.creationKey===g.erwartet.creationKey,produktKey:plan.requestedProducts[0]?.key,localOnly:plan.localOnly,published:plan.published,shopifyWrites:plan.shopifyWrites,confirmationId:plan.confirmationId??null,
    templateHash:plan.templateHash,quellen:plan.sources,modulprofile:plan.moduleProfiles,offering:plan.offering,existingProductId:p?.existingProductId??null,fingerprint:p?.fingerprint??null,v9:{planId:g.v9.planId,planHash:g.v9.planHash,fingerprint:g.erwartet.fingerprint},ms:Date.now()-t};
   e.vergleich=p?{kombinationen:p.combinationCount,kombinationenGleich:p.combinationCount===g.erwartet.kombinationen,variantReview:p.variantReview.length,variantReviewGleich:csha(p.variantReview)===g.erwartet.variantReviewSha256,optionen:p.options,optionenGleich:gleich(p.options,g.erwartet.optionen),preis:{unitCents:p.price?.unitCents,totalCents:p.price?.totalCents,currency:p.price?.currency},preisGleich:gleich(p.price,g.erwartet.preis),optionGroupsGleich:csha(p.optionGroups)===g.erwartet.optionGroupsSha256,
    designs:prof?.designs?.length??null,designIdsGleich:prof?csha(prof.designs.map(x=>x.id))===g.erwartet.designIdsSha256:false,startdesignGleich:prof?.defaultDesignId===g.erwartet.defaultDesignId,themaGleich:prof?.themeId===g.erwartet.themeId,
    foto:cfg?.photo?.enabled??null,logo:cfg?.logo?.enabled??null,fotoLogoAus:cfg?.photo?.enabled===false&&cfg?.logo?.enabled===false,module:cfg?.moduleProfile?.modules??null,moduleGleich:gleich(cfg?.moduleProfile?.modules,g.erwartet.module),
    kompiliertGleichV9BisAufKennungen:csha({...p.document,profileAssignments:{...p.document.profileAssignments,motifs:{...p.document.profileAssignments.motifs,profileId:null}},config:{...cfg,moduleProfile:{...cfg.moduleProfile,id:null}}})===g.erwartet.kompiliertOhneKennungenSha256}:null;
   e.bestanden=!!(p&&plan.valid===true&&plan.issues.length===0&&e.plan.zurueckgelesenGleich&&e.plan.creationKeyStabil&&plan.localOnly===true&&plan.shopifyWrites===0&&!plan.confirmationId&&e.vergleich.kombinationenGleich&&e.vergleich.variantReviewGleich&&e.vergleich.optionenGleich&&e.vergleich.preisGleich&&e.vergleich.optionGroupsGleich&&e.vergleich.designs===27&&e.vergleich.designIdsGleich&&e.vergleich.fotoLogoAus&&e.ressourcen.motive===13&&e.ressourcen.motiveGleich13&&e.vorlage.revision===1);
  }catch(error){e.fehler={schritt,...kurzFehler(error)};e.bestanden=false;}
 }
 // 7. Abschlusszähler und Unversehrtheit der Sicherung
 schritt='abschluss';ergebnis.nachher=zaehle();
 const v=ergebnis.vorher,n=ergebnis.nachher,ok=ergebnis.gruppen.filter(x=>x.bestanden).length,kombi=ergebnis.gruppen.map(x=>x.vergleich?.kombinationen??null);
 ergebnis.sicherungen=Object.fromEntries(DBS.map(f=>[f,dateiSha(path.join(SICH,f))===manifest[f].sha256]));
 ergebnis.pruefungen={sechs_gueltige_plaene:ok===6,varianten_10_10_10_5_5_5:JSON.stringify(kombi)===JSON.stringify([10,10,10,5,5,5]),varianten_summe_45:kombi.reduce((a,b)=>a+(b||0),0)===45,
  sechs_neue_quellen:n.produkte-v.produkte===6&&n.revisionen-v.revisionen===6,sechs_vorlagen:(n.vorlagen??0)-(v.vorlagen??0)===6,sechs_plaene:(n.plaene??0)-(v.plaene??0)===6,
  kein_confirm:(n.bestaetigungen??0)===(v.bestaetigungen??0),kein_execute:(n.ausfuehrungen??0)===(v.ausfuehrungen??0),importjournal_unveraendert:n.importjournal===v.importjournal,bindungen_unveraendert:n.bindungskoepfe===v.bindungskoepfe&&n.bindungsrevisionen===v.bindungsrevisionen,
  modulprofil_hash_gleich_v9:ergebnis.modulprofil.dokumentHashGleichV9,motive_13_im_katalog:true,sicherungen_gegen_manifest:Object.values(ergebnis.sicherungen).every(Boolean)};
 ergebnis.bestanden=Object.values(ergebnis.pruefungen).every(Boolean);
 management.close();
 const beleg=path.join(U,'TESTBELEG-sechsgruppen.json');fs.writeFileSync(beleg,JSON.stringify(ergebnis,null,1),{flag:'wx',mode:0o600});ergebnis.belegSha256=dateiSha(beleg);
 log(ergebnis);
}catch(error){log({...ergebnis,schritt,fehler:kurzFehler(error),bestanden:false});process.exitCode=1;}
