import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {hash,worker} from './catalog.mjs';
import {scene,svg} from './render.mjs';

export const DEMO_SHOP='studio-probe.myshopify.com';
export const shopName=s=>typeof s==='string' && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s);
const shopId=s=>typeof s==='string' && /^[1-9]\d{0,19}$/.test(s);
const uuid=s=>typeof s==='string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s);
function demand(flag,message){ if(!flag) throw Error(message); }

export function openStore(file) {
  const db=new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec('CREATE TABLE IF NOT EXISTS assets(shop TEXT, hash TEXT, data TEXT NOT NULL, PRIMARY KEY(shop,hash));'+
    'CREATE TABLE IF NOT EXISTS releases(shop TEXT, rev TEXT, catalog TEXT NOT NULL, PRIMARY KEY(shop,rev));'+
    'CREATE TABLE IF NOT EXISTS variants(shop TEXT, variant TEXT, product TEXT, rev TEXT NOT NULL, PRIMARY KEY(shop,variant));'+
    'CREATE TABLE IF NOT EXISTS photos(shop TEXT, id TEXT, variant TEXT, rev TEXT, original TEXT, pixels TEXT, PRIMARY KEY(shop,id));'+
    'CREATE TABLE IF NOT EXISTS jobs(shop TEXT, id TEXT, variant TEXT, product TEXT, rev TEXT, payload TEXT, fingerprint TEXT, request TEXT, PRIMARY KEY(shop,id), UNIQUE(shop,request));'+
    'CREATE TABLE IF NOT EXISTS orders(shop TEXT, id TEXT, name TEXT, status TEXT, cancelled INTEGER, PRIMARY KEY(shop,id));'+
    'CREATE TABLE IF NOT EXISTS order_versions(shop TEXT, id TEXT, updated INTEGER, PRIMARY KEY(shop,id));'+
    'CREATE TABLE IF NOT EXISTS lines(shop TEXT, order_id TEXT, id TEXT, job TEXT, qty INTEGER, PRIMARY KEY(shop,order_id,id));'+
    'CREATE TABLE IF NOT EXISTS bootstraps(shop TEXT, rev TEXT, raw TEXT NOT NULL, PRIMARY KEY(shop,rev));'+
    'CREATE TABLE IF NOT EXISTS drawings(shop TEXT, job TEXT, geometry TEXT NOT NULL, PRIMARY KEY(shop,job));'+
    'CREATE TABLE IF NOT EXISTS files(shop TEXT, job TEXT, format TEXT, bytes BLOB NOT NULL, PRIMARY KEY(shop,job,format));');
  function tx(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {const result=fn();db.exec('COMMIT');return result;}
    catch(e){db.exec('ROLLBACK');throw e;}
  }
  function publish(shop,product,variant,pack) {
    demand(shopName(shop) && shopId(product) && shopId(variant),'Shop, Produkt- und Varianten-ID prüfen.');
    return tx(()=>{
      for(const [id,data] of pack.assets) db.prepare('INSERT OR IGNORE INTO assets VALUES(?,?,?)').run(shop,id,data);
      db.prepare('INSERT OR IGNORE INTO releases VALUES(?,?,?)').run(shop,pack.revision,pack.index);
      db.prepare('INSERT OR IGNORE INTO bootstraps VALUES(?,?,?)').run(shop,pack.revision,pack.bootstrap||'{}');
      db.prepare('INSERT INTO variants VALUES(?,?,?,?) ON CONFLICT(shop,variant) DO UPDATE SET product=excluded.product,rev=excluded.rev').run(shop,variant,product,pack.revision);
      return pack.revision;
    });
  }
  function binding(shop,variant) {
    const row=db.prepare('SELECT v.product,v.rev,r.catalog FROM variants v JOIN releases r ON r.shop=v.shop AND r.rev=v.rev WHERE v.shop=? AND v.variant=?').get(shop,variant);
    demand(row,'Für diese Variante ist keine Gestaltung verfügbar.');
    return {variant,product:row.product,revision:row.rev,designs:JSON.parse(row.catalog)};
  }
  const asset=(shop,id)=>{const row=db.prepare('SELECT data FROM assets WHERE shop=? AND hash=?').get(shop,id);demand(row,'Ressource fehlt.');return row.data;};
  const bootstrap=(shop,rev)=>db.prepare('SELECT raw FROM bootstraps WHERE shop=? AND rev=?').get(shop,rev)?.raw||'{}';
  function getDesign(shop,revision,id,choices={}){
    const row=db.prepare('SELECT catalog FROM releases WHERE shop=? AND rev=?').get(shop,revision);
    const entry=row && JSON.parse(row.catalog).find(d=>d.id===id);
    demand(entry,'Vorlagenstand fehlt.');
    const {design,faces}=JSON.parse(asset(shop,entry.key));
    for(const selected of Object.values(choices||{})){
      const m=design.motifs?.find(o=>o.id===selected?.choice);
      if(m && !m.paths)m.paths=JSON.parse(asset(shop,m.key));
    }
    const fonts=Object.fromEntries(Object.entries(faces).map(([name,styles])=>[name,Object.fromEntries(Object.entries(styles).map(([k,v])=>[k,JSON.parse(asset(shop,typeof v==='string'?v:v.full))]))]));
    return {design,fonts};
  }
  async function upload(shop,data) {
    const {variant,revision,design:id,original}=data;
    demand(binding(shop,variant).revision===revision,'Die Produktvariante wurde aktualisiert.');
    const {design}=getDesign(shop,revision,id);
    demand(design.objects.some(o=>o.type==='photo'),'Diese Vorlage enthält kein Fotofeld.');
    const pixels=JSON.parse((await worker('photo',original)).toString());
    const key=randomUUID();
    db.prepare('INSERT INTO photos VALUES(?,?,?,?,?,?)').run(shop,key,variant,revision,original,pixels);
    return {id:key};
  }
  function pixelsFor(shop,id,variant,revision) {
    if (!id) return null;
    demand(uuid(id),'Foto-ID ungültig.');
    const row=db.prepare('SELECT pixels FROM photos WHERE shop=? AND id=? AND variant=? AND rev=?').get(shop,id,variant,revision);
    demand(row,'Das Foto gehört nicht zu dieser Variante und Revision.');
    return row.pixels;
  }
  function save(shop,data) {
    const {variant,revision,design:id,edits,photo=null,motifs={},request}=data;
    demand(uuid(request) && shopId(variant) && typeof revision==='string' && typeof id==='string','Ungültiger Entwurf.');
    const payload=JSON.stringify({design:id,edits,photo,motifs});
    const fingerprint=hash(JSON.stringify([variant,revision,payload]));
    return tx(()=>{
      const previous=db.prepare('SELECT id,fingerprint FROM jobs WHERE shop=? AND request=?').get(shop,request);
      if(previous) {demand(previous.fingerprint===fingerprint,'Entwurfskennung bereits belegt.');return {id:previous.id};}
      const current=binding(shop,variant);
      demand(current.revision===revision,'Der Händler hat die Vorlage aktualisiert. Bitte die Seite neu laden.');
      const {design,fonts}=getDesign(shop,revision,id,motifs);
      demand(!photo || design.objects.some(o=>o.type==='photo'),'Die Vorlage hat kein Fotofeld.');
      if(photo) pixelsFor(shop,photo,variant,revision);
      const drawing=scene(design,fonts,edits,photo,motifs);
      const key=randomUUID();
      db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?)').run(shop,key,variant,current.product,revision,payload,fingerprint,request);
      db.prepare('INSERT INTO drawings VALUES(?,?,?)').run(shop,key,JSON.stringify(drawing));
      return {id:key};
    });
  }
  function receive(shop,order) {
    demand(shopId(order.id) && Array.isArray(order.lines),'Ungültige Bestellreferenz.');
    return tx(()=>{
      let status=String(order.status||'UNKNOWN'),cancelled=Number(!!order.cancelled);
      const last=db.prepare('SELECT v.updated,o.status,o.cancelled FROM order_versions v JOIN orders o ON o.shop=v.shop AND o.id=v.id WHERE v.shop=? AND v.id=?').get(shop,order.id);
      demand(!last || order.updatedAt,'Zeitstempel für den aktuellen Bestellstand fehlt.');
      if(order.updatedAt){
        const stamp=Date.parse(order.updatedAt);
        demand(Number.isFinite(stamp),'Shopify-Zeitstempel ungültig.');
        demand(!last || stamp>=last.updated,'Ein neuerer Bestellstand wurde bereits übernommen.');
        if(last?.updated===stamp && (last.status!==status || last.cancelled!==cancelled)){
          status='CONFLICT';
          cancelled=Math.max(last.cancelled,cancelled);
        }
        db.prepare('INSERT OR REPLACE INTO order_versions VALUES(?,?,?)').run(shop,order.id,stamp);
      }
      const selected=[];
      for(const line of order.lines) {
        if(!line.job) continue;
        demand(uuid(line.job) && shopId(line.id) && Number.isSafeInteger(line.quantity) && line.quantity>=0,'Ungültige Bestellposition.');
        const job=db.prepare('SELECT variant,product FROM jobs WHERE shop=? AND id=?').get(shop,line.job);
        demand(job && job.variant===line.variant && job.product===line.product,'Bestellposition und gesicherte Gestaltung passen nicht zusammen.');
        selected.push(line);
      }
      db.prepare('INSERT OR REPLACE INTO orders VALUES(?,?,?,?,?)').run(shop,order.id,String(order.name),status,cancelled);
      db.prepare('DELETE FROM lines WHERE shop=? AND order_id=?').run(shop,order.id);
      for(const line of selected) db.prepare('INSERT INTO lines VALUES(?,?,?,?,?)').run(shop,order.id,line.id,line.job,line.quantity);
      return selected.length;
    });
  }
  function orders(shop) {
    return db.prepare('SELECT o.id,o.name,o.status,o.cancelled,l.id AS line,l.qty FROM orders o JOIN lines l ON l.shop=o.shop AND l.order_id=o.id WHERE o.shop=? ORDER BY length(o.id) DESC,o.id DESC,l.id').all(shop);
  }
  const position=db.prepare('SELECT j.*,l.qty,o.cancelled,o.status FROM lines l JOIN jobs j ON j.shop=l.shop AND j.id=l.job JOIN orders o ON o.shop=l.shop AND o.id=l.order_id WHERE l.shop=? AND l.order_id=? AND l.id=?');
  async function download(shop,order,line,format,{localDemo=false}={}) {
    function releasedPosition(){
      const row=position.get(shop,order,line);
      demand(row && !row.cancelled && row.qty>0,'Keine aktive zugeordnete Bestellposition.');
      const simulated=localDemo && shop===DEMO_SHOP && row.status==='TEST';
      if(row.status!=='PAID' && !simulated){
        throw Object.assign(Error('Die Fertigungsdatei erfordert den bestätigten Zahlungsstatus PAID.'),{status:409});
      }
      return row;
    }
    const row=releasedPosition();
    const data=JSON.parse(row.payload);
    if(format==='original' && data.photo){
      const original=db.prepare('SELECT original FROM photos WHERE shop=? AND id=?').get(shop,data.photo).original;
      return {type:original.split(';')[0].slice(5),bytes:Buffer.from(original.split(',')[1],'base64')};
    }
    if(format==='json') return {type:'application/json',bytes:Buffer.from(JSON.stringify({order,line,variant:row.variant,design:data.design,revision:row.rev,quantity:row.qty,edits:data.edits,photo:data.photo,motifs:data.motifs||{}},null,2))};
    const type=({svg:'image/svg+xml',pdf:'application/pdf'})[format];
    demand(type,'Dateiformat nicht verfügbar.');
    const saved=db.prepare('SELECT bytes FROM files WHERE shop=? AND job=? AND format=?');
    const old=saved.get(shop,row.id,format);
    if(old) return {type,bytes:Buffer.from(old.bytes)};
    const drawing=db.prepare('SELECT geometry FROM drawings WHERE shop=? AND job=?').get(shop,row.id);
    let geometry;
    if(drawing) geometry=JSON.parse(drawing.geometry);
    else {
      const {design,fonts}=getDesign(shop,row.rev,data.design,data.motifs);
      geometry=scene(design,fonts,data.edits,data.photo,data.motifs);
    }
    for(const p of geometry.paths) if(p.image) p.image=pixelsFor(shop,p.image,row.variant,row.rev);
    const bytes=format==='svg'?Buffer.from(svg(geometry)):await worker('pdf',geometry);
    if(format==='pdf'){
      const current=releasedPosition();
      demand(current.id===row.id && current.qty===row.qty,'Die Bestellposition wurde während der Dateierstellung geändert.');
    }
    db.prepare('INSERT OR IGNORE INTO files VALUES(?,?,?,?)').run(shop,row.id,format,bytes);
    return {type,bytes:Buffer.from(saved.get(shop,row.id,format).bytes)};
  }
  return {publish,binding,bootstrap,asset,save,upload,receive,orders,download,close:()=>db.close()};
}
