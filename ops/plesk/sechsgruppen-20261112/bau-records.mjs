// Lokal: baut aus dem v9-Transport und der Kompaktform der Server-Records (sg-records.mjs) die tatsächlichen Records
// der Kopie nach und prüft jeden gegen den auf dem Server berechneten Hash. Bricht ab, sobald ein Hash nicht passt.
//   node bau-records.mjs <transport> <kompakt.json> <ziel>
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import crypto from 'node:crypto';
const [T,KOMPAKT,OUT]=process.argv.slice(2);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const canonical=v=>Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const cjson=v=>JSON.stringify(canonical(v)),csha=v=>sha(cjson(v));
const berechnet=[];const pruefe=(name,ist,soll)=>{berechnet.push(ist);if(soll===undefined||soll===null)return;if(ist!==soll)throw new Error('Hash weicht ab: '+name+' ist '+ist+' soll '+soll);};
const kBytes=fs.readFileSync(KOMPAKT),k=JSON.parse(kBytes),KENN='KOPIEN-ID (isolated-copy, nicht in der Live-Registry)';
const schreib=(rel,data)=>{const f=path.join(OUT,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,data);return {datei:rel,bytes:data.length,sha256:sha(data)};};
const gz=text=>zlib.gzipSync(Buffer.from(text,'utf8'),{level:9,mtime:0});
const dateien=[],zuordnung=[];
const modDoc=k.mod.dokument;pruefe('Modulprofil',csha(modDoc),k.mod.sha256);
const pins=JSON.parse(fs.readFileSync(path.join(T,'motif-profile-pins.json'),'utf8')).profiles[0],motDoc=pins.document;
pruefe('Motivprofil',csha(motDoc),k.mot.dokumentKanonischSha256);
dateien.push(schreib('module-profile.get-record.json',Buffer.from(JSON.stringify({kennzeichnung:KENN,id:k.mod.id,revision:k.mod.revision,document:modDoc,profile:{schema:'gravuru-configurator-modules/v1',id:k.mod.id,revision:k.mod.revision,modules:modDoc.modules},sha256:k.mod.sha256,actor:k.mod.actor,createdAt:k.mod.created_at,v9:{id:'cmp_049bdd37-97bd-456e-8237-9856a00809da',revision:1}},null,1))));
dateien.push(schreib('motif-profile.get-record.json',Buffer.from(JSON.stringify({kennzeichnung:KENN,id:k.mot.kopf.id,revision:k.mot.kopf.revision,name:motDoc.name,type:motDoc.type,items:motDoc.items,createdAt:k.mot.kopf.created_at,updatedAt:k.mot.kopf.updated_at,documentKanonischSha256:csha(motDoc),v9:{id:pins.profile_id,revision:pins.revision,documentSha256:pins.documentSha256},einstellungen:k.mot.einstellungen},null,1))));
for(const g of k.g){
 const d=path.join(T,g.o),pair=JSON.parse(fs.readFileSync(path.join(d,'pair.json'),'utf8')),tpl=JSON.parse(fs.readFileSync(path.join(d,'template.json'),'utf8')),meta=JSON.parse(fs.readFileSync(path.join(d,'source-metadata.json'),'utf8'));
 const v9plan=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d,'plan.json.gz')))),doc=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d,'source-document.json.gz'))));
 const cfg=g.q.id,prf=k.mot.kopf.id,cmp=k.mod.id;
 // Quelle
 doc.profileAssignments.motifs.profileId=prf;pruefe(g.o+' Quelldokument',csha(doc),g.q.rev.dokument?.kanonischSha256);
 const m={profiles:structuredClone(meta.profiles),productionProfile:null};m.profiles.sources.motifs.profileId=prf;pruefe(g.o+' Quellmetadaten',csha(m),g.q.rev.metadataKanonischSha256);
 // Vorlage
 const td=structuredClone(tpl.document),t=td.targets[0];td.scope.subcategoryId=cfg;t.key=cfg;t.familyId=cfg;t.sizeKey=cfg;t.source={productId:cfg,revision:g.q.rev.revision};t.moduleProfile={id:cmp,revision:k.mod.revision};
 pruefe(g.o+' Vorlage',csha(td),g.t.sha256);g.t.sha256??=csha(td);
 // Plan
 const {id:_i,planHash:_h,createdAt:_c,...pd}=v9plan,p=pd.products[0];
 pd.templateId=g.t.id;pd.templateRevision=g.t.revision;pd.templateHash=g.t.sha256;pd.scope={...pd.scope,subcategoryId:cfg};pd.offering={familyIds:[cfg],fingerprint:g.p.offeringFingerprint??sha(JSON.stringify([cfg,g.q.rev.revision]))};berechnet.push(pd.offering.fingerprint);
 pd.requestedProducts[0].targetKey=cfg;pd.sources=[{key:cfg,productId:cfg,revision:g.q.rev.revision,sha256:csha(doc)}];pd.moduleProfiles=[{id:cmp,revision:k.mod.revision,sha256:k.mod.sha256}];
 p.targetKey=cfg;p.familyId=cfg;p.sizeKey=cfg;p.sourceRevision=g.q.rev.revision;p.moduleProfile={...p.moduleProfile,id:cmp};
 p.document.profileAssignments.motifs.profileId=prf;p.document.config.moduleProfile.id=cmp;
 pruefe(g.o+' kompiliertes Produktdokument',csha(p.document),g.p.produktdokumentKanonischSha256);
 p.fingerprint=csha(p.document);pruefe(g.o+' Fingerprint',p.fingerprint,g.p.fingerprint);
 pruefe(g.o+' Plan',csha(pd),g.p.planHash);
 if(pd.creationKey!=='issue230-'+pair.excelSha256)throw new Error('creationKey weicht ab: '+g.o);
 const planText=cjson(pd);if(Buffer.byteLength(planText)!==g.p.dokumentBytes)throw new Error('Planlänge weicht ab: '+g.o);
 const ein=[schreib(g.o+'/source-document.json.gz',gz(cjson(doc))),schreib(g.o+'/source-metadata.json',Buffer.from(JSON.stringify({kennzeichnung:KENN,revisionMetadata:m,hinweis:'Nativ gespeicherte Revisions-Metadaten der Kopie. Die businessDecisions aus dem v9-Transport sind hier nicht Teil der Metadaten.'},null,1))),
  schreib(g.o+'/template.json',Buffer.from(JSON.stringify({kennzeichnung:KENN,id:g.t.id,revision:g.t.revision,document:td,sha256:g.t.sha256,actor:g.t.actor,createdAt:g.t.createdAt},null,1))),
  schreib(g.o+'/plan.json.gz',gz(JSON.stringify({id:g.p.id,planHash:g.p.planHash,...JSON.parse(planText),createdAt:g.p.createdAt})))];
 dateien.push(...ein);
 zuordnung.push({gruppe:g.o,workbook:pair.workbook,originalWorkbookSha256:pair.excelSha256,sourceCommit:'bf8824c80347f63ffeb2c05cc9a34a9ffed6f9bd',creationKey:pd.creationKey,productKey:pd.requestedProducts[0].key,
  kopie:{quelle:{id:cfg,revision:g.q.rev.revision,status:g.q.rev.status,sha256:csha(doc),createdAt:g.q.rev.created_at},vorlage:{id:g.t.id,revision:g.t.revision,sha256:g.t.sha256},plan:{id:g.p.id,planHash:g.p.planHash,createdAt:g.p.createdAt,dokumentBytes:g.p.dokumentBytes},modulprofil:{id:cmp,revision:k.mod.revision,sha256:k.mod.sha256},motivprofil:{id:prf,revision:k.mot.kopf.revision}},
  v9:{quelle:pair.source,vorlage:pair.template,planId:pair.planId,planHash:pair.planHash},varianten:p.combinationCount,preisAbCents:p.price.unitCents,designs:p.document.config.profile.designs.length});
}
dateien.push(schreib('PINS.json',Buffer.from(JSON.stringify({schema:'gravuru-sechsgruppen-kopienrecords/v1',kennzeichnung:'isolated-copy · confirm:'+k.confirm+' · execute:'+k.execute+' · alle Kennungen unter "kopie" sind Kopien-IDs einer Wegwerfkopie und KEINE Einträge der Live-Registry',
 herkunft:{serverOrdner:'private/sicherungen-db/'+k.ordner,testbelegSha256:k.belegSha256,recordsDateiAufServer:k.recordsDatei,kompaktSha256:sha(kBytes),tenant:k.tenant,register:k.register,transportManifestSha256:sha(fs.readFileSync(path.join(T,'manifest.json')))},
 rekonstruktion:'plan.json.gz, template.json, source-document.json.gz und source-metadata.json sind aus dem v9-Transport mit der ID-Abbildung nachgebaut; jeder Nachbau ist gegen den auf dem Server aus dem gespeicherten Record berechneten kanonischen SHA-256 geprüft (Quelldokument, Revisions-Metadaten, Vorlage, kompiliertes Produktdokument, Fingerprint, planHash, Planlänge in Bytes).',
 confirm:k.confirm,execute:k.execute,zuordnung},null,1))));
console.log(JSON.stringify({ok:true,sammelSha256:sha(berechnet.join('|')),anzahlHashes:berechnet.length,gruppen:zuordnung.length,dateien:dateien.length,summe45:zuordnung.reduce((a,z)=>a+z.varianten,0)}));
fs.writeFileSync(path.join(OUT,'SHA256SUMS.txt'),dateien.map(x=>x.sha256+'  '+x.datei).join('\n')+'\n');
