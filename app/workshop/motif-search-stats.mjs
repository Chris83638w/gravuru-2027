import {DatabaseSync} from 'node:sqlite';
import {tenantOption} from './tenant.mjs';

export function normalizedMotifQuery(value){
 if(typeof value!=='string'||value.length>100)return '';
 const term=value.normalize('NFKC').trim().toLocaleLowerCase('de').replace(/\s+/g,' ');
 // Do not retain emails, URLs, phone numbers or arbitrary markup as search terms.
 if(term.length<2||term.length>80||/[@<>:/\\]|\d{5}/u.test(term)||!/[\p{L}]/u.test(term))return '';
 return term;
}
const invalid=()=>{throw Object.assign(Error('Ungültige Suchauswertung.'),{status:422,code:'motif_search_invalid'});};
export function createMotifSearchStats({filename,tenantId,clock=Date.now}){
 const tenant=tenantOption({tenantId}),db=new DatabaseSync(filename);db.exec('PRAGMA busy_timeout=5000');
 db.exec(`CREATE TABLE IF NOT EXISTS motif_search_daily(tenant TEXT NOT NULL,day TEXT NOT NULL,product_group TEXT NOT NULL,term TEXT NOT NULL,source TEXT NOT NULL,searches INTEGER NOT NULL,without_results INTEGER NOT NULL,PRIMARY KEY(tenant,day,product_group,term,source))`);
 let minute=-1,count=0;
 return {
  record({query,resultCount,group,source='shop'}){
   const term=normalizedMotifQuery(query);if(!term)return false;
   if(!Number.isSafeInteger(resultCount)||resultCount<0||resultCount>100000||typeof group!=='string'||!group||group.length>160||!['shop','preview'].includes(source))invalid();
   const now=clock(),bucket=Math.floor(now/60000);if(bucket!==minute){minute=bucket;count=0;}if(++count>600)return false;
   const day=new Date(now).toISOString().slice(0,10);
   db.prepare(`INSERT INTO motif_search_daily VALUES(?,?,?,?,?,1,?) ON CONFLICT(tenant,day,product_group,term,source) DO UPDATE SET searches=searches+1,without_results=without_results+excluded.without_results`).run(tenant,day,group,term,source,resultCount===0?1:0);
   return true;
  },
  report({days=30,group='',source='shop'}={}){
   days=Number(days);if(![7,30,90,365].includes(days)||typeof group!=='string'||group.length>160||!['shop','preview','all'].includes(source))invalid();
   const from=new Date(clock()-(days-1)*86400000).toISOString().slice(0,10),to=new Date(clock()).toISOString().slice(0,10);
   const args=[tenant,from,to,group,group,source,source],where="tenant=? AND day BETWEEN ? AND ? AND (?='' OR product_group=?) AND (?='all' OR source=?)";
   const rows=db.prepare(`SELECT term,SUM(searches) AS searches,SUM(without_results) AS withoutResults FROM motif_search_daily WHERE ${where} GROUP BY term ORDER BY searches DESC,term LIMIT 100`).all(...args);
   const missing=db.prepare(`SELECT term,SUM(searches) AS searches,SUM(without_results) AS withoutResults FROM motif_search_daily WHERE ${where} GROUP BY term HAVING withoutResults>0 ORDER BY withoutResults DESC,term LIMIT 100`).all(...args);
   const totals=db.prepare(`SELECT COALESCE(SUM(searches),0) AS searches,COALESCE(SUM(without_results),0) AS withoutResults FROM motif_search_daily WHERE ${where}`).get(...args);
   const groups=db.prepare('SELECT DISTINCT product_group AS name FROM motif_search_daily WHERE tenant=? ORDER BY product_group').all(tenant).map(x=>x.name);
   return {from,to,days,source,group,groups,totals,rows,missing};
  },close:()=>db.close()
 };
}
