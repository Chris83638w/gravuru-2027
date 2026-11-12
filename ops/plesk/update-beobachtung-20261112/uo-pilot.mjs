// Kopienpilot für das Hauptacryl-Update (Update, identische Wiederholung, erzwungener Driftabbruch) – NUR auf neuen
// Wegwerfkopien der drei Acryl-Datenbanken aus der Sicherung 20261111T212859Z. Review und XLSX sind die echten Dateien;
// der Zustimmungsbeleg ist eine ausdrücklich SYNTHETISCHE Testvorgabe, die nur im Speicher dieses Prozesses existiert
// und nie als Datei oder Nutzerzustimmung abgelegt wird. Nativer Validierungs-/CAS-/Snapshot-/Journalcode unverändert.
// Kein Netz (Netzwächter wird geladen), keine Live-Datenbank, keine Shopify-Funktion, kein Anschluss an die laufende App.
// Aufruf: node uo-pilot.mjs --excel=<Datei im Staging> --excel-sha=<SHA-256>     (ohne Angaben: nur Bereitschaft prüfen)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
await import('./vh-netzwaechter.mjs');
const hier=import.meta.dirname,P=path.resolve(hier,'..');
const RT=path.join(P,'kandidat-f85390b-20261112'),SICH=path.join(P,'sicherungen-db/20261111T212859Z');
const ZIEL=path.join(P,'sicherungen-db/kopientest-e49659f-20261111/main-target-preserved-metadata.preview.json'),REVIEW=path.join(P,'sicherungen-db/updatebeobachtung-20261112/main-update-review.json');
const ZIEL_SHA='ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407',REVIEW_SHA='d980417e45469b4d34f2fbd9abff746cf6cdbe7864e67b2f416fc2561f7ad8d8',REVIEW_HASH='8e8814cabbddb0354e0af029e1bdb09f0a668f69af03dd056792a99c6b7d517d';
const PINS={'ops/issue230-main-update-review-20261111/update-review.mjs':'6f68a00b590b6dedb5af29229fea816e31b4cab2bea5e937a67ed220a9fdd571','ops/issue230-main-resource-pins-20261111/read-resource-pins.mjs':'18952021f08bd9643d905c446ac502c0739edd7d6ae692254158004211f946b8','app/workshop/http.mjs':'e2d7071c46463ed097044dc979f22796670804e5dda4c389f84684a4fce0948f','app/workshop/repository.mjs':'f9bba8887d956d283fd14cfd34a9455de2130d45ad75a7e5042b458a307bb4b1','app/workshop/profile-library.mjs':'d3aa96dd7800f3e98bd2706b20bb2a0eb5b47adc9172099547453225e8460e51','app/workshop/production-profiles.mjs':'931d595d1abc374d84da7330476218f1f319aacc2648aa8210f1b8b9076c4cb3','app/workshop/design-assets.mjs':'888d6935c1b59dd189589ebb6ee16c54402bfc203d731e42bb4b276d70a2bdf1','app/workshop/product-model.mjs':'f452d2590c6c9ec00fac260fd154d8fb5ec4f0fed1b7d34f98d16d594ae114a8'};
const DBS=['workshop.sqlite','design-assets.sqlite','profiles.sqlite'],TENANT='gravuru',PRODUKT='cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0',IMPORTKEY='issue230.main-acryl.16190784602492.rev1-to2';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function dateiSha(file){const fd=fs.openSync(file,'r'),h=crypto.createHash('sha256'),buf=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null)))h.update(buf.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
const log=e=>console.log(JSON.stringify({event:'uo_pilot',...e}));
const imp=p=>import(pathToFileURL(path.join(RT,p)).href);
const kurzFehler=e=>({code:e?.code??null,message:String(e?.message||e).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,300)});
const wert=n=>(process.argv.find(a=>a.startsWith('--'+n+'='))||'').split('=').slice(1).join('=');
let schritt='start';
try{
 for(const [f,h] of Object.entries(PINS))if(sha(fs.readFileSync(path.join(RT,f)))!==h)throw new Error('Prüfsumme weicht ab: '+f);
 if(dateiSha(ZIEL)!==ZIEL_SHA)throw new Error('Zielmodell weicht ab.');
 const reviewBytes=fs.readFileSync(REVIEW);if(sha(reviewBytes)!==REVIEW_SHA)throw new Error('Review weicht ab.');
 const review=JSON.parse(reviewBytes);if(review.reviewHash!==REVIEW_HASH)throw new Error('reviewHash weicht ab.');
 const excelName=wert('excel'),excelSha=wert('excel-sha');
 if(!excelName||!excelSha){log({schritt:'bereitschaft',review:true,ziel:true,module:true,excel:false,hinweis:'XLSX v7 und deren SHA fehlen noch'});process.exit(0);}
 if(!/^[A-Za-z0-9._-]{1,120}\.xlsx$/.test(excelName)||!/^[a-f0-9]{64}$/.test(excelSha))throw new Error('Excel-Angaben ungültig.');
 const excel=fs.readFileSync(path.join(hier,excelName));if(sha(excel)!==excelSha)throw new Error('XLSX weicht von der genannten SHA ab.');
 const stempel=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z'),U=path.join(P,'sicherungen-db','updatepilot-'+stempel);
 fs.mkdirSync(U,{mode:0o700});const bau=path.join(U,'bau');fs.mkdirSync(bau,{mode:0o700});
 const manifest=JSON.parse(fs.readFileSync(path.join(SICH,'manifest.json'),'utf8')).dateien;
 function kopie(name){const daten=path.join(U,name);fs.mkdirSync(daten,{mode:0o700});for(const f of DBS){fs.copyFileSync(path.join(SICH,f),path.join(daten,f),fs.constants.COPYFILE_EXCL);fs.chmodSync(path.join(daten,f),0o600);if(dateiSha(path.join(daten,f))!==manifest[f].sha256)throw new Error('Kopie weicht ab: '+f);}return daten;}
 schritt='bau';const {build}=await imp('app/configurator/variant-m/build.mjs');build({outputDirectory:bau});
 const seed=JSON.parse(fs.readFileSync(path.join(bau,'models.json'),'utf8'))[0];
 schritt='module';
 const [{createFontLibrary},{createProfileLibrary},{createProductionProfiles},{createDesignAssetStore},{workshopCatalog},{validateProductDocument},{isFormProduct},{productOverview},{createProductRepository},adapter,{createNativeUpdateResourcePinReader}]=await Promise.all(['app/workshop/font-library.mjs','app/workshop/profile-library.mjs','app/workshop/production-profiles.mjs','app/workshop/design-assets.mjs','app/workshop/catalog.mjs','app/workshop/product-model.mjs','app/workshop/form-product.mjs','app/workshop/product-preview.mjs','app/workshop/repository.mjs','ops/issue230-main-update-review-20261111/update-review.mjs','ops/issue230-main-resource-pins-20261111/read-resource-pins.mjs'].map(imp));

 function kontext(daten){
  const wFile=path.join(daten,'workshop.sqlite'),aFile=path.join(daten,'design-assets.sqlite'),pFile=path.join(daten,'profiles.sqlite');
  const fonts=createFontLibrary({filename:aFile,tenantId:TENANT});
  const profiles=createProfileLibrary({filename:pFile,catalog:workshopCatalog(seed.universal.localResources),tenantId:TENANT});profiles.registerFonts(fonts.list());
  const productionProfiles=createProductionProfiles({filename:pFile,tenantId:TENANT});
  const assets=createDesignAssetStore({filename:aFile,tenantId:TENANT});
  // Vollständiger nativer Validator: exakt der Nicht-Formprodukt-Zweig aus http.mjs:156
  const nativeValidate=value=>{const document=validateProductDocument(value);if(isFormProduct(document))throw Error('Dieser Anschluss gilt nur für das Haupt-Universalprodukt.');profiles.resolve(document);assets.validateDocument(document);productionProfiles.resolve(document);return document;};
  const nativeSnapshotMetadata=document=>({profiles:profiles.resolve(document),productionProfile:productionProfiles.resolve(document)});
  const readResourcePins=createNativeUpdateResourcePinReader({profiles,productionProfiles});
  const metadataSnapshot=adapter.guardedMetadataSnapshot(nativeSnapshotMetadata,readResourcePins);
  const repository=createProductRepository({filename:wFile,tenantId:TENANT,validateDocument:nativeValidate,snapshotMetadata:metadataSnapshot,catalogOverview:productOverview});
  return {repository,metadataSnapshot,readResourcePins,wFile};
 }
 const zaehle=file=>{const d=new DatabaseSync(file,{readOnly:true});try{const n=(q,...a)=>d.prepare(q).get(...a)?.n??null;return {produkte:n('SELECT COUNT(*) AS n FROM products WHERE tenant_id=?',TENANT),revisionen:n('SELECT COUNT(*) AS n FROM product_revisions WHERE tenant_id=?',TENANT),importjournal:n('SELECT COUNT(*) AS n FROM import_items WHERE tenant_id=?',TENANT),bindungskoepfe:n('SELECT COUNT(*) AS n FROM shop_product_binding_heads WHERE tenant_id=?',TENANT),bindungsrevisionen:n('SELECT COUNT(*) AS n FROM shop_product_binding_revisions WHERE tenant_id=?',TENANT),kopf:n('SELECT revision AS n FROM products WHERE tenant_id=? AND id=?',TENANT,PRODUKT),revisionenProdukt:n('SELECT COUNT(*) AS n FROM product_revisions WHERE tenant_id=? AND product_id=?',TENANT,PRODUKT)};}finally{d.close();}};
 const target=JSON.parse(fs.readFileSync(ZIEL,'utf8'));
 // SYNTHETISCHE Testvorgabe – nur im Speicher, wird nie geschrieben und ist keine Nutzerzustimmung
 const approval=adapter.makeApprovalEvidence({review,acceptedReviewHash:review.reviewHash,excelAddendum:{file:excelName,sha256:excelSha},decision:{accepted:true,actor:'SYNTHETIC COPY-PILOT FIXTURE - NO USER APPROVAL',quote:'SYNTHETIC copy-pilot fixture; not a user response',source:'in-memory fixture of uo-pilot.mjs on a throwaway database copy',recordedAt:new Date().toISOString()}},target);
 const kurzBeleg=r=>({revision:r.revision,replayed:r.replayed,newRevisions:r.newRevisions,createdProducts:r.createdProducts,productId:r.productId,document:r.document,metadataSha256:r.metadataSha256,importKey:r.importKey,importFingerprint:r.importFingerprint,reviewHash:r.reviewHash,excelSha256:r.excelSha256,shopifyWrites:r.shopifyWrites,bindingWrites:r.bindingWrites,catalogApprovals:r.catalogApprovals,publications:r.publications,checkedUnderNativeWriteLockAt:r.checkedUnderNativeWriteLockAt,receiptHash:r.receiptHash});
 const lauf=(ctx,extra={})=>adapter.executeApprovedUpdate(ctx,{review,approval,target,excelAddendumBytes:excel,execute:true,...extra});
 const ergebnis={schema:'gravuru-update-kopienpilot-TESTBELEG/v1',kennzeichnung:'TESTBELEG auf Wegwerfkopien - synthetische Zustimmungsvorgabe nur im Speicher, keine Nutzerfreigabe, kein produktiver Beleg',erstellt:new Date().toISOString(),ordner:path.basename(U),reviewHash:review.reviewHash,excel:{datei:excelName,sha256:excelSha,bytes:excel.length},kopienquelle:{sicherung:path.basename(SICH),workshopSha256:manifest['workshop.sqlite'].sha256}};
 // A) Update und identische Wiederholung
 schritt='A-kopie';const a=kontext(kopie('a'));const a0=zaehle(a.wFile);
 schritt='A-update';let t=Date.now();const r1=lauf(a);const a1=zaehle(a.wFile);
 ergebnis.update={ms:Date.now()-t,beleg:kurzBeleg(r1),vorher:a0,nachher:a1,journal:a.repository.importItem(IMPORTKEY),kopf:(h=>({revision:h.revision,status:h.status}))(a.repository.head(PRODUKT))};
 schritt='A-wiederholung';t=Date.now();const r2=lauf(a);const a2=zaehle(a.wFile);
 ergebnis.wiederholung={ms:Date.now()-t,beleg:kurzBeleg(r2),nachher:a2,unveraendertGegenUpdate:JSON.stringify(a1)===JSON.stringify(a2)};
 // B) erzwungene Abbrüche auf einer zweiten frischen Kopie
 schritt='B-kopie';const b=kontext(kopie('b'));const b0=zaehle(b.wFile);
 schritt='B-excel';let f1=null;try{lauf(b,{excelAddendumBytes:Buffer.concat([excel,Buffer.from([0])])});}catch(e){f1=kurzFehler(e);}
 const b1=zaehle(b.wFile);ergebnis.abbruchGeaenderteExcel={fehler:f1,datenUnveraendert:JSON.stringify(b0)===JSON.stringify(b1)};
 schritt='B-kopfdrift';const alt=b.repository.get(PRODUKT,{revision:1});b.repository.save(PRODUKT,{...alt.document,name:alt.document.name+' (Kopienpilot: gleichzeitige Bearbeitung)'},1);const b2=zaehle(b.wFile);
 let f2=null;try{lauf(b);}catch(e){f2=kurzFehler(e);}
 const b3=zaehle(b.wFile);ergebnis.abbruchKopfdrift={vorDrift:b0,nachFremdbearbeitung:b2,fehler:f2,nachAbbruch:b3,keinWeitererStand:JSON.stringify(b2)===JSON.stringify(b3),journal:b.repository.importItem(IMPORTKEY)};
 ergebnis.sicherungUnveraendert=dateiSha(path.join(SICH,'workshop.sqlite'))===manifest['workshop.sqlite'].sha256;
 fs.writeFileSync(path.join(U,'TESTBELEG-updatepilot.json'),JSON.stringify(ergebnis,null,1),{flag:'wx',mode:0o600});
 log(ergebnis);
 const ok=r1.revision===2&&r1.newRevisions===1&&r2.replayed===true&&r2.newRevisions===0&&ergebnis.wiederholung.unveraendertGegenUpdate&&f1&&ergebnis.abbruchGeaenderteExcel.datenUnveraendert&&f2&&ergebnis.abbruchKopfdrift.keinWeitererStand&&ergebnis.abbruchKopfdrift.journal===null;
 if(!ok)process.exitCode=1;
}catch(error){log({schritt,fehler:kurzFehler(error)});process.exitCode=1;}
