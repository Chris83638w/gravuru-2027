// Nur lesend: stellt die bereits erzeugten Records des Sechsgruppen-Kopienlaufs zusammen (kein neuer Planlauf, kein
// nativer Dienst wird geöffnet, die Kopie wird unveränderlich gelesen). Große Dokumentkörper werden nicht ausgegeben,
// nur ihre kanonischen Hashes; sie sind aus dem v9-Transport mit der ID-Abbildung rekonstruierbar und gegen diese
// Hashes prüfbar. Zusätzlich: der vorhandene TESTBELEG-updatepilot.json (kompakt, mit Datei-SHA).
//   node sg-records.mjs --ordner=sechsgruppen-<Zeit> --pilot=updatepilot-<Zeit>
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {DatabaseSync} from 'node:sqlite';import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,BASIS=process.env.SG_BASIS||path.resolve(hier,'../sicherungen-db'),TENANT='gravuru';
const arg=n=>(process.argv.find(a=>a.startsWith('--'+n+'='))||'').slice(n.length+3);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const canonical=v=>Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const csha=v=>sha(JSON.stringify(canonical(v)));
const ascii=s=>s.replace(/[\u007f-￿]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
const offen=f=>new DatabaseSync(pathToFileURL(f).href+'?immutable=1',{readOnly:true});
const klein=row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='string'&&v.length>6000?{bytes:Buffer.byteLength(v),sha256:sha(v),kanonischSha256:(()=>{try{return csha(JSON.parse(v));}catch{return null;}})()}:(typeof v==='string'&&/^[\[{]/.test(v)?(()=>{try{return JSON.parse(v);}catch{return v;}})():v)]));
try{
 const ordner=arg('ordner'),pilot=arg('pilot');if(!/^sechsgruppen-\d{8}T\d{6}Z$/.test(ordner))throw new Error('--ordner fehlt.');
 const U=path.join(BASIS,ordner),beleg=JSON.parse(fs.readFileSync(path.join(U,'TESTBELEG-sechsgruppen.json'),'utf8'));
 const w=offen(path.join(U,'daten','workshop.sqlite')),p=offen(path.join(U,'daten','profiles.sqlite'));
 const alle=(db,q,...a)=>db.prepare(q).all(...a).map(klein),eins=(db,q,...a)=>{const r=db.prepare(q).get(...a);return r?klein(r):null;};
 const out={schema:'gravuru-sechsgruppen-records/v1',kennzeichnung:'isolated-copy: Records einer Wegwerfkopie; alle cfg-/pgt-/pgp-/cmp-/prf-Kennungen sind Kopien-IDs, keine Einträge der Live-Registry',ordner,belegSha256:sha(fs.readFileSync(path.join(U,'TESTBELEG-sechsgruppen.json'))),tenant:TENANT,
  register:{vertrag:beleg.registry.vertrag,quellenVorher:beleg.registry.quellenVorher,kopienquelle:beleg.kopienquelle,kandidat:beleg.kandidat},
  confirm:w.prepare('SELECT COUNT(*) AS n FROM product_group_confirmations WHERE tenant_id=?').get(TENANT).n,execute:w.prepare('SELECT COUNT(*) AS n FROM product_group_creation_results WHERE tenant_id=?').get(TENANT).n,
  modulprofil:{kopf:eins(w,'SELECT * FROM configurator_module_profiles WHERE tenant_id=? AND id=?',TENANT,beleg.modulprofil.tatsaechlich.id),revision:eins(w,'SELECT * FROM configurator_module_profile_revisions WHERE tenant_id=? AND id=?',TENANT,beleg.modulprofil.tatsaechlich.id)},
  motivprofil:{kopf:eins(p,'SELECT * FROM profiles WHERE tenant_id=? AND id=?',TENANT,beleg.motivprofil.tatsaechlich.id),revision:eins(p,'SELECT * FROM profile_revisions WHERE tenant_id=? AND profile_id=?',TENANT,beleg.motivprofil.tatsaechlich.id),einstellungen:(r=>r?{revision:r.revision,documentSha256:sha(r.document),updated_at:r.updated_at}:null)(p.prepare('SELECT revision,document,updated_at FROM profile_library_settings WHERE tenant_id=?').get(TENANT))},gruppen:[]};
 for(const g of beleg.gruppen){
  const produkt=eins(w,'SELECT * FROM products WHERE tenant_id=? AND id=?',TENANT,g.quelle.id),rev=eins(w,'SELECT * FROM product_revisions WHERE tenant_id=? AND product_id=? AND revision=?',TENANT,g.quelle.id,g.quelle.revision);
  const tk=eins(w,'SELECT * FROM product_group_templates WHERE tenant_id=? AND id=?',TENANT,g.vorlage.id),tr=w.prepare('SELECT * FROM product_group_template_revisions WHERE tenant_id=? AND id=? AND revision=?').get(TENANT,g.vorlage.id,g.vorlage.revision);
  const pl=w.prepare('SELECT * FROM product_group_creation_plans WHERE tenant_id=? AND id=?').get(TENANT,g.plan.id),pd=JSON.parse(pl.document),pp=pd.products[0];
  out.gruppen.push({ordner:g.ordner,quelle:{produkt,revision:rev},
   vorlage:{kopf:tk,record:{id:tr.id,revision:tr.revision,document:JSON.parse(tr.document),sha256:tr.sha256,actor:tr.actor,createdAt:tr.created_at}},
   plan:{id:pl.id,planHash:pl.sha256,createdAt:pl.created_at,dokumentBytes:Buffer.byteLength(pl.document),ohneProduktdokument:{...pd,products:[{...pp,document:{kanonischSha256:csha(pp.document)},optionGroups:{kanonischSha256:csha(pp.optionGroups)},variantReview:{anzahl:pp.variantReview.length,kanonischSha256:csha(pp.variantReview)},geometry:{kanonischSha256:csha(pp.geometry)}}]}}});
 }
 w.close();p.close();
 if(pilot){if(!/^updatepilot-\d{8}T\d{6}Z$/.test(pilot))throw new Error('--pilot ungültig.');const b=fs.readFileSync(path.join(BASIS,pilot,'TESTBELEG-updatepilot.json'));out.updatepilot={ordner:pilot,datei:'TESTBELEG-updatepilot.json',bytes:b.length,sha256:sha(b),inhalt:JSON.parse(b)};}
 const text=ascii(JSON.stringify(out)),ziel=path.join(U,'RECORDS-sechsgruppen.json');
 fs.writeFileSync(ziel,text,{flag:'wx',mode:0o600});
 // Kompaktform für die Übergabe: nur nicht ableitbare Werte (Kennungen, Zeiten, Hashes); der volle Record bleibt als Datei auf dem Server.
 const k={schema:'gravuru-sechsgruppen-records-kompakt/v1',ordner,belegSha256:out.belegSha256,recordsDatei:{bytes:text.length,sha256:sha(text)},tenant:TENANT,confirm:out.confirm,execute:out.execute,register:out.register,
  mod:{...out.modulprofil.revision,document:undefined,dokument:out.modulprofil.revision.document,kopfRevision:out.modulprofil.kopf.revision},
  mot:{kopf:out.motivprofil.kopf,revision:{...out.motivprofil.revision,document:undefined},dokumentKanonischSha256:csha(out.motivprofil.revision.document),einstellungen:out.motivprofil.einstellungen},
  g:out.gruppen.map((x,i)=>({o:x.ordner,q:{...x.quelle.produkt,name:undefined,rev:{...x.quelle.revision,document:undefined,metadata:undefined,dokument:x.quelle.revision.document,metadataKanonischSha256:csha(x.quelle.revision.metadata),...(i===0?{metadata:x.quelle.revision.metadata}:{})}},
   t:{kopf:x.vorlage.kopf,id:x.vorlage.record.id,revision:x.vorlage.record.revision,sha256:x.vorlage.record.sha256,actor:x.vorlage.record.actor,createdAt:x.vorlage.record.createdAt},
   p:{id:x.plan.id,planHash:x.plan.planHash,createdAt:x.plan.createdAt,dokumentBytes:x.plan.dokumentBytes,fingerprint:x.plan.ohneProduktdokument.products[0].fingerprint,offeringFingerprint:x.plan.ohneProduktdokument.offering?.fingerprint,produktdokumentKanonischSha256:x.plan.ohneProduktdokument.products[0].document.kanonischSha256}})),
  ...(out.updatepilot?{updatepilot:out.updatepilot}:{})};
 const kt=ascii(JSON.stringify(k));
 console.log(JSON.stringify({event:'sg_records',recordsBytes:text.length,recordsSha256:sha(text),kompaktBytes:kt.length,kompaktSha256:sha(kt)}));console.log('SGK:'+kt);
}catch(error){console.log(JSON.stringify({event:'sg_records',fehler:String(error.message||error).slice(0,300)}));process.exitCode=1;}
