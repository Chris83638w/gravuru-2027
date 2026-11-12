// Nur lesend, ohne Netz: tatsächlich gespeicherte R1-Preisverträge (orderIntake.bindingPricing = Tabelle
// form_shop_binding_personalization) der 808 Varianten des Hauptacryls, getrennt nach 778 Ziel / 30 Rest
// (Variantenlisten aus Astras variant-mapping.preview.json.gz). Quelle ist die unveränderte Sicherung
// (immutable, read-only); es wird kein nativer Dienst geöffnet, keine Bestell-/Kundendaten gelesen.
// Dazu der Vergleich der R1-Konfiguration (Aufschläge, Uploadrechte, Staffel) mit dem geprüften R2-Ziel.
import './vh-netzwaechter.mjs';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {DatabaseSync} from 'node:sqlite';import {pathToFileURL} from 'node:url';
const hier=import.meta.dirname,P=path.resolve(hier,'..'),BASIS=path.join(P,'sicherungen-db'),TENANT='gravuru',PRODUKT='cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0';
const STAND=(process.argv.find(a=>a.startsWith('--stand='))||'--stand=20261112T082349Z').slice(8);
const ZIEL=path.join(BASIS,'kopientest-e49659f-20261111/main-target-preserved-metadata.preview.json'),ZIEL_SHA='ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const canonical=v=>Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const csha=v=>sha(JSON.stringify(canonical(v)));
const zahl=s=>String(s??'').match(/(\d+)$/)?.[1]??null;
const verteilung=a=>a.reduce((m,x)=>{m[x]=(m[x]||0)+1;return m;},{});
const log=e=>console.log(JSON.stringify({event:'pv_vertraege',...e}));
try{
 if(!/^\d{8}T\d{6}Z$/.test(STAND))throw new Error('Stand ungültig.');
 const lBytes=fs.readFileSync(path.join(hier,'pv-varianten.json')),L=JSON.parse(lBytes);
 const manifest=JSON.parse(fs.readFileSync(path.join(BASIS,STAND,'manifest.json'),'utf8')).dateien;
 const db=new DatabaseSync(pathToFileURL(path.join(BASIS,STAND,'workshop.sqlite')).href+'?immutable=1',{readOnly:true});
 const spalten=t=>db.prepare('PRAGMA table_info("'+t+'")').all().map(r=>r.name);
 const tabellen=Object.fromEntries(['form_shop_bindings','form_shop_binding_personalization','form_shop_binding_selections','shop_product_binding_heads','shop_product_binding_revisions'].map(t=>[t,spalten(t)]));
 const bind=db.prepare(`SELECT b.id,b.shop,b.variant_id,b.product_id,b.product_revision,b.unit_cents,b.created_at,
  (SELECT document FROM form_shop_binding_personalization p WHERE p.binding_id=b.id AND p.tenant_id=b.tenant_id) AS vertrag,
  (SELECT options FROM form_shop_binding_selections s WHERE s.binding_id=b.id AND s.tenant_id=b.tenant_id) AS optionen
  FROM form_shop_bindings b WHERE b.tenant_id=? AND b.product_id=?`).all(TENANT,PRODUKT);
 const jeVariante=new Map();for(const b of bind){const v=zahl(b.variant_id);if(!jeVariante.has(v))jeVariante.set(v,[]);jeVariante.get(v).push(b);}
 // Aktueller Kopf je Variante (ID-Bindungsregister), soweit die Spalten vorhanden sind
 const hs=tabellen.shop_product_binding_heads,rs=tabellen.shop_product_binding_revisions,vcol=hs.find(c=>/variant/i.test(c)),bcol=rs.find(c=>/binding_id/i.test(c)),rvcol=rs.find(c=>/variant/i.test(c));
 const kopf=new Map();let kopfHinweis=null;
 if(vcol&&bcol&&rvcol&&hs.includes('revision')&&rs.includes('revision')){for(const r of db.prepare(`SELECT h."${vcol}" AS v,h.revision AS rev,r."${bcol}" AS bid FROM shop_product_binding_heads h JOIN shop_product_binding_revisions r ON r.tenant_id=h.tenant_id AND r."${rvcol}"=h."${vcol}" AND r.revision=h.revision WHERE h.tenant_id=?`).all(TENANT))kopf.set(zahl(r.v),{revision:r.rev,bindingId:r.bid});}
 else kopfHinweis='Kopf/Revision nicht eindeutig lesbar: '+JSON.stringify({vcol,bcol,rvcol});
 const zeilen=[],gruppen=new Map();
 const auswerten=(art,liste)=>{
  const ids=Object.keys(liste),ohneBindung=[],ohneVertrag=[],mehrfach=[],kopfFehlt=[],kopfAndereBindung=[];let mitVertrag=0;const revs=[],proGruppe={},abwBindung=[],abwShop=[];
  for(const id of ids){
   const alle=jeVariante.get(id)||[],k=kopf.get(id)||null;if(!alle.length){ohneBindung.push(id);zeilen.push({id,art,bindung:null});continue;}
   if(alle.length>1)mehrfach.push(id);if(!k)kopfFehlt.push(id);
   const b=(k&&alle.find(x=>x.id===k.bindingId))||alle.slice().sort((a,c)=>a.created_at<c.created_at?1:-1)[0];if(k&&b.id!==k.bindingId)kopfAndereBindung.push(id);
   revs.push(b.product_revision);let g=null,eigener=null;
   if(b.vertrag){mitVertrag++;const d=JSON.parse(b.vertrag),vm=plain(d.variants)?d.variants:null;eigener=vm?(vm[id]??vm['gid://shopify/ProductVariant/'+id]??null):null;
    const norm={...d,...(vm?{variants:{anzahl:Object.keys(vm).length,nurEigeneVariante:Object.keys(vm).length===1&&eigener!==null}}:{})};g=csha(norm);
    if(!gruppen.has(g))gruppen.set(g,{sha256:g,n:0,schema:d.schema??null,revision:d.revision??null,schluessel:Object.keys(d),normalisiert:norm,variantenTabellen:new Set(),eigenePreise:new Set(),bytes:new Set()});
    const G=gruppen.get(g);G.n++;if(vm)G.variantenTabellen.add(csha(vm));G.eigenePreise.add(eigener);G.bytes.add(Buffer.byteLength(b.vertrag));proGruppe[g]=(proGruppe[g]||0)+1;
    if(eigener!==null&&eigener!==b.unit_cents)abwBindung.push(id);if(eigener!==null&&eigener!==liste[id][0])abwShop.push(id);
   }else ohneVertrag.push(id);
   zeilen.push({id,art,bindung:b.id,produktRevision:b.product_revision,unitCents:b.unit_cents,shopCents:liste[id][0],zielCents:liste[id][1],vertrag:g,vertragEigenerPreis:eigener,bindungen:alle.length,kopfRevision:k?.revision??null});
  }
  return {varianten:ids.length,mitBindung:ids.length-ohneBindung.length,ohneBindung:ohneBindung.length,ohneBindungBsp:ohneBindung.slice(0,5),mehrereBindungen:mehrfach.length,kopfFehlt:kopfFehlt.length,kopfZeigtAufAndereBindung:kopfAndereBindung.length,produktRevisionen:verteilung(revs),mitVertrag,ohneVertrag:ohneVertrag.length,ohneVertragBsp:ohneVertrag.slice(0,5),vertragsgruppen:proGruppe,
   vertragspreisUngleichBindung:abwBindung.length,vertragspreisUngleichShop:abwShop.length,bindungspreisUngleichShop:ids.filter(id=>(jeVariante.get(id)||[]).length&&zeilen.find(z=>z.id===id)?.unitCents!==liste[id][0]).length};
 };
 const ziel=auswerten('ziel',L.ziel),rest=auswerten('rest',L.rest);
 const gruppenAus=[...gruppen.values()].map(G=>({sha256:G.sha256,n:G.n,schema:G.schema,revision:G.revision,schluessel:G.schluessel,normalisiert:G.normalisiert,verschiedeneVariantentabellen:G.variantenTabellen.size,verschiedeneEigenePreise:G.eigenePreise.size,bytes:[Math.min(...G.bytes),Math.max(...G.bytes)]}));
 // Sonstige Bindungen des Produkts außerhalb der 808
 const bekannt=new Set([...Object.keys(L.ziel),...Object.keys(L.rest)]),fremd=[...jeVariante.keys()].filter(v=>!bekannt.has(v));
 // R1-Konfiguration gegen R2-Ziel
 const felder=c=>({basePriceCents:c.basePriceCents??null,extraMotifCents:c.extraMotifCents??null,motifCharge:c.motifCharge??null,photo:c.photo??null,logo:c.logo??null,quantityTiers:c.quantityTiers??null,quantityTierScope:c.quantityTierScope??null,moduleProfile:c.moduleProfile?{id:c.moduleProfile.id??null,revision:c.moduleProfile.revision??null,modules:c.moduleProfile.modules??null}:null,features:c.profile?.features??null,
  groessen:Array.isArray(c.scalableSizes)?c.scalableSizes.length:(plain(c.scalableSizes)?Object.keys(c.scalableSizes).length:null),familyFormats:c.familyFormats?(Array.isArray(c.familyFormats)?c.familyFormats.length:Object.keys(c.familyFormats).length):null,optionGroups:(c.profile?.optionGroups||[]).map(g=>({id:g.id,werte:g.values?.length??null,aufpreise:verteilung((g.values||[]).map(v=>v.priceCents??0))}))});
 const r1row=db.prepare('SELECT revision,status,document,metadata FROM product_revisions WHERE tenant_id=? AND product_id=? ORDER BY revision').all(TENANT,PRODUKT),r1=JSON.parse(r1row.at(-1).document);
 const zBytes=fs.readFileSync(ZIEL);if(sha(zBytes)!==ZIEL_SHA)throw new Error('R2-Zieldatei weicht ab.');const r2=JSON.parse(zBytes);
 const f1=felder(r1.config),f2=felder(r2.config),gleich=Object.fromEntries(Object.keys(f1).map(k=>[k,JSON.stringify(canonical(f1[k]))===JSON.stringify(canonical(f2[k]))]));
 db.close();
 const out={schema:'gravuru-hauptacryl-r1-preisvertraege-lesebeleg/v1',erstellt:new Date().toISOString(),quelle:{sicherung:STAND,workshopSha256:manifest['workshop.sqlite'].sha256,nurLesend:'immutable=1',variantenlisteSha256:sha(lBytes),variantenlisteQuelle:L.quelle},produkt:PRODUKT,tabellen,bindungenDesProdukts:bind.length,variantenMitBindung:jeVariante.size,bindungenAusserhalbDer808:fremd.length,kopfHinweis,
  ziel,rest,vertragsgruppen:gruppenAus,r1Revisionen:r1row.map(r=>({revision:r.revision,status:r.status,metadataSha256:r.metadata?sha(r.metadata):null})),konfiguration:{r1:f1,r2Ziel:f2,gleich,r2ZielSha256:ZIEL_SHA}};
 const ts=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',dir=path.join(BASIS,'preisvertraege-'+ts);fs.mkdirSync(dir,{mode:0o700});
 const voll=JSON.stringify({...out,zeilen}),datei=path.join(dir,'hauptacryl-r1-preisvertraege.json');fs.writeFileSync(datei,voll,{flag:'wx',mode:0o600});
 log({...out,ordner:path.basename(dir),datei:{bytes:voll.length,sha256:sha(voll)},zeilenSha256:csha(zeilen),zeilen:zeilen.length});
}catch(error){log({fehler:String(error.message||error).replace(/\/var\/www\/vhosts\/[^/]+/g,'~').slice(0,400)});process.exitCode=1;}
