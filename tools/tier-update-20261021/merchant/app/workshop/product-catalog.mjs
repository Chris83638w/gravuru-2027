// Derived, compact index. Immutable product revisions stay the source of truth;
// browsing thousands of products never loads their font/image/design payloads.
export function createProductCatalog(db,overview){
 db.exec(`CREATE TABLE IF NOT EXISTS product_catalog (
 product_id TEXT PRIMARY KEY REFERENCES products(id), revision INTEGER NOT NULL,
 material TEXT NOT NULL, method TEXT NOT NULL, categories TEXT NOT NULL,
 search_name TEXT NOT NULL, overview TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS catalog_material ON product_catalog(material,method);`);
 const save=db.prepare(`INSERT INTO product_catalog VALUES (?,?,?,?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET
 revision=excluded.revision,material=excluded.material,method=excluded.method,categories=excluded.categories,search_name=excluded.search_name,overview=excluded.overview`);
 function update(row,d){const info=overview(d)||{};save.run(row.id,row.revision,info.material||'',info.method||'',JSON.stringify(d.categoryIds||[]),d.name.toLocaleLowerCase('de'),JSON.stringify(info));}
 for(const row of db.prepare(`SELECT p.* FROM products p LEFT JOIN product_catalog c ON c.product_id=p.id WHERE c.product_id IS NULL OR c.revision!=p.revision OR c.overview='{}'`).all()){
  const d=JSON.parse(db.prepare('SELECT document FROM product_revisions WHERE product_id=? AND revision=?').get(row.id,row.revision).document);update(row,d);
 }
 function list({query='',kind='product',filter='all',material='',category='',sort='updated',page=1,pageSize=24}={}){
  if(typeof query!=='string'||query.length>200||!['product','master'].includes(kind)||!['all','print','engraving','archived'].includes(filter)||typeof material!=='string'||material.length>100||typeof category!=='string'||category.length>128||!['updated','name','oldest'].includes(sort)||!Number.isSafeInteger(page)||page<1||page>1000000||!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>100)throw Object.assign(Error('Ungültige Katalogfilter.'),{status:422,code:'invalid_catalog_query'});
  const from='FROM products p JOIN product_catalog c ON c.product_id=p.id';
  const search='p.kind=? AND (?=\'\' OR instr(c.search_name,?)>0 OR instr(lower(p.id),?)>0)',term=query.trim().toLocaleLowerCase('de'),base=[kind,term,term,term];
  const counts={all:0,print:0,engraving:0,archived:0};
  for(const r of db.prepare(`SELECT p.archived,c.method,count(*) AS count ${from} WHERE ${search} GROUP BY p.archived,c.method`).all(...base)){if(r.archived)counts.archived+=r.count;else{counts.all+=r.count;if(r.method in counts)counts[r.method]+=r.count;}}
  const facets=db.prepare(`SELECT c.material,c.categories,p.archived ${from} WHERE ${search}`).all(...base),materials=new Map(),categories=new Map();
  for(const r of facets){if(Boolean(r.archived)!==(filter==='archived'))continue;materials.set(r.material,(materials.get(r.material)||0)+1);for(const v of JSON.parse(r.categories))categories.set(v,(categories.get(v)||0)+1);}
  const where=search+` AND p.archived=? AND (?='' OR c.method=?) AND (?='' OR c.material=?) AND (?='' OR (?='__none__' AND json_array_length(c.categories)=0) OR EXISTS(SELECT 1 FROM json_each(c.categories) WHERE value=?))`;
  const method=['print','engraving'].includes(filter)?filter:'',params=[...base,filter==='archived'?1:0,method,method,material,material,category,category,category];
  const total=db.prepare(`SELECT count(*) AS n ${from} WHERE ${where}`).get(...params).n,pages=Math.max(1,Math.ceil(total/pageSize));page=Math.min(page,pages);
  const order=sort==='name'?'c.search_name ASC,p.id':sort==='oldest'?'p.created_at ASC,p.id':'p.updated_at DESC,p.id';
  const products=db.prepare(`SELECT p.*,c.categories,c.overview ${from} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params,pageSize,(page-1)*pageSize).map(r=>({id:r.id,revision:r.revision,publishedRevision:r.published_revision,status:r.archived?'archived':r.published_revision?'active':'draft',name:r.name,kind:r.kind,masterId:r.master_id,createdAt:r.created_at,updatedAt:r.updated_at,categoryIds:JSON.parse(r.categories),overview:JSON.parse(r.overview)}));
  const entries=map=>[...map].map(([id,count])=>({id,count})).sort((a,b)=>a.id.localeCompare(b.id,'de'));
  return {products,total,page,pageSize,pages,counts,facets:{materials:entries(materials),categories:entries(categories)}};
 }
 return {update,list};
}
