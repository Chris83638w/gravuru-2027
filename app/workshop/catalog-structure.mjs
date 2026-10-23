import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {tenantOption} from './tenant.mjs';
import {readKatalogStructure,patchMainProduct} from './katalog-linien.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'catalog_structure'});};
export function validateStructure(d){
 if(d?.schema!=='gravuru-workshop-structure/v1'||!Array.isArray(d.lines)||!Array.isArray(d.mainProducts))fail(422,'Katalogstruktur fehlt.');
 const ids=new Set();for(const l of d.lines){if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(l.id)||ids.has(l.id)||!l.name||!Array.isArray(l.subcategories))fail(422,'Produktlinie prüfen.');ids.add(l.id);const sub=new Set();for(const s of l.subcategories){if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(s.id)||sub.has(s.id)||!s.name)fail(422,'Unterkategorie prüfen.');sub.add(s.id);}}
 const products=new Set();for(const p of d.mainProducts){const l=d.lines.find(l=>l.id===p.lineId);if(!l||products.has(p.key)||!/^gid:\/\/shopify\/Product\/[1-9][0-9]*$/.test(p.id)||(p.subcategoryId&&!l.subcategories.some(s=>s.id===p.subcategoryId)))fail(422,'Produktzuordnung prüfen.');products.add(p.key);}
 return d;
}
// `katalogDir`: Pfad oder Funktion → Pfad des Katalog-Repos. Ist er gesetzt, kommen Linien und Hauptprodukte aus
// linien/*.json (katalog-linien.mjs) und Produktänderungen gehen dorthin zurück; die eingebaute Datei liefert nur noch
// Serien-Kennzahlen, Abgleichspunkte und den Shopify-Parallelbestand. Geplante Anzahl je Unterkategorie bleibt hier (SQLite).
export function createCatalogStructure({filename=':memory:',tenantId,source,katalogDir=null}={}){
 const tenant=tenantOption({tenantId}),data=validateStructure(source??JSON.parse(readFileSync(new URL('./data/catalog-structure.json',import.meta.url),'utf8'))),digest=createHash('sha256').update(JSON.stringify(data)).digest('hex');
 const db=new DatabaseSync(filename);db.exec('CREATE TABLE IF NOT EXISTS catalog_structure_settings(tenant_id TEXT NOT NULL,revision INTEGER NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(tenant_id,revision))');
 const latest=()=>db.prepare('SELECT * FROM catalog_structure_settings WHERE tenant_id=? ORDER BY revision DESC LIMIT 1').get(tenant),settings=r=>r?JSON.parse(r.document):{targets:{},assignments:{}};
 const katalogRoot=()=>{const v=typeof katalogDir==='function'?katalogDir():katalogDir;return typeof v==='string'&&v.trim()?v:null;};
 function read(){if(tenant!=='gravuru'&&!source)fail(503,'Für diesen Mandanten ist kein Katalog hinterlegt.');const row=latest(),s=settings(row);
  const root=katalogRoot();
  if(root){const copy=readKatalogStructure(root,{statics:data});for(const l of copy.lines)for(const sub of l.subcategories)sub.targetCount=s.targets[l.id+'/'+sub.id]??null;return {...copy,settingsRevision:row?.revision??0,settingsUpdatedAt:row?.created_at??null,saveEffect:'katalog',editable:true};}
  const copy=structuredClone(data);for(const p of copy.mainProducts){const a=s.assignments[p.key];p.subcategoryIds=a?.subcategoryIds??(p.subcategoryId?[p.subcategoryId]:[]);}for(const l of copy.lines)for(const sub of l.subcategories)sub.targetCount=s.targets[l.id+'/'+sub.id]??null;return {...copy,settingsRevision:row?.revision??0,sourceSha256:digest,settingsUpdatedAt:row?.created_at??null,saveEffect:'organization-only',automaticPublication:false};}
 function save(input,{actor='werkstatt'}={}){const current=read();if(!input||Object.keys(input).some(k=>!['expectedRevision','sourceSha256','action','lineId','subcategoryId','targetCount','productKey','subcategoryIds','katalogId','name','startDesign','sizesOffered','status'].includes(k)))fail(422,'Unbekannte Katalogfelder.');
 const root=katalogRoot();
 if(root&&['edit','assign','add'].includes(input.action)){if(input.sourceSha256!==current.sourceSha256)fail(409,'Der Katalog wurde inzwischen geändert. Bitte neu laden.');patchMainProduct(root,input,{actor});return read();}
 if(!root&&input.sourceSha256!==digest)fail(409,'Der Katalog wurde inzwischen abgeglichen. Bitte neu laden.');
 if(root&&input.sourceSha256!==current.sourceSha256)fail(409,'Der Katalog wurde inzwischen geändert. Bitte neu laden.');
 db.exec('BEGIN IMMEDIATE');try{const old=latest(),revision=old?.revision??0;if(input.expectedRevision!==revision)fail(409,'Ein Mitarbeiter hat die Struktur inzwischen geändert. Bitte neu laden.');const doc=settings(old),line=current.lines.find(l=>l.id===input.lineId&&l.enabled);if(!line)fail(422,'Aktive Produktlinie auswählen.');
 if(input.action==='target'){if(!line.subcategories.some(s=>s.id===input.subcategoryId)||!(input.targetCount===null||Number.isSafeInteger(input.targetCount)&&input.targetCount>=0&&input.targetCount<=20))fail(422,'Unterkategorie und gewünschte Anzahl 0 bis 20 prüfen.');doc.targets[line.id+'/'+input.subcategoryId]=input.targetCount;}
 else if(input.action==='assign'){const p=current.mainProducts.find(p=>p.key===input.productKey&&p.lineId===line.id&&p.role==='hauptprodukt');const cats=input.subcategoryIds;if(!p||!Array.isArray(cats)||cats.length>line.subcategories.length||new Set(cats).size!==cats.length||cats.some(id=>!line.subcategories.some(s=>s.id===id)))fail(422,'Produkt und Unterkategorien prüfen.');doc.assignments[p.key]={subcategoryIds:cats};}
 else fail(422,'Unbekannte Strukturaktion.');
 if(JSON.stringify(doc)!==JSON.stringify(settings(old)))db.prepare('INSERT INTO catalog_structure_settings VALUES(?,?,?,?)').run(tenant,revision+1,JSON.stringify(doc),new Date().toISOString());db.exec('COMMIT');return read();}catch(e){db.exec('ROLLBACK');throw e;}}
 return {read,save,close:()=>db.close()};
}
