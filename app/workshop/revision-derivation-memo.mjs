// Paket 1a-2: gemerkte Ableitungen aus einer unveränderlichen Produktrevision (kleine Prüfsummen), nur für den Kundenweg.
//
// Was gemerkt wird: eine reine Ableitung aus dem Dokument EINER festen Revision (z. B. SHA-256 über das bis zu 12 MB große
// Dokument). Nie gemerkt werden Entscheidungen (zugeordnet, freigegeben, pausiert, archiviert): sie werden von den Aufrufern bei
// jedem Abruf frisch gelesen und gegen die gemerkte Ableitung verglichen.
//
// Frischebeleg (marker): wird bei JEDEM Abruf gelesen und gehört zum Schlüssel. Er enthält
//  - die rowid der Revisionszeile (eine ersetzte Zeile, etwa durch INSERT OR REPLACE, bekommt eine neue rowid),
//  - die Schema-Versionen (main/temp): wer Trigger oder Tabellen ändert, verwirft jeden Eintrag,
//  - Kopf, Archivierung und Art des Produkts (Kopfzeile in `products`, ohne Dokument).
// Das Dokument selbst (document) und die Spalten dahinter werden NICHT gelesen: SQLite müsste dafür die ganze Überlaufkette lesen.
// Annahme (dieselbe wie Paket 1a, N1): product_revisions ist unveränderlich (Trigger immutable_revision_update/_delete).
// Der Mandant wird an der Produktzeile gefiltert (Verbund über products.tenant_id), ein fremder Mandant findet nichts.
const MAX_ENTRIES=256,MAX_VALUE_BYTES=512;
const same=(a,b)=>a!==null&&b!==null&&a.rid===b.rid&&a.schema===b.schema&&a.head===b.head&&a.archived===b.archived&&a.kind===b.kind;

export function createRevisionDerivationMemo({maxEntries=MAX_ENTRIES}={}){
 if(!Number.isSafeInteger(maxEntries)||maxEntries<1)throw new TypeError('maxEntries');
 const entries=new Map(),counts={hits:0,misses:0,stores:0,evictions:0};
 // Frischer Beleg; null, wenn Produkt, Mandant oder Revision fehlen oder die Abfrage nicht möglich ist (dann gilt der bisherige Weg).
 function marker(db,tenantId,productId,revision){
  try{
   if(typeof tenantId!=='string'||typeof productId!=='string'||!Number.isSafeInteger(revision)||revision<1)return null;
   const row=db.prepare('SELECT r.rowid AS rid,p.revision AS head,p.archived AS archived,p.kind AS kind FROM product_revisions r JOIN products p ON p.id = r.product_id WHERE r.product_id = ? AND r.revision = ? AND p.tenant_id = ?').get(productId,revision,tenantId);
   if(!row)return null;
   return {rid:Number(row.rid),head:Number(row.head),archived:Number(row.archived),kind:String(row.kind),schema:JSON.stringify([db.prepare('PRAGMA main.schema_version').get(),db.prepare('PRAGMA temp.schema_version').get()])};
  }catch{return null;}
 }
 const keyOf=(scope,kind,tenantId,productId,revision,m)=>JSON.stringify([scope,kind,tenantId,productId,revision,m.rid,m.schema,m.head,m.archived,m.kind]);
 // Liefert { value, marker }: value aus dem Speicher, wenn der Beleg zum Eintrag passt, sonst compute() – dann wird der neue Wert nur
 // abgelegt, wenn der Beleg nach der Berechnung noch derselbe ist. Ohne Beleg (null) wird immer berechnet und nichts abgelegt.
 // compute darf den bisherigen Weg samt aller Fehler enthalten; Fehler gehen unverändert nach außen und legen nichts ab.
 function derive({scope,kind,db,tenantId,productId,revision,compute}){
  const m=marker(db,tenantId,productId,revision);
  if(m===null){counts.misses++;return {value:compute(),marker:null,hit:false};}
  const key=keyOf(scope,kind,tenantId,productId,revision,m),found=entries.get(key);
  if(found!==undefined){entries.delete(key);entries.set(key,found);counts.hits++;return {value:found.value,marker:m,hit:true};}
  counts.misses++;
  const value=compute();
  if(same(m,marker(db,tenantId,productId,revision))&&value!==undefined&&value!==null&&Buffer.byteLength(JSON.stringify(value))<=MAX_VALUE_BYTES){
   entries.set(key,{value:Object.freeze(structuredClone(value))});counts.stores++;
   while(entries.size>maxEntries){entries.delete(entries.keys().next().value);counts.evictions++;}
  }
  return {value,marker:m,hit:false};
 }
 return Object.freeze({derive,marker,stats:()=>({entries:entries.size,...counts})});
}
