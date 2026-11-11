import {DatabaseSync} from 'node:sqlite';
import {tenantOption} from './tenant.mjs';

export function normalizedMotifQuery(value,searchKind='motif'){
 if(typeof value!=='string'||value.length>100)return '';
 const term=value.normalize('NFKC').trim().toLocaleLowerCase('de').replace(/\s+/g,' ');
 // Do not retain emails, URLs, phone numbers or arbitrary markup as search terms.
 const designId=searchKind==='design'&&/^(?:d\d{1,6}|[a-z][a-z0-9]*(?:-[a-z0-9.]+)+-d\d{1,6})$/u.test(term);
 const shortDesignNumber=searchKind==='design'&&/^\d{2,4}$/u.test(term);
 if(term.length<2||term.length>80||/[@<>:/\\]/u.test(term)||(!designId&&/\d{5}/u.test(term))||(!shortDesignNumber&&!/[\p{L}]/u.test(term)))return '';
 return term;
}
const invalid=()=>{throw Object.assign(Error('Ungültige Suchauswertung.'),{status:422,code:'motif_search_invalid'});};
const createTable=name=>`CREATE TABLE ${name}(tenant TEXT NOT NULL,day TEXT NOT NULL,product_group TEXT NOT NULL,term TEXT NOT NULL,source TEXT NOT NULL,search_kind TEXT NOT NULL DEFAULT 'motif' CHECK(search_kind IN ('motif','design')),searches INTEGER NOT NULL,without_results INTEGER NOT NULL,PRIMARY KEY(tenant,day,product_group,term,source,search_kind))`;
function ensureSearchKinds(db){
 // Rebuild the aggregate key atomically. All tenants and historical counts stay
 // in this same database; old rows and old event callers mean motif searches.
 db.exec('BEGIN IMMEDIATE');
 try{
  const columns=db.prepare('PRAGMA table_info(motif_search_daily)').all();
  if(!columns.length)db.exec(createTable('motif_search_daily'));
  else if(!columns.some(c=>c.name==='search_kind')){
   const expected=['tenant','day','product_group','term','source','searches','without_results'];
   if(columns.length!==expected.length||columns.some((c,i)=>c.name!==expected[i]))throw Error('Unbekanntes Schema der Suchauswertung; keine Migration durchgeführt.');
   const legacyKey=columns.filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name).join(',');
   if(legacyKey!=='tenant,day,product_group,term,source')throw Error('Unbekannter Schlüssel der Suchauswertung; keine Migration durchgeführt.');
   db.exec(createTable('motif_search_daily_with_kind'));
   db.exec(`INSERT INTO motif_search_daily_with_kind(tenant,day,product_group,term,source,search_kind,searches,without_results) SELECT tenant,day,product_group,term,source,'motif',searches,without_results FROM motif_search_daily`);
   db.exec('DROP TABLE motif_search_daily; ALTER TABLE motif_search_daily_with_kind RENAME TO motif_search_daily');
  }
  const key=db.prepare('PRAGMA table_info(motif_search_daily)').all().filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name).join(',');
  if(key!=='tenant,day,product_group,term,source,search_kind')throw Error('Unbekannter Schlüssel der Suchauswertung; keine Migration durchgeführt.');
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
export function createMotifSearchStats({filename,tenantId,clock=Date.now}){
 const tenant=tenantOption({tenantId}),db=new DatabaseSync(filename);db.exec('PRAGMA busy_timeout=5000');
 try{ensureSearchKinds(db);}catch(error){db.close();throw error;}
 let minute=-1,count=0;
 return {
  record({query,resultCount,group,source='shop',searchKind='motif'}){
   if(!['motif','design'].includes(searchKind))invalid();
   const term=normalizedMotifQuery(query,searchKind);if(!term)return false;
   if(!Number.isSafeInteger(resultCount)||resultCount<0||resultCount>100000||typeof group!=='string'||!group||group.length>160||!['shop','preview'].includes(source))invalid();
   const now=clock(),bucket=Math.floor(now/60000);if(bucket!==minute){minute=bucket;count=0;}if(++count>600)return false;
   const day=new Date(now).toISOString().slice(0,10);
   db.prepare(`INSERT INTO motif_search_daily(tenant,day,product_group,term,source,search_kind,searches,without_results) VALUES(?,?,?,?,?,?,1,?) ON CONFLICT(tenant,day,product_group,term,source,search_kind) DO UPDATE SET searches=searches+1,without_results=without_results+excluded.without_results`).run(tenant,day,group,term,source,searchKind,resultCount===0?1:0);
   return true;
  },
  report({days=30,group='',source='shop',searchKind='motif'}={}){
   days=Number(days);if(![7,30,90,365].includes(days)||typeof group!=='string'||group.length>160||!['shop','preview','all'].includes(source)||!['motif','design'].includes(searchKind))invalid();
   const from=new Date(clock()-(days-1)*86400000).toISOString().slice(0,10),to=new Date(clock()).toISOString().slice(0,10);
   const args=[tenant,from,to,group,group,source,source,searchKind],where="tenant=? AND day BETWEEN ? AND ? AND (?='' OR product_group=?) AND (?='all' OR source=?) AND search_kind=?";
   const rows=db.prepare(`SELECT term,SUM(searches) AS searches,SUM(without_results) AS withoutResults FROM motif_search_daily WHERE ${where} GROUP BY term ORDER BY searches DESC,term LIMIT 100`).all(...args);
   const missing=db.prepare(`SELECT term,SUM(searches) AS searches,SUM(without_results) AS withoutResults FROM motif_search_daily WHERE ${where} GROUP BY term HAVING withoutResults>0 ORDER BY withoutResults DESC,term LIMIT 100`).all(...args);
   const totals=db.prepare(`SELECT COALESCE(SUM(searches),0) AS searches,COALESCE(SUM(without_results),0) AS withoutResults FROM motif_search_daily WHERE ${where}`).get(...args);
   const groups=db.prepare('SELECT DISTINCT product_group AS name FROM motif_search_daily WHERE tenant=? AND search_kind=? ORDER BY product_group').all(tenant,searchKind).map(x=>x.name);
   return {from,to,days,source,searchKind,group,groups,totals,rows,missing};
  },close:()=>db.close()
 };
}
